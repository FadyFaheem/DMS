import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
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

  it('requests onboarding when no code is stored, then creates a named park', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(samplePlayer), { status: 201 }));

    const { result } = renderHook(() => useGame(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    // First run no longer auto-creates a park; it asks the player to name one.
    expect(result.current.needsOnboarding).toBe(true);
    expect(result.current.player).toBeNull();

    await act(async () => {
      await result.current.createNamedPark('Ada');
    });

    expect(result.current.player?.player_code).toBe('NEWCODE');
    expect(localStorage.getItem('player_code')).toBe('NEWCODE');
    expect(result.current.needsOnboarding).toBe(false);
    // The entered name is sent as display_name on create.
    const body = vi.mocked(fetch).mock.calls[0]?.[1]?.body;
    expect(String(body)).toContain('Ada');
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
