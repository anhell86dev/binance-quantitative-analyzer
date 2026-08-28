import React, { useState, useEffect } from 'react';
import { ScannerItem } from '../types';
import { calculateRsi, calculateRvol, calculateBollingerBands, playAudioAlert } from '../utils/indicators';
import { fetchKlinesWithFallback, fetchTickerWithFallback } from '../utils/marketService';
import {
  Radio,
  RefreshCw,
  Volume2,
  VolumeX,
  Zap,
  Filter,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Cpu,
  Coins,
  ShieldCheck,
  Rocket,
  Grid,
} from 'lucide-react';

export interface CategoryDef {
  id: string;
  name: string;
  shortName: string;
  icon: any;
  color: string;
  symbols: string[];
}

export const SCANNER_CATEGORIES: CategoryDef[] = [
  {
    id: 'L1_MAJORS',
    name: '1. Layer 1 & Top Caps',
    shortName: 'Layer 1',
    icon: Coins,
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'AVAXUSDT', 'SUIUSDT', 'NEARUSDT'],
  },
  {
    id: 'AI_DATA',
    name: '2. IA & Computación Descentralizada',
    shortName: 'IA & Big Data',
    icon: Cpu,
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    symbols: ['TAOUSDT', 'RENDERUSDT', 'FETUSDT', 'NEARUSDT', 'ICPUSDT', 'WLDUSDT', 'ARKMUSDT'],
  },
  {
    id: 'DEFI_RWA',
    name: '3. DeFi & RWA (Real World Assets)',
    shortName: 'DeFi & RWA',
    icon: ShieldCheck,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    symbols: ['LINKUSDT', 'UNIUSDT', 'AAVEUSDT', 'PENDLEUSDT', 'INJUSDT', 'ONDOUSDT', 'CRVUSDT'],
  },
  {
    id: 'MEMES_MOMENTUM',
    name: '4. Meme Coins & Alta Beta',
    shortName: 'Memes & Beta',
    icon: Rocket,
    color: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
    symbols: ['DOGEUSDT', 'PEPEUSDT', 'WIFUSDT', 'SHIBUSDT', 'BONKUSDT', 'FLOKIUSDT'],
  },
  {
    id: 'L2_MODULAR',
    name: '5. Layer 2 & Infraestructura Modular',
    shortName: 'Layer 2 & Modular',
    icon: Grid,
    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    symbols: ['ARBUSDT', 'OPUSDT', 'TIAUSDT', 'APTUSDT', 'SEIUSDT', 'STRKUSDT'],
  },
];

