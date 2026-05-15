import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/stripe'
import { getAnalysis, storeUserEmail } from '@/lib/kv'
import { UserFacingError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const { analysisId, email } = await req.json() as { analysisId: string; email?: string }

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

    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await storeUserEmail(analysisId, email.toLowerCase().trim())
    }

    const checkoutUrl = await createCheckoutSession(analysisId)
    return NextResponse.json({ url: checkoutUrl })
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[checkout]', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
