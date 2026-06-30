import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createPlayer, getMe } from '../api/players';
import type { Player } from '../api/players';
import { clearPlayerCode, getPlayerCode, setPlayerCode } from '../api/client';

export interface GameState {
  player: Player | null;
  loading: boolean;
  error: string | null;
  // True on first launch (no stored code): the UI must ask for a name before a
  // park is generated, instead of auto-creating one.
  needsOnboarding: boolean;
  refresh: () => Promise<void>;
  login: (code: string) => Promise<void>;
  createNamedPark: (name: string) => Promise<void>;
}

const PlayerContext = createContext<GameState | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const refresh = useCallback(async () => {
    setPlayer(await getMe());
  }, []);

  const createNamedPark = useCallback(async (name: string) => {
    const created = await createPlayer(name);
    setPlayerCode(created.player_code);
    setPlayer(created);
    setNeedsOnboarding(false);
    setError(null);
  }, []);

  const login = useCallback(async (code: string) => {
    setPlayerCode(code);
    try {
      setPlayer(await getMe());
      setNeedsOnboarding(false);
      setError(null);
    } catch (e) {
      clearPlayerCode();
      setError('That code did not match any park.');
      throw e;
    }
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      if (getPlayerCode()) {
        await refresh();
      } else {
        // First run: defer park creation to the name-your-park onboarding.
        setNeedsOnboarding(true);
      }
    } catch {
      // Stored code was invalid/unreachable; fall back to onboarding.
      clearPlayerCode();
      setNeedsOnboarding(true);
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    // One-time async bootstrap on mount; all state updates happen after awaits,
    // so there is no synchronous render cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void bootstrap();
  }, [bootstrap]);

  const value = useMemo<GameState>(
    () => ({ player, loading, error, needsOnboarding, refresh, login, createNamedPark }),
    [player, loading, error, needsOnboarding, refresh, login, createNamedPark],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame(): GameState {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('useGame must be used within a PlayerProvider');
  return ctx;
}
