import { kv } from '@vercel/kv'
import type { StoredAnalysis } from '@/types/analysis'

const TTL_SECONDS = 60 * 60 * 2

export async function storeAnalysis(id: string, analysis: StoredAnalysis): Promise<void> {
  await kv.set(`analysis:${id}`, analysis, { ex: TTL_SECONDS })
}

export async function getAnalysis(id: string): Promise<StoredAnalysis | null> {
  return kv.get<StoredAnalysis>(`analysis:${id}`)
}

export async function markAnalysisPaid(id: string): Promise<void> {
  const analysis = await getAnalysis(id)
  if (!analysis) throw new Error('Analyse introuvable ou expirée')
  await storeAnalysis(id, { ...analysis, paidAt: Date.now() })
}
