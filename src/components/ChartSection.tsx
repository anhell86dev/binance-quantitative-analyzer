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
    ctx.strokeStyle = '#1e293b';
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
      ctx.fillStyle = '#94a3b8';
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
      ctx.fillStyle = isGreen ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)';
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
      drawEmaLine(ema21Series, '#f59e0b', 1.4);  // Amber EMA 21
      drawEmaLine(ema50Series, '#6366f1', 1.2);  // Indigo EMA 50
      drawEmaLine(ema200Series, '#a855f7', 1.6); // Purple EMA 200
    }

    // Draw Strategy Target/Stop/Entry Overlays if enabled
    if (showLevelsOverlay && activeStrategy) {
      // Take Profit Line (Green dashed)
      const tpY = priceToY(activeStrategy.target);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, tpY);
      ctx.lineTo(width - padding.right, tpY);
      ctx.stroke();
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`TP: ${activeStrategy.target.toFixed(2)}`, width - padding.right + 6, tpY - 3);

      // Stop Loss Line (Red dashed)
      const slY = priceToY(activeStrategy.stop);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, slY);
      ctx.lineTo(width - padding.right, slY);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`SL: ${activeStrategy.stop.toFixed(2)}`, width - padding.right + 6, slY - 3);

      // Entry Price Line (Amber solid)
      const entryY = priceToY(activeStrategy.entry);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(padding.left, entryY);
      ctx.lineTo(width - padding.right, entryY);
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
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
      ctx.strokeStyle = isGreen ? '#10b981' : '#ef4444';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      ctx.fillStyle = isGreen ? '#10b981' : '#ef4444';
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
      ctx.fillStyle = pt.direction === 'bull' ? '#10b981' : '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label Text
      ctx.fillStyle = pt.direction === 'bull' ? '#34d399' : '#f87171';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      const labelY = pt.type === 'high' ? y - 8 : y + 14;
      ctx.fillText(pt.label, x, labelY);

      // Reversal Star
      if (pt.reversal) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('★', x, pt.type === 'high' ? y - 18 : y + 24);
      }
    });

    // Draw Current Live Price line
    if (currentPrice && currentPrice >= minPrice && currentPrice <= maxPrice) {
      const liveY = priceToY(currentPrice);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padding.left, liveY);
      ctx.lineTo(width - padding.right, liveY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Live price tag
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(width - padding.right, liveY - 9, 74, 18);
      ctx.fillStyle = '#ffffff';
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xs uppercase tracking-widest text-slate-200 font-bold m-0 flex items-center gap-2">
              Gráfico Dinámico & Estructura de Mercado
              <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                {symbol} ({selectedTf.toUpperCase()})
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 m-0">
              Detección algorítmica de swing points (HH/HL/LH/LL), EMAs dinámicas y volumen.
            </p>
          </div>
        </div>

        {/* Timeframe selector & Tools */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Timeframe Chips */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            {(['1d', '4h', '1h', '15m', '5m'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setSelectedTf(tf)}
                className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                  selectedTf === tf
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          {/* EMAs Toggle Button */}
          <button
            onClick={() => setShowEmas(!showEmas)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors ${
              showEmas
                ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
            title="Mostrar u ocultar líneas de medias móviles exponenciales (EMA 9, 21, 50, 200)"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">EMAs (9,21,50,200)</span>
          </button>

          {/* Levels Overlay Toggle */}
          <button
            onClick={() => setShowLevelsOverlay(!showLevelsOverlay)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors ${
              showLevelsOverlay
                ? 'bg-slate-950 border-amber-500/40 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
            title="Mostrar/Ocultar niveles de TP, SL y Entry"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase">Niveles TP/SL</span>
          </button>

          {/* Zoom In / Out */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.2))}
              className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.2))}
              className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
              title="Reducir zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoomLevel(1);
                setPanOffset(0);
              }}
              className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
              title="Restablecer vista"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Historical Cycles Modal */}
          <button
            onClick={onOpenCyclesModal}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
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
        className="w-full h-[440px] bg-slate-950 border border-slate-800 rounded-xl relative overflow-hidden cursor-grab active:cursor-grabbing shadow-inner"
      >
        {displayCandles.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs space-y-2">
            <Layers className="w-8 h-8 text-amber-500/50 animate-bounce" />
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
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
            <span className="text-[11px] text-slate-300">Vela Alcista</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500"></span>
            <span className="text-[11px] text-slate-300">Vela Bajista</span>
          </div>

          {/* EMA Legends */}
          {showEmas && (
            <div className="flex items-center gap-2 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[10px]">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2 h-0.5 bg-cyan-400 inline-block"></span>EMA 9
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-0.5 bg-amber-400 inline-block"></span>EMA 21
              </span>
              <span className="flex items-center gap-1 text-indigo-400">
                <span className="w-2 h-0.5 bg-indigo-400 inline-block"></span>EMA 50
              </span>
              <span className="flex items-center gap-1 text-purple-400">
                <span className="w-2 h-0.5 bg-purple-400 inline-block"></span>EMA 200
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300 text-[10px]">HH / HL Alcista</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            <span className="text-slate-300 text-[10px]">LL / LH Bajista</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            <span className="text-amber-400">★</span>
            <span className="text-amber-300 text-[10px]">Cambio de Carácter</span>
          </div>
        </div>

        {activeStrategy && (
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-emerald-400 font-bold">-- TP: ${activeStrategy.target.toFixed(2)}</span>
            <span className="text-amber-400 font-bold">-- ENTRY: ${activeStrategy.entry.toFixed(2)}</span>
            <span className="text-red-400 font-bold">-- SL: ${activeStrategy.stop.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

