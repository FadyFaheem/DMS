import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlayerProvider } from '../../context/PlayerContext';
import ParkDashboardPage from '../../pages/ParkDashboardPage';

const player = {
  id: 1,
  player_code: 'CODE-1',
  display_name: 'Ada',
  currency: 10000,
  food: { plants: 10, meat: 5, fish: 0 },
  habitats: [],
  dinosaurs: [
    {
      id: 9,
      name: 'Rexy',
      species: 'velociraptor',
      period: 'Cretaceous',
      gender: 'female',
      color: 'amber',
      size_lbs: 35,
      generation: 1,
      habitat_id: null,
      diet_primary: 'meat',
      diet_secondary: null,
      preferred_terrain: 'grassland',
      social_structure: 'pair',
      health: 80,
      hunger: 20,
      happiness: 70,
      reproduction_readiness: 0,
      status: 'Thriving',
      alive: true,
      mutations: [],
      parent_a_id: null,
      parent_b_id: null,
      born_at: '2026-01-01T00:00:00Z',
    },
  ],
  summary: { population: 1, by_category: { carnivore: 1 }, avg_health: 80, critical: 0 },
  events: [{ id: 1, kind: 'birth', message: 'Rexy hatched', created_at: '2026-01-02T00:00:00Z' }],
};

describe('ParkDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    localStorage.clear();
    localStorage.setItem('player_code', 'CODE-1');
  });

  it('renders the park name and dinosaurs from /me', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(player), { status: 200 }));

    render(
      <PlayerProvider>
        <MemoryRouter>
          <ParkDashboardPage />
        </MemoryRouter>
      </PlayerProvider>,
    );

    await waitFor(() => expect(screen.getByText('Rexy')).toBeInTheDocument());
    expect(screen.getByText("Ada's Park")).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Rexy hatched')).toBeInTheDocument();
  });
});
