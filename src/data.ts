import type { Challenge, ChallengeDraft, Company } from './types'

export const initialChallenges: Challenge[] = [
  { id: 1, title: 'Весенний марафон', type: 'competitive', activity: 'run', participants: 128, period: '01.04–30.04', status: 'active' },
  { id: 2, title: '10 000 шагов каждый день', type: 'target', activity: 'steps', participants: 254, period: '15.03–15.04', status: 'active' },
  { id: 3, title: 'Плывём вместе', type: 'target', activity: 'swim', participants: 0, period: '01.05–31.05', status: 'draft' },
  { id: 4, title: 'Зимний велозаезд', type: 'competitive', activity: 'bike', participants: 86, period: '01.02–28.02', status: 'completed' },
  { id: 5, title: 'Больше движения', type: 'target', activity: 'moves', participants: 310, period: '10.01–10.02', status: 'completed' },
  { id: 6, title: 'Командный рывок', type: 'competitive', activity: 'steps', participants: 72, period: '20.04–20.05', status: 'draft' },
]

export const emptyDraft: ChallengeDraft = {
  title: '',
  description: '',
  startDate: '2026-08-01',
  endDate: '2026-08-21',
  activity: 'steps',
  type: 'target',
  target: '100000',
  teamMode: 'solo',
  teamCreation: 'random',
  visibility: 'public',
  companyIds: [],
}

export const initialCompanies: Company[] = [
  { id: 1, name: 'EveryFit' },
  { id: 2, name: 'Альфа Технологии' },
  { id: 3, name: 'Север Групп' },
]

export const activityLabels = {
  steps: 'Шаги',
  run: 'Бег',
  bike: 'Велосипед',
  swim: 'Плавание',
  moves: 'Мувы',
} as const
