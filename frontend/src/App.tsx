import { PlayerProvider } from './context/PlayerContext';
import { ScreenProvider } from './webgl/ScreenContext';
import GameCanvas from './webgl/GameCanvas';

// The whole game now renders inside a single WebGL canvas. PlayerProvider and
// ScreenProvider hold game/identity and navigation state outside the canvas; the
// values are bridged inside (see GameCanvas / WebglState).
export default function App() {
  return (
    <PlayerProvider>
      <ScreenProvider>
        <GameCanvas />
      </ScreenProvider>
    </PlayerProvider>
  );
}
