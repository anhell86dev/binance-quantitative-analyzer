import { Candle, PivotLevels, MarketStructurePoint, TradeStrategy } from '../types';

export function formatKlines(data: any[]): Candle[] {
  if (!Array.isArray(data)) return [];
  return data.map(x => ({
    time: Number(x[0]),
    open: Number(x[1]),
    high: Number(x[2]),
    low: Number(x[3]),
    close: Number(x[4]),
    volume: Number(x[5]),
  }));
}

export function calculateEma(candles: Candle[], period: number): number | null {
  if (!candles || candles.length < period) return null;
  const k = 2 / (period + 1);
  let ema = candles[0].close;
  for (let i = 1; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
  }
  return ema;
}

export function calculateEmaFromNumbers(values: number[], period: number): number | null {
  if (!values || values.length < period) return null;
  const k = 2 / (period + 1);
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }
  return ema;
}

export function calculateRsi(candles: Candle[], period: number = 14): number | null {
  if (!candles || candles.length < period + 1) return null;
  const closes = candles.map(x => x.close);
  let gain = 0;
  let loss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    gain += Math.max(diff, 0);
    loss += Math.max(-diff, 0);
  }

  gain /= period;
  loss /= period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gain = (gain * (period - 1) + Math.max(diff, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-diff, 0)) / period;
  }

  if (loss === 0) return 100;
  const rs = gain / loss;
  return 100 - 100 / (1 + rs);
}

export function calculateMacd(candles: Candle[]): number | null {
  if (!candles || candles.length < 26) return null;
  const closes = candles.map(x => x.close);
  const ema12 = calculateEmaFromNumbers(closes, 12);
  const ema26 = calculateEmaFromNumbers(closes, 26);
  if (ema12 === null || ema26 === null) return null;
  return ema12 - ema26;
}

export function calculateRvol(candles: Candle[], period: number = 20): number | null {
  if (!candles || candles.length < period + 1) return null;
  const slice = candles.slice(-(period + 1));
  const baseVolumeSum = slice.slice(0, period).reduce((acc, c) => acc + c.volume, 0);
  const avgVolume = baseVolumeSum / period;
  if (avgVolume === 0) return null;
  const lastVolume = slice[period].volume;
  return lastVolume / avgVolume;
}

export function calculatePivotLevels(candles: Candle[], currentPrice: number): PivotLevels {
  if (!candles || !candles.length) {
    return { r1: null, r2: null, r3: null, s1: null, s2: null, s3: null };
  }

  const highsAbove = candles
    .map(x => x.high)
    .filter(h => h > currentPrice)
    .sort((a, b) => a - b);

  const lowsBelow = candles
    .map(x => x.low)
    .filter(l => l < currentPrice)
    .sort((a, b) => b - a);

  return {
    r1: highsAbove[0] ?? null,
    r2: highsAbove[1] ?? null,
    r3: highsAbove[2] ?? null,
    s1: lowsBelow[0] ?? null,
    s2: lowsBelow[1] ?? null,
    s3: lowsBelow[2] ?? null,
  };
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
