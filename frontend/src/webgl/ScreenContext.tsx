import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ScreenId } from './screensConfig';

interface ScreenState {
  screen: ScreenId;
  setScreen: (s: ScreenId) => void;
}

const ScreenContext = createContext<ScreenState | null>(null);

export function ScreenProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<ScreenId>('park');
  const value = useMemo(() => ({ screen, setScreen }), [screen]);
  return <ScreenContext.Provider value={value}>{children}</ScreenContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useScreen(): ScreenState {
  const ctx = useContext(ScreenContext);
  if (!ctx) throw new Error('useScreen must be used within a ScreenProvider');
  return ctx;
}
