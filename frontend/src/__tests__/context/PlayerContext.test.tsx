import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { PlayerProvider, useGame } from '../../context/PlayerContext';

const samplePlayer = {
  id: 1,
  player_code: 'NEWCODE',
  display_name: 'New Keeper',
  currency: 10000,
  food: { plants: 0, meat: 0, fish: 0 },
  habitats: [],
  dinosaurs: [],
  summary: { population: 0, by_category: {}, avg_health: 0, critical: 0 },
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <PlayerProvider>{children}</PlayerProvider>
);

describe('PlayerContext', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    localStorage.clear();
  });

  it('creates a fresh player when no code is stored', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(samplePlayer), { status: 201 }));

    const { result } = renderHook(() => useGame(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.player?.player_code).toBe('NEWCODE');
    expect(localStorage.getItem('player_code')).toBe('NEWCODE');
  });

  it('loads an existing player when a code is stored', async () => {
    localStorage.setItem('player_code', 'EXISTING');
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ...samplePlayer, player_code: 'EXISTING' }), { status: 200 }),
    );

    const { result } = renderHook(() => useGame(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.player?.player_code).toBe('EXISTING');
  });
});
