import type { ActivityKey, ChallengeFormState, CompanyRecord } from './types'

export const PUBLIC_COMPANY_ID = 'public-catalog'

export const activityLabels: Record<ActivityKey, string> = {
  steps: 'Шаги',
  run: 'Бег',
  bike: 'Велосипед',
  swim: 'Плавание',
  moves: 'Мувы',
}

export const activityCatalog: Record<ActivityKey, { activity_type: ChallengeFormState['activity_type']; metric: ChallengeFormState['metric'] }> = {
  steps: { activity_type: 'walking', metric: 'steps' },
  run: { activity_type: 'running', metric: 'distance' },
  bike: { activity_type: 'cycling', metric: 'distance' },
  swim: { activity_type: 'swimming', metric: 'distance' },
  moves: { activity_type: 'moves', metric: 'moves' },
}

export const emptyDraft: ChallengeFormState = {
  title: '',
  description: '',
  start_date: '2026-08-01',
  end_date: '2026-08-21',
  challenge_type: 'goal_based',
  level: 'overall',
  scoring_method: 'sum',
  activity_type: 'walking',
  metric: 'steps',
  target_value: '100000',
  visibility: 'public',
  company_ids: [],
  ui_team_creation_mode: 'random',
}

export const initialCompanies: CompanyRecord[] = [
  {
    _id: PUBLIC_COMPANY_ID,
    name: 'Публичные челленджи',
    members: [],
    challenges: [],
  },
]
