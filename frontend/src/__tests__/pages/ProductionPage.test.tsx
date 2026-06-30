import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlayerProvider } from '../../context/PlayerContext';
import ProductionPage from '../../pages/ProductionPage';

const player = {
  id: 1,
  player_code: 'CODE-1',
  display_name: 'Ada',
  currency: 10000,
  food: { plants: 0, meat: 0, fish: 0 },
  habitats: [],
  dinosaurs: [],
  summary: { population: 0, by_category: {}, avg_health: 0, critical: 0 },
  research: { unlocked: ['plant_farming'], catalog: [] },
  food_productions: {
    buildings: [
      {
        id: 5,
        kind: 'plant_farm',
        name: 'Plant Farm',
        level: 1,
        food_column: 'food_plants',
        output_per_day: 50,
        last_collected_at: null,
      },
    ],
    catalog: [
      {
        kind: 'plant_farm',
        name: 'Plant Farm',
        food_column: 'food_plants',
        base_output_per_day: 50,
        build_cost: 2500,
        required_tech: 'plant_farming',
        unlocked: true,
      },
    ],
  },
};

describe('ProductionPage', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    localStorage.clear();
    localStorage.setItem('player_code', 'CODE-1');
  });

  it('lists farms and builds via the API', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(player), { status: 200 }));

    render(
      <PlayerProvider>
        <MemoryRouter>
          <ProductionPage />
        </MemoryRouter>
      </PlayerProvider>,
    );

    await waitFor(() => expect(screen.getByText('Lvl 1')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Build' }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/food_productions',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('shows the prey pool and active effect badges on a farm', async () => {
    const withPrey = {
      ...player,
      active_effects: [
        {
          id: 9,
          kind: 'algae',
          name: 'Algal Bloom',
          scope: 'food_production',
          multiplier: 0.4,
          habitat_id: null,
          food_production_id: 5,
          expires_at: '2026-02-01T00:00:00Z',
        },
      ],
      food_productions: {
        buildings: [
          {
            id: 5,
            kind: 'fishing_pond',
            name: 'Fishing Pond',
            level: 1,
            food_column: 'food_fish',
            output_per_day: 35,
            prey: true,
            prey_population: 120,
            prey_capacity: 210,
            last_collected_at: null,
          },
        ],
        catalog: player.food_productions.catalog,
      },
    };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(withPrey), { status: 200 }));

    render(
      <PlayerProvider>
        <MemoryRouter>
          <ProductionPage />
        </MemoryRouter>
      </PlayerProvider>,
    );

    await waitFor(() => expect(screen.getByText('Prey pool')).toBeInTheDocument());
    expect(screen.getByText('120/210')).toBeInTheDocument();
    expect(screen.getByText(/Algal Bloom -60%/)).toBeInTheDocument();
  });

  it('shows attractions with passive income and upgrades via the API', async () => {
    const withAttractions = {
      ...player,
      attractions: {
        built: [
          {
            id: 3,
            kind: 'carousel',
            name: 'Dino Carousel',
            level: 2,
            income_per_day: 120,
            last_collected_at: null,
          },
        ],
        catalog: [
          {
            kind: 'carousel',
            name: 'Dino Carousel',
            income_per_day: 60,
            build_cost: 5000,
            required_tech: 'attractions',
            unlocked: true,
          },
        ],
      },
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(withAttractions), { status: 200 }),
    );

    render(
      <PlayerProvider>
        <MemoryRouter>
          <ProductionPage />
        </MemoryRouter>
      </PlayerProvider>,
    );

    await waitFor(() => expect(screen.getByText('Attractions')).toBeInTheDocument());
    expect(screen.getByText(/Passive income: \+120\/day/)).toBeInTheDocument();
    expect(screen.getByText('Lvl 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Upgrade' }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/attractions/3/upgrade',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
