import { Alert, AlertTitle, Chip, Stack } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { ActiveEffect, FoodBuilding, Habitat } from '../api/players';
import { effectImpactLabel, effectLabel } from '../utils/effects';

interface Props {
  effects: ActiveEffect[];
  habitats: Habitat[];
  farms: FoodBuilding[];
}

// Park-wide banner of the environmental/production events currently in force.
export default function ActiveEventsPanel({ effects, habitats, farms }: Props) {
  if (effects.length === 0) return null;

  const targetName = (effect: ActiveEffect): string => {
    if (effect.habitat_id != null)
      return habitats.find((h) => h.id === effect.habitat_id)?.name ?? 'a habitat';
    if (effect.food_production_id != null)
      return farms.find((f) => f.id === effect.food_production_id)?.name ?? 'a farm';
    return 'the park';
  };

  return (
    <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 3 }}>
      <AlertTitle>Active Events</AlertTitle>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {effects.map((effect) => (
          <Chip
            key={effect.id}
            size="small"
            color="warning"
            label={`${effectLabel(effect)} · ${targetName(effect)} ${effectImpactLabel(effect)}`}
          />
        ))}
      </Stack>
    </Alert>
  );
}
