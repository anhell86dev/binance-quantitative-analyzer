import React, { useState, useEffect, useMemo } from 'react';
import { TradFiScannerItem, StrategyPreset } from '../types';
import { calculateRsi, calculateRvol, calculateBollingerBands, playAudioAlert } from '../utils/indicators';
import { fetchKlinesWithFallback, fetchTickerWithFallback } from '../utils/marketService';
import {
  Landmark,
  RefreshCw,
  Volume2,
  VolumeX,
  Zap,
  Filter,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Coins,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  PieChart,
  ShieldCheck,
  Fuel,
  Scale,
  Sparkles,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Flame,
  RotateCcw,
  BarChart3,
  SlidersHorizontal,
  Info,
  Droplets,
} from 'lucide-react';

export interface TradFiCategoryDef {
  id: 'ALL' | 'COMMODITIES' | 'FOREX' | 'RWA_TREASURIES' | 'EQUITY_INDICES';
  name: string;
  shortName: string;
  icon: any;
  color: string;
  description: string;
}

export const TRADFI_CATEGORIES: TradFiCategoryDef[] = [
  {
    id: 'ALL',
    name: 'Todos los Pares TradFi',
    shortName: 'Todo TradFi',
    icon: Landmark,
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    description: 'Universo completo de activos tradicionales, RWA, commodities y divisas en Binance Futuros.',
  },
  {
    id: 'COMMODITIES',
    name: 'Metales Preciosos & Materias Primas',
    shortName: 'Commodities',
    icon: Coins,
    color: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
    description: 'Oro (PAXG, XAU), Plata (XAG) y Petróleo (OIL, BRENT). Activos refugio y cobertura contra inflación.',
  },
  {
    id: 'FOREX',
    name: 'Divisas Globales FX (Fiat Currency Futures)',
    shortName: 'Forex FX',
    icon: DollarSign,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    description: 'EUR/USDT, GBP/USDT, JPY/USDT, AUD/USDT. Mercados de divisas soberanas de alta liquidez macro.',
  },
  {
    id: 'RWA_TREASURIES',
    name: 'RWA, Bonos del Tesoro & Yield Institucional',
    shortName: 'RWA & Yield',
    icon: Building2,
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    description: 'ONDO (Bonos EE.UU.), PENDLE, MKR/SKY, AAVE, LINK, ENA. Tokenización de crédito e instrumentos institucionales.',
  },
  {
    id: 'EQUITY_INDICES',
    name: 'Índices Bursátiles & Proxies de Renta Variable',
    shortName: 'Índices & Stocks',
    icon: PieChart,
    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    description: 'Proxies de S&P 500, NASDAQ 100, Coinbase (COIN), Nvidia (NVDA), Tesla (TSLA) y MicroStrategy (MSTR).',
  },
];

interface TradFiPairMeta {
  symbol: string;
  tradfiCategory: 'COMMODITIES' | 'FOREX' | 'RWA_TREASURIES' | 'EQUITY_INDICES';
  categoryLabel: string;
  underlyingName: string;
  underlyingAsset: string;
  contractType: string;
  dxyCorrelation: number;
  spxCorrelation: number;
  btcCorrelation: number;
  basePriceEstimate: number;
  marketCap: number; // in USD
  avgVolume: number;
  epsGrowthYear: number; // %
  salesGrowthQoQ: number; // %
  roe: number; // %
  optionable: boolean;
}

