// Client-side Web Crypto HMAC SHA256 signer and Binance API client for GitHub Pages & static hosting

const BINANCE_FUTURES_BASE = 'https://fapi.binance.com';
const BINANCE_SPOT_BASE = 'https://api.binance.com';
const RECV_WINDOW = 60000;

// Helper to convert ArrayBuffer to Hex string
function bufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Generate HMAC-SHA256 signature using browser standard Web Crypto API (SubtleCrypto)
async function generateSignatureClient(queryString: string, apiSecret: string): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(apiSecret);
  const msgData = enc.encode(queryString);

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await window.crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return bufferToHex(signatureBuffer);
}

function buildQueryString(params: Record<string, any>): string {
  return Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
}

// Signed Request helper directly from browser
async function signedFuturesRequestClient(
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
  const signature = await generateSignatureClient(queryString, credentials.apiSecret);
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
    throw new Error(`Respuesta no válida de Binance (${response.status})`);
  }

  if (!response.ok || (data.code && data.code < 0)) {
    throw new Error(data.msg || `Error de Binance Futures (${response.status})`);
  }

  return data;
}

// Signed Spot Request helper directly from browser
async function signedSpotRequestClient(
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
  const signature = await generateSignatureClient(queryString, credentials.apiSecret);
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
    throw new Error(`Respuesta no válida de Binance Spot (${response.status})`);
  }

  if (!response.ok || (data.code && data.code < 0)) {
    throw new Error(data.msg || `Error de Binance Spot (${response.status})`);
  }

  return data;
}

// Fetch Binance Account / Wallet Data with full fallback for GitHub Pages
export async function fetchBinanceDashboard(
  symbol: string,
  credentials?: { apiKey: string; apiSecret: string }
) {
  // 1. Try local server API proxy first (if running in full-stack dev / local server)
  try {
    const headers: Record<string, string> = {};
    if (credentials?.apiKey && credentials?.apiSecret) {
      headers['x-binance-api-key'] = credentials.apiKey;
      headers['x-binance-api-secret'] = credentials.apiSecret;
    }

    const res = await fetch(`/api/binance/dashboard?symbol=${encodeURIComponent(symbol)}`, { headers });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    // Backend API not available (e.g. GitHub Pages)
  }

  // 2. Client-side direct connection with Web Crypto signing
  if (!credentials?.apiKey || !credentials?.apiSecret) {
    return {
      configured: false,
      futuresAcc: { code: -2015, msg: 'API Key y Secret no configuradas. Ingresa tus claves en "Configurar Claves".' },
      spotAcc: null,
      funding: [],
      trades: [],
    };
  }

  let futuresAcc: any = null;
  let spotAcc: any = null;
  let funding: any[] = [];
  let trades: any[] = [];

  try {
    futuresAcc = await signedFuturesRequestClient('GET', '/fapi/v2/account', {}, credentials);
  } catch (e: any) {
    futuresAcc = { code: -1, msg: e.message };
  }

  try {
    spotAcc = await signedSpotRequestClient('GET', '/api/v3/account', {}, credentials);
  } catch (e: any) {
    spotAcc = { code: -1, msg: e.message };
  }

  try {
    funding = await signedFuturesRequestClient('GET', '/fapi/v1/income', { incomeType: 'FUNDING_FEE', limit: 20 }, credentials);
  } catch (e: any) {
    funding = [];
  }

  if (symbol) {
    try {
      trades = await signedFuturesRequestClient('GET', '/fapi/v1/userTrades', { symbol, limit: 15 }, credentials);
    } catch (e: any) {
      trades = [];
    }
  }

  return {
    configured: true,
    futuresAcc,
    spotAcc,
    funding: Array.isArray(funding) ? funding : [],
    trades: Array.isArray(trades) ? trades : [],
  };
}

