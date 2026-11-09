import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="text-center py-24 space-y-4">
      <h1 className="text-6xl font-black text-slate-900 dark:text-white">404</h1>
      <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">Página no encontrada</h2>
      <p className="text-sm text-slate-400 max-w-sm mx-auto">
        La ruta a la que intentas acceder no existe o ha sido movida.
      </p>
      <div className="pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm"
        >
          <Home className="w-4 h-4" />
          <span>Volver al Dashboard</span>
        </Link>
      </div>
    </div>
  );
};
