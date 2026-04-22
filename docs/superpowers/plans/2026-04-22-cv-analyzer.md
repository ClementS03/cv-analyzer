# CV Analyzer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire un outil d'analyse de CV sans compte, avec aperçu gratuit + rapport complet débloqué après paiement Stripe €5.

**Architecture:** Next.js 15 App Router + Claude Haiku 4.5 pour l'analyse + Vercel KV (Redis) pour stocker les résultats temporairement (TTL 2h) + Stripe Checkout one-time (collecte l'email nativement) + Resend pour envoyer le rapport par email après paiement. Zéro base de données persistante.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, pdf-parse, @anthropic-ai/sdk, Stripe, @vercel/kv, Resend

---

## Task 1 : Scaffolding du projet

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.env.local.example`

- [ ] **Step 1 : Initialiser le projet Next.js**

```bash
cd "C:/Users/cleme/Downloads/Projets web"
npx create-next-app@latest cv-analyzer --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd cv-analyzer
```

- [ ] **Step 2 : Installer les dépendances**

```bash
npm install @anthropic-ai/sdk pdf-parse stripe @vercel/kv @getbrevo/brevo
npm install -D @types/pdf-parse
```

- [ ] **Step 3 : Créer `.env.local` à partir de l'exemple**

Créer `.env.local.example` :
```
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
KV_URL=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
BREVO_API_KEY=xkeysib-...
BREVO_FROM_EMAIL=rapport@votredomaine.com
BREVO_FROM_NAME=CV Analyzer
```

Copier en `.env.local` et remplir les valeurs réelles.

- [ ] **Step 4 : Configurer next.config.ts pour pdf-parse**

Remplacer le contenu de `next.config.ts` :
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
  },
}

export default nextConfig
```

- [ ] **Step 5 : Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js project with dependencies"
```

---

## Task 2 : Types TypeScript

**Files:**
- Create: `types/analysis.ts`

- [ ] **Step 1 : Créer les types**

```typescript
// types/analysis.ts

export type CheckCategory = 'ats' | 'content' | 'style' | 'impact'
export type CheckStatus = 'pass' | 'warning' | 'fail'
export type AnalysisLevel = 'Passable' | 'Bon' | 'Excellent'

export interface Check {
  id: string
  category: CheckCategory
  title: string
  status: CheckStatus
  score: number // 0-100
  feedback: string
  suggestions: string[]
}

export interface AnalysisResult {
  score: number // 0-100
  level: AnalysisLevel
  checks: Check[]
  topActions: string[] // 3 actions prioritaires
}

export interface StoredAnalysis {
  result: AnalysisResult
  paidAt?: number // timestamp unix
  createdAt: number
}
```

- [ ] **Step 2 : Commit**

```bash
git add types/analysis.ts
git commit -m "feat: add TypeScript types for analysis"
```

---

## Task 3 : Parsing PDF

**Files:**
- Create: `lib/parse-pdf.ts`

- [ ] **Step 1 : Créer le module de parsing**

```typescript
// lib/parse-pdf.ts
import pdfParse from 'pdf-parse'

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)
  return data.text.trim()
}

