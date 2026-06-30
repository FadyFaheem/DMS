import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { GameState } from '../context/PlayerContext';
import type { ScreenId } from './screensConfig';

// React context does not cross the R3F <Canvas> boundary. We read the real
// PlayerProvider/ScreenProvider values OUTSIDE the canvas and re-provide them
// through this context INSIDE the canvas so WebGL UI can consume game state.
export interface WebglState {
  game: GameState;
  screen: ScreenId;
  setScreen: (screen: ScreenId) => void;
}

const WebglStateContext = createContext<WebglState | null>(null);

export function WebglStateProvider({
  value,
  children,
}: {
  value: WebglState;
  children: ReactNode;
}) {
  return <WebglStateContext.Provider value={value}>{children}</WebglStateContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWebgl(): WebglState {
  const ctx = useContext(WebglStateContext);
  if (!ctx) throw new Error('useWebgl must be used within a WebglStateProvider (inside the Canvas)');
  return ctx;
}
