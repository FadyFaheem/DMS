// Tiny deterministic hashing + PRNG shared by anything that needs stable,
// seedable randomness from a string (dino portraits, 3D dino models, scatter
// placement). No external dependency.

// FNV-1a hash -> 32-bit unsigned int.
export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 PRNG: tiny, deterministic, seedable. Returns a function yielding
// floats in [0, 1).
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Convenience: a seeded RNG straight from a string seed.
export function seededRng(seed: string): () => number {
  return mulberry32(hashString(seed));
}
