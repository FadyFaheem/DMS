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
});
