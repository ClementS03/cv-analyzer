import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

export async function createCheckoutSession(analysisId: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    billing_address_collection: 'auto',
    customer_creation: 'always',
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Rapport CV complet',
            description: '12 checks détaillés + 3 actions prioritaires',
          },
          unit_amount: 500,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    metadata: { analysisId },
    success_url: `${baseUrl}/result/${analysisId}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/?cancelled=true`,
  })

  return session.url!
}

export async function verifyPayment(sessionId: string, analysisId: string): Promise<boolean> {
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  return (
    session.payment_status === 'paid' &&
    session.metadata?.analysisId === analysisId
  )
}
