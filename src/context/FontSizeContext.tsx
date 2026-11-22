import React, { createContext, useContext, useEffect, useState } from 'react';

export type FontSize = 'normal' | 'large';

interface FontSizeContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  toggleFontSize: () => void;
  isLarge: boolean;
}

const STORAGE_KEY = 'equigasto-font-size';

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

function updateDOMFontSize(size: FontSize) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (size === 'large') {
    root.classList.add('font-large');
  } else {
    root.classList.remove('font-large');
  }
}

export const FontSizeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as FontSize | null;
      if (stored === 'normal' || stored === 'large') {
        updateDOMFontSize(stored);
        return stored;
      }
    }
    return 'normal';
  });

  useEffect(() => {
    updateDOMFontSize(fontSize);
    try {
      localStorage.setItem(STORAGE_KEY, fontSize);
    } catch (e) {}
  }, [fontSize]);

  const toggleFontSize = () => {
    setFontSizeState((prev) => (prev === 'normal' ? 'large' : 'normal'));
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
  };

  return (
    <FontSizeContext.Provider
      value={{
        fontSize,
        setFontSize,
        toggleFontSize,
        isLarge: fontSize === 'large',
      }}
    >
      {children}
    </FontSizeContext.Provider>
  );
};

export const useFontSize = (): FontSizeContextType => {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize debe usarse dentro de un FontSizeProvider');
  }
  return context;
};
