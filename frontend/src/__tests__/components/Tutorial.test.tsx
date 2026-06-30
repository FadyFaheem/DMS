import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Tutorial from '../../components/Tutorial';

describe('Tutorial', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('walks through the steps and remembers completion', async () => {
    render(<Tutorial />);

    expect(screen.getByText('Welcome to your park')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Care for your dinosaurs')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(localStorage.getItem('dpm_tutorial_done')).toBe('1');
    await waitFor(() =>
      expect(screen.queryByText('Care for your dinosaurs')).not.toBeInTheDocument(),
    );
  });

  it('does not show again once completed', () => {
    localStorage.setItem('dpm_tutorial_done', '1');
    render(<Tutorial />);
    expect(screen.queryByText('Welcome to your park')).not.toBeInTheDocument();
  });
});
