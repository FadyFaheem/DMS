import { useState } from 'react';
import { Container, Text } from '@react-three/uikit';
import { Button, Card, Progress } from '@react-three/uikit-default';
import type { Goal } from '../../api/players';
import { prestige } from '../../api/prestige';
import { useWebgl } from '../WebglState';
import { BRAND_COLORS } from '../../theme/theme';
import ScreenScaffold from '../ui/ScreenScaffold';
import Modal from '../ui/Modal';

// WebGL Goals & Achievements screen with the prestige (New Game+) flow.
export default function GoalsScreen() {
  const { game } = useWebgl();
  const player = game.player;
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!player) return null;
  const goals = player.goals ?? { completed: 0, total: 0, catalog: [] };
  const prestigeState = player.prestige ?? {
    level: 0,
    multiplier: 1,
    won: false,
    can_prestige: false,
  };

  const doPrestige = async () => {
    setBusy(true);
    setError(null);
    try {
      await prestige();
      await game.refresh();
      setConfirm(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenScaffold title="Goals & Achievements">
      {prestigeState.won && (
        <Card padding={12} backgroundColor="#e7f5e9">
          <Text fontSize={13} color="#2e7d32">
            You&apos;ve built a legendary park and won! Prestige to start New Game+ with a permanent
            income bonus.
          </Text>
        </Card>
      )}

      <Card flexDirection="row" justifyContent="space-between" alignItems="center" padding={16}>
        <Container flexDirection="column" gap={2}>
          <Text fontSize={16} fontWeight="bold">
            Prestige level {prestigeState.level}
          </Text>
          <Text fontSize={12} color={BRAND_COLORS.mediumGray}>
            Income x{prestigeState.multiplier.toFixed(2)} · {goals.completed}/{goals.total}{' '}
            achievements
          </Text>
        </Container>
        <Button
          variant="default"
          size="sm"
          disabled={!prestigeState.can_prestige}
          onClick={() => setConfirm(true)}
        >
          <Text>{prestigeState.can_prestige ? 'Prestige (New Game+)' : 'Win to Prestige'}</Text>
        </Button>
      </Card>
      {error != null && (
        <Text fontSize={13} color="#d32f2f">
          {error}
        </Text>
      )}

      <Container flexDirection="row" gap={12} flexWrap="wrap">
        {goals.catalog.map((goal) => (
          <GoalCard key={goal.key} goal={goal} />
        ))}
      </Container>

      {confirm && (
        <Modal onClose={() => setConfirm(false)}>
          <Text fontSize={18} fontWeight="bold">
            Start New Game+?
          </Text>
          <Text fontSize={13} color={BRAND_COLORS.mediumGray}>
            Prestiging resets your park - every dinosaur, habitat, structure, and research is wiped
            and a fresh starter park is seeded. You keep a permanent income bonus (prestige level{' '}
            {prestigeState.level + 1}). This cannot be undone.
          </Text>
          <Container flexDirection="row" gap={6} justifyContent="flex-end">
            <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
              <Text>Cancel</Text>
            </Button>
            <Button variant="default" size="sm" disabled={busy} onClick={doPrestige}>
              <Text>Prestige</Text>
            </Button>
          </Container>
        </Modal>
      )}
    </ScreenScaffold>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const pct = Math.max(0, Math.min(100, (goal.current / goal.threshold) * 100));
  const isBoolean = goal.threshold === 1;
  return (
    <Card flexDirection="column" gap={5} padding={14} width={240}>
      <Container flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text fontSize={15} fontWeight="bold">
          {goal.name}
        </Text>
        {goal.completed ? (
          <Text fontSize={11} color="#2e7d32">
            Done
          </Text>
        ) : (
          goal.win && (
            <Text fontSize={11} color={BRAND_COLORS.secondary}>
              Win
            </Text>
          )
        )}
      </Container>
      <Text fontSize={11} color={BRAND_COLORS.mediumGray}>
        {goal.description}
      </Text>
      <Progress value={pct} width="100%" />
      <Container flexDirection="row" justifyContent="space-between">
        <Text fontSize={11} color={BRAND_COLORS.mediumGray}>
          {isBoolean
            ? goal.completed
              ? 'Complete'
              : 'In progress'
            : `${goal.current}/${goal.threshold}`}
        </Text>
        <Text fontSize={11} color={BRAND_COLORS.mediumGray}>
          Reward {goal.reward.toLocaleString()}
        </Text>
      </Container>
    </Card>
  );
}