export function validatePDFSize(buffer: Buffer): void {
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (buffer.length > maxSize) {
    throw new Error('Le fichier dépasse 5MB')
  }
}
```

- [ ] **Step 2 : Commit**

```bash
git add lib/parse-pdf.ts
git commit -m "feat: add PDF text extraction"
```

---

## Task 4 : Analyse Claude

**Files:**
- Create: `lib/analyze.ts`

- [ ] **Step 1 : Créer le module d'analyse**

```typescript
// lib/analyze.ts
import Anthropic from '@anthropic-ai/sdk'
import type { AnalysisResult, Check } from '@/types/analysis'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `Tu es un expert en recrutement et optimisation de CV. Tu analyses des CV et fournis un retour structuré en JSON.

Voici les 12 checks que tu dois effectuer :

ATS:
1. essential-sections : Présence de Contact, Expérience, Formation, Compétences
2. no-complex-formatting : Absence de tableaux, colonnes multiples, images textuelles
3. date-consistency : Cohérence du format des dates (MM/YYYY, YYYY, etc.)

Contenu:
4. quantification : Pourcentage d'achievements avec des chiffres concrets
5. action-verbs : Pourcentage de bullets démarrant par un verbe d'action fort
6. buzzwords : Présence de clichés ("passionné", "team player", "dynamique", "motivé", "rigoureux", "polyvalent")
7. repetition : Mots répétés excessivement (3+ fois sans raison)

Style:
8. length : Longueur adaptée (1 page junior <3 ans, 2 pages senior, 3+ pages = trop long)
9. contact-info : Email professionnel, présence de LinkedIn ou GitHub
10. tense-consistency : Cohérence des temps verbaux dans les expériences

Impact:
11. weakest-sections : Identification des 3 sections les plus faibles
12. overall-impact : Évaluation globale

Pour chaque check, attribue :
- status: "pass" (>= 70), "warning" (40-69), "fail" (< 40)
- score: 0-100
- feedback: 1 phrase concrète sur ce que tu observes
- suggestions: 1-3 suggestions actionnables et spécifiques

Le score global est la moyenne pondérée des 12 checks.
Le niveau est : "Passable" (0-49), "Bon" (50-74), "Excellent" (75-100).
topActions : les 3 actions les plus impactantes à faire en priorité.

Réponds UNIQUEMENT avec du JSON valide, sans markdown.`

function buildUserPrompt(cvText: string): string {
  return `Voici le CV à analyser :\n\n${cvText.slice(0, 8000)}`
}

function scoreToLevel(score: number): AnalysisResult['level'] {
  if (score >= 75) return 'Excellent'
  if (score >= 50) return 'Bon'
  return 'Passable'
}

export async function analyzeCV(cvText: string): Promise<AnalysisResult> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(cvText) }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Réponse inattendue de Claude')
  }

  const parsed = JSON.parse(content.text) as {
    checks: Check[]
    topActions: string[]
  }

  const score = Math.round(
    parsed.checks.reduce((sum, c) => sum + c.score, 0) / parsed.checks.length
  )

  return {
    score,
    level: scoreToLevel(score),
    checks: parsed.checks,
    topActions: parsed.topActions,
  }
}
```

- [ ] **Step 2 : Commit**

```bash
git add lib/analyze.ts
git commit -m "feat: add Claude Haiku CV analysis"
```

---

## Task 5 : Vercel KV (stockage temporaire)

**Files:**
- Create: `lib/kv.ts`

- [ ] **Step 1 : Créer les helpers KV**

```typescript
// lib/kv.ts
import { kv } from '@vercel/kv'
import type { StoredAnalysis } from '@/types/analysis'

const TTL_SECONDS = 60 * 60 * 2 // 2 heures

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
```

- [ ] **Step 2 : Commit**

```bash
git add lib/kv.ts
git commit -m "feat: add Vercel KV helpers"
```

---

## Task 6 : Stripe client

**Files:**
- Create: `lib/stripe.ts`

- [ ] **Step 1 : Créer le client Stripe**

```typescript
// lib/stripe.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
})

export async function createCheckoutSession(analysisId: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    billing_address_collection: 'auto',
    customer_creation: 'always', // force la collecte de l'email
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Rapport CV complet',
            description: '12 checks détaillés + 3 actions prioritaires',
          },
          unit_amount: 500, // €5.00
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
```

- [ ] **Step 2 : Commit**

```bash
git add lib/stripe.ts
git commit -m "feat: add Stripe checkout and payment verification"
```

---

## Task 6b : Envoi email — Brevo

**Files:**
- Create: `lib/email.ts`

- [ ] **Step 1 : Créer le helper d'envoi email**

```typescript
// lib/email.ts
import * as SibApiV3Sdk from '@getbrevo/brevo'
import type { AnalysisResult } from '@/types/analysis'

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
apiInstance.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY!
)

const STATUS_EMOJI = { pass: '✅', warning: '⚠️', fail: '❌' }

