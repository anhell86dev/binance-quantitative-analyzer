import React, { useState } from 'react';
import { BinanceDashboardData } from '../types';
import {
  RefreshCw,
  Wallet,
  ShieldCheck,
  ArrowDownRight,
  ArrowUpRight,
  Key,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Activity,
  CheckCircle2,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { verifyBinanceApiKeys, ApiKeyVerificationResult } from '../utils/marketService';

interface BinanceWalletTabProps {
  data: BinanceDashboardData | null;
  isLoading: boolean;
  onSync: () => void;
  apiConfigured: boolean;
  initialApiKey?: string;
  initialApiSecret?: string;
  onSaveCustomKeys?: (key: string, secret: string) => void;
}

export const BinanceWalletTab: React.FC<BinanceWalletTabProps> = ({
  data,
  isLoading,
  onSync,
  apiConfigured,
  initialApiKey = '',
  initialApiSecret = '',
  onSaveCustomKeys,
}) => {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [customKey, setCustomKey] = useState(initialApiKey);
  const [customSecret, setCustomSecret] = useState(initialApiSecret);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<ApiKeyVerificationResult | null>(null);

  // Sync state if props change
  React.useEffect(() => {
    if (initialApiKey) setCustomKey(initialApiKey);
    if (initialApiSecret) setCustomSecret(initialApiSecret);
  }, [initialApiKey, initialApiSecret]);

  const fmt = (v: number | string | undefined) => {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return n !== undefined && !isNaN(n) ? n.toFixed(2) : '0.00';
  };

  const futures = data?.futuresAcc;
  const marginBalance = parseFloat(futures?.totalMarginBalance || '0');
  const maintMargin = parseFloat(futures?.totalMaintMargin || '0');
  const marginRatio = marginBalance > 0 ? (maintMargin / marginBalance) * 100 : 0;

  const riskColor =
    marginRatio > 80 ? 'text-red-400 border-red-500' : marginRatio > 50 ? 'text-amber-400 border-amber-500' : 'text-slate-200 border-slate-700';

  const handleSaveKeys = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onSaveCustomKeys) {
      onSaveCustomKeys(customKey.trim(), customSecret.trim());
      setShowKeyModal(false);
    }
  };

  const handleRunVerification = async () => {
    if (!customKey.trim() || !customSecret.trim()) return;
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const res = await verifyBinanceApiKeys(customKey, customSecret);
      setVerifyResult(res);
    } catch (err: any) {
      setVerifyResult({
        valid: false,
        timestampOffsetMs: 0,
        syntaxCheck: { valid: false, apiKeyLength: customKey.length, hasWhitespace: false, message: err.message },
        spotStatus: { connected: false, error: err.message },
        futuresStatus: { connected: false, error: err.message },
        permissions: null,
        warnings: [],
        suggestions: [`Error de red o conexión: ${err.message}`],
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Configuration notice if keys are missing */}
      {!apiConfigured && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 flex flex-wrap justify-between items-center gap-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-amber-500"></div>
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-400 m-0 uppercase tracking-wide text-xs">
                Claves API de Binance no configuradas
              </p>
              <p className="text-slate-400 m-0 text-[11px] mt-0.5">
                Configura tu <code className="bg-slate-950 text-amber-300 border border-slate-800 px-1.5 py-0.5 rounded font-mono">API Key</code> y <code className="bg-slate-950 text-amber-300 border border-slate-800 px-1.5 py-0.5 rounded font-mono">API Secret</code> para sincronizar tus balances en tiempo real, auditar permisos y enviar órdenes a Binance Futures.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowKeyModal(true);
                setVerifyResult(null);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors uppercase tracking-wider"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Configurar y Revisar Claves
            </button>
          </div>
        </div>
      )}

      {/* Summary Risk & Margins Panel */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 via-amber-500/40 to-transparent"></div>

        <div className="flex flex-wrap justify-between items-center gap-3 mb-5 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold m-0">
              Resumen de Riesgo y Margen (Binance Futures)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowKeyModal(true);
                setVerifyResult(null);
              }}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors font-mono"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Revisar Claves API
            </button>
            <button
              onClick={onSync}
              disabled={isLoading}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Sincronizando...' : 'Sincronizar Billetera'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Wallet */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-slate-700"></div>
            <small className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Total Billetera Futuros
            </small>
            <strong className="text-xl font-bold font-mono text-white mt-1.5 block tracking-tight">
              {fmt(futures?.totalWalletBalance)}{' '}
              <span className="text-xs text-slate-400 font-sans">USDT</span>
            </strong>
          </div>

          {/* Floating PnL */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500"></div>
            <small className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              PnL Flotante (No Realizado)
            </small>
            <strong
              className={`text-xl font-bold font-mono mt-1.5 block tracking-tight ${
                parseFloat(futures?.totalUnrealizedProfit || '0') >= 0
                  ? 'text-emerald-400'
                  : 'text-red-400'
              }`}
            >
              {parseFloat(futures?.totalUnrealizedProfit || '0') >= 0 ? '+' : ''}
              {fmt(futures?.totalUnrealizedProfit)}{' '}
              <span className="text-xs text-slate-400 font-sans">USDT</span>
            </strong>
          </div>

          {/* Available Margin */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-amber-500"></div>
            <small className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Margen Disponible
            </small>
            <strong className="text-xl font-bold font-mono text-white mt-1.5 block tracking-tight">
              {fmt(futures?.availableBalance)}{' '}
              <span className="text-xs text-slate-400 font-sans">USDT</span>
            </strong>
          </div>

          {/* Risk Ratio */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-slate-700"></div>
            <small className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Ratio de Riesgo de Margen
            </small>
            <strong className={`text-xl font-bold font-mono mt-1.5 block tracking-tight ${riskColor}`}>
              {marginRatio.toFixed(2)}%
            </strong>
          </div>
        </div>
      </section>

      {/* Open Positions Table */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm overflow-x-auto relative overflow-hidden">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
          <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2 m-0">
            <span className="w-2 h-2 bg-amber-500 rounded-sm rotate-45 inline-block"></span>
            Posiciones Abiertas (Futuros)
          </h2>
        </div>
        <table className="w-full border-collapse text-xs whitespace-nowrap">
          <thead>
            <tr className="text-slate-400 text-left bg-slate-950/80 border-b border-slate-800 font-mono text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3.5 font-bold text-slate-300 rounded-l-lg">Símbolo</th>
              <th className="py-2.5 px-3.5 font-bold">Lado</th>
              <th className="py-2.5 px-3.5 font-bold">Tamaño</th>
              <th className="py-2.5 px-3.5 font-bold">Precio Entrada</th>
              <th className="py-2.5 px-3.5 font-bold">Mark Price</th>
              <th className="py-2.5 px-3.5 font-bold">Precio Liq.</th>
              <th className="py-2.5 px-3.5 font-bold">Margen Inicial</th>
              <th className="py-2.5 px-3.5 font-bold rounded-r-lg">PnL No Realizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-mono">
            {futures?.positions &&
            futures.positions.filter(p => parseFloat(p.positionAmt) !== 0).length > 0 ? (
              futures.positions
                .filter(p => parseFloat(p.positionAmt) !== 0)
                .map((p, idx) => {
                  const amt = parseFloat(p.positionAmt);
                  const isLong = amt > 0;
                  const pnl = parseFloat(p.unrealizedProfit);
                  const liq = parseFloat(p.liquidationPrice);

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5">
                        <strong className="text-white">{p.symbol}</strong>
                        <span className="ml-1.5 text-[10px] text-amber-400 bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded">
                          {p.leverage}x
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-sm text-[11px] font-bold ${
                            isLong
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/10 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {isLong ? 'LONG' : 'SHORT'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-white">{Math.abs(amt)}</td>
                      <td className="py-3 px-3.5 text-slate-300">{fmt(p.entryPrice)}</td>
                      <td className="py-3 px-3.5 text-slate-100">{fmt(p.markPrice)}</td>
                      <td className="py-3 px-3.5 text-amber-400">{liq > 0 ? fmt(liq) : '---'}</td>
                      <td className="py-3 px-3.5 text-slate-300">{fmt(p.initialMargin)}</td>
                      <td
                        className={`py-3 px-3.5 font-bold ${
                          pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {pnl > 0 ? '+' : ''}
                        {fmt(pnl)} USDT
                      </td>
                    </tr>
                  );
                })
            ) : (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-500 font-sans">
                  No hay posiciones abiertas en este momento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Available Balances Table (Spot & Futures) */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm overflow-x-auto relative overflow-hidden">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
          <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2 m-0">
            <span className="w-2 h-2 bg-amber-500 rounded-sm rotate-45 inline-block"></span>
            Balances Disponibles (Spot & Futuros USD-M)
          </h2>
        </div>
        <table className="w-full border-collapse text-xs whitespace-nowrap">
          <thead>
            <tr className="text-slate-400 text-left bg-slate-950/80 border-b border-slate-800 font-mono text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3.5 font-bold text-slate-300 rounded-l-lg">Criptomoneda</th>
              <th className="py-2.5 px-3.5 font-bold">Billetera</th>
              <th className="py-2.5 px-3.5 font-bold">Disponible (Libre)</th>
              <th className="py-2.5 px-3.5 font-bold">Bloqueado</th>
              <th className="py-2.5 px-3.5 font-bold rounded-r-lg">Balance Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-mono">
            {/* Futures Assets */}
            {futures?.assets &&
              futures.assets
                .filter(a => parseFloat(a.walletBalance) > 0.0001)
                .map((a, idx) => {
                  const total = parseFloat(a.walletBalance);
                  const free = parseFloat(a.availableBalance);
                  const locked = total - free;
                  return (
                    <tr key={`fut_${idx}`} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5 font-bold text-white">{a.asset}</td>
                      <td className="py-3 px-3.5 font-sans">
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-sm text-[11px] font-mono">
                          Futuros USD-M
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-emerald-400">{fmt(free)}</td>
                      <td className="py-3 px-3.5 text-amber-400">{fmt(locked)}</td>
                      <td className="py-3 px-3.5 font-bold text-white">{fmt(total)}</td>
                    </tr>
                  );
                })}

            {/* Spot Assets */}
            {data?.spotAcc?.balances &&
              data.spotAcc.balances
                .filter(b => parseFloat(b.free) > 0.0001 || parseFloat(b.locked) > 0.0001)
                .map((b, idx) => {
                  const free = parseFloat(b.free);
                  const locked = parseFloat(b.locked);
                  const total = free + locked;
                  return (
                    <tr key={`spot_${idx}`} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5 font-bold text-white">{b.asset}</td>
                      <td className="py-3 px-3.5 font-sans">
                        <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-sm text-[11px] font-mono">
                          Spot
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-emerald-400">{fmt(free)}</td>
                      <td className="py-3 px-3.5 text-amber-400">{fmt(locked)}</td>
                      <td className="py-3 px-3.5 font-bold text-white">{fmt(total)}</td>
                    </tr>
                  );
                })}

            {(!futures?.assets?.some(a => parseFloat(a.walletBalance) > 0.0001) &&
              !data?.spotAcc?.balances?.some(b => parseFloat(b.free) > 0.0001)) && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                  Sin balances detectados o sincronización pendiente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Grid: Trades & Funding history */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trades */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm overflow-x-auto relative overflow-hidden">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2 m-0">
              <span className="w-2 h-2 bg-amber-500 rounded-sm rotate-45 inline-block"></span>
              Últimos Trades Ejecutados
            </h2>
          </div>
          <table className="w-full border-collapse text-xs whitespace-nowrap font-mono">
            <thead>
              <tr className="text-slate-400 text-left bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                <th className="py-2 px-3 font-semibold rounded-l">Fecha</th>
                <th className="py-2 px-3 font-semibold">Lado</th>
                <th className="py-2 px-3 font-semibold">Precio</th>
                <th className="py-2 px-3 font-semibold">Cantidad</th>
                <th className="py-2 px-3 font-semibold rounded-r">Comisión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {data?.trades && data.trades.length > 0 ? (
                data.trades.slice(0, 10).map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-slate-400">
                      {new Date(t.time).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          t.side === 'BUY'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {t.side}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-white">{fmt(t.price)}</td>
                    <td className="py-2 px-3 text-slate-300">{t.qty}</td>
                    <td className="py-2 px-3 text-slate-400">
                      {t.commission} {t.commissionAsset}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500 font-sans">
                    Sin trades recientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Funding Fee History */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm overflow-x-auto relative overflow-hidden">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2 m-0">
              <span className="w-2 h-2 bg-amber-500 rounded-sm rotate-45 inline-block"></span>
              Historial de Tasas de Financiación (Funding)
            </h2>
          </div>
          <table className="w-full border-collapse text-xs whitespace-nowrap font-mono">
            <thead>
              <tr className="text-slate-400 text-left bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                <th className="py-2 px-3 font-semibold rounded-l">Fecha</th>
                <th className="py-2 px-3 font-semibold">Símbolo</th>
                <th className="py-2 px-3 font-semibold">Activo</th>
                <th className="py-2 px-3 font-semibold rounded-r">Monto Recibido / Pagado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {data?.funding && data.funding.length > 0 ? (
                data.funding.slice(0, 10).map((f, idx) => {
                  const income = parseFloat(f.income);
                  return (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-slate-400">
                        {new Date(f.time).toLocaleDateString()}{' '}
                        {new Date(f.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2 px-3 text-white">{f.symbol}</td>
                      <td className="py-2 px-3 text-slate-400">{f.asset}</td>
                      <td
                        className={`py-2 px-3 font-bold ${
                          income >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {income > 0 ? '+' : ''}
                        {fmt(income)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500 font-sans">
                    Sin cobros de financiación recientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      {/* Custom Key Modal & Diagnostic Tool */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl relative overflow-hidden my-8">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600"></div>

            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider m-0">
                    Revisión y Diagnóstico de Claves API
                  </h3>
                  <p className="text-[11px] text-slate-400 m-0">
                    Verifica la validez, permisos y sincronización de tus credenciales de Binance.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveKeys} className="space-y-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1 uppercase tracking-wider text-[10px] flex justify-between items-center">
                    <span>Binance API Key</span>
                    <span className="text-slate-500 font-mono text-[9px]">
                      {customKey.length > 0 ? `${customKey.length} chars` : 'Requerido'}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={customKey}
                    onChange={e => setCustomKey(e.target.value)}
                    placeholder="Pega tu API Key (64 caracteres)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-none placeholder:text-slate-600 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1 uppercase tracking-wider text-[10px] flex justify-between items-center">
                    <span>Binance API Secret</span>
                    <span className="text-slate-500 font-mono text-[9px]">
                      {customSecret.length > 0 ? `${customSecret.length} chars` : 'Requerido'}
                    </span>
                  </label>
                  <input
                    type="password"
                    value={customSecret}
                    onChange={e => setCustomSecret(e.target.value)}
                    placeholder="Pega tu API Secret (64 caracteres)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-none placeholder:text-slate-600 text-xs"
                    required
                  />
                </div>
              </div>

              {/* Action: Run Diagnostic Check */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRunVerification}
                  disabled={isVerifying || !customKey.trim() || !customSecret.trim()}
                  className="w-full bg-slate-950 hover:bg-slate-800 border border-amber-500/40 text-amber-300 hover:text-amber-200 disabled:opacity-40 disabled:border-slate-800 disabled:text-slate-500 py-2.5 px-4 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm text-xs"
                >
                  <Activity className={`w-4 h-4 ${isVerifying ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
                  {isVerifying ? 'Diagnosticando claves en Binance...' : 'Revisar y Comprobar Claves Ahora'}
                </button>
              </div>

              {/* Diagnostic Results Card */}
              {verifyResult && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3.5 animate-fadeIn">
                  {/* Status Banner */}
                  <div
                    className={`p-3 rounded-lg flex items-center justify-between gap-2 border ${
                      verifyResult.valid
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-950/40 border-red-500/40 text-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {verifyResult.valid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-bold text-xs m-0">
                          {verifyResult.valid
                            ? 'Claves Válidas y Autenticadas con Binance'
                            : 'Fallo de Autenticación o Permisos'}
                        </p>
                        <p className="text-[11px] opacity-80 m-0">
                          {verifyResult.valid
                            ? 'Firma criptográfica HMAC-SHA256 generada y aceptada por Binance.'
                            : 'Binance rechazó la solicitud con las credenciales provistas.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Diagnostic Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    {/* Clock Sync */}
                    <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-2.5">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-semibold uppercase text-[10px]">Reloj / Offset</span>
                      </div>
                      <span className="font-mono text-white font-bold">
                        {verifyResult.timestampOffsetMs > 0 ? `+${verifyResult.timestampOffsetMs}` : verifyResult.timestampOffsetMs} ms
                      </span>
                      <span className="text-[9px] text-emerald-400 block mt-0.5">Sincronizado</span>
                    </div>

                    {/* Futures Status */}
                    <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-2.5">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-semibold uppercase text-[10px]">Binance Futures</span>
                      </div>
                      {verifyResult.futuresStatus.connected ? (
                        <div>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Conectado
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono">
                            Saldo: {fmt(verifyResult.futuresStatus.totalWalletBalance)} USDT
                          </span>
                        </div>
                      ) : (
                        <span className="text-red-400 font-bold flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Inactivo / Error
                        </span>
                      )}
                    </div>

                    {/* Spot Status */}
                    <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-2.5">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Wallet className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-semibold uppercase text-[10px]">Binance Spot</span>
                      </div>
                      {verifyResult.spotStatus.connected ? (
                        <div>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Conectado
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono">
                            Tipo: {verifyResult.spotStatus.accountType || 'SPOT'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> No disponible
                        </span>
                      )}
                    </div>
                  </div>

                  {/* API Permissions list if available */}
                  {verifyResult.permissions && (
                    <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-3 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        Permisos Detectados en Binance
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          {verifyResult.permissions.enableReading ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                          )}
                          <span className="text-slate-300">Lectura de Datos</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {verifyResult.permissions.enableFutures ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                          )}
                          <span className="text-slate-300">Trading de Futuros</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {verifyResult.permissions.enableSpotAndMarginTrading ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          <span className="text-slate-300">Trading Spot & Margen</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {!verifyResult.permissions.enableWithdrawals ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span className="text-slate-300">
                            Retiros ({!verifyResult.permissions.enableWithdrawals ? 'Desactivados (Seguro)' : 'Activados'})
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Warnings & Suggestions */}
                  {(verifyResult.warnings.length > 0 || verifyResult.suggestions.length > 0) && (
                    <div className="space-y-1.5 text-[11px]">
                      {verifyResult.warnings.map((w, i) => (
                        <p key={i} className="text-amber-400 m-0 flex items-start gap-1.5 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{w}</span>
                        </p>
                      ))}
                      {verifyResult.suggestions.map((s, i) => (
                        <p key={i} className="text-slate-300 m-0 flex items-start gap-1.5 bg-slate-900 p-2 rounded border border-slate-800">
                          <span>{s}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 py-2.5 rounded-xl font-semibold uppercase tracking-wider cursor-pointer transition-colors text-xs"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={!customKey.trim() || !customSecret.trim()}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 py-2.5 rounded-xl font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-sm text-xs flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" /> Guardar y Sincronizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
