import React, { useState, useRef, useEffect } from 'react';
import { Wallet, Mail, Lock, User, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import type { AuthActions } from '../hooks/useAuth';

interface AuthPageProps {
  error: string | null;
  loading: boolean;
  actions: Pick<AuthActions, 'signIn' | 'signUp' | 'resend' | 'clearError'>;
}

type AuthMode = 'signin' | 'signup';

export const AuthPage: React.FC<AuthPageProps> = ({ error, loading, actions }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [resendOk, setResendOk] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    actions.clearError();

    if (mode === 'signin') {
      await actions.signIn(email, password);
    } else {
      const ok = await actions.signUp(email, password, name);
      setSignUpSuccess(ok);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setSignUpSuccess(false);
    actions.clearError();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-slate-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo + Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl shadow-lg shadow-brand-200 mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">EquiGasto</h1>
          <p className="text-sm text-slate-500 mt-1">Gastos compartidos sin complicaciones</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/70 p-8 border border-slate-100">
          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-2xl p-1 mb-6 gap-1">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
                mode === 'signin'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          {/* Mensaje de éxito en registro */}
          {signUpSuccess && mode === 'signup' && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5">
              <div className="w-4 h-4 mt-0.5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <span className="text-white text-[10px] font-bold">✓</span>
              </div>
              <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                ¡Registro completado! Revisa tu correo para confirmar la cuenta antes de iniciar sesión.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 font-medium">{error}</p>
            </div>
          )}

          {/* Reenviar correo de confirmación */}
          {resendOk && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
              Correo de confirmación reenviado. Revisa tu bandeja y abre el enlace pronto: caduca en poco tiempo.
            </div>
          )}
          {error && /confirmar|caducado/i.test(error) && (
            <button
              type="button"
              disabled={loading || !email}
              onClick={async () => setResendOk(await actions.resend(email))}
              className="w-full mb-5 py-2.5 border border-brand-300 text-brand-700 hover:bg-brand-50 disabled:opacity-50 rounded-xl text-xs font-semibold"
            >
              {email ? 'Reenviar correo de confirmación' : 'Escribe tu correo abajo para reenviar la confirmación'}
            </button>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre (solo signup) */}
            {mode === 'signup' && (
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Nombre completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ana Martín"
                    required
                    minLength={2}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-slate-50 placeholder-slate-300"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ana@ejemplo.com"
                  required
                  autoComplete={mode === 'signin' ? 'username' : 'email'}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-slate-50 placeholder-slate-300"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : '••••••••'}
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-slate-50 placeholder-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botón submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading
                ? 'Procesando...'
                : mode === 'signin'
                ? 'Iniciar sesión'
                : 'Crear cuenta'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 mt-5">
            {mode === 'signin' ? (
              <>
                ¿No tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-brand-600 font-semibold hover:underline"
                >
                  Regístrate gratis
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-brand-600 font-semibold hover:underline"
                >
                  Inicia sesión
                </button>
              </>
            )}
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Protegido con Supabase Auth · RLS activado
        </p>
      </div>
    </div>
  );
};
