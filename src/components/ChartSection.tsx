import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Candle, MarketStructurePoint } from '../types';
import { calculateMarketStructure } from '../utils/indicators';
import { Maximize2, ZoomIn, ZoomOut, RotateCcw, Calendar } from 'lucide-react';

interface ChartSectionProps {
  candles: Candle[];
  symbol: string;
  onOpenCyclesModal: () => void;
}

export const ChartSection: React.FC<ChartSectionProps> = ({
  candles,
  symbol,
  onOpenCyclesModal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [hoveredCandle, setHoveredCandle] = useState<{
    candle: Candle;
    x: number;
    y: number;
  } | null>(null);

  const displayCandles = useMemo(() => {
    if (!candles || !candles.length) return [];
    return candles.slice(-120);
  }, [candles]);

  const structurePoints = useMemo(() => {
    return calculateMarketStructure(displayCandles, 3);
  }, [displayCandles]);

  // Render Canvas Chart
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !displayCandles.length) return;

    const width = container.clientWidth;
    const height = 420;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 25, right: 65, bottom: 35, left: 15 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Determine high / low bounds
    const highs = displayCandles.map(c => c.high);
    const lows = displayCandles.map(c => c.low);
    let maxPrice = Math.max(...highs);
    let minPrice = Math.min(...lows);
    const priceRange = maxPrice - minPrice || 1;
    maxPrice += priceRange * 0.05;
    minPrice -= priceRange * 0.05;

    const priceToY = (price: number) => {
      return padding.top + (1 - (price - minPrice) / (maxPrice - minPrice)) * chartHeight;
    };

    const candleCount = displayCandles.length;
    const effectiveWidth = chartWidth * zoomLevel;
    const candleWidth = Math.max(3, (effectiveWidth / candleCount) * 0.65);
    const candleSpacing = effectiveWidth / candleCount;

    // Draw grid lines
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

      // Price labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(p.toFixed(p > 1000 ? 1 : p > 1 ? 2 : 4), width - padding.right + 8, y + 4);
    }

    // Draw Candlesticks
    displayCandles.forEach((c, i) => {
      const x = padding.left + i * candleSpacing + candleSpacing / 2 + panOffset;
      if (x < padding.left - 10 || x > width - padding.right + 10) return;

      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);
      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);
      const isBullish = c.close >= c.open;

      ctx.strokeStyle = isBullish ? '#10b981' : '#ef4444';
      ctx.fillStyle = isBullish ? '#10b981' : '#ef4444';

      // Wick
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(closeY - openY));
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

      // Date labels along X-axis
      if (i % Math.ceil(candleCount / 6) === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        const dateStr = new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        ctx.fillText(dateStr, x, height - 12);
      }
    });

    // Draw Market Structure labels (HH, HL, LH, LL, Reversal stars)
    structurePoints.forEach(sp => {
      const idx = displayCandles.findIndex(c => c.time === sp.time);
      if (idx === -1) return;

      const x = padding.left + idx * candleSpacing + candleSpacing / 2 + panOffset;
      if (x < padding.left || x > width - padding.right) return;

      const y = priceToY(sp.price);
      const isHigh = sp.type === 'high';
      const labelY = isHigh ? y - 12 : y + 15;

      ctx.fillStyle = sp.direction === 'bull' ? '#10b981' : '#ef4444';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sp.label, x, labelY);

      if (sp.reversal) {
        ctx.fillStyle = '#facc15';
        ctx.font = '14px sans-serif';
        ctx.fillText('★', x, isHigh ? labelY - 14 : labelY + 14);
      }
    });
  }, [displayCandles, structurePoints, zoomLevel, panOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX - panOffset);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset(e.clientX - dragStartX);
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm relative overflow-hidden">
      {/* Top geometric line */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 via-amber-500/40 to-transparent"></div>

      <div className="flex flex-wrap justify-between items-center gap-3 mb-5 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2 m-0">
              <span className="w-2 h-2 bg-amber-500 rounded-sm rotate-45 inline-block"></span>
              Estructura de Mercado · Velas Japonesas
            </h2>
            <span className="text-xs bg-slate-950 text-amber-400 border border-slate-800 px-2 py-0.5 rounded font-mono font-bold">
              {symbol || '---'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 m-0">
            Arrastra horizontalmente para desplazar · Detección geométrica de pivotes (HH/HL/LH/LL)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.2))}
            className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors font-mono"
          >
            <ZoomIn className="w-3.5 h-3.5" /> + Zoom
          </button>
          <button
            onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.2))}
            className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors font-mono"
          >
            <ZoomOut className="w-3.5 h-3.5" /> − Zoom
          </button>
          <button
            onClick={() => {
              setZoomLevel(1);
              setPanOffset(0);
            }}
            className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restablecer
          </button>
          <button
            onClick={onOpenCyclesModal}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" /> Ciclos Históricos
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-[420px] bg-slate-950 border border-slate-800 rounded-lg relative overflow-hidden cursor-grab active:cursor-grabbing"
      >
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-4 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
          <span className="text-[11px] text-slate-300">Vela Alcista</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-500"></span>
          <span className="text-[11px] text-slate-300">Vela Bajista</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-slate-300 font-medium text-[11px]">HH / HL Alcista</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-red-400"></span>
          <span className="text-slate-300 font-medium text-[11px]">LL / LH Bajista</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
          <span className="text-amber-400">★</span>
          <span className="text-amber-300 font-medium text-[11px]">Cambio Estructura</span>
        </div>
      </div>
    </div>
  );
};
