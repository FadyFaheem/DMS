import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TILE_HEIGHT } from './parkLayout';

interface Props {
  position: [number, number];
  color: string;
}

const BASE_Y = TILE_HEIGHT + 1.6;

// A floating, bobbing marker that draws attention to a habitat currently
// affected by an active event (heat spike, disease, etc.).
export default function HazardMarker({ position, color }: Props) {
  const ref = useRef<THREE.Mesh>(null);
  const [x, z] = position;

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = BASE_Y + Math.sin(state.clock.elapsedTime * 3) * 0.12;
    ref.current.rotation.y += 0.02;
  });

  return (
    <mesh ref={ref} position={[x, BASE_Y, z]}>
      <octahedronGeometry args={[0.28, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} flatShading />
    </mesh>
  );
}
