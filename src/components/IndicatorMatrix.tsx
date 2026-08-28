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
    <section className="bg-[#1E2329] border border-[#2B313A] rounded-xl p-5 sm:p-6 shadow-xl overflow-x-auto relative overflow-hidden transition-all">
      {/* Top Binance Yellow Accent line */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#F0B90B] via-[#F0B90B]/40 to-transparent"></div>

      <div className="flex flex-wrap justify-between items-center mb-4 pb-3 border-b border-[#2B313A]/80 gap-2">
        <h2 className="text-xs uppercase tracking-widest text-slate-300 font-bold flex items-center gap-2 m-0">
          <span className="w-2 h-2 bg-[#F0B90B] rounded-[2px] rotate-45 inline-block shadow-[0_0_8px_rgba(240,185,11,0.5)]"></span>
          <span>Matriz Financiera de Temporalidades & Indicadores</span>
        </h2>
        <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest bg-[#14171A] px-2.5 py-1 rounded-md border border-[#2B313A]">
          RSI 14 · MACD (12, 26, 9) · RVOL 20p · EMAs (9, 21, 50, 200)
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#2B313A]">
        <table className="w-full border-collapse text-xs whitespace-nowrap text-left">
          <thead>
            <tr className="text-slate-400 bg-[#14171A] border-b border-[#2B313A] font-mono text-[11px] uppercase tracking-wider">
              <th className="py-3 px-3.5 font-bold text-slate-200">TF</th>
              <th className="py-3 px-3.5 font-bold">Rol de Mercado</th>
              <th className="py-3 px-3.5 font-bold">Tendencia</th>
              <th className="py-3 px-3.5 font-bold text-right">EMA 9</th>
              <th className="py-3 px-3.5 font-bold text-right">EMA 21</th>
              <th className="py-3 px-3.5 font-bold text-right">EMA 50</th>
              <th className="py-3 px-3.5 font-bold text-right">EMA 200</th>
              <th className="py-3 px-3.5 font-bold text-right">RSI (14)</th>
              <th className="py-3 px-3.5 font-bold text-right">MACD</th>
              <th className="py-3 px-3.5 font-bold text-right">Vol Vela</th>
              <th className="py-3 px-3.5 font-bold text-right">Vol 24h</th>
              <th className="py-3 px-3.5 font-bold text-center">RVOL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2B313A]/60">
            {rows.map((r, index) => {
              const isEven = index % 2 === 0;
              const rowBg = isEven ? 'bg-[#1E2329]' : 'bg-[#181A20]';

              const trendBg =
                r.trend === 'Alcista'
                  ? 'bg-[#0ECB81]/15 text-[#0ECB81] border-[#0ECB81]/30'
                  : r.trend === 'Bajista'
                  ? 'bg-[#F6465D]/15 text-[#F6465D] border-[#F6465D]/30'
                  : 'bg-[#F0B90B]/15 text-[#F0B90B] border-[#F0B90B]/30';

              const rsiColor =
                r.rsi !== null
                  ? r.rsi > 70
                    ? 'text-[#F6465D] font-bold'
                    : r.rsi < 30
                    ? 'text-[#0ECB81] font-bold'
                    : 'text-slate-300'
                  : 'text-slate-500';

              const macdColor =
                r.macd !== null
                  ? r.macd >= 0
                    ? 'text-[#0ECB81]'
                    : 'text-[#F6465D]'
                  : 'text-slate-500';

              const rvolBadge =
                r.rvol !== null ? (
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-md font-mono font-bold text-[11px] tabular-nums ${
                      r.rvol >= 1.5
                        ? 'bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/40'
                        : r.rvol < 0.8
                        ? 'bg-[#F6465D]/15 text-[#F6465D] border border-[#F6465D]/40'
                        : 'bg-[#2B313A] text-slate-300 border border-[#363C4E]'
                    }`}
                  >
                    {r.rvol.toFixed(2)}x
                  </span>
                ) : (
                  <span className="text-slate-600 font-mono">---</span>
                );

              return (
                <tr
                  key={r.tf}
                  className={`${rowBg} hover:bg-[#262B34] transition-colors font-mono`}
                >
                  <td className="py-3 px-3.5 font-bold text-[#F0B90B]">{r.tf}</td>
                  <td className="py-3 px-3.5 text-slate-400 font-sans text-xs">{r.role}</td>
                  <td className="py-3 px-3.5 font-sans">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${trendBg}`}>
                      {r.trend}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-slate-200 text-right tabular-nums">{fmt(r.ema9)}</td>
                  <td className="py-3 px-3.5 text-slate-200 text-right tabular-nums">{fmt(r.ema21)}</td>
                  <td className="py-3 px-3.5 text-slate-200 text-right tabular-nums">{fmt(r.ema50)}</td>
                  <td className="py-3 px-3.5 text-slate-200 text-right tabular-nums">{fmt(r.ema200)}</td>
                  <td className={`py-3 px-3.5 text-right tabular-nums ${rsiColor}`}>{fmt(r.rsi, 1)}</td>
                  <td className={`py-3 px-3.5 text-right tabular-nums font-semibold ${macdColor}`}>{fmt(r.macd, 2)}</td>
                  <td className="py-3 px-3.5 text-slate-300 text-right tabular-nums">{fmtVol(r.volume)}</td>
                  <td className="py-3 px-3.5 text-slate-300 text-right tabular-nums">{fmtVol(r.vol24h)}</td>
                  <td className="py-3 px-3.5 text-center">{rvolBadge}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

