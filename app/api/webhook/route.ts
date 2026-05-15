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

  console.log('Webhook event:', event.type)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const analysisId = session.metadata?.analysisId

    if (!analysisId) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const stored = await getAnalysis(analysisId)
    if (!stored) {
      return NextResponse.json({ received: true })
    }

    const email = stored.userEmail ?? session.customer_details?.email
    if (!email) {
      console.error('No email available for analysis', analysisId)
      await markAnalysisPaid(analysisId, session.id)
      return NextResponse.json({ received: true })
    }

    try {
      await Promise.all([
        markAnalysisPaid(analysisId, session.id),
        sendReportEmail(email, stored.result),
      ])
      console.log('Email sent to', email)
    } catch (err) {
      console.error('Webhook error:', err)
    }
  }

  return NextResponse.json({ received: true })
}
