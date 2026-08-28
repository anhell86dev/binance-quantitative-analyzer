import { Candle, PivotLevels, MarketStructurePoint, TradeStrategy } from '../types';

export function formatKlines(data: any[]): Candle[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter(x => x !== null && x !== undefined)
    .map(x => {
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

export function calculateEma(candles: Candle[], period: number): number | null {
  if (!candles || candles.length < 3) return null;
  const k = 2 / (period + 1);
  let ema = candles[0].close;
  for (let i = 1; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
  }
  return ema;
}

export function calculateEmaSeries(candles: Candle[], period: number): (number | null)[] {
  if (!candles || !candles.length) return [];
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];
  let ema = candles[0].close;
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      ema = candles[0].close;
    } else {
      ema = candles[i].close * k + ema * (1 - k);
    }
    result.push(ema);
  }
  return result;
}

export function calculateEmaFromNumbers(values: number[], period: number): number | null {
  if (!values || values.length < 3) return null;
  const k = 2 / (period + 1);
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }
  return ema;
}

export function calculateRsi(candles: Candle[], period: number = 14): number | null {
  if (!candles || candles.length < 5) return null;
  const p = Math.min(period, candles.length - 1);
  if (p <= 0) return null;
  const closes = candles.map(x => x.close);
  let gain = 0;
  let loss = 0;

  for (let i = 1; i <= p; i++) {
    const diff = closes[i] - closes[i - 1];
    gain += Math.max(diff, 0);
    loss += Math.max(-diff, 0);
  }

  gain /= p;
  loss /= p;

  for (let i = p + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gain = (gain * (p - 1) + Math.max(diff, 0)) / p;
    loss = (loss * (p - 1) + Math.max(-diff, 0)) / p;
  }

  if (loss === 0) return 100;
  const rs = gain / loss;
  return 100 - 100 / (1 + rs);
}

export function calculateMacd(candles: Candle[]): number | null {
  if (!candles || candles.length < 8) return null;
  const closes = candles.map(x => x.close);
  const ema12 = calculateEmaFromNumbers(closes, 12);
  const ema26 = calculateEmaFromNumbers(closes, 26);
  if (ema12 === null || ema26 === null) return null;
  return ema12 - ema26;
}

export function calculateRvol(candles: Candle[], period: number = 20): number | null {
  if (!candles || candles.length < 3) return null;
  const len = candles.length;
  const count = Math.min(period, len - 1);
  if (count <= 0) {
    return 1.0;
  }
  const history = candles.slice(len - 1 - count, len - 1);
  const baseVolumeSum = history.reduce((acc, c) => acc + (Number(c.volume) || 0), 0);
  const avgVolume = baseVolumeSum / count;
  if (avgVolume <= 0) return 1.0;
  const lastVolume = Number(candles[len - 1].volume) || 0;
  return lastVolume / avgVolume;
}

export function calculatePivotLevels(candles: Candle[], currentPrice: number): PivotLevels {
  if (!candles || !candles.length) {
    return { r1: null, r2: null, r3: null, s1: null, s2: null, s3: null };
  }

  const p = currentPrice || (candles.length ? candles[candles.length - 1].close : 0);
  if (p <= 0) return { r1: null, r2: null, r3: null, s1: null, s2: null, s3: null };

  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles.length > 1 ? candles[candles.length - 2] : lastCandle;

  // Classic Floor Trader Pivots
  const pp = (prevCandle.high + prevCandle.low + prevCandle.close) / 3;
  const classicR1 = 2 * pp - prevCandle.low;
  const classicS1 = 2 * pp - prevCandle.high;
  const classicR2 = pp + (prevCandle.high - prevCandle.low);
  const classicS2 = pp - (prevCandle.high - prevCandle.low);
  const classicR3 = prevCandle.high + 2 * (pp - prevCandle.low);
  const classicS3 = prevCandle.low - 2 * (prevCandle.high - pp);

  // Dynamic Swing Highs/Lows
  const highsAbove = candles
    .map(x => x.high)
    .filter(h => h > p * 1.0005)
    .sort((a, b) => a - b);

  const lowsBelow = candles
    .map(x => x.low)
    .filter(l => l < p * 0.9995)
    .sort((a, b) => b - a);

  const r1 = highsAbove[0] ?? (classicR1 > p ? classicR1 : p * 1.015);
  const r2 = highsAbove[1] ?? (classicR2 > r1 ? classicR2 : r1 * 1.02);
  const r3 = highsAbove[2] ?? (classicR3 > r2 ? classicR3 : r2 * 1.025);

  const s1 = lowsBelow[0] ?? (classicS1 < p ? classicS1 : p * 0.985);
  const s2 = lowsBelow[1] ?? (classicS2 < s1 ? classicS2 : s1 * 0.98);
  const s3 = lowsBelow[2] ?? (classicS3 < s2 ? classicS3 : s2 * 0.975);

  return { r1, r2, r3, s1, s2, s3 };
}