// All distinct symbols
const ALL_WATCHLIST = Array.from(
  new Set(SCANNER_CATEGORIES.flatMap(c => c.symbols))
);

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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
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
    for (let i = 0; i < ALL_WATCHLIST.length; i += 4) {
      const chunk = ALL_WATCHLIST.slice(i, i + 4);
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

  useEffect(() => {
    runFullScan();
    const interval = setInterval(() => {
      runFullScan();
    }, 45000); // scan every 45s

    return () => clearInterval(interval);
  }, []);

  // Filter items by category, mode, search
  const filteredItems = items.filter(item => {
    // Category match
    if (selectedCategoryId !== 'ALL') {
      const cat = SCANNER_CATEGORIES.find(c => c.id === selectedCategoryId);
      if (cat && !cat.symbols.includes(item.symbol)) {
        return false;
      }
    }

    // Search query
    if (searchQuery && !item.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Filter mode
    if (filterMode === 'LONG') return item.signal === 'LONG';
    if (filterMode === 'SHORT') return item.signal === 'SHORT';
    if (filterMode === 'VOL') return item.rvol >= 2.0;
    if (filterMode === 'SQUEEZE') return item.bollingerSqueeze;
    return true;
  });

  const fmt = (n: number, dec: number = 2) =>
    n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });

  return (
    <div className="space-y-6">
      {/* 1. Header with Live Status & Controls */}
      <div className="border border-slate-800 bg-slate-900/90 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider font-mono">
                    Escáner Multi-Temporal de Binance Futures
                  </h2>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">
                    {items.length} PARES ACTIVOS
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detección en tiempo real de RVOL Institucional, Squeeze de Volatilidad, RSI Divergencias y Señales en 5 Categorías.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg border text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors ${
                soundEnabled
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
              title={soundEnabled ? 'Alertas de audio activadas' : 'Alertas silenciadas'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={runFullScan}
              disabled={isScanning}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs px-3.5 py-2 rounded-lg font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Escaneando...' : 'Escanear Ahora'}</span>
            </button>
          </div>
        </div>

        {/* 2. The 5 Categories Selector Bar */}
        <div className="mt-4 pt-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" /> 5 Categorías de Mercado (Binance Futures)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Filtra por sector para detectar rotación de capital
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {/* All categories pill */}
            <button
              onClick={() => setSelectedCategoryId('ALL')}
              className={`p-2.5 rounded-lg border text-xs font-mono text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedCategoryId === 'ALL'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold">TODAS</span>
                <span className="text-[10px] opacity-70">({ALL_WATCHLIST.length})</span>
              </div>
              <span className="text-[11px] truncate">Universo Completo</span>
            </button>

            {/* The 5 Individual Categories */}
            {SCANNER_CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isSelected = selectedCategoryId === cat.id;
              const hasTao = cat.symbols.includes('TAOUSDT');

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`p-2.5 rounded-lg border text-xs font-mono text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                    isSelected
                      ? 'bg-slate-800 border-amber-500 text-white shadow-md'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-200">
                      <Icon className="w-3.5 h-3.5 text-amber-400" />
                      <span>{cat.shortName}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">({cat.symbols.length})</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span className="truncate">{cat.symbols.slice(0, 3).map(s => s.replace('USDT', '')).join(', ')}...</span>
                    {hasTao && (
                      <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[8px] font-bold px-1 rounded">
                        TAO
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Signal Filter Chips & Search Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filtro Señal:
            </span>

            {(
              [
                { id: 'ALL', label: 'Todos' },
                { id: 'LONG', label: '🟢 Longs Fuertes' },
                { id: 'SHORT', label: '🔴 Shorts Fuertes' },
                { id: 'VOL', label: '⚡ RVOL ≥ 2.0x' },
                { id: 'SQUEEZE', label: '🎯 Bollinger Squeeze' },
              ] as const
            ).map(btn => (
              <button
                key={btn.id}
                onClick={() => setFilterMode(btn.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                  filterMode === btn.id
                    ? 'bg-slate-800 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar símbolo (ej: TAO, BTC)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* 4. Scanner Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => {
          const isTao = item.symbol === 'TAOUSDT';
          const isBull = item.signal === 'LONG';
          const isBear = item.signal === 'SHORT';
          const isSqueeze = item.bollingerSqueeze;
          const isHighVol = item.rvol >= 2.0;

          return (
            <div
              key={item.symbol}
              className={`bg-slate-900/90 border rounded-xl p-4 transition-all hover:border-amber-500/60 shadow-md relative overflow-hidden flex flex-col justify-between ${
                isTao ? 'border-cyan-500/60 ring-1 ring-cyan-500/30' : 'border-slate-800'
              }`}
            >
              {/* Top Accent bar */}
              <div
                className={`absolute top-0 left-0 w-full h-1 ${
                  isBull ? 'bg-emerald-500' : isBear ? 'bg-red-500' : isSqueeze ? 'bg-amber-400' : 'bg-slate-700'
                }`}
              ></div>

              <div>
                {/* Header: Symbol, Price & Change */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold font-mono text-white tracking-wide">
                        {item.symbol}
                      </span>
                      {isTao && (
                        <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded">
                          IA POSICIÓN
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                      {item.trend === 'Alcista' ? 'Tendencia 1H: Alcista' : item.trend === 'Bajista' ? 'Tendencia 1H: Bajista' : 'Tendencia 1H: Lateral'}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold font-mono text-white">
                      ${fmt(item.price, item.price > 1000 ? 2 : item.price > 1 ? 4 : 6)}
                    </div>
                    <div
                      className={`text-[11px] font-mono font-bold flex items-center justify-end gap-0.5 ${
                        item.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {item.change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      <span>{item.change24h >= 0 ? '+' : ''}{fmt(item.change24h, 2)}%</span>
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 text-xs font-mono mb-3">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">RVOL 15m</span>
                    <span
                      className={`font-bold block text-[11px] ${
                        item.rvol >= 2.0
                          ? 'text-amber-400 font-extrabold'
                          : item.rvol >= 1.4
                          ? 'text-emerald-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {item.rvol}x
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">RSI 15m</span>
                    <span
                      className={`font-bold block text-[11px] ${
                        item.rsi15m <= 30
                          ? 'text-emerald-400'
                          : item.rsi15m >= 70
                          ? 'text-red-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {item.rsi15m}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">RSI 1H</span>
                    <span className="font-bold text-slate-300 block text-[11px]">{item.rsi1h}</span>
                  </div>
                </div>

                {/* Algorithmic Signal Tag */}
                <div className="flex items-center justify-between text-xs font-mono mb-3">
                  <span className="text-[10px] text-slate-400">Algoritmo:</span>
                  <div className="flex items-center gap-1.5">
                    {isBull && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                        LONG SIGNAL (★{item.signalStrength})
                      </span>
                    )}
                    {isBear && (
                      <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                        SHORT SIGNAL (★{item.signalStrength})
                      </span>
                    )}
                    {isSqueeze && !isBull && !isBear && (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                        BB SQUEEZE
                      </span>
                    )}
                    {isHighVol && !isBull && !isBear && !isSqueeze && (
                      <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                        VOL SPIKE
                      </span>
                    )}
                    {!isBull && !isBear && !isSqueeze && !isHighVol && (
                      <span className="text-slate-500 text-[10px]">NEUTRAL</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button: 1-Click Load into Main Dashboard */}
              <button
                onClick={() => {
                  onSelectSymbol(item.symbol);
                  if (onLogMessage) {
                    onLogMessage(`Cargando ${item.symbol} en panel de análisis y gráfico en vivo...`, 'info');
                  }
                }}
                className="w-full bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-700 hover:border-amber-400 py-2 px-3 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Analizar & Operar {item.symbol}</span>
              </button>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && !isScanning && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 font-mono text-xs space-y-2">
          <p>No se encontraron pares con los criterios seleccionados en este momento.</p>
          <button
            onClick={() => {
              setFilterMode('ALL');
              setSelectedCategoryId('ALL');
              setSearchQuery('');
            }}
            className="text-amber-400 underline cursor-pointer"
          >
            Restablecer todos los filtros
          </button>
        </div>
      )}
    </div>
  );
};
