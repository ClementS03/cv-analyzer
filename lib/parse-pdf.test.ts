// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

// pdf-parse reads a test file at import time when module.parent is falsy;
// mock it to prevent that side-effect in the test environment.
vi.mock('pdf-parse', () => ({ default: vi.fn() }))

import { validatePDFMagicBytes } from './parse-pdf'
import { UserFacingError } from './errors'

describe('validatePDFMagicBytes', () => {
  it('passes for a valid PDF buffer', () => {
    const buf = Buffer.from('%PDF-1.4 fake content')
    expect(() => validatePDFMagicBytes(buf)).not.toThrow()
  })

  it('throws UserFacingError for a non-PDF buffer', () => {
    const buf = Buffer.from('PK\x03\x04fake zip content')
    expect(() => validatePDFMagicBytes(buf)).toThrow(UserFacingError)
  })

  it('throws UserFacingError for an empty buffer', () => {
    const buf = Buffer.alloc(0)
    expect(() => validatePDFMagicBytes(buf)).toThrow(UserFacingError)
  })

  it('throws UserFacingError for a buffer with wrong first bytes', () => {
    const buf = Buffer.from('\x89PNG\r\n\x1a\n')
    expect(() => validatePDFMagicBytes(buf)).toThrow(UserFacingError)
  })
})