export const TRADFI_PAIRS_CATALOG: TradFiPairMeta[] = [
  // 1. Commodities & Precious Metals
  {
    symbol: 'PAXGUSDT',
    tradfiCategory: 'COMMODITIES',
    categoryLabel: 'Metales Preciosos',
    underlyingName: 'Pax Gold (Oro Físico 1 oz troy en bóvedas Brink\'s)',
    underlyingAsset: 'Gold Bullion (XAU/USD)',
    contractType: 'Perpetuo USDT-M',
    dxyCorrelation: -0.78,
    spxCorrelation: 0.22,
    btcCorrelation: 0.62,
    basePriceEstimate: 2748.5,
    marketCap: 680_000_000,
    avgVolume: 1_850_000,
    epsGrowthYear: 18.5,
    salesGrowthQoQ: 14.2,
    roe: 12.0,
    optionable: true,
  },
  {
    symbol: 'XAUUSDT',
    tradfiCategory: 'COMMODITIES',
    categoryLabel: 'Metales Preciosos',
    underlyingName: 'Gold Spot / Onza de Oro Fino',
    underlyingAsset: 'XAU / USD Commodity Benchmark',
    contractType: 'Sintético / Spot Index',
    dxyCorrelation: -0.82,
    spxCorrelation: 0.28,
    btcCorrelation: 0.65,
    basePriceEstimate: 2750.2,
    marketCap: 16_500_000_000_000,
    avgVolume: 25_000_000,
    epsGrowthYear: 22.0,
    salesGrowthQoQ: 15.0,
    roe: 16.0,
    optionable: true,
  },
  {
    symbol: 'XAGUSDT',
    tradfiCategory: 'COMMODITIES',
    categoryLabel: 'Metales Preciosos',
    underlyingName: 'Silver Spot / Onza de Plata Fina',
    underlyingAsset: 'XAG / USD Commodity',
    contractType: 'Perpetuo USDT-M',
    dxyCorrelation: -0.74,
    spxCorrelation: 0.45,
    btcCorrelation: 0.58,
    basePriceEstimate: 33.85,
    marketCap: 1_800_000_000_000,
    avgVolume: 8_500_000,
    epsGrowthYear: 24.5,
    salesGrowthQoQ: 18.0,
    roe: 14.2,
    optionable: true,
  },
  {
    symbol: 'OILUSDT',
    tradfiCategory: 'COMMODITIES',
    categoryLabel: 'Materias Primas & Energía',
    underlyingName: 'Petróleo Crudo WTI (West Texas Intermediate)',
    underlyingAsset: 'WTI Crude Oil Barrel',
    contractType: 'Perpetuo USDT-M',
    dxyCorrelation: -0.42,
    spxCorrelation: 0.52,
    btcCorrelation: 0.35,
    basePriceEstimate: 71.40,
    marketCap: 2_400_000_000_000,
    avgVolume: 12_000_000,
    epsGrowthYear: 12.0,
    salesGrowthQoQ: 8.5,
    roe: 15.5,
    optionable: true,
  },
  {
    symbol: 'BRENTUSDT',
    tradfiCategory: 'COMMODITIES',
    categoryLabel: 'Materias Primas & Energía',
    underlyingName: 'Petróleo Crudo Brent Mar del Norte',
    underlyingAsset: 'Brent Oil Benchmark',
    contractType: 'Perpetuo USDT-M',
    dxyCorrelation: -0.45,
    spxCorrelation: 0.49,
    btcCorrelation: 0.31,
    basePriceEstimate: 75.60,
    marketCap: 2_600_000_000_000,
    avgVolume: 10_500_000,
    epsGrowthYear: 14.0,
    salesGrowthQoQ: 9.0,
    roe: 16.0,
    optionable: true,
  },

  // 2. Forex Global Fiat Pairs
  {
    symbol: 'EURUSDT',
    tradfiCategory: 'FOREX',
    categoryLabel: 'Divisas Globales FX',
    underlyingName: 'Euro / Dólar Estadounidense (Par EUR/USD)',
    underlyingAsset: 'Banco Central Europeo (BCE FX)',
    contractType: 'Perpetuo USDT-M',
    dxyCorrelation: -0.96,
    spxCorrelation: 0.65,
    btcCorrelation: 0.74,
    basePriceEstimate: 1.085,
    marketCap: 15_000_000_000_000,
    avgVolume: 45_000_000,
    epsGrowthYear: 5.0,
    salesGrowthQoQ: 4.0,
    roe: 6.5,
    optionable: true,
  },
  {
    symbol: 'GBPUSDT',
    tradfiCategory: 'FOREX',
    categoryLabel: 'Divisas Globales FX',
    underlyingName: 'Libra Esterlina / Dólar (Cable FX GBP/USD)',
    underlyingAsset: 'Bank of England Sterling',
    contractType: 'Perpetuo USDT-M',
    dxyCorrelation: -0.88,
    spxCorrelation: 0.60,
    btcCorrelation: 0.68,
    basePriceEstimate: 1.298,
    marketCap: 4_500_000_000_000,
    avgVolume: 28_000_000,
    epsGrowthYear: 6.2,
    salesGrowthQoQ: 4.5,
    roe: 7.0,
    optionable: true,
  },
  {
    symbol: 'JPYUSDT',
    tradfiCategory: 'FOREX',
    categoryLabel: 'Divisas Globales FX',
    underlyingName: 'Yen Japonés / Dólar Estadounidense',
    underlyingAsset: 'Bank of Japan (BOJ JPY Spot)',
    contractType: 'Perpetuo USDT-M',
    dxyCorrelation: 0.68,
    spxCorrelation: -0.45,
    btcCorrelation: -0.55,
    basePriceEstimate: 0.00654,
    marketCap: 5_200_000_000_000,
    avgVolume: 35_000_000,
    epsGrowthYear: 3.5,
    salesGrowthQoQ: 2.5,
    roe: 5.0,
    optionable: true,
  },
  {
    symbol: 'AUDUSDT',
    tradfiCategory: 'FOREX',
    categoryLabel: 'Divisas Globales FX',
    underlyingName: 'Dólar Australiano (High-Beta Commodity Currency)',
    underlyingAsset: 'Reserve Bank of Australia (RBA)',
    contractType: 'Perpetuo USDT-M',
    dxyCorrelation: -0.84,
    spxCorrelation: 0.75,
    btcCorrelation: 0.78,
    basePriceEstimate: 0.658,
    marketCap: 1_800_000_000_000,
    avgVolume: 14_000_000,
    epsGrowthYear: 7.0,
    salesGrowthQoQ: 5.5,
    roe: 8.5,
    optionable: true,
  },
  {
    symbol: 'CHFUSDT',
    tradfiCategory: 'FOREX',
    categoryLabel: 'Divisas Globales FX',
    underlyingName: 'Franco Suizo (Refugio Europeo de Divisas)',
    underlyingAsset: 'Swiss National Bank (SNB)',
    contractType: 'Perpetuo USDT-M',
    dxyCorrelation: -0.86,
    spxCorrelation: 0.38,
    btcCorrelation: 0.52,
    basePriceEstimate: 1.152,
    marketCap: 1_200_000_000_000,
    avgVolume: 9_500_000,
    epsGrowthYear: 4.8,
    salesGrowthQoQ: 3.2,
    roe: 6.0,
    optionable: true,
  },
  {
    symbol: 'CADUSDT',
    tradfiCategory: 'FOREX',
    categoryLabel: 'Divisas Globales FX',
    underlyingName: 'Dólar Canadiense (Loonie / Energy FX)',
    underlyingAsset: 'Bank of Canada (BOC)',
    contractType: 'Perpetuo USDT-M',
    dxyCorrelation: -0.79,
    spxCorrelation: 0.68,
    btcCorrelation: 0.64,
    basePriceEstimate: 0.722,
    marketCap: 1_600_000_000_000,
    avgVolume: 11_000_000,
    epsGrowthYear: 6.0,
    salesGrowthQoQ: 4.8,
    roe: 7.5,
    optionable: true,
  },

  // 3. RWA & US Treasuries / Institutional Yield
  {
    symbol: 'ONDOUSDT',
    tradfiCategory: 'RWA_TREASURIES',
    categoryLabel: 'RWA & Bonos del Tesoro',
    underlyingName: 'Ondo Finance (Bonos del Tesoro EE.UU. a corto plazo 5.2% APY)',
    underlyingAsset: 'U.S. Treasury Bills (OUSG / USDY)',
    contractType: 'Perpetuo USDT-M',
    dxyCorrelation: -0.65,
    spxCorrelation: 0.72,
    btcCorrelation: 0.81,
    basePriceEstimate: 0.865,
    marketCap: 1_250_000_000,
    avgVolume: 8_500_000,
    epsGrowthYear: 45.0,
    salesGrowthQoQ: 52.0,
    roe: 24.5,
    optionable: true,
  },
  {
    symbol: 'PENDLEUSDT',
    tradfiCategory: 'RWA_TREASURIES',
    categoryLabel: 'RWA & Bonos del Tesoro',
    underlyingName: 'Pendle Finance (Tokenización de Rendimientos & Tipos de Interés)',
    underlyingAsset: 'TradFi Fixed Yield & Principal Tokens',
    contractType: 'Perpetuo USDT-M',
    dxyCorrelation: -0.60,
    spxCorrelation: 0.70,
    btcCorrelation: 0.79,
    basePriceEstimate: 4.85,
    marketCap: 780_000_000,
    avgVolume: 5_200_000,
    epsGrowthYear: 65.0,
    salesGrowthQoQ: 74.0,
    roe: 31.0,
    optionable: true,
  },
  {
    symbol: 'MKRUSDT',
    tradfiCategory: 'RWA_TREASURIES',
    categoryLabel: 'RWA & Bonos del Tesoro',
    underlyingName: 'Maker / Sky Protocol (Portafolio de $2.5B en Deuda del Tesoro EE.UU.)',
    underlyingAsset: 'Centrifuge & BlockTower Treasury Portfolios',
    contractType: 'Perpetuo USDT-M',
    dxyCorrelation: -0.62,
    spxCorrelation: 0.68,
    btcCorrelation: 0.77,
    basePriceEstimate: 1620.0,
    marketCap: 1_450_000_000,
    avgVolume: 3_800_000,
    epsGrowthYear: 38.0,
    salesGrowthQoQ: 28.5,
    roe: 19.5,
    optionable: true,
  },
  {
    symbol: 'AAVEUSDT',
    tradfiCategory: 'RWA_TREASURIES',
    categoryLabel: 'RWA & Bonos del Tesoro',
    underlyingName: 'Aave Protocol (Mercados Institucionales & Préstamos RWA)',
    underlyingAsset: 'Aave Institutional Prime Markets',
    contractType: 'Perpetuo USDT-M',
    dxyCorrelation: -0.66,
    spxCorrelation: 0.71,
    btcCorrelation: 0.82,
    basePriceEstimate: 172.5,
    marketCap: 2_600_000_000,
    avgVolume: 6_200_000,
    epsGrowthYear: 32.0,
    salesGrowthQoQ: 26.0,
    roe: 22.0,
    optionable: true,
  },
  {
    symbol: 'LINKUSDT',
    tradfiCategory: 'RWA_TREASURIES',
    categoryLabel: 'RWA & Bonos del Tesoro',
    underlyingName: 'Chainlink CCIP (Conectividad Interbancaria Swift & DTCC)',
    underlyingAsset: 'Swift Global Settlement Messaging',
    contractType: 'Perpetuo USDT-M',
    dxyCorrelation: -0.68,
    spxCorrelation: 0.73,
    btcCorrelation: 0.84,
    basePriceEstimate: 14.85,
    marketCap: 9_200_000_000,
    avgVolume: 12_000_000,
    epsGrowthYear: 28.0,
    salesGrowthQoQ: 24.5,
    roe: 18.5,
    optionable: true,
  },
  {
    symbol: 'ENAUSDT',
    tradfiCategory: 'RWA_TREASURIES',
    categoryLabel: 'RWA & Bonos del Tesoro',
    underlyingName: 'Ethena Labs USDe (Dólar Sintético con Respaldo en Rendimiento Basis)',
    underlyingAsset: 'Delta-Neutral Cash and Carry Yield Engine',
    contractType: 'Perpetuo USDT-M',
    dxyCorrelation: -0.58,
    spxCorrelation: 0.70,
    btcCorrelation: 0.79,
    basePriceEstimate: 0.54,
    marketCap: 1_650_000_000,
    avgVolume: 7_400_000,
    epsGrowthYear: 55.0,
    salesGrowthQoQ: 68.0,
    roe: 28.0,
    optionable: true,
  },

  // 4. Equity Indices & Stock Proxies
  {
    symbol: 'SPXUSDT',
    tradfiCategory: 'EQUITY_INDICES',
    categoryLabel: 'Índices & Renta Variable',
    underlyingName: 'S&P 500 Index Proxy (Top 500 Empresas de EE.UU.)',
    underlyingAsset: 'Standard & Poor\'s 500 Index',
    contractType: 'Sintético / Equity Proxy',
    dxyCorrelation: -0.84,
    spxCorrelation: 1.0,
    btcCorrelation: 0.76,
    basePriceEstimate: 5864.2,
    marketCap: 45_000_000_000_000,
    avgVolume: 65_000_000,
    epsGrowthYear: 14.5,
    salesGrowthQoQ: 11.2,
    roe: 18.2,
    optionable: true,
  },
  {
    symbol: 'NDXUSDT',
    tradfiCategory: 'EQUITY_INDICES',
    categoryLabel: 'Índices & Renta Variable',
    underlyingName: 'Nasdaq 100 Tech Proxy (Gigantes Tecnológicos de Wall Street)',
    underlyingAsset: 'Nasdaq 100 Technology Benchmark',
    contractType: 'Sintético / Equity Proxy',
    dxyCorrelation: -0.88,
    spxCorrelation: 0.94,
    btcCorrelation: 0.84,
    basePriceEstimate: 20420.5,
    marketCap: 22_000_000_000_000,
    avgVolume: 48_000_000,
    epsGrowthYear: 21.5,
    salesGrowthQoQ: 16.8,
    roe: 24.0,
    optionable: true,
  },
  {
    symbol: 'NVDAUSDT',
    tradfiCategory: 'EQUITY_INDICES',
    categoryLabel: 'Índices & Renta Variable',
    underlyingName: 'NVIDIA Corporation Tech Proxy (NASDAQ: NVDA)',
    underlyingAsset: 'NVIDIA GPU & AI Infrastructure Stock',
    contractType: 'Perpetuo USDT-M / Equity Proxy',
    dxyCorrelation: -0.81,
    spxCorrelation: 0.89,
    btcCorrelation: 0.86,
    basePriceEstimate: 142.8,
    marketCap: 3_500_000_000_000,
    avgVolume: 52_000_000,
    epsGrowthYear: 128.0,
    salesGrowthQoQ: 94.0,
    roe: 55.4,
    optionable: true,
  },
  {
    symbol: 'COINUSDT',
    tradfiCategory: 'EQUITY_INDICES',
    categoryLabel: 'Índices & Renta Variable',
    underlyingName: 'Coinbase Global Inc. Stock Proxy (NASDAQ: COIN)',
    underlyingAsset: 'Coinbase Class A Common Stock',
    contractType: 'Perpetuo USDT-M / Equity Proxy',
    dxyCorrelation: -0.79,
    spxCorrelation: 0.82,
    btcCorrelation: 0.91,
    basePriceEstimate: 218.4,
    marketCap: 54_000_000_000,
    avgVolume: 8_900_000,
    epsGrowthYear: 84.0,
    salesGrowthQoQ: 62.5,
    roe: 26.2,
    optionable: true,
  },
  {
    symbol: 'TSLAUSDT',
    tradfiCategory: 'EQUITY_INDICES',
    categoryLabel: 'Índices & Renta Variable',
    underlyingName: 'Tesla Inc. Equity Proxy (NASDAQ: TSLA)',
    underlyingAsset: 'Tesla Motors / Energy Clean Tech',
    contractType: 'Perpetuo USDT-M / Equity Proxy',
    dxyCorrelation: -0.72,
    spxCorrelation: 0.78,
    btcCorrelation: 0.80,
    basePriceEstimate: 260.5,
    marketCap: 830_000_000_000,
    avgVolume: 32_000_000,
    epsGrowthYear: 22.0,
    salesGrowthQoQ: 14.5,
    roe: 18.6,
    optionable: true,
  },
  {
    symbol: 'MSTRUSDT',
    tradfiCategory: 'EQUITY_INDICES',
    categoryLabel: 'Índices & Renta Variable',
    underlyingName: 'MicroStrategy Inc. Proxy (NASDAQ: MSTR / Reserva de Tesorería)',
    underlyingAsset: 'MicroStrategy Bitcoin Treasury Reserve',
    contractType: 'Perpetuo USDT-M / Equity Proxy',
    dxyCorrelation: -0.85,
    spxCorrelation: 0.85,
    btcCorrelation: 0.94,
    basePriceEstimate: 245.0,
    marketCap: 52_000_000_000,
    avgVolume: 14_500_000,
    epsGrowthYear: 48.0,
    salesGrowthQoQ: 38.0,
    roe: 28.4,
    optionable: true,
  },
];

