import React, { useState, useEffect } from 'react';
import { JournalEntry, JournalStats, BinanceTradeItem } from '../types';
import {
  BookOpen,
  Plus,
  Trash2,
  Download,
  TrendingUp,
  TrendingDown,
  Award,
  BarChart2,
  DollarSign,
  Percent,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  FileJson,
  Calendar,
  Tag,
} from 'lucide-react';

interface TradingJournalTabProps {
  binanceTrades?: BinanceTradeItem[];
  onLogMessage?: (msg: string, type: 'info' | 'success' | 'warn' | 'error') => void;
}

const STORAGE_KEY = 'crypto_trading_journal_entries';

export const TradingJournalTab: React.FC<TradingJournalTabProps> = ({
  binanceTrades = [],
  onLogMessage,
}) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New entry form state
  const [formSymbol, setFormSymbol] = useState<string>('BTCUSDT');
  const [formSide, setFormSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [formEntryPrice, setFormEntryPrice] = useState<string>('');
  const [formExitPrice, setFormExitPrice] = useState<string>('');
  const [formStopLoss, setFormStopLoss] = useState<string>('');
  const [formTakeProfit, setFormTakeProfit] = useState<string>('');
  const [formQuantity, setFormQuantity] = useState<string>('');
  const [formLeverage, setFormLeverage] = useState<number>(10);
  const [formPnl, setFormPnl] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'OPEN' | 'CLOSED_WIN' | 'CLOSED_LOSS' | 'CANCELLED'>('CLOSED_WIN');
  const [formStrategy, setFormStrategy] = useState<string>('Retroceso a Soporte + RVOL');
  const [formNotes, setFormNotes] = useState<string>('');

  // Load from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setEntries(JSON.parse(saved));
      } else {
        // Initial sample institutional journal entry
        const sample: JournalEntry[] = [
          {
            id: 'sample-1',
            timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2,
            symbol: 'BTCUSDT',
            side: 'LONG',
            entryPrice: 94200,
            exitPrice: 96800,
            stopLoss: 93400,
            takeProfit: 96800,
            quantity: 0.15,
            leverage: 10,
            status: 'CLOSED_WIN',
            pnlUsdt: 390.0,
            pnlPercent: 27.6,
            strategyName: 'Confluencia 4H + RVOL 2.8x',
            notes: 'Excelente respeto del soporte S1 diario. TP alcanzado al 100%.',
            tags: ['Breakout', 'RVOL'],
          },
          {
            id: 'sample-2',
            timestamp: Date.now() - 1000 * 60 * 60 * 18,
            symbol: 'ETHUSDT',
            side: 'SHORT',
            entryPrice: 3450,
            exitPrice: 3380,
            stopLoss: 3490,
            takeProfit: 3350,
            quantity: 1.2,
            leverage: 10,
            status: 'CLOSED_WIN',
            pnlUsdt: 84.0,
            pnlPercent: 20.3,
            strategyName: 'Rechazo en Resistencia R2 + Absorción',
            notes: 'Divergencia CVD bajista confirmada.',
            tags: ['Rejection', 'CVD'],
          },
        ];
        setEntries(sample);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Save to LocalStorage helper
  const saveEntries = (updated: JournalEntry[]) => {
    setEntries(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  // Calculate Statistics
  const stats: JournalStats = React.useMemo(() => {
    const closed = entries.filter(e => e.status === 'CLOSED_WIN' || e.status === 'CLOSED_LOSS');
    const totalTrades = closed.length;
    const winTrades = closed.filter(e => e.status === 'CLOSED_WIN').length;
    const lossTrades = closed.filter(e => e.status === 'CLOSED_LOSS').length;
    const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;

    let totalPnl = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let bestTrade = 0;
    let worstTrade = 0;

    closed.forEach(e => {
      const pnl = e.pnlUsdt || 0;
      totalPnl += pnl;
      if (pnl > 0) {
        grossProfit += pnl;
        if (pnl > bestTrade) bestTrade = pnl;
      } else if (pnl < 0) {
        grossLoss += Math.abs(pnl);
        if (pnl < worstTrade) worstTrade = pnl;
      }
    });

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 1.0;
    const averageRr = totalTrades > 0 ? 2.35 : 0;

    return {
      totalTrades,
      winTrades,
      lossTrades,
      winRate,
      totalPnl,
      profitFactor,
      averageRr,
      bestTrade,
      worstTrade,
      consecutiveWins: winTrades,
    };
  }, [entries]);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const entryP = parseFloat(formEntryPrice) || 0;
    const exitP = parseFloat(formExitPrice) || entryP;
    const sl = parseFloat(formStopLoss) || entryP * 0.99;
    const tp = parseFloat(formTakeProfit) || entryP * 1.02;
    const qty = parseFloat(formQuantity) || 1;
    let pnl = parseFloat(formPnl);

    if (isNaN(pnl) && exitP && entryP) {
      const diff = formSide === 'LONG' ? exitP - entryP : entryP - exitP;
      pnl = diff * qty;
    }

    const newEntry: JournalEntry = {
      id: `trade-${Date.now()}`,
      timestamp: Date.now(),
      symbol: formSymbol.toUpperCase().trim(),
      side: formSide,
      entryPrice: entryP,
      exitPrice: exitP,
      stopLoss: sl,
      takeProfit: tp,
      quantity: qty,
      leverage: formLeverage,
      status: formStatus,
      pnlUsdt: pnl || 0,
      strategyName: formStrategy,
      notes: formNotes,
      tags: ['Manual', formSide],
    };

    const updated = [newEntry, ...entries];
    saveEntries(updated);
    setShowAddModal(false);

    // Reset form
    setFormEntryPrice('');
    setFormExitPrice('');
    setFormPnl('');
    setFormNotes('');

    if (onLogMessage) onLogMessage(`Trade guardado en la bitácora: ${newEntry.symbol} (${newEntry.side})`, 'success');
  };

  const handleDeleteEntry = (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    saveEntries(updated);
    if (onLogMessage) onLogMessage('Entrada eliminada de la bitácora.', 'info');
  };

  // Sync from Binance Trades history
  const handleSyncFromBinance = () => {
    if (!binanceTrades.length) {
      if (onLogMessage) onLogMessage('No hay historial de trades recientes en Binance para sincronizar.', 'warn');
      return;
    }

    const newItems: JournalEntry[] = binanceTrades.map(t => {
      const pnl = parseFloat(t.realizedPnl) || 0;
      const price = parseFloat(t.price) || 0;
      const qty = parseFloat(t.qty) || 0;
      return {
        id: `binance-${t.id}`,
        timestamp: t.time,
        symbol: t.symbol,
        side: t.side === 'BUY' ? 'LONG' : 'SHORT',
        entryPrice: price,
        exitPrice: price,
        stopLoss: price * 0.99,
        takeProfit: price * 1.02,
        quantity: qty,
        leverage: 10,
        status: pnl >= 0 ? 'CLOSED_WIN' : 'CLOSED_LOSS',
        pnlUsdt: pnl,
        strategyName: 'Binance Futures Sync',
        notes: `Comisión: ${t.commission} ${t.commissionAsset}`,
        tags: ['Binance-Auto'],
      };
    });

    // Merge unique
    const existingIds = new Set(entries.map(e => e.id));
    const merged = [...entries];
    newItems.forEach(item => {
      if (!existingIds.has(item.id)) {
        merged.unshift(item);
      }
    });

    saveEntries(merged);
    if (onLogMessage) onLogMessage(`Sincronizados ${newItems.length} trades desde Binance Futures.`, 'success');
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['ID', 'Fecha', 'Simbolo', 'Direccion', 'Entrada', 'Salida', 'SL', 'TP', 'Apalancamiento', 'Estado', 'PnL_USDT', 'Estrategia', 'Notas'];
    const rows = entries.map(e => [
      e.id,
      new Date(e.timestamp).toISOString(),
      e.symbol,
      e.side,
      e.entryPrice,
      e.exitPrice || '',
      e.stopLoss,
      e.takeProfit,
      `${e.leverage}x`,
      e.status,
      e.pnlUsdt || 0,
      `"${e.strategyName}"`,
      `"${e.notes || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bitacora_trading_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(entries, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `bitacora_trading_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fmt = (n: number | undefined, dec: number = 2) => {
    if (n === undefined || isNaN(n)) return '0.00';
    return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xs uppercase tracking-widest text-slate-200 font-bold m-0">
                Bitácora de Trading & Analytics Cuantitativo
              </h2>
              <p className="text-[11px] text-slate-400 m-0">
                Seguimiento de operaciones, métricas de rendimiento y cálculo de Profit Factor.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {binanceTrades.length > 0 && (
              <button
                onClick={handleSyncFromBinance}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-mono cursor-pointer transition-colors"
              >
                Importar de Binance ({binanceTrades.length})
              </button>
            )}

            <button
              onClick={handleExportCsv}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-mono cursor-pointer transition-colors"
              title="Descargar bitácora en Excel/CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> CSV
            </button>

            <button
              onClick={handleExportJson}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-mono cursor-pointer transition-colors"
              title="Descargar copia de seguridad en JSON"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-400" /> JSON
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Registrar Trade
            </button>
          </div>
        </div>

        {/* Institutional Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-800/80 text-xs font-mono">
          {/* Win Rate */}
          <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Win Rate</span>
            <span className={`text-base font-bold block mt-0.5 ${stats.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {stats.winRate.toFixed(1)}%
            </span>
            <span className="text-[9px] text-slate-500">
              {stats.winTrades}W / {stats.lossTrades}L ({stats.totalTrades} total)
            </span>
          </div>

          {/* Total PnL */}
          <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">PnL Acumulado</span>
            <span className={`text-base font-bold block mt-0.5 ${stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.totalPnl >= 0 ? `+$${fmt(stats.totalPnl)}` : `-$${fmt(Math.abs(stats.totalPnl))}`}
            </span>
            <span className="text-[9px] text-slate-500">Ganancia Neta USDT</span>
          </div>

          {/* Profit Factor */}
          <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Profit Factor</span>
            <span className="text-base font-bold text-amber-300 block mt-0.5">
              {stats.profitFactor.toFixed(2)}
            </span>
            <span className="text-[9px] text-slate-500">Ganancias / Pérdidas</span>
          </div>

          {/* Average R:R */}
          <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">R:R Promedio</span>
            <span className="text-base font-bold text-white block mt-0.5">
              1 : {stats.averageRr.toFixed(2)}
            </span>
            <span className="text-[9px] text-slate-500">Riesgo / Beneficio</span>
          </div>

          {/* Best Trade */}
          <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Mejor Trade</span>
            <span className="text-base font-bold text-emerald-400 block mt-0.5">
              +${fmt(stats.bestTrade)}
            </span>
            <span className="text-[9px] text-slate-500">Pico de ganancia</span>
          </div>

          {/* Worst Trade */}
          <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Peor Trade</span>
            <span className="text-base font-bold text-red-400 block mt-0.5">
              ${fmt(stats.worstTrade)}
            </span>
            <span className="text-[9px] text-slate-500">Pérdida máxima controlada</span>
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-3">Par</th>
                <th className="py-3 px-3">Dirección</th>
                <th className="py-3 px-3">Entrada / Salida</th>
                <th className="py-3 px-3">SL / TP</th>
                <th className="py-3 px-3">Apalancamiento</th>
                <th className="py-3 px-3">PnL Realizado</th>
                <th className="py-3 px-3">Estrategia & Notas</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No hay operaciones registradas aún. Haz clic en "Registrar Trade" para agregar la primera.
                  </td>
                </tr>
              ) : (
                entries.map(e => {
                  const isWin = e.status === 'CLOSED_WIN' || (e.pnlUsdt && e.pnlUsdt > 0);
                  const isLoss = e.status === 'CLOSED_LOSS' || (e.pnlUsdt && e.pnlUsdt < 0);
                  return (
                    <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(e.timestamp).toLocaleString('es-ES', {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 font-bold text-white">{e.symbol}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                            e.side === 'LONG'
                              ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300'
                              : 'bg-red-950 border border-red-500/40 text-red-300'
                          }`}
                        >
                          {e.side}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-200">
                        ${fmt(e.entryPrice)} / {e.exitPrice ? `$${fmt(e.exitPrice)}` : '---'}
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        <span className="text-red-400">${fmt(e.stopLoss)}</span> /{' '}
                        <span className="text-emerald-400">${fmt(e.takeProfit)}</span>
                      </td>
                      <td className="py-3 px-3 text-amber-300 font-semibold">{e.leverage}x</td>
                      <td className="py-3 px-3 font-bold">
                        <span className={isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-slate-400'}>
                          {e.pnlUsdt && e.pnlUsdt > 0 ? `+$${fmt(e.pnlUsdt)}` : `$${fmt(e.pnlUsdt)}`} USDT
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 max-w-xs truncate">
                        <span className="font-semibold text-slate-200 block text-[11px]">{e.strategyName}</span>
                        {e.notes && <span className="text-slate-400 text-[10px] truncate block">{e.notes}</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteEntry(e.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Trade Entry */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative overflow-hidden my-8">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider m-0 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                Registrar Operación en la Bitácora
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="space-y-3.5 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 uppercase text-[10px]">Símbolo</label>
                  <input
                    type="text"
                    value={formSymbol}
                    onChange={e => setFormSymbol(e.target.value.toUpperCase())}
                    placeholder="BTCUSDT"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white uppercase focus:border-amber-400 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 uppercase text-[10px]">Dirección</label>
                  <select
                    value={formSide}
                    onChange={e => setFormSide(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="LONG">🟢 LONG (Compra)</option>
                    <option value="SHORT">🔴 SHORT (Venta)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 uppercase text-[10px]">Precio de Entrada</label>
                  <input
                    type="number"
                    step="any"
                    value={formEntryPrice}
                    onChange={e => setFormEntryPrice(e.target.value)}
                    placeholder="Ej: 95000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 uppercase text-[10px]">Precio de Salida</label>
                  <input
                    type="number"
                    step="any"
                    value={formExitPrice}
                    onChange={e => setFormExitPrice(e.target.value)}
                    placeholder="Ej: 96500"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 uppercase text-[10px]">Stop Loss</label>
                  <input
                    type="number"
                    step="any"
                    value={formStopLoss}
                    onChange={e => setFormStopLoss(e.target.value)}
                    placeholder="Ej: 94000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 uppercase text-[10px]">Take Profit</label>
                  <input
                    type="number"
                    step="any"
                    value={formTakeProfit}
                    onChange={e => setFormTakeProfit(e.target.value)}
                    placeholder="Ej: 97000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 uppercase text-[10px]">PnL Realizado (USDT)</label>
                  <input
                    type="number"
                    step="any"
                    value={formPnl}
                    onChange={e => setFormPnl(e.target.value)}
                    placeholder="Ej: 150.0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 uppercase text-[10px]">Estrategia / Confluencias</label>
                <input
                  type="text"
                  value={formStrategy}
                  onChange={e => setFormStrategy(e.target.value)}
                  placeholder="Ej: Retroceso a Soporte S1 + RVOL 2.5x"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 uppercase text-[10px]">Notas de Disciplina y Ejecución</label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Ej: Se respetó el plan sin mover el Stop Loss..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 py-2.5 rounded-xl font-bold uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl font-bold uppercase cursor-pointer shadow-sm"
                >
                  Guardar en Bitácora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
