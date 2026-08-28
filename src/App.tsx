import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Candle,
  TickerData,
  PivotLevels,
  IndicatorRow,
  TradeStrategy,
  LogEntry,
  BinanceDashboardData,
} from './types';
import {
  formatKlines,
  calculateEma,
  calculateRsi,
  calculateMacd,
  calculateRvol,
  calculatePivotLevels,
  generateTradingStrategies,
} from './utils/indicators';
import { KeyLevels } from './components/KeyLevels';
import { IndicatorMatrix } from './components/IndicatorMatrix';
import { ActionPlan } from './components/ActionPlan';
import { ChartSection } from './components/ChartSection';
import { BinanceWalletTab } from './components/BinanceWalletTab';
import { BinanceOrderModal } from './components/BinanceOrderModal';
import { CyclesModal } from './components/CyclesModal';
import { LogTerminal } from './components/LogTerminal';
import {
  Activity,
  BarChart3,
  Wallet,
  Zap,
  Search,
  CheckCircle,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'analysis' | 'binance'>('analysis');
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
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [customApiSecret, setCustomApiSecret] = useState<string>('');

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
      .then(res => res.json())
      .then(data => {
        setApiConfigured(data.configured);
        if (data.configured) {
          addLog(`Binance API configurada en el servidor (Clave: ${data.keyMask})`, 'success');
        } else {
          addLog('Binance API no configurada en variables de entorno. Puedes ingresar tus claves manualmente en la pestaña Mi Cuenta.', 'warn');
        }
      })
      .catch(err => {
        addLog(`Error verificando API Binance: ${err.message}`, 'warn');
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

  // Main Auto-Analyze function
  const runAutoAnalyze = async (symbolToAnalyze?: string) => {
    const s = (symbolToAnalyze || symbolInput).trim().toUpperCase();
    if (!s) {
      addLog('Ingresa un símbolo primero (ej. BTCUSDT).', 'warn');
      return;
    }

    setIsLoadingMarket(true);
    setActiveSymbol(s);
    addLog(`====== Iniciando Auto-Análisis para ${s} ======`, 'info');

    try {
      const resp = await fetch(`/api/market-data?symbol=${s}`);
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Error al obtener datos del mercado');
      }

      const data = await resp.json();
      if (!data.ticker || data.ticker.code) {
        throw new Error(data.ticker?.msg || 'Símbolo no encontrado en Binance Futures');
      }

      const p = parseFloat(data.ticker.lastPrice);
      setTicker(data.ticker);
      setCurrentPrice(p);

      const parsedWeekly = formatKlines(data.klines1w);
      setKlines1w(parsedWeekly);

      const candlesMap: Record<string, Candle[]> = {};
      Object.keys(data.candles).forEach(tf => {
        candlesMap[tf] = formatKlines(data.candles[tf]);
      });
      setCandles(candlesMap);

      // RVOL 5m
      const calculatedRvol5m = calculateRvol(candlesMap['5m'], 20);
      setRvol5m(calculatedRvol5m);

      // Open interest
      if (data.oi?.openInterest) {
        const oiVal = parseFloat(data.oi.openInterest);
        setOpenInterest(oiVal);
        setOiHistory(prev => [...prev.slice(-30), { value: oiVal, time: Date.now() }]);
      }

      // Calculations
      updateCalculations(candlesMap, p, calculatedRvol5m);

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
      const res = await fetch(`/api/validate-symbol?symbol=${s}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSymbolValidationMsg({
        text: `✅ ${data.symbol} ACTIVO · Tick: ${data.price?.tickSize} · Lote Min: ${data.quantity?.minQty}`,
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
      const headers: Record<string, string> = {};
      if (customApiKey && customApiSecret) {
        headers['x-binance-api-key'] = customApiKey;
        headers['x-binance-api-secret'] = customApiSecret;
      }

      const res = await fetch(`/api/binance/dashboard?symbol=${activeSymbol}`, { headers });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error conectando con Binance');

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

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customApiKey && customApiSecret) {
      headers['x-binance-api-key'] = customApiKey;
      headers['x-binance-api-secret'] = customApiSecret;
    }

    const res = await fetch('/api/binance/trade', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      addLog(`❌ Orden rechazada: ${data.message}`, 'error');
      return { ok: false, message: data.message };
    }

    addLog(`🚀 ÉXITO LIVE: ${data.message}`, 'success');
    // Refresh wallet
    syncBinanceWallet();
    return { ok: true, message: data.message, status: data.status };
  };

  // Run initial analyze on mount
  useEffect(() => {
    runAutoAnalyze('BTCUSDT');

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (oiTimerRef.current) clearInterval(oiTimerRef.current);
      if (scannerTimerRef.current) clearTimeout(scannerTimerRef.current);
    };
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Top Main Navigation & Search Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 sm:px-8 py-3.5 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
          {/* Geometric Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-sm flex items-center justify-center shadow-sm">
              <div className="w-4 h-4 border-2 border-slate-950 rotate-45"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-lg text-slate-100">
                  QUANT<span className="text-amber-500 font-light">SYNC</span>
                </span>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">
                  BINANCE FUTURES LIVE
                </span>
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                DIAGNOSTICS & QUANTITATIVE MATRIX
              </div>
            </div>
          </div>

          {/* Geometric Navigation Tabs */}
          <nav className="flex items-center gap-6 text-xs font-semibold uppercase tracking-wider">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`py-2 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'analysis'
                  ? 'border-amber-500 text-slate-100 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Análisis & Gráficos</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('binance');
                syncBinanceWallet();
              }}
              className={`py-2 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'binance'
                  ? 'border-amber-500 text-slate-100 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Mi Cuenta Binance</span>
            </button>
          </nav>

          {/* Symbol Search & Action */}
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
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 focus:outline-none rounded-lg px-3 py-2 text-xs text-slate-100 font-mono uppercase tracking-wider placeholder:text-slate-600 transition-colors"
              />
            </div>

            <button
              onClick={handleValidateSymbol}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs px-3 py-2 rounded-lg font-semibold uppercase tracking-wider cursor-pointer transition-colors"
            >
              Validar
            </button>

            <button
              id="btnAuto"
              onClick={() => runAutoAnalyze()}
              disabled={isLoadingMarket}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs px-4 py-2 rounded-lg font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Zap className={`w-3.5 h-3.5 ${isLoadingMarket ? 'animate-spin' : ''}`} />
              <span>{isLoadingMarket ? 'Cargando...' : 'Auto-Analizar'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 mt-5 pb-16">
        {/* Validation / Status Badge */}
        <div className="flex items-center gap-2.5 text-xs py-1 px-1 mb-3 text-slate-400">
          <div
            className={`w-2 h-2 rounded-full ${
              symbolValidationMsg.type === 'error'
                ? 'bg-red-500'
                : symbolValidationMsg.type === 'validating'
                ? 'bg-amber-400 animate-spin'
                : 'bg-emerald-500 animate-pulse'
            }`}
          />
          <span className="font-mono text-[11px] uppercase tracking-wider">{symbolValidationMsg.text}</span>
        </div>

        {activeTab === 'analysis' ? (
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

            {/* Timeframe Indicator Matrix */}
            <IndicatorMatrix rows={matrixRows} />

            {/* Candlestick & Market Structure Chart */}
            <ChartSection
              candles={candles['4h'] || []}
              symbol={activeSymbol}
              onOpenCyclesModal={() => setIsCyclesModalOpen(true)}
            />
          </div>
        ) : (
          <BinanceWalletTab
            data={binanceData}
            isLoading={isLoadingBinance}
            onSync={syncBinanceWallet}
            apiConfigured={apiConfigured || Boolean(customApiKey && customApiSecret)}
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
