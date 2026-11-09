import React from 'react';
import { MovementType } from '../../core/types';

interface BadgeProps {
  type?: MovementType;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ type, variant, children }) => {
  if (type) {
    const config: Record<MovementType, { label: string; bg: string }> = {
      SHARED_EXPENSE: { label: 'Gasto Compartido', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
      INDIVIDUAL_EXPENSE: { label: 'Gasto Individual', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
      LOAN: { label: 'Préstamo', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
      SETTLEMENT: { label: 'Liquidación', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
      INCOME: { label: 'Ingreso', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    };

    const current = config[type] || config.SHARED_EXPENSE;

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${current.bg}`}>
        {children || current.label}
      </span>
    );
  }

  const variantClasses = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  }[variant || 'neutral'];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantClasses}`}>
      {children}
    </span>
  );
};
