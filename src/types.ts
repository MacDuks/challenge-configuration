export type ChallengeStatus = 'active' | 'draft' | 'completed'
export type ChallengeType = 'target' | 'competitive'
export type Activity = 'steps' | 'run' | 'bike' | 'swim' | 'moves'

export type Challenge = {
  id: number
  title: string
  type: ChallengeType
  activity: Activity
  participants: number
  period: string
  status: ChallengeStatus
}

export type ChallengeDraft = {
  title: string
  description: string
  startDate: string
  endDate: string
  activity: Activity
  type: ChallengeType
  target: string
  teamMode: 'solo' | 'teams'
  teamCreation: 'random' | 'manual'
  visibility: 'public' | 'private'
  companyIds: number[]
}

export type Company = {
  id: number
  name: string
}

export type Page = 'challenges' | 'create'