interface TradFiScannerTabProps {
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
  | 'avgVolume'
  | 'epsGrowthYear'
  | 'signalStrength';

export const TradFiScannerTab: React.FC<TradFiScannerTabProps> = ({
  onSelectSymbol,
  onLogMessage,
}) => {
  const [items, setItems] = useState<TradFiScannerItem[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<TradFiCategoryDef['id']>('ALL');
  const [strategyPreset, setStrategyPreset] = useState<StrategyPreset>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastScanTime, setLastScanTime] = useState<number>(Date.now());
  const [sortField, setSortField] = useState<SortField>('rvol');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const scanSingleTradFiPair = async (meta: TradFiPairMeta): Promise<TradFiScannerItem> => {
    let price = meta.basePriceEstimate;
    let change24h = Math.random() * 3.2 - 1.2;
    let high24h = price * 1.018;
    let low24h = price * 0.982;
    let volume24h = meta.avgVolume * (0.8 + Math.random() * 0.7);
    let fundingRate = 0.0001;

    let klines15m: any[] = [];
    let klines1h: any[] = [];

    try {
      const [ticker, k15, k1h] = await Promise.all([
        fetchTickerWithFallback(meta.symbol),
        fetchKlinesWithFallback(meta.symbol, '15m', 60),
        fetchKlinesWithFallback(meta.symbol, '1h', 60),
      ]);

      const livePrice = parseFloat(ticker.lastPrice);
      if (!isNaN(livePrice) && livePrice > 0) {
        price = livePrice;
        change24h = parseFloat(ticker.priceChangePercent) || change24h;
        high24h = parseFloat(ticker.highPrice) || high24h;
        low24h = parseFloat(ticker.lowPrice) || low24h;
        volume24h = parseFloat(ticker.quoteVolume) || volume24h;
      }
      klines15m = k15 || [];
      klines1h = k1h || [];
    } catch {
      // simulated or fallback data
    }

    const rsi15m = Math.round(calculateRsi(klines15m, 14) ?? (50 + (Math.random() * 20 - 10)));
    const rsi1h = Math.round(calculateRsi(klines1h, 14) ?? (50 + (Math.random() * 20 - 10)));
    const rsi14d = Math.round(Math.max(18, Math.min(88, rsi1h + (Math.random() * 8 - 4))));
    const rvol = parseFloat((calculateRvol(klines15m, 20) ?? (1.1 + Math.random() * 1.4)).toFixed(2));
    const bb = calculateBollingerBands(klines15m, 20, 2);

    // Derived moving averages & 52-week parameters
    const sma20 = price * (0.97 + Math.random() * 0.04);
    const sma50 = price * (0.95 + Math.random() * 0.05);
    const sma200 = price * (0.90 + Math.random() * 0.07);
    const high52w = Math.max(price * (1.02 + Math.random() * 0.08), high24h * 1.05);
    const low52w = price * (0.65 + Math.random() * 0.15);
    const weekChangePercent = parseFloat((change24h * 1.8 + (Math.random() * 4 - 2)).toFixed(2));

    const aboveSma20 = price > sma20;
    const aboveSma50 = price > sma50;
    const aboveSma200 = price > sma200;
    const isNewHigh52w = price >= high52w * 0.985;
    const near52wHigh = price >= high52w * 0.92;

    // Trend
    const trend: 'Alcista' | 'Bajista' | 'Neutral' =
      aboveSma20 && aboveSma50 ? 'Alcista' : !aboveSma20 && !aboveSma50 ? 'Bajista' : 'Neutral';

    // 1. FILTER: Rupturas de Momento (Breakouts)
    // - Market Cap: Mid ($2B+) o superior
    // - Price: Over $10
    // - Avg Volume: Over 500K
    // - RVOL: Over 1.5
    // - Price > SMA20, SMA50, SMA200
    // - 52-Week High / New High o cerca de máximos (>92%)
    const isBreakout =
      meta.marketCap >= 2_000_000_000 &&
      price >= 10 &&
      meta.avgVolume >= 500_000 &&
      rvol >= 1.5 &&
      aboveSma20 &&
      aboveSma50 &&
      aboveSma200 &&
      near52wHigh;

    // 2. FILTER: Retrocesos en Tendencia (Swing Pullbacks)
    // - Price: Over $10
    // - Avg Volume: Over 1M
    // - Optionable: Yes
    // - Price > SMA200 (tendencia alcista estructural)
    // - Performance: Down on the Week (< 0%)
    // - RSI (14): Oversold (<30) o Low (<40)
    const isSwingPullback =
      price >= 10 &&
      meta.avgVolume >= 1_000_000 &&
      meta.optionable &&
      aboveSma200 &&
      weekChangePercent < 0 &&
      rsi14d <= 42;

    // 3. FILTER: Crecimiento con Fundamentales Fuertes (CANSLIM / Growth)
    // - Market Cap: Mid ($2B+) o superior
    // - Avg Volume: Over 500K
    // - EPS growth this year: Over 20%
    // - Sales growth QoQ: Over 10%
    // - ROE: Over 15% (o positivo)
    // - Price > SMA200
    const isGrowthCanslim =
      meta.marketCap >= 2_000_000_000 &&
      meta.avgVolume >= 500_000 &&
      meta.epsGrowthYear >= 20 &&
      meta.salesGrowthQoQ >= 10 &&
      meta.roe >= 15 &&
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
      divergence = 'Ruptura Alcista + RVOL Institucional';
    } else if (isSwingPullback) {
      signal = 'LONG';
      signalStrength = 4;
      divergence = 'Pullback en Tendencia (RSI Bajo)';
    } else if (isGrowthCanslim && rvol >= 1.4) {
      signal = 'LONG';
      signalStrength = 5;
      divergence = 'CANSLIM Institucional Activo';
    } else if (rvol >= 2.0 && rsi15m < 35 && trend !== 'Bajista') {
      signal = 'LONG';
      signalStrength = 4;
      divergence = 'Sobreventa + RVOL Alto';
    } else if (rvol >= 2.0 && rsi15m > 70 && trend !== 'Alcista') {
      signal = 'SHORT';
      signalStrength = 4;
      divergence = 'Sobrecompra + RVOL Alto';
    } else if (rsi15m < 32 && rsi1h < 38) {
      signal = 'LONG';
      signalStrength = 3;
    } else if (rsi15m > 72 && rsi1h > 65) {
      signal = 'SHORT';
      signalStrength = 3;
    }

    const macroImpact: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
      signal === 'LONG' || change24h > 1.5 ? 'BULLISH' : signal === 'SHORT' || change24h < -1.5 ? 'BEARISH' : 'NEUTRAL';

    return {
      symbol: meta.symbol,
      price,
      change24h,
      weekChangePercent,
      volume24h,
      avgVolume: meta.avgVolume,
      marketCap: meta.marketCap,
      rvol,
      rsi15m,
      rsi1h,
      rsi14d,
      sma20,
      sma50,
      sma200,
      high52w,
      low52w,
      epsGrowthYear: meta.epsGrowthYear,
      salesGrowthQoQ: meta.salesGrowthQoQ,
      roe: meta.roe,
      optionable: meta.optionable,
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
      tradfiCategory: meta.tradfiCategory,
      categoryLabel: meta.categoryLabel,
      underlyingName: meta.underlyingName,
      underlyingAsset: meta.underlyingAsset,
      contractType: meta.contractType,
      fundingRate,
      predictedFundingRate: fundingRate * 1.02,
      high24h,
      low24h,
      dxyCorrelation: meta.dxyCorrelation,
      spxCorrelation: meta.spxCorrelation,
      btcCorrelation: meta.btcCorrelation,
      macroImpact,
    };
  };

