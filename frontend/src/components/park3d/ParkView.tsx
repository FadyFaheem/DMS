import { Suspense, lazy, useMemo } from 'react';
import type { ActiveEffect, Dinosaur, Habitat } from '../../api/players';
import ParkMap from '../ParkMap';

// Lazy-load the 3D scene so three.js stays out of the main bundle until needed.
const ParkScene = lazy(() => import('./ParkScene'));

interface Props {
  habitats: Habitat[];
  dinosaurs: Dinosaur[];
  activeEffects: ActiveEffect[];
  onStock: (habitatId: number, amount: number) => Promise<void>;
  onInspectDino?: (dino: Dinosaur) => void;
}

// WebGL isn't available everywhere (locked-down devices, headless test
// environments like jsdom). Detect it once and degrade gracefully to the 2D
// ParkMap, which shares the same props and HabitatDialog.
function webglAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

export default function ParkView(props: Props) {
  const supported = useMemo(() => webglAvailable(), []);
  if (!supported) return <ParkMap {...props} />;
  return (
    <Suspense fallback={<ParkMap {...props} />}>
      <ParkScene {...props} />
    </Suspense>
  );
}
