import { describe, it, expect } from 'vitest'
import { scoreToLevel } from './analyze'

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
