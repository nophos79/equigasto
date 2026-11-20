import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { GroupsPage } from './pages/GroupsPage';
import { GroupDetailPage } from './pages/GroupDetailPage';
import { ActivityPage } from './pages/ActivityPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AuthPage } from './pages/AuthPage';
import { useAuth } from './hooks/useAuth';
import { isSupabaseConfigured } from './data/supabaseClient';
import { ThemeProvider } from './context/ThemeContext';

export const AppContent: React.FC = () => {
  const { session, loading, busy, error, signIn, signUp, resend, signOut, clearError } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-sm bg-white rounded-2xl border border-amber-200 p-6 text-center space-y-2">
          <p className="text-sm font-bold text-amber-700">Falta configurar Supabase</p>
          <p className="text-xs text-slate-500">
            Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env.local (o en las variables de entorno del despliegue) y reinicia.
          </p>
        </div>
      </div>
    );
  }

  // Esperando a que Supabase resuelva la sesión inicial
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
      </div>
    );
  }

  // Sin Supabase configurado: modo demo con datos mock (acceso directo)
  if (isSupabaseConfigured && !session) {
    return (
      <AuthPage
        error={error}
        loading={busy}
        actions={{ signIn, signUp, resend, clearError }}
      />
    );
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<AppLayout onSignOut={signOut} />}>
          <Route index element={<DashboardPage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="groups/:id" element={<GroupDetailPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="profile" element={<ProfilePage onSignOut={signOut} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