function buildReportHtml(result: AnalysisResult): string {
  const checksHtml = result.checks
    .map(
      (c) => `
        <div style="margin-bottom:12px;padding:12px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <strong>${STATUS_EMOJI[c.status]} ${c.title}</strong>
            <span style="color:#6b7280">${c.score}/100</span>
          </div>
          <p style="margin:0 0 6px;color:#374151;font-size:14px">${c.feedback}</p>
          ${c.suggestions.map((s) => `<p style="margin:2px 0;color:#6b7280;font-size:13px">→ ${s}</p>`).join('')}
        </div>`
    )
    .join('')

  const actionsHtml = result.topActions
    .map((a, i) => `<li style="margin-bottom:6px;color:#1d4ed8">${i + 1}. ${a}</li>`)
    .join('')

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h1 style="text-align:center;font-size:28px;color:#111827">Ton rapport CV</h1>
      <div style="text-align:center;margin:16px 0">
        <span style="font-size:64px;font-weight:700;color:#111827">${result.score}</span>
        <span style="color:#9ca3af">/100</span>
        <p style="font-size:18px;font-weight:600;margin:4px 0;color:${result.level === 'Excellent' ? '#16a34a' : result.level === 'Bon' ? '#ca8a04' : '#dc2626'}">${result.level}</p>
      </div>
      <div style="background:#eff6ff;border-radius:8px;padding:16px;margin:20px 0">
        <h2 style="color:#1e40af;margin:0 0 10px">🎯 3 actions prioritaires</h2>
        <ol style="margin:0;padding-left:20px">${actionsHtml}</ol>
      </div>
      <h2 style="color:#374151;font-size:14px;text-transform:uppercase;letter-spacing:0.05em">Analyse détaillée</h2>
      ${checksHtml}
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:32px">
        CV Analyzer · Rapport généré par IA
      </p>
    </div>
  `
}

export async function sendReportEmail(
  toEmail: string,
  result: AnalysisResult
): Promise<void> {
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()
  sendSmtpEmail.sender = {
    email: process.env.BREVO_FROM_EMAIL!,
    name: process.env.BREVO_FROM_NAME ?? 'CV Analyzer',
  }
  sendSmtpEmail.to = [{ email: toEmail }]
  sendSmtpEmail.subject = `Ton rapport CV — Score ${result.score}/100 (${result.level})`
  sendSmtpEmail.htmlContent = buildReportHtml(result)

  await apiInstance.sendTransacEmail(sendSmtpEmail)
}
```

- [ ] **Step 2 : Commit**

```bash
git add lib/email.ts
git commit -m "feat: add Brevo email report sender"
```

---

## Task 6c : Stripe Webhook — envoi email post-paiement

**Files:**
- Create: `app/api/webhook/route.ts`

- [ ] **Step 1 : Créer la route webhook**

```typescript
// app/api/webhook/route.ts
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
      // Analyse expirée — on ne peut pas envoyer le rapport, ce n'est pas bloquant
      return NextResponse.json({ received: true })
    }

    await Promise.all([
      markAnalysisPaid(analysisId),
      sendReportEmail(email, stored.result),
    ])
  }

  return NextResponse.json({ received: true })
}

// Stripe envoie du raw body — désactiver le bodyParser de Next.js
export const config = {
  api: { bodyParser: false },
}
```

- [ ] **Step 2 : Commit**

```bash
git add app/api/webhook/route.ts
git commit -m "feat: add Stripe webhook with email report delivery"
```

---

## Task 7 : API Route — Analyse

**Files:**
- Create: `app/api/analyze/route.ts`

- [ ] **Step 1 : Créer la route POST /api/analyze**

```typescript
// app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { extractTextFromPDF, validatePDFSize } from '@/lib/parse-pdf'
import { analyzeCV } from '@/lib/analyze'
import { storeAnalysis } from '@/lib/kv'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Fichier PDF requis' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    validatePDFSize(buffer)

    const cvText = await extractTextFromPDF(buffer)

    if (cvText.length < 100) {
      return NextResponse.json(
        { error: 'Le PDF semble vide ou non lisible' },
        { status: 400 }
      )
    }

    const result = await analyzeCV(cvText)
    const id = randomUUID()

    await storeAnalysis(id, {
      result,
      createdAt: Date.now(),
    })

    // Retourne seulement l'aperçu gratuit (score + 2 premiers checks)
    return NextResponse.json({
      id,
      score: result.score,
      level: result.level,
      previewChecks: result.checks.slice(0, 2),
      totalChecks: result.checks.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2 : Commit**

```bash
git add app/api/analyze/route.ts
git commit -m "feat: add /api/analyze route"
```

---

## Task 8 : API Route — Checkout

**Files:**
- Create: `app/api/checkout/route.ts`

- [ ] **Step 1 : Créer la route POST /api/checkout**

```typescript
// app/api/checkout/route.ts
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
```

- [ ] **Step 2 : Commit**

```bash
git add app/api/checkout/route.ts
git commit -m "feat: add /api/checkout route"
```

---

## Task 9 : API Route — Rapport complet

**Files:**
- Create: `app/api/report/[id]/route.ts`

- [ ] **Step 1 : Créer la route GET /api/report/[id]**

```typescript
// app/api/report/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAnalysis } from '@/lib/kv'
import { verifyPayment } from '@/lib/stripe'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = req.nextUrl.searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id requis' }, { status: 400 })
    }

    const analysis = await getAnalysis(params.id)
    if (!analysis) {
      return NextResponse.json(
        { error: 'Analyse introuvable ou expirée' },
        { status: 404 }
      )
    }

    // Si déjà payé, retourner directement sans re-vérifier Stripe
    if (analysis.paidAt) {
      return NextResponse.json(analysis.result)
    }

    const isPaid = await verifyPayment(sessionId, params.id)
    if (!isPaid) {
      return NextResponse.json({ error: 'Paiement non confirmé' }, { status: 402 })
    }

    return NextResponse.json(analysis.result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2 : Commit**

```bash
git add "app/api/report/[id]/route.ts"
git commit -m "feat: add /api/report/[id] route with payment verification"
```

---

## Task 10 : Composant UploadZone

**Files:**
- Create: `components/UploadZone.tsx`

- [ ] **Step 1 : Créer le composant upload**

```typescript
// components/UploadZone.tsx
'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

interface UploadZoneProps {
  onPreview: (data: {
    id: string
    score: number
    level: string
    previewChecks: unknown[]
    totalChecks: number
  }) => void
}

export function UploadZone({ onPreview }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Fichier PDF uniquement')
      return
    }

    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/analyze', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)
      onPreview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setIsLoading(false)
    }
  }, [onPreview])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
      `}
    >
      <input
        type="file"
        accept=".pdf"
        onChange={onInputChange}
        className="hidden"
        id="cv-upload"
        disabled={isLoading}
      />
      <label htmlFor="cv-upload" className="cursor-pointer">
        {isLoading ? (
          <div className="space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-600">Analyse en cours…</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-4xl">📄</div>
            <p className="text-lg font-medium text-gray-700">
              Glisse ton CV ici ou clique pour uploader
            </p>
            <p className="text-sm text-gray-400">PDF uniquement · max 5MB</p>
          </div>
        )}
      </label>
      {error && (
        <p className="mt-3 text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Commit**

```bash
git add components/UploadZone.tsx
git commit -m "feat: add UploadZone component"
```

---

## Task 11 : Composant CheckItem

**Files:**
- Create: `components/CheckItem.tsx`

- [ ] **Step 1 : Créer le composant**

```typescript
// components/CheckItem.tsx
import type { Check } from '@/types/analysis'

const STATUS_CONFIG = {
  pass: { icon: '✅', color: 'text-green-600', bg: 'bg-green-50' },
  warning: { icon: '⚠️', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  fail: { icon: '❌', color: 'text-red-600', bg: 'bg-red-50' },
}

interface CheckItemProps {
  check: Check
  blurred?: boolean
}

export function CheckItem({ check, blurred = false }: CheckItemProps) {
  const config = STATUS_CONFIG[check.status]

  return (
    <div className={`rounded-lg p-4 ${config.bg} ${blurred ? 'select-none' : ''}`}>
      <div className={`${blurred ? 'blur-sm' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span>{config.icon}</span>
            <span className="font-medium text-gray-800">{check.title}</span>
          </div>
          <span className={`text-sm font-bold ${config.color}`}>
            {check.score}/100
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-2">{check.feedback}</p>
        {check.suggestions.length > 0 && (
          <ul className="space-y-1">
            {check.suggestions.map((s, i) => (
              <li key={i} className="text-xs text-gray-500 flex gap-1">
                <span>→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Commit**

```bash
git add components/CheckItem.tsx
git commit -m "feat: add CheckItem component"
```

---

## Task 12 : Composant FreePreview

**Files:**
- Create: `components/FreePreview.tsx`

- [ ] **Step 1 : Créer le composant aperçu gratuit**

```typescript
// components/FreePreview.tsx
'use client'

import { useState } from 'react'
import { CheckItem } from './CheckItem'
import type { Check } from '@/types/analysis'

interface FreePreviewProps {
  id: string
  score: number
  level: string
  previewChecks: Check[]
  totalChecks: number
}

const LEVEL_COLOR = {
  'Passable': 'text-red-500',
  'Bon': 'text-yellow-500',
  'Excellent': 'text-green-500',
}

export function FreePreview({ id, score, level, previewChecks, totalChecks }: FreePreviewProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePay = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
      setIsLoading(false)
    }
  }

  const lockedCount = totalChecks - previewChecks.length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Score */}
      <div className="text-center space-y-2">
        <div className="text-7xl font-bold text-gray-800">{score}</div>
        <div className="text-gray-400 text-sm">/ 100</div>
        <div className={`text-xl font-semibold ${LEVEL_COLOR[level as keyof typeof LEVEL_COLOR] ?? 'text-gray-600'}`}>
          {level}
        </div>
      </div>

      {/* Checks gratuits */}
      <div className="space-y-3">
        <p className="text-sm text-gray-500 font-medium">
          Aperçu — {previewChecks.length} checks sur {totalChecks}
        </p>
        {previewChecks.map((check) => (
          <CheckItem key={check.id} check={check} />
        ))}
      </div>

      {/* Checks floutés */}
      <div className="relative">
        <div className="space-y-3 pointer-events-none">
          {Array.from({ length: Math.min(lockedCount, 3) }).map((_, i) => (
            <CheckItem
              key={i}
              check={{
                id: `locked-${i}`,
                category: 'content',
                title: 'Check masqué',
                status: 'warning',
                score: 60,
                feedback: 'Débloquez le rapport complet pour voir cette analyse.',
                suggestions: ['Suggestion disponible après paiement'],
              }}
              blurred
            />
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-lg">
          <div className="text-center space-y-3">
            <p className="font-medium text-gray-700">
              + {lockedCount} checks masqués
            </p>
            <button
              onClick={handlePay}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              {isLoading ? 'Redirection…' : 'Voir le rapport complet — 5€'}
            </button>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <p className="text-xs text-gray-400">Paiement sécurisé par Stripe · Sans compte</p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Commit**

```bash
git add components/FreePreview.tsx
git commit -m "feat: add FreePreview component with payment CTA"
```

---

## Task 13 : Composant FullReport

**Files:**
- Create: `components/FullReport.tsx`

- [ ] **Step 1 : Créer le rapport complet**

```typescript
// components/FullReport.tsx
import { CheckItem } from './CheckItem'
import type { AnalysisResult } from '@/types/analysis'

const LEVEL_COLOR = {
  'Passable': 'text-red-500',
  'Bon': 'text-yellow-500',
  'Excellent': 'text-green-500',
}

const CATEGORY_LABELS = {
  ats: 'Compatibilité ATS',
  content: 'Contenu',
  style: 'Style & Format',
  impact: 'Impact global',
}

interface FullReportProps {
  result: AnalysisResult
}

export function FullReport({ result }: FullReportProps) {
  const byCategory = result.checks.reduce((acc, check) => {
    if (!acc[check.category]) acc[check.category] = []
    acc[check.category].push(check)
    return acc
  }, {} as Record<string, typeof result.checks>)

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Score global */}
      <div className="text-center space-y-2">
        <div className="text-7xl font-bold text-gray-800">{result.score}</div>
        <div className="text-gray-400 text-sm">/ 100</div>
        <div className={`text-xl font-semibold ${LEVEL_COLOR[result.level]}`}>
          {result.level}
        </div>
      </div>

      {/* Top 3 actions */}
      <div className="bg-blue-50 rounded-xl p-5">
        <h2 className="font-semibold text-blue-800 mb-3">🎯 3 actions prioritaires</h2>
        <ol className="space-y-2">
          {result.topActions.map((action, i) => (
            <li key={i} className="flex gap-3 text-sm text-blue-700">
              <span className="font-bold">{i + 1}.</span>
              <span>{action}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Checks par catégorie */}
      {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map((cat) => {
        const checks = byCategory[cat]
        if (!checks?.length) return null
        return (
          <div key={cat} className="space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
              {CATEGORY_LABELS[cat]}
            </h2>
            {checks.map((check) => (
              <CheckItem key={check.id} check={check} />
            ))}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2 : Commit**

```bash
git add components/FullReport.tsx
git commit -m "feat: add FullReport component"
```

---

## Task 14 : Page principale (upload + preview)

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1 : Créer la page principale**

```typescript
// app/page.tsx
'use client'

import { useState } from 'react'
import { UploadZone } from '@/components/UploadZone'
import { FreePreview } from '@/components/FreePreview'
import type { Check } from '@/types/analysis'

interface PreviewData {
  id: string
  score: number
  level: string
  previewChecks: Check[]
  totalChecks: number
}

export default function HomePage() {
  const [preview, setPreview] = useState<PreviewData | null>(null)

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-16 space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-gray-900">
            Analyse ton CV en 30 secondes
          </h1>
          <p className="text-gray-500 text-lg">
            Score ATS · 12 checks · 3 actions prioritaires
          </p>
          {!preview && (
            <p className="text-sm text-gray-400">
              Aperçu gratuit · Rapport complet à 5€ · Sans compte
            </p>
          )}
        </div>

        {/* Upload ou Preview */}
        {!preview ? (
          <UploadZone onPreview={setPreview} />
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setPreview(null)}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Analyser un autre CV
            </button>
            <FreePreview {...preview} />
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2 : Commit**

```bash
git add app/page.tsx
git commit -m "feat: add home page with upload and free preview"
```

---

## Task 15 : Page résultat (rapport complet)

**Files:**
- Create: `app/result/[id]/page.tsx`

- [ ] **Step 1 : Créer la page résultat**

```typescript
// app/result/[id]/page.tsx
import { notFound } from 'next/navigation'
import { FullReport } from '@/components/FullReport'
import type { AnalysisResult } from '@/types/analysis'

interface Props {
  params: { id: string }
  searchParams: { session_id?: string }
}

async function fetchReport(id: string, sessionId: string): Promise<AnalysisResult | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!
  const res = await fetch(
    `${baseUrl}/api/report/${id}?session_id=${sessionId}`,
    { cache: 'no-store' }
  )
  if (!res.ok) return null
  return res.json()
}

export default async function ResultPage({ params, searchParams }: Props) {
  const sessionId = searchParams.session_id

  if (!sessionId) {
    notFound()
  }

  const result = await fetchReport(params.id, sessionId)

  if (!result) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-xl font-medium text-gray-700">Rapport introuvable ou expiré</p>
          <p className="text-gray-400 text-sm">Les rapports sont disponibles pendant 2h après l'analyse.</p>
          <a href="/" className="text-blue-600 text-sm hover:underline">
            Analyser un nouveau CV
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-16 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Ton rapport complet</h1>
          <a href="/" className="text-sm text-gray-400 hover:text-gray-600">
            ← Analyser un autre CV
          </a>
        </div>
        <FullReport result={result} />
      </div>
    </main>
  )
}
```

- [ ] **Step 2 : Commit**

```bash
git add "app/result/[id]/page.tsx"
git commit -m "feat: add result page with full report"
```

---

## Task 16 : Layout et métadonnées

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1 : Mettre à jour le layout**

```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CV Analyzer — Score ATS en 30 secondes',
  description: 'Analyse ton CV avec 12 checks ATS. Aperçu gratuit, rapport complet à 5€. Sans compte.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-gray-50`}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2 : Commit**

```bash
git add app/layout.tsx
git commit -m "feat: update layout with metadata"
```

---

## Task 17 : Variables d'environnement et déploiement Vercel

**Files:**
- Create: `.env.local` (non commité), `.gitignore`

- [ ] **Step 1 : Vérifier le .gitignore**

S'assurer que `.env.local` est bien dans `.gitignore` (create-next-app l'ajoute par défaut).

- [ ] **Step 2 : Configurer Vercel KV**

```bash
# Installer Vercel CLI si pas déjà fait
npm i -g vercel

# Se connecter
vercel login

# Lier le projet
vercel link

# Créer un KV store
vercel kv add cv-analyzer-kv

# Pull les variables d'environnement
vercel env pull .env.local
```

- [ ] **Step 3 : Ajouter toutes les variables dans Vercel**

Dans le dashboard Vercel → Settings → Environment Variables, ajouter :
- `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (obtenu à l'étape suivante)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_BASE_URL` → URL de production (ex: https://cv-analyzer.vercel.app)
- `BREVO_API_KEY` → créer un compte sur brevo.com → SMTP & API → Clés API → Générer
- `BREVO_FROM_EMAIL` → ex: `rapport@votredomaine.com` (vérifier le domaine dans Brevo → Senders & IPs)
- `BREVO_FROM_NAME` → ex: `CV Analyzer`

- [ ] **Step 4 : Déployer une première fois pour obtenir l'URL**

```bash
vercel --prod
```

Note l'URL de prod (ex: `https://cv-analyzer.vercel.app`).

- [ ] **Step 5 : Configurer le webhook Stripe**

Dans le dashboard Stripe → Developers → Webhooks → Add endpoint :
- URL : `https://cv-analyzer.vercel.app/api/webhook`
- Événement à écouter : `checkout.session.completed`
- Copier le `Signing secret` (whsec_...) → ajouter dans Vercel comme `STRIPE_WEBHOOK_SECRET`
- Redéployer pour prendre en compte la nouvelle variable :

```bash
vercel --prod
```

- [ ] **Step 6 : Tester le flow complet**

1. Uploader un PDF sur l'URL de prod
2. Vérifier que l'aperçu s'affiche (score + 2 checks)
3. Cliquer "Voir le rapport complet — 5€"
4. Payer avec la carte test Stripe : `4242 4242 4242 4242`, date `12/34`, CVC `123`
5. Vérifier que le rapport complet s'affiche sur `/result/[id]`
6. Vérifier que l'email de rapport est reçu sur l'adresse saisie dans Stripe

- [ ] **Step 7 : Commit final**

```bash
git add .
git commit -m "chore: finalize deployment configuration"
git push origin main
```

---

## Récapitulatif des fichiers créés

```
cv-analyzer/
├── types/analysis.ts
├── lib/
│   ├── parse-pdf.ts
│   ├── analyze.ts
│   ├── kv.ts
│   ├── stripe.ts
│   └── email.ts          ← Resend, template HTML du rapport
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── result/[id]/page.tsx
│   └── api/
│       ├── analyze/route.ts
│       ├── checkout/route.ts
│       ├── report/[id]/route.ts
│       └── webhook/route.ts  ← Stripe webhook → markPaid + sendEmail
└── components/
    ├── UploadZone.tsx
    ├── FreePreview.tsx
    ├── FullReport.tsx
    └── CheckItem.tsx
```

## Ordre d'exécution recommandé

Tasks 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17

Chaque task est indépendante après la précédente. Commits fréquents à chaque étape.
