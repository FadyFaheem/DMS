import { Container, Text } from '@react-three/uikit';
import { Button } from '@react-three/uikit-default';
import { SCREENS } from '../screensConfig';
import { useWebgl } from '../WebglState';
import { gameDayLabel } from '../../utils/gameClock';
import { BRAND_COLORS } from '../../theme/theme';

// WebGL top navigation bar: section buttons + currency and game-day readouts.
export default function TopBar() {
  const { game, screen, setScreen } = useWebgl();
  const player = game.player;

  return (
    <Container
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      gap={8}
      paddingX={16}
      paddingY={8}
      backgroundColor={BRAND_COLORS.primary}
    >
      <Text fontSize={18} fontWeight="bold" color={BRAND_COLORS.white}>
        Dino Park Manager
      </Text>

      <Container flexDirection="row" gap={4} flexWrap="wrap" justifyContent="center">
        {SCREENS.map((s) => (
          <Button
            key={s.id}
            variant={screen === s.id ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setScreen(s.id)}
          >
            <Text color={screen === s.id ? BRAND_COLORS.darkGray : BRAND_COLORS.white}>
              {s.label}
            </Text>
          </Button>
        ))}
      </Container>

      <Container flexDirection="row" gap={8} alignItems="center">
        <Text fontSize={13} color={BRAND_COLORS.white}>
          {gameDayLabel(player?.created_at)}
        </Text>
        <Container
          backgroundColor={BRAND_COLORS.secondary}
          borderRadius={12}
          paddingX={10}
          paddingY={4}
        >
          <Text fontSize={14} fontWeight="bold" color={BRAND_COLORS.white}>
            {(player?.currency ?? 0).toLocaleString()}
          </Text>
        </Container>
      </Container>
    </Container>
  );
}
