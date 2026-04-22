import type { Difficulty } from '@/types';

type DifficultyOption = {
  value: Exclude<Difficulty, 'medium'>;
  label: string;
};

export const TRAIL_DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { value: 'novice', label: 'Novice' },
  { value: 'easy', label: 'Easy' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'hard', label: 'Hard' },
  { value: 'expert', label: 'Expert' },
];

export function normalizeDifficulty(value: Difficulty | string | null | undefined): Difficulty | '' {
  if (!value) return '';
  return value === 'medium' ? 'moderate' : (value as Difficulty);
}

export function getDifficultyLabel(value: Difficulty | string | null | undefined): string {
  const normalized = normalizeDifficulty(value);
  if (!normalized) return 'Unknown';
  const match = TRAIL_DIFFICULTY_OPTIONS.find((option) => option.value === normalized);
  return match?.label || String(value);
}

