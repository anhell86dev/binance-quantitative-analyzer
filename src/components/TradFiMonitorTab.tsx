import React, { useState, useEffect } from 'react';
import { TradFiDashboardData, TradFiAsset } from '../types';
import { fetchTradFiDashboard } from '../utils/tradFiService';
import {
  Globe,
  TrendingUp,
  TrendingDown,
  Shield,
  Activity,
  Zap,
  RefreshCw,
  Clock,
  ExternalLink,
  Layers,
  BarChart2,
  DollarSign,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Sliders,
  Landmark,
} from 'lucide-react';

interface TradFiMonitorTabProps {
  currentBtcPrice?: number;
  onSelectCryptoSymbol?: (symbol: string) => void;
  onOpenTradFiScanner?: () => void;
  onLogMessage?: (msg: string, type: 'info' | 'success' | 'warn' | 'error') => void;
}

export const TradFiMonitorTab: React.FC<TradFiMonitorTabProps> = ({
  currentBtcPrice,
  onSelectCryptoSymbol,
  onOpenTradFiScanner,
  onLogMessage,
}) => {
  const [data, setData] = useState<TradFiDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'CURRENCY' | 'EQUITIES' | 'COMMODITIES' | 'RATES' | 'CRYPTO_MACRO'>('ALL');
  const [selectedAsset, setSelectedAsset] = useState<TradFiAsset | null>(null);
  const [activeChartTimeframe, setActiveChartTimeframe] = useState<'7D' | '30D' | '90D'>('30D');

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const dashboard = await fetchTradFiDashboard(currentBtcPrice);
      setData(dashboard);
      if (!selectedAsset && dashboard.assets.length > 0) {
        setSelectedAsset(dashboard.assets[0]);
      }
      if (!silent && onLogMessage) {
        onLogMessage('📊 Monitor TradFi y matriz macroeconómica sincronizados con éxito.', 'success');
      }
    } catch (e: any) {
      if (onLogMessage) {
        onLogMessage(`Error al sincronizar TradFi: ${e.message}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 15000); // 15s refresh
    return () => clearInterval(interval);
  }, [currentBtcPrice]);

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
          Sincronizando Mercado TradFi & Matriz de Correlaciones...
        </p>
      </div>
    );
  }

  if (!data) return null;

  const { assets, macroRegime, correlationMatrix, sessions, comparativeHistory } = data;

  const filteredAssets = activeCategory === 'ALL'
    ? assets
    : assets.filter(a => a.category === activeCategory);

  // Determine regime styling
  const isRiskOn = macroRegime.regime === 'RISK_ON';
  const isRiskOff = macroRegime.regime === 'RISK_OFF';

  return (
    <div className="space-y-6">
      {/* 1. Macro Regime Hero Card & Risk Gauge */}
      <div className="border border-slate-800 bg-slate-900/90 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider font-mono">
                    Monitor Simultáneo TradFi & Macro Matrix
                  </h2>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider animate-pulse">
                    EN VIVO
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Correlación cruzada entre Finanzas Tradicionales (DXY, Wall St, Oro, Tasas) y Binance Futures
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onOpenTradFiScanner && (
              <button
                onClick={onOpenTradFiScanner}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs px-3.5 py-2 rounded-lg font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Abrir Escáner TradFiUSDT</span>
              </button>
            )}

            <button
              onClick={() => loadData()}
              disabled={isLoading}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs px-3 py-2 rounded-lg font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Macro Regime Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-5">
          {/* Risk Bias Meter */}
          <div className="md:col-span-4 bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Régimen Macroeconómico Global
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold uppercase tracking-wider font-mono ${
                  isRiskOn ? 'text-emerald-400' : isRiskOff ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {macroRegime.title}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-400">Sesgo para Binance Futures:</span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded-sm text-[11px] ${
                  isRiskOn
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : isRiskOff
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {macroRegime.biasForCrypto}
                </span>
              </div>
            </div>

            {/* Confidence Bar */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Convicción Cuantitativa</span>
                <span className="font-bold text-slate-200">{macroRegime.confidence}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ${
                    isRiskOn ? 'bg-emerald-500' : isRiskOff ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${macroRegime.confidence}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Key Macro Pillars */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Índice Dólar (DXY)</span>
              <div className="text-sm font-mono font-bold text-slate-100">
                {assets.find(a => a.id === 'DXY')?.price || '104.18'} pts
              </div>
              <div className="text-[11px] font-mono mt-1 text-emerald-400 flex items-center gap-0.5">
                <ArrowDownRight className="w-3 h-3" />
                <span>{macroRegime.dxyTrend}</span>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">S&P 500 (Wall St)</span>
              <div className="text-sm font-mono font-bold text-slate-100">
                {assets.find(a => a.id === 'SPX')?.price.toLocaleString() || '5,864'} pts
              </div>
              <div className="text-[11px] font-mono mt-1 text-emerald-400 flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" />
                <span>{macroRegime.spxTrend}</span>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Bono US 10A (Tasas)</span>
              <div className="text-sm font-mono font-bold text-slate-100">
                {assets.find(a => a.id === 'US10Y')?.price || '4.185'}%
              </div>
              <div className="text-[11px] font-mono mt-1 text-emerald-400 flex items-center gap-0.5">
                <ArrowDownRight className="w-3 h-3" />
                <span>{macroRegime.ratesTrend}</span>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Oro Spot & PAXG</span>
              <div className="text-sm font-mono font-bold text-slate-100">
                ${assets.find(a => a.id === 'XAU')?.price.toLocaleString() || '2,748'}
              </div>
              <div className="text-[11px] font-mono mt-1 text-amber-400 flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" />
                <span>{macroRegime.goldTrend}</span>
              </div>
            </div>

            {/* Macro Summary banner */}
            <div className="col-span-2 sm:col-span-4 bg-slate-950/40 border border-slate-800/60 rounded-lg p-3 text-xs text-slate-300 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed font-sans">{macroRegime.summary}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Global Trading Sessions Clocks (Crucial for US Open Volatility) */}
      <div className="border border-slate-800 bg-slate-900/80 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-200">
              Sesiones Financieras Mundiales & Horarios de Inyección de Liquidez
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            Apertura Wall St: 13:30 UTC / 09:30 EST
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sessions.map(s => (
            <div
              key={s.name}
              className={`p-3 rounded-lg border transition-all ${
                s.isOpen
                  ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-950/50 border-slate-800/80 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{s.flag}</span>
                  <span className="text-xs font-bold text-slate-200">{s.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${s.isOpen ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                  <span className={`text-[10px] font-mono font-bold uppercase ${s.isOpen ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {s.isOpen ? 'ABIERTA' : 'CERRADA'}
                  </span>
                </div>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-2">
                {s.statusText}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Real-Time TradFi Asset Grid with Filter Pills */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-200">
              Activos Macro & Índices TradFi en Tiempo Real
            </h3>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'CURRENCY', label: 'Divisas (DXY)' },
              { id: 'EQUITIES', label: 'Renta Variable' },
              { id: 'COMMODITIES', label: 'Commodities' },
              { id: 'RATES', label: 'Tasas de Interés' },
              { id: 'CRYPTO_MACRO', label: 'Dominancias & RWA' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`text-[11px] font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Asset Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map(asset => {
            const isPos = asset.change24h >= 0;
            const isSelected = selectedAsset?.id === asset.id;

            return (
              <div
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className={`bg-slate-900/90 border rounded-xl p-4 transition-all cursor-pointer hover:border-slate-700 relative overflow-hidden ${
                  isSelected ? 'border-amber-500/80 shadow-md ring-1 ring-amber-500/30' : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-slate-100">{asset.symbol}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                        {asset.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[180px]">
                      {asset.name}
                    </div>
                  </div>

                  {/* Bullish / Bearish Impact Badge */}
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm border uppercase ${
                    asset.impactOnCrypto === 'BULLISH'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : asset.impactOnCrypto === 'BEARISH'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {asset.impactOnCrypto === 'BULLISH' ? 'Alcista Cripto' : asset.impactOnCrypto === 'BEARISH' ? 'Bajista Cripto' : 'Neutral'}
                  </span>
                </div>

                {/* Price & Change */}
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-lg font-bold font-mono text-slate-100">
                      {asset.unit === '$' ? '$' : ''}{asset.price.toLocaleString()}{asset.unit !== '$' ? ` ${asset.unit}` : ''}
                    </span>
                  </div>
                  <div className={`flex items-center gap-0.5 font-mono text-xs font-bold ${
                    isPos ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {isPos ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    <span>{isPos ? '+' : ''}{asset.change24h.toFixed(2)}%</span>
                  </div>
                </div>

                {/* Mini SVG Sparkline */}
                <div className="mt-3 h-8 w-full">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke={isPos ? '#10b981' : '#f43f5e'}
                      strokeWidth="2"
                      points={asset.sparkline.map((val, idx) => {
                        const min = Math.min(...asset.sparkline);
                        const max = Math.max(...asset.sparkline);
                        const range = max - min || 1;
                        const x = (idx / (asset.sparkline.length - 1)) * 100;
                        const y = 30 - ((val - min) / range) * 26 - 2;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                  </svg>
                </div>

                {/* Footer Metrics */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-1">
                    <span>Correlación BTC:</span>
                    <span className={`font-bold ${
                      asset.btcCorrelation > 0.5 ? 'text-emerald-400' : asset.btcCorrelation < -0.5 ? 'text-sky-400' : 'text-slate-300'
                    }`}>
                      {asset.btcCorrelation > 0 ? '+' : ''}{asset.btcCorrelation.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Rango: {asset.low24h} - {asset.high24h}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Cross-Asset Pearson Correlation Heatmap */}
      <div className="border border-slate-800 bg-slate-900/90 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-200">
                Matriz Cuantitativa de Correlaciones Cruzadas (TradFi vs Binance Futures)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Coeficiente de Pearson (r) de -1.0 a +1.0. Valores cercanos a +1 indican movimiento idéntico; cercanos a -1 indican movimiento inverso.
            </p>
          </div>
          <span className="text-[10px] font-mono text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded">
            {correlationMatrix.timeframe}
          </span>
        </div>

        {/* Heatmap Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="text-left py-2.5 px-3 font-semibold">Par Futuros</th>
                {correlationMatrix.tradFiSymbols.map(sym => (
                  <th key={sym.id} className="text-center py-2.5 px-3 font-semibold">
                    <span className="block text-slate-200">{sym.label}</span>
                    <span className="text-[9px] text-slate-500 font-normal">{sym.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {correlationMatrix.cryptoSymbols.map(crypto => (
                <tr key={crypto} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-100 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>{crypto}</span>
                    {onSelectCryptoSymbol && (
                      <button
                        onClick={() => onSelectCryptoSymbol(crypto)}
                        title="Analizar en gráfico principal"
                        className="text-[10px] text-amber-400/80 hover:text-amber-300 ml-1 cursor-pointer"
                      >
                        [Ver]
                      </button>
                    )}
                  </td>
                  {correlationMatrix.tradFiSymbols.map(trad => {
                    const corr = correlationMatrix.matrix[crypto]?.[trad.id] ?? 0;
                    // Color mapping based on correlation strength
                    let cellBg = 'bg-slate-800/50 text-slate-300';
                    if (corr >= 0.7) cellBg = 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-bold';
                    else if (corr >= 0.3) cellBg = 'bg-emerald-500/10 text-emerald-400';
                    else if (corr <= -0.7) cellBg = 'bg-sky-500/25 text-sky-300 border border-sky-500/40 font-bold';
                    else if (corr <= -0.3) cellBg = 'bg-sky-500/10 text-sky-400';

                    return (
                      <td key={trad.id} className="py-3 px-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded text-xs ${cellBg}`}>
                          {corr > 0 ? `+${corr.toFixed(2)}` : corr.toFixed(2)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Interpretation Guide Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/60 inline-block" />
              <span>Correlación Positiva (+0.70 a +1.00)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-sky-500/30 border border-sky-500/60 inline-block" />
              <span>Correlación Inversa (-0.70 a -1.00)</span>
            </div>
          </div>
          <div className="text-slate-500">
            Regla de Oro: Caída del DXY = Viento alcista en Bitcoin
          </div>
        </div>
      </div>

      {/* 5. Comparative Multi-Asset Performance Overlay Chart (% Change) */}
      <div className="border border-slate-800 bg-slate-900/90 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-200">
                Rendimiento Relativo Normalizado (% Retorno Acumulado)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Comparativa de rentabilidad normalizada entre Bitcoin (BTC), S&P 500 (SPX), Oro (XAU) y Dólar (DXY)
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-slate-200">BTC</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span className="text-slate-200">S&P 500</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-slate-200">Oro</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="text-slate-200">DXY</span>
              </div>
            </div>
          </div>
        </div>

        {/* SVG Multi-Line Chart */}
        <div className="h-56 w-full relative">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180" preserveAspectRatio="none">
            {/* Grid horizontal zero line */}
            <line x1="0" y1="90" x2="500" y2="90" stroke="#334155" strokeDasharray="3,3" strokeWidth="1" />
            <text x="5" y="86" fill="#64748b" fontSize="9" fontFamily="monospace">0.00% Base</text>

            {/* BTC Line (Amber) */}
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              points={comparativeHistory.map((pt, idx) => {
                const x = (idx / (comparativeHistory.length - 1)) * 500;
                const y = 90 - pt.btcNormalized * 4;
                return `${x},${y}`;
              }).join(' ')}
            />

            {/* S&P 500 Line (Sky) */}
            <polyline
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              points={comparativeHistory.map((pt, idx) => {
                const x = (idx / (comparativeHistory.length - 1)) * 500;
                const y = 90 - pt.spxNormalized * 4;
                return `${x},${y}`;
              }).join(' ')}
            />

            {/* Gold Line (Emerald) */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              points={comparativeHistory.map((pt, idx) => {
                const x = (idx / (comparativeHistory.length - 1)) * 500;
                const y = 90 - pt.goldNormalized * 4;
                return `${x},${y}`;
              }).join(' ')}
            />

            {/* DXY Line (Rose) */}
            <polyline
              fill="none"
              stroke="#f43f5e"
              strokeWidth="1.8"
              strokeDasharray="4,2"
              points={comparativeHistory.map((pt, idx) => {
                const x = (idx / (comparativeHistory.length - 1)) * 500;
                const y = 90 - pt.dxyNormalized * 4;
                return `${x},${y}`;
              }).join(' ')}
            />
          </svg>
        </div>

        {/* Date labels */}
        <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2 px-1">
          <span>{comparativeHistory[0]?.date || 'Hace 30D'}</span>
          <span>{comparativeHistory[Math.floor(comparativeHistory.length / 2)]?.date || 'Hace 15D'}</span>
          <span>Hoy (Tiempo Real)</span>
        </div>
      </div>

      {/* 6. Macro Confluence Action Checklist for Futures Traders */}
      <div className="border border-slate-800 bg-slate-900/90 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-200">
            Catalizadores Cuantitativos & Reglas de Operación Institucional
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {macroRegime.keyCatalysts.map((cat, idx) => (
            <div key={idx} className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 flex items-start gap-2.5">
              <div className="w-5 h-5 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono text-[10px] font-bold flex-shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">{cat}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
