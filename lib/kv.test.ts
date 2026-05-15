// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@vercel/kv', () => ({
  kv: {
    set: vi.fn(),
    get: vi.fn(),
  },
}))

import { kv } from '@vercel/kv'
import { markAnalysisPaid } from './kv'
import type { StoredAnalysis } from '@/types/analysis'

const mockAnalysis: StoredAnalysis = {
  result: {
    language: 'fr',
    score: 67,
    level: 'Bon',
    topIntro: 'Voici trois pistes :',
    checks: [],
    topActions: [],
  },
  createdAt: Date.now(),
}

describe('markAnalysisPaid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(kv.get).mockResolvedValue(mockAnalysis)
    vi.mocked(kv.set).mockResolvedValue('OK')
  })

  it('stores paidAt and paidSessionId in KV', async () => {
    await markAnalysisPaid('test-id', 'cs_test_abc123')
    expect(kv.set).toHaveBeenCalledWith(
      'analysis:test-id',
      expect.objectContaining({
        paidAt: expect.any(Number),
        paidSessionId: 'cs_test_abc123',
      }),
      expect.any(Object)
    )
  })

  it('throws if analysis not found', async () => {
    vi.mocked(kv.get).mockResolvedValue(null)
    await expect(markAnalysisPaid('missing-id', 'cs_test_abc')).rejects.toThrow()
  })
})
