import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FullReport } from './FullReport'
import type { AnalysisResult } from '@/types/analysis'

const frResult: AnalysisResult = {
  language: 'fr',
  score: 67,
  level: 'Bon',
  topIntro: 'Voici trois pistes pour renforcer ton profil :',
  checks: [],
  topActions: ['Action 1', 'Action 2', 'Action 3'],
}

const enResult: AnalysisResult = {
  language: 'en',
  score: 67,
  level: 'Good',
  topIntro: 'Here are three improvements to strengthen your CV:',
  checks: [],
  topActions: ['Action 1', 'Action 2', 'Action 3'],
}

describe('FullReport', () => {
  it('renders the topIntro sentence', () => {
    render(<FullReport result={frResult} />)
    expect(screen.getByText('Voici trois pistes pour renforcer ton profil :')).toBeInTheDocument()
  })

  it('renders French actions section title when language is fr', () => {
    render(<FullReport result={frResult} />)
    expect(screen.getByText('3 actions prioritaires')).toBeInTheDocument()
  })

  it('renders English actions section title when language is en', () => {
    render(<FullReport result={enResult} />)
    expect(screen.getByText('3 priority actions')).toBeInTheDocument()
  })

  it('renders all 3 topActions', () => {
    render(<FullReport result={frResult} />)
    expect(screen.getByText('Action 1')).toBeInTheDocument()
    expect(screen.getByText('Action 2')).toBeInTheDocument()
    expect(screen.getByText('Action 3')).toBeInTheDocument()
  })

  it('renders the score', () => {
    render(<FullReport result={frResult} />)
    expect(screen.getByText('67')).toBeInTheDocument()
  })

  it('renders the level', () => {
    render(<FullReport result={frResult} />)
    expect(screen.getByText('Bon')).toBeInTheDocument()
  })
})
