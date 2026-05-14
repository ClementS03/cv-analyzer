# Security Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 confirmed security vulnerabilities: error leakage, PDF spoofing, prompt injection, payment bypass, and unverified email delivery.

**Architecture:** All fixes are isolated to their respective layers — error handling via a shared `UserFacingError` class, PDF validation via magic bytes, prompt isolation via XML tags, session binding via KV, and email trust via pre-checkout collection. No new dependencies required.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest, @vercel/kv, Stripe, Anthropic SDK

---

## File Map

| File | Action | Change |
|------|--------|--------|
| `lib/errors.ts` | Create | `UserFacingError` class |
| `lib/parse-pdf.ts` | Modify | Magic bytes check, throw `UserFacingError` |
| `lib/analyze.ts` | Modify | XML-wrapped prompt, response shape validation |
| `lib/kv.ts` | Modify | `markAnalysisPaid(id, sessionId)`, store `userEmail` |
| `types/analysis.ts` | Modify | Add `paidSessionId?`, `userEmail?` to `StoredAnalysis` |
| `app/api/analyze/route.ts` | Modify | Error leakage fix |
| `app/api/checkout/route.ts` | Modify | Accept + store `email`, error leakage fix |
| `app/api/report/[id]/route.ts` | Modify | Always validate `sessionId`, error leakage fix |
| `app/api/webhook/route.ts` | Modify | Pass `session.id` to `markAnalysisPaid`, use stored email |
| `components/FreePreview.tsx` | Modify | Email input before pay button |
| `lib/parse-pdf.test.ts` | Create | Tests for magic bytes |
| `lib/analyze.test.ts` | Modify | Tests for XML prompt + shape validation |
| `lib/kv.test.ts` | Create | Tests for `markAnalysisPaid` with sessionId |

---

## Task 1: UserFacingError + Error Leakage Fix

**Files:**
- Create: `lib/errors.ts`
- Modify: `lib/parse-pdf.ts`
- Modify: `app/api/analyze/route.ts`
- Modify: `app/api/checkout/route.ts`
- Modify: `app/api/report/[id]/route.ts`

- [ ] **Step 1: Create `lib/errors.ts`**

```ts
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UserFacingError'
  }
}
```

- [ ] **Step 2: Update `lib/parse-pdf.ts` to throw `UserFacingError`**

Replace the entire file:

```ts
import pdfParse from 'pdf-parse'
import { UserFacingError } from './errors'

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)
  return data.text.trim()
}

export function validatePDFSize(buffer: Buffer): void {
  if (buffer.length > 5 * 1024 * 1024) {
    throw new UserFacingError('Le fichier dépasse 5MB')
  }
}

export function validateCVContent(text: string): void {
  if (text.trim().length < 100) {
    throw new UserFacingError(
      'Ton CV semble être une image scannée. pdf-parse ne peut pas lire les images — exporte ton CV en PDF texte depuis Word, LibreOffice ou Canva.'
    )
  }

  const lower = text.toLowerCase()
  const indicators = {
    contact: [
      /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i,
      /(\+?\d[\d\s\-().]{7,}\d)/,
      /linkedin\.com/i,
      /github\.com/i,
    ],
    identity: [
      /\b(nom|prénom|name|surname|firstname)\b/i,
      /\b(né(e)?|date de naissance|born)\b/i,
      /\b(adresse|address|ville|city)\b/i,
    ],
    experience: [
      /\b(expérience|experience|emploi|poste|mission|stage|internship|job)\b/i,
      /\b(entreprise|société|company|employeur|employer)\b/i,
      /\b(cdi|cdd|freelance|alternance|apprentissage)\b/i,
    ],
    education: [
      /\b(formation|education|études|diplôme|degree|bachelor|master|licence|bac|bts|dut|école|université|university)\b/i,
    ],
    skills: [
      /\b(compétences?|skills?|langues?|languages?|outils?|tools?|technologies?|maîtrise)\b/i,
    ],
  }

  const matched = Object.values(indicators).filter((patterns) =>
    patterns.some((p) => p.test(lower))
  ).length

  if (matched < 2) {
    throw new UserFacingError(
      "Ce document ne ressemble pas à un CV. Assure-toi d'uploader ton CV en PDF avec tes informations personnelles, expériences et formations."
    )
  }
}
```

