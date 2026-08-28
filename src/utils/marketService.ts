import { formatKlines } from './indicators';

// Client-side Web Crypto HMAC SHA256 signer and Binance API client for GitHub Pages & static hosting

const BINANCE_FUTURES_BASE = 'https://fapi.binance.com';
const BINANCE_SPOT_BASE = 'https://api.binance.com';
const RECV_WINDOW = 60000;

let serverTimeOffsetMs = 0;
let lastTimeSync = 0;

export async function syncServerTime(): Promise<number> {
  const now = Date.now();
  if (now - lastTimeSync < 1000 * 60 * 10 && lastTimeSync !== 0) {
    return serverTimeOffsetMs;
  }

  const timeEndpoints = [
    'https://data-api.binance.vision/api/v3/time',
    'https://api.binance.com/api/v3/time',
    `${BINANCE_FUTURES_BASE}/fapi/v1/time`,
  ];

  for (const url of timeEndpoints) {
    try {
      const start = Date.now();
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const end = Date.now();
        const latency = (end - start) / 2;
        const serverTime = data.serverTime;
        serverTimeOffsetMs = Math.round(serverTime - (end - latency));
        lastTimeSync = Date.now();
        return serverTimeOffsetMs;
      }
    } catch (e) {
      // try next endpoint
    }
  }
  return serverTimeOffsetMs;
}

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

  // Ensure time sync
  if (lastTimeSync === 0) {
    await syncServerTime().catch(() => {});
  }

  const queryParams = {
    ...params,
    timestamp: Date.now() + serverTimeOffsetMs,
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

  if (lastTimeSync === 0) {
    await syncServerTime().catch(() => {});
  }

  const queryParams = {
    ...params,
    timestamp: Date.now() + serverTimeOffsetMs,
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
      if (data && data.configured !== undefined) {
        return data;
      }
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
      positions: [],
      balance: { totalWalletBalance: 1000, availableBalance: 1000 },
      funding: [],
      trades: [],
    };
  }

  let futuresAcc: any = null;
  let spotAcc: any = null;
  let positionRisk: any[] = [];
  let funding: any[] = [];
  let trades: any[] = [];

  try {
    futuresAcc = await signedFuturesRequestClient('GET', '/fapi/v2/account', {}, credentials);
  } catch (e: any) {
    futuresAcc = { code: -1, msg: e.message };
  }

  try {
    positionRisk = await signedFuturesRequestClient('GET', '/fapi/v2/positionRisk', {}, credentials);
  } catch (e) {
    positionRisk = [];
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

  // Collect all open positions with non-zero positionAmt
  let positions: any[] = [];
  if (Array.isArray(positionRisk) && positionRisk.length > 0) {
    positions = positionRisk.filter((p: any) => Math.abs(parseFloat(p.positionAmt || '0')) > 0);
  } else if (futuresAcc && Array.isArray(futuresAcc.positions)) {
    positions = futuresAcc.positions.filter((p: any) => Math.abs(parseFloat(p.positionAmt || '0')) > 0);
  }

  const walletBal = parseFloat(futuresAcc?.totalWalletBalance || '0');
  const availBal = parseFloat(futuresAcc?.availableBalance || '0');

  return {
    configured: !futuresAcc?.code || futuresAcc.code === 0,
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
export async function fetchKlinesWithFallback(symbol: string, interval: string, limit: number = 300) {
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
export async function fetchTickerWithFallback(symbol: string) {
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
export function extractOpenInterestValue(oi: any): number {
  if (oi === null || oi === undefined) return 0;
  if (typeof oi === 'number') return Number.isFinite(oi) ? oi : 0;
  if (typeof oi === 'string') {
    const num = parseFloat(oi);
    return Number.isFinite(num) ? num : 0;
  }
  if (typeof oi === 'object') {
    if (oi.value !== undefined && oi.value !== null) {
      const num = typeof oi.value === 'number' ? oi.value : parseFloat(String(oi.value));
      if (Number.isFinite(num)) return num;
    }
    if (oi.openInterest !== undefined && oi.openInterest !== null) {
      const num = typeof oi.openInterest === 'number' ? oi.openInterest : parseFloat(String(oi.openInterest));
      if (Number.isFinite(num)) return num;
    }
  }
  return 0;
}

export async function fetchOpenInterestWithFallback(symbol: string) {
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
          const numericVal = parseFloat(data.openInterest) || 0;
          return {
            openInterest: data.openInterest,
            value: numericVal,
            symbol: data.symbol || symbol,
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

export async function fetchMarketData(symbol: string) {
  // 1. Try local server API first if available
  try {
    const resp = await fetch(`/api/market-data?symbol=${encodeURIComponent(symbol)}`);
    const contentType = resp.headers.get('content-type') || '';
    if (resp.ok && contentType.includes('application/json')) {
      const data = await resp.json();
      if (data.ticker && !data.ticker.code && data.candles) {
        return {
          ticker: data.ticker,
          klines1w: formatKlines(data.klines1w || []),
          candles: {
            '1d': formatKlines(data.candles['1d'] || []),
            '4h': formatKlines(data.candles['4h'] || []),
            '1h': formatKlines(data.candles['1h'] || []),
            '15m': formatKlines(data.candles['15m'] || []),
            '5m': formatKlines(data.candles['5m'] || []),
          },
          oi: data.oi,
        };
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
    klines1w: formatKlines(klines1w),
    candles: {
      '1d': formatKlines(klines1d),
      '4h': formatKlines(klines4h),
      '1h': formatKlines(klines1h),
      '15m': formatKlines(klines15m),
      '5m': formatKlines(klines5m),
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
      const data = await res.json();
      if (data && data.candles5m) {
        return {
          candles5m: formatKlines(data.candles5m || []),
          oi: data.oi,
        };
      }
    }
  } catch (e) {
    // fallback
  }

  const [candles5m, oi] = await Promise.all([
    fetchKlinesWithFallback(symbol, '5m', 300),
    fetchOpenInterestWithFallback(symbol),
  ]);

  return {
    candles5m: formatKlines(candles5m),
    oi,
  };
}

export interface ApiKeyVerificationResult {
  valid: boolean;
  timestampOffsetMs: number;
  syntaxCheck: {
    valid: boolean;
    apiKeyLength: number;
    hasWhitespace: boolean;
    message: string;
  };
  spotStatus: {
    connected: boolean;
    canTrade?: boolean;
    accountType?: string;
    error?: string;
  };
  futuresStatus: {
    connected: boolean;
    canTrade?: boolean;
    totalWalletBalance?: string;
    error?: string;
  };
  permissions: {
    enableReading: boolean;
    enableSpotAndMarginTrading?: boolean;
    enableWithdrawals?: boolean;
    enableInternalTransfer?: boolean;
    enableFutures?: boolean;
    permitsUniversalTransfer?: boolean;
    enableVanillaOptions?: boolean;
    ipRestrict?: boolean;
  } | null;
  warnings: string[];
  suggestions: string[];
}

export async function verifyBinanceApiKeys(
  apiKey: string,
  apiSecret: string
): Promise<ApiKeyVerificationResult> {
  const trimmedKey = apiKey.trim();
  const trimmedSecret = apiSecret.trim();
  const hasWhitespace = apiKey !== trimmedKey || apiSecret !== trimmedSecret;

  const result: ApiKeyVerificationResult = {
    valid: false,
    timestampOffsetMs: 0,
    syntaxCheck: {
      valid: true,
      apiKeyLength: trimmedKey.length,
      hasWhitespace,
      message: 'Formato de clave válido.',
    },
    spotStatus: { connected: false },
    futuresStatus: { connected: false },
    permissions: null,
    warnings: [],
    suggestions: [],
  };

  if (!trimmedKey || !trimmedSecret) {
    result.syntaxCheck.valid = false;
    result.syntaxCheck.message = 'La API Key o el Secret están vacíos.';
    result.suggestions.push('Pega tu API Key y Secret generadas desde la gestión de API de Binance.');
    return result;
  }

  if (trimmedKey.length < 32 || trimmedSecret.length < 32) {
    result.syntaxCheck.valid = false;
    result.syntaxCheck.message = `Longitud inusual (Key: ${trimmedKey.length} chars, Secret: ${trimmedSecret.length} chars). Las claves de Binance suelen tener 64 caracteres.`;
    result.warnings.push('Verifica que hayas copiado la clave completa.');
  }

  if (hasWhitespace) {
    result.warnings.push('Se detectaron espacios al inicio o final de las claves; se eliminaron automáticamente al verificar.');
  }

  // 1. Check Server Clock Sync
  const offset = await syncServerTime().catch(() => 0);
  result.timestampOffsetMs = offset;
  if (Math.abs(offset) > 3000) {
    result.warnings.push(`Desfase de reloj detectado (${offset > 0 ? '+' : ''}${offset}ms con respecto a Binance). Se aplicó corrección horaria automática.`);
  }

  const creds = { apiKey: trimmedKey, apiSecret: trimmedSecret };

  // 2. Test Spot API & Account
  try {
    const spotAcc = await signedSpotRequestClient('GET', '/api/v3/account', {}, creds);
    if (spotAcc && spotAcc.accountType !== undefined) {
      result.spotStatus.connected = true;
      result.spotStatus.canTrade = !!spotAcc.canTrade;
      result.spotStatus.accountType = spotAcc.accountType || 'SPOT';
    }
  } catch (err: any) {
    result.spotStatus.error = err.message;
  }

  // 3. Test Futures API & Account
  try {
    const futuresAcc = await signedFuturesRequestClient('GET', '/fapi/v2/account', {}, creds);
    if (futuresAcc && (futuresAcc.totalWalletBalance !== undefined || futuresAcc.canTrade !== undefined)) {
      result.futuresStatus.connected = true;
      result.futuresStatus.canTrade = !!futuresAcc.canTrade;
      result.futuresStatus.totalWalletBalance = futuresAcc.totalWalletBalance;
    }
  } catch (err: any) {
    result.futuresStatus.error = err.message;
  }

  // 4. Test API Key Restrictions / Permissions endpoint
  try {
    const restrictions = await signedSpotRequestClient('GET', '/sapi/v1/account/apiRestrictions', {}, creds);
    if (restrictions) {
      result.permissions = {
        enableReading: !!restrictions.enableReading,
        enableSpotAndMarginTrading: !!restrictions.enableSpotAndMarginTrading,
        enableWithdrawals: !!restrictions.enableWithdrawals,
        enableInternalTransfer: !!restrictions.enableInternalTransfer,
        enableFutures: !!restrictions.enableFutures,
        permitsUniversalTransfer: !!restrictions.permitsUniversalTransfer,
        enableVanillaOptions: !!restrictions.enableVanillaOptions,
        ipRestrict: !!restrictions.ipRestrict,
      };

      if (restrictions.enableWithdrawals) {
        result.warnings.push('⚠️ ALERTA DE SEGURIDAD: Tu API Key tiene permisos de retiro activos. Por seguridad, te recomendamos DESACTIVAR retiros en la gestión de API de Binance.');
      }

      if (!restrictions.enableFutures && !result.futuresStatus.connected) {
        result.suggestions.push('💡 Para operar en Futuros, activa la casilla "Enable Futures" en la configuración de la clave dentro de Binance.');
      }

      if (restrictions.ipRestrict) {
        result.warnings.push('ℹ️ La clave tiene restricción de IP activada. Asegúrate de que tu IP actual esté en la lista blanca de Binance.');
      }
    }
  } catch (err) {
    // Some keys might not have permission to view apiRestrictions, which is acceptable
  }

  // Determine overall validity
  if (result.futuresStatus.connected || result.spotStatus.connected) {
    result.valid = true;
    if (result.futuresStatus.connected) {
      result.suggestions.push('✅ Conexión con Binance Futures establecida correctamente.');
    }
    if (result.spotStatus.connected) {
      result.suggestions.push('✅ Conexión con Binance Spot establecida correctamente.');
    }
  } else {
    // Analyze errors
    const spotErr = result.spotStatus.error || '';
    const futErr = result.futuresStatus.error || '';

    if (spotErr.includes('-2015') || futErr.includes('-2015') || spotErr.includes('Invalid API-key') || futErr.includes('Invalid API-key')) {
      result.suggestions.push('❌ Error de autenticación (-2015): Verifica que la API Key y Secret sean correctas y que la clave no haya expirado (Binance expira claves sin restricción de IP a los 90 días).');
    } else if (spotErr.includes('-1022') || futErr.includes('-1022') || spotErr.includes('Signature')) {
      result.suggestions.push('❌ Firma inválida (-1022): La API Secret no coincide con la API Key ingresada.');
    } else if (futErr.includes('-4059') || futErr.includes('account not activated')) {
      result.suggestions.push('❌ Cuenta de Futuros no activada: Abre la sección de Futuros en tu app de Binance para aceptar los términos de trading de futuros.');
    } else {
      result.suggestions.push(`❌ Error al conectar: ${futErr || spotErr}`);
    }
  }

  return result;
}

// ----------------------------------------------------
// Funding Rate & Premium Index Fetcher
// ----------------------------------------------------
export async function fetchFundingRateData(symbol: string): Promise<{
  rate: number;
  predictedRate: number;
  nextFundingTime: number;
  countdownText: string;
  sentiment: 'Altamente Alcista (Longs pagan)' | 'Altamente Bajista (Shorts pagan)' | 'Neutral / Equilibrado';
}> {
  try {
    const res = await fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`);
    if (res.ok) {
      const data = await res.json();
      const rate = parseFloat(data.lastFundingRate) || 0;
      const nextTime = Number(data.nextFundingTime) || Date.now() + 1000 * 60 * 60 * 4;

      const diffMs = Math.max(0, nextTime - Date.now());
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      const countdownText = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      // Sentiment
      let sentiment: 'Altamente Alcista (Longs pagan)' | 'Altamente Bajista (Shorts pagan)' | 'Neutral / Equilibrado' = 'Neutral / Equilibrado';
      if (rate > 0.0003) {
        sentiment = 'Altamente Alcista (Longs pagan)';
      } else if (rate < -0.0002) {
        sentiment = 'Altamente Bajista (Shorts pagan)';
      }

      return {
        rate,
        predictedRate: rate,
        nextFundingTime: nextTime,
        countdownText,
        sentiment,
      };
    }
  } catch (e) {
    // fallback
  }

  return {
    rate: 0.0001,
    predictedRate: 0.0001,
    nextFundingTime: Date.now() + 1000 * 60 * 60 * 3,
    countdownText: '03:14:22',
    sentiment: 'Neutral / Equilibrado',
  };
}

// ----------------------------------------------------
// Cancel All Open Orders & Emergency Panic Close
// ----------------------------------------------------
export async function cancelAllOpenOrdersClient(
  symbol: string,
  apiKey?: string,
  apiSecret?: string
): Promise<{ success: boolean; message: string }> {
  // If backend server is available, call it first
  try {
    const res = await fetch('/api/binance/cancel-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol }),
    });
    if (res.ok) {
      const d = await res.json();
      return { success: true, message: d.msg || 'Todas las órdenes abiertas han sido canceladas.' };
    }
  } catch (e) {
    // fallback to client direct
  }

  if (!apiKey || !apiSecret) {
    return { success: false, message: 'Claves API no provistas para cancelar órdenes.' };
  }

  try {
    const offset = await syncServerTime();
    const timestamp = Date.now() + offset;
    const queryString = `symbol=${symbol}&recvWindow=${RECV_WINDOW}&timestamp=${timestamp}`;
    const signature = await generateSignatureClient(queryString, apiSecret);

    const res = await fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/allOpenOrders?${queryString}&signature=${signature}`, {
      method: 'DELETE',
      headers: {
        'X-MBX-APIKEY': apiKey,
      },
    });

    const data = await res.json();
    if (res.ok || data.code === 200) {
      return { success: true, message: `Órdenes de ${symbol} canceladas exitosamente en Binance.` };
    } else {
      return { success: false, message: data.msg || 'Error al cancelar órdenes' };
    }
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function closePositionAtMarketClient(
  symbol: string,
  positionAmt: number,
  percentage: number = 100, // 50 or 100
  apiKey?: string,
  apiSecret?: string
): Promise<{ success: boolean; message: string }> {
  const isLong = positionAmt > 0;
  const side = isLong ? 'SELL' : 'BUY';
  const closeQty = Math.abs(positionAmt) * (percentage / 100);

  if (closeQty <= 0) {
    return { success: false, message: 'No hay posición abierta activa para cerrar.' };
  }

  // Try server proxy first
  try {
    const res = await fetch('/api/binance/close-market', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, side, quantity: closeQty }),
    });
    if (res.ok) {
      const d = await res.json();
      return { success: true, message: d.msg || `Posición ${symbol} cerrada (${percentage}%).` };
    }
  } catch (e) {
    // fallback to browser signing
  }

  if (!apiKey || !apiSecret) {
    return { success: false, message: 'Claves API no provistas para cerrar posición.' };
  }

  try {
    const orderRes = await signedFuturesRequestClient(
      'POST',
      '/fapi/v1/order',
      {
        symbol,
        side,
        type: 'MARKET',
        quantity: closeQty.toFixed(3),
        reduceOnly: 'true',
      },
      { apiKey, apiSecret }
    );

    if (orderRes && (orderRes.orderId || orderRes.status === 'FILLED' || orderRes.status === 'NEW')) {
      return {
        success: true,
        message: `Posición ${symbol} cerrada (${percentage}%) exitosamente a precio de mercado.`,
      };
    }
    return {
      success: false,
      message: orderRes.msg || 'Error al ejecutar orden de mercado',
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Error al cerrar posición' };
  }
}


