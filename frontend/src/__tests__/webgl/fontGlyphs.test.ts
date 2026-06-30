import { describe, it, expect } from 'vitest';
import { inter } from '@pmndrs/msdfonts/inter';

// The WebGL HUD renders text with @react-three/uikit, which uses the bundled
// Inter MSDF atlas. That atlas only covers ASCII plus a handful of extras
// (German umlauts, section sign, degree). Any other character logs
// "Missing glyph info for character ..." every frame (uikit re-measures text in
// the render loop), so a single stray "·"/"•"/"—"/emoji spams the console.
// This guard fails if any webgl source uses a non-ASCII glyph the font lacks.

const supported = new Set<string>();
for (const weight of Object.values(inter)) {
  for (const glyph of weight.chars ?? []) supported.add(glyph.char);
}

const sources = import.meta.glob('../../webgl/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('webgl uikit text uses only glyphs in the Inter atlas', () => {
  it('has at least one source file to check', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(0);
  });

  it('contains no non-ASCII characters missing from the font', () => {
    const offenders: string[] = [];
    for (const [path, content] of Object.entries(sources)) {
      const missing = new Set<string>();
      for (const char of content) {
        const cp = char.codePointAt(0) ?? 0;
        // Only non-ASCII glyphs can be missing; printable ASCII is fully covered.
        if (cp > 0x7f && !supported.has(char)) missing.add(char);
      }
      for (const char of missing) {
        offenders.push(`${path}: "${char}" (U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')})`);
      }
    }
    expect(offenders, `Unsupported glyph(s) found:\n${offenders.join('\n')}`).toEqual([]);
  });
});
