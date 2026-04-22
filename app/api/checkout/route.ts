import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/stripe'
import { getAnalysis } from '@/lib/kv'

export async function POST(req: NextRequest) {
  try {
    const { analysisId } = await req.json() as { analysisId: string }

    if (!analysisId) {
      return NextResponse.json({ error: 'analysisId requis' }, { status: 400 })
    }

    const analysis = await getAnalysis(analysisId)
    if (!analysis) {
      return NextResponse.json(
        { error: 'Analyse introuvable ou expirée (2h max)' },
        { status: 404 }
      )
    }

    const checkoutUrl = await createCheckoutSession(analysisId)
    return NextResponse.json({ url: checkoutUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
