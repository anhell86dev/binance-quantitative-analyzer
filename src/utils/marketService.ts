// Market data service with seamless fallback to direct Binance Futures REST API for GitHub Pages / Static Hosting

const BINANCE_FUTURES_BASE = 'https://fapi.binance.com';

export async function fetchMarketData(symbol: string) {
  try {
    const resp = await fetch(`/api/market-data?symbol=${encodeURIComponent(symbol)}`);
    if (resp.ok) {
      const data = await resp.json();
      if (data.ticker && !data.ticker.code) {
        return data;
      }
    }
  } catch (e) {
    // If backend proxy is not present (e.g. GitHub Pages), fallback to direct Binance API
  }

  // Fallback: Fetch directly from Binance Futures public endpoints (CORS supported)
  const fetchJson = async (url: string) => {
    const r = await fetch(url);
    if (!r.ok) {
      throw new Error(`Binance API error: ${r.status}`);
    }
    return r.json();
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
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Fallback to direct exchangeInfo
  }

  const res = await fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/exchangeInfo`);
  if (!res.ok) throw new Error('No se pudo consultar exchangeInfo de Binance');
  const data = await res.json();
  const symInfo = (data.symbols || []).find((s: any) => s.symbol === symbol);

  if (!symInfo) {
    throw new Error(`El símbolo ${symbol} no existe en Binance Futures`);
  }
  if (symInfo.status !== 'TRADING') {
    throw new Error(`${symbol} no está en estado TRADING (${symInfo.status})`);
  }

  return {
    symbol: symInfo.symbol,
    baseAsset: symInfo.baseAsset,
    price: symInfo.filters?.find((f: any) => f.filterType === 'PRICE_FILTER'),
    quantity: symInfo.filters?.find((f: any) => f.filterType === 'LOT_SIZE'),
    minNotional: symInfo.filters?.find((f: any) => f.filterType === 'MIN_NOTIONAL'),
  };
}

export async function fetchScanData(symbol: string) {
  try {
    const res = await fetch(`/api/scan-data?symbol=${encodeURIComponent(symbol)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // fallback
  }

  const [candles5m, oi] = await Promise.all([
    fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/klines?symbol=${symbol}&interval=5m&limit=300`).then(r => r.json()),
    fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/openInterest?symbol=${symbol}`)
      .then(r => r.json())
      .catch(() => ({ openInterest: '0' })),
  ]);

  return {
    candles5m,
    oi,
  };
}
