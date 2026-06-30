import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Container, Fullscreen } from '@react-three/uikit';
import { useGame } from '../context/PlayerContext';
import { useScreen } from './ScreenContext';
import { SCREENS, type ScreenId } from './screensConfig';
import { WebglStateProvider, useWebgl } from './WebglState';
import ParkWorld from './world/ParkWorld';
import ParkHud from './screens/ParkHud';
import TopBar from './ui/TopBar';
import OnboardingPanel from './ui/OnboardingPanel';
import InfoPanel from './ui/InfoPanel';
import { SCENE_BG } from './palette';
import './uikitTheme';

// Root of the WebGL game: one full-screen canvas holding the 3D park world and
// the uikit HUD. PlayerProvider/ScreenProvider live outside (for any DOM use and
// React state), and their values are bridged inside via WebglStateProvider.
export default function GameCanvas() {
  const game = useGame();
  const { screen, setScreen } = useScreen();
  const value = useMemo(() => ({ game, screen, setScreen }), [game, screen, setScreen]);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas camera={{ position: [0, 16, 22], fov: 50 }}>
        <color attach="background" args={[SCENE_BG]} />
        <WebglStateProvider value={value}>
          <GameContent />
        </WebglStateProvider>
      </Canvas>
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <Container flexGrow={1} alignItems="center" justifyContent="center">
      {children}
    </Container>
  );
}

function screenLabel(id: ScreenId): string {
  return SCREENS.find((s) => s.id === id)?.label ?? id;
}

function GameContent() {
  const { game, screen } = useWebgl();
  const [selectedDinoId, setSelectedDinoId] = useState<number | null>(null);
  const [selectedHabitatId, setSelectedHabitatId] = useState<number | null>(null);

  const player = game.player;
  const selectedDino = player?.dinosaurs.find((d) => d.id === selectedDinoId) ?? null;
  const selectedHabitat = player?.habitats.find((h) => h.id === selectedHabitatId) ?? null;
  const clearSelection = () => {
    setSelectedDinoId(null);
    setSelectedHabitatId(null);
  };

  let body: ReactNode;
  if (game.loading) {
    body = (
      <Centered>
        <InfoPanel title="Loading your park..." />
      </Centered>
    );
  } else if (game.needsOnboarding) {
    body = (
      <Centered>
        <OnboardingPanel />
      </Centered>
    );
  } else if (!player) {
    body = (
      <Centered>
        <InfoPanel title="Unable to load your park" message={game.error ?? undefined} />
      </Centered>
    );
  } else if (screen === 'park') {
    body = (
      <>
        <TopBar />
        <ParkHud
          selectedDino={selectedDino}
          selectedHabitat={selectedHabitat}
          clearSelection={clearSelection}
        />
      </>
    );
  } else {
    body = (
      <>
        <TopBar />
        <Centered>
          <InfoPanel
            title={`${screenLabel(screen)} - coming soon`}
            message="This screen is being rebuilt in 3D in an upcoming update."
          />
        </Centered>
      </>
    );
  }

  return (
    <>
      {screen === 'park' && player && (
        <ParkWorld
          habitats={player.habitats}
          dinosaurs={player.dinosaurs}
          activeEffects={player.active_effects ?? []}
          selectedDinoId={selectedDinoId}
          selectedHabitatId={selectedHabitatId}
          onSelectDino={(d) => {
            setSelectedDinoId(d.id);
            setSelectedHabitatId(null);
          }}
          onSelectHabitat={(h) => {
            setSelectedHabitatId(h.id);
            setSelectedDinoId(null);
          }}
          onDeselect={clearSelection}
        />
      )}
      <Fullscreen flexDirection="column">{body}</Fullscreen>
    </>
  );
}
