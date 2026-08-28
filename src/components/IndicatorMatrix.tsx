import React from 'react';
import { IndicatorRow } from '../types';

interface IndicatorMatrixProps {
  rows: IndicatorRow[];
}

export const IndicatorMatrix: React.FC<IndicatorMatrixProps> = ({ rows }) => {
  const fmt = (v: number | null, decimals: number = 2) =>
    v !== null && Number.isFinite(v) ? v.toFixed(decimals) : '---';

  const fmtVol = (v: number | null) => {
    if (v === null || !Number.isFinite(v)) return '---';
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
    return v.toFixed(0);
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm overflow-x-auto relative overflow-hidden">
      {/* Top geometric line */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 via-amber-500/40 to-transparent"></div>

      <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
        <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2 m-0">
          <span className="w-2 h-2 bg-amber-500 rounded-sm rotate-45 inline-block"></span>
          Matriz de Temporalidades & Indicadores
        </h2>
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
          RSI 14 · MACD (12, 26, 9) · RVOL 20p
        </span>
      </div>

      <table className="w-full border-collapse text-xs whitespace-nowrap">
        <thead>
          <tr className="text-slate-400 text-left bg-slate-950/80 border-b border-slate-800 font-mono text-[11px] uppercase tracking-wider">
            <th className="py-2.5 px-3.5 font-bold text-slate-300 rounded-l-lg">TF</th>
            <th className="py-2.5 px-3.5 font-bold">Rol</th>
            <th className="py-2.5 px-3.5 font-bold">Tendencia</th>
            <th className="py-2.5 px-3.5 font-bold">EMA 9</th>
            <th className="py-2.5 px-3.5 font-bold">EMA 21</th>
            <th className="py-2.5 px-3.5 font-bold">EMA 50</th>
            <th className="py-2.5 px-3.5 font-bold">EMA 200</th>
            <th className="py-2.5 px-3.5 font-bold">RSI (14)</th>
            <th className="py-2.5 px-3.5 font-bold">MACD</th>
            <th className="py-2.5 px-3.5 font-bold">Vol Vela</th>
            <th className="py-2.5 px-3.5 font-bold">Vol 24h</th>
            <th className="py-2.5 px-3.5 font-bold rounded-r-lg">RVOL</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">
          {rows.map(r => {
            const trendBg =
              r.trend === 'Alcista'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : r.trend === 'Bajista'
                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30';

            const rsiColor =
              r.rsi !== null
                ? r.rsi > 70
                  ? 'text-red-400 font-semibold'
                  : r.rsi < 30
                  ? 'text-emerald-400 font-semibold'
                  : 'text-slate-300'
                : 'text-slate-500';

            const macdColor =
              r.macd !== null
                ? r.macd >= 0
                  ? 'text-emerald-400'
                  : 'text-red-400'
                : 'text-slate-500';

            const rvolBadge =
              r.rvol !== null ? (
                <span
                  className={`px-2 py-0.5 rounded-sm font-mono font-bold text-[11px] ${
                    r.rvol >= 1.5
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : r.rvol < 0.8
                      ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {r.rvol.toFixed(2)}x
                </span>
              ) : (
                '---'
              );

            return (
              <tr key={r.tf} className="hover:bg-slate-800/40 transition-colors font-mono">
                <td className="py-3 px-3.5 font-bold text-amber-400">{r.tf}</td>
                <td className="py-3 px-3.5 text-slate-400 font-sans text-xs">{r.role}</td>
                <td className="py-3 px-3.5 font-sans">
                  <span className={`inline-block px-2 py-0.5 rounded-sm text-[11px] font-bold border ${trendBg}`}>
                    {r.trend}
                  </span>
                </td>
                <td className="py-3 px-3.5 text-slate-200">{fmt(r.ema9)}</td>
                <td className="py-3 px-3.5 text-slate-200">{fmt(r.ema21)}</td>
                <td className="py-3 px-3.5 text-slate-200">{fmt(r.ema50)}</td>
                <td className="py-3 px-3.5 text-slate-200">{fmt(r.ema200)}</td>
                <td className={`py-3 px-3.5 ${rsiColor}`}>{fmt(r.rsi, 1)}</td>
                <td className={`py-3 px-3.5 ${macdColor}`}>{fmt(r.macd, 2)}</td>
                <td className="py-3 px-3.5 text-slate-300">{fmtVol(r.volume)}</td>
                <td className="py-3 px-3.5 text-slate-300">{fmtVol(r.vol24h)}</td>
                <td className="py-3 px-3.5">{rvolBadge}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
};
