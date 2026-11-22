import React from 'react';
import { useFontSize } from '../../context/FontSizeContext';

interface FontSizeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export const FontSizeToggle: React.FC<FontSizeToggleProps> = ({ showLabel = false, className = '' }) => {
  const { isLarge, toggleFontSize } = useFontSize();

  return (
    <button
      type="button"
      onClick={toggleFontSize}
      aria-label={isLarge ? 'Cambiar a tamaño de texto normal' : 'Aumentar tamaño de texto'}
      title={isLarge ? 'Texto grande activado (clic para normal)' : 'Aumentar tamaño del texto'}
      className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${
        isLarge
          ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold border border-brand-200 dark:border-brand-800/60 shadow-xs'
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
      } ${className}`}
    >
      <span className="flex items-baseline font-bold tracking-tighter leading-none select-none">
        <span className="text-xs">A</span>
        <span className="text-base font-black">A</span>
        {isLarge && <span className="text-[10px] text-brand-500 ml-0.5 font-black">+</span>}
      </span>
      {showLabel && (
        <span className="text-xs font-semibold">
          {isLarge ? 'Texto grande' : 'Texto normal'}
        </span>
      )}
    </button>
  );
};

export const FontSizeSelector: React.FC = () => {
  const { fontSize, setFontSize } = useFontSize();

  const options: { value: 'normal' | 'large'; label: string }[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'large', label: 'Grande' },
  ];

  return (
    <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 w-full sm:w-56">
      {options.map((opt) => {
        const isActive = fontSize === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFontSize(opt.value)}
            className={`flex items-center justify-center py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              isActive
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
