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

import { parseCritiqueResponse, mergeCorrections } from './analyze'
import type { AnalysisResult } from '@/types/analysis'

const baseResult: AnalysisResult = {
  language: 'en',
  score: 67,
  level: 'Good',
  topIntro: 'Original intro',
  topActions: ['Action 1', 'Action 2', 'Action 3'],
  checks: [
    {
      id: 'date-consistency',
      category: 'ats',
      title: 'Date consistency',
      status: 'warning',
      score: 55,
      feedback: 'Original date feedback',
      suggestions: ['Original suggestion'],
    },
    {
      id: 'buzzwords',
      category: 'content',
      title: 'Buzzwords',
      status: 'warning',
      score: 50,
      feedback: 'Buzzword feedback',
      suggestions: [],
    },
  ],
}

describe('parseCritiqueResponse', () => {
  it('returns empty corrections when analysis has no problems', () => {
    const raw = JSON.stringify({ corrections: [] })
    const result = parseCritiqueResponse(raw)
    expect(result.corrections).toHaveLength(0)
    expect(result.topActions).toBeUndefined()
    expect(result.topIntro).toBeUndefined()
  })

  it('parses a feedback-only correction', () => {
    const raw = JSON.stringify({
      corrections: [{ checkId: 'date-consistency', feedback: 'Corrected feedback' }],
    })
    const result = parseCritiqueResponse(raw)
    expect(result.corrections).toHaveLength(1)
    expect(result.corrections[0].checkId).toBe('date-consistency')
    expect(result.corrections[0].feedback).toBe('Corrected feedback')
    expect(result.corrections[0].suggestions).toBeUndefined()
  })

  it('parses a suggestions-only correction', () => {
    const raw = JSON.stringify({
      corrections: [{ checkId: 'buzzwords', suggestions: ['Better suggestion'] }],
    })
    const result = parseCritiqueResponse(raw)
    expect(result.corrections[0].suggestions).toEqual(['Better suggestion'])
    expect(result.corrections[0].feedback).toBeUndefined()
  })

  it('parses topActions when present', () => {
    const raw = JSON.stringify({
      corrections: [],
      topActions: ['New action 1', 'New action 2', 'New action 3'],
    })
    const result = parseCritiqueResponse(raw)
    expect(result.topActions).toEqual(['New action 1', 'New action 2', 'New action 3'])
  })

  it('parses topIntro when present', () => {
    const raw = JSON.stringify({
      corrections: [],
      topIntro: 'Here are some targeted improvements:',
    })
    const result = parseCritiqueResponse(raw)
    expect(result.topIntro).toBe('Here are some targeted improvements:')
  })

  it('strips markdown code fences before parsing', () => {
    const raw = '```json\n' + JSON.stringify({ corrections: [] }) + '\n```'
    const result = parseCritiqueResponse(raw)
    expect(result.corrections).toHaveLength(0)
  })

  it('returns empty corrections if corrections field is missing', () => {
    const raw = JSON.stringify({ topIntro: 'Only intro' })
    const result = parseCritiqueResponse(raw)
    expect(result.corrections).toHaveLength(0)
  })

  it('does not include topActions when array is empty', () => {
    const raw = JSON.stringify({ corrections: [], topActions: [] })
    const result = parseCritiqueResponse(raw)
    expect(result.topActions).toBeUndefined()
  })

  it('does not include topIntro when string is empty', () => {
    const raw = JSON.stringify({ corrections: [], topIntro: '' })
    const result = parseCritiqueResponse(raw)
    expect(result.topIntro).toBeUndefined()
  })

  it('filters out corrections with empty checkId', () => {
    const raw = JSON.stringify({
      corrections: [{ checkId: '', feedback: 'Should be filtered' }],
    })
    const result = parseCritiqueResponse(raw)
    expect(result.corrections).toHaveLength(0)
  })

  it('returns empty corrections on invalid JSON', () => {
    expect(parseCritiqueResponse('not valid json {')).toEqual({ corrections: [] })
  })

  it('filters non-string values out of topActions and ignores result if fewer than 3', () => {
    const raw = JSON.stringify({
      corrections: [],
      topActions: ['valid', 42, null],
    })
    const result = parseCritiqueResponse(raw)
    expect(result.topActions).toBeUndefined()
  })

  it('ignores topActions if fewer than 3 string elements', () => {
    const raw = JSON.stringify({
      corrections: [],
      topActions: ['Only one action'],
    })
    const result = parseCritiqueResponse(raw)
    expect(result.topActions).toBeUndefined()
  })
})