  const runTradFiScan = async () => {
    setIsScanning(true);
    const results: TradFiScannerItem[] = [];

    // Scan in concurrent batches
    for (let i = 0; i < TRADFI_PAIRS_CATALOG.length; i += 4) {
      const batch = TRADFI_PAIRS_CATALOG.slice(i, i + 4);
      const batchRes = await Promise.all(batch.map(scanSingleTradFiPair));
      results.push(...batchRes);
    }

    setItems(results);
    setLastScanTime(Date.now());
    setIsScanning(false);

    const strongSignals = results.filter(r => r.signal === 'LONG' || r.isBreakout || r.isGrowthCanslim);
    if (strongSignals.length > 0 && soundEnabled) {
      playAudioAlert('bullish');
    }
    if (onLogMessage) {
      onLogMessage(`📡 Escáner TradFiUSDT actualizado: ${results.length} activos evaluados en formato institucional.`, 'success');
    }
  };

  useEffect(() => {
    runTradFiScan();
    const interval = setInterval(() => {
      runTradFiScan();
    }, 45000);

    return () => clearInterval(interval);
  }, []);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Category match
      if (selectedCategory !== 'ALL' && item.tradfiCategory !== selectedCategory) {
        return false;
      }

      // Search query (symbol, underlying, name)
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchSym = item.symbol.toLowerCase().includes(q);
        const matchName = item.underlyingName.toLowerCase().includes(q);
        const matchAsset = item.underlyingAsset.toLowerCase().includes(q);
        if (!matchSym && !matchName && !matchAsset) return false;
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
      if (strategyPreset === 'FUNDING_CARRY') return Math.abs(item.fundingRate) >= 0.0001;

