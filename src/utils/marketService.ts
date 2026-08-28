// Market data service with seamless fallback to unrestricted Binance Public endpoints for GitHub Pages and Cloud environments

const BINANCE_FUTURES_BASE = 'https://fapi.binance.com';

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
    if (resp.ok) {
      const data = await resp.json();
      if (data.ticker && !data.ticker.code && data.candles) {
        return data;
      }
    }
  } catch (e) {
    // If backend proxy is not present (e.g. GitHub Pages), fallback to direct endpoints
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
    if (res.ok) {
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
    if (res.ok) {
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
