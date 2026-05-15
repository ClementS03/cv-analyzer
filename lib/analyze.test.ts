// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { scoreToLevel } from './analyze'
import { parseAnalysisResponse } from './analyze'
import type { Check } from '@/types/analysis'

const mockCheck: Check = {
  id: 'essential-sections',
  title: 'Essential sections',
  status: 'pass',
  score: 80,
  feedback: 'All key sections are present.',
  suggestions: [],
  category: 'ats',
}

describe('scoreToLevel', () => {
  describe('French labels', () => {
    it('returns Excellent at 75+', () => {
      expect(scoreToLevel(75, 'fr')).toBe('Excellent')
      expect(scoreToLevel(100, 'fr')).toBe('Excellent')
    })

    it('returns Bon at 50–74', () => {
      expect(scoreToLevel(50, 'fr')).toBe('Bon')
      expect(scoreToLevel(74, 'fr')).toBe('Bon')
    })

    it('returns Passable below 50', () => {
      expect(scoreToLevel(0, 'fr')).toBe('Passable')
      expect(scoreToLevel(49, 'fr')).toBe('Passable')
    })
  })

  describe('English labels', () => {
    it('returns Excellent at 75+', () => {
      expect(scoreToLevel(75, 'en')).toBe('Excellent')
      expect(scoreToLevel(100, 'en')).toBe('Excellent')
    })

    it('returns Good at 50–74', () => {
      expect(scoreToLevel(50, 'en')).toBe('Good')
      expect(scoreToLevel(74, 'en')).toBe('Good')
    })

    it('returns Poor below 50', () => {
      expect(scoreToLevel(0, 'en')).toBe('Poor')
      expect(scoreToLevel(49, 'en')).toBe('Poor')
    })
  })
})

describe('parseAnalysisResponse', () => {
  it('extracts language and topIntro from Claude JSON', () => {
    const raw = JSON.stringify({
      language: 'en',
      topIntro: 'Here are three changes to strengthen your CV:',
      checks: [mockCheck],
      topActions: ['Add numbers to your achievements'],
    })
    const result = parseAnalysisResponse(raw)
    expect(result.language).toBe('en')
    expect(result.topIntro).toBe('Here are three changes to strengthen your CV:')
  })

  it('defaults language to fr when missing from JSON', () => {
    const raw = JSON.stringify({
      checks: [mockCheck],
      topActions: ['Ajoute des chiffres'],
    })
    const result = parseAnalysisResponse(raw)
    expect(result.language).toBe('fr')
  })

  it('uses a default topIntro when missing from JSON', () => {
    const raw = JSON.stringify({
      language: 'en',
      checks: [mockCheck],
      topActions: ['Add numbers'],
    })
    const result = parseAnalysisResponse(raw)
    expect(result.topIntro).toBeTruthy()
    expect(result.topIntro.length).toBeGreaterThan(10)
  })

  it('strips markdown code fences before parsing', () => {
    const raw = '```json\n' + JSON.stringify({
      language: 'fr',
      topIntro: 'Voici trois axes :',
      checks: [mockCheck],
      topActions: ['Ajoute des chiffres'],
    }) + '\n```'
    const result = parseAnalysisResponse(raw)
    expect(result.language).toBe('fr')
  })

  it('computes score as average of check scores', () => {
    const checks: Check[] = [
      { ...mockCheck, score: 60 },
      { ...mockCheck, id: 'length', score: 80 },
    ]
    const raw = JSON.stringify({
      language: 'fr',
      topIntro: 'Voici trois axes :',
      checks,
      topActions: ['Action 1'],
    })
    const result = parseAnalysisResponse(raw)
    expect(result.score).toBe(70)
  })

  it('normalises topActions that are objects instead of strings', () => {
    const raw = JSON.stringify({
      language: 'fr',
      topIntro: 'Voici trois axes :',
      checks: [mockCheck],
      topActions: [{ action: 'Ajoute des chiffres', rank: 1 }],
    })
    const result = parseAnalysisResponse(raw)
    expect(result.topActions[0]).toBe('Ajoute des chiffres')
  })
})

describe('parseAnalysisResponse shape validation', () => {
  it('rejects a response with no checks field', () => {
    const raw = JSON.stringify({ language: 'en', topIntro: 'hi', topActions: ['a'] })
    expect(() => parseAnalysisResponse(raw)).toThrow('checks must be a non-empty array')
  })

  it('rejects a response with empty checks array', () => {
    const raw = JSON.stringify({ language: 'en', topIntro: 'hi', checks: [], topActions: ['a'] })
    expect(() => parseAnalysisResponse(raw)).toThrow('checks must be a non-empty array')
  })

  it('rejects a response where topActions is not an array', () => {
    const raw = JSON.stringify({
      language: 'en', topIntro: 'hi',
      checks: [mockCheck],
      topActions: 'not an array',
    })
    expect(() => parseAnalysisResponse(raw)).toThrow('topActions must be an array')
  })

  it('rejects checks containing null elements', () => {
    const raw = JSON.stringify({
      language: 'en', topIntro: 'hi',
      checks: [null],
      topActions: ['a'],
    })
    expect(() => parseAnalysisResponse(raw)).toThrow('each check must be an object')
  })

  it('rejects checks with non-numeric score', () => {
    const raw = JSON.stringify({
      language: 'en', topIntro: 'hi',
      checks: [{ ...mockCheck, score: 'high' }],
      topActions: ['a'],
    })
    expect(() => parseAnalysisResponse(raw)).toThrow('each check must have a numeric score')
  })
})
