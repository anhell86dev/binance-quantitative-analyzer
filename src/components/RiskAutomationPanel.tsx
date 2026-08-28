import React, { useState } from 'react';
import { TradeStrategy, RiskCalculatorResult, BinancePosition } from '../types';
import { calculatePositionRisk, playAudioAlert } from '../utils/indicators';
import { cancelAllOpenOrdersClient, closePositionAtMarketClient } from '../utils/marketService';
import {
  ShieldAlert,
  Calculator,
  Sliders,
  AlertOctagon,
  Percent,
  TrendingUp,
  TrendingDown,
  Lock,
  Zap,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface RiskAutomationPanelProps {
  currentPrice: number;
  symbol: string;
  activeStrategy: TradeStrategy | null;
  userBalance: number;
  openPositions?: BinancePosition[];
  apiKey?: string;
  apiSecret?: string;
  onTradeExecuted?: () => void;
  onLogMessage?: (msg: string, type: 'info' | 'success' | 'warn' | 'error') => void;
}

export const RiskAutomationPanel: React.FC<RiskAutomationPanelProps> = ({
  currentPrice,
  symbol,
  activeStrategy,
  userBalance = 1000,
  openPositions = [],
  apiKey = '',
  apiSecret = '',
  onTradeExecuted,
  onLogMessage,
}) => {
  const [balanceInput, setBalanceInput] = useState<number>(userBalance > 0 ? userBalance : 1000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0); // 1% risk standard
  const [leverage, setLeverage] = useState<number>(10);
  const [autoBreakeven, setAutoBreakeven] = useState<boolean>(true);
  const [trailingStop, setTrailingStop] = useState<number>(1.0); // 1.0%
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

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

  const riskResult: RiskCalculatorResult = React.useMemo(() => {
    return calculatePositionRisk({
      accountBalance: balanceInput,
      riskPercent,
      entryPrice,
      stopLossPrice: stopPrice,
      takeProfitPrice: targetPrice,
      direction,
      leverage,
    });
  }, [balanceInput, riskPercent, entryPrice, stopPrice, targetPrice, direction, leverage]);

  // Find active position for this symbol if any
  const currentPosition = openPositions.find(p => p.symbol === symbol && parseFloat(p.positionAmt) !== 0);
  const posAmt = currentPosition ? parseFloat(currentPosition.positionAmt) : 0;

  const handlePanicClose = async (pct: number) => {
    if (!posAmt) {
      if (onLogMessage) onLogMessage(`No hay posición activa abierta en ${symbol} para cerrar.`, 'warn');
      return;
    }

    setIsProcessing(true);
    setActionFeedback(null);
    playAudioAlert('alert');

    try {
      const res = await closePositionAtMarketClient(symbol, posAmt, pct, apiKey, apiSecret);
      if (res.success) {
        playAudioAlert('success');
        setActionFeedback(`✅ ${res.message}`);
        if (onLogMessage) onLogMessage(res.message, 'success');
        if (onTradeExecuted) onTradeExecuted();
      } else {
        setActionFeedback(`❌ ${res.message}`);
        if (onLogMessage) onLogMessage(res.message, 'error');
      }
    } catch (err: any) {
      setActionFeedback(`❌ Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelAllOrders = async () => {
    setIsProcessing(true);
    setActionFeedback(null);
    try {
      const res = await cancelAllOpenOrdersClient(symbol, apiKey, apiSecret);
      if (res.success) {
        playAudioAlert('success');
        setActionFeedback(`✅ ${res.message}`);
        if (onLogMessage) onLogMessage(res.message, 'success');
      } else {
        setActionFeedback(`❌ ${res.message}`);
        if (onLogMessage) onLogMessage(res.message, 'error');
      }
    } catch (err: any) {
      setActionFeedback(`❌ Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const fmt = (n: number | undefined, dec: number = 2) => {
    if (n === undefined || isNaN(n)) return '0.00';
    return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xs uppercase tracking-widest text-slate-200 font-bold m-0 flex items-center gap-2">
              Gestión de Riesgo & Automatización de Posición
            </h2>
            <p className="text-[11px] text-slate-400 m-0">
              Dimensionamiento matemático institucional por % de cuenta, Trailing SL y Botón de Pánico.
            </p>
          </div>
        </div>

        {/* Status of active position on this pair */}
        {currentPosition ? (
          <div className="flex items-center gap-2 bg-slate-950 border border-amber-500/40 px-3 py-1 rounded-lg text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300">Posición:</span>
            <span className={posAmt > 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
              {posAmt > 0 ? `LONG ${posAmt}` : `SHORT ${posAmt}`} {symbol}
            </span>
          </div>
        ) : (
          <div className="text-[11px] font-mono text-slate-500 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            Sin posición abierta en {symbol}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Calculator Controls (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-amber-400" /> Parámetros de Riesgo
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Estrategia:{' '}
              <strong className={direction === 'LONG' ? 'text-emerald-400' : 'text-red-400'}>{direction}</strong>
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
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
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
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
              >
                <option value={0.5}>0.5% (Conservador)</option>
                <option value={1.0}>1.0% (Recomendado)</option>
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
                onChange={e => setLeverage(parseInt(e.target.value, 10))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-amber-300 font-mono text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
              >
                <option value={5}>5x (Bajo)</option>
                <option value={10}>10x (Estándar)</option>
                <option value={20}>20x (Dinámico)</option>
                <option value={50}>50x (Extremo)</option>
              </select>
            </div>
          </div>

          {/* Mathematical Results Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block">Riesgo Máximo:</span>
              <span className="text-red-400 font-bold">${fmt(riskResult.riskAmountUsdt)} USDT</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Tamaño Lote:</span>
              <span className="text-white font-bold">{fmt(riskResult.positionSizeCoins, 4)} {symbol.replace('USDT', '')}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Margen Requerido:</span>
              <span className="text-amber-300 font-bold">${fmt(riskResult.requiredMarginUsdt)} USDT</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Ratio R:R:</span>
              <span className="text-emerald-400 font-bold">1 : {fmt(riskResult.riskRewardRatio, 2)}</span>
            </div>
          </div>

          {/* Automation toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
            <label className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={autoBreakeven}
                onChange={e => setAutoBreakeven(e.target.checked)}
                className="rounded accent-amber-500"
              />
              <div>
                <span className="font-semibold text-slate-200 block text-[11px]">Auto-Breakeven</span>
                <span className="text-[10px] text-slate-400">Mueve SL al Entry al alcanzar +1.5R</span>
              </div>
            </label>

            <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200 block text-[11px]">Trailing Stop Loss</span>
                <span className="text-[10px] text-slate-400">Distancia de seguimiento</span>
              </div>
              <select
                value={trailingStop}
                onChange={e => setTrailingStop(parseFloat(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-amber-300 text-xs font-mono"
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
        <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4" /> Panel de Emergencia & Pánico
              </span>
              <span className="text-[9px] text-slate-500 font-mono">1-Click Execution</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              Ejecución inmediata a mercado para salvaguardar capital durante alta volatilidad.
            </p>

            {/* Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handlePanicClose(50)}
                disabled={isProcessing}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Percent className="w-3.5 h-3.5" /> Cerrar 50% de la Posición (Mercado)
              </button>

              <button
                type="button"
                onClick={() => handlePanicClose(100)}
                disabled={isProcessing}
                className="w-full bg-red-600 hover:bg-red-500 text-white py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md shadow-red-950/50"
              >
                <AlertOctagon className="w-4 h-4" /> Panic Button: Cierre Total 100%
              </button>

              <button
                type="button"
                onClick={handleCancelAllOrders}
                disabled={isProcessing}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Cancelar Todas las Órdenes Pendientes
              </button>
            </div>
          </div>

          {actionFeedback && (
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs font-mono">
              {actionFeedback}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
