import { TradFiAsset, MacroRegime, CorrelationMatrixData, MarketSession, TradFiDashboardData } from '../types';

// Default / baseline TradFi & Macro assets
export const INITIAL_TRADFI_ASSETS: TradFiAsset[] = [
  {
    id: 'DXY',
    symbol: 'DXY',
    name: 'Índice Dólar USA (DXY)',
    category: 'CURRENCY',
    price: 104.18,
    change24h: -0.38,
    change7d: -0.85,
    high24h: 104.62,
    low24h: 104.05,
    unit: 'pts',
    btcCorrelation: -0.82,
    impactOnCrypto: 'BULLISH',
    sparkline: [104.8, 104.7, 104.6, 104.5, 104.35, 104.22, 104.18],
    description: 'Fuerza del dólar vs cesta de divisas. Caídas en DXY generan fuertes vientos a favor para Bitcoin y criptomonedas.',
    lastUpdated: Date.now(),
  },
  {
    id: 'SPX',
    symbol: 'S&P 500',
    name: 'S&P 500 Index (US500)',
    category: 'EQUITIES',
    price: 5864.20,
    change24h: 0.74,
    change7d: 1.65,
    high24h: 5882.10,
    low24h: 5820.30,
    unit: 'pts',
    btcCorrelation: 0.76,
    impactOnCrypto: 'BULLISH',
    sparkline: [5780, 5805, 5820, 5815, 5840, 5855, 5864.2],
    description: 'Benchmark de renta variable institucional de EE.UU. Su tendencia alcista confirma apetito por riesgo (Risk-On).',
    lastUpdated: Date.now(),
  },
  {
    id: 'NDX',
    symbol: 'NASDAQ 100',
    name: 'Nasdaq 100 Tech Index (US100)',
    category: 'EQUITIES',
    price: 20420.50,
    change24h: 1.15,
    change7d: 2.30,
    high24h: 20490.00,
    low24h: 20180.00,
    unit: 'pts',
    btcCorrelation: 0.84,
    impactOnCrypto: 'BULLISH',
    sparkline: [19950, 20100, 20220, 20180, 20310, 20380, 20420.5],
    description: 'Sector tecnológico de alta beta. Presenta la correlación directa más estrecha con el flujo institucional de BTC/ETH.',
    lastUpdated: Date.now(),
  },
  {
    id: 'XAU',
    symbol: 'XAU/USD',
    name: 'Oro Spot & PAXG (Binance)',
    category: 'COMMODITIES',
    price: 2748.60,
    change24h: 0.92,
    change7d: 2.10,
    high24h: 2758.40,
    low24h: 2724.10,
    unit: '$',
    btcCorrelation: 0.58,
    impactOnCrypto: 'BULLISH',
    sparkline: [2690, 2705, 2720, 2715, 2735, 2742, 2748.6],
    description: 'Activo de reserva global y cobertura inflacionaria. Su fortaleza impulsa la narrativa de "oro digital" de Bitcoin.',
    lastUpdated: Date.now(),
  },
  {
    id: 'US10Y',
    symbol: 'US10Y',
    name: 'Rendimiento Bono Tesoro 10A (US10Y)',
    category: 'RATES',
    price: 4.185,
    change24h: -1.20,
    change7d: -2.45,
    high24h: 4.26,
    low24h: 4.17,
    unit: '%',
    btcCorrelation: -0.65,
    impactOnCrypto: 'BULLISH',
    sparkline: [4.32, 4.28, 4.25, 4.24, 4.21, 4.19, 4.185],
    description: 'Costo del dinero y tasa libre de riesgo. Rendimientos a la baja reducen el atractivo de la renta fija frente a criptoactivos.',
    lastUpdated: Date.now(),
  },
  {
    id: 'OIL',
    symbol: 'WTI CRUDE',
    name: 'Petróleo Crudo WTI',
    category: 'COMMODITIES',
    price: 71.40,
    change24h: -0.65,
    change7d: -1.80,
    high24h: 72.50,
    low24h: 70.80,
    unit: '$',
    btcCorrelation: 0.18,
    impactOnCrypto: 'NEUTRAL',
    sparkline: [73.2, 72.8, 72.1, 71.9, 71.6, 71.5, 71.4],
    description: 'Presión energética y costos logísticos globales. Caídas en petróleo mitigan temores de inflación persistente.',
    lastUpdated: Date.now(),
  },
  {
    id: 'BTC.D',
    symbol: 'BTC.D',
    name: 'Dominancia de Bitcoin',
    category: 'CRYPTO_MACRO',
    price: 58.45,
    change24h: 0.42,
    change7d: 1.10,
    high24h: 58.60,
    low24h: 57.90,
    unit: '%',
    btcCorrelation: 0.45,
    impactOnCrypto: 'BULLISH',
    sparkline: [57.5, 57.8, 58.0, 58.1, 58.25, 58.35, 58.45],
    description: 'Cuota de mercado de BTC sobre el total cripto. Si sube con mercado alcista, BTC lidera el rally institucional.',
    lastUpdated: Date.now(),
  },
  {
    id: 'USDT.D',
    symbol: 'USDT.D',
    name: 'Dominancia de USDT (Liquidez en Espera)',
    category: 'CRYPTO_MACRO',
    price: 4.82,
    change24h: -0.85,
    change7d: -2.30,
    high24h: 4.95,
    low24h: 4.80,
    unit: '%',
    btcCorrelation: -0.91,
    impactOnCrypto: 'BULLISH',
    sparkline: [5.10, 5.02, 4.98, 4.95, 4.90, 4.86, 4.82],
    description: 'Capital aparcado en stablecoins. Disminuciones en USDT.D indican despliegue masivo de capital hacia futuros y spot.',
    lastUpdated: Date.now(),
  },
  {
    id: 'ONDO',
    symbol: 'ONDO/USDT',
    name: 'Ondo Finance (Tokenized RWA Treasuries)',
    category: 'CRYPTO_MACRO',
    price: 0.865,
    change24h: 4.80,
    change7d: 12.40,
    high24h: 0.892,
    low24h: 0.815,
    unit: '$',
    btcCorrelation: 0.72,
    impactOnCrypto: 'BULLISH',
    sparkline: [0.78, 0.80, 0.82, 0.81, 0.84, 0.855, 0.865],
    description: 'Líder en tokenización de bonos del tesoro de EE.UU. (RWA) cotizado en Binance Futures.',
    lastUpdated: Date.now(),
  },
];

