export type CVLanguage = 'fr' | 'en'
export type CheckCategory = 'ats' | 'content' | 'style' | 'impact'
export type CheckStatus = 'pass' | 'warning' | 'fail'

export interface Check {
  id: string
  category: CheckCategory
  title: string
  status: CheckStatus
  score: number // 0-100
  feedback: string
  suggestions: string[]
}

export interface AnalysisResult {
  language: CVLanguage
  score: number // 0-100
  level: string // computed by scoreToLevel(score, language)
  topIntro: string
  checks: Check[]
  topActions: string[]
}

export interface StoredAnalysis {
  result: AnalysisResult
  paidAt?: number
  paidSessionId?: string
  userEmail?: string
  createdAt: number
}
