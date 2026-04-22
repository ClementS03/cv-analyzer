import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getAnalysis, markAnalysisPaid } from '@/lib/kv'
import { sendReportEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const analysisId = session.metadata?.analysisId
    const email = session.customer_details?.email

    if (!analysisId || !email) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const stored = await getAnalysis(analysisId)
    if (!stored) {
      return NextResponse.json({ received: true })
    }

    await Promise.all([
      markAnalysisPaid(analysisId),
      sendReportEmail(email, stored.result),
    ])
  }

  return NextResponse.json({ received: true })
}
