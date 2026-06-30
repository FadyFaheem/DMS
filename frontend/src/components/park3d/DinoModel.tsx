import { useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Dinosaur } from '../../api/players';
import { hashString, seededRng } from '../../utils/seededRandom';

interface Props {
  dino: Dinosaur;
  position: [number, number, number];
  rotation: number;
  onSelect?: (dino: Dinosaur) => void;
}

// A low-poly dinosaur assembled from primitives, seeded by species|color|id so
// each dino looks distinct but stable (same approach as the 2D DinoPortrait).
// Unhealthy dinos are desaturated. Geometry is intentionally cheap; an upgrade
// path is a shared GLTF via useGLTF.
export default function DinoModel({ dino, position, rotation, onSelect }: Props) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const shape = useMemo(() => {
    const rand = seededRng(`${dino.species}|${dino.color ?? 'plain'}|${dino.id}`);
    const hue = (hashString(dino.color ?? dino.species) % 360) / 360;
    const healthy = dino.alive && (dino.diseases?.length ?? 0) === 0 && dino.health >= 40;
    const sat = healthy ? 0.5 : 0.12;
    const body = new THREE.Color().setHSL(hue, sat, 0.46);
    const dark = new THREE.Color().setHSL(hue, sat, 0.3);
    // Scale by weight but clamp so a sauropod never swallows its tile.
    const scale = 0.7 + Math.min(1, dino.size_lbs / 4000) * 0.7;
    const longNeck = rand() > 0.45;
    return {
      body,
      dark,
      scale,
      longNeck,
      bodyLen: 0.9 + rand() * 0.5,
      headSize: 0.2 + rand() * 0.08,
      neckH: longNeck ? 0.7 : 0.32,
      phase: rand() * Math.PI * 2,
    };
  }, [
    dino.species,
    dino.color,
    dino.id,
    dino.alive,
    dino.health,
    dino.size_lbs,
    dino.diseases?.length,
  ]);

  const baseY = position[1];
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime * 1.6 + shape.phase;
    group.current.position.y = baseY + Math.sin(t) * 0.05;
    group.current.rotation.y = rotation + Math.sin(t * 0.5) * 0.12;
  });

  const front = shape.bodyLen * 0.42;
  const neckTopY = 0.55 + shape.neckH + 0.1;
  const legSpots: Array<[number, number]> = [
    [0.2, shape.bodyLen * 0.28],
    [-0.2, shape.bodyLen * 0.28],
    [0.2, -shape.bodyLen * 0.28],
    [-0.2, -shape.bodyLen * 0.28],
  ];

  return (
    <group
      ref={group}
      position={position}
      rotation={[0, rotation, 0]}
      scale={shape.scale}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect?.(dino);
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
      {legSpots.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.2, z]}>
          <boxGeometry args={[0.12, 0.4, 0.12]} />
          <meshStandardMaterial color={shape.dark} flatShading />
        </mesh>
      ))}

      {/* body */}
      <mesh position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.28, shape.bodyLen, 4, 10]} />
        <meshStandardMaterial color={shape.body} flatShading />
      </mesh>

      {/* tail */}
      <mesh position={[0, 0.52, -(shape.bodyLen / 2 + 0.28)]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.17, 0.7, 8]} />
        <meshStandardMaterial color={shape.dark} flatShading />
      </mesh>

      {/* neck */}
      <mesh position={[0, 0.55 + shape.neckH / 2 + 0.05, front]}>
        <cylinderGeometry args={[0.12, 0.17, shape.neckH, 8]} />
        <meshStandardMaterial color={shape.body} flatShading />
      </mesh>

      {/* head */}
      <mesh position={[0, neckTopY, front + 0.06]}>
        <sphereGeometry args={[shape.headSize, 10, 10]} />
        <meshStandardMaterial color={shape.body} flatShading />
      </mesh>

      {hovered && (
        <Html
          position={[0, neckTopY + 0.5, front]}
          center
          distanceFactor={12}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              background: 'rgba(33,33,33,0.9)',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 13,
              fontFamily: 'sans-serif',
              whiteSpace: 'nowrap',
            }}
          >
            {dino.name} · {Math.round(dino.health)} hp
          </div>
        </Html>
      )}
    </group>
  );
}
