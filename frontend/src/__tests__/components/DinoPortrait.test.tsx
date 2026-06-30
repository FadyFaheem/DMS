import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import DinoPortrait from '../../components/DinoPortrait';

describe('DinoPortrait', () => {
  it('renders a labelled svg deterministically for the same dino', () => {
    const first = render(<DinoPortrait species="velociraptor" color="amber" id={9} />);
    const svg = first.container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('aria-label')).toContain('velociraptor');
    const html = first.container.innerHTML;

    const second = render(<DinoPortrait species="velociraptor" color="amber" id={9} />);
    expect(second.container.innerHTML).toEqual(html);
  });

  it('produces distinct art for different dinos', () => {
    const a = render(<DinoPortrait species="velociraptor" color="amber" id={1} />).container
      .innerHTML;
    const b = render(<DinoPortrait species="velociraptor" color="amber" id={2} />).container
      .innerHTML;
    expect(a).not.toEqual(b);
  });
});
