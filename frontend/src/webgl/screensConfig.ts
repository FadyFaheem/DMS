// Section identifiers and nav labels. Kept separate from ScreenContext so the
// context file only exports its provider/hook (fast-refresh friendly).
export type ScreenId =
  | 'park'
  | 'habitats'
  | 'species'
  | 'research'
  | 'production'
  | 'goals'
  | 'profile';

export const SCREENS: { id: ScreenId; label: string }[] = [
  { id: 'park', label: 'Park' },
  { id: 'habitats', label: 'Habitats' },
  { id: 'species', label: 'Species' },
  { id: 'research', label: 'Research' },
  { id: 'production', label: 'Production' },
  { id: 'goals', label: 'Goals' },
  { id: 'profile', label: 'Profile' },
];
