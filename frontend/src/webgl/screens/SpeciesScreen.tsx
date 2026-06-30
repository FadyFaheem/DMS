import { useState } from 'react';
import { Container, Text } from '@react-three/uikit';
import { Button, Card } from '@react-three/uikit-default';
import type { SpeciesCatalogEntry } from '../../api/players';
import { acquireSpecies } from '../../api/species';
import { useWebgl } from '../WebglState';
import { BRAND_COLORS } from '../../theme/theme';
import ScreenScaffold from '../ui/ScreenScaffold';

const ALL = 'All';

// WebGL Species catalog: filter by period and acquire dinosaurs.
export default function SpeciesScreen() {
  const { game } = useWebgl();
  const player = game.player;
  const [period, setPeriod] = useState<string>(ALL);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!player) return null;
  const species = player.species ?? { periods: [], catalog: [] };
  const unlockedTech = new Set(player.research?.unlocked ?? []);
  const visible = species.catalog.filter((s) => period === ALL || s.period === period);

  const acquire = async (key: string) => {
    setBusyKey(key);
    setError(null);
    try {
      await acquireSpecies(key);
      await game.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <ScreenScaffold title="Species">
      {error != null && (
        <Text fontSize={13} color="#d32f2f">
          {error}
        </Text>
      )}
      <Container flexDirection="row" gap={6} flexWrap="wrap">
        {[ALL, ...species.periods].map((p) => (
          <Button
            key={p}
            size="sm"
            variant={p === period ? 'default' : 'outline'}
            onClick={() => setPeriod(p)}
          >
            <Text>{p}</Text>
          </Button>
        ))}
      </Container>
      <Container flexDirection="row" gap={12} flexWrap="wrap">
        {visible.map((entry) => (
          <SpeciesCard
            key={entry.key}
            entry={entry}
            techUnlocked={!entry.required_tech || unlockedTech.has(entry.required_tech)}
            population={player.summary.population}
            currency={player.currency}
            busy={busyKey === entry.key}
            onAcquire={() => acquire(entry.key)}
          />
        ))}
      </Container>
    </ScreenScaffold>
  );
}

function SpeciesCard({
  entry,
  techUnlocked,
  population,
  currency,
  busy,
  onAcquire,
}: {
  entry: SpeciesCatalogEntry;
  techUnlocked: boolean;
  population: number;
  currency: number;
  busy: boolean;
  onAcquire: () => void;
}) {
  const needsPopulation = entry.requires_population > population;
  const affordable = currency >= entry.acquire_cost;
  const canAcquire = techUnlocked && !needsPopulation && affordable;

  return (
    <Card flexDirection="column" gap={5} padding={14} width={230}>
      <Container flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text fontSize={15} fontWeight="bold">
          {entry.name}
        </Text>
        <Text fontSize={11} color={entry.unlocked ? '#2e7d32' : BRAND_COLORS.mediumGray}>
          {entry.unlocked ? 'Unlocked' : entry.acquire_cost.toLocaleString()}
        </Text>
      </Container>
      <Text fontSize={11} color={BRAND_COLORS.mediumGray}>
        {entry.period} | {entry.diet_primary} | {entry.preferred_terrain} | {entry.rarity}
      </Text>
      <Text fontSize={11} color={BRAND_COLORS.mediumGray}>
        {entry.owned_count > 0 ? `You own ${entry.owned_count}` : 'None in your park'}
      </Text>
      {!techUnlocked && entry.required_tech != null && (
        <Text fontSize={11} color="#ed6c02">
          Requires: {entry.required_tech}
        </Text>
      )}
      {needsPopulation && (
        <Text fontSize={11} color="#ed6c02">
          Requires {entry.requires_population} living dinosaurs
        </Text>
      )}
      <Button variant="default" size="sm" disabled={!canAcquire || busy} onClick={onAcquire}>
        <Text>{affordable ? `Acquire (${entry.acquire_cost.toLocaleString()})` : 'Too expensive'}</Text>
      </Button>
    </Card>
  );
}