export function calculateMarketStructure(candles: Candle[], lookback: number = 3): MarketStructurePoint[] {
  if (!candles || candles.length < lookback * 2 + 1) return [];

  const highs: { index: number; time: number; price: number; type: 'high' }[] = [];
  const lows: { index: number; time: number; price: number; type: 'low' }[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const window = candles.slice(i - lookback, i + lookback + 1);
    const maxHigh = Math.max(...window.map(x => x.high));
    const minLow = Math.min(...window.map(x => x.low));

    if (candles[i].high === maxHigh) {
      highs.push({ index: i, time: candles[i].time, price: candles[i].high, type: 'high' });
    }
    if (candles[i].low === minLow) {
      lows.push({ index: i, time: candles[i].time, price: candles[i].low, type: 'low' });
    }
  }

  const events = [...highs, ...lows].sort((a, b) => a.index - b.index);
  let prevHigh: number | null = null;
  let prevLow: number | null = null;
  let currentDirection: 'bull' | 'bear' | null = null;
  const results: MarketStructurePoint[] = [];

  events.forEach(e => {
    let label: 'HH' | 'HL' | 'LH' | 'LL' | null = null;
    let dir: 'bull' | 'bear' | null = null;

    if (e.type === 'high') {
      if (prevHigh !== null) {
        label = e.price > prevHigh ? 'HH' : 'LH';
        dir = label === 'HH' ? 'bull' : 'bear';
      }
      prevHigh = e.price;
    } else {
      if (prevLow !== null) {
        label = e.price > prevLow ? 'HL' : 'LL';
        dir = label === 'HL' ? 'bull' : 'bear';
      }
      prevLow = e.price;
    }

    if (label && dir) {
      const isReversal = currentDirection !== null && currentDirection !== dir;
      results.push({
        index: e.index,
        time: e.time,
        price: e.price,
        type: e.type,
        label,
        direction: dir,
        reversal: isReversal,
      });
      currentDirection = dir;
    }
  });

  return results;
}

