import React from 'react';
import { Candle } from '../types';
import { X, Calendar } from 'lucide-react';

interface CyclesModalProps {
  candles: Candle[];
  isOpen: boolean;
  onClose: () => void;
}

export const CyclesModal: React.FC<CyclesModalProps> = ({ candles, isOpen, onClose }) => {
  if (!isOpen) return null;

  const fmt = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '---');
  const chartDate = (ts: number) =>
    new Date(ts).toLocaleDateString([], {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const cycleRows = candles.slice(1).map((c, i) => {
    const prev = candles[i];
    const diff = c.close - prev.close;
    const variation = prev.close > 0 ? (diff / prev.close) * 100 : 0;
    const isBullish = variation >= 0;

    return {
      from: prev.time,
      to: c.time,
      startPrice: prev.close,
      endPrice: c.close,
      isBullish,
      variation,
    };
  });

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-amber-500"></div>

        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold m-0">
              Detalle de Ciclos de Mercado (Histórico)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto flex-1 border border-slate-800 rounded-lg bg-slate-950">
          <table className="w-full border-collapse text-xs whitespace-nowrap font-mono">
            <thead>
              <tr className="text-slate-400 text-left bg-slate-900/80 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 font-semibold">Desde</th>
                <th className="py-2.5 px-3 font-semibold">Hasta</th>
                <th className="py-2.5 px-3 font-semibold">Precio Inicial</th>
                <th className="py-2.5 px-3 font-semibold">Precio Final</th>
                <th className="py-2.5 px-3 font-semibold">Ciclo</th>
                <th className="py-2.5 px-3 font-semibold">Variación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {cycleRows.reverse().slice(0, 100).map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3 text-slate-400 font-sans">{chartDate(row.from)}</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">{chartDate(row.to)}</td>
                  <td className="py-2 px-3 text-slate-300">{fmt(row.startPrice)}</td>
                  <td className="py-2 px-3 text-white">{fmt(row.endPrice)}</td>
                  <td className="py-2 px-3 font-sans">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.isBullish
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {row.isBullish ? 'Alcista' : 'Bajista'}
                    </span>
                  </td>
                  <td
                    className={`py-2 px-3 font-bold ${
                      row.isBullish ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {row.isBullish ? '+' : ''}
                    {row.variation.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
