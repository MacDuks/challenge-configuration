import type {
  CreateChallengePayload,
  CreateChallengeResponse,
  CreateCompanyResponse,
  FileUploadResult,
} from '../types'

const baseUrl = (import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_EVERYFIT_API_BASE_URL ?? 'https://api.everyfit.app')
).replace(/\/$/, '')
const token = import.meta.env.VITE_EVERYFIT_API_TOKEN?.trim()

export function isEveryApiConfigured() {
  return Boolean(token)
}

async function request<T>(path: string, init: RequestInit = {}) {
  if (!token) {
    throw new Error('Не настроен токен EveryFit API')
  }

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const body = await response.text()
    if (body.includes('token expired')) {
      throw new Error('JWT токен EveryFit истек. Нужен новый токен от backend-разработчика или новый экспорт из Yaak.')
    }
    throw new Error(body || `EveryFit API error: ${response.status}`)
  }

  return response.json() as Promise<T>
}

async function requestText(path: string, init: RequestInit = {}) {
  if (!token) {
    throw new Error('Не настроен токен EveryFit API')
  }

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  })

  const body = await response.text()
  if (!response.ok) {
    if (body.includes('token expired')) {
      throw new Error('JWT токен EveryFit истек. Нужен новый токен EveryFit.')
    }
    throw new Error(body || `EveryFit API error: ${response.status}`)
  }

  return body
}

export async function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  return request<FileUploadResult>('/v1/infra/upload/file', {
    method: 'POST',
    body: formData,
  })
}

export async function createCompany(payload: { name: string; logo_id: string }) {
  return request<CreateCompanyResponse>('/v1/companies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function createChallenge(companyId: string, payload: CreateChallengePayload) {
  return request<CreateChallengeResponse>(`/v1/company/${companyId}/challenge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function exportInviteCodesCsv(companyId: string, challengeId: string) {
  return requestText(`/v1/company/${companyId}/challenge/${challengeId}/invite-codes/export`)
}

export async function exportAnalyticsCsv(companyId: string, challengeId: string) {
  return requestText(`/v1/company/${companyId}/challenge/${challengeId}/analytics/export`)
}
