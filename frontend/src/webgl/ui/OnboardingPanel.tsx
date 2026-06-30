import { useState } from 'react';
import { Text } from '@react-three/uikit';
import { Button, Card, Input } from '@react-three/uikit-default';
import { useWebgl } from '../WebglState';
import { BRAND_COLORS } from '../../theme/theme';

// First-run "name your park" screen, rendered entirely in WebGL.
export default function OnboardingPanel() {
  const { game } = useWebgl();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await game.createNamedPark(name);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Card flexDirection="column" gap={14} padding={28} width={380}>
      <Text fontSize={22} fontWeight="bold">
        Welcome to Dino Park Manager
      </Text>
      <Text fontSize={14} color={BRAND_COLORS.mediumGray}>
        What should we call you? Your park will be named after you.
      </Text>
      <Input value={name} onValueChange={setName} placeholder="Your name" />
      {error != null && (
        <Text fontSize={13} color="#d32f2f">
          {error}
        </Text>
      )}
      <Button variant="default" disabled={busy || name.trim().length === 0} onClick={create}>
        <Text>{busy ? 'Creating...' : 'Create my park'}</Text>
      </Button>
    </Card>
  );
}
