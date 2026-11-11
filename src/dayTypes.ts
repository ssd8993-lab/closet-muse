import type { Formality } from './types'

export interface DayType {
  id: string
  label: string
  /** Formality levels this kind of day can use, most fitting first. */
  formality: Formality[]
}

// The seven kinds of day Sonal dresses for.
export const DAY_TYPES: DayType[] = [
  { id: 'wfh', label: 'Work from home', formality: ['casual', 'smart'] },
  { id: 'office-casual', label: 'Office casual', formality: ['smart', 'casual'] },
  { id: 'client', label: 'Client polished', formality: ['dressy', 'smart'] },
  { id: 'errands', label: 'Errands', formality: ['casual'] },
  { id: 'social', label: 'Social', formality: ['smart', 'dressy', 'casual'] },
  { id: 'travel', label: 'Travel', formality: ['casual', 'smart'] },
  { id: 'lounge', label: 'Lounge or weekend', formality: ['casual'] },
]