describe('mergeCorrections', () => {
  it('returns result unchanged when corrections is empty', () => {
    const result = mergeCorrections(baseResult, { corrections: [] })
    expect(result.checks[0].feedback).toBe('Original date feedback')
    expect(result.topActions).toEqual(['Action 1', 'Action 2', 'Action 3'])
    expect(result.topIntro).toBe('Original intro')
  })

  it('merges feedback only — leaves suggestions unchanged', () => {
    const result = mergeCorrections(baseResult, {
      corrections: [{ checkId: 'date-consistency', feedback: 'Fixed feedback' }],
    })
    const check = result.checks.find((c) => c.id === 'date-consistency')!
    expect(check.feedback).toBe('Fixed feedback')
    expect(check.suggestions).toEqual(['Original suggestion'])
  })

  it('merges suggestions only — leaves feedback unchanged', () => {
    const result = mergeCorrections(baseResult, {
      corrections: [{ checkId: 'date-consistency', suggestions: ['Fixed suggestion'] }],
    })
    const check = result.checks.find((c) => c.id === 'date-consistency')!
    expect(check.suggestions).toEqual(['Fixed suggestion'])
    expect(check.feedback).toBe('Original date feedback')
  })

  it('merges both feedback and suggestions', () => {
    const result = mergeCorrections(baseResult, {
      corrections: [{ checkId: 'date-consistency', feedback: 'Fixed', suggestions: ['Fixed s'] }],
    })
    const check = result.checks.find((c) => c.id === 'date-consistency')!
    expect(check.feedback).toBe('Fixed')
    expect(check.suggestions).toEqual(['Fixed s'])
  })

  it('leaves uncorrected checks intact', () => {
    const result = mergeCorrections(baseResult, {
      corrections: [{ checkId: 'date-consistency', feedback: 'Fixed' }],
    })
    const buzzwords = result.checks.find((c) => c.id === 'buzzwords')!
    expect(buzzwords.feedback).toBe('Buzzword feedback')
  })

  it('replaces topActions when provided', () => {
    const result = mergeCorrections(baseResult, {
      corrections: [],
      topActions: ['New 1', 'New 2', 'New 3'],
    })
    expect(result.topActions).toEqual(['New 1', 'New 2', 'New 3'])
  })

  it('leaves topActions unchanged when absent from corrections', () => {
    const result = mergeCorrections(baseResult, { corrections: [] })
    expect(result.topActions).toEqual(['Action 1', 'Action 2', 'Action 3'])
  })

  it('replaces topIntro when provided', () => {
    const result = mergeCorrections(baseResult, {
      corrections: [],
      topIntro: 'New intro',
    })
    expect(result.topIntro).toBe('New intro')
  })

  it('leaves topIntro unchanged when absent from corrections', () => {
    const result = mergeCorrections(baseResult, { corrections: [] })
    expect(result.topIntro).toBe('Original intro')
  })

  it('ignores corrections for unknown checkIds', () => {
    const result = mergeCorrections(baseResult, {
      corrections: [{ checkId: 'nonexistent', feedback: 'Should be ignored' }],
    })
    expect(result.checks).toHaveLength(2)
    expect(result.checks[0].feedback).toBe('Original date feedback')
  })
})
