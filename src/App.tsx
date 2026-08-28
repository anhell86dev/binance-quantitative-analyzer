import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Candle,
  TickerData,
  PivotLevels,
  IndicatorRow,
  TradeStrategy,
  LogEntry,
  BinanceDashboardData,
  OrderFlowAnalysis,
} from './types';
import {
  formatKlines,
  calculateEma,
  calculateRsi,
  calculateMacd,
  calculateRvol,
  calculatePivotLevels,
  generateTradingStrategies,
  calculateOrderFlowMetrics,
} from './utils/indicators';
import {
  fetchMarketData,
  validateSymbol,
  fetchBinanceDashboard,
  executeBinanceTrade,
  fetchFundingRateData,
  extractOpenInterestValue,
} from './utils/marketService';
import { KeyLevels } from './components/KeyLevels';
import { IndicatorMatrix } from './components/IndicatorMatrix';
import { ActionPlan } from './components/ActionPlan';
import { ChartSection } from './components/ChartSection';
import { OrderFlowMetrics } from './components/OrderFlowMetrics';
import { RiskAutomationPanel } from './components/RiskAutomationPanel';
import { MarketScannerTab } from './components/MarketScannerTab';
import { TradingJournalTab } from './components/TradingJournalTab';
import { BinanceWalletTab } from './components/BinanceWalletTab';
import { TradFiMonitorTab } from './components/TradFiMonitorTab';
import { TradFiScannerTab } from './components/TradFiScannerTab';
import { BinanceAuthGate } from './components/BinanceAuthGate';
import { BinanceOrderModal } from './components/BinanceOrderModal';
import { CyclesModal } from './components/CyclesModal';
import { LogTerminal } from './components/LogTerminal';
import {
  Activity,
  BarChart3,
  Wallet,
  Zap,
  Radio,
  BookOpen,
  Waves,
  ShieldAlert,
  Globe,
  Landmark,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
} from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const k = localStorage.getItem('binance_custom_api_key');
      const s = localStorage.getItem('binance_custom_api_secret');
      return Boolean(k && s);
    } catch {
      return false;
    }
  });
  const [activeTab, setActiveTab] = useState<'binance' | 'analysis' | 'tradfi_scanner' | 'tradfi' | 'scanner' | 'journal'>('binance');
  const [symbolInput, setSymbolInput] = useState<string>('BTCUSDT');
  const [activeSymbol, setActiveSymbol] = useState<string>('BTCUSDT');
  const [isLoadingMarket, setIsLoadingMarket] = useState<boolean>(false);
  const [symbolValidationMsg, setSymbolValidationMsg] = useState<{
    text: string;
    type: 'idle' | 'validating' | 'success' | 'error';
  }>({ text: 'RVOL 5m · Inactivo', type: 'idle' });

  // Data states
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [candles, setCandles] = useState<Record<string, Candle[]>>({});
  const [klines1w, setKlines1w] = useState<Candle[]>([]);
  const [openInterest, setOpenInterest] = useState<number | null>(null);
  const [oiHistory, setOiHistory] = useState<{ value: number; time: number }[]>([]);
  const [rvol5m, setRvol5m] = useState<number | null>(null);
  const [showSimultaneousTradFiMini, setShowSimultaneousTradFiMini] = useState<boolean>(true);
  const [fundingRateInfo, setFundingRateInfo] = useState<{
    rate: number;
    predictedRate: number;
    nextFundingTime: number;
    countdownText: string;
    sentiment: 'Altamente Alcista (Longs pagan)' | 'Altamente Bajista (Shorts pagan)' | 'Neutral / Equilibrado';
  }>({
    rate: 0.0001,
    predictedRate: 0.0001,
    nextFundingTime: Date.now() + 1000 * 60 * 60 * 3,
    countdownText: '03:14:22',
    sentiment: 'Neutral / Equilibrado',
  });

  // Strategies and calculations
  const [sr1d, setSr1d] = useState<PivotLevels>({ r1: null, r2: null, r3: null, s1: null, s2: null, s3: null });
  const [sr4h, setSr4h] = useState<PivotLevels>({ r1: null, r2: null, r3: null, s1: null, s2: null, s3: null });
  const [strategies, setStrategies] = useState<TradeStrategy[]>([]);
  const [matrixRows, setMatrixRows] = useState<IndicatorRow[]>([]);
  const [selectedTradeForModal, setSelectedTradeForModal] = useState<TradeStrategy | null>(null);
  const [isCyclesModalOpen, setIsCyclesModalOpen] = useState<boolean>(false);

  // Binance dashboard
  const [binanceData, setBinanceData] = useState<BinanceDashboardData | null>(null);
  const [isLoadingBinance, setIsLoadingBinance] = useState<boolean>(false);
  const [apiConfigured, setApiConfigured] = useState<boolean>(false);
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('binance_custom_api_key') || '';
    } catch {
      return '';
    }
  });
  const [customApiSecret, setCustomApiSecret] = useState<string>(() => {
    try {
      return localStorage.getItem('binance_custom_api_secret') || '';
    } catch {
      return '';
    }
  });

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Timers & WebSockets
  const wsRef = useRef<WebSocket | null>(null);
  const oiTimerRef = useRef<any>(null);
  const scannerTimerRef = useRef<any>(null);

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString();
    const id = Math.random().toString(36).substring(2, 9);
    setLogs(prev => [...prev.slice(-80), { id, time, message, type }]);
  }, []);

  // Compute Order Flow Analysis (CVD, Liquidity Magnets, Liquidation Heatmap)
  const orderFlow: OrderFlowAnalysis = React.useMemo(() => {
    const candles15m = candles['15m'] || candles['5m'] || [];
    const p = currentPrice || (ticker ? parseFloat(ticker.lastPrice) : 0);
    return calculateOrderFlowMetrics({
      candles: candles15m,
      currentPrice: p,
      fundingRateVal: fundingRateInfo.rate,
      nextFundingTime: fundingRateInfo.nextFundingTime,
      countdownText: fundingRateInfo.countdownText,
      sentiment: fundingRateInfo.sentiment,
    });
  }, [candles, currentPrice, ticker, fundingRateInfo]);

  // Compute OI sentiment & trend
  const oiAnalysis = React.useMemo(() => {
    if (oiHistory.length < 2) return { status: null, avg20: null, isConfirmed: false };
    const cur = oiHistory[oiHistory.length - 1].value;
    const prev = oiHistory[oiHistory.length - 2].value;
    const list = oiHistory.slice(-20, -1);
    if (!list.length) return { status: null, avg20: null, isConfirmed: false };

    const avg20 = list.reduce((s, x) => s + x.value, 0) / list.length;
    let status = 'RUIDO DE MERCADO';
    if (cur > prev && cur > avg20) {
      status = 'DINERO NUEVO ENTRANDO';
    } else if (cur < prev && cur < avg20) {
      status = 'CIERRE DE POSICIONES O LIQUIDACIÓN';
    }

    const isConfirmed = Boolean(rvol5m && rvol5m >= 1.5 && cur > prev && cur > avg20);
    return { status, avg20, isConfirmed };
  }, [oiHistory, rvol5m]);

  // Check Danger of Counter-current Liquidation
  const isDanger = React.useMemo(() => {
    if (!rvol5m || !oiAnalysis.avg20 || !openInterest) return false;
    return rvol5m >= 3.0 && openInterest < oiAnalysis.avg20;
  }, [rvol5m, oiAnalysis.avg20, openInterest]);

  // Day Range & Year Range
  const dayRange = React.useMemo(() => {
    if (!ticker) return null;
    return { min: Number(ticker.lowPrice), max: Number(ticker.highPrice) };
  }, [ticker]);

  const yearRange = React.useMemo(() => {
    if (!klines1w.length) return null;
    return {
      min: Math.min(...klines1w.map(k => k.low)),
      max: Math.max(...klines1w.map(k => k.high)),
    };
  }, [klines1w]);

  // Check Binance API Key status on load
  useEffect(() => {
    fetch('/api/binance/status')
      .then(res => {
        if (!res.ok) throw new Error('Servidor API local no detectado');
        return res.json();
      })
      .then(data => {
        setApiConfigured(Boolean(data.configured));
        if (data.configured) {
          addLog(`Binance API configurada en el servidor (Clave: ${data.keyMask})`, 'success');
        } else {
          addLog('Binance API no configurada en servidor. Puedes ingresar tus claves manualmente en la pestaña Mi Cuenta.', 'warn');
        }
      })
      .catch(() => {
        setApiConfigured(false);
      });
  }, [addLog]);

  // WebSocket Live Price Streaming
  const setupPriceStream = useCallback((symbol: string) => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const socket = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@trade`);
      socket.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          const price = parseFloat(data.p);
          if (!isNaN(price)) {
            setCurrentPrice(price);
          }
        } catch (e) {
          // ignore stream parse errors
        }
      };

      socket.onerror = () => {
        addLog(`WebSocket desconectado para ${symbol}`, 'warn');
      };

      wsRef.current = socket;
    } catch (e: any) {
      addLog(`Error al conectar WebSocket: ${e.message}`, 'warn');
    }
  }, [addLog]);

  // Calculate Indicator Matrix & S/R Pivots
  const updateCalculations = useCallback((candlesMap: Record<string, Candle[]>, price: number, rvolVal: number | null) => {
    const timeframes: { id: '1d' | '4h' | '1h' | '15m' | '5m'; label: string; role: string; tfDiv: number }[] = [
      { id: '1d', label: '1D', role: 'Contexto macro', tfDiv: 1 },
      { id: '4h', label: '4H', role: 'Dirección principal', tfDiv: 6 },
      { id: '1h', label: '1H', role: 'Estructura intermedia', tfDiv: 24 },
      { id: '15m', label: '15m', role: 'Gatillo intradía', tfDiv: 96 },
      { id: '5m', label: '5m', role: 'Micro entrada', tfDiv: 288 },
    ];

    const rows: IndicatorRow[] = [];
    timeframes.forEach(t => {
      const c = candlesMap[t.id] || [];
      const ema9 = calculateEma(c, 9);
      const ema21 = calculateEma(c, 21);
      const ema50 = calculateEma(c, 50);
      const ema200 = calculateEma(c, 200);
      const rsi = calculateRsi(c, 14);
      const macd = calculateMacd(c);
      const rvol = t.id === '5m' && rvolVal !== null ? rvolVal : calculateRvol(c, 20);

      let trend: 'Alcista' | 'Bajista' | 'Neutral' | '---' = '---';
      if (ema21 && ema50) {
        if (ema21 > ema50 * 1.001) trend = 'Alcista';
        else if (ema21 < ema50 * 0.999) trend = 'Bajista';
        else trend = 'Neutral';
      }

      const volume = c.length ? c[c.length - 1].volume : null;
      const vol24h = c.length ? c.slice(-t.tfDiv).reduce((s, x) => s + x.volume, 0) : null;

      rows.push({
        tf: t.label,
        role: t.role,
        trend,
        ema9,
        ema21,
        ema50,
        ema200,
        rsi,
        macd,
        volume,
        vol24h,
        rvol,
      });
    });

    setMatrixRows(rows);

    // Compute Pivot S/R
    const sr1 = calculatePivotLevels(candlesMap['1d'] || [], price);
    const sr4 = calculatePivotLevels(candlesMap['4h'] || [], price);
    setSr1d(sr1);
    setSr4h(sr4);

    // Generate Trading Strategies
    const trend1d = rows.find(r => r.tf === '1D')?.trend || '---';
    const trend4h = rows.find(r => r.tf === '4H')?.trend || '---';

    const strats = generateTradingStrategies({
      symbol: activeSymbol,
      currentPrice: price,
      candles1d: candlesMap['1d'] || [],
      candles4h: candlesMap['4h'] || [],
      candles15m: candlesMap['15m'] || [],
      rvol5m: rvolVal,
      sr1d: sr1,
      sr4h: sr4,
      trend1d,
      trend4h,
      isDanger: false,
    });

    setStrategies(strats);
  }, [activeSymbol]);

  // Main Market Data Fetcher & Analyzer
  const runAutoAnalyze = async (symbolOverride?: string) => {
    const s = (symbolOverride || symbolInput).trim().toUpperCase();
    if (!s) return;

    setActiveSymbol(s);
    setSymbolInput(s);
    setIsLoadingMarket(true);
    setSymbolValidationMsg({ text: `Analizando ${s} en Binance Futures...`, type: 'validating' });
    addLog(`Iniciando escaneo multi-temporal para ${s}...`, 'info');

    try {
      const [marketData, fundingData] = await Promise.all([
        fetchMarketData(s),
        fetchFundingRateData(s),
      ]);

      if (!marketData || !marketData.ticker) {
        throw new Error(`No se pudo obtener datos para el par ${s}`);
      }

      setTicker(marketData.ticker);
      const p = parseFloat(marketData.ticker.lastPrice);
      setCurrentPrice(p);
      setCandles(marketData.candles || {});
      setKlines1w(marketData.klines1w || []);
      setFundingRateInfo(fundingData);

      // Open Interest
      if (marketData.oi !== undefined && marketData.oi !== null) {
        const numericOi = extractOpenInterestValue(marketData.oi);
        setOpenInterest(numericOi);
        setOiHistory(prev => [...prev.slice(-30), { value: numericOi, time: Date.now() }]);
      }

      // RVOL 5m
      const c5m = marketData.candles['5m'] || [];
      const rv = calculateRvol(c5m, 20);
      setRvol5m(rv);

      // Update indicator matrix & plan
      updateCalculations(marketData.candles, p, rv);

      // Setup Live stream
      setupPriceStream(s);

      // Setup periodic scan
      setSymbolValidationMsg({ text: `RVOL 5m · Activo para ${s}`, type: 'success' });
      addLog(`✅ Análisis completado con éxito para ${s}. Precio: ${p}`, 'success');
    } catch (err: any) {
      addLog(`❌ Error en análisis: ${err.message}`, 'error');
      setSymbolValidationMsg({ text: `Error: ${err.message}`, type: 'error' });
    } finally {
      setIsLoadingMarket(false);
    }
  };

  // Validate Symbol Real Time
  const handleValidateSymbol = async () => {
    const s = symbolInput.trim().toUpperCase();
    if (!s) return;

    setSymbolValidationMsg({ text: `Validando ${s}...`, type: 'validating' });
    addLog(`Validando reglas de trading para ${s}...`, 'info');

    try {
      const data = await validateSymbol(s);
      setSymbolValidationMsg({
        text: `✅ ${data.symbol} ACTIVO · Tick: ${data.price?.tickSize || '---'} · Lote Min: ${data.quantity?.minQty || '---'}`,
        type: 'success',
      });
      addLog(`✅ Símbolo ${data.symbol} verificado y listo en Binance Futures.`, 'success');
    } catch (err: any) {
      setSymbolValidationMsg({ text: `❌ ${err.message}`, type: 'error' });
      addLog(`❌ Fallo validando ${s}: ${err.message}`, 'error');
    }
  };

  // Fetch Binance Account / Wallet Data
  const syncBinanceWallet = useCallback(async () => {
    setIsLoadingBinance(true);
    addLog('Sincronizando balances y posiciones con Binance...', 'info');

    try {
      const creds = customApiKey && customApiSecret ? { apiKey: customApiKey, apiSecret: customApiSecret } : undefined;
      const data = await fetchBinanceDashboard(activeSymbol, creds);

      if (!data) throw new Error('No se recibieron datos de la billetera');

      setBinanceData(data);
      if (data.configured) {
        addLog('✅ Billetera Binance sincronizada correctamente.', 'success');
      } else {
        addLog('⚠️ API Keys no encontradas. Configura tus claves para ver tus balances reales.', 'warn');
      }
    } catch (err: any) {
      addLog(`❌ Error sincronizando billetera: ${err.message}`, 'error');
    } finally {
      setIsLoadingBinance(false);
    }
  }, [activeSymbol, customApiKey, customApiSecret, addLog]);

  // Execute Live Trade
  const handleExecuteLiveTrade = async (params: any) => {
    addLog(`Enviando orden LIVE ${params.side} para ${params.symbol}...`, 'info');

    try {
      const creds = customApiKey && customApiSecret ? { apiKey: customApiKey, apiSecret: customApiSecret } : undefined;
      const data = await executeBinanceTrade(params, creds);

      if (!data || !data.ok) {
        const msg = data?.message || 'Error desconocido al enviar la orden';
        addLog(`❌ Orden rechazada: ${msg}`, 'error');
        return { ok: false, message: msg };
      }

      addLog(`🚀 ÉXITO LIVE: ${data.message}`, 'success');
      syncBinanceWallet();
      return { ok: true, message: data.message, status: data.status };
    } catch (err: any) {
      addLog(`❌ Orden rechazada: ${err.message}`, 'error');
      return { ok: false, message: err.message };
    }
  };

  // Disconnect Binance Credentials & Logout
  const handleDisconnect = () => {
    try {
      localStorage.removeItem('binance_custom_api_key');
      localStorage.removeItem('binance_custom_api_secret');
    } catch {}
    setCustomApiKey('');
    setCustomApiSecret('');
    setBinanceData(null);
    setIsAuthenticated(false);
    addLog('ℹ️ Sesión cerrada y claves de Binance desconectadas.', 'info');
  };

  // Run initial analyze on mount and sync wallet if authenticated
  useEffect(() => {
    runAutoAnalyze('BTCUSDT');
    if (isAuthenticated) {
      syncBinanceWallet();
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (oiTimerRef.current) clearInterval(oiTimerRef.current);
      if (scannerTimerRef.current) clearTimeout(scannerTimerRef.current);
    };
  }, [isAuthenticated, syncBinanceWallet]);

  // Export analysis JSON
  const handleExportJson = () => {
    const exportData = {
      symbol: activeSymbol,
      price: currentPrice,
      rvol5m,
      openInterest,
      sr1d,
      sr4h,
      strategies,
      orderFlow,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analisis_binance_${activeSymbol}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog(`Archivo JSON exportado para ${activeSymbol}.`, 'success');
  };

  const handleReset = () => {
    runAutoAnalyze(activeSymbol);
  };

  if (!isAuthenticated) {
    return (
      <BinanceAuthGate
        savedApiKey={customApiKey}
        savedApiSecret={customApiSecret}
        onAuthenticated={(k, s) => {
          setCustomApiKey(k);
          setCustomApiSecret(s);
          setIsAuthenticated(true);
          setActiveTab('binance');
          addLog('✅ Autenticado con éxito en Binance Futures.', 'success');
        }}
        onContinueDemo={() => {
          setIsAuthenticated(true);
          setActiveTab('binance');
          addLog('ℹ️ Acceso en modo demostración activo.', 'info');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] text-slate-200 font-sans flex flex-col selection:bg-[#F0B90B] selection:text-[#0B0E11]">
      {/* Top Main Navigation & Search Bar */}
      <header className="border-b border-[#2B313A] bg-[#1E2329]/95 backdrop-blur-md px-4 sm:px-8 py-3.5 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
          {/* Geometric Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#F0B90B] rounded-[3px] flex items-center justify-center shadow-[0_0_12px_rgba(240,185,11,0.35)]">
              <div className="w-4 h-4 border-2 border-[#0B0E11] rotate-45"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-lg text-slate-100">
                  QUANT<span className="text-[#F0B90B] font-light">SYNC</span>
                </span>
                <span className="bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-[2px] uppercase tracking-wider">
                  BINANCE FUTURES LIVE
                </span>
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                BINANCE QUANTITATIVE ANALYZER
              </div>
            </div>
          </div>

          {/* Geometric Navigation Tabs (6 Core Views - Mi Cuenta Binance in Position 1) */}
          <nav className="flex items-center gap-3 sm:gap-5 text-xs font-semibold uppercase tracking-wider overflow-x-auto py-1">
            <button
              onClick={() => {
                setActiveTab('binance');
                syncBinanceWallet();
              }}
              className={`py-2 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'binance'
                  ? 'border-[#F0B90B] text-[#F0B90B] font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-[#F0B90B]" />
              <span>Mi Cuenta Binance</span>
            </button>

            <button
              onClick={() => setActiveTab('analysis')}
              className={`py-2 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'analysis'
                  ? 'border-[#F0B90B] text-[#F0B90B] font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Análisis & Order Flow</span>
            </button>

            <button
              onClick={() => setActiveTab('tradfi_scanner')}
              className={`py-2 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'tradfi_scanner'
                  ? 'border-[#F0B90B] text-[#F0B90B] font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Landmark className="w-3.5 h-3.5 text-[#F0B90B] animate-pulse" />
              <span className="flex items-center gap-1.5">
                <span>Escáner TradFiUSDT</span>
                <span className="bg-[#F0B90B]/20 text-[#F0B90B] text-[9px] px-1 py-0.2 rounded font-mono font-bold border border-[#F0B90B]/30">
                  FUTURES
                </span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('tradfi')}
              className={`py-2 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'tradfi'
                  ? 'border-[#F0B90B] text-[#F0B90B] font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-[#F0B90B]" />
              <span className="flex items-center gap-1">
                <span>TradFi & Macro</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse"></span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`py-2 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'scanner'
                  ? 'border-[#F0B90B] text-[#F0B90B] font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Escáner Cripto</span>
            </button>

            <button
              onClick={() => setActiveTab('journal')}
              className={`py-2 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'journal'
                  ? 'border-[#F0B90B] text-[#F0B90B] font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Bitácora de Trading</span>
            </button>
          </nav>

          {/* Symbol Search, Action & Disconnect */}
          <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
            <div className="relative flex-1 sm:w-44">
              <input
                id="symbolInput"
                type="text"
                value={symbolInput}
                onChange={e => setSymbolInput(e.target.value.toUpperCase())}
                onKeyDown={e => {
                  if (e.key === 'Enter') runAutoAnalyze();
                }}
                placeholder="Ej: BTCUSDT"
                className="w-full bg-[#14171A] border border-[#2B313A] focus:border-[#F0B90B] focus:outline-none rounded-lg px-3 py-2 text-xs text-slate-100 font-mono uppercase tracking-wider placeholder:text-slate-500 transition-colors"
              />
            </div>

            <button
              onClick={handleValidateSymbol}
              className="bg-[#14171A] hover:bg-[#2B313A] border border-[#2B313A] text-slate-300 text-xs px-3 py-2 rounded-lg font-semibold uppercase tracking-wider cursor-pointer transition-colors"
            >
              Validar
            </button>

            {/* Dynamic Binance Yellow Action Button */}
            <button
              id="btnAuto"
              onClick={() => runAutoAnalyze()}
              disabled={isLoadingMarket}
              className="bg-[#F0B90B] hover:bg-[#F0B90B]/90 disabled:opacity-50 text-[#0B0E11] text-xs px-4 py-2 rounded-lg font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(240,185,11,0.3)] hover:shadow-[0_0_18px_rgba(240,185,11,0.5)] transition-all cursor-pointer active:scale-95"
            >
              <Zap className={`w-3.5 h-3.5 ${isLoadingMarket ? 'animate-spin' : ''}`} />
              <span>{isLoadingMarket ? 'Cargando...' : 'Auto-Analizar'}</span>
            </button>

            {/* Logout / Disconnect Button */}
            <button
              onClick={handleDisconnect}
              title="Desconectar Claves de Binance"
              className="bg-[#14171A] hover:bg-red-950/60 border border-[#2B313A] hover:border-red-500/40 text-slate-400 hover:text-red-300 text-xs px-2.5 py-2 rounded-lg font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
              <span className="hidden xl:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Simultaneous Macro Ticker Ribbon (Always Visible Across All Tabs) */}
      <section className="bg-[#14171A] border-b border-[#2B313A] px-4 sm:px-8 py-2 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              onClick={() => setActiveTab('tradfi')}
              className="flex items-center gap-1.5 text-[#F0B90B] hover:text-[#F0B90B]/80 font-bold uppercase tracking-wider cursor-pointer select-none"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>TradFi Live:</span>
            </div>
            <span className="bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30 text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] uppercase tracking-wider">
              RISK-ON
            </span>
          </div>

          <div className="flex items-center gap-5 overflow-x-auto whitespace-nowrap text-[11px] text-slate-300 py-0.5">
            {/* DXY */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">DXY:</span>
              <span className="font-bold text-slate-200 tabular-nums">104.18</span>
              <span className="text-[#0ECB81] font-bold flex items-center text-[10px] tabular-nums">
                <ArrowDownRight className="w-3 h-3" /> -0.38%
              </span>
            </div>

            {/* S&P 500 */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">S&P 500:</span>
              <span className="font-bold text-slate-200 tabular-nums">5,864.2</span>
              <span className="text-[#0ECB81] font-bold flex items-center text-[10px] tabular-nums">
                <ArrowUpRight className="w-3 h-3" /> +0.74%
              </span>
            </div>

            {/* NASDAQ */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">NASDAQ:</span>
              <span className="font-bold text-slate-200 tabular-nums">20,420.5</span>
              <span className="text-[#0ECB81] font-bold flex items-center text-[10px] tabular-nums">
                <ArrowUpRight className="w-3 h-3" /> +1.15%
              </span>
            </div>

            {/* Gold */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Oro / PAXG:</span>
              <span className="font-bold text-slate-200 tabular-nums">$2,748.6</span>
              <span className="text-[#0ECB81] font-bold flex items-center text-[10px] tabular-nums">
                <ArrowUpRight className="w-3 h-3" /> +0.92%
              </span>
            </div>

            {/* US10Y */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">US10Y:</span>
              <span className="font-bold text-slate-200 tabular-nums">4.185%</span>
              <span className="text-[#0ECB81] font-bold flex items-center text-[10px] tabular-nums">
                <ArrowDownRight className="w-3 h-3" /> -1.20%
              </span>
            </div>

            {/* USDT.D */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">USDT.D:</span>
              <span className="font-bold text-slate-200 tabular-nums">4.82%</span>
              <span className="text-[#0ECB81] font-bold flex items-center text-[10px] tabular-nums">
                <ArrowDownRight className="w-3 h-3" /> -0.85%
              </span>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('tradfi')}
            className="text-[10px] text-[#F0B90B] hover:text-[#F0B90B]/80 font-bold uppercase tracking-wider underline underline-offset-2 flex-shrink-0 cursor-pointer hidden md:block"
          >
            Abrir Matriz Completa →
          </button>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 mt-5 pb-16">
        {/* Validation / Status Badge */}
        <div className="flex items-center gap-2.5 text-xs py-1 px-1 mb-3 text-slate-400">
          <div
            className={`w-2 h-2 rounded-full ${
              symbolValidationMsg.type === 'error'
                ? 'bg-[#F6465D]'
                : symbolValidationMsg.type === 'validating'
                ? 'bg-[#F0B90B] animate-spin'
                : 'bg-[#0ECB81] animate-pulse'
            }`}
          />
          <span className="font-mono text-[11px] uppercase tracking-wider">{symbolValidationMsg.text}</span>
        </div>

        {/* Tab 1: Analysis, Order Flow & Risk Automation */}
        {activeTab === 'analysis' && (
          <div className="space-y-5">
            {/* Top Grid: Key Levels + Action Plan */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7">
                <KeyLevels
                  currentPrice={currentPrice}
                  ticker={ticker}
                  openInterest={openInterest}
                  rvol5m={rvol5m}
                  dayRange={dayRange}
                  yearRange={yearRange}
                  sr1d={sr1d}
                  sr4h={sr4h}
                />
              </div>

              <div className="lg:col-span-5">
                <ActionPlan
                  strategies={strategies}
                  rvolConfirmed={oiAnalysis.isConfirmed}
                  rvolValue={rvol5m}
                  oiStatus={oiAnalysis.status}
                  oiAvg20={oiAnalysis.avg20}
                  isDanger={isDanger}
                  onSelectTrade={strat => setSelectedTradeForModal(strat)}
                  onRefreshStrategy={() => updateCalculations(candles, currentPrice || 0, rvol5m)}
                  onReset={handleReset}
                  onExport={handleExportJson}
                />
              </div>
            </div>

            {/* Category 1: Order Flow, CVD & Liquidity Magnets Panel */}
            <OrderFlowMetrics
              orderFlow={orderFlow}
              currentPrice={currentPrice || (ticker ? parseFloat(ticker.lastPrice) : 0)}
              symbol={activeSymbol}
            />

            {/* Category 2: Risk Automation, Sizing Calculator & Emergency Panic Panel */}
            <RiskAutomationPanel
              currentPrice={currentPrice || (ticker ? parseFloat(ticker.lastPrice) : 0)}
              symbol={activeSymbol}
              activeStrategy={strategies[0] || null}
              userBalance={binanceData?.balance?.totalWalletBalance || 1000}
              openPositions={binanceData?.positions || []}
              apiKey={customApiKey}
              apiSecret={customApiSecret}
              onSelectSymbol={sym => {
                setActiveSymbol(sym);
                setSymbolInput(sym);
                runAutoAnalyze(sym);
              }}
              onTradeExecuted={syncBinanceWallet}
              onLogMessage={addLog}
            />

            {/* Timeframe Indicator Matrix */}
            <IndicatorMatrix rows={matrixRows} />

            {/* Interactive Multi-TF Candlestick Chart with TP/SL overlays */}
            <ChartSection
              candles={candles['4h'] || []}
              candlesMap={candles}
              symbol={activeSymbol}
              activeStrategy={strategies[0] || null}
              currentPrice={currentPrice || undefined}
              onOpenCyclesModal={() => setIsCyclesModalOpen(true)}
            />
          </div>
        )}

        {/* Tab 2: TradFiUSDT Binance Futures Multi-Pair Scanner */}
        {activeTab === 'tradfi_scanner' && (
          <TradFiScannerTab
            onSelectSymbol={sym => {
              setActiveSymbol(sym);
              setSymbolInput(sym);
              setActiveTab('analysis');
              runAutoAnalyze(sym);
            }}
            onLogMessage={addLog}
          />
        )}

        {/* Tab 3: TradFi & Macro Matrix Monitor */}
        {activeTab === 'tradfi' && (
          <TradFiMonitorTab
            currentBtcPrice={currentPrice || undefined}
            onSelectCryptoSymbol={sym => {
              setActiveSymbol(sym);
              setSymbolInput(sym);
              setActiveTab('analysis');
              runAutoAnalyze(sym);
            }}
            onOpenTradFiScanner={() => setActiveTab('tradfi_scanner')}
            onLogMessage={addLog}
          />
        )}

        {/* Tab 3: Category 3 Market Scanner Multi-Par */}
        {activeTab === 'scanner' && (
          <MarketScannerTab
            onSelectSymbol={sym => {
              setActiveSymbol(sym);
              setSymbolInput(sym);
              setActiveTab('analysis');
              runAutoAnalyze(sym);
            }}
            onLogMessage={addLog}
          />
        )}

        {/* Tab 4: Category 4 Trading Journal & Performance Analytics */}
        {activeTab === 'journal' && (
          <TradingJournalTab
            binanceTrades={binanceData?.trades || []}
            onLogMessage={addLog}
          />
        )}

        {/* Tab 5: Binance Account Diagnostics & Wallet */}
        {activeTab === 'binance' && (
          <BinanceWalletTab
            data={binanceData}
            isLoading={isLoadingBinance}
            onSync={syncBinanceWallet}
            apiConfigured={apiConfigured || Boolean(customApiKey && customApiSecret)}
            initialApiKey={customApiKey}
            initialApiSecret={customApiSecret}
            onDisconnect={handleDisconnect}
            onSaveCustomKeys={(k, s) => {
              setCustomApiKey(k);
              setCustomApiSecret(s);
              addLog('Claves personalizadas guardadas para esta sesión.', 'success');
              syncBinanceWallet();
            }}
          />
        )}
      </main>


      {/* Geometric Balance Footer */}
      <footer className="h-12 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between px-4 sm:px-8 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
          <span>Gateway: Binance Futures fstream</span>
        </div>
        <div className="hidden sm:block">Motor: Quantitative Matrix v4.2</div>
        <div>Estado: Operativo 24/7</div>
      </footer>

      {/* Interactive Binance Futures Execution Modal */}
      <BinanceOrderModal
        strategy={selectedTradeForModal}
        isOpen={Boolean(selectedTradeForModal)}
        onClose={() => setSelectedTradeForModal(null)}
        onExecuteTrade={handleExecuteLiveTrade}
        isDanger={isDanger}
      />

      {/* Historical Cycles Modal */}
      <CyclesModal
        candles={candles['4h'] || []}
        isOpen={isCyclesModalOpen}
        onClose={() => setIsCyclesModalOpen(false)}
      />

      {/* Live Floating Logs Terminal */}
      <LogTerminal logs={logs} onClear={() => setLogs([])} />
    </div>
  );
}
