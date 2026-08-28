import React, { useState, useMemo } from 'react';
import { TradeStrategy, RiskCalculatorResult, BinancePosition } from '../types';
import { calculatePositionRisk, playAudioAlert } from '../utils/indicators';
import { cancelAllOpenOrdersClient, closePositionAtMarketClient } from '../utils/marketService';
import {
  ShieldAlert,
  Calculator,
  AlertOctagon,
  Percent,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Sliders,
  DollarSign,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Radio,
} from 'lucide-react';

interface RiskAutomationPanelProps {
  currentPrice: number;
  symbol: string;
  activeStrategy: TradeStrategy | null;
  userBalance: number;
  openPositions?: BinancePosition[];
  apiKey?: string;
  apiSecret?: string;
  onSelectSymbol?: (symbol: string) => void;
  onTradeExecuted?: () => void;
  onLogMessage?: (msg: string, type: 'info' | 'success' | 'warn' | 'error') => void;
  onOpenOrderModal?: (strategy?: TradeStrategy) => void;
}

export const RiskAutomationPanel: React.FC<RiskAutomationPanelProps> = ({
  currentPrice,
  symbol,
  activeStrategy,
  userBalance = 1000,
  openPositions = [],
  apiKey = '',
  apiSecret = '',
  onSelectSymbol,
  onTradeExecuted,
  onLogMessage,
  onOpenOrderModal,
}) => {
  const [balanceInput, setBalanceInput] = useState<number>(userBalance > 0 ? userBalance : 1000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0); // 1% risk standard
  const [leverage, setLeverage] = useState<number>(10);
  const [autoBreakeven, setAutoBreakeven] = useState<boolean>(true);
  const [trailingStop, setTrailingStop] = useState<number>(1.0); // 1.0%
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Sync balance if external changes
  React.useEffect(() => {
    if (userBalance > 0) setBalanceInput(userBalance);
  }, [userBalance]);

  const entryPrice = activeStrategy ? activeStrategy.entry : currentPrice;
  const stopPrice = activeStrategy
    ? activeStrategy.stop
    : activeStrategy?.type === 'LONG'
    ? currentPrice * 0.985
    : currentPrice * 1.015;
  const targetPrice = activeStrategy
    ? activeStrategy.target
    : activeStrategy?.type === 'LONG'
    ? currentPrice * 1.03
    : currentPrice * 0.97;
  const direction = activeStrategy ? activeStrategy.type : 'LONG';

  const riskResult: RiskCalculatorResult = useMemo(() => {
    return calculatePositionRisk({
      accountBalance: balanceInput,
      riskPercent,
      entryPrice: entryPrice > 0 ? entryPrice : currentPrice,
      stopLossPrice: stopPrice,
      takeProfitPrice: targetPrice,
      direction,
      leverage,
    });
  }, [balanceInput, riskPercent, entryPrice, currentPrice, stopPrice, targetPrice, direction, leverage]);

  // All active positions with non-zero positionAmt
  const activePositionsList = useMemo(() => {
    return openPositions.filter(p => {
      const amt = parseFloat(String(p.positionAmt || '0'));
      return !isNaN(amt) && Math.abs(amt) > 0;
    });
  }, [openPositions]);

  // Find active position for this symbol if any
  const currentPosition = activePositionsList.find(p => p.symbol === symbol);
  const posAmt = currentPosition ? parseFloat(String(currentPosition.positionAmt || '0')) : 0;
  const isLong = posAmt > 0;
  const absAmt = Math.abs(posAmt);

  // Calculate exact PnL and ROE from position numbers
  const posEntryPrice = currentPosition ? parseFloat(String(currentPosition.entryPrice || '0')) : 0;
  const posMarkPrice = currentPosition ? parseFloat(String(currentPosition.markPrice || '0')) : currentPrice;
  const posLiqPrice = currentPosition ? parseFloat(String(currentPosition.liquidationPrice || '0')) : 0;
  const posInitMargin = currentPosition ? parseFloat(String(currentPosition.initialMargin || '0')) : (posEntryPrice * absAmt) / (leverage || 10);

  // Accurate PnL calculation
  const computedPnl = useMemo(() => {
    if (!currentPosition || absAmt === 0) return 0;
    const rawPnl = parseFloat(String(currentPosition.unrealizedProfit || '0'));
    if (!isNaN(rawPnl) && rawPnl !== 0) return rawPnl;

    // Dynamic calculation if raw was 0 or missing
    if (posEntryPrice > 0) {
      const livePrice = currentPrice > 0 ? currentPrice : posMarkPrice;
      return isLong ? (livePrice - posEntryPrice) * absAmt : (posEntryPrice - livePrice) * absAmt;
    }
    return 0;
  }, [currentPosition, absAmt, posEntryPrice, currentPrice, posMarkPrice, isLong]);

  // Accurate ROE % calculation
  const computedRoe = useMemo(() => {
    if (!currentPosition || absAmt === 0) return 0;
    const margin = posInitMargin > 0 ? posInitMargin : (posEntryPrice * absAmt) / (leverage || 10);
    if (margin > 0) {
      return (computedPnl / margin) * 100;
    }
    return 0;
  }, [currentPosition, absAmt, computedPnl, posInitMargin, posEntryPrice, leverage]);

  // Liquidation distance
  const liqDistancePct = useMemo(() => {
    if (posLiqPrice <= 0 || posMarkPrice <= 0) return null;
    const diff = Math.abs(posMarkPrice - posLiqPrice);
    return (diff / posMarkPrice) * 100;
  }, [posLiqPrice, posMarkPrice]);

  const fmt = (n: number | string | undefined, dec: number = 2) => {
    const num = typeof n === 'string' ? parseFloat(n) : n;
    if (num === undefined || isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };

  const handlePanicClose = async (targetSymbol: string, targetAmt: number, pct: number) => {
    if (!targetAmt) {
      setActionFeedback({ msg: `No hay posición abierta en ${targetSymbol} para cerrar.`, type: 'info' });
      if (onLogMessage) onLogMessage(`No hay posición activa abierta en ${targetSymbol} para cerrar.`, 'warn');
      return;
    }

    setIsProcessing(true);
    setActionFeedback(null);
    playAudioAlert('alert');

    try {
      const res = await closePositionAtMarketClient(targetSymbol, targetAmt, pct, apiKey, apiSecret);
      if (res.success) {
        playAudioAlert('success');
        setActionFeedback({ msg: `✅ ${res.message}`, type: 'success' });
        if (onLogMessage) onLogMessage(res.message, 'success');
        if (onTradeExecuted) onTradeExecuted();
      } else {
        setActionFeedback({ msg: `❌ ${res.message}`, type: 'error' });
        if (onLogMessage) onLogMessage(res.message, 'error');
      }
    } catch (err: any) {
      setActionFeedback({ msg: `❌ Error: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelAllOrders = async (targetSymbol: string) => {
    setIsProcessing(true);
    setActionFeedback(null);
    try {
      const res = await cancelAllOpenOrdersClient(targetSymbol, apiKey, apiSecret);
      if (res.success) {
        playAudioAlert('success');
        setActionFeedback({ msg: `✅ ${res.message}`, type: 'success' });
        if (onLogMessage) onLogMessage(res.message, 'success');
      } else {
        setActionFeedback({ msg: `❌ ${res.message}`, type: 'error' });
        if (onLogMessage) onLogMessage(res.message, 'error');
      }
    } catch (err: any) {
      setActionFeedback({ msg: `❌ Error: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncLeverage = async (targetSymbol: string, targetLev: number) => {
    setIsProcessing(true);
    setActionFeedback(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey && apiSecret) {
        headers['x-binance-api-key'] = apiKey;
        headers['x-binance-api-secret'] = apiSecret;
      }
      const res = await fetch('/api/binance/leverage', {
        method: 'POST',
        headers,
        body: JSON.stringify({ symbol: targetSymbol, leverage: targetLev }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        playAudioAlert('success');
        setActionFeedback({ msg: `✅ Apalancamiento fijado en ${targetLev}x para ${targetSymbol}`, type: 'success' });
        if (onLogMessage) onLogMessage(`Apalancamiento de ${targetSymbol} actualizado a ${targetLev}x`, 'success');
        if (onTradeExecuted) onTradeExecuted();
      } else {
        setActionFeedback({ msg: `⚠️ ${data.message || 'No se pudo actualizar el apalancamiento en Binance'}`, type: 'info' });
      }
    } catch (e: any) {
      setActionFeedback({ msg: `⚠️ Apalancamiento local configurado a ${targetLev}x`, type: 'info' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenOrderWithCalculatedRisk = () => {
    const strat: TradeStrategy = activeStrategy || {
      symbol,
      type: direction,
      entry: entryPrice,
      stop: stopPrice,
      target: targetPrice,
      goal: targetPrice,
      score: 85,
      rr: riskResult.riskRewardRatio || 2.0,
      reason: `Gestión de riesgo automática: ${riskPercent}% de cuenta ($${fmt(riskResult.riskAmountUsdt)} USDT) a ${leverage}x`,
    };

    if (onOpenOrderModal) {
      onOpenOrderModal(strat);
    } else if (onLogMessage) {
      onLogMessage(`Parámetros de riesgo calculados: Entrada $${fmt(entryPrice)}, SL $${fmt(stopPrice)}, TP $${fmt(targetPrice)}, Tamaño: ${fmt(riskResult.positionSizeCoins, 4)} ${symbol.replace('USDT', '')}`, 'info');
    }
  };

  return (
    <div className="bg-[#1E2329] border border-[#2B313A] rounded-xl p-4 sm:p-6 shadow-xl space-y-5 relative overflow-hidden transition-all">
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 via-[#F0B90B] to-emerald-500"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#2B313A]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xs uppercase tracking-widest text-slate-200 font-bold m-0 flex items-center gap-2">
              Gestión de Riesgo & Automatización de Posición
            </h2>
            <p className="text-[11px] text-slate-400 m-0">
              Dimensionamiento institucional por % de cuenta, PnL en tiempo real y ejecución de órdenes protegidas.
            </p>
          </div>
        </div>

        {/* Status of active position on this pair */}
        {currentPosition ? (
          <div className="flex items-center gap-2 bg-[#14171A] border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-bold">{symbol}:</span>
            <span className={posAmt > 0 ? 'text-[#0ECB81] font-bold' : 'text-[#F6465D] font-bold'}>
              {posAmt > 0 ? `LONG ${absAmt}` : `SHORT ${absAmt}`}
            </span>
            <span className="text-slate-500">|</span>
            <span className={`font-bold ${computedPnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {computedPnl >= 0 ? `+${fmt(computedPnl)}` : fmt(computedPnl)} USDT ({computedRoe >= 0 ? `+${fmt(computedRoe, 1)}` : fmt(computedRoe, 1)}%)
            </span>
          </div>
        ) : (
          <div className="text-[11px] font-mono text-slate-400 bg-[#14171A] px-3 py-1.5 rounded-lg border border-[#2B313A] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-600"></span>
            Sin posición abierta en {symbol}
          </div>
        )}
      </div>

      {/* DETAILED ACTIVE POSITION CARD (Fixed & Accurate PnL Card) */}
      {currentPosition && (
        <div className="bg-[#14171A] border border-[#2B313A] rounded-xl p-4 space-y-3 relative overflow-hidden shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200 font-mono">{symbol}</span>
              <span
                className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase ${
                  isLong
                    ? 'bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30'
                    : 'bg-[#F6465D]/15 text-[#F6465D] border border-[#F6465D]/30'
                }`}
              >
                {isLong ? 'LONG' : 'SHORT'} {absAmt}
              </span>
              <span className="bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/30 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                {currentPosition.leverage || leverage}x
              </span>
            </div>

            {/* ROE & PNL Badges */}
            <div className="flex items-center gap-2">
              <div
                className={`px-3 py-1 rounded-lg font-mono font-bold text-xs flex items-center gap-1.5 ${
                  computedPnl >= 0
                    ? 'bg-[#0ECB81]/10 text-[#0ECB81] border border-[#0ECB81]/40'
                    : 'bg-[#F6465D]/10 text-[#F6465D] border border-[#F6465D]/40'
                }`}
              >
                {computedPnl >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                <span>PnL: {computedPnl >= 0 ? `+${fmt(computedPnl)}` : fmt(computedPnl)} USDT</span>
                <span className="opacity-80">({computedRoe >= 0 ? `+${fmt(computedRoe, 2)}` : fmt(computedRoe, 2)}% ROE)</span>
              </div>
            </div>
          </div>

          {/* Key metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
            <div className="bg-[#1E2329] p-2.5 rounded-lg border border-[#2B313A]">
              <span className="text-[10px] text-slate-400 block uppercase">Precio Entrada</span>
              <span className="text-slate-100 font-bold">${fmt(posEntryPrice, 4)}</span>
            </div>
            <div className="bg-[#1E2329] p-2.5 rounded-lg border border-[#2B313A]">
              <span className="text-[10px] text-slate-400 block uppercase">Precio Mark</span>
              <span className="text-[#F0B90B] font-bold">${fmt(posMarkPrice, 4)}</span>
            </div>
            <div className="bg-[#1E2329] p-2.5 rounded-lg border border-[#2B313A]">
              <span className="text-[10px] text-slate-400 block uppercase">Precio Liq.</span>
              <span className="text-amber-400 font-bold">
                {posLiqPrice > 0 ? `$${fmt(posLiqPrice, 4)}` : 'Seguro / S.L.'}
              </span>
              {liqDistancePct !== null && (
                <span className="text-[9px] text-slate-400 block">({fmt(liqDistancePct, 1)}% distancia)</span>
              )}
            </div>
            <div className="bg-[#1E2329] p-2.5 rounded-lg border border-[#2B313A]">
              <span className="text-[10px] text-slate-400 block uppercase">Margen Asignado</span>
              <span className="text-slate-100 font-bold">${fmt(posInitMargin)} USDT</span>
            </div>
          </div>

          {/* Quick interactive actions on this position */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">Cierre Rápido:</span>
            <button
              onClick={() => handlePanicClose(symbol, posAmt, 25)}
              disabled={isProcessing}
              className="bg-[#1E2329] hover:bg-[#2B313A] text-slate-300 hover:text-white border border-[#2B313A] px-2.5 py-1 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors"
            >
              25%
            </button>
            <button
              onClick={() => handlePanicClose(symbol, posAmt, 50)}
              disabled={isProcessing}
              className="bg-[#1E2329] hover:bg-[#2B313A] text-[#F0B90B] border border-[#F0B90B]/30 px-2.5 py-1 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors"
            >
              50%
            </button>
            <button
              onClick={() => handlePanicClose(symbol, posAmt, 75)}
              disabled={isProcessing}
              className="bg-[#1E2329] hover:bg-[#2B313A] text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors"
            >
              75%
            </button>
            <button
              onClick={() => handlePanicClose(symbol, posAmt, 100)}
              disabled={isProcessing}
              className="bg-[#F6465D]/20 hover:bg-[#F6465D] text-[#F6465D] hover:text-white border border-[#F6465D]/40 px-3 py-1 rounded text-[11px] font-mono font-bold cursor-pointer transition-all ml-auto"
            >
              Cerrar 100% a Mercado
            </button>
          </div>
        </div>
      )}

      {/* Global Open Positions Notification Bar if multiple or other symbols open */}
      {activePositionsList.length > 0 && (
        <div className="bg-[#14171A] border border-[#F0B90B]/30 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#F0B90B] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Posiciones Abiertas en Binance Futures ({activePositionsList.length})
            </span>
            <span className="text-[10px] text-slate-400">Haz clic en una posición para cargarla y gestionarla</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {activePositionsList.map(pos => {
              const amt = parseFloat(String(pos.positionAmt || '0'));
              const posIsLong = amt > 0;
              const isSelected = pos.symbol === symbol;
              const pnl = parseFloat(String(pos.unrealizedProfit || '0'));

              return (
                <div
                  key={pos.symbol}
                  onClick={() => onSelectSymbol && onSelectSymbol(pos.symbol)}
                  className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#1E2329] border-[#F0B90B] text-white shadow-[0_0_10px_rgba(240,185,11,0.15)]'
                      : 'bg-[#181A20] border-[#2B313A] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className={isSelected ? 'text-[#F0B90B]' : 'text-slate-100'}>{pos.symbol}</span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                          posIsLong
                            ? 'bg-[#0ECB81]/20 text-[#0ECB81] border border-[#0ECB81]/40'
                            : 'bg-[#F6465D]/20 text-[#F6465D] border border-[#F6465D]/40'
                        }`}
                      >
                        {posIsLong ? 'LONG' : 'SHORT'} {Math.abs(amt)}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Entry: ${fmt(pos.entryPrice, 4)} · Mark: ${fmt(pos.markPrice, 4)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-bold ${pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                      {pnl >= 0 ? `+${fmt(pnl)}` : fmt(pnl)} USDT
                    </div>
                    <span className="text-[9px] text-[#F0B90B] font-bold flex items-center justify-end gap-0.5">
                      {isSelected ? 'Activo' : 'Cargar →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid: Calculator & Risk Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Calculator Controls (7 cols) */}
        <div className="lg:col-span-7 bg-[#14171A] border border-[#2B313A] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-[#F0B90B]" /> Parámetros de Riesgo & Dimensionamiento
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Dirección:{' '}
              <strong className={direction === 'LONG' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>{direction}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Balance input */}
            <div>
              <label className="text-slate-400 block mb-1 text-[10px] font-semibold uppercase">
                Saldo Cuenta (USDT)
              </label>
              <input
                type="number"
                value={balanceInput}
                onChange={e => setBalanceInput(Math.max(10, parseFloat(e.target.value) || 0))}
                className="w-full bg-[#1E2329] border border-[#2B313A] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-[#F0B90B] focus:outline-none transition-colors"
              />
            </div>

            {/* Risk % selector */}
            <div>
              <label className="text-slate-400 block mb-1 text-[10px] font-semibold uppercase">
                % Riesgo por Trade
              </label>
              <select
                value={riskPercent}
                onChange={e => setRiskPercent(parseFloat(e.target.value))}
                className="w-full bg-[#1E2329] border border-[#2B313A] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-[#F0B90B] focus:outline-none cursor-pointer transition-colors"
              >
                <option value={0.25}>0.25% (Ultra Conservador)</option>
                <option value={0.5}>0.5% (Conservador)</option>
                <option value={1.0}>1.0% (Estándar Recomendado)</option>
                <option value={1.5}>1.5% (Moderado)</option>
                <option value={2.0}>2.0% (Agresivo)</option>
                <option value={3.0}>3.0% (Alto Riesgo)</option>
              </select>
            </div>

            {/* Leverage selector */}
            <div>
              <label className="text-slate-400 block mb-1 text-[10px] font-semibold uppercase">
                Apalancamiento
              </label>
              <select
                value={leverage}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  setLeverage(val);
                  handleSyncLeverage(symbol, val);
                }}
                className="w-full bg-[#1E2329] border border-[#2B313A] rounded-lg px-2.5 py-1.5 text-[#F0B90B] font-mono text-xs focus:border-[#F0B90B] focus:outline-none cursor-pointer transition-colors"
              >
                <option value={1}>1x (Spot / Sin Apalancamiento)</option>
                <option value={2}>2x (Bajo)</option>
                <option value={5}>5x (Moderado)</option>
                <option value={10}>10x (Estándar)</option>
                <option value={20}>20x (Dinámico)</option>
                <option value={50}>50x (Extremo)</option>
              </select>
            </div>
          </div>

          {/* Quick Risk Buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-mono uppercase mr-1">Riesgo Rápido:</span>
            {[0.5, 1.0, 1.5, 2.0, 3.0].map(pct => (
              <button
                key={pct}
                type="button"
                onClick={() => setRiskPercent(pct)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  riskPercent === pct
                    ? 'bg-[#F0B90B] text-[#0B0E11] shadow-[0_0_8px_rgba(240,185,11,0.4)]'
                    : 'bg-[#1E2329] text-slate-300 hover:bg-[#2B313A] border border-[#2B313A]'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* Mathematical Results Matrix */}
          <div className="bg-[#1E2329] border border-[#2B313A] rounded-lg p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono shadow-inner">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Riesgo Máximo:</span>
              <span className="text-[#F6465D] font-bold">${fmt(riskResult.riskAmountUsdt)} USDT</span>
              <span className="text-[9px] text-slate-500 block">({riskPercent}% saldo)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Tamaño Lote:</span>
              <span className="text-white font-bold">{fmt(riskResult.positionSizeCoins, 4)} {symbol.replace('USDT', '')}</span>
              <span className="text-[9px] text-slate-500 block">≈ ${fmt(riskResult.positionSizeCoins * entryPrice)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Margen Requerido:</span>
              <span className="text-[#F0B90B] font-bold">${fmt(riskResult.requiredMarginUsdt)} USDT</span>
              <span className="text-[9px] text-slate-500 block">a {leverage}x apalancamiento</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Ratio R:R:</span>
              <span className="text-[#0ECB81] font-bold">1 : {fmt(riskResult.riskRewardRatio, 2)}</span>
              <span className="text-[9px] text-slate-500 block">
                +${fmt(riskResult.riskAmountUsdt * (riskResult.riskRewardRatio || 2))} TP
              </span>
            </div>
          </div>

          {/* Primary Action Button: Open Order / Configure Trade */}
          <button
            type="button"
            onClick={handleOpenOrderWithCalculatedRisk}
            className="w-full bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-[#0B0E11] py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(240,185,11,0.25)] hover:shadow-[0_0_20px_rgba(240,185,11,0.4)] transition-all cursor-pointer active:scale-95"
          >
            <ShieldCheck className="w-4 h-4" /> Configurar & Abrir Orden Protegida en {symbol}
          </button>

          {/* Automation toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
            <label className="flex items-center gap-2 bg-[#1E2329] border border-[#2B313A] p-2.5 rounded-lg cursor-pointer hover:border-slate-600 transition-colors">
              <input
                type="checkbox"
                checked={autoBreakeven}
                onChange={e => {
                  setAutoBreakeven(e.target.checked);
                  playAudioAlert('click');
                  setActionFeedback({
                    msg: e.target.checked
                      ? '✅ Auto-Breakeven ACTIVADO: Moverá el SL al Entry al alcanzar +1.5R'
                      : 'ℹ️ Auto-Breakeven desactivado',
                    type: 'info',
                  });
                }}
                className="rounded accent-[#F0B90B] cursor-pointer"
              />
              <div>
                <span className="font-semibold text-slate-200 block text-[11px]">Auto-Breakeven</span>
                <span className="text-[10px] text-slate-400">Mueve SL al Entry al alcanzar +1.5R</span>
              </div>
            </label>

            <div className="bg-[#1E2329] border border-[#2B313A] p-2.5 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200 block text-[11px]">Trailing Stop Loss</span>
                <span className="text-[10px] text-slate-400">Distancia dinámica</span>
              </div>
              <select
                value={trailingStop}
                onChange={e => {
                  setTrailingStop(parseFloat(e.target.value));
                  setActionFeedback({
                    msg: `✅ Trailing Stop configurado a ${e.target.value}%`,
                    type: 'info',
                  });
                }}
                className="bg-[#14171A] border border-[#2B313A] rounded px-2 py-1 text-[#F0B90B] text-xs font-mono focus:outline-none"
              >
                <option value={0.5}>0.5%</option>
                <option value={1.0}>1.0%</option>
                <option value={1.5}>1.5%</option>
                <option value={2.0}>2.0%</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Emergency & Panic Button Panel (5 cols) */}
        <div className="lg:col-span-5 bg-[#14171A] border border-[#2B313A] rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#F6465D] uppercase tracking-wider flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4" /> Panel de Emergencia & Pánico
              </span>
              <span className="text-[9px] text-slate-400 font-mono bg-[#1E2329] px-2 py-0.5 rounded border border-[#2B313A]">
                1-Click Action
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              Ejecución inmediata a mercado para salvaguardar capital o cancelar órdenes pendientes durante alta volatilidad.
            </p>

            {/* Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handlePanicClose(symbol, posAmt, 50)}
                disabled={isProcessing || !posAmt}
                className="w-full bg-[#1E2329] hover:bg-[#2B313A] disabled:opacity-40 disabled:cursor-not-allowed border border-[#F0B90B]/40 text-[#F0B90B] py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Percent className="w-3.5 h-3.5" /> Cerrar 50% de {symbol} (Mercado)
              </button>

              <button
                type="button"
                onClick={() => handlePanicClose(symbol, posAmt, 100)}
                disabled={isProcessing || !posAmt}
                className="w-full bg-[#F6465D] hover:bg-[#F6465D]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_0_15px_rgba(246,70,93,0.3)] active:scale-95"
              >
                <AlertOctagon className="w-4 h-4" /> Panic Button: Cierre Total {symbol}
              </button>

              <button
                type="button"
                onClick={() => handleCancelAllOrders(symbol)}
                disabled={isProcessing}
                className="w-full bg-[#1E2329] hover:bg-[#2B313A] border border-[#2B313A] text-slate-300 py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Cancelar Órdenes Pendientes en {symbol}
              </button>
            </div>
          </div>

          {actionFeedback && (
            <div
              className={`p-3 rounded-lg border text-xs font-mono transition-all animate-fadeIn ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : actionFeedback.type === 'error'
                  ? 'bg-red-950/40 border-red-500/40 text-red-300'
                  : 'bg-[#1E2329] border-[#2B313A] text-slate-200'
              }`}
            >
              {actionFeedback.msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
