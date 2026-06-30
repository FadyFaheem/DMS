import * as THREE from 'three';
import type { Dinosaur } from '../../api/players';
import { hashString, seededRng } from '../../utils/seededRandom';

export interface DinoShape {
  body: THREE.Color;
  dark: THREE.Color;
  scale: number;
  longNeck: boolean;
  bodyLen: number;
  headSize: number;
  neckH: number;
  phase: number;
}

// Deterministic low-poly dino proportions + colors seeded by species|color|id,
// so each dino looks distinct but stable. Unhealthy dinos are desaturated.
export function dinoShape(
  dino: Pick<Dinosaur, 'species' | 'color' | 'id' | 'alive' | 'health' | 'size_lbs'> & {
    diseases?: string[];
  },
): DinoShape {
  const rand = seededRng(`${dino.species}|${dino.color ?? 'plain'}|${dino.id}`);
  const hue = (hashString(dino.color ?? dino.species) % 360) / 360;
  const healthy = dino.alive && (dino.diseases?.length ?? 0) === 0 && dino.health >= 40;
  const sat = healthy ? 0.5 : 0.12;
  const longNeck = rand() > 0.45;
  return {
    body: new THREE.Color().setHSL(hue, sat, 0.46),
    dark: new THREE.Color().setHSL(hue, sat, 0.3),
    scale: 0.7 + Math.min(1, dino.size_lbs / 4000) * 0.7,
    longNeck,
    bodyLen: 0.9 + rand() * 0.5,
    headSize: 0.2 + rand() * 0.08,
    neckH: longNeck ? 0.7 : 0.32,
    phase: rand() * Math.PI * 2,
  };
}