export function generateTradingStrategies(params: {
  symbol: string;
  currentPrice: number;
  candles1d: Candle[];
  candles4h: Candle[];
  candles15m: Candle[];
  rvol5m: number | null;
  sr1d: PivotLevels;
  sr4h: PivotLevels;
  trend1d: string;
  trend4h: string;
  isDanger: boolean;
}): TradeStrategy[] {
  const { symbol, currentPrice, candles1d, candles15m, rvol5m, sr1d, sr4h, trend1d, trend4h, isDanger } = params;
  if (!currentPrice || !candles1d?.length) return [];

  const rsiVal = calculateRsi(candles1d, 14) ?? 50;
  const macdVal = calculateMacd(candles15m) ?? 0;
  const rvol = rvol5m ?? 1;

  const allResistances = [sr1d.r1, sr1d.r2, sr1d.r3, sr4h.r1, sr4h.r2, sr4h.r3]
    .filter((x): x is number => typeof x === 'number' && Number.isFinite(x) && x > currentPrice)
    .sort((a, b) => a - b);

  const allSupports = [sr1d.s1, sr1d.s2, sr1d.s3, sr4h.s1, sr4h.s2, sr4h.s3]
    .filter((x): x is number => typeof x === 'number' && Number.isFinite(x) && x < currentPrice)
    .sort((a, b) => b - a);

  const nearestSupport = allSupports[0] ?? null;
  const nearestResistance = allResistances[0] ?? null;

  const strategies: TradeStrategy[] = [];

  // Calculate score for LONG
  const longScore =
    (trend1d === 'Alcista' ? 1 : 0) +
    (trend4h === 'Alcista' ? 1 : 0) +
    (rsiVal > 45 ? 1 : 0) +
    (macdVal > 0 ? 1 : 0) +
    (rvol >= 1.5 ? 1 : 0);

  // Calculate score for SHORT
  const shortScore =
    (trend1d === 'Bajista' ? 1 : 0) +
    (trend4h === 'Bajista' ? 1 : 0) +
    (rsiVal < 55 ? 1 : 0) +
    (macdVal < 0 ? 1 : 0) +
    (rvol >= 1.5 ? 1 : 0);

  // LONG candidate
  if (nearestSupport && !isDanger) {
    const entry = Math.max(nearestSupport, currentPrice * 0.996);
    const stop = nearestSupport * 0.992;
    const risk = entry - stop;

    // Search target with at least 1:2 or 1:3 R:R
    const target3 = allResistances.find(r => r >= entry + risk * 3);
    const target2 = allResistances.find(r => r >= entry + risk * 2);
    const chosenTarget = target3 || target2 || (allResistances[0] ? Math.max(allResistances[0], entry + risk * 2) : entry + risk * 2.5);

    if (chosenTarget && chosenTarget > entry) {
      const reward = chosenTarget - entry;
      const rr = risk > 0 ? reward / risk : 0;
      if (rr >= 1.95) {
        strategies.push({
          symbol,
          type: 'LONG',
          entry,
          stop,
          target: chosenTarget,
          goal: chosenTarget === target3 ? 3 : 2,
          score: Math.min(5, Math.max(1, longScore)),
          rr,
          reason: `Retroceso hacia soporte clave en ${nearestSupport.toFixed(2)}. Confluencia de temporalidad y estructura alcista.`,
        });
      }
    }
  }

  // SHORT candidate
  if (nearestResistance) {
    const entry = Math.min(nearestResistance, currentPrice * 1.004);
    const stop = nearestResistance * 1.008;
    const risk = stop - entry;

    const target3 = allSupports.find(s => s <= entry - risk * 3);
    const target2 = allSupports.find(s => s <= entry - risk * 2);
    const chosenTarget = target3 || target2 || (allSupports[0] ? Math.min(allSupports[0], entry - risk * 2) : entry - risk * 2.5);

    if (chosenTarget && chosenTarget < entry) {
      const reward = entry - chosenTarget;
      const rr = risk > 0 ? reward / risk : 0;
      if (rr >= 1.95) {
        strategies.push({
          symbol,
          type: 'SHORT',
          entry,
          stop,
          target: chosenTarget,
          goal: chosenTarget === target3 ? 3 : 2,
          score: Math.min(5, Math.max(1, shortScore)),
          rr,
          reason: `Rechazo en zona de resistencia en ${nearestResistance.toFixed(2)}. Objetivo de liquidez inferior.`,
        });
      }
    }
  }

  return strategies;
}

// ----------------------------------------------------
// 1. Order Flow & Liquidation Heatmap Calculations
// ----------------------------------------------------