- [ ] **Step 3: Fix error leakage in `app/api/analyze/route.ts`**

Replace the catch block:
```ts
// Before:
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }

// After:
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[analyze]', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
```

Add import at top: `import { UserFacingError } from '@/lib/errors'`

- [ ] **Step 4: Fix error leakage in `app/api/checkout/route.ts`**

Same pattern — replace the catch block and add the import:
```ts
import { UserFacingError } from '@/lib/errors'
// ...
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[checkout]', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
```

- [ ] **Step 5: Fix error leakage in `app/api/report/[id]/route.ts`**

Same pattern:
```ts
import { UserFacingError } from '@/lib/errors'
// ...
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[report]', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Run tests**

```bash
npm test
```
Expected: 20/20 pass (no existing tests broken).

- [ ] **Step 8: Commit**

```bash
git add lib/errors.ts lib/parse-pdf.ts app/api/analyze/route.ts app/api/checkout/route.ts app/api/report/\[id\]/route.ts
git commit -m "fix(security): UserFacingError — prevent internal error leakage"
```

---

## Task 2: PDF Magic Bytes Validation

**Files:**
- Modify: `lib/parse-pdf.ts`
- Create: `lib/parse-pdf.test.ts`

- [ ] **Step 1: Write failing tests in `lib/parse-pdf.test.ts`**

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- lib/parse-pdf.test.ts --reporter=verbose
```
Expected: FAIL — `validatePDFMagicBytes is not exported`.

- [ ] **Step 3: Add `validatePDFMagicBytes` to `lib/parse-pdf.ts`**

Add this function after `validatePDFSize`:

```ts
export function validatePDFMagicBytes(buffer: Buffer): void {
  if (buffer.length < 4 || buffer.slice(0, 4).toString('binary') !== '%PDF') {
    throw new UserFacingError('Le fichier n\'est pas un PDF valide.')
  }
}
```

- [ ] **Step 4: Call it in `app/api/analyze/route.ts`**

Add after `validatePDFSize(buffer)`:
```ts
import { extractTextFromPDF, validatePDFSize, validatePDFMagicBytes, validateCVContent } from '@/lib/parse-pdf'
// ...
    validatePDFSize(buffer)
    validatePDFMagicBytes(buffer)   // ← add this line
    const cvText = await extractTextFromPDF(buffer)
```

- [ ] **Step 5: Run all tests**

```bash
npm test --reporter=verbose
```
Expected: all 24 tests pass (20 existing + 4 new).

- [ ] **Step 6: Commit**

```bash
git add lib/parse-pdf.ts lib/parse-pdf.test.ts app/api/analyze/route.ts
git commit -m "fix(security): validate PDF magic bytes before parsing"
```

---

## Task 3: Prompt Injection Fix

**Files:**
- Modify: `lib/analyze.ts`
- Modify: `lib/analyze.test.ts`

- [ ] **Step 1: Write failing tests — append to `lib/analyze.test.ts`**

