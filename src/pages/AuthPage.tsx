import React, { useState, useRef, useEffect } from 'react';
import { Wallet, Mail, Lock, User, Eye, EyeOff, AlertCircle, Loader2, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import type { AuthActions } from '../hooks/useAuth';
import { ThemeToggle } from '../components/common/ThemeToggle';

interface AuthPageProps {
  error: string | null;
  loading: boolean;
  isPasswordRecovery?: boolean;
  actions: Pick<AuthActions, 'signIn' | 'signUp' | 'resend' | 'resetPassword' | 'updatePassword' | 'clearError' | 'clearRecovery'>;
}

type AuthMode = 'signin' | 'signup' | 'forgot' | 'recovery';

export const AuthPage: React.FC<AuthPageProps> = ({ error, loading, isPasswordRecovery, actions }) => {
  const [mode, setMode] = useState<AuthMode>(isPasswordRecovery ? 'recovery' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resendOk, setResendOk] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isPasswordRecovery) {
      setMode('recovery');
    }
  }, [isPasswordRecovery]);

  useEffect(() => {
    if (mode !== 'recovery') {
      emailRef.current?.focus();
    }
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    actions.clearError();

    if (mode === 'signin') {
      await actions.signIn(email, password);
    } else if (mode === 'signup') {
      const ok = await actions.signUp(email, password, name);
      setSignUpSuccess(ok);
    } else if (mode === 'forgot') {
      const ok = await actions.resetPassword(email);
      setResetSent(ok);
    } else if (mode === 'recovery') {
      if (password.length < 6) {
        setValidationError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setValidationError('Las contraseñas no coinciden.');
        return;
      }
      const ok = await actions.updatePassword(password);
      if (ok) {
        setUpdateSuccess(true);
        setTimeout(() => {
          actions.clearRecovery();
          setMode('signin');
        }, 2000);
      }
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setSignUpSuccess(false);
    setResetSent(false);
    setValidationError(null);
    actions.clearError();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-slate-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4 relative transition-colors">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo + Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl shadow-lg shadow-brand-500/20 mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">EquiGasto</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gastos compartidos sin complicaciones</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/70 dark:shadow-none p-8 border border-slate-100 dark:border-slate-800 transition-colors">
          {/* Tabs: solo para signin / signup */}
          {mode !== 'forgot' && mode !== 'recovery' && (
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 mb-6 gap-1">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
                  mode === 'signin'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Crear cuenta
              </button>
            </div>
          )}

          {/* Header para modo forgot */}
          {mode === 'forgot' && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 mb-3"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a iniciar sesión</span>
              </button>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recuperar contraseña</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Indica tu correo y te enviaremos un enlace para restablecer tu contraseña.
              </p>
            </div>
          )}

          {/* Header para modo recovery */}
          {mode === 'recovery' && (
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 rounded-2xl mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Establecer nueva contraseña</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Introduce tu nueva clave de acceso para continuar.
              </p>
            </div>
          )}

          {/* Mensaje de éxito en registro */}
          {signUpSuccess && mode === 'signup' && (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed">
                ¡Registro completado! Revisa tu correo para confirmar la cuenta antes de iniciar sesión.
              </p>
            </div>
          )}

          {/* Mensaje de éxito en envío de recuperación */}
          {resetSent && mode === 'forgot' && (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed">
                ¡Enlace enviado! Revisa tu bandeja de entrada (y la carpeta de spam) para crear tu nueva contraseña.
              </p>
            </div>
          )}

          {/* Mensaje de éxito en actualización de contraseña */}
          {updateSuccess && mode === 'recovery' && (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed">
                ¡Contraseña cambiada con éxito! Redirigiendo a tu cuenta...
              </p>
            </div>
          )}

          {/* Errores de validación o del backend */}
          {(error || validationError) && (
            <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                {validationError || error}
              </p>
            </div>
          )}

          {/* Reenviar correo de confirmación */}
          {resendOk && (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              Correo de confirmación reenviado. Revisa tu bandeja y abre el enlace pronto.
            </div>
          )}
          {error && /confirmar|caducado/i.test(error) && (
            <button
              type="button"
              disabled={loading || !email}
              onClick={async () => setResendOk(await actions.resend(email))}
              className="w-full mb-5 py-2.5 border border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/40 disabled:opacity-50 rounded-xl text-xs font-semibold"
            >
              {email ? 'Reenviar correo de confirmación' : 'Escribe tu correo abajo para reenviar la confirmación'}
            </button>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre (solo signup) */}
            {mode === 'signup' && (
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">Nombre completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ana Martín"
                    required
                    minLength={2}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>
            )}

            {/* Email (en signin, signup y forgot) */}
            {mode !== 'recovery' && (
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">Correo electrónico</label>
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
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>
            )}

            {/* Contraseña (signin, signup y recovery) */}
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    {mode === 'recovery' ? 'Nueva contraseña' : 'Contraseña'}
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                    >
                      ¿La has olvidado?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signin' ? '••••••••' : 'Mínimo 6 caracteres'}
                    required
                    minLength={6}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirmar contraseña (solo recovery) */}
            {mode === 'recovery' && (
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">
                  Confirmar nueva contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                    minLength={6}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>
            )}

            {/* Botón submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 bg-brand-600 hover:bg-brand-700 active:scale-[0.99] disabled:bg-brand-300 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-500/20 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading
                ? 'Procesando...'
                : mode === 'signin'
                ? 'Iniciar sesión'
                : mode === 'signup'
                ? 'Crear cuenta'
                : mode === 'forgot'
                ? 'Enviar enlace de recuperación'
                : 'Guardar nueva contraseña'}
            </button>
          </form>

          {/* Footer */}
          {mode !== 'forgot' && mode !== 'recovery' && (
            <p className="text-center text-xs text-slate-400 mt-5">
              {mode === 'signin' ? (
                <>
                  ¿No tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
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
                    className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                  >
                    Inicia sesión
                  </button>
                </>
              )}
            </p>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          Protegido con Supabase Auth · RLS activado
        </p>
      </div>
    </div>
  );
};
