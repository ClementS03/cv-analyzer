// types/analysis.ts

export type CheckCategory = 'ats' | 'content' | 'style' | 'impact'
export type CheckStatus = 'pass' | 'warning' | 'fail'
export type AnalysisLevel = 'Passable' | 'Bon' | 'Excellent'

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
  score: number // 0-100
  level: AnalysisLevel
  checks: Check[]
  topActions: string[] // 3 actions prioritaires
}

export interface StoredAnalysis {
  result: AnalysisResult
  paidAt?: number // timestamp unix
  createdAt: number
}
