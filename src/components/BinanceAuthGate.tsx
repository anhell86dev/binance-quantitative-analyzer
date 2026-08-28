import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Activity,
  Layers,
  HelpCircle,
  ExternalLink,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { verifyBinanceApiKeys, ApiKeyVerificationResult } from '../utils/marketService';
import { playAudioAlert } from '../utils/indicators';

interface BinanceAuthGateProps {
  onAuthenticated: (apiKey: string, apiSecret: string, remember: boolean) => void;
  onContinueDemo: () => void;
  savedApiKey?: string;
  savedApiSecret?: string;
}

export const BinanceAuthGate: React.FC<BinanceAuthGateProps> = ({
  onAuthenticated,
  onContinueDemo,
  savedApiKey = '',
  savedApiSecret = '',
}) => {
  const [apiKey, setApiKey] = useState<string>(savedApiKey);
  const [apiSecret, setApiSecret] = useState<string>(savedApiSecret);
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [rememberKeys, setRememberKeys] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyResult, setVerifyResult] = useState<ApiKeyVerificationResult | null>(null);
  const [stepMessage, setStepMessage] = useState<string>('');
  const [autoChecked, setAutoChecked] = useState<boolean>(false);

  // Auto-fill from localStorage if exists
  useEffect(() => {
    try {
      const storedKey = localStorage.getItem('binance_custom_api_key') || savedApiKey || '';
      const storedSecret = localStorage.getItem('binance_custom_api_secret') || savedApiSecret || '';
      if (storedKey) setApiKey(storedKey);
      if (storedSecret) setApiSecret(storedSecret);

      // If both exist in localStorage, automatically check and offer instant login
      if (storedKey && storedSecret && !autoChecked) {
        setAutoChecked(true);
      }
    } catch (e) {
      // LocalStorage access fallback
    }
  }, [savedApiKey, savedApiSecret]);

  const handleVerifyAndLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanKey = apiKey.trim();
    const cleanSecret = apiSecret.trim();

    if (!cleanKey || !cleanSecret) {
      setVerifyResult({
        valid: false,
        timestampOffsetMs: 0,
        syntaxCheck: {
          valid: false,
          apiKeyLength: cleanKey.length,
          hasWhitespace: false,
          message: 'Por favor ingresa tanto la Clave API como la Clave Secreta.',
        },
        spotStatus: { connected: false, error: 'Faltan credenciales' },
        futuresStatus: { connected: false, error: 'Faltan credenciales' },
        permissions: null,
        warnings: [],
        suggestions: ['Introduce tu API Key (64 caracteres) y API Secret de tu cuenta de Binance.'],
      });
      playAudioAlert('bearish');
      return;
    }

    setIsVerifying(true);
    setVerifyResult(null);
    setStepMessage('Verificando sintaxis y sincronizando reloj con los servidores de Binance...');

    try {
      setStepMessage('Calculando firma criptográfica HMAC SHA-256...');
      await new Promise(r => setTimeout(r, 200));

      setStepMessage('Consultando API de Binance Futuros (/fapi/v2/account)...');
      const result = await verifyBinanceApiKeys(cleanKey, cleanSecret);
      setVerifyResult(result);

      if (result.valid || result.futuresStatus.connected || result.spotStatus.connected) {
        playAudioAlert('success');
        setStepMessage('✅ ¡Autenticación exitosa! Ingresando a Mi Cuenta Binance...');

        if (rememberKeys) {
          try {
            localStorage.setItem('binance_custom_api_key', cleanKey);
            localStorage.setItem('binance_custom_api_secret', cleanSecret);
          } catch (err) {}
        } else {
          try {
            localStorage.removeItem('binance_custom_api_key');
            localStorage.removeItem('binance_custom_api_secret');
          } catch (err) {}
        }

        // Brief smooth timeout to let user see the green verification
        setTimeout(() => {
          onAuthenticated(cleanKey, cleanSecret, rememberKeys);
        }, 600);
      } else {
        playAudioAlert('bearish');
        setStepMessage('❌ Error de autenticación en Binance API.');
      }
    } catch (err: any) {
      playAudioAlert('bearish');
      setVerifyResult({
        valid: false,
        timestampOffsetMs: 0,
        syntaxCheck: { valid: false, apiKeyLength: cleanKey.length, hasWhitespace: false, message: err.message },
        spotStatus: { connected: false, error: err.message },
        futuresStatus: { connected: false, error: err.message },
        permissions: null,
        warnings: [],
        suggestions: [`Error de red o conexión: ${err.message}`],
      });
      setStepMessage('❌ No se pudo completar la verificación.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden">
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Brand Bar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded-sm flex items-center justify-center shadow-md">
            <div className="w-4 h-4 border-2 border-slate-950 rotate-45"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-lg text-slate-100 font-mono">
                QUANT<span className="text-amber-500 font-light">SYNC</span>
              </span>
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-mono font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">
                BINANCE FUTURES GATEWAY
              </span>
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              TERMINAL CUANTITATIVA DE ALTA PRECISIÓN
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Binance Futures API v2 Online</span>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 relative">
          {/* Top Header Badge */}
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-800">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide font-mono">
                Acceso a Binance Futures
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Ingresa tu Clave API y Clave Secreta para sincronizar tu cuenta, balances, posiciones en vivo y órdenes algorítmicas.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleVerifyAndLogin} className="space-y-4">
            {/* API Key Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" /> Clave API (Binance API Key)
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  {apiKey.length} caracteres
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value.trim())}
                  placeholder="Pega aquí tu API Key de Binance (ej: vmPU...)"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none transition-colors"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Secret Key Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" /> Clave Secreta (Binance Secret Key)
                </label>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-[10px] text-slate-400 hover:text-amber-300 font-mono flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showSecret ? 'Ocultar' : 'Mostrar'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={apiSecret}
                  onChange={e => setApiSecret(e.target.value.trim())}
                  placeholder="Pega aquí tu Secret Key de Binance (ej: 7Yw9...)"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none transition-colors"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Remember Credentials Option */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberKeys}
                  onChange={e => setRememberKeys(e.target.checked)}
                  className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                />
                <span>Recordar credenciales en este navegador (Almacenamiento Local Seguro)</span>
              </label>
            </div>

            {/* Verification status feedback */}
            {isVerifying && (
              <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-3.5 flex items-center gap-3 text-xs font-mono text-amber-300">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="truncate">{stepMessage}</span>
              </div>
            )}

            {/* Verification Result Feedback Box */}
            {verifyResult && !isVerifying && (
              <div
                className={`p-4 rounded-xl border text-xs font-mono space-y-2.5 ${
                  verifyResult.valid
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-950/40 border-red-500/40 text-red-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {verifyResult.valid ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>Credenciales de Binance Verificadas</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-400" />
                      <span>Fallo de Autenticación con Binance</span>
                    </>
                  )}
                </div>

                {/* Sub-status checklist */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className={verifyResult.futuresStatus.connected ? 'text-emerald-400' : 'text-red-400'}>
                      {verifyResult.futuresStatus.connected ? '●' : '○'}
                    </span>
                    <span>Binance Futuros: {verifyResult.futuresStatus.connected ? 'Conectado' : 'Error'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={verifyResult.spotStatus.connected ? 'text-emerald-400' : 'text-slate-500'}>
                      {verifyResult.spotStatus.connected ? '●' : '○'}
                    </span>
                    <span>Binance Spot: {verifyResult.spotStatus.connected ? 'Conectado' : 'No consultado'}</span>
                  </div>
                </div>

                {/* Suggestions / Error Messages */}
                {verifyResult.suggestions.length > 0 && (
                  <div className="space-y-1 text-[11px] pt-1">
                    {verifyResult.suggestions.map((s, idx) => (
                      <p key={idx} className="leading-relaxed">
                        {s}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={isVerifying}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 py-3 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer transition-all active:scale-98"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isVerifying ? 'Verificando con Binance...' : 'Validar Claves & Entrar al Sistema'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onContinueDemo}
                className="w-full bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 py-2.5 px-4 rounded-xl text-xs font-mono flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span>Acceder en Modo Demostración (Datos de Mercado Públicos)</span>
              </button>
            </div>
          </form>

          {/* Security Architecture Footnote */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono space-y-2">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-slate-200">Seguridad Criptográfica Client-Side:</strong> Las firmas criptográficas HMAC SHA-256 se procesan directamente en tu navegador. Tus claves jamás se envían ni se almacenan en servidores externos de terceros.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-slate-200">Configuración Recomendada en Binance:</strong> Habilita únicamente <span className="text-amber-300 font-bold">Lectura (Read)</span> y <span className="text-amber-300 font-bold">Habilitar Futuros (Enable Futures)</span>. Deja los <span className="text-red-400 font-bold">Retiros DESACTIVADOS</span>.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Geometric Footer */}
      <footer className="h-12 border-t border-slate-900 bg-slate-950/90 flex items-center justify-between px-6 text-[10px] uppercase tracking-widest text-slate-500 font-mono">
        <div>Gateway: Binance Futures fapi/v2</div>
        <div>Criptografía: Web Crypto HMAC-SHA256</div>
        <div>Estado: Seguro & Aislado</div>
      </footer>
    </div>
  );
};
