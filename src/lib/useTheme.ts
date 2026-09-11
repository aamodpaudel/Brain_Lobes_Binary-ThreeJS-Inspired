'use client';

import { useEffect, useState } from 'react';

export function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // One-time sync from the DOM attribute the inline script in layout.tsx sets before
    // hydration (to avoid a flash of the wrong theme) — legitimate read of external state.
    const current = document.documentElement.getAttribute('data-theme');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (current === 'dark' || current === 'light') setThemeState(current);
  }, []);

  const setTheme = (next: 'light' | 'dark') => {
    setThemeState(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* private browsing / storage disabled — theme just won't persist */
    }
  };

  return { theme, toggleTheme: () => setTheme(theme === 'light' ? 'dark' : 'light'), setTheme };
}
