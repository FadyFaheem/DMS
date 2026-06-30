import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ParkMap from '../../components/ParkMap';
import type { Dinosaur, Habitat } from '../../api/players';

const habitat: Habitat = {
  id: 3,
  name: 'Glade',
  terrain: 'forest',
  capacity: 6,
  level: 1,
  happiness_modifier: 10,
  living_count: 1,
  temperature: 18,
  humidity: 60,
  food_stockpile: 0,
  feature: 'shade',
  feature_label: 'Shaded canopy keeps residents cool',
};

const dino: Dinosaur = {
  id: 9,
  name: 'Rexy',
  species: 'velociraptor',
  period: 'Cretaceous',
  gender: 'female',
  color: 'amber',
  size_lbs: 35,
  generation: 1,
  habitat_id: 3,
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
  diseases: [],
  quarantined: false,
  health_history: [],
};

describe('ParkMap', () => {
  it('opens a habitat tile and stocks plants', async () => {
    const onStock = vi.fn().mockResolvedValue(undefined);
    render(
      <ParkMap habitats={[habitat]} dinosaurs={[dino]} activeEffects={[]} onStock={onStock} />,
    );

    fireEvent.click(screen.getByText('Glade'));
    expect(screen.getByText(/Shaded canopy/)).toBeInTheDocument();
    expect(screen.getByText('Rexy')).toBeInTheDocument(); // resident listed

    fireEvent.click(screen.getByRole('button', { name: 'Stock' }));
    await waitFor(() => expect(onStock).toHaveBeenCalledWith(3, 20));
  });

  it('inspects a resident when clicked', () => {
    const onInspectDino = vi.fn();
    render(
      <ParkMap
        habitats={[habitat]}
        dinosaurs={[dino]}
        activeEffects={[]}
        onStock={vi.fn()}
        onInspectDino={onInspectDino}
      />,
    );

    fireEvent.click(screen.getByText('Glade'));
    fireEvent.click(screen.getByText('Rexy'));
    expect(onInspectDino).toHaveBeenCalledWith(dino);
  });
});