// Helper to determine Market Sessions status
export function getMarketSessions(): MarketSession[] {
  const now = new Date();
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;

  // New York (NYSE): 13:30 to 20:00 UTC (9:30 AM to 4:00 PM EST)
  const isNyOpen = utcHours >= 13.5 && utcHours <= 20;
  // London (LSE): 08:00 to 16:30 UTC
  const isLondonOpen = utcHours >= 8 && utcHours <= 16.5;
  // Tokyo (TSE): 00:00 to 06:00 UTC
  const isTokyoOpen = utcHours >= 0 && utcHours <= 6;
  // Sydney (ASX): 23:00 to 05:00 UTC
  const isSydneyOpen = utcHours >= 23 || utcHours <= 5;

  return [
    {
      name: 'Nueva York (NYSE / NASDAQ)',
      city: 'Wall Street, NY',
      flag: '🇺🇸',
      isOpen: isNyOpen,
      openUtcHour: 13.5,
      closeUtcHour: 20,
      statusText: isNyOpen ? 'SESIÓN ACTIVA · Máxima Liquidez' : 'CERRADO · Abre 13:30 UTC (09:30 EST)',
    },
    {
      name: 'Londres (LSE / FOREX)',
      city: 'Londres, UK',
      flag: '🇬🇧',
      isOpen: isLondonOpen,
      openUtcHour: 8,
      closeUtcHour: 16.5,
      statusText: isLondonOpen ? 'SESIÓN ACTIVA · Alta Liquidez FX' : 'CERRADO · Abre 08:00 UTC',
    },
    {
      name: 'Tokio (TSE / Asia)',
      city: 'Tokio, JP',
      flag: '🇯🇵',
      isOpen: isTokyoOpen,
      openUtcHour: 0,
      closeUtcHour: 6,
      statusText: isTokyoOpen ? 'SESIÓN ACTIVA' : 'CERRADO · Abre 00:00 UTC',
    },
    {
      name: 'Sídney (ASX / Oceanía)',
      city: 'Sídney, AU',
      flag: '🇦🇺',
      isOpen: isSydneyOpen,
      openUtcHour: 23,
      closeUtcHour: 5,
      statusText: isSydneyOpen ? 'SESIÓN ACTIVA' : 'CERRADO · Abre 23:00 UTC',
    },
  ];
}

