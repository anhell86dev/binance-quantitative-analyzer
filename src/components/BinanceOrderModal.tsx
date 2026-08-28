import React, { useState, useEffect } from 'react';
import { TradeStrategy } from '../types';
import { X, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface BinanceOrderModalProps {
  strategy: TradeStrategy | null;
  isOpen: boolean;
  onClose: () => void;
  onExecuteTrade: (params: {
    symbol: string;
    side: 'LONG' | 'SHORT';
    orderType: string;
    entry: number;
    stopLoss: number;
    takeProfit: number;
    quantity: number;
    leverage: number;
    liquidationDanger: boolean;
  }) => Promise<{ ok: boolean; message: string; status?: string }>;
  isDanger: boolean;
}

export const BinanceOrderModal: React.FC<BinanceOrderModalProps> = ({
  strategy,
  isOpen,
  onClose,
  onExecuteTrade,
  isDanger,
}) => {
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [takeProfit, setTakeProfit] = useState<number>(0);
  const [quantity, setQuantity] = useState<string>('');
  const [leverage, setLeverage] = useState<number>(1);
  const [useTpSl, setUseTpSl] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Revisa cantidad, apalancamiento, SL y TP antes de enviar.');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info');

  useEffect(() => {
    if (strategy) {
      setEntryPrice(strategy.entry);
      setStopLoss(strategy.stop);
      setTakeProfit(strategy.target);
      setLeverage(1);
      setQuantity('');
      setStatusMessage('Revisa cantidad, apalancamiento, SL y TP antes de enviar.');
      setStatusType('info');
    }
  }, [strategy]);

  if (!isOpen || !strategy) return null;

  const isLong = strategy.type === 'LONG';
  const assetName = strategy.symbol.replace('USDT', '');
  const numQty = parseFloat(quantity) || 0;
  const marginCost = leverage > 0 ? (numQty * entryPrice) / leverage : 0;

  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);
  const liveRr = risk > 0 ? reward / risk : 0;

  const handleNextLeverage = () => {
    setLeverage(prev => (prev >= 5 ? 1 : prev + 1));
  };

  const handleSubmit = async () => {
    if (numQty <= 0 || entryPrice <= 0 || stopLoss <= 0 || takeProfit <= 0) {
      setStatusMessage('⚠️ Error: Todos los campos de precio y cantidad deben ser mayores a 0.');
      setStatusType('error');
      return;
    }

    if (!useTpSl) {
      setStatusMessage('⚠️ Por seguridad de gestión de riesgo, debes mantener TP/SL activo.');
      setStatusType('error');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Enviando orden a Binance Futures LIVE...');
    setStatusType('info');

    try {
      const res = await onExecuteTrade({
        symbol: strategy.symbol,
        side: strategy.type,
        orderType: 'LIMIT',
        entry: entryPrice,
        stopLoss,
        takeProfit,
        quantity: numQty,
        leverage,
        liquidationDanger: isDanger,
      });

      if (res.ok) {
        setStatusMessage(`✅ ${res.status || 'ÉXITO'}: ${res.message}`);
        setStatusType('success');
      } else {
        setStatusMessage(`❌ Error: ${res.message}`);
        setStatusType('error');
      }
    } catch (err: any) {
      setStatusMessage(`❌ Falló la ejecución: ${err.message || String(err)}`);
      setStatusType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative overflow-hidden">
        {/* Top geometric accent indicator */}
        <div className={`absolute top-0 left-0 w-full h-1 ${isLong ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

        {/* Top Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="bg-slate-950 text-slate-400 border border-slate-800 text-[11px] font-mono font-bold px-2 py-0.5 rounded">
              AISLADO
            </span>
            <button
              onClick={handleNextLeverage}
              className="bg-slate-950 hover:bg-slate-800 text-amber-400 border border-slate-800 text-[11px] font-mono font-bold px-2 py-0.5 rounded cursor-pointer transition-colors"
              title="Haz clic para cambiar apalancamiento"
            >
              {leverage}x
            </button>
            <span
              className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                isLong ? 'bg-emerald-500 text-slate-950' : 'bg-red-500 text-white'
              }`}
            >
              {strategy.type}
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 mb-4 text-[11px] text-slate-300 flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            Entorno: <strong className="text-amber-400">Binance Futures LIVE</strong>
          </span>
        </div>

        {/* Price LIMIT */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span className="text-[11px] uppercase font-semibold text-slate-400">Precio (LIMIT)</span>
            <span className="font-mono text-amber-400 font-bold">{strategy.symbol}</span>
          </div>
          <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-amber-400 rounded-lg px-3 py-2">
            <input
              type="number"
              step="any"
              value={entryPrice || ''}
              onChange={e => setEntryPrice(parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent border-0 text-white font-mono text-sm font-semibold focus:outline-none"
            />
            <span className="text-xs text-slate-500 font-semibold ml-2 font-mono">USDT</span>
          </div>
        </div>

        {/* Quantity */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span className="text-[11px] uppercase font-semibold text-slate-400">Tamaño de la Posición</span>
            <span className="text-[11px] font-mono text-slate-400">Monto en {assetName}</span>
          </div>
          <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-amber-400 rounded-lg px-3 py-2">
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full bg-transparent border-0 text-white font-mono text-sm font-semibold focus:outline-none"
            />
            <span className="text-xs text-slate-500 font-semibold ml-2 font-mono">{assetName}</span>
          </div>
        </div>

        {/* Leverage Track */}
        <div className="my-4">
          <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Apalancamiento permitido (1x - 5x)</span>
            <span className="text-amber-400 font-bold font-mono">{leverage}x</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map(lev => (
              <button
                key={lev}
                onClick={() => setLeverage(lev)}
                className={`flex-1 py-1.5 text-xs font-mono font-bold rounded-lg border transition-colors cursor-pointer ${
                  leverage === lev
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {lev}x
              </button>
            ))}
          </div>
        </div>

        {/* TP/SL Checkbox */}
        <label className="flex items-center gap-2 text-xs text-slate-300 my-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={useTpSl}
            onChange={e => setUseTpSl(e.target.checked)}
            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
          />
          <span className="font-semibold text-slate-200">Órdenes protectoras simultáneas (TP/SL)</span>
        </label>

        {/* TP/SL Inputs */}
        {useTpSl && (
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider">Stop Loss (Market)</div>
              <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-red-400 rounded-lg px-2.5 py-2">
                <input
                  type="number"
                  step="any"
                  value={stopLoss || ''}
                  onChange={e => setStopLoss(parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent border-0 text-red-400 font-mono text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider">Take Profit (Market)</div>
              <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-emerald-400 rounded-lg px-2.5 py-2">
                <input
                  type="number"
                  step="any"
                  value={takeProfit || ''}
                  onChange={e => setTakeProfit(parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent border-0 text-emerald-400 font-mono text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-wider shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 ${
            isLong
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              : 'bg-red-500 hover:bg-red-400 text-white'
          }`}
        >
          {isSubmitting
            ? 'Enviando orden a Binance...'
            : `Ejecutar ${strategy.type} en Binance Futures`}
        </button>

        {/* Summary Footer */}
        <div className="grid grid-cols-3 gap-2 text-xs text-slate-400 mt-4 pt-3 border-t border-slate-800 font-mono">
          <div>
            <span className="block text-[10px] text-slate-500 uppercase font-sans font-semibold">Margen Costo</span>
            <strong className="text-slate-200">{marginCost.toFixed(2)} USDT</strong>
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 uppercase font-sans font-semibold">Ratio R:R</span>
            <strong className="text-amber-400">1:{liveRr.toFixed(2)}</strong>
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 uppercase font-sans font-semibold">Apalancamiento</span>
            <strong className="text-amber-400">{leverage}x</strong>
          </div>
        </div>

        {/* Status Line */}
        <div
          className={`mt-3 text-xs text-center p-2.5 rounded-lg font-mono ${
            statusType === 'error'
              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
              : statusType === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-slate-950 text-slate-400 border border-slate-800'
          }`}
        >
          {statusMessage}
        </div>
      </div>
    </div>
  );
};
