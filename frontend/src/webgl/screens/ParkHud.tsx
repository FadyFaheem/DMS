import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Container, Text } from '@react-three/uikit';
import { Button, Card, Input, Progress } from '@react-three/uikit-default';
import type { Dinosaur, Habitat } from '../../api/players';
import { feedDino, moveDino, quarantineDino, treatDino } from '../../api/dinosaurs';
import { buyFood } from '../../api/food';
import { stockHabitat } from '../../api/habitats';
import { claimBreeding, listBreedings, startBreeding, type Breeding } from '../../api/breeding';
import { useWebgl } from '../WebglState';
import { BRAND_COLORS } from '../../theme/theme';

const DIETS = ['plants', 'meat', 'fish', 'insects'];
const FOOD_TYPES = ['plants', 'meat', 'fish'];

interface Props {
  selectedDino: Dinosaur | null;
  selectedHabitat: Habitat | null;
  clearSelection: () => void;
}

// The park's WebGL HUD: resource/health summary, the selected dino/habitat
// action panel, a recent-activity feed, and Buy Food / Breeding modals. The
// wrapper passes pointer events through to the 3D world except over panels.
export default function ParkHud({ selectedDino, selectedHabitat, clearSelection }: Props) {
  const { game } = useWebgl();
  const player = game.player;
  const [modal, setModal] = useState<'food' | 'breed' | null>(null);
  if (!player) return null;
  const summary = player.summary;
  const vetLab = player.structures?.built?.some((s) => s.kind === 'vet_lab') ?? false;

  return (
    <Container flexGrow={1} positionType="relative" pointerEvents="none">
      {/* Resource + health summary (top-left) */}
      <Container
        positionType="absolute"
        positionTop={12}
        positionLeft={12}
        flexDirection="column"
        gap={6}
        width={230}
        padding={14}
        borderRadius={10}
        backgroundColor={BRAND_COLORS.white}
        pointerEvents="auto"
      >
        <Text fontSize={16} fontWeight="bold">
          {player.display_name}&apos;s Park
        </Text>
        <StatLine label="Population" value={String(summary.population)} />
        <Container flexDirection="column" gap={2}>
          <Container flexDirection="row" justifyContent="space-between">
            <Text fontSize={12} color={BRAND_COLORS.mediumGray}>
              Avg Health
            </Text>
            <Text fontSize={12}>{Math.round(summary.avg_health)}</Text>
          </Container>
          <Progress value={Math.max(0, Math.min(100, summary.avg_health))} width="100%" />
        </Container>
        <StatLine label="Critical" value={String(summary.critical)} />
        <StatLine label="Sick" value={String(summary.sick ?? 0)} />
        <StatLine
          label="Food P/M/F"
          value={`${player.food.plants}/${player.food.meat}/${player.food.fish}`}
        />
        <Container flexDirection="row" gap={6} marginTop={4} flexWrap="wrap">
          <Button variant="outline" size="sm" onClick={() => setModal('food')}>
            <Text>Buy Food</Text>
          </Button>
          <Button variant="default" size="sm" onClick={() => setModal('breed')}>
            <Text>Breed</Text>
          </Button>
        </Container>
      </Container>

      {/* Recent activity (top-right) */}
      <EventsPanel />

      {/* Selection action panel (bottom-center) */}
      {selectedDino && (
        <DinoPanel
          dino={selectedDino}
          habitats={player.habitats}
          vetLab={vetLab}
          onChanged={game.refresh}
          onClose={clearSelection}
        />
      )}
      {!selectedDino && selectedHabitat && (
        <HabitatPanel
          habitat={selectedHabitat}
          residents={player.dinosaurs.filter((d) => d.habitat_id === selectedHabitat.id && d.alive)}
          onChanged={game.refresh}
          onClose={clearSelection}
        />
      )}

      {modal === 'food' && <BuyFoodModal onChanged={game.refresh} onClose={() => setModal(null)} />}
      {modal === 'breed' && (
        <BreedModal
          dinos={player.dinosaurs.filter((d) => d.alive)}
          onChanged={game.refresh}
          onClose={() => setModal(null)}
        />
      )}
    </Container>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <Container flexDirection="row" justifyContent="space-between">
      <Text fontSize={12} color={BRAND_COLORS.mediumGray}>
        {label}
      </Text>
      <Text fontSize={12}>{value}</Text>
    </Container>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <Container flexDirection="column" gap={2} width="100%">
      <Container flexDirection="row" justifyContent="space-between">
        <Text fontSize={12} color={BRAND_COLORS.mediumGray}>
          {label}
        </Text>
        <Text fontSize={12}>{Math.round(value)}</Text>
      </Container>
      <Progress value={Math.max(0, Math.min(100, value))} width="100%" />
    </Container>
  );
}

