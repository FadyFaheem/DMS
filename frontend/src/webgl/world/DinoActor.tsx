import { useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { Dinosaur } from '../../api/players';
import { dinoShape } from '../../components/park3d/dinoShape';
import { TILE_HEIGHT } from '../../components/park3d/parkLayout';
import { headingToward, nextWanderTarget, stepToward, type Vec2 } from '../../components/park3d/wander';
import { seededRng } from '../../utils/seededRandom';

interface Props {
  dino: Dinosaur;
  tileCenter: Vec2;
  bounds: number;
  onSelect: (dino: Dinosaur) => void;
  selected: boolean;
}

const SPEED = 0.7;

// Health -> bar color. Semantic (not brand) colors; mesh bars can't read the
// uikit/MUI theme, so they are defined here.
function healthColor(health: number): string {
  if (health >= 60) return '#2e7d32';
  if (health >= 30) return '#ed6c02';
  return '#d32f2f';
}

// A roaming low-poly dinosaur: wanders within its habitat tile, faces its
// heading, bobs, and shows a billboarded health bar. Click selects it.
export default function DinoActor({ dino, tileCenter, bounds, onSelect, selected }: Props) {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const shape = useMemo(
    () => dinoShape(dino),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dino.species, dino.color, dino.id, dino.alive, dino.health, dino.size_lbs, dino.diseases?.length],
  );

  const rng = useMemo(() => seededRng(`${dino.id}-wander`), [dino.id]);
  const motion = useRef<{ pos: Vec2; target: Vec2; heading: number; pause: number }>(null!);
  if (motion.current == null) {
    const pos = nextWanderTarget(tileCenter.x, tileCenter.z, bounds, rng);
    const target = nextWanderTarget(tileCenter.x, tileCenter.z, bounds, rng);
    motion.current = { pos, target, heading: headingToward(pos, target), pause: 0 };
  }

  useFrame((state, delta) => {
    const g = outer.current;
    const body = inner.current;
    if (!g || !body) return;
    const m = motion.current;
    const dt = Math.min(delta, 0.1);

    if (dino.alive) {
      if (m.pause > 0) {
        m.pause -= dt;
      } else {
        const next = stepToward(m.pos, m.target, SPEED * dt);
        m.pos = next.pos;
        if (next.reached) {
          m.pause = 0.4 + rng() * 1.6;
          m.target = nextWanderTarget(tileCenter.x, tileCenter.z, bounds, rng);
          m.heading = headingToward(m.pos, m.target);
        }
      }
    }

    g.position.x = m.pos.x;
    g.position.z = m.pos.z;
    g.position.y = TILE_HEIGHT + (dino.alive ? Math.sin(state.clock.elapsedTime * 4 + shape.phase) * 0.04 : 0);
    body.rotation.y = m.heading;
  });

  const front = shape.bodyLen * 0.42;
  const neckTopY = 0.55 + shape.neckH + 0.1;
  const legSpots: Array<[number, number]> = [
    [0.2, shape.bodyLen * 0.28],
    [-0.2, shape.bodyLen * 0.28],
    [0.2, -shape.bodyLen * 0.28],
    [-0.2, -shape.bodyLen * 0.28],
  ];
  const pct = Math.max(0, Math.min(1, dino.health / 100));
  const barWidth = 0.9;
  const barY = 1.7 * shape.scale + 0.2;

  return (
    <group ref={outer}>
      <group
        ref={inner}
        scale={shape.scale}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(dino);
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        {legSpots.map(([x, z], i) => (
          <mesh key={i} position={[x, 0.2, z]}>
            <boxGeometry args={[0.12, 0.4, 0.12]} />
            <meshStandardMaterial color={shape.dark} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.28, shape.bodyLen, 4, 10]} />
          <meshStandardMaterial color={shape.body} flatShading />
        </mesh>
        <mesh position={[0, 0.52, -(shape.bodyLen / 2 + 0.28)]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.17, 0.7, 8]} />
          <meshStandardMaterial color={shape.dark} flatShading />
        </mesh>
        <mesh position={[0, 0.55 + shape.neckH / 2 + 0.05, front]}>
          <cylinderGeometry args={[0.12, 0.17, shape.neckH, 8]} />
          <meshStandardMaterial color={shape.body} flatShading />
        </mesh>
        <mesh position={[0, neckTopY, front + 0.06]}>
          <sphereGeometry args={[shape.headSize, 10, 10]} />
          <meshStandardMaterial color={shape.body} flatShading />
        </mesh>
        {selected && (
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.55, 0.7, 24]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
        )}
      </group>

      <Billboard position={[0, barY, 0]}>
        <mesh>
          <planeGeometry args={[barWidth + 0.06, 0.18]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.5} />
        </mesh>
        <mesh position={[-(barWidth * (1 - pct)) / 2, 0, 0.001]}>
          <planeGeometry args={[Math.max(0.001, barWidth * pct), 0.12]} />
          <meshBasicMaterial color={healthColor(dino.health)} />
        </mesh>
      </Billboard>
    </group>
  );
}
