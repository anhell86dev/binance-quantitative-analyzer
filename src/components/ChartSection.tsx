import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  AreaSeries,
  BarSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
} from 'lightweight-charts';
import { Candle, MarketStructurePoint, TradeStrategy, PivotLevels } from '../types';
import { calculateMarketStructure, calculateEmaSeries, calculatePivotLevels } from '../utils/indicators';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Calendar,
  Crosshair,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Maximize2,
  Minimize2,
  Camera,
  Eye,
  Sliders,
  BarChart2,
  LineChart,
  ShieldAlert,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Tv,
  Sparkles,
  Info,
} from 'lucide-react';

interface ChartSectionProps {
  candles: Candle[];
  candlesMap?: {
    '1w'?: Candle[];
    '1d'?: Candle[];
    '4h'?: Candle[];
    '1h'?: Candle[];
    '15m'?: Candle[];
    '5m'?: Candle[];
    '1m'?: Candle[];
  };
  symbol: string;
  activeStrategy?: TradeStrategy | null;
  currentPrice?: number;
  sr1d?: PivotLevels;
  sr4h?: PivotLevels;
  onOpenCyclesModal: () => void;
}

export const ChartSection: React.FC<ChartSectionProps> = ({
  candles,
  candlesMap,
  symbol,
  activeStrategy,
  currentPrice,
  sr1d,
  sr4h,
  onOpenCyclesModal,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema9SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Price lines references
  const tpLineRef = useRef<any>(null);
  const slLineRef = useRef<any>(null);
  const entryLineRef = useRef<any>(null);
  const livePriceLineRef = useRef<any>(null);
  const srLinesRef = useRef<any[]>([]);

  // Modes and View Settings
  const [chartViewMode, setChartViewMode] = useState<'quant_pro' | 'tradingview_embed'>('quant_pro');
  const [selectedTf, setSelectedTf] = useState<'1d' | '4h' | '1h' | '15m' | '5m'>('4h');
  const [chartStyle, setChartStyle] = useState<'candlestick' | 'area' | 'line' | 'bar' | 'heikin'>('candlestick');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Indicators toggles
  const [showEmas, setShowEmas] = useState<boolean>(true);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [showLevelsOverlay, setShowLevelsOverlay] = useState<boolean>(true);
  const [showStructureMarkers, setShowStructureMarkers] = useState<boolean>(true);
  const [showSrLevels, setShowSrLevels] = useState<boolean>(true);
  const [srSource, setSrSource] = useState<'1d' | '4h' | 'current'>('1d');
  const [showPivotPoint, setShowPivotPoint] = useState<boolean>(true);

  // Hovered OHLC data for TradingView HUD
  const [hoverData, setHoverData] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    changePct: number;
    timeStr: string;
  } | null>(null);

  // Active candles for selected timeframe
  const activeCandles = useMemo(() => {
    if (candlesMap && candlesMap[selectedTf] && candlesMap[selectedTf]!.length > 0) {
      return candlesMap[selectedTf]!;
    }
    return candles || [];
  }, [candlesMap, selectedTf, candles]);

  // Support & Resistance levels based on selected source (1D, 4H, Current TF)
  const currentSrLevels: PivotLevels = useMemo(() => {
    const basePrice = currentPrice || (activeCandles.length ? activeCandles[activeCandles.length - 1].close : 0);
    if (!basePrice || basePrice <= 0) {
      return { pp: null, r1: null, r2: null, r3: null, s1: null, s2: null, s3: null };
    }

    if (srSource === '1d') {
      if (sr1d && (sr1d.r1 || sr1d.s1)) return sr1d;
      const c1d = candlesMap?.['1d'] || [];
      return calculatePivotLevels(c1d.length ? c1d : activeCandles, basePrice);
    }
    if (srSource === '4h') {
      if (sr4h && (sr4h.r1 || sr4h.s1)) return sr4h;
      const c4h = candlesMap?.['4h'] || [];
      return calculatePivotLevels(c4h.length ? c4h : activeCandles, basePrice);
    }
    // 'current' timeframe
    return calculatePivotLevels(activeCandles, basePrice);
  }, [srSource, sr1d, sr4h, candlesMap, activeCandles, currentPrice]);

  // Format and sort candles with unique UTCTimestamps for Lightweight Charts
  const chartData = useMemo(() => {
    if (!activeCandles || activeCandles.length === 0) return [];

    const map = new Map<number, { time: UTCTimestamp; open: number; high: number; low: number; close: number; volume: number }>();

    activeCandles.forEach(c => {
      if (!c.close || isNaN(c.close)) return;
      const rawSec = Math.floor(c.time > 1e11 ? c.time / 1000 : c.time);
      const time = rawSec as UTCTimestamp;

      if (!map.has(rawSec)) {
        map.set(rawSec, {
          time,
          open: Number(c.open || c.close),
          high: Number(c.high || c.close),
          low: Number(c.low || c.close),
          close: Number(c.close),
          volume: Number(c.volume || 0),
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => (a.time as number) - (b.time as number));
  }, [activeCandles]);

  // Compute Heikin-Ashi if selected
  const heikinAshiData = useMemo(() => {
    if (chartStyle !== 'heikin' || !chartData.length) return [];
    const result: typeof chartData = [];

    chartData.forEach((candle, i) => {
      const haClose = (candle.open + candle.high + candle.low + candle.close) / 4;
      let haOpen: number;
      if (i === 0) {
        haOpen = (candle.open + candle.close) / 2;
      } else {
        haOpen = (result[i - 1].open + result[i - 1].close) / 2;
      }
      const haHigh = Math.max(candle.high, haOpen, haClose);
      const haLow = Math.min(candle.low, haOpen, haClose);

      result.push({
        time: candle.time,
        open: haOpen,
        high: haHigh,
        low: haLow,
        close: haClose,
        volume: candle.volume,
      });
    });

    return result;
  }, [chartData, chartStyle]);

  const displayData = chartStyle === 'heikin' ? heikinAshiData : chartData;

  // Latest candle for fallback HUD
  const latestCandle = useMemo(() => {
    if (!displayData.length) return null;
    const last = displayData[displayData.length - 1];
    const prev = displayData.length > 1 ? displayData[displayData.length - 2] : last;
    const change = last.open > 0 ? ((last.close - last.open) / last.open) * 100 : 0;
    return {
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
      volume: last.volume,
      changePct: change,
      timeStr: new Date((last.time as number) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }, [displayData]);

  // Market structure calculation
  const structurePoints = useMemo(() => {
    if (!activeCandles || activeCandles.length < 5) return [];
    return calculateMarketStructure(activeCandles.slice(-120), 3);
  }, [activeCandles]);

  // Format TradingView Widget Symbol (e.g. BINANCE:BTCUSDT or NASDAQ:AAPL)
  const tradingViewWidgetSymbol = useMemo(() => {
    const s = symbol.toUpperCase().trim();
    if (s.endsWith('USDT') || s.endsWith('BUSD')) {
      return `BINANCE:${s}`;
    }
    return `BINANCE:${s}USDT`;
  }, [symbol]);

  // Initialize and Render Lightweight Charts v5
  useEffect(() => {
    if (chartViewMode !== 'quant_pro') return;
    const container = chartContainerRef.current;
    if (!container) return;

    // Clean previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const width = container.clientWidth || 800;
    const height = isFullscreen ? window.innerHeight - 180 : 480;

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#0B0E11' },
        textColor: '#848E9C',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: 'rgba(43, 49, 58, 0.45)', style: LineStyle.Dotted },
        horzLines: { color: 'rgba(43, 49, 58, 0.45)', style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#F0B90B',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#F0B90B',
        },
        horzLine: {
          color: '#F0B90B',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#F0B90B',
        },
      },
      rightPriceScale: {
        borderColor: '#2B313A',
        scaleMargins: {
          top: 0.08,
          bottom: 0.22, // Reserve lower area for volume
        },
        autoScale: true,
        alignLabels: true,
      },
      timeScale: {
        borderColor: '#2B313A',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        rightOffset: 12,
        barSpacing: 8,
        minBarSpacing: 2,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // 1. Add Main Series based on chartStyle
    let mainSeries: ISeriesApi<any>;

    if (chartStyle === 'area') {
      mainSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(240, 185, 11, 0.4)',
        bottomColor: 'rgba(240, 185, 11, 0.0)',
        lineColor: '#F0B90B',
        lineWidth: 2,
      });
      mainSeries.setData(displayData.map(d => ({ time: d.time, value: d.close })));
    } else if (chartStyle === 'line') {
      mainSeries = chart.addSeries(LineSeries, {
        color: '#00d2ff',
        lineWidth: 2,
      });
      mainSeries.setData(displayData.map(d => ({ time: d.time, value: d.close })));
    } else if (chartStyle === 'bar') {
      mainSeries = chart.addSeries(BarSeries, {
        upColor: '#0ECB81',
        downColor: '#F6465D',
      });
      mainSeries.setData(displayData);
    } else {
      // Default: Candlesticks
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#0ECB81',
        downColor: '#F6465D',
        borderUpColor: '#0ECB81',
        borderDownColor: '#F6465D',
        wickUpColor: '#0ECB81',
        wickDownColor: '#F6465D',
      });
      mainSeries.setData(displayData);
    }

    mainSeriesRef.current = mainSeries;

    // 2. Add Volume Series at the bottom
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume_scale',
      });

      chart.priceScale('volume_scale').applyOptions({
        scaleMargins: {
          top: 0.8, // volume takes bottom 20%
          bottom: 0,
        },
      });

      const volumeData = displayData.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(14, 203, 129, 0.35)' : 'rgba(246, 70, 93, 0.35)',
      }));

      volumeSeries.setData(volumeData);
      volumeSeriesRef.current = volumeSeries;
    }

    // 3. Add EMAs (9, 21, 50, 200)
    if (showEmas && displayData.length > 5) {
      const closes = displayData.map(d => ({ close: d.close, time: d.time }));
      const emaCandles: Candle[] = closes.map(c => ({ time: (c.time as number) * 1000, open: c.close, high: c.close, low: c.close, close: c.close, volume: 0 }));

      const ema9 = calculateEmaSeries(emaCandles, 9);
      const ema21 = calculateEmaSeries(emaCandles, 21);
      const ema50 = calculateEmaSeries(emaCandles, 50);
      const ema200 = calculateEmaSeries(emaCandles, 200);

      const ema9Series = chart.addSeries(LineSeries, { color: '#00d2ff', lineWidth: 1, title: 'EMA 9' });
      const ema21Series = chart.addSeries(LineSeries, { color: '#F0B90B', lineWidth: 2, title: 'EMA 21' });
      const ema50Series = chart.addSeries(LineSeries, { color: '#818cf8', lineWidth: 1, title: 'EMA 50' });
      const ema200Series = chart.addSeries(LineSeries, { color: '#c084fc', lineWidth: 2, title: 'EMA 200' });

      ema9Series.setData(displayData.map((d, i) => ({ time: d.time, value: ema9[i] || d.close })));
      ema21Series.setData(displayData.map((d, i) => ({ time: d.time, value: ema21[i] || d.close })));
      ema50Series.setData(displayData.map((d, i) => ({ time: d.time, value: ema50[i] || d.close })));
      ema200Series.setData(displayData.map((d, i) => ({ time: d.time, value: ema200[i] || d.close })));

      ema9SeriesRef.current = ema9Series;
      ema21SeriesRef.current = ema21Series;
      ema50SeriesRef.current = ema50Series;
      ema200SeriesRef.current = ema200Series;
    }

    // 4. Add TP / SL / Entry Price Lines
    if (showLevelsOverlay && activeStrategy) {
      if (activeStrategy.target > 0) {
        tpLineRef.current = mainSeries.createPriceLine({
          price: activeStrategy.target,
          color: '#0ECB81',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `TP: $${activeStrategy.target.toFixed(2)}`,
        });
      }

      if (activeStrategy.stop > 0) {
        slLineRef.current = mainSeries.createPriceLine({
          price: activeStrategy.stop,
          color: '#F6465D',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `SL: $${activeStrategy.stop.toFixed(2)}`,
        });
      }

      if (activeStrategy.entry > 0) {
        entryLineRef.current = mainSeries.createPriceLine({
          price: activeStrategy.entry,
          color: '#F0B90B',
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `ENTRY: $${activeStrategy.entry.toFixed(2)}`,
        });
      }
    }

    // 5. Add Support & Resistance Price Lines (R3, R2, R1, PP, S1, S2, S3)
    if (showSrLevels && currentSrLevels) {
      const p = currentPrice || (displayData.length ? displayData[displayData.length - 1].close : 0);
      const fmtLevel = (val: number) => val.toFixed(val > 1000 ? 2 : val > 1 ? 4 : 6);
      const pctDiff = (val: number) => {
        if (!p || p <= 0) return '0.00';
        return (((val - p) / p) * 100).toFixed(2);
      };

      // Resistances (R3, R2, R1) - Institutional Red tones
      if (currentSrLevels.r3 && currentSrLevels.r3 > 0) {
        const diff = pctDiff(currentSrLevels.r3);
        const line = mainSeries.createPriceLine({
          price: currentSrLevels.r3,
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `RES 3: $${fmtLevel(currentSrLevels.r3)} (+${diff}%)`,
        });
        srLinesRef.current.push(line);
      }

      if (currentSrLevels.r2 && currentSrLevels.r2 > 0) {
        const diff = pctDiff(currentSrLevels.r2);
        const line = mainSeries.createPriceLine({
          price: currentSrLevels.r2,
          color: '#f87171',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `RES 2: $${fmtLevel(currentSrLevels.r2)} (+${diff}%)`,
        });
        srLinesRef.current.push(line);
      }

      if (currentSrLevels.r1 && currentSrLevels.r1 > 0) {
        const diff = pctDiff(currentSrLevels.r1);
        const line = mainSeries.createPriceLine({
          price: currentSrLevels.r1,
          color: '#fca5a5',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `RES 1 (Inmediata): $${fmtLevel(currentSrLevels.r1)} (+${diff}%)`,
        });
        srLinesRef.current.push(line);
      }

      // Central Pivot Point (PP) - Cyan / Sky Blue
      if (showPivotPoint && currentSrLevels.pp && currentSrLevels.pp > 0) {
        const diff = pctDiff(currentSrLevels.pp);
        const sign = Number(diff) >= 0 ? '+' : '';
        const line = mainSeries.createPriceLine({
          price: currentSrLevels.pp,
          color: '#38bdf8',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `PIVOTE (PP): $${fmtLevel(currentSrLevels.pp)} (${sign}${diff}%)`,
        });
        srLinesRef.current.push(line);
      }

      // Supports (S1, S2, S3) - Institutional Green / Emerald tones
      if (currentSrLevels.s1 && currentSrLevels.s1 > 0) {
        const diff = pctDiff(currentSrLevels.s1);
        const line = mainSeries.createPriceLine({
          price: currentSrLevels.s1,
          color: '#6ee7b7',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `SOP 1 (Inmediato): $${fmtLevel(currentSrLevels.s1)} (${diff}%)`,
        });
        srLinesRef.current.push(line);
      }

      if (currentSrLevels.s2 && currentSrLevels.s2 > 0) {
        const diff = pctDiff(currentSrLevels.s2);
        const line = mainSeries.createPriceLine({
          price: currentSrLevels.s2,
          color: '#34d399',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `SOP 2: $${fmtLevel(currentSrLevels.s2)} (${diff}%)`,
        });
        srLinesRef.current.push(line);
      }

      if (currentSrLevels.s3 && currentSrLevels.s3 > 0) {
        const diff = pctDiff(currentSrLevels.s3);
        const line = mainSeries.createPriceLine({
          price: currentSrLevels.s3,
          color: '#10b981',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `SOP 3: $${fmtLevel(currentSrLevels.s3)} (${diff}%)`,
        });
        srLinesRef.current.push(line);
      }
    }

    // 6. Add Live Current Price Line if available
    if (currentPrice && currentPrice > 0) {
      livePriceLineRef.current = mainSeries.createPriceLine({
        price: currentPrice,
        color: '#F0B90B',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `LIVE: $${currentPrice.toFixed(currentPrice > 1000 ? 2 : 4)}`,
      });
    }

    // 7. Crosshair Move Handler for TradingView HUD Bar
    chart.subscribeCrosshairMove(param => {
      if (!param || !param.time || !param.seriesData) {
        setHoverData(null);
        return;
      }

      const barData: any = param.seriesData.get(mainSeries);
      if (barData) {
        const open = barData.open !== undefined ? barData.open : barData.value;
        const close = barData.close !== undefined ? barData.close : barData.value;
        const high = barData.high !== undefined ? barData.high : Math.max(open, close);
        const low = barData.low !== undefined ? barData.low : Math.min(open, close);
        const changePct = open > 0 ? ((close - open) / open) * 100 : 0;

        let vol = 0;
        if (volumeSeriesRef.current) {
          const vData: any = param.seriesData.get(volumeSeriesRef.current);
          if (vData && vData.value) vol = vData.value;
        }

        const date = new Date((param.time as number) * 1000);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });

        setHoverData({ open, high, low, close, volume: vol, changePct, timeStr });
      }
    });

    // Resize Observer for perfect responsiveness
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      const { width: newWidth } = entries[0].contentRect;
      if (newWidth > 0 && chartRef.current) {
        chartRef.current.applyOptions({
          width: newWidth,
          height: isFullscreen ? window.innerHeight - 180 : 480,
        });
      }
    });

    resizeObserver.observe(container);

    // Initial Fit
    chart.timeScale().fitContent();

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [
    chartViewMode,
    displayData,
    chartStyle,
    showVolume,
    showEmas,
    showLevelsOverlay,
    showSrLevels,
    currentSrLevels,
    showPivotPoint,
    srSource,
    activeStrategy,
    currentPrice,
    isFullscreen,
  ]);

  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  const handleZoomIn = () => {
    if (chartRef.current) {
      const ts = chartRef.current.timeScale();
      const range = ts.getVisibleLogicalRange();
      if (range) {
        const span = range.to - range.from;
        ts.setVisibleLogicalRange({
          from: range.from + span * 0.15,
          to: range.to - span * 0.15,
        });
      }
    }
  };

  const handleZoomOut = () => {
    if (chartRef.current) {
      const ts = chartRef.current.timeScale();
      const range = ts.getVisibleLogicalRange();
      if (range) {
        const span = range.to - range.from;
        ts.setVisibleLogicalRange({
          from: range.from - span * 0.2,
          to: range.to + span * 0.2,
        });
      }
    }
  };

  const handleTakeScreenshot = () => {
    if (!chartContainerRef.current) return;
    const canvas = chartContainerRef.current.querySelector('canvas');
    if (!canvas) return;

    const img = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${symbol}_${selectedTf}_TradingView_${Date.now()}.png`;
    link.href = img;
    link.click();
  };

  const activeHud = hoverData || latestCandle;
  const isUp = activeHud ? activeHud.close >= activeHud.open : true;

  return (
    <div
      className={`bg-[#1E2329] border border-[#2B313A] rounded-xl p-4 sm:p-5 shadow-2xl space-y-3 relative transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 p-6 bg-[#0B0E11] rounded-none overflow-y-auto' : ''
      }`}
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#F0B90B] via-[#0ECB81] to-[#F0B90B]"></div>

      {/* Header & Mode Switcher */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pb-2 border-b border-[#2B313A]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="p-2 bg-[#F0B90B]/10 border border-[#F0B90B]/30 rounded-lg">
            <Tv className="w-4 h-4 text-[#F0B90B]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs uppercase tracking-widest text-slate-200 font-bold m-0 flex items-center gap-1.5">
                Gráfico Profesional TradingView
              </h2>
              <span className="bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/30 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                {symbol} ({selectedTf.toUpperCase()})
              </span>
            </div>
            <p className="text-[11px] text-slate-400 m-0">
              Motor interactivo TradingView con análisis cuantitativo, medias móviles institucionales y libro de niveles.
            </p>
          </div>
        </div>

        {/* View mode toggle (Quant Pro vs Official TradingView Widget) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-[#14171A] p-1 rounded-lg border border-[#2B313A] text-xs font-mono">
            <button
              onClick={() => setChartViewMode('quant_pro')}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                chartViewMode === 'quant_pro'
                  ? 'bg-[#F0B90B] text-[#0B0E11] shadow-[0_0_10px_rgba(240,185,11,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>TradingView Quant Pro</span>
            </button>
            <button
              onClick={() => setChartViewMode('tradingview_embed')}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                chartViewMode === 'tradingview_embed'
                  ? 'bg-[#F0B90B] text-[#0B0E11] shadow-[0_0_10px_rgba(240,185,11,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>TradingView Avanzado (Dibujos)</span>
            </button>
          </div>

          {/* Cycles Modal Action Button */}
          <button
            onClick={onOpenCyclesModal}
            className="bg-[#14171A] hover:bg-[#F0B90B] border border-[#2B313A] hover:border-[#F0B90B] text-slate-200 hover:text-[#0B0E11] text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
          >
            <Calendar className="w-3.5 h-3.5" /> Ciclos
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-[#14171A] border border-[#2B313A] text-slate-300 hover:text-white rounded-lg cursor-pointer transition-colors"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Toolbar & Timeframe Controls (for Quant Pro) */}
      {chartViewMode === 'quant_pro' && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#14171A] p-2 rounded-lg border border-[#2B313A]">
          {/* Timeframe Chips */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 uppercase font-mono mr-1 hidden sm:inline">TF:</span>
            {(['1d', '4h', '1h', '15m', '5m'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setSelectedTf(tf)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedTf === tf
                    ? 'bg-[#F0B90B] text-[#0B0E11] shadow-[0_0_8px_rgba(240,185,11,0.3)]'
                    : 'text-slate-400 hover:text-white hover:bg-[#2B313A]'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Chart Styles (Candles, Line, Area, Bars, Heikin-Ashi) */}
          <div className="flex items-center gap-1">
            <select
              value={chartStyle}
              onChange={e => setChartStyle(e.target.value as any)}
              className="bg-[#1E2329] text-slate-200 border border-[#2B313A] rounded px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-[#F0B90B] cursor-pointer"
            >
              <option value="candlestick">🕯️ Velas Japonesas</option>
              <option value="heikin">📊 Heikin-Ashi</option>
              <option value="area">📈 Gráfico de Área</option>
              <option value="line">📉 Gráfico de Línea</option>
              <option value="bar">||| Gráfico de Barras</option>
            </select>
          </div>

          {/* Indicators Toggles */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowEmas(!showEmas)}
              className={`px-2 py-1 rounded border text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all ${
                showEmas
                  ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-300'
                  : 'bg-[#1E2329] border-[#2B313A] text-slate-400 hover:border-slate-500'
              }`}
              title="Medias Móviles EMAs 9, 21, 50, 200"
            >
              <Activity className="w-3 h-3" />
              <span>EMAs</span>
            </button>

            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`px-2 py-1 rounded border text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all ${
                showVolume
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                  : 'bg-[#1E2329] border-[#2B313A] text-slate-400 hover:border-slate-500'
              }`}
              title="Volumen institucional inferior"
            >
              <BarChart2 className="w-3 h-3" />
              <span>VOL</span>
            </button>

            <button
              onClick={() => setShowLevelsOverlay(!showLevelsOverlay)}
              className={`px-2 py-1 rounded border text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all ${
                showLevelsOverlay
                  ? 'bg-[#1E2329] border-[#F0B90B]/60 text-[#F0B90B]'
                  : 'bg-[#1E2329] border-[#2B313A] text-slate-400 hover:border-slate-500'
              }`}
              title="Niveles de Take Profit y Stop Loss de la estrategia"
            >
              <Crosshair className="w-3 h-3" />
              <span>TP/SL</span>
            </button>

            {/* S/R Toggle Button */}
            <button
              onClick={() => setShowSrLevels(!showSrLevels)}
              className={`px-2 py-1 rounded border text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all ${
                showSrLevels
                  ? 'bg-[#F0B90B]/20 border-[#F0B90B] text-[#F0B90B] shadow-[0_0_10px_rgba(240,185,11,0.25)]'
                  : 'bg-[#1E2329] border-[#2B313A] text-slate-400 hover:border-slate-500'
              }`}
              title="Soportes y Resistencias Cuantitativos (R1, R2, R3, S1, S2, S3, PP)"
            >
              <Shield className="w-3 h-3" />
              <span>S/R</span>
            </button>

            {/* S/R Source Selector */}
            {showSrLevels && (
              <div className="flex items-center bg-[#1E2329] border border-[#2B313A] rounded p-0.5 text-[10px] font-mono">
                <button
                  onClick={() => setSrSource('1d')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    srSource === '1d' ? 'bg-[#F0B90B] text-[#0B0E11] font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Soportes y Resistencias Diarios (1D Institucional)"
                >
                  1D
                </button>
                <button
                  onClick={() => setSrSource('4h')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    srSource === '4h' ? 'bg-[#F0B90B] text-[#0B0E11] font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Soportes y Resistencias de 4 Horas (4H Swing)"
                >
                  4H
                </button>
                <button
                  onClick={() => setSrSource('current')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    srSource === 'current' ? 'bg-[#F0B90B] text-[#0B0E11] font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Soportes y Resistencias del Timeframe Actual"
                >
                  TF
                </button>
              </div>
            )}
          </div>

          {/* Zoom & Utility Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-400 hover:text-white bg-[#1E2329] hover:bg-[#2B313A] border border-[#2B313A] rounded cursor-pointer transition-colors"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-400 hover:text-white bg-[#1E2329] hover:bg-[#2B313A] border border-[#2B313A] rounded cursor-pointer transition-colors"
              title="Reducir zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 text-slate-400 hover:text-white bg-[#1E2329] hover:bg-[#2B313A] border border-[#2B313A] rounded cursor-pointer transition-colors"
              title="Restablecer vista a velas actuales"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleTakeScreenshot}
              className="p-1.5 text-slate-400 hover:text-[#F0B90B] bg-[#1E2329] hover:bg-[#2B313A] border border-[#2B313A] rounded cursor-pointer transition-colors"
              title="Descargar captura en alta resolución"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* TradingView Live HUD (OHLCV + Change) */}
      {chartViewMode === 'quant_pro' && activeHud && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-[#0B0E11] px-3 py-1.5 rounded-lg border border-[#2B313A] font-mono text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-200">{symbol}</span>
            <span className="text-[10px] text-slate-500">({selectedTf.toUpperCase()})</span>
          </div>
          <div>
            <span className="text-slate-500 mr-1">O:</span>
            <span className="text-slate-200 font-bold">${activeHud.open.toFixed(activeHud.open > 1000 ? 2 : 4)}</span>
          </div>
          <div>
            <span className="text-slate-500 mr-1">H:</span>
            <span className="text-[#0ECB81] font-bold">${activeHud.high.toFixed(activeHud.high > 1000 ? 2 : 4)}</span>
          </div>
          <div>
            <span className="text-slate-500 mr-1">L:</span>
            <span className="text-[#F6465D] font-bold">${activeHud.low.toFixed(activeHud.low > 1000 ? 2 : 4)}</span>
          </div>
          <div>
            <span className="text-slate-500 mr-1">C:</span>
            <span className={isUp ? 'text-[#0ECB81] font-bold' : 'text-[#F6465D] font-bold'}>
              ${activeHud.close.toFixed(activeHud.close > 1000 ? 2 : 4)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 mr-1">Var:</span>
            <span className={isUp ? 'text-[#0ECB81] font-bold' : 'text-[#F6465D] font-bold'}>
              {activeHud.changePct >= 0 ? '+' : ''}
              {activeHud.changePct.toFixed(2)}%
            </span>
          </div>
          {activeHud.volume > 0 && (
            <div>
              <span className="text-slate-500 mr-1">Vol:</span>
              <span className="text-[#F0B90B] font-bold">{activeHud.volume.toLocaleString('en-US', { maximumFractionDigits: 1 })}</span>
            </div>
          )}
          {activeHud.timeStr && (
            <div className="text-[10px] text-slate-500 ml-auto hidden sm:block">
              {activeHud.timeStr}
            </div>
          )}
        </div>
      )}

      {/* Main Chart Rendering Area */}
      {chartViewMode === 'quant_pro' ? (
        <div
          ref={chartContainerRef}
          className={`w-full bg-[#0B0E11] border border-[#2B313A] rounded-xl relative overflow-hidden shadow-inner ${
            isFullscreen ? 'h-[calc(100vh-260px)]' : 'h-[480px]'
          }`}
        >
          {displayData.length === 0 && (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs space-y-2">
              <Layers className="w-8 h-8 text-[#F0B90B]/60 animate-bounce" />
              <span>Cargando velas institucionales de {symbol} ({selectedTf.toUpperCase()})...</span>
            </div>
          )}
        </div>
      ) : (
        /* OFFICIAL TRADINGVIEW EMBEDDED ADVANCED WIDGET */
        <div
          className={`w-full bg-[#0B0E11] border border-[#2B313A] rounded-xl relative overflow-hidden shadow-inner ${
            isFullscreen ? 'h-[calc(100vh-220px)]' : 'h-[580px]'
          }`}
        >
          <iframe
            key={tradingViewWidgetSymbol}
            src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${encodeURIComponent(
              tradingViewWidgetSymbol
            )}&interval=60&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=14171A&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=es&utm_source=localhost`}
            className="w-full h-full border-0"
            allowFullScreen
            title={`TradingView Advanced Chart for ${symbol}`}
          />
        </div>
      )}

      {/* Support & Resistance Interactive Quick Strip */}
      {chartViewMode === 'quant_pro' && showSrLevels && (
        <div className="bg-[#14171A] border border-[#2B313A] rounded-lg p-3 space-y-2 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#2B313A]/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F0B90B] animate-pulse"></span>
              <span className="font-bold text-slate-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#F0B90B]" />
                Soportes & Resistencias ({srSource === '1d' ? '1D Diario' : srSource === '4h' ? '4H Swing' : `TF ${selectedTf.toUpperCase()}`})
              </span>
            </div>

            {/* Quick S/R Context Status Badge */}
            {currentPrice && currentSrLevels && (
              <div className="text-[10px]">
                {currentSrLevels.r2 && currentPrice >= currentSrLevels.r2 ? (
                  <span className="bg-red-950/60 border border-red-500/40 text-red-400 px-2 py-0.5 rounded font-bold">
                    ⚠️ Sobre Resistencia R2 (Zona de Extensión / Toma de Beneficios)
                  </span>
                ) : currentSrLevels.r1 && currentPrice >= currentSrLevels.r1 ? (
                  <span className="bg-amber-950/60 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded font-bold">
                    🚀 Testeando / Superando Resistencia R1
                  </span>
                ) : currentSrLevels.s2 && currentPrice <= currentSrLevels.s2 ? (
                  <span className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 rounded font-bold">
                    🛡️ Zona de Soporte Mayor S2 (Oportunidad de Rebote)
                  </span>
                ) : currentSrLevels.s1 && currentPrice <= currentSrLevels.s1 ? (
                  <span className="bg-teal-950/60 border border-teal-500/40 text-teal-300 px-2 py-0.5 rounded font-bold">
                    🟢 En Soporte Inmediato S1
                  </span>
                ) : (
                  <span className="bg-slate-800/60 border border-slate-700 text-slate-300 px-2 py-0.5 rounded font-bold">
                    ⚖️ En Canal Neutral entre SOP 1 y RES 1
                  </span>
                )}
              </div>
            )}
          </div>

          {/* S/R Grid: Resistances (Red), Pivot (Cyan), Supports (Green) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-7 gap-2 text-center text-[11px]">
            {/* R3 */}
            <div className="bg-[#1E2329] border border-red-900/40 rounded p-1.5 flex flex-col justify-center">
              <span className="text-[10px] text-red-400 font-bold uppercase">RES 3 (Fuerte)</span>
              <span className="text-slate-100 font-bold mt-0.5">
                {currentSrLevels.r3 ? `$${currentSrLevels.r3.toFixed(currentSrLevels.r3 > 1000 ? 2 : 4)}` : '---'}
              </span>
              {currentPrice && currentSrLevels.r3 && (
                <span className="text-[10px] text-red-400/90 font-mono">
                  +{(((currentSrLevels.r3 - currentPrice) / currentPrice) * 100).toFixed(2)}%
                </span>
              )}
            </div>

            {/* R2 */}
            <div className="bg-[#1E2329] border border-red-800/40 rounded p-1.5 flex flex-col justify-center">
              <span className="text-[10px] text-red-400 font-bold uppercase">RES 2</span>
              <span className="text-slate-100 font-bold mt-0.5">
                {currentSrLevels.r2 ? `$${currentSrLevels.r2.toFixed(currentSrLevels.r2 > 1000 ? 2 : 4)}` : '---'}
              </span>
              {currentPrice && currentSrLevels.r2 && (
                <span className="text-[10px] text-red-400/90 font-mono">
                  +{(((currentSrLevels.r2 - currentPrice) / currentPrice) * 100).toFixed(2)}%
                </span>
              )}
            </div>

            {/* R1 */}
            <div className="bg-[#1E2329] border border-rose-700/40 rounded p-1.5 flex flex-col justify-center">
              <span className="text-[10px] text-rose-300 font-bold uppercase">RES 1 (Inmediata)</span>
              <span className="text-slate-100 font-bold mt-0.5">
                {currentSrLevels.r1 ? `$${currentSrLevels.r1.toFixed(currentSrLevels.r1 > 1000 ? 2 : 4)}` : '---'}
              </span>
              {currentPrice && currentSrLevels.r1 && (
                <span className="text-[10px] text-rose-400 font-mono">
                  +{(((currentSrLevels.r1 - currentPrice) / currentPrice) * 100).toFixed(2)}%
                </span>
              )}
            </div>

            {/* PP (Pivote) */}
            <div className="bg-[#1E2329] border border-cyan-700/40 rounded p-1.5 flex flex-col justify-center bg-gradient-to-b from-cyan-950/20 to-transparent">
              <span className="text-[10px] text-cyan-400 font-bold uppercase">PIVOTE (PP)</span>
              <span className="text-cyan-200 font-bold mt-0.5">
                {currentSrLevels.pp ? `$${currentSrLevels.pp.toFixed(currentSrLevels.pp > 1000 ? 2 : 4)}` : '---'}
              </span>
              {currentPrice && currentSrLevels.pp && (
                <span className="text-[10px] text-cyan-300 font-mono">
                  {currentSrLevels.pp >= currentPrice ? '+' : ''}
                  {(((currentSrLevels.pp - currentPrice) / currentPrice) * 100).toFixed(2)}%
                </span>
              )}
            </div>

            {/* S1 */}
            <div className="bg-[#1E2329] border border-emerald-700/40 rounded p-1.5 flex flex-col justify-center">
              <span className="text-[10px] text-emerald-300 font-bold uppercase">SOP 1 (Inmediato)</span>
              <span className="text-slate-100 font-bold mt-0.5">
                {currentSrLevels.s1 ? `$${currentSrLevels.s1.toFixed(currentSrLevels.s1 > 1000 ? 2 : 4)}` : '---'}
              </span>
              {currentPrice && currentSrLevels.s1 && (
                <span className="text-[10px] text-emerald-400 font-mono">
                  {(((currentSrLevels.s1 - currentPrice) / currentPrice) * 100).toFixed(2)}%
                </span>
              )}
            </div>

            {/* S2 */}
            <div className="bg-[#1E2329] border border-emerald-800/40 rounded p-1.5 flex flex-col justify-center">
              <span className="text-[10px] text-emerald-400 font-bold uppercase">SOP 2</span>
              <span className="text-slate-100 font-bold mt-0.5">
                {currentSrLevels.s2 ? `$${currentSrLevels.s2.toFixed(currentSrLevels.s2 > 1000 ? 2 : 4)}` : '---'}
              </span>
              {currentPrice && currentSrLevels.s2 && (
                <span className="text-[10px] text-emerald-400/90 font-mono">
                  {(((currentSrLevels.s2 - currentPrice) / currentPrice) * 100).toFixed(2)}%
                </span>
              )}
            </div>

            {/* S3 */}
            <div className="bg-[#1E2329] border border-emerald-900/40 rounded p-1.5 flex flex-col justify-center">
              <span className="text-[10px] text-emerald-400 font-bold uppercase">SOP 3 (Fuerte)</span>
              <span className="text-slate-100 font-bold mt-0.5">
                {currentSrLevels.s3 ? `$${currentSrLevels.s3.toFixed(currentSrLevels.s3 > 1000 ? 2 : 4)}` : '---'}
              </span>
              {currentPrice && currentSrLevels.s3 && (
                <span className="text-[10px] text-emerald-400/90 font-mono">
                  {(((currentSrLevels.s3 - currentPrice) / currentPrice) * 100).toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Indicator & Legend Reference Bar */}
      {chartViewMode === 'quant_pro' && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono pt-1">
          <div className="flex flex-wrap items-center gap-3">
            {/* EMA Legends */}
            {showEmas && (
              <div className="flex items-center gap-2.5 bg-[#14171A] px-2.5 py-1 rounded border border-[#2B313A] text-[10px]">
                <span className="flex items-center gap-1 text-[#00d2ff]">
                  <span className="w-2.5 h-0.5 bg-[#00d2ff] inline-block"></span>EMA 9
                </span>
                <span className="flex items-center gap-1 text-[#F0B90B]">
                  <span className="w-2.5 h-0.5 bg-[#F0B90B] inline-block"></span>EMA 21
                </span>
                <span className="flex items-center gap-1 text-[#818cf8]">
                  <span className="w-2.5 h-0.5 bg-[#818cf8] inline-block"></span>EMA 50
                </span>
                <span className="flex items-center gap-1 text-[#c084fc]">
                  <span className="w-2.5 h-0.5 bg-[#c084fc] inline-block"></span>EMA 200
                </span>
              </div>
            )}

            {/* S/R Lines Legends */}
            {showSrLevels && (
              <div className="flex items-center gap-2.5 bg-[#14171A] px-2.5 py-1 rounded border border-[#2B313A] text-[10px]">
                <span className="flex items-center gap-1 text-red-400">
                  <span className="w-2.5 h-0.5 bg-red-500 inline-block border-b border-dashed border-red-300"></span>Resistencias (R1-R3)
                </span>
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-2.5 h-0.5 bg-cyan-400 inline-block"></span>Pivote Central (PP)
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-0.5 bg-emerald-500 inline-block border-b border-dashed border-emerald-300"></span>Soportes (S1-S3)
                </span>
              </div>
            )}

            {/* Candlestick colors */}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[#0ECB81] text-[10px]">
                <span className="w-2 h-2 rounded-sm bg-[#0ECB81] inline-block"></span>Alcista
              </span>
              <span className="flex items-center gap-1 text-[#F6465D] text-[10px]">
                <span className="w-2 h-2 rounded-sm bg-[#F6465D] inline-block"></span>Bajista
              </span>
            </div>
          </div>

          {/* Strategy Overlays Legend */}
          {activeStrategy && showLevelsOverlay && (
            <div className="flex items-center gap-3 text-[10px]">
              <span className="text-[#0ECB81] font-bold">-- TP: ${activeStrategy.target.toFixed(2)}</span>
              <span className="text-[#F0B90B] font-bold">-- ENTRY: ${activeStrategy.entry.toFixed(2)}</span>
              <span className="text-[#F6465D] font-bold">-- SL: ${activeStrategy.stop.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