// Execute Live Trade directly with Binance Futures API fallback
export async function executeBinanceTrade(
  params: any,
  credentials?: { apiKey: string; apiSecret: string }
) {
  // 1. Try server proxy if available
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (credentials?.apiKey && credentials?.apiSecret) {
      headers['x-binance-api-key'] = credentials.apiKey;
      headers['x-binance-api-secret'] = credentials.apiSecret;
    }

    const res = await fetch('/api/binance/trade', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    // Server not available
  }

  // 2. Direct client-side execution via Web Crypto HMAC
  if (!credentials?.apiKey || !credentials?.apiSecret) {
    throw new Error('API Key y Secret no proporcionadas. Configura tus claves.');
  }

  const { symbol, side, orderType, entry, stopLoss, takeProfit, quantity, leverage, liquidationDanger } = params;
  const s = String(symbol || '').trim().toUpperCase();
  const directSide = String(side || '').trim().toUpperCase();

  if (!['LONG', 'SHORT'].includes(directSide)) {
    throw new Error('La dirección debe ser LONG o SHORT.');
  }
  if (orderType !== 'LIMIT') {
    throw new Error('Solo se permiten órdenes LIMIT.');
  }
  if (liquidationDanger === true) {
    throw new Error('Operación bloqueada por peligro de liquidación por contracorriente.');
  }

  const lev = Number(leverage) || 1;
  const numEntry = Number(entry);
  const numStop = Number(stopLoss);
  const numTp = Number(takeProfit);
  const numQty = Number(quantity);

  if (isNaN(numEntry) || isNaN(numQty) || numEntry <= 0 || numQty <= 0) {
    throw new Error('Precio de entrada o cantidad inválidos.');
  }

  // Set leverage
  await signedFuturesRequestClient('POST', '/fapi/v1/leverage', { symbol: s, leverage: lev }, credentials);

  // Set margin type to ISOLATED (ignore if already set)
  try {
    await signedFuturesRequestClient('POST', '/fapi/v1/marginType', { symbol: s, marginType: 'ISOLATED' }, credentials);
  } catch (e) {
    // ignore
  }

  const binanceSide = directSide === 'LONG' ? 'BUY' : 'SELL';
  const closeSide = directSide === 'LONG' ? 'SELL' : 'BUY';

  // 1. Entry Limit Order
  const mainOrder = await signedFuturesRequestClient(
    'POST',
    '/fapi/v1/order',
    {
      symbol: s,
      side: binanceSide,
      type: 'LIMIT',
      timeInForce: 'GTC',
      quantity: numQty.toString(),
      price: numEntry.toString(),
    },
    credentials
  );

  // 2. Stop Loss Order
  let stopOrder: any = null;
  if (!isNaN(numStop) && numStop > 0) {
    try {
      stopOrder = await signedFuturesRequestClient(
        'POST',
        '/fapi/v1/order',
        {
          symbol: s,
          side: closeSide,
          type: 'STOP_MARKET',
          stopPrice: numStop.toString(),
          closePosition: 'true',
        },
        credentials
      );
    } catch (e: any) {
      console.warn('Fallo al colocar Stop Loss automático:', e.message);
    }
  }

  // 3. Take Profit Order
  let tpOrder: any = null;
  if (!isNaN(numTp) && numTp > 0) {
    try {
      tpOrder = await signedFuturesRequestClient(
        'POST',
        '/fapi/v1/order',
        {
          symbol: s,
          side: closeSide,
          type: 'TAKE_PROFIT_MARKET',
          stopPrice: numTp.toString(),
          closePosition: 'true',
        },
        credentials
      );
    } catch (e: any) {
      console.warn('Fallo al colocar Take Profit automático:', e.message);
    }
  }

  return {
    ok: true,
    message: `Orden LIMIT ${binanceSide} colocada para ${s} @ ${numEntry} (Cant: ${numQty}). SL: ${numStop > 0 ? numStop : 'N/A'}, TP: ${numTp > 0 ? numTp : 'N/A'}`,
    status: 'PLACED',
    mainOrder,
    stopOrder,
    tpOrder,
  };
}

// Resilient Klines fetcher with multi-endpoint fallback
async function fetchKlinesWithFallback(symbol: string, interval: string, limit: number = 300) {
  const endpoints = [
    `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    `${BINANCE_FUTURES_BASE}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
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
    `https://data-api.binance.vision/api/v3/ticker/24hr?symbol=${symbol}`,
    `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
    `${BINANCE_FUTURES_BASE}/fapi/v1/ticker/24hr?symbol=${symbol}`,
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

// Resilient Open Interest fetcher
async function fetchOpenInterestWithFallback(symbol: string) {
  try {
    const resp = await fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/openInterest?symbol=${symbol}`);
    if (resp.ok) {
      return await resp.json();
    }
  } catch (e) {
    // Ignore restricted location on openInterest
  }
  return { openInterest: '0', symbol };
}

export async function fetchMarketData(symbol: string) {
  // 1. Try local server API first if available
  try {
    const resp = await fetch(`/api/market-data?symbol=${encodeURIComponent(symbol)}`);
    const contentType = resp.headers.get('content-type') || '';
    if (resp.ok && contentType.includes('application/json')) {
      const data = await resp.json();
      if (data.ticker && !data.ticker.code && data.candles) {
        return data;
      }
    }
  } catch (e) {
    // Fallback
  }

  // 2. Direct resilient fallback
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

  return {
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
  };
}

export async function validateSymbol(symbol: string) {
  try {
    const res = await fetch(`/api/validate-symbol?symbol=${encodeURIComponent(symbol)}`);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (e) {
    // Fallback to direct endpoints
  }

  const endpoints = [
    'https://data-api.binance.vision/api/v3/exchangeInfo',
    'https://api.binance.com/api/v3/exchangeInfo',
    `${BINANCE_FUTURES_BASE}/fapi/v1/exchangeInfo`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const symInfo = (data.symbols || []).find((s: any) => s.symbol === symbol);
        if (symInfo) {
          return {
            symbol: symInfo.symbol,
            baseAsset: symInfo.baseAsset,
            price: symInfo.filters?.find((f: any) => f.filterType === 'PRICE_FILTER') || { tickSize: '0.01' },
            quantity: symInfo.filters?.find((f: any) => f.filterType === 'LOT_SIZE') || { minQty: '0.001' },
            minNotional: symInfo.filters?.find((f: any) => f.filterType === 'MIN_NOTIONAL' || f.filterType === 'NOTIONAL') || { notional: '5' },
          };
        }
      }
    } catch (e) {
      // try next
    }
  }

  // Fallback defaults
  return {
    symbol,
    baseAsset: symbol.replace('USDT', ''),
    price: { tickSize: '0.01' },
    quantity: { minQty: '0.001' },
    minNotional: { notional: '5' },
  };
}

export async function fetchScanData(symbol: string) {
  try {
    const res = await fetch(`/api/scan-data?symbol=${encodeURIComponent(symbol)}`);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (e) {
    // fallback
  }

  const [candles5m, oi] = await Promise.all([
    fetchKlinesWithFallback(symbol, '5m', 300),
    fetchOpenInterestWithFallback(symbol),
  ]);

  return {
    candles5m,
    oi,
  };
}
