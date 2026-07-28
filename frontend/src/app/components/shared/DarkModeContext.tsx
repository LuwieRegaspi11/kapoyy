import React, { createContext, useContext, useEffect, useState } from 'react';

interface DarkModeCtx { dark: boolean; toggle: () => void; }
const Ctx = createContext<DarkModeCtx>({ dark: false, toggle: () => {} });

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <Ctx.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      {children}
    </Ctx.Provider>
  );
}

export const useDarkMode = () => useContext(Ctx);
