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

// 1. Microstructure & Order Flow Types
export interface LiquidationLevel {
  leverage: number; // 10, 25, 50, 100
  side: 'LONG' | 'SHORT';
  estimatedPrice: number;
  distancePercent: number;
  liquidityDensity: 'Alta' | 'Media' | 'Crítica';
  intensity: number; // 0 to 100 for heatmap
}

export interface CvdDataPoint {
  time: number;
  price: number;
  buyVolume: number;
  sellVolume: number;
  delta: number;
  cvd: number;
}

export interface OrderFlowAnalysis {
  cvdDivergence: 'Alcista (Absorción Compradora)' | 'Bajista (Absorción Vendedora)' | 'Neutral / Sincronizado';
  takerBuyRatio: number; // e.g. 0.55 -> 55% buy volume
  aggressiveSide: 'BUYERS' | 'SELLERS' | 'BALANCED';
  liquidationMagnetLong: number | null;
  liquidationMagnetShort: number | null;
  liquidationLevels: LiquidationLevel[];
  cvdHistory: CvdDataPoint[];
  fundingRate: {
    rate: number;
    predictedRate: number;
    nextFundingTime: number; // timestamp
    countdownText: string;
    sentiment: 'Altamente Alcista (Longs pagan)' | 'Altamente Bajista (Shorts pagan)' | 'Neutral / Equilibrado';
  };
}

// 2. Risk Automation & Position Calculator Types
export interface RiskCalculatorConfig {
  accountBalance: number;
  riskPercent: number; // e.g. 1%
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  direction: 'LONG' | 'SHORT';
  leverage: number;
}

export interface RiskCalculatorResult {
  riskAmountUsdt: number;
  positionSizeCoins: number;
  positionValueUsdt: number;
  requiredMarginUsdt: number;
  potentialProfitUsdt: number;
  potentialLossUsdt: number;
  riskRewardRatio: number;
  liquidationPriceEstimated: number;
  isSafeMargin: boolean;
}

// 3. Multi-Pair Market Scanner Types
export interface ScannerItem {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  rvol: number;
  rsi15m: number;
  rsi1h: number;
  trend: 'Alcista' | 'Bajista' | 'Neutral';
  signal: 'LONG' | 'SHORT' | 'SQUEEZE' | 'VOL_SPIKE' | 'NEUTRAL';
  signalStrength: number; // 1 to 5
  divergence: string | null;
  bollingerSqueeze: boolean;
  lastUpdated: number;
}

export interface TradFiScannerItem extends ScannerItem {
  tradfiCategory: 'COMMODITIES' | 'FOREX' | 'RWA_TREASURIES' | 'EQUITY_INDICES';
  categoryLabel: string;
  underlyingName: string;
  underlyingAsset: string;
  contractType: string;
  fundingRate: number;
  predictedFundingRate?: number;
  high24h: number;
  low24h: number;
  dxyCorrelation: number;
  spxCorrelation: number;
  btcCorrelation: number;
  macroImpact: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

// 4. Trading Journal & Performance Types
export interface JournalEntry {
  id: string;
  timestamp: number;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  takeProfit: number;
  quantity: number;
  leverage: number;
  status: 'OPEN' | 'CLOSED_WIN' | 'CLOSED_LOSS' | 'CANCELLED';
  pnlUsdt?: number;
  pnlPercent?: number;
  strategyName: string;
  notes?: string;
  tags?: string[];
}

export interface JournalStats {
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  winRate: number;
  totalPnl: number;
  profitFactor: number;
  averageRr: number;
  bestTrade: number;
  worstTrade: number;
  consecutiveWins: number;
}

// 5. TradFi & Macro Monitoring Types
export interface TradFiAsset {
  id: string;
  symbol: string;
  name: string;
  category: 'CURRENCY' | 'EQUITIES' | 'COMMODITIES' | 'RATES' | 'CRYPTO_MACRO';
  price: number;
  change24h: number;
  change7d?: number;
  high24h: number;
  low24h: number;
  unit: string;
  btcCorrelation: number; // -1.0 to 1.0
  impactOnCrypto: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sparkline: number[];
  description: string;
  lastUpdated: number;
}

export interface MacroRegime {
  regime: 'RISK_ON' | 'RISK_OFF' | 'STAGFLATION' | 'LIQUIDITY_EXPANSION' | 'NEUTRAL';
  title: string;
  biasForCrypto: 'FUERTE ALCISTA' | 'ALCISTA' | 'NEUTRAL' | 'BAJISTA' | 'FUERTE BAJISTA';
  confidence: number; // 0 to 100%
  summary: string;
  keyCatalysts: string[];
  dxyTrend: string;
  spxTrend: string;
  ratesTrend: string;
  goldTrend: string;
}

export interface CorrelationMatrixData {
  cryptoSymbols: string[];
  tradFiSymbols: { id: string; label: string; name: string }[];
  matrix: Record<string, Record<string, number>>;
  timeframe: string;
}

export interface MarketSession {
  name: string;
  city: string;
  flag: string;
  isOpen: boolean;
  openUtcHour: number;
  closeUtcHour: number;
  statusText: string;
}

export interface TradFiDashboardData {
  assets: TradFiAsset[];
  macroRegime: MacroRegime;
  correlationMatrix: CorrelationMatrixData;
  sessions: MarketSession[];
  lastUpdated: number;
  comparativeHistory: {
    time: number;
    date: string;
    btcNormalized: number;
    spxNormalized: number;
    goldNormalized: number;
    dxyNormalized: number;
  }[];
}

