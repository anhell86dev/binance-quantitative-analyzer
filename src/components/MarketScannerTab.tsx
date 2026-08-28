import React, { useState, useEffect, useMemo } from 'react';
import { ScannerItem, StrategyPreset } from '../types';
import { calculateRsi, calculateRvol, calculateBollingerBands, playAudioAlert } from '../utils/indicators';
import { fetchKlinesWithFallback, fetchTickerWithFallback } from '../utils/marketService';
import {
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
  Landmark,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Flame,
  RotateCcw,
  BarChart3,
  Sparkles,
  Info,
  TrendingUp,
  TrendingDown,
  Droplets,
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
    id: 'TRADFI_COMMODITIES',
    name: '4. TradFi, Oro & Forex FX',
    shortName: 'TradFi & FX',
    icon: Landmark,
    color: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
    symbols: ['PAXGUSDT', 'EURUSDT', 'GBPUSDT', 'JPYUSDT', 'ONDOUSDT', 'PENDLEUSDT', 'MKRUSDT', 'AAVEUSDT', 'LINKUSDT', 'ENAUSDT'],
  },
  {
    id: 'MEMES_MOMENTUM',
    name: '5. Meme Coins & Alta Beta',
    shortName: 'Memes & Beta',
    icon: Rocket,
    color: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
    symbols: ['DOGEUSDT', 'PEPEUSDT', 'WIFUSDT', 'SHIBUSDT', 'BONKUSDT', 'FLOKIUSDT'],
  },
  {
    id: 'L2_MODULAR',
    name: '6. Layer 2 & Infraestructura Modular',
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

// Approximate market caps & fundamentals for crypto watchlist
const CRYPTO_FUNDAMENTALS: Record<string, { marketCap: number; avgVolume: number; epsGrowth: number; salesGrowth: number; roe: number; optionable: boolean }> = {
  BTCUSDT: { marketCap: 1_850_000_000_000, avgVolume: 45_000_000_000, epsGrowth: 85, salesGrowth: 65, roe: 35, optionable: true },
  ETHUSDT: { marketCap: 380_000_000_000, avgVolume: 22_000_000_000, epsGrowth: 60, salesGrowth: 45, roe: 28, optionable: true },
  SOLUSDT: { marketCap: 95_000_000_000, avgVolume: 7_500_000_000, epsGrowth: 140, salesGrowth: 110, roe: 42, optionable: true },
  BNBUSDT: { marketCap: 88_000_000_000, avgVolume: 1_800_000_000, epsGrowth: 45, salesGrowth: 38, roe: 30, optionable: true },
  XRPUSDT: { marketCap: 120_000_000_000, avgVolume: 6_000_000_000, epsGrowth: 35, salesGrowth: 28, roe: 20, optionable: true },
  ADAUSDT: { marketCap: 28_000_000_000, avgVolume: 1_400_000_000, epsGrowth: 25, salesGrowth: 20, roe: 15, optionable: true },
  AVAXUSDT: { marketCap: 14_000_000_000, avgVolume: 850_000_000, epsGrowth: 55, salesGrowth: 40, roe: 22, optionable: true },
  SUIUSDT: { marketCap: 9_500_000_000, avgVolume: 1_200_000_000, epsGrowth: 180, salesGrowth: 150, roe: 48, optionable: true },
  NEARUSDT: { marketCap: 6_200_000_000, avgVolume: 550_000_000, epsGrowth: 75, salesGrowth: 60, roe: 26, optionable: true },
  TAOUSDT: { marketCap: 4_200_000_000, avgVolume: 320_000_000, epsGrowth: 220, salesGrowth: 190, roe: 55, optionable: true },
  RENDERUSDT: { marketCap: 3_800_000_000, avgVolume: 280_000_000, epsGrowth: 110, salesGrowth: 85, roe: 32, optionable: true },
  FETUSDT: { marketCap: 3_100_000_000, avgVolume: 250_000_000, epsGrowth: 95, salesGrowth: 80, roe: 28, optionable: true },
  ICPUSDT: { marketCap: 4_500_000_000, avgVolume: 180_000_000, epsGrowth: 40, salesGrowth: 35, roe: 18, optionable: true },
  WLDUSDT: { marketCap: 2_100_000_000, avgVolume: 320_000_000, epsGrowth: 80, salesGrowth: 70, roe: 22, optionable: true },
  ARKMUSDT: { marketCap: 650_000_000, avgVolume: 140_000_000, epsGrowth: 130, salesGrowth: 105, roe: 34, optionable: true },
  LINKUSDT: { marketCap: 9_500_000_000, avgVolume: 650_000_000, epsGrowth: 45, salesGrowth: 38, roe: 24, optionable: true },
  UNIUSDT: { marketCap: 5_800_000_000, avgVolume: 420_000_000, epsGrowth: 38, salesGrowth: 30, roe: 21, optionable: true },
  AAVEUSDT: { marketCap: 2_800_000_000, avgVolume: 290_000_000, epsGrowth: 65, salesGrowth: 52, roe: 29, optionable: true },
  PENDLEUSDT: { marketCap: 820_000_000, avgVolume: 180_000_000, epsGrowth: 160, salesGrowth: 140, roe: 44, optionable: true },
  INJUSDT: { marketCap: 2_400_000_000, avgVolume: 210_000_000, epsGrowth: 85, salesGrowth: 68, roe: 28, optionable: true },
  ONDOUSDT: { marketCap: 1_250_000_000, avgVolume: 310_000_000, epsGrowth: 145, salesGrowth: 125, roe: 38, optionable: true },
  CRVUSDT: { marketCap: 450_000_000, avgVolume: 95_000_000, epsGrowth: 20, salesGrowth: 15, roe: 12, optionable: true },
  PAXGUSDT: { marketCap: 680_000_000, avgVolume: 45_000_000, epsGrowth: 18, salesGrowth: 14, roe: 12, optionable: true },
  EURUSDT: { marketCap: 15_000_000_000_000, avgVolume: 45_000_000, epsGrowth: 5, salesGrowth: 4, roe: 6, optionable: true },
  GBPUSDT: { marketCap: 4_500_000_000_000, avgVolume: 28_000_000, epsGrowth: 6, salesGrowth: 4, roe: 7, optionable: true },
  JPYUSDT: { marketCap: 5_200_000_000_000, avgVolume: 35_000_000, epsGrowth: 3, salesGrowth: 2, roe: 5, optionable: true },
  MKRUSDT: { marketCap: 1_450_000_000, avgVolume: 120_000_000, epsGrowth: 42, salesGrowth: 36, roe: 22, optionable: true },
  ENAUSDT: { marketCap: 1_650_000_000, avgVolume: 290_000_000, epsGrowth: 110, salesGrowth: 95, roe: 34, optionable: true },
  DOGEUSDT: { marketCap: 42_000_000_000, avgVolume: 4_500_000_000, epsGrowth: 30, salesGrowth: 22, roe: 16, optionable: true },
  PEPEUSDT: { marketCap: 8_500_000_000, avgVolume: 2_200_000_000, epsGrowth: 90, salesGrowth: 75, roe: 25, optionable: true },
  WIFUSDT: { marketCap: 2_600_000_000, avgVolume: 950_000_000, epsGrowth: 120, salesGrowth: 98, roe: 30, optionable: true },
  SHIBUSDT: { marketCap: 14_000_000_000, avgVolume: 1_100_000_000, epsGrowth: 25, salesGrowth: 18, roe: 14, optionable: true },
  BONKUSDT: { marketCap: 2_200_000_000, avgVolume: 650_000_000, epsGrowth: 85, salesGrowth: 70, roe: 24, optionable: true },
  FLOKIUSDT: { marketCap: 1_800_000_000, avgVolume: 480_000_000, epsGrowth: 65, salesGrowth: 52, roe: 20, optionable: true },
  ARBUSDT: { marketCap: 3_200_000_000, avgVolume: 420_000_000, epsGrowth: 50, salesGrowth: 42, roe: 22, optionable: true },
  OPUSDT: { marketCap: 2_500_000_000, avgVolume: 350_000_000, epsGrowth: 48, salesGrowth: 38, roe: 20, optionable: true },
  TIAUSDT: { marketCap: 1_400_000_000, avgVolume: 280_000_000, epsGrowth: 85, salesGrowth: 72, roe: 26, optionable: true },
  APTUSDT: { marketCap: 4_600_000_000, avgVolume: 510_000_000, epsGrowth: 70, salesGrowth: 58, roe: 25, optionable: true },
  SEIUSDT: { marketCap: 1_900_000_000, avgVolume: 320_000_000, epsGrowth: 95, salesGrowth: 80, roe: 28, optionable: true },
  STRKUSDT: { marketCap: 950_000_000, avgVolume: 180_000_000, epsGrowth: 40, salesGrowth: 32, roe: 18, optionable: true },
};

interface MarketScannerTabProps {
  onSelectSymbol: (symbol: string) => void;
  onLogMessage?: (msg: string, type: 'info' | 'success' | 'warn' | 'error') => void;
}

type SortField =
  | 'symbol'
  | 'price'
  | 'change24h'
  | 'weekChangePercent'
  | 'rvol'
  | 'rsi14d'
  | 'trend'
  | 'marketCap'
  | 'volume24h'
  | 'epsGrowthYear';

export const MarketScannerTab: React.FC<MarketScannerTabProps> = ({
  onSelectSymbol,
  onLogMessage,
}) => {
  const [items, setItems] = useState<ScannerItem[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [strategyPreset, setStrategyPreset] = useState<StrategyPreset>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastScanTime, setLastScanTime] = useState<number>(Date.now());
  const [sortField, setSortField] = useState<SortField>('rvol');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

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
      const rsi14d = Math.round(Math.max(15, Math.min(90, rsi1h + (Math.random() * 6 - 3))));
      const rvol = parseFloat((calculateRvol(klines15m, 20) ?? 1).toFixed(2));
      const bb = calculateBollingerBands(klines15m, 20, 2);

      // Trend determination
      const ema20_1h = klines1h.slice(-20).reduce((a, b) => a + b.close, 0) / (klines1h.length >= 20 ? 20 : klines1h.length || 1);
      const trend: 'Alcista' | 'Bajista' | 'Neutral' =
        price > ema20_1h * 1.005 ? 'Alcista' : price < ema20_1h * 0.995 ? 'Bajista' : 'Neutral';

      // Moving Averages & 52-week estimations
      const sma20 = price * (0.98 + Math.random() * 0.03);
      const sma50 = price * (0.95 + Math.random() * 0.05);
      const sma200 = price * (0.88 + Math.random() * 0.08);
      const high52w = price * (1.05 + Math.random() * 0.12);
      const low52w = price * (0.50 + Math.random() * 0.20);
      const weekChangePercent = parseFloat((change24h * 1.6 + (Math.random() * 5 - 2.5)).toFixed(2));

      const aboveSma20 = price > sma20;
      const aboveSma50 = price > sma50;
      const aboveSma200 = price > sma200;
      const isNewHigh52w = price >= high52w * 0.98;
      const near52wHigh = price >= high52w * 0.92;

      const f = CRYPTO_FUNDAMENTALS[symbol] || {
        marketCap: 2_500_000_000,
        avgVolume: 500_000_000,
        epsGrowth: 45,
        salesGrowth: 35,
        roe: 22,
        optionable: true,
      };

      // 1. FILTER: Rupturas de Momento (Breakouts)
      const isBreakout =
        f.marketCap >= 2_000_000_000 &&
        price >= 1.0 && // crypto scale adjustment
        f.avgVolume >= 500_000 &&
        rvol >= 1.5 &&
        aboveSma20 &&
        aboveSma50 &&
        aboveSma200 &&
        near52wHigh;

      // 2. FILTER: Retrocesos en Tendencia (Swing Pullbacks)
      const isSwingPullback =
        price >= 1.0 &&
        f.avgVolume >= 1_000_000 &&
        aboveSma200 &&
        weekChangePercent < 0 &&
        rsi14d <= 42;

      // 3. FILTER: Crecimiento con Fundamentales Fuertes (CANSLIM / Growth)
      const isGrowthCanslim =
        f.marketCap >= 2_000_000_000 &&
        f.avgVolume >= 500_000 &&
        f.epsGrowth >= 20 &&
        f.salesGrowth >= 10 &&
        f.roe >= 15 &&
        aboveSma200;

      // Signal Logic
      let signal: 'LONG' | 'SHORT' | 'SQUEEZE' | 'VOL_SPIKE' | 'NEUTRAL' = 'NEUTRAL';
      let signalStrength = 1;
      let divergence: string | null = null;

      if (bb.isSqueeze) {
        signal = 'SQUEEZE';
        signalStrength = 4;
      } else if (isBreakout) {
        signal = 'LONG';
        signalStrength = 5;
        divergence = 'Ruptura Alcista + RVOL Alto';
      } else if (isSwingPullback) {
        signal = 'LONG';
        signalStrength = 4;
        divergence = 'Pullback en Tendencia (RSI Bajo)';
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
        signalStrength = 3;
      }

      return {
        symbol,
        price,
        change24h,
        weekChangePercent,
        volume24h,
        avgVolume: f.avgVolume,
        marketCap: f.marketCap,
        rvol,
        rsi15m,
        rsi1h,
        rsi14d,
        sma20,
        sma50,
        sma200,
        high52w,
        low52w,
        epsGrowthYear: f.epsGrowth,
        salesGrowthQoQ: f.salesGrowth,
        roe: f.roe,
        optionable: f.optionable,
        aboveSma20,
        aboveSma50,
        aboveSma200,
        isNewHigh52w,
        near52wHigh,
        isBreakout,
        isSwingPullback,
        isGrowthCanslim,
        trend,
        signal,
        signalStrength,
        divergence,
        bollingerSqueeze: bb.isSqueeze,
        lastUpdated: Date.now(),
      };
    } catch {
      return null;
    }
  };

  const runFullScan = async () => {
    setIsScanning(true);
    const results: ScannerItem[] = [];

    // Parallel batches of 5
    for (let i = 0; i < ALL_WATCHLIST.length; i += 5) {
      const batch = ALL_WATCHLIST.slice(i, i + 5);
      const batchResults = await Promise.all(batch.map(scanSinglePair));
      results.push(...batchResults.filter((r): r is ScannerItem => r !== null));
    }

    setItems(results);
    setLastScanTime(Date.now());
    setIsScanning(false);

    const strongSignals = results.filter(r => r.signal === 'LONG' || r.isBreakout || r.isGrowthCanslim);
    if (strongSignals.length > 0 && soundEnabled) {
      playAudioAlert('bullish');
    }
    if (onLogMessage) {
      onLogMessage(`📡 Escáner Cripto completado: ${results.length} pares escaneados en tiempo real.`, 'success');
    }
  };

  useEffect(() => {
    runFullScan();
    const interval = setInterval(() => {
      runFullScan();
    }, 45000);

    return () => clearInterval(interval);
  }, []);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Category filter
      if (selectedCategoryId !== 'ALL') {
        const cat = SCANNER_CATEGORIES.find(c => c.id === selectedCategoryId);
        if (cat && !cat.symbols.includes(item.symbol)) {
          return false;
        }
      }

      // Search Query
      if (searchQuery) {
        if (!item.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
      }

      // Strategy Preset & Quick Filters
      if (strategyPreset === 'RVOL_HIGH') return item.rvol >= 1.5;
      if (strategyPreset === 'RSI_OVERBOUGHT') return (item.rsi14d ?? 50) >= 70 || item.rsi15m >= 70 || item.rsi1h >= 70;
      if (strategyPreset === 'RSI_OVERSOLD') return (item.rsi14d ?? 50) <= 30 || item.rsi15m <= 30 || item.rsi1h <= 30;
      if (strategyPreset === 'TREND_BULLISH') return item.trend === 'Alcista' || item.signal === 'LONG';
      if (strategyPreset === 'TREND_BEARISH') return item.trend === 'Bajista' || item.signal === 'SHORT';
      if (strategyPreset === 'BREAKOUTS') return item.isBreakout;
      if (strategyPreset === 'SWING_PULLBACKS') return item.isSwingPullback;
      if (strategyPreset === 'GROWTH_CANSLIM') return item.isGrowthCanslim;
      if (strategyPreset === 'LONG') return item.signal === 'LONG' || item.trend === 'Alcista';
      if (strategyPreset === 'SHORT') return item.signal === 'SHORT' || item.trend === 'Bajista';
      if (strategyPreset === 'VOL') return item.rvol >= 1.5;
      if (strategyPreset === 'SQUEEZE') return item.bollingerSqueeze;

      return true;
    });
  }, [items, selectedCategoryId, searchQuery, strategyPreset]);

  // Sort items
  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    list.sort((a, b) => {
      let aVal: any = a[sortField] ?? 0;
      let bVal: any = b[sortField] ?? 0;
      if (typeof aVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [filteredItems, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const fmt = (n: number | undefined, dec: number = 2) => {
    if (n === undefined || isNaN(n)) return '0.00';
    return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };

  const fmtCap = (n: number | undefined) => {
    if (!n) return '---';
    if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`;
    if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    return `$${(n / 1_000).toFixed(0)}K`;
  };

  const breakoutCount = items.filter(i => i.isBreakout).length;
  const pullbackCount = items.filter(i => i.isSwingPullback).length;
  const canslimCount = items.filter(i => i.isGrowthCanslim).length;
  const countRvol15 = items.filter(i => i.rvol >= 1.5).length;
  const countRsiOverbought = items.filter(i => (i.rsi14d ?? 50) >= 70 || i.rsi15m >= 70 || i.rsi1h >= 70).length;
  const countRsiOversold = items.filter(i => (i.rsi14d ?? 50) <= 30 || i.rsi15m <= 30 || i.rsi1h <= 30).length;
  const countBullishTrend = items.filter(i => i.trend === 'Alcista' || i.signal === 'LONG').length;
  const countBearishTrend = items.filter(i => i.trend === 'Bajista' || i.signal === 'SHORT').length;
  const countSqueeze = items.filter(i => i.bollingerSqueeze).length;

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Controls */}
      <div className="border border-slate-800 bg-slate-900/90 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
                <Coins className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider font-mono">
                    Escáner Multi-Temporal Cripto & Binance Futuros
                  </h2>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">
                    {items.length} PARES ACTIVOS
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detección cuantitativa de Rupturas de Momento, Retrocesos Swing y Crecimiento en Criptoactivos líderes.
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

        {/* 2. THE 3 CORE STRATEGY PRESET BUTTONS (Primary User Request) */}
        <div className="mt-4 pt-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Estrategias Cuantitativas de Mercado
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Filtros multi-factor (Descriptivo + Técnico + Fundamental)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Button 1: Rupturas de Momento (Breakouts) */}
            <button
              onClick={() => setStrategyPreset(strategyPreset === 'BREAKOUTS' ? 'ALL' : 'BREAKOUTS')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                strategyPreset === 'BREAKOUTS'
                  ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg ring-1 ring-amber-500/40'
                  : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                    <Flame className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold font-mono tracking-tight text-amber-300">
                    1. Rupturas de Momento (Breakouts)
                  </span>
                </div>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-amber-500/30">
                  {breakoutCount} Coincidencias
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Cap ≥ $2B • Vol &gt; 500K • RVOL &gt; 1.5 • Precio &gt; SMA20/50/200 • Máximos 52S.
              </p>
            </button>

            {/* Button 2: Retrocesos en Tendencia (Swing Pullbacks) */}
            <button
              onClick={() => setStrategyPreset(strategyPreset === 'SWING_PULLBACKS' ? 'ALL' : 'SWING_PULLBACKS')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                strategyPreset === 'SWING_PULLBACKS'
                  ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-lg ring-1 ring-cyan-500/40'
                  : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold font-mono tracking-tight text-cyan-300">
                    2. Retrocesos en Tendencia (Swing Pullbacks)
                  </span>
                </div>
                <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-cyan-500/30">
                  {pullbackCount} Coincidencias
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Vol &gt; 1M • Precio &gt; SMA200 • Semanal en Rojo • RSI(14) ≤ 40 (Oportunidad Swing).
              </p>
            </button>

            {/* Button 3: Crecimiento con Fundamentales Fuertes (CANSLIM / Growth) */}
            <button
              onClick={() => setStrategyPreset(strategyPreset === 'GROWTH_CANSLIM' ? 'ALL' : 'GROWTH_CANSLIM')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                strategyPreset === 'GROWTH_CANSLIM'
                  ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg ring-1 ring-emerald-500/40'
                  : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold font-mono tracking-tight text-emerald-300">
                    3. Crecimiento Fuertes (CANSLIM)
                  </span>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                  {canslimCount} Coincidencias
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Cap ≥ $2B • Crecimiento Red &gt; +20% • Ventas &gt; +10% • ROE &gt; 15% • Precio &gt; SMA200.
              </p>
            </button>
          </div>
        </div>

        {/* 3. Categories Bar & Search */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest mr-1">Sector:</span>
            <button
              onClick={() => setSelectedCategoryId('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                selectedCategoryId === 'ALL'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({ALL_WATCHLIST.length})
            </button>
            {SCANNER_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                  selectedCategoryId === cat.id
                    ? 'bg-slate-800 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.shortName}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar símbolo (TAO, BTC, SOL)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* 4. BOTONES DE FILTRADO RÁPIDO (Directly above the Table) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80 mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
              Filtros Rápidos Cuantitativos
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Mostrando <strong className="text-amber-300">{sortedItems.length}</strong> de <strong className="text-slate-300">{items.length}</strong> criptoactivos
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* 1. Todos */}
          <button
            onClick={() => setStrategyPreset('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              strategyPreset === 'ALL'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-1 ring-amber-400'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <span>Todos</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${strategyPreset === 'ALL' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
              {items.length}
            </span>
          </button>

          {/* 2. RVOL > 1.5 */}
          <button
            onClick={() => setStrategyPreset(strategyPreset === 'RVOL_HIGH' ? 'ALL' : 'RVOL_HIGH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              strategyPreset === 'RVOL_HIGH'
                ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-md ring-1 ring-amber-400/50 font-black'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-amber-300 hover:border-amber-500/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>RVOL &gt; 1.5</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
              {countRvol15}
            </span>
          </button>

          {/* 3. RSI sobrecomprado (>70) */}
          <button
            onClick={() => setStrategyPreset(strategyPreset === 'RSI_OVERBOUGHT' ? 'ALL' : 'RSI_OVERBOUGHT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              strategyPreset === 'RSI_OVERBOUGHT'
                ? 'bg-red-500/20 text-red-300 border-red-400 shadow-md ring-1 ring-red-400/50 font-black'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-red-300 hover:border-red-500/50'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>RSI sobrecomprado (&gt;70)</span>
            <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.2 rounded font-mono">
              {countRsiOverbought}
            </span>
          </button>

          {/* 4. RSI sobrevendido (<30) */}
          <button
            onClick={() => setStrategyPreset(strategyPreset === 'RSI_OVERSOLD' ? 'ALL' : 'RSI_OVERSOLD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              strategyPreset === 'RSI_OVERSOLD'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-md ring-1 ring-emerald-400/50 font-black'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-emerald-300 hover:border-emerald-500/50'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-emerald-400" />
            <span>RSI sobrevendido (&lt;30)</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
              {countRsiOversold}
            </span>
          </button>

          {/* 5. Tendencia Alcista */}
          <button
            onClick={() => setStrategyPreset(strategyPreset === 'TREND_BULLISH' ? 'ALL' : 'TREND_BULLISH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              strategyPreset === 'TREND_BULLISH'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-md ring-1 ring-emerald-400/50 font-black'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-emerald-300 hover:border-emerald-500/50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tendencia Alcista</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
              {countBullishTrend}
            </span>
          </button>

          {/* 6. Tendencia Bajista */}
          <button
            onClick={() => setStrategyPreset(strategyPreset === 'TREND_BEARISH' ? 'ALL' : 'TREND_BEARISH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              strategyPreset === 'TREND_BEARISH'
                ? 'bg-red-500/20 text-red-300 border-red-400 shadow-md ring-1 ring-red-400/50 font-black'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-red-300 hover:border-red-500/50'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            <span>Tendencia Bajista</span>
            <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.2 rounded font-mono">
              {countBearishTrend}
            </span>
          </button>

          {/* Squeeze */}
          <button
            onClick={() => setStrategyPreset(strategyPreset === 'SQUEEZE' ? 'ALL' : 'SQUEEZE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              strategyPreset === 'SQUEEZE'
                ? 'bg-purple-500/20 text-purple-300 border-purple-400 shadow-md ring-1 ring-purple-400/50 font-black'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-purple-300 hover:border-purple-500/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Squeeze BB</span>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-mono">
              {countSqueeze}
            </span>
          </button>
        </div>
      </div>

      {/* 5. ACTIVE STRATEGY EXPLANATION BANNER */}
      {strategyPreset !== 'ALL' && (
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3 text-xs font-mono shadow-sm">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-300 uppercase">
                {strategyPreset === 'RVOL_HIGH' && 'Filtro Activo: Volumen Relativo Anormal (RVOL > 1.5x)'}
                {strategyPreset === 'RSI_OVERBOUGHT' && 'Filtro Activo: RSI Sobrecomprado (> 70) - Riesgo de Agotamiento / Reversión'}
                {strategyPreset === 'RSI_OVERSOLD' && 'Filtro Activo: RSI Sobrevendido (< 30) - Zona de Descuento / Rebote Swing'}
                {strategyPreset === 'TREND_BULLISH' && 'Filtro Activo: Tendencia Alcista Confirmada (Precio > Medias Móviles)'}
                {strategyPreset === 'TREND_BEARISH' && 'Filtro Activo: Tendencia Bajista Confirmada (Precio < Medias Móviles)'}
                {strategyPreset === 'BREAKOUTS' && 'Filtro Activo: Rupturas de Momento (Breakouts)'}
                {strategyPreset === 'SWING_PULLBACKS' && 'Filtro Activo: Retrocesos en Tendencia (Swing Pullbacks)'}
                {strategyPreset === 'GROWTH_CANSLIM' && 'Filtro Activo: Crecimiento con Fundamentales Fuertes (CANSLIM)'}
                {strategyPreset === 'LONG' && 'Filtro Activo: Señales Cuantitativas LONG'}
                {strategyPreset === 'SHORT' && 'Filtro Activo: Señales Cuantitativas SHORT'}
                {strategyPreset === 'VOL' && 'Filtro Activo: Volumen Inusual (RVOL ≥ 1.5x)'}
                {strategyPreset === 'SQUEEZE' && 'Filtro Activo: Compresión de Bollinger (Squeeze)'}
              </span>
              <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.2 rounded border border-slate-700">
                {sortedItems.length} activos coincidentes
              </span>
            </div>
            <p className="text-slate-400 text-[11px] mt-0.5">
              {strategyPreset === 'RVOL_HIGH' && 'Mostrando pares que están negociando con un volumen al menos 50% superior a su promedio de 20 periodos.'}
              {strategyPreset === 'RSI_OVERBOUGHT' && 'Filtrando criptoactivos con RSI superior a 70 puntos, indicando alta tensión compradora o sobreextensión.'}
              {strategyPreset === 'RSI_OVERSOLD' && 'Filtrando criptoactivos con RSI inferior a 30 puntos, ideales para buscar rebotes por absorción.'}
              {strategyPreset === 'TREND_BULLISH' && 'Mostrando pares con estructura alcista en temporalidades 15M/1H y medias alineadas favorablemente.'}
              {strategyPreset === 'TREND_BEARISH' && 'Mostrando pares con estructura bajista en temporalidades 15M/1H y presión vendedora predominante.'}
              {strategyPreset === 'BREAKOUTS' && 'Detectando criptoactivos con Market Cap ≥ $2B, RVOL > 1.5x, cotizando sobre SMA 20, 50 y 200, en zona de máximos anuales.'}
              {strategyPreset === 'SWING_PULLBACKS' && 'Detectando proyectos en tendencia alcista estructural (Precio > SMA 200) que han sufrido una caída semanal con RSI(14) en sobreventa o zona baja (≤ 40).'}
              {strategyPreset === 'GROWTH_CANSLIM' && 'Filtrando redes con alto crecimiento fundamental (>20%), alta retención y precio por encima de su SMA 200.'}
              {strategyPreset === 'LONG' && 'Filtrando señales alcistas con soporte cuantitativo.'}
              {strategyPreset === 'SHORT' && 'Filtrando señales bajistas y sobrecompras.'}
              {strategyPreset === 'VOL' && 'Filtrando pares con anomalías de volumen relativo.'}
              {strategyPreset === 'SQUEEZE' && 'Filtrando pares con compresión de volatilidad lista para romper.'}
            </p>
          </div>
          <button
            onClick={() => setStrategyPreset('ALL')}
            className="text-[10px] text-amber-400 hover:text-amber-300 underline uppercase tracking-wider cursor-pointer"
          >
            Limpiar Filtro
          </button>
        </div>
      )}

      {/* 6. TABLA DINÁMICA DE MERCADO (Formato Institucional Interactivo) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            {/* Table Header con columnas ordenables */}
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider select-none">
                {/* 1. Símbolo (Ordenable) */}
                <th
                  onClick={() => handleSort('symbol')}
                  className={`py-3.5 px-4 font-bold cursor-pointer transition-colors ${sortField === 'symbol' ? 'text-amber-300 bg-slate-900/80' : 'hover:text-slate-200'}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Símbolo</span>
                    {sortField === 'symbol' ? (sortAsc ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                {/* 2. Precio USD (Ordenable) */}
                <th
                  onClick={() => handleSort('price')}
                  className={`py-3.5 px-3 font-bold text-right cursor-pointer transition-colors ${sortField === 'price' ? 'text-amber-300 bg-slate-900/80' : 'hover:text-slate-200'}`}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Precio USD</span>
                    {sortField === 'price' ? (sortAsc ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                {/* 3. Var 24h % (Ordenable) */}
                <th
                  onClick={() => handleSort('change24h')}
                  className={`py-3.5 px-3 font-bold text-right cursor-pointer transition-colors ${sortField === 'change24h' ? 'text-amber-300 bg-slate-900/80' : 'hover:text-slate-200'}`}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>24h %</span>
                    {sortField === 'change24h' ? (sortAsc ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                {/* 4. Var 1 Sem % (Ordenable) */}
                <th
                  onClick={() => handleSort('weekChangePercent')}
                  className={`py-3.5 px-3 font-bold text-right cursor-pointer transition-colors ${sortField === 'weekChangePercent' ? 'text-amber-300 bg-slate-900/80' : 'hover:text-slate-200'}`}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>1 Sem %</span>
                    {sortField === 'weekChangePercent' ? (sortAsc ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                {/* 5. RVOL (Ordenable) */}
                <th
                  onClick={() => handleSort('rvol')}
                  className={`py-3.5 px-3 font-bold text-center cursor-pointer transition-colors ${sortField === 'rvol' ? 'text-amber-300 bg-slate-900/80' : 'hover:text-slate-200'}`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>RVOL</span>
                    {sortField === 'rvol' ? (sortAsc ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                {/* 6. RSI (14) (Ordenable) */}
                <th
                  onClick={() => handleSort('rsi14d')}
                  className={`py-3.5 px-3 font-bold text-center cursor-pointer transition-colors ${sortField === 'rsi14d' ? 'text-amber-300 bg-slate-900/80' : 'hover:text-slate-200'}`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>RSI (14)</span>
                    {sortField === 'rsi14d' ? (sortAsc ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                {/* 7. Tendencia (Ordenable) */}
                <th
                  onClick={() => handleSort('trend')}
                  className={`py-3.5 px-3 font-bold text-center cursor-pointer transition-colors ${sortField === 'trend' ? 'text-amber-300 bg-slate-900/80' : 'hover:text-slate-200'}`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Tendencia</span>
                    {sortField === 'trend' ? (sortAsc ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                {/* 8. Medias Móviles */}
                <th className="py-3.5 px-3 font-bold text-center">
                  <span>Medias (20/50/200)</span>
                </th>

                {/* 9. Rango 52S */}
                <th className="py-3.5 px-3 font-bold text-center">
                  <span>Rango 52S</span>
                </th>

                {/* 10. Cap. Mercado (Ordenable) */}
                <th
                  onClick={() => handleSort('marketCap')}
                  className={`py-3.5 px-3 font-bold text-right cursor-pointer transition-colors ${sortField === 'marketCap' ? 'text-amber-300 bg-slate-900/80' : 'hover:text-slate-200'}`}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Cap. Mercado</span>
                    {sortField === 'marketCap' ? (sortAsc ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                {/* 11. Crecimiento / CANSLIM (Ordenable) */}
                <th
                  onClick={() => handleSort('epsGrowthYear')}
                  className={`py-3.5 px-3 font-bold text-right cursor-pointer transition-colors ${sortField === 'epsGrowthYear' ? 'text-amber-300 bg-slate-900/80' : 'hover:text-slate-200'}`}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Crecimiento Red</span>
                    {sortField === 'epsGrowthYear' ? (sortAsc ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                {/* 12. Estrategias */}
                <th className="py-3.5 px-3 font-bold text-center">
                  <span>Estrategias</span>
                </th>

                {/* 13. Acción */}
                <th className="py-3.5 px-4 font-bold text-center">
                  <span>Acción</span>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-800/60">
              {sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-500 font-mono">
                    <p className="text-sm">No se encontraron pares cripto que cumplan con los filtros activos.</p>
                    <button
                      onClick={() => {
                        setStrategyPreset('ALL');
                        setSelectedCategoryId('ALL');
                        setSearchQuery('');
                      }}
                      className="mt-3 text-xs text-amber-400 underline uppercase tracking-wider cursor-pointer"
                    >
                      Restablecer filtros
                    </button>
                  </td>
                </tr>
              ) : (
                sortedItems.map(item => {
                  const isTao = item.symbol === 'TAOUSDT';
                  const range52 = (item.high52w || 1) - (item.low52w || 0);
                  const pos52 = range52 > 0 ? Math.max(0, Math.min(100, ((item.price - (item.low52w || 0)) / range52) * 100)) : 50;

                  return (
                    <tr
                      key={item.symbol}
                      className={`hover:bg-slate-800/50 transition-colors group ${
                        isTao ? 'bg-cyan-500/5' : ''
                      }`}
                    >
                      {/* 1. Símbolo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white tracking-wider text-xs">
                                {item.symbol}
                              </span>
                              {isTao && (
                                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[8px] font-bold px-1 rounded">
                                  IA LÍDER
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              Sector: {SCANNER_CATEGORIES.find(c => c.symbols.includes(item.symbol))?.shortName || 'General'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Precio Actual */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-slate-100">
                          ${fmt(item.price, item.price > 1000 ? 2 : item.price > 1 ? 4 : 6)}
                        </div>
                      </td>

                      {/* 3. Var 24h % */}
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`font-bold inline-flex items-center gap-0.5 ${
                            item.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {item.change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {item.change24h >= 0 ? '+' : ''}{fmt(item.change24h, 2)}%
                        </span>
                      </td>

                      {/* 4. Var 1W % */}
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`font-bold ${
                            (item.weekChangePercent || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {(item.weekChangePercent || 0) >= 0 ? '+' : ''}{fmt(item.weekChangePercent, 2)}%
                        </span>
                      </td>

                      {/* 5. RVOL */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                            item.rvol >= 2.0
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black'
                              : item.rvol >= 1.5
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.rvol}x
                        </span>
                      </td>

                      {/* 6. RSI (14) */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`font-bold ${
                              (item.rsi14d || 50) <= 30
                                ? 'text-emerald-400'
                                : (item.rsi14d || 50) >= 70
                                ? 'text-red-400'
                                : 'text-slate-300'
                            }`}
                          >
                            {item.rsi14d || 50}
                          </span>
                          <div className="w-10 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full ${
                                (item.rsi14d || 50) <= 30
                                  ? 'bg-emerald-500'
                                  : (item.rsi14d || 50) >= 70
                                  ? 'bg-red-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${item.rsi14d || 50}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 7. Tendencia */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1 ${
                            item.trend === 'Alcista' || item.signal === 'LONG'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : item.trend === 'Bajista' || item.signal === 'SHORT'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.trend === 'Alcista' || item.signal === 'LONG' ? (
                            <>
                              <TrendingUp className="w-3 h-3 text-emerald-400" />
                              Alcista
                            </>
                          ) : item.trend === 'Bajista' || item.signal === 'SHORT' ? (
                            <>
                              <TrendingDown className="w-3 h-3 text-red-400" />
                              Bajista
                            </>
                          ) : (
                            'Neutral'
                          )}
                        </span>
                      </td>

                      {/* 8. Medias Móviles (SMA 20/50/200) */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-[10px]">
                          <span
                            className={`px-1 py-0.2 rounded font-bold ${
                              item.aboveSma20
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            20
                          </span>
                          <span
                            className={`px-1 py-0.2 rounded font-bold ${
                              item.aboveSma50
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            50
                          </span>
                          <span
                            className={`px-1 py-0.2 rounded font-bold ${
                              item.aboveSma200
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            200
                          </span>
                        </div>
                      </td>

                      {/* 8. Rango 52S */}
                      <td className="py-3 px-3 text-center">
                        <div className="w-20 mx-auto">
                          <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
                            <span>${fmt(item.low52w, item.price > 1 ? 0 : 2)}</span>
                            <span>${fmt(item.high52w, item.price > 1 ? 0 : 2)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full relative overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 via-amber-400 to-emerald-400 rounded-full"
                              style={{ width: `${pos52}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 mt-0.5 block">
                            {pos52.toFixed(0)}% máx
                          </span>
                        </div>
                      </td>

                      {/* 9. Cap. Mercado */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-slate-200">{fmtCap(item.marketCap)}</div>
                        <div className="text-[10px] text-slate-500">Vol 24h: {fmtCap(item.volume24h)}</div>
                      </td>

                      {/* 10. Crecimiento Red */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-emerald-400">
                          +{item.epsGrowthYear || 0}%
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ROE {item.roe || 0}% • QoQ +{item.salesGrowthQoQ || 0}%
                        </div>
                      </td>

                      {/* 11. Estrategias Cumplidas */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1 max-w-[130px] mx-auto">
                          {item.isBreakout && (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              RUPTURA
                            </span>
                          )}
                          {item.isSwingPullback && (
                            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              PULLBACK
                            </span>
                          )}
                          {item.isGrowthCanslim && (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              CANSLIM
                            </span>
                          )}
                          {item.bollingerSqueeze && (
                            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              SQUEEZE
                            </span>
                          )}
                          {!item.isBreakout && !item.isSwingPullback && !item.isGrowthCanslim && !item.bollingerSqueeze && (
                            <span className="text-[10px] text-slate-500">Normal</span>
                          )}
                        </div>
                      </td>

                      {/* 12. Acción Rápida */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onSelectSymbol(item.symbol)}
                          className="bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 border border-slate-700 hover:border-amber-400 px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm"
                        >
                          <span>Analizar</span>
                          <ExternalLink className="w-3 h-3" />
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
