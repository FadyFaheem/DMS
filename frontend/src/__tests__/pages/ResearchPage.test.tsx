import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlayerProvider } from '../../context/PlayerContext';
import ResearchPage from '../../pages/ResearchPage';

const player = {
  id: 1,
  player_code: 'CODE-1',
  display_name: 'Ada',
  currency: 10000,
  food: { plants: 0, meat: 0, fish: 0 },
  habitats: [],
  dinosaurs: [],
  summary: { population: 0, by_category: {}, avg_health: 0, critical: 0 },
  research: {
    unlocked: [],
    catalog: [
      {
        key: 'plant_farming',
        name: 'Plant Farming',
        description: 'Grow plant food.',
        cost: 1500,
        prerequisites: [],
        requires_population: 0,
        unlocks: ['plant_farm'],
        unlocked: false,
      },
      {
        key: 'advanced_farming',
        name: 'Advanced Farming',
        description: 'Upgrade farms.',
        cost: 4000,
        prerequisites: ['plant_farming'],
        requires_population: 0,
        unlocks: [],
        unlocked: false,
      },
      {
        key: 'genetic_engineering_lab',
        name: 'Genetic Engineering Lab',
        description: 'Choose a guaranteed mutation for bred offspring.',
        cost: 9000,
        prerequisites: ['genetic_trait_viewing', 'mutation_rate_boost'],
        requires_population: 0,
        unlocks: ['trait_selection'],
        unlocked: false,
      },
    ],
  },
};

describe('ResearchPage', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    localStorage.clear();
    localStorage.setItem('player_code', 'CODE-1');
  });

  it('renders tech cards and shows missing prerequisites', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(player), { status: 200 }));

    render(
      <PlayerProvider>
        <MemoryRouter>
          <ResearchPage />
        </MemoryRouter>
      </PlayerProvider>,
    );

    await waitFor(() => expect(screen.getByText('Plant Farming')).toBeInTheDocument());
    expect(screen.getByText('Advanced Farming')).toBeInTheDocument();
    expect(screen.getByText(/Requires: plant_farming/)).toBeInTheDocument();
  });

  it('renders an expanded-tree tech with its effects and prerequisites', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(player), { status: 200 }));

    render(
      <PlayerProvider>
        <MemoryRouter>
          <ResearchPage />
        </MemoryRouter>
      </PlayerProvider>,
    );

    await waitFor(() => expect(screen.getByText('Genetic Engineering Lab')).toBeInTheDocument());
    expect(screen.getByText('trait selection')).toBeInTheDocument();
    expect(screen.getByText(/Requires: genetic_trait_viewing/)).toBeInTheDocument();
  });
});
