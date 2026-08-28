import React from 'react';
import { PivotLevels, TickerData } from '../types';
import { Activity, Flame, ShieldAlert, Layers } from 'lucide-react';

interface KeyLevelsProps {
  currentPrice: number | null;
  ticker: TickerData | null;
  openInterest: number | string | any | null;
  rvol5m: number | null;
  dayRange: { min: number; max: number } | null;
  yearRange: { min: number; max: number } | null;
  sr1d: PivotLevels;
  sr4h: PivotLevels;
}

export const KeyLevels: React.FC<KeyLevelsProps> = ({
  currentPrice,
  ticker,
  openInterest,
  rvol5m,
  dayRange,
  yearRange,
  sr1d,
  sr4h,
}) => {
  const fmt = (v: number | null) => (v !== null && Number.isFinite(v) ? v.toFixed(v > 1000 ? 2 : v > 1 ? 4 : 6) : '---');
  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  const numericOi = React.useMemo(() => {
    if (openInterest === null || openInterest === undefined) return null;
    if (typeof openInterest === 'number') return Number.isFinite(openInterest) ? openInterest : null;
    if (typeof openInterest === 'string') {
      const n = parseFloat(openInterest);
      return Number.isFinite(n) ? n : null;
    }
    if (typeof openInterest === 'object') {
      const val = (openInterest as any).value ?? (openInterest as any).openInterest;
      const n = typeof val === 'number' ? val : parseFloat(String(val));
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }, [openInterest]);

  const priceDiff = currentPrice && ticker ? currentPrice - Number(ticker.openPrice) : 0;
  const pricePercent = currentPrice && ticker && Number(ticker.openPrice) > 0 ? (priceDiff / Number(ticker.openPrice)) * 100 : 0;

  const dayFillPercent =
    currentPrice && dayRange && dayRange.max > dayRange.min
      ? clamp(((currentPrice - dayRange.min) / (dayRange.max - dayRange.min)) * 100)
      : 50;

  const yearFillPercent =
    currentPrice && yearRange && yearRange.max > yearRange.min
      ? clamp(((currentPrice - yearRange.min) / (yearRange.max - yearRange.min)) * 100)
      : 50;

  return (
    <section className="bg-[#1E2329] border border-[#2B313A] rounded-xl p-5 sm:p-6 shadow-xl relative overflow-hidden transition-all">
      {/* Top geometric Binance yellow accent */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#F0B90B] via-[#F0B90B]/50 to-transparent"></div>

      <div className="flex flex-wrap justify-between items-center mb-5 pb-3 border-b border-[#2B313A]/80 gap-2">
        <h2 className="text-xs uppercase tracking-widest text-slate-300 font-bold flex items-center gap-2 m-0">
          <span className="w-2 h-2 bg-[#F0B90B] rounded-[2px] rotate-45 inline-block shadow-[0_0_8px_rgba(240,185,11,0.5)]"></span>
          <span>Niveles Clave & Estructura Cuantitativa</span>
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 bg-[#14171A] px-2.5 py-1 rounded-md border border-[#2B313A] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-ping"></span>
            <span>BINANCE TELEMETRY</span>
          </span>
        </div>
      </div>

      {/* 3 Main KPI Metric Cards (Responsive Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* KPI 1: PRECIO ACTUAL */}
        <div className="bg-[#181A20] border border-[#2B313A] hover:border-[#F0B90B]/40 rounded-xl p-4 relative overflow-hidden transition-all duration-200 group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-[#F0B90B] group-hover:h-[3px] transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F0B90B]"></span>
              Precio Actual (USD)
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0ECB81] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0ECB81]"></span>
              </span>
              LIVE
            </span>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight tabular-nums">
              ${fmt(currentPrice)}
            </span>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#2B313A]/60 text-xs font-mono">
            <span className="text-[11px] text-slate-400">Var 24h:</span>
            {ticker ? (
              <span
                className={`font-bold flex items-center gap-1 ${
                  priceDiff >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                }`}
              >
                <span>{priceDiff >= 0 ? '+' : ''}{priceDiff.toFixed(2)}$</span>
                <span>({pricePercent >= 0 ? '+' : ''}{pricePercent.toFixed(2)}%)</span>
              </span>
            ) : (
              <span className="text-slate-500">---</span>
            )}
          </div>
        </div>

        {/* KPI 2: OPEN INTEREST */}
        <div className="bg-[#181A20] border border-[#2B313A] hover:border-[#F0B90B]/40 rounded-xl p-4 relative overflow-hidden transition-all duration-200 group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-slate-600 group-hover:bg-[#F0B90B] transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-slate-400" />
              Open Interest (OI)
            </span>
            <span className="text-[10px] font-mono text-slate-400 uppercase">
              FUTURES
            </span>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-100 tracking-tight tabular-nums">
              {numericOi !== null
                ? numericOi.toLocaleString('en-US', { maximumFractionDigits: 2 })
                : '---'}
            </span>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#2B313A]/60 text-xs font-mono">
            <span className="text-[11px] text-slate-400">Contratos Activos:</span>
            <span className="text-slate-300 font-semibold">
              {numericOi !== null && numericOi > 0 ? 'Flujo Activo' : 'Sin datos'}
            </span>
          </div>
        </div>

        {/* KPI 3: RVOL MÓVIL 5M */}
        <div className="bg-[#181A20] border border-[#2B313A] hover:border-[#F0B90B]/40 rounded-xl p-4 relative overflow-hidden transition-all duration-200 group">
          <div
            className={`absolute top-0 left-0 w-full h-[2px] transition-all ${
              (rvol5m || 0) >= 2
                ? 'bg-[#0ECB81]'
                : (rvol5m || 0) >= 1.5
                ? 'bg-[#F0B90B]'
                : 'bg-slate-600'
            }`}
          ></div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-[#F0B90B]" />
              RVOL Móvil 5m
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Media 20p
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            {rvol5m !== null ? (
              <span
                className={`inline-flex items-center px-3 py-0.5 rounded-lg text-2xl font-bold font-mono tracking-tight ${
                  rvol5m >= 2
                    ? 'bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/40'
                    : rvol5m >= 1.5
                    ? 'bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/40'
                    : rvol5m < 0.8
                    ? 'bg-[#F6465D]/15 text-[#F6465D] border border-[#F6465D]/40'
                    : 'bg-[#2B313A] text-slate-300 border border-[#363C4E]'
                }`}
              >
                {rvol5m.toFixed(2)}x
              </span>
            ) : (
              <span className="text-slate-500 font-mono text-2xl">---</span>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#2B313A]/60 text-xs font-mono">
            <span className="text-[11px] text-slate-400">Estado:</span>
            <span
              className={`font-semibold text-[11px] ${
                (rvol5m || 0) >= 2
                  ? 'text-[#0ECB81]'
                  : (rvol5m || 0) >= 1.5
                  ? 'text-[#F0B90B]'
                  : 'text-slate-400'
              }`}
            >
              {(rvol5m || 0) >= 2
                ? '⚡ Fuerte Inyección'
                : (rvol5m || 0) >= 1.5
                ? 'Sobre el Promedio'
                : 'Volumen Normal'}
            </span>
          </div>
        </div>
      </div>

      {/* Ranges (Daily & 52-Week) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
        {/* Rango Diario */}
        <div className="bg-[#181A20] rounded-xl p-4 border border-[#2B313A]">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span className="font-mono text-slate-300 tabular-nums">{dayRange ? fmt(dayRange.min) : '---'}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">RANGO DIARIO 24H</span>
            <span className="font-mono text-slate-300 tabular-nums">{dayRange ? fmt(dayRange.max) : '---'}</span>
          </div>
          <div className="h-2 bg-[#0B0E11] border border-[#2B313A] rounded-full my-3 relative overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#F0B90B]/60 to-[#F0B90B] rounded-full transition-all duration-300"
              style={{ width: `${dayFillPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
            <span>Mín: {dayRange ? fmt(dayRange.min) : '---'}</span>
            <span className="text-white font-bold">Pos: {dayFillPercent.toFixed(1)}%</span>
            <span>Máx: {dayRange ? fmt(dayRange.max) : '---'}</span>
          </div>
        </div>

        {/* Rango 52 Semanas */}
        <div className="bg-[#181A20] rounded-xl p-4 border border-[#2B313A]">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span className="font-mono text-slate-300 tabular-nums">{yearRange ? fmt(yearRange.min) : '---'}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">RANGO 52 SEMANAS</span>
            <span className="font-mono text-slate-300 tabular-nums">{yearRange ? fmt(yearRange.max) : '---'}</span>
          </div>
          <div className="h-2 bg-[#0B0E11] border border-[#2B313A] rounded-full my-3 relative overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#F6465D] via-[#F0B90B] to-[#0ECB81] rounded-full transition-all duration-300"
              style={{ width: `${yearFillPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
            <span>Mín 52S: {yearRange ? fmt(yearRange.min) : '---'}</span>
            <span className="text-white font-bold">Pos: {yearFillPercent.toFixed(1)}%</span>
            <span>Máx 52S: {yearRange ? fmt(yearRange.max) : '---'}</span>
          </div>
        </div>
      </div>

      {/* Soportes y Resistencias (1D & 4H) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3.5">
        {/* 1D S/R */}
        <div className="bg-[#181A20] rounded-xl p-4 border border-[#2B313A]">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-300 text-center pb-2.5 mb-3 border-b border-[#2B313A]">
            Pivotes S/R · 1D (Macro)
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-[#F6465D]">R3</span>
              <span className="bg-[#F6465D]/10 text-[#F6465D] border border-[#F6465D]/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px] tabular-nums">
                {fmt(sr1d.r3)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-[#0ECB81]">S1</span>
              <span className="bg-[#0ECB81]/10 text-[#0ECB81] border border-[#0ECB81]/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px] tabular-nums">
                {fmt(sr1d.s1)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-[#F6465D]">R2</span>
              <span className="bg-[#F6465D]/10 text-[#F6465D] border border-[#F6465D]/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px] tabular-nums">
                {fmt(sr1d.r2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-[#0ECB81]">S2</span>
              <span className="bg-[#0ECB81]/10 text-[#0ECB81] border border-[#0ECB81]/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px] tabular-nums">
                {fmt(sr1d.s2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-[#F6465D]">R1</span>
              <span className="bg-[#F6465D]/10 text-[#F6465D] border border-[#F6465D]/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px] tabular-nums">
                {fmt(sr1d.r1)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-[#0ECB81]">S3</span>
              <span className="bg-[#0ECB81]/10 text-[#0ECB81] border border-[#0ECB81]/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px] tabular-nums">
                {fmt(sr1d.s3)}
              </span>
            </div>
          </div>
        </div>

        {/* 4H S/R */}
        <div className="bg-[#181A20] rounded-xl p-4 border border-[#2B313A]">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-300 text-center pb-2.5 mb-3 border-b border-[#2B313A]">
            Pivotes S/R · 4H (Intradía)
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-[#F6465D]">R3</span>
              <span className="bg-[#F6465D]/10 text-[#F6465D] border border-[#F6465D]/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px] tabular-nums">
                {fmt(sr4h.r3)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-[#0ECB81]">S1</span>
              <span className="bg-[#0ECB81]/10 text-[#0ECB81] border border-[#0ECB81]/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px] tabular-nums">
                {fmt(sr4h.s1)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-[#F6465D]">R2</span>
              <span className="bg-[#F6465D]/10 text-[#F6465D] border border-[#F6465D]/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px] tabular-nums">
                {fmt(sr4h.r2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-[#0ECB81]">S2</span>
              <span className="bg-[#0ECB81]/10 text-[#0ECB81] border border-[#0ECB81]/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px] tabular-nums">
                {fmt(sr4h.s2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-[#F6465D]">R1</span>
              <span className="bg-[#F6465D]/10 text-[#F6465D] border border-[#F6465D]/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px] tabular-nums">
                {fmt(sr4h.r1)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-[#0ECB81]">S3</span>
              <span className="bg-[#0ECB81]/10 text-[#0ECB81] border border-[#0ECB81]/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px] tabular-nums">
                {fmt(sr4h.s3)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

