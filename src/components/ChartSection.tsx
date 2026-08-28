import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Candle, MarketStructurePoint, TradeStrategy } from '../types';
import { calculateMarketStructure, calculateEmaSeries } from '../utils/indicators';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Calendar,
  Crosshair,
  TrendingUp,
  Activity,
  Layers,
} from 'lucide-react';

interface ChartSectionProps {
  candles: Candle[];
  candlesMap?: {
    '1d'?: Candle[];
    '4h'?: Candle[];
    '1h'?: Candle[];
    '15m'?: Candle[];
    '5m'?: Candle[];
  };
  symbol: string;
  activeStrategy?: TradeStrategy | null;
  currentPrice?: number;
  onOpenCyclesModal: () => void;
}

export const ChartSection: React.FC<ChartSectionProps> = ({
  candles,
  candlesMap,
  symbol,
  activeStrategy,
  currentPrice,
  onOpenCyclesModal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedTf, setSelectedTf] = useState<'1d' | '4h' | '1h' | '15m' | '5m'>('4h');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [showLevelsOverlay, setShowLevelsOverlay] = useState<boolean>(true);
  const [showEmas, setShowEmas] = useState<boolean>(true);

  const activeCandles = useMemo(() => {
    if (candlesMap && candlesMap[selectedTf] && candlesMap[selectedTf]!.length > 0) {
      return candlesMap[selectedTf]!;
    }
    return candles || [];
  }, [candlesMap, selectedTf, candles]);

  const displayCandles = useMemo(() => {
    if (!activeCandles || !activeCandles.length) return [];
    return activeCandles.slice(-120);
  }, [activeCandles]);

  // Compute EMA Series on displayCandles
  const ema9Series = useMemo(() => calculateEmaSeries(displayCandles, 9), [displayCandles]);
  const ema21Series = useMemo(() => calculateEmaSeries(displayCandles, 21), [displayCandles]);
  const ema50Series = useMemo(() => calculateEmaSeries(displayCandles, 50), [displayCandles]);
  const ema200Series = useMemo(() => calculateEmaSeries(displayCandles, 200), [displayCandles]);

  const structurePoints = useMemo(() => {
    return calculateMarketStructure(displayCandles, 3);
  }, [displayCandles]);

  // Render Canvas Chart
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !displayCandles.length) return;

    const width = container.clientWidth || 800;
    const height = 440;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 25, right: 80, bottom: 45, left: 15 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const volumeHeight = 60; // Bottom zone for volume bars
    const priceChartHeight = chartHeight - volumeHeight;

    // Determine high / low bounds
    const highs = displayCandles.map(c => c.high);
    const lows = displayCandles.map(c => c.low);
    let maxPrice = Math.max(...highs);
    let minPrice = Math.min(...lows);

    // Include strategy targets in bounds if active
    if (showLevelsOverlay && activeStrategy) {
      maxPrice = Math.max(maxPrice, activeStrategy.target, activeStrategy.stop, activeStrategy.entry);
      minPrice = Math.min(minPrice, activeStrategy.target, activeStrategy.stop, activeStrategy.entry);
    }

    const priceRange = maxPrice - minPrice || 1;
    maxPrice += priceRange * 0.05;
    minPrice -= priceRange * 0.05;

    const priceToY = (price: number) => {
      return padding.top + (1 - (price - minPrice) / (maxPrice - minPrice)) * priceChartHeight;
    };

    const candleCount = displayCandles.length;
    const effectiveWidth = chartWidth * zoomLevel;
    const candleWidth = Math.max(2.5, (effectiveWidth / candleCount) * 0.65);
    const candleSpacing = effectiveWidth / candleCount;

    // Max Volume for bottom histogram
    const maxVolume = Math.max(...displayCandles.map(c => Number(c.volume) || 0), 1);

    // Draw background grid lines
    ctx.strokeStyle = '#2B313A';
    ctx.lineWidth = 1;
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const p = minPrice + (i / gridSteps) * (maxPrice - minPrice);
      const y = priceToY(p);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Price labels on right axis
      ctx.fillStyle = '#848E9C';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(p.toFixed(p > 1000 ? 2 : p > 1 ? 4 : 6), width - padding.right + 8, y + 3);
    }

    // Draw Volume Bars
    const volBaseY = height - padding.bottom;
    displayCandles.forEach((c, i) => {
      const x = padding.left + i * candleSpacing + candleSpacing / 2 + panOffset;
      if (x < padding.left - 20 || x > width - padding.right + 20) return;
      const volHeight = Math.min(volumeHeight - 5, ((Number(c.volume) || 0) / maxVolume) * (volumeHeight - 5));
      const isGreen = c.close >= c.open;
      ctx.fillStyle = isGreen ? 'rgba(14, 203, 129, 0.28)' : 'rgba(246, 70, 93, 0.28)';
      ctx.fillRect(x - candleWidth / 2, volBaseY - volHeight, candleWidth, volHeight);
    });

    // Draw EMAs on chart if enabled
    if (showEmas) {
      const drawEmaLine = (series: (number | null)[], color: string, widthPx: number = 1.2) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = widthPx;
        ctx.beginPath();
        let started = false;

        series.forEach((val, i) => {
          if (val === null || isNaN(val)) return;
          const x = padding.left + i * candleSpacing + candleSpacing / 2 + panOffset;
          if (x < padding.left - 30 || x > width - padding.right + 30) return;
          const y = priceToY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      };

      drawEmaLine(ema9Series, '#06b6d4', 1.2);   // Cyan EMA 9
      drawEmaLine(ema21Series, '#F0B90B', 1.4);  // Binance Yellow EMA 21
      drawEmaLine(ema50Series, '#818cf8', 1.2);  // Indigo EMA 50
      drawEmaLine(ema200Series, '#c084fc', 1.6); // Purple EMA 200
    }

    // Draw Strategy Target/Stop/Entry Overlays if enabled
    if (showLevelsOverlay && activeStrategy) {
      // Take Profit Line (Green dashed)
      const tpY = priceToY(activeStrategy.target);
      ctx.strokeStyle = '#0ECB81';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, tpY);
      ctx.lineTo(width - padding.right, tpY);
      ctx.stroke();
      ctx.fillStyle = '#0ECB81';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`TP: ${activeStrategy.target.toFixed(2)}`, width - padding.right + 6, tpY - 3);

      // Stop Loss Line (Red dashed)
      const slY = priceToY(activeStrategy.stop);
      ctx.strokeStyle = '#F6465D';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, slY);
      ctx.lineTo(width - padding.right, slY);
      ctx.stroke();
      ctx.fillStyle = '#F6465D';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`SL: ${activeStrategy.stop.toFixed(2)}`, width - padding.right + 6, slY - 3);

      // Entry Price Line (Amber solid)
      const entryY = priceToY(activeStrategy.entry);
      ctx.strokeStyle = '#F0B90B';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(padding.left, entryY);
      ctx.lineTo(width - padding.right, entryY);
      ctx.stroke();
      ctx.fillStyle = '#F0B90B';
      ctx.fillText(`ENTRY: ${activeStrategy.entry.toFixed(2)}`, width - padding.right + 6, entryY - 3);
    }
    ctx.setLineDash([]);

    // Draw Candlesticks
    displayCandles.forEach((c, i) => {
      const x = padding.left + i * candleSpacing + candleSpacing / 2 + panOffset;
      if (x < padding.left - 20 || x > width - padding.right + 20) return;

      const isGreen = c.close >= c.open;
      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);
      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);

      // Wick
      ctx.strokeStyle = isGreen ? '#0ECB81' : '#F6465D';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      ctx.fillStyle = isGreen ? '#0ECB81' : '#F6465D';
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });

    // Draw Market Structure Points
    structurePoints.forEach(pt => {
      const candleIndex = displayCandles.findIndex(c => c.time === pt.time);
      if (candleIndex === -1) return;

      const x = padding.left + candleIndex * candleSpacing + candleSpacing / 2 + panOffset;
      const y = priceToY(pt.price);

      // Marker Circle
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = pt.direction === 'bull' ? '#0ECB81' : '#F6465D';
      ctx.fill();
      ctx.strokeStyle = '#0B0E11';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label Text
      ctx.fillStyle = pt.direction === 'bull' ? '#0ECB81' : '#F6465D';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      const labelY = pt.type === 'high' ? y - 8 : y + 14;
      ctx.fillText(pt.label, x, labelY);

      // Reversal Star
      if (pt.reversal) {
        ctx.fillStyle = '#F0B90B';
        ctx.fillText('★', x, pt.type === 'high' ? y - 18 : y + 24);
      }
    });

    // Draw Current Live Price line
    if (currentPrice && currentPrice >= minPrice && currentPrice <= maxPrice) {
      const liveY = priceToY(currentPrice);
      ctx.strokeStyle = '#F0B90B';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padding.left, liveY);
      ctx.lineTo(width - padding.right, liveY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Live price tag
      ctx.fillStyle = '#F0B90B';
      ctx.fillRect(width - padding.right, liveY - 9, 74, 18);
      ctx.fillStyle = '#0B0E11';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(currentPrice.toFixed(currentPrice > 1000 ? 2 : 4), width - padding.right + 37, liveY + 3);
    }
  }, [
    displayCandles,
    structurePoints,
    ema9Series,
    ema21Series,
    ema50Series,
    ema200Series,
    zoomLevel,
    panOffset,
    showLevelsOverlay,
    showEmas,
    activeStrategy,
    currentPrice,
  ]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX - panOffset);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset(e.clientX - dragStartX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="bg-[#1E2329] border border-[#2B313A] rounded-xl p-4 sm:p-6 shadow-xl space-y-4 relative overflow-hidden transition-all">
      {/* Top geometric accent */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#F0B90B] via-[#F0B90B]/50 to-transparent"></div>

      {/* Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#F0B90B]/10 border border-[#F0B90B]/30 rounded-lg">
            <TrendingUp className="w-4 h-4 text-[#F0B90B]" />
          </div>
          <div>
            <h2 className="text-xs uppercase tracking-widest text-slate-200 font-bold m-0 flex items-center gap-2">
              Gráfico Cuantitativo & Estructura de Mercado
              <span className="bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/30 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                {symbol} ({selectedTf.toUpperCase()})
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 m-0">
              Detección algorítmica de swing points (HH/HL/LH/LL), EMAs dinámicas y volumen.
            </p>
          </div>
        </div>

        {/* Timeframe selector & Tools */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Chips */}
          <div className="flex bg-[#14171A] p-1 rounded-lg border border-[#2B313A] text-xs font-mono">
            {(['1d', '4h', '1h', '15m', '5m'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setSelectedTf(tf)}
                className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                  selectedTf === tf
                    ? 'bg-[#F0B90B] text-[#0B0E11] shadow-[0_0_10px_rgba(240,185,11,0.3)]'
                    : 'text-slate-400 hover:text-white hover:bg-[#2B313A]/50'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          {/* EMAs Toggle Button */}
          <button
            onClick={() => setShowEmas(!showEmas)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-all ${
              showEmas
                ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
                : 'bg-[#14171A] border-[#2B313A] text-slate-400 hover:border-slate-500'
            }`}
            title="Mostrar u ocultar líneas de medias móviles exponenciales (EMA 9, 21, 50, 200)"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">EMAs</span>
          </button>

          {/* Levels Overlay Toggle */}
          <button
            onClick={() => setShowLevelsOverlay(!showLevelsOverlay)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-all ${
              showLevelsOverlay
                ? 'bg-[#181A20] border-[#F0B90B]/50 text-[#F0B90B]'
                : 'bg-[#14171A] border-[#2B313A] text-slate-400 hover:border-slate-500'
            }`}
            title="Mostrar/Ocultar niveles de TP, SL y Entry"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-bold">TP/SL</span>
          </button>

          {/* Zoom In / Out */}
          <div className="flex items-center bg-[#14171A] border border-[#2B313A] rounded-lg p-0.5">
            <button
              onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.2))}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#2B313A] rounded cursor-pointer transition-colors"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.2))}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#2B313A] rounded cursor-pointer transition-colors"
              title="Reducir zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoomLevel(1);
                setPanOffset(0);
              }}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#2B313A] rounded cursor-pointer transition-colors"
              title="Restablecer vista"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Historical Cycles Modal - Yellow Action Button */}
          <button
            onClick={onOpenCyclesModal}
            className="bg-[#181A20] hover:bg-[#F0B90B] border border-[#2B313A] hover:border-[#F0B90B] text-slate-200 hover:text-[#0B0E11] text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold uppercase tracking-wider shadow-sm hover:shadow-[0_0_15px_rgba(240,185,11,0.25)] transition-all cursor-pointer active:scale-95"
          >
            <Calendar className="w-3.5 h-3.5" /> Ciclos
          </button>
        </div>
      </div>

      {/* Interactive Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-[440px] bg-[#0B0E11] border border-[#2B313A] rounded-xl relative overflow-hidden cursor-grab active:cursor-grabbing shadow-inner"
      >
        {displayCandles.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs space-y-2">
            <Layers className="w-8 h-8 text-[#F0B90B]/60 animate-bounce" />
            <span>Sincronizando velas de {symbol} ({selectedTf.toUpperCase()})...</span>
          </div>
        ) : (
          <canvas ref={canvasRef} className="block w-full h-full" />
        )}
      </div>

      {/* Legend & Indicator References */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono pt-1">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#0ECB81]"></span>
            <span className="text-[11px] text-slate-300">Vela Alcista</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#F6465D]"></span>
            <span className="text-[11px] text-slate-300">Vela Bajista</span>
          </div>

          {/* EMA Legends */}
          {showEmas && (
            <div className="flex items-center gap-2 bg-[#14171A] px-2 py-0.5 rounded border border-[#2B313A] text-[10px]">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2 h-0.5 bg-cyan-400 inline-block"></span>EMA 9
              </span>
              <span className="flex items-center gap-1 text-[#F0B90B]">
                <span className="w-2 h-0.5 bg-[#F0B90B] inline-block"></span>EMA 21
              </span>
              <span className="flex items-center gap-1 text-indigo-400">
                <span className="w-2 h-0.5 bg-indigo-400 inline-block"></span>EMA 50
              </span>
              <span className="flex items-center gap-1 text-purple-400">
                <span className="w-2 h-0.5 bg-purple-400 inline-block"></span>EMA 200
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-[#14171A] px-2 py-0.5 rounded border border-[#2B313A]">
            <span className="w-2 h-2 rounded-full bg-[#0ECB81]"></span>
            <span className="text-slate-300 text-[10px]">HH / HL Alcista</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#14171A] px-2 py-0.5 rounded border border-[#2B313A]">
            <span className="w-2 h-2 rounded-full bg-[#F6465D]"></span>
            <span className="text-slate-300 text-[10px]">LL / LH Bajista</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#14171A] px-2 py-0.5 rounded border border-[#2B313A]">
            <span className="text-[#F0B90B]">★</span>
            <span className="text-[#F0B90B] text-[10px]">Cambio de Carácter</span>
          </div>
        </div>

        {activeStrategy && (
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-[#0ECB81] font-bold">-- TP: ${activeStrategy.target.toFixed(2)}</span>
            <span className="text-[#F0B90B] font-bold">-- ENTRY: ${activeStrategy.entry.toFixed(2)}</span>
            <span className="text-[#F6465D] font-bold">-- SL: ${activeStrategy.stop.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

