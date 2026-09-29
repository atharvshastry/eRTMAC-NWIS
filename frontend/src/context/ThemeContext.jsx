import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const THEME_KEY = 'nwis_theme';
const FONT_SIZE_KEY = 'nwis_font_size';
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => window.localStorage.getItem(THEME_KEY) || 'light');
  const [fontSize, setFontSize] = useState(() => window.localStorage.getItem(FONT_SIZE_KEY) || 'default');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize;
    window.localStorage.setItem(FONT_SIZE_KEY, fontSize);
  }, [fontSize]);

  const value = useMemo(() => ({ theme, setTheme, fontSize, setFontSize }), [theme, fontSize]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