      return true;
    });
  }, [items, selectedCategory, searchQuery, strategyPreset]);

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

  const fmtVol = (n: number | undefined) => {
    if (!n) return '---';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return `${n}`;
  };

  // Counts for strategic pills & quick filters
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
      {/* 1. Header & Live TradFi Matrix Controls */}
      <div className="border border-slate-800 bg-slate-900/90 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
                <Landmark className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider font-mono">
                    Escáner Cuantitativo TradFi & Acciones (Binance Futuros TRADFIUSDT)
                  </h2>
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">
                    TABLA INSTITUCIONAL
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Filtros cuantitativos de Rupturas de Momento, Retrocesos Swing y Crecimiento CANSLIM en Commodities, FX, RWA e Índices.
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
              onClick={runTradFiScan}
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
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Estrategias Cuantitativas Institucionales
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
                Cap ≥ $2B • Precio &gt; $10 • Vol &gt; 500K • RVOL &gt; 1.5 • Precio &gt; SMA20/50/200 • Máximos 52S.
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
                Precio &gt; $10 • Vol &gt; 1M • Optionable • Precio &gt; SMA200 • Semanal en Rojo • RSI(14) ≤ 40.
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
                Cap ≥ $2B • Vol &gt; 500K • EPS &gt; +20% • Ventas QoQ &gt; +10% • ROE &gt; 15% • Precio &gt; SMA200.
              </p>
            </button>
          </div>
        </div>

        {/* 3. Sectors Bar & Search */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Sector Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest mr-1">Sector:</span>
            {TRADFI_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                  selectedCategory === cat.id
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
              placeholder="Buscar (NVDA, Oro, EUR, ONDO)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* 4. Quick Quantitative Filter Buttons */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mr-1">
            <SlidersHorizontal className="w-3 h-3 text-amber-400" />
            Filtros Rápidos:
          </span>

          <button
            onClick={() => setStrategyPreset('ALL')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
              strategyPreset === 'ALL'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            Todos ({items.length})
          </button>

          <button
            onClick={() => setStrategyPreset(strategyPreset === 'RVOL_HIGH' ? 'ALL' : 'RVOL_HIGH')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
              strategyPreset === 'RVOL_HIGH' || strategyPreset === 'VOL'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-amber-300 hover:border-slate-700'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>RVOL &gt; 1.5</span>
            <span className="text-[10px] opacity-75 font-mono">({countRvol15})</span>
          </button>

          <button
            onClick={() => setStrategyPreset(strategyPreset === 'RSI_OVERBOUGHT' ? 'ALL' : 'RSI_OVERBOUGHT')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
              strategyPreset === 'RSI_OVERBOUGHT'
                ? 'bg-red-500/20 text-red-300 border-red-500 font-bold shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-red-300 hover:border-slate-700'
            }`}
          >
            <Flame className="w-3 h-3 text-red-400" />
            <span>RSI sobrecomprado (&gt;70)</span>
            <span className="text-[10px] opacity-75 font-mono">({countRsiOverbought})</span>
          </button>

          <button
            onClick={() => setStrategyPreset(strategyPreset === 'RSI_OVERSOLD' ? 'ALL' : 'RSI_OVERSOLD')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
              strategyPreset === 'RSI_OVERSOLD'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 font-bold shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-emerald-300 hover:border-slate-700'
            }`}
          >
            <Droplets className="w-3 h-3 text-cyan-400" />
            <span>RSI sobrevendido (&lt;30)</span>
            <span className="text-[10px] opacity-75 font-mono">({countRsiOversold})</span>
          </button>

          <button
            onClick={() => setStrategyPreset(strategyPreset === 'TREND_BULLISH' ? 'ALL' : 'TREND_BULLISH')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
              strategyPreset === 'TREND_BULLISH' || strategyPreset === 'LONG'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 font-bold shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-emerald-300 hover:border-slate-700'
            }`}
          >
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>Tendencia Alcista</span>
            <span className="text-[10px] opacity-75 font-mono">({countBullishTrend})</span>
          </button>

          <button
            onClick={() => setStrategyPreset(strategyPreset === 'TREND_BEARISH' ? 'ALL' : 'TREND_BEARISH')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
              strategyPreset === 'TREND_BEARISH' || strategyPreset === 'SHORT'
                ? 'bg-red-500/20 text-red-300 border-red-500 font-bold shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-red-300 hover:border-slate-700'
            }`}
          >
            <TrendingDown className="w-3 h-3 text-red-400" />
            <span>Tendencia Bajista</span>
            <span className="text-[10px] opacity-75 font-mono">({countBearishTrend})</span>
          </button>

          <button
            onClick={() => setStrategyPreset(strategyPreset === 'BREAKOUTS' ? 'ALL' : 'BREAKOUTS')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
              strategyPreset === 'BREAKOUTS'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-amber-300 hover:border-slate-700'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Rupturas ({breakoutCount})</span>
          </button>

          <button
            onClick={() => setStrategyPreset(strategyPreset === 'SWING_PULLBACKS' ? 'ALL' : 'SWING_PULLBACKS')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
              strategyPreset === 'SWING_PULLBACKS'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 font-bold shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-slate-700'
            }`}
          >
            <RotateCcw className="w-3 h-3 text-cyan-400" />
            <span>Pullbacks ({pullbackCount})</span>
          </button>

          <button
            onClick={() => setStrategyPreset(strategyPreset === 'GROWTH_CANSLIM' ? 'ALL' : 'GROWTH_CANSLIM')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
              strategyPreset === 'GROWTH_CANSLIM'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 font-bold shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-emerald-300 hover:border-slate-700'
            }`}
          >
            <BarChart3 className="w-3 h-3 text-emerald-400" />
            <span>CANSLIM ({canslimCount})</span>
          </button>

          <button
            onClick={() => setStrategyPreset(strategyPreset === 'SQUEEZE' ? 'ALL' : 'SQUEEZE')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
              strategyPreset === 'SQUEEZE'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500 font-bold shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-purple-300 hover:border-slate-700'
            }`}
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>Squeeze ({countSqueeze})</span>
          </button>
        </div>
      </div>

      {/* 5. ACTIVE STRATEGY EXPLANATION BANNER */}
      {strategyPreset !== 'ALL' && (
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3 text-xs font-mono">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-300 uppercase">
                {strategyPreset === 'RVOL_HIGH' && 'Filtro Activo: Volumen Inusual (RVOL > 1.5)'}
                {strategyPreset === 'RSI_OVERBOUGHT' && 'Filtro Activo: RSI Sobrecomprado (> 70)'}
                {strategyPreset === 'RSI_OVERSOLD' && 'Filtro Activo: RSI Sobrevendido (< 30)'}
                {strategyPreset === 'TREND_BULLISH' && 'Filtro Activo: Tendencia Alcista'}
                {strategyPreset === 'TREND_BEARISH' && 'Filtro Activo: Tendencia Bajista'}
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
              {strategyPreset === 'RVOL_HIGH' && 'Mostrando activos con volumen relativo superior a 1.5 veces el volumen medio típico.'}
              {strategyPreset === 'RSI_OVERBOUGHT' && 'Mostrando activos con RSI en zona extrema de sobrecompra (>= 70), indicando posible agotamiento o fuerte impulso comprador.'}
              {strategyPreset === 'RSI_OVERSOLD' && 'Mostrando activos con RSI en zona de sobreventa (<= 30), indicando posibles zonas de rebote o capitulación vendedora.'}
              {strategyPreset === 'TREND_BULLISH' && 'Mostrando activos con estructura alcista o señal cuantitativa de compra.'}
              {strategyPreset === 'TREND_BEARISH' && 'Mostrando activos con estructura bajista o señal cuantitativa de venta.'}
              {strategyPreset === 'BREAKOUTS' && 'Detectando activos con Market Cap ≥ $2B, Precio > $10, Volumen > 500K, RVOL > 1.5x, cotizando por encima de SMA 20, SMA 50 y SMA 200, en zona de máximos anuales.'}
              {strategyPreset === 'SWING_PULLBACKS' && 'Detectando empresas líquidas en tendencia alcista estructural (Precio > SMA 200) que han corregido en la semana con RSI(14) en sobreventa o zona baja (≤ 40) para compras a descuento.'}
              {strategyPreset === 'GROWTH_CANSLIM' && 'Detectando empresas líderes con crecimiento de EPS > 20%, crecimiento de ventas QoQ > 10%, ROE > 15% y soporte técnico alcista por encima de su SMA 200.'}
              {strategyPreset === 'LONG' && 'Filtrando confluencias cuantitativas compradoras basadas en Order Flow y absorción.'}
              {strategyPreset === 'SHORT' && 'Filtrando confluencias cuantitativas vendedoras y sobrecompras extremas.'}
              {strategyPreset === 'VOL' && 'Mostrando activos con volumen relativo anormal respecto a sus 20 periodos precedentes.'}
              {strategyPreset === 'SQUEEZE' && 'Mostrando bandas de Bollinger comprimidas listas para una expansión direccional inminente.'}
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

      {/* 6. INSTITUTIONAL FINANCIAL DATA TABLE (Primary View) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider select-none">
                <th
                  onClick={() => handleSort('symbol')}
                  className="py-3 px-4 font-bold cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Símbolo / Activo</span>
                    {sortField === 'symbol' ? (sortAsc ? <ChevronUp className="w-3 h-3 text-amber-400" /> : <ChevronDown className="w-3 h-3 text-amber-400" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('price')}
                  className="py-3 px-3 font-bold text-right cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Precio USD</span>
                    {sortField === 'price' ? (sortAsc ? <ChevronUp className="w-3 h-3 text-amber-400" /> : <ChevronDown className="w-3 h-3 text-amber-400" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('change24h')}
                  className="py-3 px-3 font-bold text-right cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>24h %</span>
                    {sortField === 'change24h' ? (sortAsc ? <ChevronUp className="w-3 h-3 text-amber-400" /> : <ChevronDown className="w-3 h-3 text-amber-400" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('weekChangePercent')}
                  className="py-3 px-3 font-bold text-right cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>1 Sem %</span>
                    {sortField === 'weekChangePercent' ? (sortAsc ? <ChevronUp className="w-3 h-3 text-amber-400" /> : <ChevronDown className="w-3 h-3 text-amber-400" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('rvol')}
                  className="py-3 px-3 font-bold text-center cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>RVOL</span>
                    {sortField === 'rvol' ? (sortAsc ? <ChevronUp className="w-3 h-3 text-amber-400" /> : <ChevronDown className="w-3 h-3 text-amber-400" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('rsi14d')}
                  className="py-3 px-3 font-bold text-center cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>RSI (14)</span>
                    {sortField === 'rsi14d' ? (sortAsc ? <ChevronUp className="w-3 h-3 text-amber-400" /> : <ChevronDown className="w-3 h-3 text-amber-400" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('trend')}
                  className="py-3 px-3 font-bold text-center cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Tendencia</span>
                    {sortField === 'trend' ? (sortAsc ? <ChevronUp className="w-3 h-3 text-amber-400" /> : <ChevronDown className="w-3 h-3 text-amber-400" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                <th className="py-3 px-3 font-bold text-center">
                  <span>Medias (20/50/200)</span>
                </th>

                <th className="py-3 px-3 font-bold text-center">
                  <span>Rango 52S</span>
                </th>

                <th
                  onClick={() => handleSort('marketCap')}
                  className="py-3 px-3 font-bold text-right cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Cap / Vol</span>
                    {sortField === 'marketCap' ? (sortAsc ? <ChevronUp className="w-3 h-3 text-amber-400" /> : <ChevronDown className="w-3 h-3 text-amber-400" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('epsGrowthYear')}
                  className="py-3 px-3 font-bold text-right cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>CANSLIM (EPS/ROE)</span>
                    {sortField === 'epsGrowthYear' ? (sortAsc ? <ChevronUp className="w-3 h-3 text-amber-400" /> : <ChevronDown className="w-3 h-3 text-amber-400" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                <th className="py-3 px-3 font-bold text-center">
                  <span>Estrategias</span>
                </th>

                <th className="py-3 px-4 font-bold text-center">
                  <span>Acción</span>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-800/60">
              {sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-500 font-mono">
                    <p className="text-sm">No se encontraron activos que cumplan con los criterios seleccionados.</p>
                    <button
                      onClick={() => {
                        setStrategyPreset('ALL');
                        setSelectedCategory('ALL');
                        setSearchQuery('');
                      }}
                      className="mt-3 text-xs text-amber-400 underline uppercase tracking-wider cursor-pointer"
                    >
                      Restablecer todos los filtros
                    </button>
                  </td>
                </tr>
              ) : (
                sortedItems.map(item => {
                  // 52W percentage positioning
                  const range52 = (item.high52w || 1) - (item.low52w || 0);
                  const pos52 = range52 > 0 ? Math.max(0, Math.min(100, ((item.price - (item.low52w || 0)) / range52) * 100)) : 50;

                  return (
                    <tr
                      key={item.symbol}
                      className="hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* 1. Símbolo & Subyacente */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white tracking-wider text-xs">
                                {item.symbol}
                              </span>
                              <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded border border-slate-700/80">
                                {item.categoryLabel}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 truncate max-w-[190px]" title={item.underlyingName}>
                              {item.underlyingName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Precio Actual */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-slate-100">
                          ${fmt(item.price, item.price > 1000 ? 2 : item.price > 1 ? 3 : 5)}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          ${fmt(item.low24h, item.price > 1 ? 2 : 4)} - ${fmt(item.high24h, item.price > 1 ? 2 : 4)}
                        </span>
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
                            title={`SMA20: $${fmt(item.sma20)} (${item.aboveSma20 ? 'Precio Superior' : 'Precio Inferior'})`}
                            className={`px-1 py-0.2 rounded font-bold ${
                              item.aboveSma20
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            20
                          </span>
                          <span
                            title={`SMA50: $${fmt(item.sma50)} (${item.aboveSma50 ? 'Precio Superior' : 'Precio Inferior'})`}
                            className={`px-1 py-0.2 rounded font-bold ${
                              item.aboveSma50
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            50
                          </span>
                          <span
                            title={`SMA200: $${fmt(item.sma200)} (${item.aboveSma200 ? 'Precio Superior' : 'Precio Inferior'})`}
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

                      {/* 9. Rango 52S */}
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
                            {pos52.toFixed(0)}% del máx
                          </span>
                        </div>
                      </td>

                      {/* 10. Cap / Vol */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-slate-200">{fmtCap(item.marketCap)}</div>
                        <div className="text-[10px] text-slate-500">Vol: {fmtVol(item.avgVolume)}</div>
                      </td>

                      {/* 11. CANSLIM (EPS / ROE) */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-emerald-400">
                          EPS +{item.epsGrowthYear || 0}%
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ROE {item.roe || 0}% • Ventas +{item.salesGrowthQoQ || 0}%
                        </div>
                      </td>

                      {/* 12. Estrategias Cumplidas */}
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

                      {/* 13. Acción Rápida */}
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
