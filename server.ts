import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const BINANCE_FUTURES_BASE = 'https://fapi.binance.com';
const BINANCE_SPOT_BASE = 'https://api.binance.com';
const RECV_WINDOW = 5000;

// Helper to retrieve API credentials (supports multiple env names: BINANCE_API_KEY, BALAM, etc.)
function getApiCredentials(req?: Request): { apiKey: string; apiSecret: string } {
  // Allow passing keys via request headers for flexibility if user doesn't set env
  const headerKey = req?.headers['x-binance-api-key'] as string;
  const headerSecret = req?.headers['x-binance-api-secret'] as string;

  const apiKey = (headerKey || process.env.BINANCE_API_KEY || process.env.BALAM || '').trim();
  const apiSecret = (headerSecret || process.env.BINANCE_API_SECRET || process.env.COJUMBE || '').trim();

  return { apiKey, apiSecret };
}

// Generate HMAC SHA256 signature
function generateSignature(queryString: string, apiSecret: string): string {
  return crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
}

// Build URL query string sorted
function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  return Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]))}`)
    .join('&');
}

// Signed Request helper for Binance Futures
async function signedFuturesRequest(
  method: string,
  endpoint: string,
  params: Record<string, any> = {},
  credentials: { apiKey: string; apiSecret: string }
) {
  if (!credentials.apiKey || !credentials.apiSecret) {
    throw new Error('Credenciales de Binance no configuradas (BINANCE_API_KEY / BINANCE_API_SECRET)');
  }

  const queryParams = {
    ...params,
    timestamp: Date.now(),
    recvWindow: RECV_WINDOW,
  };

  const queryString = buildQueryString(queryParams);
  const signature = generateSignature(queryString, credentials.apiSecret);
  const url = `${BINANCE_FUTURES_BASE}${endpoint}?${queryString}&signature=${signature}`;

  const response = await fetch(url, {
    method,
    headers: {
      'X-MBX-APIKEY': credentials.apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
  });

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(`Respuesta no JSON de Binance (${response.status}): ${text}`);
  }

  if (!response.ok || (data.code && data.code < 0)) {
    throw new Error(data.msg || `Binance Futures Error (${response.status}): ${text}`);
  }

  return data;
}

// Signed Request helper for Binance Spot
async function signedSpotRequest(
  method: string,
  endpoint: string,
  params: Record<string, any> = {},
  credentials: { apiKey: string; apiSecret: string }
) {
  if (!credentials.apiKey || !credentials.apiSecret) {
    throw new Error('Credenciales de Binance no configuradas');
  }

  const queryParams = {
    ...params,
    timestamp: Date.now(),
    recvWindow: RECV_WINDOW,
  };

  const queryString = buildQueryString(queryParams);
  const signature = generateSignature(queryString, credentials.apiSecret);
  const url = `${BINANCE_SPOT_BASE}${endpoint}?${queryString}&signature=${signature}`;

  const response = await fetch(url, {
    method,
    headers: {
      'X-MBX-APIKEY': credentials.apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
  });

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(`Respuesta no JSON de Binance Spot (${response.status}): ${text}`);
  }

  if (!response.ok) {
    throw new Error(data.msg || `Binance Spot Error (${response.status}): ${text}`);
  }

  return data;
}

// Cached Exchange Info
let cachedExchangeInfo: any = null;
let lastExchangeInfoFetch = 0;

const DEFAULT_POPULAR_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT', 'XRPUSDT',
  'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'TAOUSDT', 'SUIUSDT', 'NEARUSDT',
  'PEPEUSDT', 'SHIBUSDT', 'APTUSDT', 'DOTUSDT', 'LTCUSDT', 'RENDERUSDT',
];

async function getExchangeInfo() {
  const now = Date.now();
  if (cachedExchangeInfo && now - lastExchangeInfoFetch < 1000 * 60 * 30) {
    return cachedExchangeInfo;
  }

  // 1. Try Binance Futures
  try {
    const response = await fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/exchangeInfo`);
    if (response.ok) {
      const data = await response.json();
      cachedExchangeInfo = {
        symbols: (data.symbols || []).map((s: any) => ({
          symbol: s.symbol,
          baseAsset: s.baseAsset,
          quoteAsset: s.quoteAsset,
          status: s.status,
          priceFilter: s.filters?.find((f: any) => f.filterType === 'PRICE_FILTER'),
          lotSizeFilter: s.filters?.find((f: any) => f.filterType === 'LOT_SIZE'),
          minNotional: s.filters?.find((f: any) => f.filterType === 'MIN_NOTIONAL'),
        })),
      };
      lastExchangeInfoFetch = now;
      return cachedExchangeInfo;
    }
  } catch (err) {
    // Continue to fallback
  }

  // 2. Try Binance Vision / Spot Public API
  const spotEndpoints = [
    'https://data-api.binance.vision/api/v3/exchangeInfo',
    'https://api.binance.com/api/v3/exchangeInfo',
  ];

  for (const endpoint of spotEndpoints) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        cachedExchangeInfo = {
          symbols: (data.symbols || [])
            .filter((s: any) => s.symbol.endsWith('USDT'))
            .map((s: any) => ({
              symbol: s.symbol,
              baseAsset: s.baseAsset,
              quoteAsset: s.quoteAsset,
              status: s.status,
              priceFilter: s.filters?.find((f: any) => f.filterType === 'PRICE_FILTER'),
              lotSizeFilter: s.filters?.find((f: any) => f.filterType === 'LOT_SIZE'),
              minNotional: s.filters?.find((f: any) => f.filterType === 'MIN_NOTIONAL' || f.filterType === 'NOTIONAL'),
            })),
        };
        lastExchangeInfoFetch = now;
        return cachedExchangeInfo;
      }
    } catch (err) {
      // Continue
    }
  }

  // 3. Static fallback if all network requests fail
  return {
    symbols: DEFAULT_POPULAR_SYMBOLS.map(sym => ({
      symbol: sym,
      baseAsset: sym.replace('USDT', ''),
      quoteAsset: 'USDT',
      status: 'TRADING',
      priceFilter: { tickSize: '0.01' },
      lotSizeFilter: { minQty: '0.001' },
      minNotional: { notional: '5' },
    })),
  };
}

