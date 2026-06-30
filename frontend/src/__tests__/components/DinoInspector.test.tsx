import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DinoInspector from '../../components/DinoInspector';

const dino = {
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
  health: 40,
  hunger: 50,
  happiness: 50,
  reproduction_readiness: 0,
  status: 'Struggling',
  alive: true,
  mutations: [],
  parent_a_id: null,
  parent_b_id: null,
  born_at: '2026-01-01T00:00:00Z',
  diseases: ['parasites'],
  quarantined: false,
  health_history: [],
};

describe('DinoInspector', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    localStorage.clear();
    localStorage.setItem('player_code', 'CODE-1');
  });

  it('shows active diseases and treats via the API when a vet lab is built', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ...dino, diseases: [] }), { status: 200 }),
    );

    render(
      <DinoInspector
        dino={dino}
        habitats={[]}
        vetLabBuilt
        onClose={() => {}}
        onChanged={() => {}}
      />,
    );

    expect(screen.getByText('parasites')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Treat' }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/dinosaurs/9/treat',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
