import { useState, useEffect, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../data/supabaseClient';

export interface AuthState {
  session: Session | null;
  user: User | null;
  /** true solo mientras se resuelve la sesión inicial */
  loading: boolean;
  /** true mientras hay un login/registro/recuperación en curso */
  busy: boolean;
  error: string | null;
  /** true si el usuario ha entrado mediante un enlace de recuperación de contraseña */
  isPasswordRecovery: boolean;
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  /** Devuelve true si el registro se completó sin error */
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  /** Reenvía el correo de confirmación. Devuelve true si se envió */
  resend: (email: string) => Promise<boolean>;
  /** Envía correo de recuperación de contraseña */
  resetPassword: (email: string) => Promise<boolean>;
  /** Cambia la contraseña del usuario logueado o en recuperación */
  updatePassword: (newPassword: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
  clearRecovery: () => void;
}

function traducirError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('email not confirmed')) return 'Debes confirmar tu correo antes de iniciar sesión.';
  if (m.includes('already registered')) return 'Ese correo ya está registrado.';
  if (m.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos.';
  if (m.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  return msg;
}

/** Lee errores que Supabase deja en la URL (p. ej. enlace de confirmación caducado) */
function leerErrorDeUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const code = params.get('error_code');
  const desc = params.get('error_description');
  if (!params.get('error') && !code) return null;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  if (code === 'otp_expired') {
    return 'El enlace ha caducado o ya se usó. Por favor solicita uno nuevo.';
  }
  return desc ? desc.replace(/\+/g, ' ') : 'No se pudo completar la verificación.';
}

export function useAuth(): AuthState & AuthActions {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(leerErrorDeUrl);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.location.hash.includes('type=recovery');
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        setUser(s?.user ?? null);
      })
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) setError(traducirError(authError.message));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión.');
    } finally {
      setBusy(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    setError(null);
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name }, emailRedirectTo: window.location.origin + window.location.pathname },
      });
      if (authError) {
        setError(traducirError(authError.message));
        return false;
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión.');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const resend = useCallback(async (email: string) => {
    setError(null);
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: window.location.origin + window.location.pathname },
      });
      if (authError) {
        setError(traducirError(authError.message));
        return false;
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión.');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    setBusy(true);
    try {
      const redirectUrl = window.location.origin + window.location.pathname;
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (authError) {
        setError(traducirError(authError.message));
        return false;
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión.');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    setError(null);
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (authError) {
        setError(traducirError(authError.message));
        return false;
      }
      setIsPasswordRecovery(false);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar contraseña.');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    setIsPasswordRecovery(false);
    await supabase.auth.signOut();
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const clearRecovery = useCallback(() => setIsPasswordRecovery(false), []);

  return {
    session,
    user,
    loading,
    busy,
    error,
    isPasswordRecovery,
    signIn,
    signUp,
    resend,
    resetPassword,
    updatePassword,
    signOut,
    clearError,
    clearRecovery,
  };
}