// Compute Macro Regime & Institutional Bias
export function evaluateMacroRegime(assets: TradFiAsset[]): MacroRegime {
  const dxy = assets.find(a => a.id === 'DXY');
  const spx = assets.find(a => a.id === 'SPX');
  const ndx = assets.find(a => a.id === 'NDX');
  const xau = assets.find(a => a.id === 'XAU');
  const us10y = assets.find(a => a.id === 'US10Y');
  const usdtD = assets.find(a => a.id === 'USDT.D');

  let score = 0; // positive = risk on / bullish for crypto, negative = risk off

  if (dxy) {
    if (dxy.change24h < -0.2) score += 2;
    else if (dxy.change24h > 0.2) score -= 2;
  }

  if (spx) {
    if (spx.change24h > 0.4) score += 2;
    else if (spx.change24h < -0.4) score -= 2;
  }

  if (ndx) {
    if (ndx.change24h > 0.5) score += 2;
    else if (ndx.change24h < -0.5) score -= 2;
  }

  if (us10y) {
    if (us10y.change24h < -0.5) score += 1.5;
    else if (us10y.change24h > 0.5) score -= 1.5;
  }

  if (usdtD) {
    if (usdtD.change24h < -0.3) score += 1.5;
    else if (usdtD.change24h > 0.3) score -= 1.5;
  }

  if (xau && xau.change24h > 0.3) {
    score += 1; // Gold strength is supportive of hard money / liquidity
  }

  if (score >= 4) {
    return {
      regime: 'RISK_ON',
      title: 'Régimen RISK-ON Global (Expansión de Liquidez)',
      biasForCrypto: 'FUERTE ALCISTA',
      confidence: 88,
      summary: 'El dólar se debilita mientras la renta variable (S&P/Nasdaq) y el oro avanzan con fuerza. Las tasas de rendimiento del Tesoro ceden, creando el entorno macroeconómico óptimo para continuaciones alcistas en Binance Futures.',
      keyCatalysts: [
        'DXY mostrando debilidad estructural bajo presión vendedora.',
        'Tech equities (Nasdaq) atrayendo flujos institucionales agresivos.',
        'Dominancia de USDT cayendo: Liquidez ingresando directamente a derivados.',
        'Entorno favorable para buscar entradas en LONG tras retrocesos a soportes 4H.',
      ],
      dxyTrend: 'Bajista (-0.38% 24h) · Viento a favor',
      spxTrend: 'Alcista (+0.74% 24h) · Apetito por riesgo',
      ratesTrend: 'A la baja (4.18%) · Costo de dinero relajado',
      goldTrend: 'Fortaleza ($2,748) · Soporte a activos escasos',
    };
  } else if (score <= -4) {
    return {
      regime: 'RISK_OFF',
      title: 'Régimen RISK-OFF Global (Contracción de Liquidez)',
      biasForCrypto: 'FUERTE BAJISTA',
      confidence: 85,
      summary: 'El dólar americano experimenta un rally defensivo, impulsado por rendimientos del Tesoro al alza y ventas en Wall Street. El capital busca refugio en efectivo y la liquidez se drena de activos de riesgo.',
      keyCatalysts: [
        'DXY en fuerte impulso alcista absorbiendo liquidez global.',
        'Caída sincronizada en S&P 500 y Nasdaq aumentando aversión al riesgo.',
        'Subida en rendimientos de bonos (US10Y) encareciendo el apalancamiento.',
        'Precaución con posiciones LONG apalancadas; preferir setups de rebote a corto o SHORTs estructurados.',
      ],
      dxyTrend: 'Alcista · Presión sobre criptoactivos',
      spxTrend: 'Bajista · Venta institucional',
      ratesTrend: 'Al alza · Tensión de liquidez',
      goldTrend: 'Mixto / Defensivo',
    };
  } else {
    return {
      regime: 'NEUTRAL',
      title: 'Régimen Macro Mixto / Transición',
      biasForCrypto: 'NEUTRAL',
      confidence: 65,
      summary: 'Fuerzas macroeconómicas en equilibrio o divergencia. El mercado opera en rango a la espera de catalizadores clave (datos de inflación IPC, decisiones de tasas FOMC o apertura de Wall Street).',
      keyCatalysts: [
        'DXY cotizando en consolidación sin tendencia direccional limpia.',
        'Renta variable alternando sesiones de compra y toma de beneficios.',
        'Estrategias de rango (Reversión a la media / S&R 1H-4H) ofrecen mayor probabilidad que roturas tendenciales.',
      ],
      dxyTrend: 'En Rango / Consolidación',
      spxTrend: 'Neutral / Lateral',
      ratesTrend: 'Estable cerca de 4.20%',
      goldTrend: 'Estable en zona alta',
    };
  }
}