function DinoPanel({
  dino,
  habitats,
  vetLab,
  onChanged,
  onClose,
}: {
  dino: Dinosaur;
  habitats: Habitat[];
  vetLab: boolean;
  onChanged: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container
      positionType="absolute"
      positionBottom={12}
      positionLeft={12}
      positionRight={12}
      flexDirection="column"
      gap={8}
      padding={14}
      borderRadius={10}
      backgroundColor={BRAND_COLORS.white}
      pointerEvents="auto"
    >
      <Container flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text fontSize={16} fontWeight="bold">
          {dino.name} | {dino.species}
        </Text>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <Text>Close</Text>
        </Button>
      </Container>
      <Container flexDirection="row" gap={12} flexWrap="wrap">
        <Container width={180}>
          <StatBar label="Health" value={dino.health} />
        </Container>
        <Container width={180}>
          <StatBar label="Hunger" value={dino.hunger} />
        </Container>
        <Container width={180}>
          <StatBar label="Happiness" value={dino.happiness} />
        </Container>
      </Container>
      <Container flexDirection="row" gap={6} alignItems="center" flexWrap="wrap">
        <Text fontSize={12} color={BRAND_COLORS.mediumGray}>
          Feed:
        </Text>
        {DIETS.map((d) => (
          <Button
            key={d}
            size="sm"
            variant={d === dino.diet_primary ? 'default' : 'outline'}
            disabled={busy}
            onClick={() => act(() => feedDino(dino.id, d))}
          >
            <Text>{d}</Text>
          </Button>
        ))}
        <Button
          size="sm"
          variant="destructive"
          disabled={busy || !vetLab || (dino.diseases ?? []).length === 0}
          onClick={() => act(() => treatDino(dino.id))}
        >
          <Text>{vetLab ? 'Treat' : 'Needs Vet Lab'}</Text>
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => quarantineDino(dino.id))}>
          <Text>{dino.quarantined ? 'Release' : 'Quarantine'}</Text>
        </Button>
      </Container>
      <Container flexDirection="row" gap={6} alignItems="center" flexWrap="wrap">
        <Text fontSize={12} color={BRAND_COLORS.mediumGray}>
          Move to:
        </Text>
        {habitats
          .filter((h) => h.id !== dino.habitat_id)
          .map((h) => (
            <Button
              key={h.id}
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => act(() => moveDino(dino.id, h.id))}
            >
              <Text>{h.name}</Text>
            </Button>
          ))}
      </Container>
    </Container>
  );
}

