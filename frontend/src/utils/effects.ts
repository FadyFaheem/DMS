import type { ActiveEffect } from '../api/players';

// Human label for an environmental/production event (falls back to a tidied kind).
export function effectLabel(effect: ActiveEffect): string {
  return effect.name ?? effect.kind.replace(/_/g, ' ');
}

// How much the effect throttles its target's output, e.g. "-60%".
export function effectImpactLabel(effect: ActiveEffect): string {
  return `-${Math.round((1 - effect.multiplier) * 100)}%`;
}
