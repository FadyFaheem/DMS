import { useState } from 'react';
import { Container, Text } from '@react-three/uikit';
import { Button, Card, Progress } from '@react-three/uikit-default';
import type { ResearchTech } from '../../api/players';
import { unlockResearch } from '../../api/research';
import { useWebgl } from '../WebglState';
import { BRAND_COLORS } from '../../theme/theme';
import ScreenScaffold from '../ui/ScreenScaffold';

// WebGL Research tree: unlock technologies (gated by prerequisites, population,
// and cost).
export default function ResearchScreen() {
  const { game } = useWebgl();
  const player = game.player;
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!player) return null;
  const research = player.research;
  const unlockedKeys = new Set(research.unlocked);
  const total = research.catalog.length;
  const unlocked = research.catalog.filter((t) => t.unlocked).length;

  const unlock = async (key: string) => {
    setBusyKey(key);
    setError(null);
    try {
      await unlockResearch(key);
      await game.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <ScreenScaffold title="Research">
      <Container flexDirection="column" gap={4} width={320}>
        <Container flexDirection="row" justifyContent="space-between">
          <Text fontSize={13}>Research progress</Text>
          <Text fontSize={13} color={BRAND_COLORS.mediumGray}>
            {unlocked}/{total}
          </Text>
        </Container>
        <Progress value={total ? (unlocked / total) * 100 : 0} width="100%" />
      </Container>
      {error != null && (
        <Text fontSize={13} color="#d32f2f">
          {error}
        </Text>
      )}
      <Container flexDirection="row" gap={12} flexWrap="wrap">
        {research.catalog.map((tech) => (
          <TechCard
            key={tech.key}
            tech={tech}
            unlockedKeys={unlockedKeys}
            currency={player.currency}
            population={player.summary.population}
            busy={busyKey === tech.key}
            onUnlock={() => unlock(tech.key)}
          />
        ))}
      </Container>
    </ScreenScaffold>
  );
}

function TechCard({
  tech,
  unlockedKeys,
  currency,
  population,
  busy,
  onUnlock,
}: {
  tech: ResearchTech;
  unlockedKeys: Set<string>;
  currency: number;
  population: number;
  busy: boolean;
  onUnlock: () => void;
}) {
  const missingPrereqs = tech.prerequisites.filter((p) => !unlockedKeys.has(p));
  const needsPopulation = tech.requires_population > population;
  const affordable = currency >= tech.cost;
  const canUnlock = !tech.unlocked && missingPrereqs.length === 0 && !needsPopulation && affordable;

  return (
    <Card flexDirection="column" gap={5} padding={14} width={240}>
      <Container flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text fontSize={15} fontWeight="bold">
          {tech.name}
        </Text>
        <Text fontSize={11} color={tech.unlocked ? '#2e7d32' : BRAND_COLORS.mediumGray}>
          {tech.unlocked ? 'Unlocked' : tech.cost.toLocaleString()}
        </Text>
      </Container>
      <Text fontSize={11} color={BRAND_COLORS.mediumGray}>
        {tech.description}
      </Text>
      {missingPrereqs.length > 0 && (
        <Text fontSize={11} color="#ed6c02">
          Requires: {missingPrereqs.join(', ')}
        </Text>
      )}
      {needsPopulation && (
        <Text fontSize={11} color="#ed6c02">
          Requires {tech.requires_population} living dinosaurs
        </Text>
      )}
      {!tech.unlocked && (
        <Button variant="default" size="sm" disabled={!canUnlock || busy} onClick={onUnlock}>
          <Text>{affordable ? 'Unlock' : 'Too expensive'}</Text>
        </Button>
      )}
    </Card>
  );
}
