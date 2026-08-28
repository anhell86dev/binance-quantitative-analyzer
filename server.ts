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

async function getExchangeInfo() {
  const now = Date.now();
  if (cachedExchangeInfo && now - lastExchangeInfoFetch < 1000 * 60 * 30) {
    return cachedExchangeInfo;
  }

  const response = await fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/exchangeInfo`);
  if (!response.ok) {
    throw new Error(`Error obteniendo exchangeInfo (${response.status})`);
  }
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
      return res.status(404).json({ error: `El símbolo ${symbol} no existe en Binance Futures` });
    }

    if (symInfo.status !== 'TRADING') {
      return res.status(400).json({ error: `${symbol} no está en estado TRADING (${symInfo.status})` });
    }

    res.json({
      symbol: symInfo.symbol,
      baseAsset: symInfo.baseAsset,
      price: symInfo.priceFilter,
      quantity: symInfo.lotSizeFilter,
      minNotional: symInfo.minNotional,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Full Market Data
app.get('/api/market-data', async (req: Request, res: Response) => {
  try {
    const symbol = String(req.query.symbol || 'BTCUSDT').trim().toUpperCase();

    const fetchJson = async (url: string) => {
      const resp = await fetch(url);
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Binance API error on ${url}: ${text}`);
      }
      return resp.json();
    };

    const [ticker, klines1w, klines1d, klines4h, klines1h, klines15m, klines5m, oi] = await Promise.all([
      fetchJson(`${BINANCE_FUTURES_BASE}/fapi/v1/ticker/24hr?symbol=${symbol}`),
      fetchJson(`${BINANCE_FUTURES_BASE}/fapi/v1/klines?symbol=${symbol}&interval=1w&limit=52`),
      fetchJson(`${BINANCE_FUTURES_BASE}/fapi/v1/klines?symbol=${symbol}&interval=1d&limit=300`),
      fetchJson(`${BINANCE_FUTURES_BASE}/fapi/v1/klines?symbol=${symbol}&interval=4h&limit=300`),
      fetchJson(`${BINANCE_FUTURES_BASE}/fapi/v1/klines?symbol=${symbol}&interval=1h&limit=300`),
      fetchJson(`${BINANCE_FUTURES_BASE}/fapi/v1/klines?symbol=${symbol}&interval=15m&limit=300`),
      fetchJson(`${BINANCE_FUTURES_BASE}/fapi/v1/klines?symbol=${symbol}&interval=5m&limit=300`),
      fetchJson(`${BINANCE_FUTURES_BASE}/fapi/v1/openInterest?symbol=${symbol}`).catch(() => ({ openInterest: '0' })),
    ]);

    res.json({
      ticker,
      klines1w,
      candles: {
        '1d': klines1d,
        '4h': klines4h,
        '1h': klines1h,
        '15m': klines15m,
        '5m': klines5m,
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
      fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/klines?symbol=${symbol}&interval=5m&limit=300`).then(r => r.json()),
      fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/openInterest?symbol=${symbol}`).then(r => r.json()).catch(() => ({ openInterest: '0' })),
    ]);

    res.json({ candles5m, oi });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Open Interest Single Query
app.get('/api/oi-data', async (req: Request, res: Response) => {
  try {
    const symbol = String(req.query.symbol || 'BTCUSDT').trim().toUpperCase();
    const oi = await fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/openInterest?symbol=${symbol}`).then(r => r.json());
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
        funding: [],
        trades: [],
      });
    }

    let futuresAcc: any = null;
    let spotAcc: any = null;
    let funding: any[] = [];
    let trades: any[] = [];

    // Futures Account
    try {
      futuresAcc = await signedFuturesRequest('GET', '/fapi/v2/account', {}, credentials);
    } catch (e: any) {
      futuresAcc = { code: -1, msg: e.message };
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

    res.json({
      configured: true,
      futuresAcc,
      spotAcc,
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