```ts
describe('buildUserPrompt (via parseAnalysisResponse shape validation)', () => {
  it('rejects a response with no checks array', () => {
    const raw = JSON.stringify({ language: 'en', topIntro: 'hi', topActions: ['a'] })
    expect(() => parseAnalysisResponse(raw)).toThrow()
  })

  it('rejects a response with empty checks array', () => {
    const raw = JSON.stringify({ language: 'en', topIntro: 'hi', checks: [], topActions: ['a'] })
    expect(() => parseAnalysisResponse(raw)).toThrow()
  })

  it('rejects a response where topActions is not an array', () => {
    const raw = JSON.stringify({
      language: 'en', topIntro: 'hi',
      checks: [mockCheck],
      topActions: 'not an array',
    })
    expect(() => parseAnalysisResponse(raw)).toThrow()
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm test -- lib/analyze.test.ts --reporter=verbose
```
Expected: the 3 new shape tests FAIL (currently `parseAnalysisResponse` doesn't validate shape).

- [ ] **Step 3: Update `lib/analyze.ts` — XML prompt wrapping + shape validation**

Update `buildUserPrompt`:
```ts
function buildUserPrompt(cvText: string): string {
  return `<cv_content>\n${cvText.slice(0, 8000)}\n</cv_content>\n\nAnalyse the CV above.`
}
```

Add shape validation at the top of `parseAnalysisResponse`, after `JSON.parse`:
```ts
export function parseAnalysisResponse(rawText: string): AnalysisResult {
  const raw = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(raw) as Record<string, unknown>

  // Shape validation — reject injected/malformed responses
  if (!Array.isArray(parsed.checks) || parsed.checks.length === 0) {
    throw new Error('Invalid response: checks must be a non-empty array')
  }
  if (!Array.isArray(parsed.topActions)) {
    throw new Error('Invalid response: topActions must be an array')
  }

  const language: CVLanguage = parsed.language === 'en' ? 'en' : 'fr'
  const checks = parsed.checks as Check[]
  const topActions = (parsed.topActions as (string | { action?: string; rank?: number; impact?: string })[]).map((a) =>
    typeof a === 'string' ? a : (a.action ?? JSON.stringify(a))
  )

  const score = Math.round(
    checks.reduce((sum, c) => sum + c.score, 0) / checks.length
  )

  const defaultIntro =
    language === 'en'
      ? "Here are three targeted improvements that could meaningfully strengthen your CV:"
      : "Voici trois pistes sur lesquelles je t'invite à travailler pour renforcer ton profil :"

  return {
    language,
    score,
    level: scoreToLevel(score, language),
    topIntro: typeof parsed.topIntro === 'string' ? parsed.topIntro : defaultIntro,
    checks,
    topActions,
  }
}
```

- [ ] **Step 4: Run all tests**

```bash
npm test --reporter=verbose
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/analyze.ts lib/analyze.test.ts
git commit -m "fix(security): XML prompt isolation + response shape validation"
```

---

## Task 4: Business Logic Bypass Fix (Session Binding)

**Files:**
- Modify: `types/analysis.ts`
- Modify: `lib/kv.ts`
- Create: `lib/kv.test.ts`
- Modify: `app/api/webhook/route.ts`
- Modify: `app/api/report/[id]/route.ts`

- [ ] **Step 1: Update `types/analysis.ts` — add `paidSessionId`**

Add `paidSessionId?: string` to `StoredAnalysis`:

```ts
export interface StoredAnalysis {
  result: AnalysisResult
  paidAt?: number
  paidSessionId?: string   // ← add this
  userEmail?: string       // ← add this (used in Task 5)
  createdAt: number
}
```

- [ ] **Step 2: Write failing tests in `lib/kv.test.ts`**

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @vercel/kv
vi.mock('@vercel/kv', () => ({
  kv: {
    set: vi.fn(),
    get: vi.fn(),
  },
}))

import { kv } from '@vercel/kv'
import { markAnalysisPaid, getAnalysis } from './kv'
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
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- lib/kv.test.ts --reporter=verbose
```
Expected: FAIL — `markAnalysisPaid` doesn't accept `sessionId` yet.

- [ ] **Step 4: Update `lib/kv.ts` — add `sessionId` param to `markAnalysisPaid`**

```ts
import { kv } from '@vercel/kv'
import type { StoredAnalysis } from '@/types/analysis'

const TTL_SECONDS = 60 * 60 * 2

export async function storeAnalysis(id: string, analysis: StoredAnalysis): Promise<void> {
  await kv.set(`analysis:${id}`, analysis, { ex: TTL_SECONDS })
}

export async function getAnalysis(id: string): Promise<StoredAnalysis | null> {
  return kv.get<StoredAnalysis>(`analysis:${id}`)
}

export async function markAnalysisPaid(id: string, sessionId: string): Promise<void> {
  const analysis = await getAnalysis(id)
  if (!analysis) throw new Error('Analyse introuvable ou expirée')
  await storeAnalysis(id, { ...analysis, paidAt: Date.now(), paidSessionId: sessionId })
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- lib/kv.test.ts --reporter=verbose
```
Expected: 2/2 PASS.

- [ ] **Step 6: Update `app/api/webhook/route.ts` — pass `session.id` to `markAnalysisPaid`**

Change:
```ts
// Before:
await markAnalysisPaid(analysisId),

// After:
await markAnalysisPaid(analysisId, session.id),
```

- [ ] **Step 7: Update `app/api/report/[id]/route.ts` — always validate sessionId**

Replace the current `if (analysis.paidAt)` early-return with a proper session check:

```ts
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

    // If paid, verify the sessionId matches the one that was used to pay
    if (analysis.paidAt) {
      if (analysis.paidSessionId === sessionId) {
        return NextResponse.json(analysis.result)
      }
      // sessionId mismatch — fall through to live Stripe verification
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
```

- [ ] **Step 8: Run all tests**

```bash
npm test --reporter=verbose
```
Expected: all tests pass.

- [ ] **Step 9: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add types/analysis.ts lib/kv.ts lib/kv.test.ts app/api/webhook/route.ts app/api/report/\[id\]/route.ts
git commit -m "fix(security): bind paid report access to Stripe session ID"
```

---

## Task 5: Email Verification Fix

**Files:**
- Modify: `components/FreePreview.tsx`
- Modify: `app/api/checkout/route.ts`
- Modify: `lib/kv.ts`
- Modify: `app/api/webhook/route.ts`

- [ ] **Step 1: Add `storeUserEmail` to `lib/kv.ts`**

Add this function:

```ts
export async function storeUserEmail(id: string, email: string): Promise<void> {
  const analysis = await getAnalysis(id)
  if (!analysis) return
  await storeAnalysis(id, { ...analysis, userEmail: email })
}
```

- [ ] **Step 2: Update `app/api/checkout/route.ts` — accept and store email**

```ts
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
```

- [ ] **Step 3: Update `app/api/webhook/route.ts` — prefer stored email**

Change the email variable to prefer `stored.userEmail` over `session.customer_details?.email`:

```ts
const email = stored.userEmail ?? session.customer_details?.email
```

Full updated webhook:

```ts
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

    // Prefer email stored before checkout; fall back to Stripe-supplied email
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
```

- [ ] **Step 4: Update `components/FreePreview.tsx` — add email input before pay button**

Add `email` state and an input field. Replace the pay button section:

```tsx
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

const LEVEL_COLOR: Record<string, string> = {
  Passable: 'text-red-500',
  Bon: 'text-yellow-500',
  Excellent: 'text-green-500',
  Poor: 'text-red-500',
  Good: 'text-yellow-500',
}

export function FreePreview({ id, score, level, previewChecks, totalChecks }: FreePreviewProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const lockedCount = totalChecks - previewChecks.length

  const handlePay = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Entre une adresse email valide pour recevoir ton rapport.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId: id, email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <div className="text-7xl font-bold text-gray-800">{score}</div>
        <div className="text-gray-400 text-sm">/ 100</div>
        <div className={`text-xl font-semibold ${LEVEL_COLOR[level] ?? 'text-gray-600'}`}>
          {level}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-gray-500 font-medium">
          Aperçu gratuit — {previewChecks.length} checks sur {totalChecks}
        </p>
        {previewChecks.map((check) => (
          <CheckItem key={check.id} check={check} />
        ))}
      </div>

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
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px] rounded-lg">
          <div className="text-center space-y-3 px-4 w-full max-w-sm">
            <p className="font-medium text-gray-700">+ {lockedCount} checks masqués</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handlePay}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
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

- [ ] **Step 5: Run all tests**

```bash
npm test --reporter=verbose
```
Expected: all tests pass.

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/kv.ts app/api/checkout/route.ts app/api/webhook/route.ts components/FreePreview.tsx
git commit -m "fix(security): collect email before checkout, use stored email for report delivery"
```

---

## Task 6: Final Smoke Test + Deploy

- [ ] **Step 1: Run all tests**

```bash
npm test --reporter=verbose
```
Expected: all tests pass.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Next.js build**

```bash
npx next build
```
Expected: build succeeds.

- [ ] **Step 4: Push**

```bash
git push origin main
```
