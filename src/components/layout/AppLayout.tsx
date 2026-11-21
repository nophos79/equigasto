import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { repository } from '../../data/index';
import { UserProfile, Group, Movement } from '../../core/types';
import { NewMovementModal } from '../movements/NewMovementModal';
import { PendingApprovalPage } from '../../pages/PendingApprovalPage';

interface AppLayoutProps {
  onSignOut?: () => Promise<void>;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ onSignOut }) => {
  const location = useLocation();
  const groupMatch = location.pathname.match(/^\/groups\/([^/]+)/);
  const activeGroupId = groupMatch && groupMatch[1] !== 'new' ? groupMatch[1] : undefined;
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isNewMovementOpen, setIsNewMovementOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const user = await repository.getCurrentUser();
        setCurrentUser(user);
        if (user.isApproved !== false) {
          const allGroups = await repository.getGroups();
          setGroups(allGroups);
        } else {
          setGroups([]);
        }
        setLoadError(null);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Error desconocido');
      }
    }
    loadData();
  }, [refreshTrigger]);

  const handleMovementCreated = (_movement: Movement) => {
    setIsNewMovementOpen(false);
    setRefreshTrigger(prev => prev + 1);
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="max-w-sm bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-3">
          <p className="text-sm font-bold text-rose-700">No se pudieron cargar tus datos</p>
          <p className="text-xs text-slate-500 break-words">{loadError}</p>
          <button
            onClick={() => setRefreshTrigger((p) => p + 1)}
            className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (currentUser.isApproved === false) {
    return (
      <PendingApprovalPage
        currentUser={currentUser}
        onCheckStatus={() => setRefreshTrigger((p) => p + 1)}
        onSignOut={onSignOut || (async () => {})}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors">
      {/* Sidebar for Desktop */}
      <Sidebar
        currentUser={currentUser}
        onOpenNewMovement={() => setIsNewMovementOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          currentUser={currentUser}
          onOpenNewMovement={() => setIsNewMovementOpen(true)}
        />

        <main className="flex-1 pb-20 lg:pb-8 px-2.5 py-3 sm:px-6 sm:py-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ refreshTrigger, triggerRefresh: () => setRefreshTrigger(p => p + 1) }} />
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav onOpenNewMovement={() => setIsNewMovementOpen(true)} />

        {/* Modal: Nuevo Movimiento */}
        {isNewMovementOpen && (
          <NewMovementModal
            groups={groups}
            currentUser={currentUser}
            initialGroupId={activeGroupId}
            onClose={() => setIsNewMovementOpen(false)}
            onCreated={handleMovementCreated}
          />
        )}
      </div>
    </div>
  );
};