export function calculateOrderFlowMetrics(
  candlesOrConfig: Candle[] | {
    candles: Candle[];
    currentPrice: number;
    fundingRateVal?: number;
    nextFundingTime?: number;
    countdownText?: string;
    sentiment?: 'Altamente Alcista (Longs pagan)' | 'Altamente Bajista (Shorts pagan)' | 'Neutral / Equilibrado';
  },
  secondPrice?: number
): import('../types').OrderFlowAnalysis {
  let candles: Candle[] = [];
  let currentPrice = 0;
  let fundingRateVal = 0.0001;
  let nextFundingTime = Date.now() + 1000 * 60 * 60 * 4;
  let countdownText = '03:14:22';
  let sentiment: 'Altamente Alcista (Longs pagan)' | 'Altamente Bajista (Shorts pagan)' | 'Neutral / Equilibrado' = 'Neutral / Equilibrado';

  if (Array.isArray(candlesOrConfig)) {
    candles = candlesOrConfig;
    currentPrice = secondPrice || 0;
  } else if (candlesOrConfig && typeof candlesOrConfig === 'object') {
    candles = candlesOrConfig.candles || [];
    currentPrice = candlesOrConfig.currentPrice || 0;
    if (candlesOrConfig.fundingRateVal !== undefined) fundingRateVal = candlesOrConfig.fundingRateVal;
    if (candlesOrConfig.nextFundingTime !== undefined) nextFundingTime = candlesOrConfig.nextFundingTime;
    if (candlesOrConfig.countdownText) countdownText = candlesOrConfig.countdownText;
    if (candlesOrConfig.sentiment) sentiment = candlesOrConfig.sentiment;
  }

  if (!candles || candles.length === 0 || currentPrice <= 0) {
    return {
      cvdHistory: [],
      takerBuyRatio: 0.5,
      aggressiveSide: 'BALANCED',
      cvdDivergence: 'Neutral / Sincronizado',
      liquidationLevels: [],
      liquidationMagnetLong: null,
      liquidationMagnetShort: null,
      fundingRate: {
        rate: fundingRateVal,
        predictedRate: fundingRateVal,
        nextFundingTime,
        countdownText,
        sentiment,
      },
    };
  }

  // Calculate Candle Delta & Cumulative Volume Delta (CVD)
  let cumulativeDelta = 0;
  let totalBuyVol = 0;
  let totalSellVol = 0;

  const cvdHistory = candles.slice(-50).map(c => {
    const range = c.high - c.low;
    // Estimate buy vs sell volume based on close position within candle range and close vs open
    let buyRatio = 0.5;
    if (range > 0) {
      const positionRatio = (c.close - c.low) / range;
      const bodyRatio = (c.close - c.open) / range;
      buyRatio = Math.max(0.05, Math.min(0.95, 0.5 + bodyRatio * 0.3 + (positionRatio - 0.5) * 0.4));
    }

    const buyVol = c.volume * buyRatio;
    const sellVol = c.volume * (1 - buyRatio);
    const delta = buyVol - sellVol;

    cumulativeDelta += delta;
    totalBuyVol += buyVol;
    totalSellVol += sellVol;

    return {
      time: c.time,
      price: c.close,
      buyVolume: buyVol,
      sellVolume: sellVol,
      delta,
      cvd: cumulativeDelta,
    };
  });

  const totalVol = totalBuyVol + totalSellVol;
  const takerBuyRatio = totalVol > 0 ? totalBuyVol / totalVol : 0.5;
  const aggressiveSide = takerBuyRatio > 0.53 ? 'BUYERS' : takerBuyRatio < 0.47 ? 'SELLERS' : 'BALANCED';

  // Check CVD Divergence on last 20 candles
  let cvdDivergence: 'Alcista (Absorción Compradora)' | 'Bajista (Absorción Vendedora)' | 'Neutral / Sincronizado' = 'Neutral / Sincronizado';
  if (cvdHistory.length >= 15) {
    const firstHalf = cvdHistory.slice(-15, -7);
    const secondHalf = cvdHistory.slice(-7);

    const priceStart = Math.min(...firstHalf.map(x => x.price));
    const priceEnd = secondHalf[secondHalf.length - 1].price;
    const cvdStart = firstHalf[0].cvd;
    const cvdEnd = secondHalf[secondHalf.length - 1].cvd;

    // Price making lower low while CVD making higher high (Bullish absorption)
    if (priceEnd < priceStart && cvdEnd > cvdStart) {
      cvdDivergence = 'Alcista (Absorción Compradora)';
    } else if (priceEnd > priceStart && cvdEnd < cvdStart) {
      cvdDivergence = 'Bajista (Absorción Vendedora)';
    }
  }

  // Calculate Theoretical Liquidation Pools / Clusters
  // Typical high leverage clusters: 100x (~0.8% away), 50x (~1.8%), 25x (~3.8%), 10x (~9.5%)
  const leverages = [100, 50, 25, 10];
  const liquidationLevels: import('../types').LiquidationLevel[] = [];

  leverages.forEach(lev => {
    const distanceMult = 1 / lev;
    // Long liquidations sit below current price (when price drops)
    const longLiqPrice = currentPrice * (1 - distanceMult * 0.95);
    const longDistPct = ((currentPrice - longLiqPrice) / currentPrice) * 100;

    liquidationLevels.push({
      leverage: lev,
      side: 'LONG',
      estimatedPrice: longLiqPrice,
      distancePercent: longDistPct,
      liquidityDensity: lev >= 50 ? 'Crítica' : lev >= 25 ? 'Alta' : 'Media',
      intensity: lev === 100 ? 95 : lev === 50 ? 80 : lev === 25 ? 60 : 40,
    });

    // Short liquidations sit above current price (when price rises)
    const shortLiqPrice = currentPrice * (1 + distanceMult * 0.95);
    const shortDistPct = ((shortLiqPrice - currentPrice) / currentPrice) * 100;

    liquidationLevels.push({
      leverage: lev,
      side: 'SHORT',
      estimatedPrice: shortLiqPrice,
      distancePercent: shortDistPct,
      liquidityDensity: lev >= 50 ? 'Crítica' : lev >= 25 ? 'Alta' : 'Media',
      intensity: lev === 100 ? 95 : lev === 50 ? 80 : lev === 25 ? 60 : 40,
    });
  });

  // Sort liquidation levels by price descending
  liquidationLevels.sort((a, b) => b.estimatedPrice - a.estimatedPrice);

  // Identify high-density magnet prices (cluster of 50x / 100x liquidations)
  const shortMagnets = liquidationLevels.filter(l => l.side === 'SHORT' && l.leverage >= 50);
  const longMagnets = liquidationLevels.filter(l => l.side === 'LONG' && l.leverage >= 50);

  const liquidationMagnetShort = shortMagnets.length > 0 ? shortMagnets[0].estimatedPrice : null;
  const liquidationMagnetLong = longMagnets.length > 0 ? longMagnets[0].estimatedPrice : null;

  return {
    cvdHistory,
    takerBuyRatio,
    aggressiveSide,
    cvdDivergence,
    liquidationLevels,
    liquidationMagnetLong,
    liquidationMagnetShort,
    fundingRate: {
      rate: fundingRateVal,
      predictedRate: fundingRateVal,
      nextFundingTime,
      countdownText,
      sentiment,
    },
  };
}

