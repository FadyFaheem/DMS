import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BreedingModal from '../../components/BreedingModal';
import type { Dinosaur } from '../../api/players';

function makeDino(overrides: Partial<Dinosaur>): Dinosaur {
  return {
    id: 1,
    name: 'Dino',
    species: 'triceratops',
    period: 'Cretaceous',
    gender: 'female',
    color: 'amber',
    size_lbs: 1000,
    generation: 1,
    habitat_id: 3,
    diet_primary: 'plants',
    diet_secondary: null,
    preferred_terrain: 'grassland',
    social_structure: 'herd',
    health: 90,
    hunger: 10,
    happiness: 70,
    reproduction_readiness: 100,
    status: 'Thriving',
    alive: true,
    mutations: [],
    parent_a_id: null,
    parent_b_id: null,
    born_at: '2026-01-01T00:00:00Z',
    diseases: [],
    quarantined: false,
    health_history: [],
    ...overrides,
  };
}

const mom = makeDino({ id: 1, name: 'Mom', gender: 'female' });
const dad = makeDino({ id: 2, name: 'Dad', gender: 'male' });

const preview = {
  compatible: true,
  reason: null,
  cost: 800,
  expected_generation: 2,
  species_options: [{ key: 'triceratops', name: 'Triceratops', chance: 1.0 }],
  diet_options: ['plants'],
  mutation_chance: 0.08,
  possible_traits: ['shiny', 'giant', 'dwarf'],
  genetics_quality: { min: 56, expected: 60, max: 76 },
};

describe('BreedingModal prediction', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    localStorage.clear();
    localStorage.setItem('player_code', 'CODE-1');
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/preview')) {
        return Promise.resolve(new Response(JSON.stringify(preview), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });
  });

  it('previews the offspring once two parents are selected', async () => {
    render(<BreedingModal open dinos={[mom, dad]} onClose={() => {}} onChanged={() => {}} />);

    const selects = screen.getAllByRole('combobox');
    fireEvent.mouseDown(selects[0]);
    fireEvent.click(await screen.findByRole('option', { name: 'Mom (female)' }));
    fireEvent.mouseDown(screen.getAllByRole('combobox')[1]);
    fireEvent.click(await screen.findByRole('option', { name: 'Dad (male)' }));

    await waitFor(() => expect(screen.getByTestId('breeding-prediction')).toBeInTheDocument());
    expect(screen.getByText(/Genetics \(IV\)/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/breedings/preview'),
      expect.anything(),
    );
  });
});
