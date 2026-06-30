import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlayerProvider } from '../../context/PlayerContext';
import GoalsPage from '../../pages/GoalsPage';

function goal(overrides: Record<string, unknown>) {
  return {
    key: 'growing_park',
    name: 'Growing Park',
    description: 'Reach a population of 10.',
    metric: 'population',
    threshold: 10,
    reward: 2000,
    win: false,
    current: 4,
    completed: false,
    ...overrides,
  };
}

function buildPlayer(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    player_code: 'CODE-1',
    display_name: 'Ada',
    currency: 10000,
    food: { plants: 0, meat: 0, fish: 0 },
    habitats: [],
    dinosaurs: [],
    summary: { population: 4, by_category: {}, avg_health: 0, critical: 0, sick: 0 },
    research: { unlocked: [], catalog: [] },
    species: { periods: [], catalog: [] },
    food_productions: { buildings: [], catalog: [] },
    structures: { built: [], catalog: [] },
    attractions: { built: [], catalog: [] },
    active_effects: [],
    events: [],
    goals: {
      completed: 1,
      total: 2,
      catalog: [
        goal({ key: 'growing_park', name: 'Growing Park', current: 4, completed: false }),
        goal({
          key: 'park_legend',
          name: 'Park Legend',
          metric: 'park_legend',
          threshold: 1,
          reward: 10000,
          win: true,
          current: 0,
          completed: false,
        }),
      ],
    },
    prestige: { level: 0, multiplier: 1, won: false, can_prestige: false },
    ...overrides,
  };
}

function renderPage() {
  render(
    <PlayerProvider>
      <MemoryRouter>
        <GoalsPage />
      </MemoryRouter>
    </PlayerProvider>,
  );
}

describe('GoalsPage', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    localStorage.clear();
    localStorage.setItem('player_code', 'CODE-1');
  });

  it('renders goals with progress and the prestige summary', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(buildPlayer()), { status: 200 }),
    );
    renderPage();

    await waitFor(() => expect(screen.getByText('Growing Park')).toBeInTheDocument());
    expect(screen.getByText('Park Legend')).toBeInTheDocument();
    expect(screen.getByText(/1\/2 achievements/)).toBeInTheDocument();
    // Win condition not met -> prestige is disabled.
    expect(screen.getByRole('button', { name: /Win to Prestige/ })).toBeDisabled();
  });

  it('shows the win banner and prestiges via the API once won', async () => {
    const wonPlayer = buildPlayer({
      prestige: { level: 0, multiplier: 1, won: true, can_prestige: true },
    });
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(wonPlayer), { status: 200 }));
    renderPage();

    await waitFor(() => expect(screen.getByTestId('win-banner')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Prestige \(New Game\+\)/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Prestige' }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/prestige',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