// Helper precision calculation
function floorToStep(value: number, stepSize: string | number): number {
  const numStep = Number(stepSize);
  if (!Number.isFinite(value) || !Number.isFinite(numStep) || numStep <= 0) return value;
  const decimals = (String(stepSize).split('.')[1] || '').length;
  const rounded = Math.floor((value + 1e-12) / numStep) * numStep;
  return Number(rounded.toFixed(decimals));
}

function formatToStep(value: number, stepSize: string | number): string {
  const decimals = (String(stepSize).split('.')[1] || '').length;
  return floorToStep(value, stepSize).toFixed(decimals);
}

// Resilient Klines fetcher with multi-endpoint fallback
async function fetchKlinesWithFallback(symbol: string, interval: string, limit: number = 300) {
  const endpoints = [
    `${BINANCE_FUTURES_BASE}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
  ];

  for (const url of endpoints) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (e) {
      // try next endpoint
    }
  }

  throw new Error(`No se pudieron obtener velas para ${symbol} (${interval})`);
}

// Resilient Ticker fetcher
async function fetchTickerWithFallback(symbol: string) {
  const endpoints = [
    `${BINANCE_FUTURES_BASE}/fapi/v1/ticker/24hr?symbol=${symbol}`,
    `https://data-api.binance.vision/api/v3/ticker/24hr?symbol=${symbol}`,
    `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
  ];

  for (const url of endpoints) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.lastPrice) {
          return data;
        }
      }
    } catch (e) {
      // try next endpoint
    }
  }

  throw new Error(`No se pudo obtener el ticker 24hr para ${symbol}`);
}

// Helper to format raw klines from Binance API into uniform typed candle objects
function formatRawKlines(data: any[]): Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }> {
  if (!Array.isArray(data)) return [];
  return data
    .filter(x => x !== null && x !== undefined)
    .map((x: any) => {
      if (typeof x === 'object' && !Array.isArray(x) && ('open' in x || 'close' in x)) {
        return {
          time: Number(x.time || x.openTime || 0),
          open: Number(x.open || 0),
          high: Number(x.high || 0),
          low: Number(x.low || 0),
          close: Number(x.close || 0),
          volume: Number(x.volume || 0),
        };
      }
      return {
        time: Number(x[0] || 0),
        open: Number(x[1] || 0),
        high: Number(x[2] || 0),
        low: Number(x[3] || 0),
        close: Number(x[4] || 0),
        volume: Number(x[5] || 0),
      };
    })
    .filter(c => !isNaN(c.close) && c.close > 0 && !isNaN(c.high) && !isNaN(c.low));
}

// Resilient Open Interest fetcher
async function fetchOpenInterestWithFallback(symbol: string) {
  const endpoints = [
    `${BINANCE_FUTURES_BASE}/fapi/v1/openInterest?symbol=${symbol}`,
    `https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`,
  ];
  for (const url of endpoints) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        if (data && (data.openInterest || data.openInterest !== undefined)) {
          return {
            symbol: data.symbol || symbol,
            openInterest: data.openInterest,
            value: parseFloat(data.openInterest) || 0,
            time: Number(data.time) || Date.now(),
          };
        }
      }
    } catch (e) {
      // Ignore restricted location on openInterest
    }
  }
  return { openInterest: '0', value: 0, symbol, time: Date.now() };
}

// ----------------- API ROUTES -----------------

// API Health & Status
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Credentials Status
app.get('/api/binance/status', (req: Request, res: Response) => {
  const { apiKey, apiSecret } = getApiCredentials(req);
  res.json({
    configured: Boolean(apiKey && apiSecret),
    keyMask: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : null,
  });
});

// Available Symbols list
app.get('/api/symbols', async (req: Request, res: Response) => {
  try {
    const info = await getExchangeInfo();
    const active = info.symbols
      .filter((s: any) => s.status === 'TRADING' && s.symbol.endsWith('USDT'))
      .map((s: any) => ({
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
      }));
    res.json(active);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Validate Symbol
app.get('/api/validate-symbol', async (req: Request, res: Response) => {
  try {
    const symbol = String(req.query.symbol || '').trim().toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: 'El parámetro symbol es requerido' });
    }

    const info = await getExchangeInfo();
    const symInfo = info.symbols.find((s: any) => s.symbol === symbol);

    if (!symInfo) {
      return res.json({
        symbol,
        baseAsset: symbol.replace('USDT', ''),
        price: { tickSize: '0.01' },
        quantity: { minQty: '0.001' },
        minNotional: { notional: '5' },
      });
    }

    res.json({
      symbol: symInfo.symbol,
      baseAsset: symInfo.baseAsset,
      price: symInfo.priceFilter || { tickSize: '0.01' },
      quantity: symInfo.lotSizeFilter || { minQty: '0.001' },
      minNotional: symInfo.minNotional || { notional: '5' },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Full Market Data
app.get('/api/market-data', async (req: Request, res: Response) => {
  try {
    const symbol = String(req.query.symbol || 'BTCUSDT').trim().toUpperCase();

    const [ticker, klines1w, klines1d, klines4h, klines1h, klines15m, klines5m, oi] = await Promise.all([
      fetchTickerWithFallback(symbol),
      fetchKlinesWithFallback(symbol, '1w', 52),
      fetchKlinesWithFallback(symbol, '1d', 300),
      fetchKlinesWithFallback(symbol, '4h', 300),
      fetchKlinesWithFallback(symbol, '1h', 300),
      fetchKlinesWithFallback(symbol, '15m', 300),
      fetchKlinesWithFallback(symbol, '5m', 300),
      fetchOpenInterestWithFallback(symbol),
    ]);

    res.json({
      ticker,
      klines1w: formatRawKlines(klines1w),
      candles: {
        '1d': formatRawKlines(klines1d),
        '4h': formatRawKlines(klines4h),
        '1h': formatRawKlines(klines1h),
        '15m': formatRawKlines(klines15m),
        '5m': formatRawKlines(klines5m),
      },
      oi,
    });
  } catch (error: any) {
    console.error('Market data fetch error:', error);
    res.status(500).json({ error: error.message || 'Error cargando datos de mercado' });
  }
});

// Scan Data (5m klines + OI for real-time background scanners)
app.get('/api/scan-data', async (req: Request, res: Response) => {
  try {
    const symbol = String(req.query.symbol || 'BTCUSDT').trim().toUpperCase();
    const [candles5m, oi] = await Promise.all([
      fetchKlinesWithFallback(symbol, '5m', 300),
      fetchOpenInterestWithFallback(symbol),
    ]);

    res.json({ candles5m: formatRawKlines(candles5m), oi });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Open Interest Single Query
app.get('/api/oi-data', async (req: Request, res: Response) => {
  try {
    const symbol = String(req.query.symbol || 'BTCUSDT').trim().toUpperCase();
    const oi = await fetchOpenInterestWithFallback(symbol);
    res.json(oi);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Binance Dashboard (Balances, Positions, Trades, Funding)
app.get('/api/binance/dashboard', async (req: Request, res: Response) => {
  try {
    const symbol = req.query.symbol ? String(req.query.symbol).trim().toUpperCase() : undefined;
    const credentials = getApiCredentials(req);

    if (!credentials.apiKey || !credentials.apiSecret) {
      return res.status(200).json({
        configured: false,
        futuresAcc: { code: -2015, msg: 'API Key y Secret no configuradas. Agrega BINANCE_API_KEY y BINANCE_API_SECRET.' },
        spotAcc: null,
        positions: [],
        balance: { totalWalletBalance: 1000, availableBalance: 1000 },
        funding: [],
        trades: [],
      });
    }

    let futuresAcc: any = null;
    let spotAcc: any = null;
    let positionRisk: any[] = [];
    let funding: any[] = [];
    let trades: any[] = [];

    // Futures Account
    try {
      futuresAcc = await signedFuturesRequest('GET', '/fapi/v2/account', {}, credentials);
    } catch (e: any) {
      futuresAcc = { code: -1, msg: e.message };
    }

    // Real-time Position Risk for exact Mark Price & Liquidation Price
    try {
      positionRisk = await signedFuturesRequest('GET', '/fapi/v2/positionRisk', {}, credentials);
    } catch (e: any) {
      positionRisk = [];
    }

    // Spot Account
    try {
      spotAcc = await signedSpotRequest('GET', '/api/v3/account', {}, credentials);
    } catch (e: any) {
      spotAcc = { code: -1, msg: e.message };
    }

    // Funding Fee History
    try {
      funding = await signedFuturesRequest('GET', '/fapi/v1/income', { incomeType: 'FUNDING_FEE', limit: 20 }, credentials);
    } catch (e: any) {
      funding = [];
    }

    // User Trades
    if (symbol) {
      try {
        trades = await signedFuturesRequest('GET', '/fapi/v1/userTrades', { symbol, limit: 15 }, credentials);
      } catch (e: any) {
        trades = [];
      }
    }

    // Collect all open positions with non-zero positionAmt
    let positions: any[] = [];
    if (Array.isArray(positionRisk) && positionRisk.length > 0) {
      positions = positionRisk.filter((p: any) => Math.abs(parseFloat(p.positionAmt || '0')) > 0);
    } else if (futuresAcc && Array.isArray(futuresAcc.positions)) {
      positions = futuresAcc.positions.filter((p: any) => Math.abs(parseFloat(p.positionAmt || '0')) > 0);
    }

    const walletBal = parseFloat(futuresAcc?.totalWalletBalance || '0');
    const availBal = parseFloat(futuresAcc?.availableBalance || '0');

    res.json({
      configured: true,
      futuresAcc,
      spotAcc,
      positions,
      balance: {
        totalWalletBalance: walletBal > 0 ? walletBal : 1000,
        availableBalance: availBal > 0 ? availBal : 1000,
        totalUnrealizedProfit: parseFloat(futuresAcc?.totalUnrealizedProfit || '0'),
        totalMarginBalance: parseFloat(futuresAcc?.totalMarginBalance || '0'),
      },
      funding: Array.isArray(funding) ? funding : [],
      trades: Array.isArray(trades) ? trades : [],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Execute Live Trade
app.post('/api/binance/trade', async (req: Request, res: Response) => {
  try {
    const credentials = getApiCredentials(req);
    if (!credentials.apiKey || !credentials.apiSecret) {
      return res.status(400).json({
        ok: false,
        status: 'ERROR_CREDENCIALES',
        message: 'No se encontraron las credenciales de API de Binance. Configúralas en las variables de entorno.',
      });
    }

    const { symbol, side, orderType, entry, stopLoss, takeProfit, quantity, leverage, liquidationDanger } = req.body;

    const s = String(symbol || '').trim().toUpperCase();
    const directSide = String(side || '').trim().toUpperCase();

    if (!['LONG', 'SHORT'].includes(directSide)) {
      return res.status(400).json({ ok: false, message: 'La dirección debe ser LONG o SHORT.' });
    }
    if (orderType !== 'LIMIT') {
      return res.status(400).json({ ok: false, message: 'Solo se permiten órdenes LIMIT automatizadas.' });
    }
    if (liquidationDanger === true) {
      return res.status(400).json({ ok: false, message: 'Operación bloqueada por peligro de liquidación por contracorriente.' });
    }

    const lev = Number(leverage) || 1;
    if (lev < 1 || lev > 5) {
      return res.status(400).json({ ok: false, message: 'El apalancamiento debe estar entre 1x y 5x.' });
    }

    const numEntry = Number(entry);
    const numStop = Number(stopLoss);
    const numTp = Number(takeProfit);
    const numQty = Number(quantity);

    if (![numEntry, numStop, numTp, numQty].every(Number.isFinite) || numEntry <= 0 || numStop <= 0 || numTp <= 0 || numQty <= 0) {
      return res.status(400).json({ ok: false, message: 'Todos los precios y la cantidad deben ser números mayores a cero.' });
    }

    if (directSide === 'LONG' && !(numStop < numEntry && numEntry < numTp)) {
      return res.status(400).json({ ok: false, message: 'Estructura LONG inválida: Requiere Stop Loss < Entrada < Take Profit.' });
    }
    if (directSide === 'SHORT' && !(numTp < numEntry && numEntry < numStop)) {
      return res.status(400).json({ ok: false, message: 'Estructura SHORT inválida: Requiere Take Profit < Entrada < Stop Loss.' });
    }

    const risk = Math.abs(numEntry - numStop);
    const reward = Math.abs(numTp - numEntry);
    const rr = risk > 0 ? reward / risk : 0;
    if (rr < 1.99) {
      return res.status(400).json({ ok: false, message: `R:R insuficiente (${rr.toFixed(2)}). Mínimo requerido: 1:2.` });
    }

    const info = await getExchangeInfo();
    const symInfo = info.symbols.find((item: any) => item.symbol === s);
    if (!symInfo || !symInfo.priceFilter || !symInfo.lotSizeFilter) {
      return res.status(400).json({ ok: false, message: `No se pudieron validar los filtros para ${s}.` });
    }

    const tickSize = symInfo.priceFilter.tickSize;
    const stepSize = symInfo.lotSizeFilter.stepSize;

    const formattedEntry = formatToStep(numEntry, tickSize);
    const formattedStop = formatToStep(numStop, tickSize);
    const formattedTp = formatToStep(numTp, tickSize);
    const formattedQty = formatToStep(numQty, stepSize);

    if (Number(formattedQty) < Number(symInfo.lotSizeFilter.minQty)) {
      return res.status(400).json({
        ok: false,
        message: `Cantidad (${formattedQty}) inferior al mínimo permitido (${symInfo.lotSizeFilter.minQty}).`,
      });
    }

    // 1. Set Leverage
    let leverageResult: any = null;
    try {
      leverageResult = await signedFuturesRequest('POST', '/fapi/v1/leverage', {
        symbol: s,
        leverage: lev,
      }, credentials);
    } catch (levErr: any) {
      console.warn('Leverage update warning:', levErr.message);
    }

    const entrySide = directSide === 'LONG' ? 'BUY' : 'SELL';
    const exitSide = directSide === 'LONG' ? 'SELL' : 'BUY';

    // 2. Limit Entry Order
    const entryOrder = await signedFuturesRequest('POST', '/fapi/v1/order', {
      symbol: s,
      side: entrySide,
      type: 'LIMIT',
      timeInForce: 'GTC',
      quantity: formattedQty,
      price: formattedEntry,
      newOrderRespType: 'RESULT',
    }, credentials);

    let stopOrder: any = null;
    let takeProfitOrder: any = null;
    const protectionErrors: string[] = [];

    // 3. Stop Loss Order
    try {
      stopOrder = await signedFuturesRequest('POST', '/fapi/v1/order', {
        symbol: s,
        side: exitSide,
        type: 'STOP_MARKET',
        stopPrice: formattedStop,
        closePosition: 'true',
        workingType: 'MARK_PRICE',
      }, credentials);
    } catch (err: any) {
      protectionErrors.push(`SL Fallido: ${err.message}`);
    }

    // 4. Take Profit Order
    try {
      takeProfitOrder = await signedFuturesRequest('POST', '/fapi/v1/order', {
        symbol: s,
        side: exitSide,
        type: 'TAKE_PROFIT_MARKET',
        stopPrice: formattedTp,
        closePosition: 'true',
        workingType: 'MARK_PRICE',
      }, credentials);
    } catch (err: any) {
      protectionErrors.push(`TP Fallido: ${err.message}`);
    }

    if (protectionErrors.length > 0) {
      return res.json({
        ok: false,
        status: 'ADVERTENCIA_PARCIAL',
        message: `Orden LIMIT enviada (${entryOrder.orderId}), pero hubo un problema en protecciones: ${protectionErrors.join(' | ')}`,
        entryOrder,
        stopOrder,
        takeProfitOrder,
        protectionErrors,
      });
    }

    res.json({
      ok: true,
      status: 'ÓRDENES ENVIADAS CON ÉXITO',
      message: `Entrada LIMIT (${formattedEntry}) y protecciones (SL: ${formattedStop} / TP: ${formattedTp}) registradas en Binance Futures LIVE.`,
      trade: {
        symbol: s,
        side: directSide,
        entry: formattedEntry,
        stopLoss: formattedStop,
        takeProfit: formattedTp,
        quantity: formattedQty,
        leverage: lev,
        rr: Number(rr.toFixed(2)),
      },
      leverage: leverageResult,
      entryOrder,
      stopOrder,
      takeProfitOrder,
      executedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Trade Execution Error:', error);
    res.status(500).json({ ok: false, message: error.message || 'Error ejecutando orden en Binance' });
  }
});

// TradFi & Macro Cross-Asset Overview
app.get('/api/tradfi/overview', async (req: Request, res: Response) => {
  try {
    // Attempt live gold / commodities ticker from Binance
    let goldPrice = 2748.60;
    let goldChange = 0.92;
    let ondoPrice = 0.865;
    let ondoChange = 4.80;

    try {
      const [paxgTicker, ondoTicker] = await Promise.all([
        fetchTickerWithFallback('PAXGUSDT').catch(() => null),
        fetchTickerWithFallback('ONDOUSDT').catch(() => null),
      ]);

      if (paxgTicker && paxgTicker.lastPrice) {
        goldPrice = parseFloat(paxgTicker.lastPrice);
        goldChange = parseFloat(paxgTicker.priceChangePercent);
      }
      if (ondoTicker && ondoTicker.lastPrice) {
        ondoPrice = parseFloat(ondoTicker.lastPrice);
        ondoChange = parseFloat(ondoTicker.priceChangePercent);
      }
    } catch (e) {
      // ignore
    }

    const assets = [
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
        price: goldPrice,
        change24h: goldChange,
        change7d: 2.10,
        high24h: goldPrice * 1.008,
        low24h: goldPrice * 0.992,
        unit: '$',
        btcCorrelation: 0.58,
        impactOnCrypto: 'BULLISH',
        sparkline: [2690, 2705, 2720, 2715, 2735, 2742, goldPrice],
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
        price: ondoPrice,
        change24h: ondoChange,
        change7d: 12.40,
        high24h: ondoPrice * 1.05,
        low24h: ondoPrice * 0.95,
        unit: '$',
        btcCorrelation: 0.72,
        impactOnCrypto: 'BULLISH',
        sparkline: [0.78, 0.80, 0.82, 0.81, 0.84, 0.855, ondoPrice],
        description: 'Líder en tokenización de bonos del tesoro de EE.UU. (RWA) cotizado en Binance Futures.',
        lastUpdated: Date.now(),
      },
    ];

    res.json({
      status: 'ok',
      assets,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Vite middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