// ----------------------------------------------------
// 2. Bollinger Bands & Squeeze Detection
// ----------------------------------------------------

export function calculateBollingerBands(
  candles: Candle[],
  period: number = 20,
  multiplier: number = 2
): { upper: number | null; middle: number | null; lower: number | null; bandwidth: number | null; isSqueeze: boolean } {
  if (!candles || candles.length < period) {
    return { upper: null, middle: null, lower: null, bandwidth: null, isSqueeze: false };
  }

  const slice = candles.slice(-period);
  const closes = slice.map(c => c.close);
  const sum = closes.reduce((a, b) => a + b, 0);
  const mean = sum / period;

  const variance = closes.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = mean + stdDev * multiplier;
  const lower = mean - stdDev * multiplier;
  const bandwidth = mean > 0 ? ((upper - lower) / mean) * 100 : 0;

  // Squeeze threshold: very narrow bandwidth relative to asset
  const isSqueeze = bandwidth < 2.2;

  return {
    upper,
    middle: mean,
    lower,
    bandwidth,
    isSqueeze,
  };
}

// ----------------------------------------------------
// 3. Institutional Risk Management Calculator
// ----------------------------------------------------

export function calculatePositionRisk(
  config: import('../types').RiskCalculatorConfig
): import('../types').RiskCalculatorResult {
  const { accountBalance, riskPercent, entryPrice, stopLossPrice, takeProfitPrice, direction, leverage } = config;

  const riskAmountUsdt = (accountBalance * (riskPercent / 100));
  const priceDistance = Math.abs(entryPrice - stopLossPrice);

  let positionSizeCoins = 0;
  let positionValueUsdt = 0;
  let requiredMarginUsdt = 0;
  let potentialProfitUsdt = 0;
  let potentialLossUsdt = 0;
  let riskRewardRatio = 0;
  let liquidationPriceEstimated = 0;

  if (priceDistance > 0 && entryPrice > 0) {
    // Exact coins to risk exact riskAmountUsdt on stop loss hit
    positionSizeCoins = riskAmountUsdt / priceDistance;
    positionValueUsdt = positionSizeCoins * entryPrice;
    requiredMarginUsdt = positionValueUsdt / Math.max(1, leverage);

    const profitDistance = Math.abs(takeProfitPrice - entryPrice);
    potentialProfitUsdt = positionSizeCoins * profitDistance;
    potentialLossUsdt = riskAmountUsdt;
    riskRewardRatio = priceDistance > 0 ? profitDistance / priceDistance : 0;

    // Estimate isolated liquidation price
    // Maintenance margin ~ 0.5%
    const mm = 0.005;
    if (direction === 'LONG') {
      liquidationPriceEstimated = entryPrice * (1 - (1 / leverage) + mm);
    } else {
      liquidationPriceEstimated = entryPrice * (1 + (1 / leverage) - mm);
    }
  }

  const isSafeMargin = requiredMarginUsdt <= accountBalance * 0.8;

  return {
    riskAmountUsdt,
    positionSizeCoins,
    positionValueUsdt,
    requiredMarginUsdt,
    potentialProfitUsdt,
    potentialLossUsdt,
    riskRewardRatio,
    liquidationPriceEstimated,
    isSafeMargin,
  };
}

// ----------------------------------------------------
// 4. Web Audio Synthesizer for Institutional Audio Alerts
// ----------------------------------------------------

let audioCtx: AudioContext | null = null;

export function playAudioAlert(type: 'bullish' | 'bearish' | 'alert' | 'success' | 'click') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === 'suspended') {
      audioCtx = new AudioContextClass();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'bullish') {
      // 2-tone bright rising chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'bearish') {
      // 2-tone descending chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(293.66, now + 0.15); // D4
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'alert') {
      // High attention double pulse
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      gain.gain.setValueAtTime(0.15, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'success') {
      // Triad chord progression
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (e) {
    // AudioContext permission may need user interaction first
  }
}

