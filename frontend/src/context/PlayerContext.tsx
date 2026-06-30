import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createPlayer, getMe } from '../api/players';
import type { Player } from '../api/players';
import { clearPlayerCode, getPlayerCode, setPlayerCode } from '../api/client';

interface GameState {
  player: Player | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  login: (code: string) => Promise<void>;
}

const PlayerContext = createContext<GameState | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setPlayer(await getMe());
  }, []);

  const startFresh = useCallback(async () => {
    const created = await createPlayer();
    setPlayerCode(created.player_code);
    setPlayer(created);
  }, []);

  const login = useCallback(async (code: string) => {
    setPlayerCode(code);
    try {
      setPlayer(await getMe());
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
        await startFresh();
      }
    } catch {
      clearPlayerCode();
      try {
        await startFresh();
      } catch {
        setError('Could not reach the server.');
      }
    } finally {
      setLoading(false);
    }
  }, [refresh, startFresh]);

  useEffect(() => {
    // One-time async bootstrap on mount; all state updates happen after awaits,
    // so there is no synchronous render cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void bootstrap();
  }, [bootstrap]);

  const value = useMemo<GameState>(
    () => ({ player, loading, error, refresh, login }),
    [player, loading, error, refresh, login],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame(): GameState {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('useGame must be used within a PlayerProvider');
  return ctx;
}
