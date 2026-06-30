import { useEffect, useState } from 'react';
import { Snackbar } from '@mui/material';
import { useGame } from '../context/PlayerContext';

// Kinds worth interrupting the player for (births, deaths, world events, goals).
const NOTABLE = new Set(['birth', 'death', 'event', 'goal']);

// Pops a snackbar when notable park events appear since the player last looked.
// The first render per park primes the watermark silently (no backlog spam).
export default function EventNotifier() {
  const { player } = useGame();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const playerId = player?.id;
    const events = player?.events ?? [];
    if (!playerId || events.length === 0) return;

    const key = `last_seen_event_${playerId}`;
    const maxId = Math.max(...events.map((e) => e.id));
    const stored = localStorage.getItem(key);
    localStorage.setItem(key, String(maxId));
    if (stored === null) return; // first visit: prime silently

    const lastSeen = Number(stored);
    const fresh = events.filter((e) => e.id > lastSeen && NOTABLE.has(e.kind));
    if (fresh.length === 0) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessage(
      fresh.length === 1 ? fresh[0].message : `${fresh.length} new updates — ${fresh[0].message}`,
    );
  }, [player]);

  return (
    <Snackbar
      open={message !== null}
      autoHideDuration={5000}
      onClose={() => setMessage(null)}
      message={message ?? ''}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    />
  );
}
