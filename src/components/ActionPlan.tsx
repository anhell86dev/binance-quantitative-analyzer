import React from 'react';
import { TradeStrategy } from '../types';
import { ShieldAlert, CheckCircle2, TrendingUp, Download, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ActionPlanProps {
  strategies: TradeStrategy[];
  rvolConfirmed: boolean | null;
  rvolValue: number | null;
  oiStatus: string | null;
  oiAvg20: number | null;
  isDanger: boolean;
  onSelectTrade: (strategy: TradeStrategy) => void;
  onRefreshStrategy: () => void;
  onReset: () => void;
  onExport: () => void;
}

export const ActionPlan: React.FC<ActionPlanProps> = ({
  strategies,
  rvolConfirmed,
  rvolValue,
  oiStatus,
  oiAvg20,
  isDanger,
  onSelectTrade,
  onRefreshStrategy,
  onReset,
  onExport,
}) => {
  const fmt = (v: number) => (Number.isFinite(v) ? v.toFixed(v > 1000 ? 2 : v > 1 ? 4 : 6) : '---');

  return (
    <section className="bg-[#1E2329] border border-[#2B313A] rounded-xl p-5 sm:p-6 shadow-xl flex flex-col justify-between relative overflow-hidden transition-all">
      {/* Top Binance Yellow Accent line */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#F0B90B] via-[#F0B90B]/50 to-transparent"></div>

      <div>
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#2B313A]/80">
          <h2 className="text-xs uppercase tracking-widest text-slate-300 font-bold flex items-center gap-2 m-0">
            <span className="w-2 h-2 bg-[#F0B90B] rounded-[2px] rotate-45 inline-block shadow-[0_0_8px_rgba(240,185,11,0.5)]"></span>
            <span>Plan de Acción Cuantitativo</span>
          </h2>
          <button
            onClick={onRefreshStrategy}
            className="bg-[#14171A] hover:bg-[#F0B90B] hover:text-[#0B0E11] border border-[#2B313A] hover:border-[#F0B90B] text-slate-300 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold uppercase tracking-wider active:scale-95"
          >
            Actualizar
          </button>
        </div>

        {/* Notice: RVOL + OI Alignment */}
        {rvolConfirmed !== null && (
          <div className="bg-[#14171A] border border-[#2B313A] rounded-lg p-3.5 mb-3 text-xs">
            <h3 className="font-semibold text-slate-200 text-xs mb-1.5 flex items-center gap-1.5">
              {rvolConfirmed ? (
                <CheckCircle2 className="w-4 h-4 text-[#0ECB81]" />
              ) : (
                <TrendingUp className="w-4 h-4 text-[#F0B90B]" />
              )}
              Confirmación RVOL + Open Interest
            </h3>
            <div className="flex items-center gap-2 flex-wrap font-mono">
              <span
                className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                  rvolConfirmed
                    ? 'bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30'
                    : 'bg-[#2B313A] text-slate-400 border border-[#363C4E]'
                }`}
              >
                {rvolConfirmed
                  ? 'CONFIRMADO: RVOL + OI ALINEADOS'
                  : 'NO CONFIRMADO: RVOL/OI DIVERGENTES'}
              </span>
              <span className="text-slate-400 text-[11px] tabular-nums">RVOL: {rvolValue?.toFixed(2)}x</span>
            </div>
          </div>
        )}

        {/* Notice: Institutional OI Sentiment */}
        {oiStatus && (
          <div className="bg-[#14171A] border border-[#2B313A] rounded-lg p-3.5 mb-3 text-xs">
            <h3 className="font-semibold text-slate-200 text-xs mb-1.5">
              Sentimiento Institucional (OI)
            </h3>
            <div className="flex items-center gap-2 flex-wrap font-mono">
              <span
                className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                  oiStatus.includes('DINERO NUEVO')
                    ? 'bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30'
                    : oiStatus.includes('CIERRE')
                    ? 'bg-[#F6465D]/15 text-[#F6465D] border border-[#F6465D]/30'
                    : 'bg-[#2B313A] text-slate-400 border border-[#363C4E]'
                }`}
              >
                {oiStatus}
              </span>
              {oiAvg20 && (
                <span className="text-slate-400 text-[11px] tabular-nums">
                  Media 20p: {oiAvg20.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Liquidación por contracorriente Alert */}
        {isDanger && (
          <div className="bg-[#F6465D]/10 border border-[#F6465D]/40 rounded-lg p-3.5 mb-3 text-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-[#F6465D]"></div>
            <h3 className="font-semibold text-red-300 text-xs mb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#F6465D]" />
              Peligro: Trampa de Liquidación por Contracorriente
            </h3>
            <p className="text-red-200/80 m-0">
              RVOL ≥ 3.0 con Open Interest por debajo de su media de 20 periodos. Operativa protegida para evitar trampas de liquidez.
            </p>
          </div>
        )}

        {/* Generated Strategies */}
        <div className="space-y-3 mt-4">
          {strategies.length > 0 ? (
            strategies.map((strat, i) => {
              const isLong = strat.type === 'LONG';
              return (
                <div
                  key={i}
                  className={`border rounded-xl p-4 transition-all relative overflow-hidden bg-[#14171A] ${
                    isLong
                      ? 'border-[#0ECB81]/30'
                      : 'border-[#F6465D]/30'
                  }`}
                >
                  <div className={`absolute top-0 left-0 w-full h-1 ${isLong ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`}></div>

                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1 ${
                          isLong
                            ? 'bg-[#0ECB81] text-[#0B0E11]'
                            : 'bg-[#F6465D] text-white'
                        }`}
                      >
                        {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {strat.type}
                      </span>
                      <strong className="text-slate-100 text-xs">
                        {isLong ? 'Compra en Retroceso' : 'Venta en Rebote'}
                      </strong>
                    </div>
                    <span className="text-xs text-slate-400 bg-[#1E2329] px-2 py-0.5 rounded border border-[#2B313A] font-mono">
                      Confianza: <strong className="text-[#F0B90B]">{strat.score}/5</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 font-mono text-xs">
                    <div className="bg-[#1E2329] p-2.5 rounded-lg border border-[#2B313A]">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans block mb-0.5 font-semibold">
                        Entrada
                      </span>
                      <strong className="text-white text-sm tabular-nums">{fmt(strat.entry)}</strong>
                    </div>
                    <div className="bg-[#1E2329] p-2.5 rounded-lg border border-[#2B313A]">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans block mb-0.5 font-semibold">
                        Stop Loss
                      </span>
                      <strong className="text-[#F6465D] text-sm tabular-nums">{fmt(strat.stop)}</strong>
                    </div>
                    <div className="bg-[#1E2329] p-2.5 rounded-lg border border-[#2B313A]">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans block mb-0.5 font-semibold">
                        Take Profit
                      </span>
                      <strong className="text-[#0ECB81] text-sm tabular-nums">{fmt(strat.target)}</strong>
                    </div>
                    <div className="bg-[#1E2329] p-2.5 rounded-lg border border-[#2B313A]">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans block mb-0.5 font-semibold">
                        Ratio R:R
                      </span>
                      <strong className="text-[#F0B90B] text-sm tabular-nums">1:{strat.rr.toFixed(2)}</strong>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 m-0 mb-3.5 leading-relaxed">
                    Objetivo mínimo 1:{strat.goal}. {strat.reason}
                  </p>

                  <button
                    onClick={() => onSelectTrade(strat)}
                    className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] ${
                      isLong
                        ? 'bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-[#0B0E11] shadow-[0_0_12px_rgba(14,203,129,0.25)]'
                        : 'bg-[#F6465D] hover:bg-[#F6465D]/90 text-white shadow-[0_0_12px_rgba(246,70,93,0.25)]'
                    }`}
                  >
                    <span>Ejecutar {strat.type} en Binance Futures (LIVE)</span>
                  </button>
                </div>
              );
            })
          ) : (
            <div className="bg-[#14171A] border border-[#2B313A] rounded-lg p-5 text-center text-xs text-slate-400">
              <p className="m-0 font-medium text-slate-300">
                Sin operaciones sugeridas en este momento.
              </p>
              <p className="mt-1.5 text-[11px] text-slate-500 font-mono">
                Presiona "Auto-Analizar" para refrescar niveles o espera confirmación de R:R mínimo 1:2.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer Buttons */}
      <div className="flex gap-3 mt-6 pt-4 border-t border-[#2B313A]">
        <button
          onClick={onReset}
          className="flex-1 bg-[#14171A] hover:bg-[#2B313A] text-slate-300 border border-[#2B313A] text-xs py-2 px-3 rounded-lg font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Limpiar
        </button>
        <button
          onClick={onExport}
          className="flex-1 bg-[#14171A] hover:bg-[#F0B90B] hover:text-[#0B0E11] text-[#F0B90B] border border-[#2B313A] hover:border-[#F0B90B] text-xs py-2 px-3 rounded-lg font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
        >
          <Download className="w-3.5 h-3.5" /> Exportar JSON
        </button>
      </div>
    </section>
  );
};
