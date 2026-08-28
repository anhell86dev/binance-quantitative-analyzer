export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TimeframeConfig {
  id: '1d' | '4h' | '1h' | '15m' | '5m';
  label: string;
  role: string;
  interval: string;
}

export interface IndicatorRow {
  tf: string;
  role: string;
  trend: 'Alcista' | 'Bajista' | 'Neutral' | '---';
  ema9: number | null;
  ema21: number | null;
  ema50: number | null;
  ema200: number | null;
  rsi: number | null;
  macd: number | null;
  volume: number | null;
  vol24h: number | null;
  rvol: number | null;
}

export interface PivotLevels {
  r1: number | null;
  r2: number | null;
  r3: number | null;
  s1: number | null;
  s2: number | null;
  s3: number | null;
}

export interface MarketStructurePoint {
  index: number;
  time: number;
  price: number;
  type: 'high' | 'low';
  label: 'HH' | 'HL' | 'LH' | 'LL';
  direction: 'bull' | 'bear';
  reversal: boolean;
}

export interface TradeStrategy {
  symbol: string;
  type: 'LONG' | 'SHORT';
  entry: number;
  stop: number;
  target: number;
  goal: number;
  score: number;
  rr: number;
  reason: string;
}

export interface TickerData {
  symbol: string;
  lastPrice: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
}

export interface OpenInterestItem {
  value: number;
  time: number;
}

export interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

export interface BinancePosition {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unrealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  initialMargin: string;
  marginType: string;
}

export interface BinanceAsset {
  asset: string;
  walletBalance: string;
  availableBalance: string;
}

export interface SpotBalance {
  asset: string;
  free: string;
  locked: string;
}

export interface BinanceTradeItem {
  id: number;
  time: number;
  symbol: string;
  side: string;
  price: string;
  qty: string;
  commission: string;
  commissionAsset: string;
  realizedPnl: string;
}

export interface BinanceFundingItem {
  time: number;
  symbol: string;
  asset: string;
  income: string;
  incomeType: string;
}

export interface BinanceDashboardData {
  configured: boolean;
  futuresAcc?: {
    totalWalletBalance: string;
    totalUnrealizedProfit: string;
    totalMarginBalance: string;
    availableBalance: string;
    totalMaintMargin: string;
    positions: BinancePosition[];
    assets: BinanceAsset[];
    code?: number;
    msg?: string;
  };
  spotAcc?: {
    balances: SpotBalance[];
    code?: number;
    msg?: string;
  };
  funding: BinanceFundingItem[];
  trades: BinanceTradeItem[];
}
