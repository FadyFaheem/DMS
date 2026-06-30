import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlayerProvider } from '../../context/PlayerContext';
import SpeciesPage from '../../pages/SpeciesPage';

function entry(overrides: Record<string, unknown>) {
  return {
    key: 'x',
    name: 'X',
    period: 'Cretaceous',
    diet_primary: 'plants',
    diet_secondary: null,
    preferred_terrain: 'grassland',
    social_structure: 'herd',
    base_size_lbs: 1000,
    rarity: 'common',
    starter: false,
    acquire_cost: 1500,
    required_tech: null,
    requires_population: 0,
    unlocked: false,
    owned_count: 0,
    ...overrides,
  };
}

const player = {
  id: 1,
  player_code: 'CODE-1',
  display_name: 'Ada',
  currency: 10000,
  food: { plants: 0, meat: 0, fish: 0 },
  habitats: [],
  dinosaurs: [],
  summary: { population: 1, by_category: {}, avg_health: 0, critical: 0, sick: 0 },
  research: { unlocked: [], catalog: [] },
  species: {
    periods: ['Triassic', 'Jurassic', 'Cretaceous'],
    catalog: [
      entry({
        key: 'triceratops',
        name: 'Triceratops',
        starter: true,
        unlocked: true,
        owned_count: 1,
      }),
      entry({ key: 'plateosaurus', name: 'Plateosaurus', period: 'Triassic' }),
      entry({
        key: 'spinosaurus',
        name: 'Spinosaurus',
        diet_primary: 'fish',
        preferred_terrain: 'aquatic',
        rarity: 'rare',
        acquire_cost: 7000,
        required_tech: 'piscivore_unlock',
      }),
    ],
  },
};

describe('SpeciesPage', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    localStorage.clear();
    localStorage.setItem('player_code', 'CODE-1');
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(player), { status: 200 }));
  });

  function renderPage() {
    render(
      <PlayerProvider>
        <MemoryRouter>
          <SpeciesPage />
        </MemoryRouter>
      </PlayerProvider>,
    );
  }

  it('renders the catalog and shows a locked piscivore requirement', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Triceratops')).toBeInTheDocument());
    expect(screen.getByText('Spinosaurus')).toBeInTheDocument();
    expect(screen.getByText(/Requires: piscivore_unlock/)).toBeInTheDocument();
  });

  it('filters the catalog by period', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Plateosaurus')).toBeInTheDocument());
    expect(screen.getByText('Triceratops')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Triassic' }));

    expect(screen.getByText('Plateosaurus')).toBeInTheDocument();
    expect(screen.queryByText('Triceratops')).not.toBeInTheDocument();
  });

  it('acquires a species via the API', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Plateosaurus')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Triassic' }));
    fireEvent.click(screen.getByRole('button', { name: /Acquire/ }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/species',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
