import { NextRequest, NextResponse } from 'next/server'
import { getAnalysis } from '@/lib/kv'
import { verifyPayment } from '@/lib/stripe'
import { UserFacingError } from '@/lib/errors'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionId = req.nextUrl.searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id requis' }, { status: 400 })
    }

    const analysis = await getAnalysis(id)
    if (!analysis) {
      return NextResponse.json(
        { error: 'Analyse introuvable ou expirée' },
        { status: 404 }
      )
    }

    if (analysis.paidAt) {
      return NextResponse.json(analysis.result)
    }

    const isPaid = await verifyPayment(sessionId, id)
    if (!isPaid) {
      return NextResponse.json({ error: 'Paiement non confirmé' }, { status: 402 })
    }

    return NextResponse.json(analysis.result)
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[report]', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
