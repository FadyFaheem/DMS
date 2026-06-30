import { useState } from 'react';
import { Container, Text } from '@react-three/uikit';
import { Button, Card, Input, Progress } from '@react-three/uikit-default';
import type { Habitat } from '../../api/players';
import { buildHabitat, upgradeHabitat } from '../../api/habitats';
import { useWebgl } from '../WebglState';
import { BRAND_COLORS } from '../../theme/theme';
import ScreenScaffold from '../ui/ScreenScaffold';

const TERRAINS = ['forest', 'grassland', 'wetland', 'volcanic', 'aquatic'];

// WebGL Habitats screen: build new habitats and upgrade existing ones.
export default function HabitatsScreen() {
  const { game } = useWebgl();
  const player = game.player;
  const [terrain, setTerrain] = useState('grassland');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!player) return null;
  const canUpgrade = player.research.unlocked.includes('habitat_expansion');

  const build = async () => {
    setBusy(true);
    setError(null);
    try {
      await buildHabitat(terrain, name || undefined);
      setName('');
      await game.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenScaffold title="Habitats">
      <Card flexDirection="column" gap={10} padding={16}>
        <Text fontSize={16} fontWeight="bold">
          Build a habitat
        </Text>
        <Container flexDirection="row" gap={6} flexWrap="wrap">
          {TERRAINS.map((t) => (
            <Button
              key={t}
              size="sm"
              variant={t === terrain ? 'default' : 'outline'}
              onClick={() => setTerrain(t)}
            >
              <Text>{t}</Text>
            </Button>
          ))}
        </Container>
        <Input value={name} onValueChange={setName} placeholder="Name (optional)" />
        {error != null && (
          <Text fontSize={13} color="#d32f2f">
            {error}
          </Text>
        )}
        <Button variant="default" size="sm" disabled={busy} onClick={build}>
          <Text>Build</Text>
        </Button>
      </Card>

      <Container flexDirection="row" gap={12} flexWrap="wrap">
        {player.habitats.map((habitat) => (
          <HabitatCard
            key={habitat.id}
            habitat={habitat}
            residents={player.dinosaurs.filter((d) => d.habitat_id === habitat.id && d.alive).length}
            canUpgrade={canUpgrade}
            onChanged={game.refresh}
          />
        ))}
      </Container>
    </ScreenScaffold>
  );
}

function HabitatCard({
  habitat,
  residents,
  canUpgrade,
  onChanged,
}: {
  habitat: Habitat;
  residents: number;
  canUpgrade: boolean;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const fill = Math.min(100, (habitat.living_count / habitat.capacity) * 100);
  const upgrade = async () => {
    setBusy(true);
    try {
      await upgradeHabitat(habitat.id);
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card flexDirection="column" gap={6} padding={14} width={240}>
      <Container flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text fontSize={15} fontWeight="bold">
          {habitat.name}
        </Text>
        <Text fontSize={12} color={BRAND_COLORS.mediumGray}>
          Lvl {habitat.level}
        </Text>
      </Container>
      <Text fontSize={12} color={BRAND_COLORS.mediumGray}>
        {habitat.terrain} | {habitat.living_count}/{habitat.capacity}
      </Text>
      <Progress value={fill} width="100%" />
      <Container flexDirection="row" gap={6} flexWrap="wrap">
        {habitat.temperature != null && (
          <Text fontSize={11} color={BRAND_COLORS.mediumGray}>
            {habitat.temperature}°C
          </Text>
        )}
        {habitat.humidity != null && (
          <Text fontSize={11} color={BRAND_COLORS.mediumGray}>
            {habitat.humidity}% RH
          </Text>
        )}
        <Text fontSize={11} color={BRAND_COLORS.mediumGray}>
          Forage {habitat.food_stockpile ?? 0}
        </Text>
      </Container>
      <Text fontSize={11} color={BRAND_COLORS.mediumGray}>
        {residents} resident{residents === 1 ? '' : 's'}
      </Text>
      <Button
        variant="outline"
        size="sm"
        disabled={!canUpgrade || busy}
        onClick={upgrade}
      >
        <Text>{canUpgrade ? 'Upgrade' : 'Needs Habitat Expansion'}</Text>
      </Button>
    </Card>
  );
}
