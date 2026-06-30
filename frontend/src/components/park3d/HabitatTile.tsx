import { useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Habitat } from '../../api/players';
import { TILE_HEIGHT, TILE_SIZE } from './parkLayout';

interface Props {
  habitat: Habitat;
  position: [number, number];
  color: string;
  hasHazard: boolean;
  onSelect: (habitat: Habitat) => void;
}

// A single terrain tile: a colored slab the player can click to open the
// habitat dialog, with a floating label and a hazard/crowding outline.
export default function HabitatTile({ habitat, position, color, hasHazard, onSelect }: Props) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const [x, z] = position;
  const crowded = habitat.living_count > habitat.capacity * 0.8;

  useFrame(() => {
    if (mat.current) mat.current.emissiveIntensity = hovered ? 0.35 : 0;
  });

  return (
    <group position={[x, 0, z]}>
      <mesh
        position={[0, TILE_HEIGHT / 2, 0]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(habitat);
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[TILE_SIZE, TILE_HEIGHT, TILE_SIZE]} />
        <meshStandardMaterial ref={mat} color={color} emissive={color} flatShading />
        {(hasHazard || crowded) && (
          <Edges scale={1.02} threshold={15} color={hasHazard ? '#d32f2f' : '#ed6c02'} />
        )}
      </mesh>

      <Html
        position={[0, TILE_HEIGHT + 0.25, 0]}
        center
        distanceFactor={16}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.92)',
            color: '#212121',
            padding: '2px 10px',
            borderRadius: 8,
            fontFamily: 'sans-serif',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13 }}>{habitat.name}</div>
          <div style={{ fontSize: 11, color: crowded ? '#ed6c02' : '#616161' }}>
            {habitat.living_count}/{habitat.capacity}
            {hasHazard ? ' · !' : ''}
          </div>
        </div>
      </Html>
    </group>
  );
}
