import React from 'react';
import { OrderFlowAnalysis } from '../types';
import {
  Waves,
  Zap,
  Clock,
  TrendingUp,
  TrendingDown,
  Layers,
  Magnet,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
} from 'lucide-react';

interface OrderFlowMetricsProps {
  orderFlow: OrderFlowAnalysis;
  currentPrice: number;
  symbol: string;
}

export const OrderFlowMetrics: React.FC<OrderFlowMetricsProps> = ({
  orderFlow,
  currentPrice,
  symbol,
}) => {
  const fmt = (n: number | null | undefined, dec: number = 2) => {
    if (n === null || n === undefined || isNaN(n)) return '---';
    return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };

  const takerBuyPct = Math.round(orderFlow.takerBuyRatio * 100);
  const takerSellPct = 100 - takerBuyPct;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <Waves className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xs uppercase tracking-widest text-slate-200 font-bold m-0 flex items-center gap-2">
              Microestructura & Order Flow (Binance Futures)
              <span className="bg-slate-800 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-mono font-normal">
                {symbol}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 m-0">
              Presión compradora/vendedora acumulada (CVD), clusters de liquidación e imanes de precio.
            </p>
          </div>
        </div>

        {/* Funding Rate live badge */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 text-[10px] uppercase">Financiamiento:</span>
          <span className={`font-bold ${orderFlow.fundingRate.rate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {(orderFlow.fundingRate.rate * 100).toFixed(4)}%
          </span>
          <span className="text-slate-500 text-[10px]">({orderFlow.fundingRate.countdownText})</span>
        </div>
      </div>

      {/* Grid: 3 Analytical Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. CVD & Volume Delta */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Delta & Agresividad CVD
              </span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                orderFlow.aggressiveSide === 'BUYERS'
                  ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300'
                  : orderFlow.aggressiveSide === 'SELLERS'
                  ? 'bg-red-950 border border-red-500/40 text-red-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {orderFlow.aggressiveSide === 'BUYERS'
                ? 'Agresores Compra'
                : orderFlow.aggressiveSide === 'SELLERS'
                ? 'Agresores Venta'
                : 'Delta Equilibrado'}
            </span>
          </div>

          {/* Ratio Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> Compra: {takerBuyPct}%
              </span>
              <span className="text-red-400 font-bold flex items-center gap-1">
                Venta: {takerSellPct}% <ArrowDownRight className="w-3 h-3" />
              </span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex border border-slate-800">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${takerBuyPct}%` }}
              />
              <div
                className="bg-red-500 h-full transition-all duration-500"
                style={{ width: `${takerSellPct}%` }}
              />
            </div>
          </div>

          {/* Divergence Status */}
          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg text-xs space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-semibold">
              Divergencia CVD / Absorción
            </span>
            <p className="text-slate-200 m-0 font-medium flex items-center gap-1.5">
              {orderFlow.cvdDivergence.includes('Alcista') ? (
                <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : orderFlow.cvdDivergence.includes('Bajista') ? (
                <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" />
              ) : (
                <Activity className="w-4 h-4 text-slate-400 flex-shrink-0" />
              )}
              <span>{orderFlow.cvdDivergence}</span>
            </p>
          </div>
        </div>

        {/* 2. Liquidity Magnets & Target Pools */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Magnet className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Imanes de Precio de Liquidez
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-500 uppercase">Pools 50x / 100x</span>
          </div>

          {/* Magnet Cards */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Short Magnet (Upper pool) */}
            <div className="bg-slate-900 border border-red-500/20 p-2 rounded-lg">
              <span className="text-[9px] text-red-400 uppercase tracking-wider block font-bold flex items-center gap-1">
                <Flame className="w-3 h-3" /> Imán Superior (Shorts)
              </span>
              <span className="text-white font-mono font-bold text-xs mt-0.5 block">
                ${fmt(orderFlow.liquidationMagnetShort)}
              </span>
              <span className="text-[9px] text-slate-400 font-mono">
                {orderFlow.liquidationMagnetShort && currentPrice
                  ? `+${(((orderFlow.liquidationMagnetShort - currentPrice) / currentPrice) * 100).toFixed(2)}%`
                  : '---'}
              </span>
            </div>

            {/* Long Magnet (Lower pool) */}
            <div className="bg-slate-900 border border-emerald-500/20 p-2 rounded-lg">
              <span className="text-[9px] text-emerald-400 uppercase tracking-wider block font-bold flex items-center gap-1">
                <Flame className="w-3 h-3" /> Imán Inferior (Longs)
              </span>
              <span className="text-white font-mono font-bold text-xs mt-0.5 block">
                ${fmt(orderFlow.liquidationMagnetLong)}
              </span>
              <span className="text-[9px] text-slate-400 font-mono">
                {orderFlow.liquidationMagnetLong && currentPrice
                  ? `-${(((currentPrice - orderFlow.liquidationMagnetLong) / currentPrice) * 100).toFixed(2)}%`
                  : '---'}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 m-0 leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800/80">
            Los pools de alta densidad actúan como zonas de atracción gravitacional donde el mercado barre stops antes de revertir.
          </p>
        </div>

        {/* 3. Heatmap de Liquidaciones Estimado */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Heatmap de Liquidación
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-500">Estimación Multi-Nivel</span>
          </div>

          {/* Mini Liquidation Table */}
          <div className="space-y-1 text-[10px] font-mono">
            {orderFlow.liquidationLevels.slice(0, 4).map((lvl, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-slate-900/90 px-2 py-1 rounded border border-slate-800/60"
              >
                <span
                  className={`font-bold px-1 rounded text-[9px] ${
                    lvl.side === 'SHORT' ? 'text-red-400 bg-red-950/50' : 'text-emerald-400 bg-emerald-950/50'
                  }`}
                >
                  {lvl.side} {lvl.leverage}x
                </span>
                <span className="text-white font-semibold">${fmt(lvl.estimatedPrice)}</span>
                <span className="text-slate-400 text-[9px]">
                  {lvl.side === 'SHORT' ? `+${lvl.distancePercent.toFixed(1)}%` : `-${lvl.distancePercent.toFixed(1)}%`}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
            <span>Sentimiento Tasa:</span>
            <span className="text-amber-300 font-semibold">{orderFlow.fundingRate.sentiment}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