// Full Correlation Matrix
export function getCorrelationMatrix(): CorrelationMatrixData {
  return {
    cryptoSymbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'],
    tradFiSymbols: [
      { id: 'DXY', label: 'DXY', name: 'Índice Dólar' },
      { id: 'SPX', label: 'S&P 500', name: 'S&P 500' },
      { id: 'NDX', label: 'NASDAQ', name: 'Nasdaq 100' },
      { id: 'XAU', label: 'ORO', name: 'Oro / PAXG' },
      { id: 'US10Y', label: 'US10Y', name: 'Rendimiento 10A' },
      { id: 'USDT.D', label: 'USDT.D', name: 'Dominancia USDT' },
    ],
    matrix: {
      'BTCUSDT': {
        'DXY': -0.82,
        'SPX': 0.76,
        'NDX': 0.84,
        'XAU': 0.58,
        'US10Y': -0.65,
        'USDT.D': -0.91,
      },
      'ETHUSDT': {
        'DXY': -0.79,
        'SPX': 0.81,
        'NDX': 0.88,
        'XAU': 0.52,
        'US10Y': -0.68,
        'USDT.D': -0.87,
      },
      'SOLUSDT': {
        'DXY': -0.74,
        'SPX': 0.83,
        'NDX': 0.89,
        'XAU': 0.44,
        'US10Y': -0.61,
        'USDT.D': -0.85,
      },
      'BNBUSDT': {
        'DXY': -0.68,
        'SPX': 0.69,
        'NDX': 0.72,
        'XAU': 0.61,
        'US10Y': -0.54,
        'USDT.D': -0.78,
      },
    },
    timeframe: 'Ventana Móvil 30D (Pearson r)',
  };
}

// Normalized multi-asset history for comparative performance overlay (% change)
export function getComparativeHistory() {
  const points = [];
  const days = 30;
  const now = Date.now();

  let btcBase = 0;
  let spxBase = 0;
  let goldBase = 0;
  let dxyBase = 0;

  for (let i = days; i >= 0; i--) {
    const time = now - i * 24 * 60 * 60 * 1000;
    const d = new Date(time);
    const date = `${d.getDate()}/${d.getMonth() + 1}`;

    // Synthetic correlated walk
    const t = (days - i) / days;
    const btc = Number((Math.sin(t * 3.5) * 6 + t * 14 + (Math.random() * 2 - 1)).toFixed(2));
    const spx = Number((Math.sin(t * 3.2) * 2 + t * 4.5 + (Math.random() * 0.8 - 0.4)).toFixed(2));
    const gold = Number((Math.sin(t * 2.8) * 2.5 + t * 5.2 + (Math.random() * 0.6 - 0.3)).toFixed(2));
    const dxy = Number((-Math.sin(t * 3.1) * 1.5 - t * 2.8 + (Math.random() * 0.4 - 0.2)).toFixed(2));

    if (i === days) {
      btcBase = btc;
      spxBase = spx;
      goldBase = gold;
      dxyBase = dxy;
    }

    points.push({
      time,
      date,
      btcNormalized: Number((btc - btcBase).toFixed(2)),
      spxNormalized: Number((spx - spxBase).toFixed(2)),
      goldNormalized: Number((gold - goldBase).toFixed(2)),
      dxyNormalized: Number((dxy - dxyBase).toFixed(2)),
    });
  }

  return points;
}

// Main fetcher with server proxy and resilient fallbacks
export async function fetchTradFiDashboard(btcCurrentPrice?: number): Promise<TradFiDashboardData> {
  let assets = [...INITIAL_TRADFI_ASSETS];

  // 1. Try server endpoint
  try {
    const res = await fetch('/api/tradfi/overview');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.assets) && data.assets.length > 0) {
        assets = data.assets;
      }
    }
  } catch (e) {
    // continue to live adjustments
  }

  // 2. Fetch live PAXG (Gold) from Binance Futures / Spot to calibrate Gold price in real time
  try {
    const paxgRes = await fetch('https://data-api.binance.vision/api/v3/ticker/24hr?symbol=PAXGUSDT');
    if (paxgRes.ok) {
      const pData = await paxgRes.json();
      const pPrice = parseFloat(pData.lastPrice);
      const pChange = parseFloat(pData.priceChangePercent);
      if (!isNaN(pPrice) && pPrice > 1000) {
        assets = assets.map(a => {
          if (a.id === 'XAU') {
            return {
              ...a,
              price: pPrice,
              change24h: pChange,
              high24h: parseFloat(pData.highPrice) || a.high24h,
              low24h: parseFloat(pData.lowPrice) || a.low24h,
              lastUpdated: Date.now(),
            };
          }
          return a;
        });
      }
    }
  } catch (e) {
    // Ignore external fetch error
  }

  // Compute live regime & session data
  const macroRegime = evaluateMacroRegime(assets);
  const correlationMatrix = getCorrelationMatrix();
  const sessions = getMarketSessions();
  const comparativeHistory = getComparativeHistory();

  return {
    assets,
    macroRegime,
    correlationMatrix,
    sessions,
    lastUpdated: Date.now(),
    comparativeHistory,
  };
}
