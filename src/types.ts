export type ChallengeStatus = 'active' | 'draft' | 'completed'
export type ActivityKey = 'steps' | 'run' | 'bike' | 'swim' | 'moves'
export type ChallengeTypeApi = 'goal_based' | 'competitive'
export type ChallengeLevelApi = 'overall' | 'team'
export type ScoringMethodApi = 'sum' | 'average'
export type ActivityTypeApi = 'walking' | 'running' | 'cycling' | 'swimming' | 'moves' | 'other'
export type MetricApi = 'steps' | 'distance' | 'time' | 'count' | 'moves'

export type InviteCodeRecord = {
  code: string
  expires_at: string
  created_at: string
}

export type TeamRecord = {
  id: string
  challenge_id: string
  name: string
  members: unknown[]
  invite_codes: InviteCodeRecord[]
}

export type ChallengeRecord = {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string
  challenge_type: ChallengeTypeApi
  level: ChallengeLevelApi
  scoring_method: ScoringMethodApi
  activity_type: ActivityTypeApi
  metric: MetricApi
  target_value: string
  photo_id?: string
  teams: TeamRecord[]
  progress: unknown[]
  created_by?: string
  created_at?: string
  updated_at?: string
  ui_status: ChallengeStatus
  ui_participants: number
  ui_team_creation_mode: 'random' | 'manual'
}

export type CompanyRecord = {
  _id: string
  name: string
  logo_id?: string
  logo_url?: string
  members: unknown[]
  challenges: ChallengeRecord[]
  created_at?: string
}

export type ChallengeListItem = {
  id: string
  company_id?: string
  company_name?: string
  company_logo_url?: string
  title: string
  challenge_type: ChallengeTypeApi
  activity_key: ActivityKey
  participants: number
  period: string
  status: ChallengeStatus
  invite_code?: string
}

export type ChallengeFormState = {
  title: string
  description: string
  start_date: string
  end_date: string
  challenge_type: ChallengeTypeApi
  level: ChallengeLevelApi
  scoring_method: ScoringMethodApi
  activity_type: ActivityTypeApi
  metric: MetricApi
  target_value: string
  visibility: 'public' | 'private'
  company_ids: string[]
  ui_team_creation_mode: 'random' | 'manual'
}

export type Page = 'challenges' | 'create'

export type FileUploadResult = {
  id: string
  url: string
}

export type CreateCompanyResponse = {
  id: string
  name: string
  logo_url?: string
  created_at?: string
}

export type CreateChallengePayload = {
  title: string
  description: string
  start_date: string
  end_date: string
  challenge_type: ChallengeTypeApi
  level: ChallengeLevelApi
  scoring_method: ScoringMethodApi
  activity_type: ActivityTypeApi
  metric: MetricApi
  teams: Array<{ name: string }>
  target_value?: number
  photo_id?: string
}

export type CreateChallengeResponse = {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string
  challenge_type: ChallengeTypeApi
  level: ChallengeLevelApi
  scoring_method: ScoringMethodApi
  activity_type: ActivityTypeApi
  metric: MetricApi
  target_value?: number
  photo_id?: string
  created_by?: string
  created_at?: string
  updated_at?: string
}
