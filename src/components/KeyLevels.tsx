import React from 'react';
import { PivotLevels, TickerData } from '../types';

interface KeyLevelsProps {
  currentPrice: number | null;
  ticker: TickerData | null;
  openInterest: number | null;
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
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm relative overflow-hidden">
      {/* Top geometric accent indicator */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 via-amber-500/50 to-transparent"></div>

      <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800">
        <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2 m-0">
          <span className="w-2 h-2 bg-amber-500 rounded-sm rotate-45 inline-block"></span>
          Niveles Clave & Estructura
        </h2>
        <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
          REAL-TIME TELEMETRY
        </span>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Precio actual */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-amber-500"></div>
          <small className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Precio Actual
          </small>
          <strong className="text-2xl font-bold font-mono text-white mt-1.5 block tracking-tight">
            {fmt(currentPrice)}
          </strong>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs font-medium text-emerald-400 font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold">EN VIVO</span>
            {ticker && (
              <span className={`ml-1 text-[11px] ${priceDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {priceDiff >= 0 ? '+' : ''}
                {priceDiff.toFixed(2)}$ ({pricePercent >= 0 ? '+' : ''}
                {pricePercent.toFixed(2)}%)
              </span>
            )}
          </div>
        </div>

        {/* Open Interest */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-slate-700"></div>
          <small className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Open Interest
          </small>
          <strong className="text-2xl font-bold font-mono text-slate-100 mt-1.5 block tracking-tight">
            {openInterest !== null
              ? openInterest.toLocaleString('en-US', { maximumFractionDigits: 2 })
              : '---'}
          </strong>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mt-2.5">
            Contratos Abiertos (Futuros)
          </div>
        </div>

        {/* RVOL 5m */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-amber-500/80"></div>
          <small className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            RVOL Móvil 5m
          </small>
          <div className="mt-1.5">
            {rvol5m !== null ? (
              <span
                className={`inline-block px-2.5 py-0.5 rounded-sm text-base font-bold font-mono ${
                  rvol5m >= 2
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40'
                    : rvol5m >= 1.5
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/40'
                    : rvol5m < 0.8
                    ? 'bg-red-500/10 text-red-400 border border-red-500/40'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {rvol5m.toFixed(2)}x
              </span>
            ) : (
              <span className="text-slate-600 font-mono text-xl">---</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mt-2">
            {rvol5m && rvol5m >= 2
              ? '⚡ Actividad Institucional'
              : rvol5m && rvol5m >= 1.5
              ? 'Volumen Sobre Promedio'
              : 'Volumen Estándar'}
          </div>
        </div>
      </div>

      {/* Ranges (Daily & 52-Week) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3.5">
        {/* Rango Diario */}
        <div className="bg-slate-950/70 rounded-lg p-4 border border-slate-800">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span className="font-mono text-slate-300">{dayRange ? fmt(dayRange.min) : '---'}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">RANGO DIARIO</span>
            <span className="font-mono text-slate-300">{dayRange ? fmt(dayRange.max) : '---'}</span>
          </div>
          <div className="h-1.5 bg-slate-900 border border-slate-800 rounded-full my-3.5 relative">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300"
              style={{ width: `${dayFillPercent}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-amber-400 border-2 border-slate-950 rounded-full shadow transition-all duration-300"
              style={{ left: `${dayFillPercent}%` }}
            />
          </div>
          <div className="text-center text-[11px] font-mono text-slate-400">
            Precio actual: <span className="text-slate-100 font-bold">{fmt(currentPrice)}</span>
          </div>
        </div>

        {/* Rango 52 Semanas */}
        <div className="bg-slate-950/70 rounded-lg p-4 border border-slate-800">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span className="font-mono text-slate-300">{yearRange ? fmt(yearRange.min) : '---'}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">RANGO 52 SEMANAS</span>
            <span className="font-mono text-slate-300">{yearRange ? fmt(yearRange.max) : '---'}</span>
          </div>
          <div className="h-1.5 bg-slate-900 border border-slate-800 rounded-full my-3.5 relative">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-slate-600 via-amber-500 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${yearFillPercent}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-slate-950 rounded-full shadow transition-all duration-300"
              style={{ left: `${yearFillPercent}%` }}
            />
          </div>
          <div className="text-center text-[11px] font-mono text-slate-400">
            Precio actual: <span className="text-slate-100 font-bold">{fmt(currentPrice)}</span>
          </div>
        </div>
      </div>

      {/* Soportes y Resistencias (1D & 4H) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3.5">
        {/* 1D S/R */}
        <div className="bg-slate-950/70 rounded-lg p-4 border border-slate-800">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 text-center pb-2.5 mb-3 border-b border-slate-800">
            Pivotes S/R · 1D (Macro)
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-red-400">R3</span>
              <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px]">
                {fmt(sr1d.r3)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-emerald-400">S1</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px]">
                {fmt(sr1d.s1)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-red-400">R2</span>
              <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px]">
                {fmt(sr1d.r2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-emerald-400">S2</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px]">
                {fmt(sr1d.s2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-red-400">R1</span>
              <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px]">
                {fmt(sr1d.r1)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-emerald-400">S3</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px]">
                {fmt(sr1d.s3)}
              </span>
            </div>
          </div>
        </div>

        {/* 4H S/R */}
        <div className="bg-slate-950/70 rounded-lg p-4 border border-slate-800">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 text-center pb-2.5 mb-3 border-b border-slate-800">
            Pivotes S/R · 4H (Intradía)
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-red-400">R3</span>
              <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px]">
                {fmt(sr4h.r3)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-emerald-400">S1</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px]">
                {fmt(sr4h.s1)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-red-400">R2</span>
              <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px]">
                {fmt(sr4h.r2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-emerald-400">S2</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px]">
                {fmt(sr4h.s2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-red-400">R1</span>
              <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px]">
                {fmt(sr4h.r1)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[11px] font-mono font-bold text-emerald-400">S3</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-semibold text-right min-w-[70px]">
                {fmt(sr4h.s3)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
