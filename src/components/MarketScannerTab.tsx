import React, { useState, useEffect } from 'react';
import { ScannerItem } from '../types';
import { calculateRsi, calculateRvol, calculateBollingerBands, playAudioAlert, formatKlines } from '../utils/indicators';
import { fetchKlinesWithFallback, fetchTickerWithFallback } from '../utils/marketService';
import {
  Radio,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Volume2,
  VolumeX,
  Zap,
  Filter,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Search,
} from 'lucide-react';

const TOP_WATCHLIST = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'DOGEUSDT',
  'ADAUSDT',
  'AVAXUSDT',
  'LINKUSDT',
  'SUIUSDT',
  'NEARUSDT',
  'PEPEUSDT',
  'WIFUSDT',
  'APTUSDT',
  'ARBUSDT',
  'OPUSDT',
  'TIAUSDT',
  'INJUSDT',
  'RENDERUSDT',
  'FETUSDT',
];

interface MarketScannerTabProps {
  onSelectSymbol: (symbol: string) => void;
  onLogMessage?: (msg: string, type: 'info' | 'success' | 'warn' | 'error') => void;
}

export const MarketScannerTab: React.FC<MarketScannerTabProps> = ({
  onSelectSymbol,
  onLogMessage,
}) => {
  const [items, setItems] = useState<ScannerItem[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'LONG' | 'SHORT' | 'VOL' | 'SQUEEZE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastScanTime, setLastScanTime] = useState<number>(Date.now());

  const scanSinglePair = async (symbol: string): Promise<ScannerItem | null> => {
    try {
      const [ticker, klines15m, klines1h] = await Promise.all([
        fetchTickerWithFallback(symbol),
        fetchKlinesWithFallback(symbol, '15m', 100),
        fetchKlinesWithFallback(symbol, '1h', 100),
      ]);

      const price = parseFloat(ticker.lastPrice) || 0;
      const change24h = parseFloat(ticker.priceChangePercent) || 0;
      const volume24h = parseFloat(ticker.quoteVolume) || 0;

      const rsi15m = Math.round(calculateRsi(klines15m, 14) ?? 50);
      const rsi1h = Math.round(calculateRsi(klines1h, 14) ?? 50);
      const rvol = parseFloat((calculateRvol(klines15m, 20) ?? 1).toFixed(2));
      const bb = calculateBollingerBands(klines15m, 20, 2);

      // Trend determination
      const ema20_1h = klines1h.slice(-20).reduce((a, b) => a + b.close, 0) / 20;
      const trend: 'Alcista' | 'Bajista' | 'Neutral' =
        price > ema20_1h * 1.005 ? 'Alcista' : price < ema20_1h * 0.995 ? 'Bajista' : 'Neutral';

      // Signal Logic
      let signal: 'LONG' | 'SHORT' | 'SQUEEZE' | 'VOL_SPIKE' | 'NEUTRAL' = 'NEUTRAL';
      let signalStrength = 1;
      let divergence: string | null = null;

      if (bb.isSqueeze) {
        signal = 'SQUEEZE';
        signalStrength = 4;
      } else if (rvol >= 2.2 && rsi15m < 35 && trend !== 'Bajista') {
        signal = 'LONG';
        signalStrength = rvol >= 3.0 ? 5 : 4;
        divergence = 'Sobreventa + RVOL Alto';
      } else if (rvol >= 2.2 && rsi15m > 68 && trend !== 'Alcista') {
        signal = 'SHORT';
        signalStrength = rvol >= 3.0 ? 5 : 4;
        divergence = 'Sobrecompra + RVOL Alto';
      } else if (rsi15m < 30 && rsi1h < 40) {
        signal = 'LONG';
        signalStrength = 3;
      } else if (rsi15m > 70 && rsi1h > 60) {
        signal = 'SHORT';
        signalStrength = 3;
      } else if (rvol >= 2.5) {
        signal = 'VOL_SPIKE';
        signalStrength = 4;
      }

      return {
        symbol,
        price,
        change24h,
        volume24h,
        rvol,
        rsi15m,
        rsi1h,
        trend,
        signal,
        signalStrength,
        divergence,
        bollingerSqueeze: bb.isSqueeze,
        lastUpdated: Date.now(),
      };
    } catch (e) {
      return null;
    }
  };

  const runFullScan = async () => {
    setIsScanning(true);
    const results: ScannerItem[] = [];

    // Scan in chunks of 4 for speed and API stability
    for (let i = 0; i < TOP_WATCHLIST.length; i += 4) {
      const chunk = TOP_WATCHLIST.slice(i, i + 4);
      const chunkRes = await Promise.all(chunk.map(scanSinglePair));
      chunkRes.forEach(r => {
        if (r) results.push(r);
      });
    }

    setItems(results);
    setLastScanTime(Date.now());
    setIsScanning(false);

    // Trigger audio if strong opportunities found
    const strongSignals = results.filter(r => r.signal === 'LONG' || r.signal === 'SHORT');
    if (strongSignals.length > 0 && soundEnabled) {
      playAudioAlert('bullish');
    }

    if (onLogMessage) {
      onLogMessage(`Escáner completado: ${results.length} pares analizados en tiempo real.`, 'info');
    }
  };

  // Run on mount
  useEffect(() => {
    runFullScan();
    // Auto refresh every 45s
    const interval = setInterval(runFullScan, 45000);
    return () => clearInterval(interval);
  }, []);

  const filteredItems = items.filter(item => {
    if (searchQuery && !item.symbol.includes(searchQuery.toUpperCase())) return false;
    if (filterMode === 'LONG') return item.signal === 'LONG';
    if (filterMode === 'SHORT') return item.signal === 'SHORT';
    if (filterMode === 'VOL') return item.rvol >= 2.0;
    if (filterMode === 'SQUEEZE') return item.bollingerSqueeze;
    return true;
  });

  const fmtPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(3);
    return p.toFixed(5);
  };

  const fmtVol = (v: number) => {
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    return `$${(v / 1e3).toFixed(0)}K`;
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <Radio className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xs uppercase tracking-widest text-slate-200 font-bold m-0 flex items-center gap-2">
                Escáner Cuantitativo Multi-Par (Binance Futures)
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              </h2>
              <p className="text-[11px] text-slate-400 m-0">
                Monitoreo algorítmico continuo de RVOL &gt; 2x, Squeeze de volatilidad y divergencias RSI.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                playAudioAlert('click');
              }}
              className={`p-2 rounded-lg border transition-colors cursor-pointer text-xs flex items-center gap-1.5 ${
                soundEnabled
                  ? 'bg-slate-950 border-amber-500/40 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
              title={soundEnabled ? 'Alertas sonoras activadas' : 'Alertas sonoras silenciadas'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
              <span className="text-[10px] font-mono uppercase">{soundEnabled ? 'Audio ON' : 'Audio OFF'}</span>
            </button>

            {/* Scan Button */}
            <button
              onClick={runFullScan}
              disabled={isScanning}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Escaneando...' : 'Escanear Ahora'}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[10px] text-slate-500 font-mono uppercase mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filtro:
            </span>
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer ${
                filterMode === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              Todos ({items.length})
            </button>

            <button
              onClick={() => setFilterMode('LONG')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer ${
                filterMode === 'LONG'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-emerald-400 hover:text-emerald-300 border border-slate-800'
              }`}
            >
              🟢 Señales LONG ({items.filter(i => i.signal === 'LONG').length})
            </button>

            <button
              onClick={() => setFilterMode('SHORT')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer ${
                filterMode === 'SHORT'
                  ? 'bg-red-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-red-400 hover:text-red-300 border border-slate-800'
              }`}
            >
              🔴 Señales SHORT ({items.filter(i => i.signal === 'SHORT').length})
            </button>

            <button
              onClick={() => setFilterMode('VOL')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer ${
                filterMode === 'VOL'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-amber-300 hover:text-amber-200 border border-slate-800'
              }`}
            >
              ⚡ RVOL Inusual &gt; 2x ({items.filter(i => i.rvol >= 2.0).length})
            </button>

            <button
              onClick={() => setFilterMode('SQUEEZE')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer ${
                filterMode === 'SQUEEZE'
                  ? 'bg-purple-500 text-white font-bold'
                  : 'bg-slate-950 text-purple-300 hover:text-purple-200 border border-slate-800'
              }`}
            >
              🎯 Squeeze Bandas ({items.filter(i => i.bollingerSqueeze).length})
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-44">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar par..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white uppercase font-mono focus:border-amber-400 focus:outline-none placeholder:text-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Par</th>
                <th className="py-3 px-3">Precio</th>
                <th className="py-3 px-3">Var 24h</th>
                <th className="py-3 px-3">Volumen 24h</th>
                <th className="py-3 px-3">RVOL (15m)</th>
                <th className="py-3 px-3">RSI 15m / 1h</th>
                <th className="py-3 px-3">Tendencia</th>
                <th className="py-3 px-3">Señal Algorítmica</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    {isScanning ? 'Analizando mercado en vivo...' : 'No se encontraron pares con el filtro actual.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isPositive = item.change24h >= 0;
                  return (
                    <tr
                      key={item.symbol}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => onSelectSymbol(item.symbol)}
                    >
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <span className="text-amber-400">{item.symbol}</span>
                        {item.bollingerSqueeze && (
                          <span className="bg-purple-950 border border-purple-500/40 text-purple-300 text-[9px] px-1 rounded">
                            SQZ
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-100 font-semibold">${fmtPrice(item.price)}</td>
                      <td className={`py-3 px-3 font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isPositive ? `+${item.change24h.toFixed(2)}%` : `${item.change24h.toFixed(2)}%`}
                      </td>
                      <td className="py-3 px-3 text-slate-400">{fmtVol(item.volume24h)}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold ${
                            item.rvol >= 2.5
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : item.rvol >= 1.5
                              ? 'text-slate-200'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.rvol}x
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <span
                          className={`font-semibold ${
                            item.rsi15m < 30 ? 'text-emerald-400' : item.rsi15m > 70 ? 'text-red-400' : 'text-slate-300'
                          }`}
                        >
                          {item.rsi15m}
                        </span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span className="text-slate-400">{item.rsi1h}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] uppercase font-bold ${
                            item.trend === 'Alcista'
                              ? 'text-emerald-400'
                              : item.trend === 'Bajista'
                              ? 'text-red-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.trend}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {item.signal === 'LONG' && (
                          <span className="bg-emerald-950 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" /> LONG (★{item.signalStrength})
                          </span>
                        )}
                        {item.signal === 'SHORT' && (
                          <span className="bg-red-950 border border-red-500/40 text-red-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                            <ArrowDownRight className="w-3 h-3" /> SHORT (★{item.signalStrength})
                          </span>
                        )}
                        {item.signal === 'SQUEEZE' && (
                          <span className="bg-purple-950 border border-purple-500/40 text-purple-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                            ⚡ Squeeze Inminente
                          </span>
                        )}
                        {item.signal === 'VOL_SPIKE' && (
                          <span className="bg-amber-950 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                            🔥 RVOL Spike
                          </span>
                        )}
                        {item.signal === 'NEUTRAL' && <span className="text-slate-500">En Rango</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onSelectSymbol(item.symbol);
                          }}
                          className="bg-slate-950 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-[10px] px-2.5 py-1 rounded border border-slate-800 font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Analizar
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
    </div>
  );
};