function HabitatPanel({
  habitat,
  residents,
  onChanged,
  onClose,
}: {
  habitat: Habitat;
  residents: Dinosaur[];
  onChanged: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const stock = async () => {
    setBusy(true);
    try {
      await stockHabitat(habitat.id, 20);
      await onChanged();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Container
      positionType="absolute"
      positionBottom={12}
      positionLeft={12}
      flexDirection="column"
      gap={8}
      width={280}
      padding={14}
      borderRadius={10}
      backgroundColor={BRAND_COLORS.white}
      pointerEvents="auto"
    >
      <Container flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text fontSize={16} fontWeight="bold">
          {habitat.name}
        </Text>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <Text>Close</Text>
        </Button>
      </Container>
      <Text fontSize={12} color={BRAND_COLORS.mediumGray}>
        {habitat.terrain} | {residents.length}/{habitat.capacity} dinos | forage{' '}
        {habitat.food_stockpile ?? 0}
      </Text>
      <Button variant="default" size="sm" disabled={busy} onClick={stock}>
        <Text>Stock 20 plants</Text>
      </Button>
    </Container>
  );
}

function BuyFoodModal({
  onChanged,
  onClose,
}: {
  onChanged: () => Promise<void>;
  onClose: () => void;
}) {
  const [type, setType] = useState('plants');
  const [qty, setQty] = useState('20');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buy = async () => {
    setBusy(true);
    setError(null);
    try {
      await buyFood(type, Math.max(1, Number(qty) || 0));
      await onChanged();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <Text fontSize={18} fontWeight="bold">
        Buy Food
      </Text>
      <Container flexDirection="row" gap={6}>
        {FOOD_TYPES.map((t) => (
          <Button
            key={t}
            size="sm"
            variant={t === type ? 'default' : 'outline'}
            onClick={() => setType(t)}
          >
            <Text>{t}</Text>
          </Button>
        ))}
      </Container>
      <Input value={qty} onValueChange={setQty} placeholder="Quantity" />
      {error != null && (
        <Text fontSize={13} color="#d32f2f">
          {error}
        </Text>
      )}
      <Container flexDirection="row" gap={6} justifyContent="flex-end">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <Text>Cancel</Text>
        </Button>
        <Button variant="default" size="sm" disabled={busy} onClick={buy}>
          <Text>Buy</Text>
        </Button>
      </Container>
    </ModalShell>
  );
}

function BreedModal({
  dinos,
  onChanged,
  onClose,
}: {
  dinos: Dinosaur[];
  onChanged: () => Promise<void>;
  onClose: () => void;
}) {
  const [a, setA] = useState<number | null>(null);
  const [b, setB] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState<Breeding[]>([]);

  useEffect(() => {
    listBreedings()
      .then((list) => setReady(list.filter((x) => x.ready)))
      .catch(() => setReady([]));
  }, []);

  const pick = (id: number) => {
    if (a === id) setA(null);
    else if (b === id) setB(null);
    else if (a == null) setA(id);
    else if (b == null) setB(id);
  };

  const start = async () => {
    if (a == null || b == null) return;
    setBusy(true);
    setError(null);
    try {
      await startBreeding(a, b);
      await onChanged();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const claim = async (id: number) => {
    setBusy(true);
    try {
      await claimBreeding(id);
      await onChanged();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <Text fontSize={18} fontWeight="bold">
        Breeding
      </Text>
      {ready.length > 0 && (
        <Container flexDirection="column" gap={4}>
          <Text fontSize={13} color={BRAND_COLORS.mediumGray}>
            Ready to hatch
          </Text>
          {ready.map((bd) => (
            <Button key={bd.id} size="sm" variant="default" disabled={busy} onClick={() => claim(bd.id)}>
              <Text>Claim hatchling #{bd.id}</Text>
            </Button>
          ))}
        </Container>
      )}
      <Text fontSize={13} color={BRAND_COLORS.mediumGray}>
        Pick two parents
      </Text>
      <Container flexDirection="column" gap={4} height={180} overflow="scroll">
        {dinos.map((d) => {
          const sel = d.id === a || d.id === b;
          return (
            <Button
              key={d.id}
              size="sm"
              variant={sel ? 'default' : 'outline'}
              onClick={() => pick(d.id)}
            >
              <Text>
                {d.id === a ? 'A: ' : d.id === b ? 'B: ' : ''}
                {d.name} ({d.species}, {d.gender})
              </Text>
            </Button>
          );
        })}
      </Container>
      {error != null && (
        <Text fontSize={13} color="#d32f2f">
          {error}
        </Text>
      )}
      <Container flexDirection="row" gap={6} justifyContent="flex-end">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <Text>Cancel</Text>
        </Button>
        <Button variant="default" size="sm" disabled={busy || a == null || b == null} onClick={start}>
          <Text>Start breeding</Text>
        </Button>
      </Container>
    </ModalShell>
  );
}

function ModalShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <Container
      positionType="absolute"
      positionTop={0}
      positionLeft={0}
      positionRight={0}
      positionBottom={0}
      alignItems="center"
      justifyContent="center"
      pointerEvents="auto"
      onClick={onClose}
    >
      {/* Dimmed backdrop (separate layer so the card stays fully opaque) */}
      <Container
        positionType="absolute"
        positionTop={0}
        positionLeft={0}
        positionRight={0}
        positionBottom={0}
        backgroundColor="#000000"
        opacity={0.45}
      />
      <Card flexDirection="column" gap={10} padding={20} width={360} onClick={(e) => e.stopPropagation()}>
        {children}
      </Card>
    </Container>
  );
}

function EventsPanel() {
  const { game } = useWebgl();
  const events = game.player?.events ?? [];
  if (events.length === 0) return null;
  return (
    <Container
      positionType="absolute"
      positionTop={12}
      positionRight={12}
      flexDirection="column"
      gap={4}
      width={240}
      height={180}
      padding={12}
      borderRadius={10}
      backgroundColor={BRAND_COLORS.white}
      overflow="scroll"
      pointerEvents="auto"
    >
      <Text fontSize={14} fontWeight="bold">
        Recent Activity
      </Text>
      {events.slice(0, 12).map((ev) => (
        <Text key={ev.id} fontSize={11} color={BRAND_COLORS.darkGray}>
          {ev.message}
        </Text>
      ))}
    </Container>
  );
}
