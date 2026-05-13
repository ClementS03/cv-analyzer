# Language Detection & Tone Improvement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect the CV language (FR/EN) and respond in that language with an encouraging, coaching tone, a `topIntro` sentence, and realistic `topActions`.

**Architecture:** Claude detects language and outputs all text fields in the detected language. A new `language: 'fr' | 'en'` field propagates from Claude's JSON through `AnalysisResult` to the UI, where static labels are switched accordingly. A `topIntro` field is added for the warm introductory sentence before the 3 actions.

**Tech Stack:** Next.js 16, TypeScript, Anthropic SDK, Vitest, @testing-library/react, jsdom

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `package.json` | Modify | Add test deps and `test` script |
| `vitest.config.ts` | Create | Vitest config with jsdom + `@/` alias |
| `vitest.setup.ts` | Create | `@testing-library/jest-dom` import |
| `types/analysis.ts` | Modify | Add `CVLanguage`, `topIntro`, widen `level` to `string` |
| `lib/analyze.ts` | Modify | Export `scoreToLevel`+`parseAnalysisResponse`, new prompt |
| `lib/analyze.test.ts` | Create | Unit tests for `scoreToLevel` and `parseAnalysisResponse` |
| `components/FullReport.tsx` | Modify | Language-aware labels, `topIntro` display |
| `components/FullReport.test.tsx` | Create | Component render tests |
| `app/result/[id]/page.tsx` | Modify | Language-aware page title |

---

## Task 0: Install and configure Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Install test dependencies**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

Expected: packages appear in `devDependencies` in `package.json`.

- [ ] **Step 2: Add test script to `package.json`**

In the `scripts` section, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 4: Create `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Verify setup works**

```bash
npx vitest run --reporter=verbose
```

Expected: "No test files found" (no error, just no tests yet).

- [ ] **Step 6: Commit**

```bash
git add package.json vitest.config.ts vitest.setup.ts
git commit -m "chore: set up Vitest with jsdom and @testing-library/react"
```

---

## Task 1: Update types

**Files:**
- Modify: `types/analysis.ts`

No tests for types — TypeScript itself validates them.

- [ ] **Step 1: Update `types/analysis.ts`**

Replace the entire file content with:

```ts
export type CVLanguage = 'fr' | 'en'
export type CheckCategory = 'ats' | 'content' | 'style' | 'impact'
export type CheckStatus = 'pass' | 'warning' | 'fail'

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
  language: CVLanguage
  score: number // 0-100
  level: string // computed by scoreToLevel(score, language)
  topIntro: string
  checks: Check[]
  topActions: string[]
}

export interface StoredAnalysis {
  result: AnalysisResult
  paidAt?: number
  createdAt: number
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: errors only about `level` and `topIntro` being missing from existing usages (we'll fix those in later tasks). Note the error locations — you'll fix them in Tasks 3 and 5.

- [ ] **Step 3: Commit**

```bash
git add types/analysis.ts
git commit -m "feat: add CVLanguage and topIntro to AnalysisResult types"
```

---

## Task 2: TDD — `scoreToLevel` (language-aware)

**Files:**
- Create: `lib/analyze.test.ts`
- Modify: `lib/analyze.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/analyze.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { scoreToLevel } from './analyze'

describe('scoreToLevel', () => {
  describe('French labels', () => {
    it('returns Excellent at 75+', () => {
      expect(scoreToLevel(75, 'fr')).toBe('Excellent')
      expect(scoreToLevel(100, 'fr')).toBe('Excellent')
    })

    it('returns Bon at 50–74', () => {
      expect(scoreToLevel(50, 'fr')).toBe('Bon')
      expect(scoreToLevel(74, 'fr')).toBe('Bon')
    })

    it('returns Passable below 50', () => {
      expect(scoreToLevel(0, 'fr')).toBe('Passable')
      expect(scoreToLevel(49, 'fr')).toBe('Passable')
    })
  })

  describe('English labels', () => {
    it('returns Excellent at 75+', () => {
      expect(scoreToLevel(75, 'en')).toBe('Excellent')
      expect(scoreToLevel(100, 'en')).toBe('Excellent')
    })

    it('returns Good at 50–74', () => {
      expect(scoreToLevel(50, 'en')).toBe('Good')
      expect(scoreToLevel(74, 'en')).toBe('Good')
    })

    it('returns Poor below 50', () => {
      expect(scoreToLevel(0, 'en')).toBe('Poor')
      expect(scoreToLevel(49, 'en')).toBe('Poor')
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/analyze.test.ts --reporter=verbose
```

Expected: FAIL — `scoreToLevel is not exported` or similar.

- [ ] **Step 3: Export `scoreToLevel` and make it language-aware in `lib/analyze.ts`**

Replace the existing `scoreToLevel` function with:

```ts
import type { CVLanguage } from '@/types/analysis'

export function scoreToLevel(score: number, language: CVLanguage): string {
  if (language === 'en') {
    if (score >= 75) return 'Excellent'
    if (score >= 50) return 'Good'
    return 'Poor'
  }
  if (score >= 75) return 'Excellent'
  if (score >= 50) return 'Bon'
  return 'Passable'
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/analyze.test.ts --reporter=verbose
```

Expected: all `scoreToLevel` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/analyze.ts lib/analyze.test.ts
git commit -m "feat: make scoreToLevel language-aware (fr/en)"
```

---

## Task 3: TDD — `parseAnalysisResponse` + new system prompt

**Files:**
- Modify: `lib/analyze.test.ts` (add tests)
- Modify: `lib/analyze.ts` (extract helper, update prompt, update `analyzeCV`)

- [ ] **Step 1: Write the failing tests**

Append to `lib/analyze.test.ts`:

```ts
import { parseAnalysisResponse } from './analyze'
import type { Check } from '@/types/analysis'

const mockCheck: Check = {
  id: 'essential-sections',
  title: 'Essential sections',
  status: 'pass',
  score: 80,
  feedback: 'All key sections are present.',
  suggestions: [],
  category: 'ats',
}

describe('parseAnalysisResponse', () => {
  it('extracts language and topIntro from Claude JSON', () => {
    const raw = JSON.stringify({
      language: 'en',
      topIntro: 'Here are three changes to strengthen your CV:',
      checks: [mockCheck],
      topActions: ['Add numbers to your achievements'],
    })
    const result = parseAnalysisResponse(raw)
    expect(result.language).toBe('en')
    expect(result.topIntro).toBe('Here are three changes to strengthen your CV:')
  })

  it('defaults language to fr when missing from JSON', () => {
    const raw = JSON.stringify({
      checks: [mockCheck],
      topActions: ['Ajoute des chiffres'],
    })
    const result = parseAnalysisResponse(raw)
    expect(result.language).toBe('fr')
  })

  it('uses a default topIntro when missing from JSON', () => {
    const raw = JSON.stringify({
      language: 'en',
      checks: [mockCheck],
      topActions: ['Add numbers'],
    })
    const result = parseAnalysisResponse(raw)
    expect(result.topIntro).toBeTruthy()
    expect(result.topIntro.length).toBeGreaterThan(10)
  })

  it('strips markdown code fences before parsing', () => {
    const raw = '```json\n' + JSON.stringify({
      language: 'fr',
      topIntro: 'Voici trois axes :',
      checks: [mockCheck],
      topActions: ['Ajoute des chiffres'],
    }) + '\n```'
    const result = parseAnalysisResponse(raw)
    expect(result.language).toBe('fr')
  })

  it('computes score as average of check scores', () => {
    const checks: Check[] = [
      { ...mockCheck, score: 60 },
      { ...mockCheck, id: 'length', score: 80 },
    ]
    const raw = JSON.stringify({
      language: 'fr',
      topIntro: 'Voici trois axes :',
      checks,
      topActions: ['Action 1'],
    })
    const result = parseAnalysisResponse(raw)
    expect(result.score).toBe(70)
  })

  it('normalises topActions that are objects instead of strings', () => {
    const raw = JSON.stringify({
      language: 'fr',
      topIntro: 'Voici trois axes :',
      checks: [mockCheck],
      topActions: [{ action: 'Ajoute des chiffres', rank: 1 }],
    })
    const result = parseAnalysisResponse(raw)
    expect(result.topActions[0]).toBe('Ajoute des chiffres')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/analyze.test.ts --reporter=verbose
```

Expected: FAIL — `parseAnalysisResponse is not exported`.

- [ ] **Step 3: Extract `parseAnalysisResponse` and update `analyzeCV` in `lib/analyze.ts`**

Replace the entire `lib/analyze.ts` with the following. Read it carefully — it updates the system prompt, exports both helpers, and wires up `analyzeCV` to use `parseAnalysisResponse`:

```ts
import Anthropic from '@anthropic-ai/sdk'
import type { AnalysisResult, Check, CVLanguage } from '@/types/analysis'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are an expert recruiter and CV coach. You analyse CVs and provide structured feedback in JSON format.

LANGUAGE DETECTION: Read the CV text carefully. If it is primarily written in English, set "language" to "en". If it is primarily in French, set "language" to "fr".

IMPORTANT: ALL text fields you produce (title, feedback, suggestions, topIntro, topActions) must be in the detected language. If the CV is in English, respond in English. If French, respond in French.

TONE: Adopt the voice of a supportive career coach — encouraging, specific, and constructive. Never judgmental, preachy, or condescending. Frame issues as opportunities. Avoid implying the candidate is naive or careless. A CV is a personal document someone spent time on — treat it with respect.

Perform the following 12 checks. Each check must include the "category" field shown:

category "ats":
1. essential-sections: Presence of Contact, Experience, Education, Skills
2. no-complex-formatting: Absence of tables, multi-column layouts, text images
3. date-consistency: Consistency of date format (MM/YYYY, YYYY, etc.)

category "content":
4. quantification: Percentage of achievements with concrete numbers
5. action-verbs: Percentage of bullets starting with a strong action verb
6. buzzwords: Presence of vague filler phrases ("passionate", "team player", "dynamic", "motivated", "rigorous", "versatile", "passionné", "dynamique", "motivé")
7. repetition: Words repeated excessively (3+ times without reason)

category "style":
8. length: Appropriate length (1 page junior <3 yrs, 2 pages senior, 3+ pages = too long)
9. contact-info: Professional email, LinkedIn or GitHub present
10. tense-consistency: Consistent verb tenses in experience sections

category "impact":
11. weakest-sections: Identify the 3 weakest sections
12. overall-impact: Overall evaluation

For each check, provide:
- status: "pass" (>= 70), "warning" (40–69), "fail" (< 40)
- score: 0–100
- feedback: 1 concrete sentence describing what you observe. For "buzzwords", name the specific phrases found and suggest one concrete replacement — do NOT say the CV is "full of clichés".
- suggestions: 1–3 actionable, specific suggestions. Phrase them as invitations, not commands.

Additional JSON fields:
- language: "fr" or "en" (detected from the CV text)
- topIntro: A single warm sentence introducing the 3 priority actions. It should sound like a career coach offering help, not a teacher grading a paper. EN example: "Here are three targeted improvements that could meaningfully strengthen your CV:" / FR example: "Voici trois pistes sur lesquelles je t'invite à travailler pour renforcer ton profil :"
- topActions: Array of 3 strings. Each must be: specific to THIS CV, achievable in under an hour, framed positively, and reference a real element from the CV. Format: "Verb + what to do + concrete example from the CV". EN example: "Add numbers to your impact: replace 'managed a team' with 'led a team of 5, delivering 3 projects on time'"

Respond ONLY with valid JSON. No markdown, no explanation.`

export function scoreToLevel(score: number, language: CVLanguage): string {
  if (language === 'en') {
    if (score >= 75) return 'Excellent'
    if (score >= 50) return 'Good'
    return 'Poor'
  }
  if (score >= 75) return 'Excellent'
  if (score >= 50) return 'Bon'
  return 'Passable'
}

export function parseAnalysisResponse(rawText: string): AnalysisResult {
  const raw = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(raw) as {
    language?: string
    topIntro?: string
    checks: Check[]
    topActions: (string | { action?: string; rank?: number; impact?: string })[]
  }

  const language: CVLanguage = parsed.language === 'en' ? 'en' : 'fr'

  const topActions = parsed.topActions.map((a) =>
    typeof a === 'string' ? a : (a.action ?? JSON.stringify(a))
  )

  const score = Math.round(
    parsed.checks.reduce((sum, c) => sum + c.score, 0) / parsed.checks.length
  )

  const defaultIntro =
    language === 'en'
      ? 'Here are three targeted improvements that could meaningfully strengthen your CV:'
      : 'Voici trois pistes sur lesquelles je t\'invite à travailler pour renforcer ton profil :'

  return {
    language,
    score,
    level: scoreToLevel(score, language),
    topIntro: parsed.topIntro ?? defaultIntro,
    checks: parsed.checks,
    topActions,
  }
}

const MOCK_RESULT: AnalysisResult = {
  language: 'fr',
  score: 67,
  level: 'Bon',
  topIntro: 'Voici trois pistes concrètes pour renforcer ton profil :',
  checks: [
    { id: 'essential-sections', title: 'Sections essentielles', status: 'pass', score: 85, feedback: 'Toutes les sections clés sont présentes.', suggestions: ['Ajoute un résumé professionnel en haut du CV.'], category: 'ats' },
    { id: 'no-complex-formatting', title: 'Formatage ATS', status: 'pass', score: 90, feedback: 'Pas de tableaux ni de colonnes complexes détectés.', suggestions: [], category: 'ats' },
    { id: 'date-consistency', title: 'Cohérence des dates', status: 'warning', score: 60, feedback: 'Quelques variations dans le format des dates.', suggestions: ['Utilise un format uniforme : MM/YYYY partout.'], category: 'ats' },
    { id: 'quantification', title: 'Chiffres & résultats', status: 'fail', score: 30, feedback: 'Peu de réalisations sont chiffrées — c\'est une belle opportunité de te démarquer.', suggestions: ['Ajoute des %, €/$ ou volumes à tes réalisations.', 'Par ex. : "Augmenté les ventes de 25%"'], category: 'content' },
    { id: 'action-verbs', title: 'Verbes d\'action', status: 'warning', score: 55, feedback: '40% des bullets commencent par un verbe fort.', suggestions: ['Commence chaque bullet par un verbe : Développé, Géré, Optimisé...'], category: 'content' },
    { id: 'buzzwords', title: 'Formulations vagues', status: 'warning', score: 50, feedback: 'Les expressions "dynamique" et "motivé" pourraient être rendues plus concrètes.', suggestions: ['Remplace "dynamique" par un exemple : "Lancé 3 initiatives en autonomie en 6 mois"'], category: 'content' },
    { id: 'repetition', title: 'Répétitions', status: 'pass', score: 75, feedback: 'Peu de répétitions excessives.', suggestions: [], category: 'content' },
    { id: 'length', title: 'Longueur', status: 'pass', score: 80, feedback: 'Longueur adaptée au profil.', suggestions: [], category: 'style' },
    { id: 'contact-info', title: 'Coordonnées', status: 'pass', score: 85, feedback: 'Email et LinkedIn présents.', suggestions: ['Ajoute ton GitHub si tu es dans la tech.'], category: 'style' },
    { id: 'tense-consistency', title: 'Temps verbaux', status: 'pass', score: 70, feedback: 'Temps verbaux globalement cohérents.', suggestions: [], category: 'style' },
    { id: 'weakest-sections', title: 'Sections à renforcer', status: 'warning', score: 45, feedback: 'La formation et les compétences gagneraient à être plus détaillées.', suggestions: ['Détaille tes compétences avec le niveau.', 'Ajoute des projets si tu as peu d\'expérience.'], category: 'impact' },
    { id: 'overall-impact', title: 'Impact global', status: 'warning', score: 60, feedback: 'CV solide mais qui peut encore se différencier davantage.', suggestions: ['Ajoute une section Projets ou Réalisations.', 'Personnalise le CV pour chaque offre.'], category: 'impact' },
  ],
  topActions: [
    'Chiffre tes réalisations : remplace "géré une équipe" par "managé 5 développeurs, livré 3 projets dans les délais"',
    'Remplace "dynamique" par un fait concret : "Lancé 3 initiatives en autonomie en 6 mois"',
    'Uniformise toutes tes dates au format MM/YYYY',
  ],
}

function buildUserPrompt(cvText: string): string {
  return `Voici le CV à analyser :\n\n${cvText.slice(0, 8000)}`
}

export async function analyzeCV(cvText: string): Promise<AnalysisResult> {
  if (process.env.MOCK_ANALYZE === 'true') {
    await new Promise(r => setTimeout(r, 800))
    return MOCK_RESULT
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(cvText) }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response from Claude')
  }

  return parseAnalysisResponse(content.text)
}
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run lib/analyze.test.ts --reporter=verbose
```

Expected: all tests PASS (both `scoreToLevel` and `parseAnalysisResponse` suites).

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: only errors in `FullReport.tsx` about `LEVEL_COLOR` keys (fixed in Task 5).

- [ ] **Step 6: Commit**

```bash
git add lib/analyze.ts lib/analyze.test.ts
git commit -m "feat: extract parseAnalysisResponse, add language/topIntro, improve tone prompt"
```

---

## Task 4: TDD — `FullReport` component

**Files:**
- Create: `components/FullReport.test.tsx`
- Modify: `components/FullReport.tsx`

- [ ] **Step 1: Write the failing tests**

Create `components/FullReport.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FullReport } from './FullReport'
import type { AnalysisResult } from '@/types/analysis'

const frResult: AnalysisResult = {
  language: 'fr',
  score: 67,
  level: 'Bon',
  topIntro: 'Voici trois pistes pour renforcer ton profil :',
  checks: [],
  topActions: ['Action 1', 'Action 2', 'Action 3'],
}

const enResult: AnalysisResult = {
  language: 'en',
  score: 67,
  level: 'Good',
  topIntro: 'Here are three improvements to strengthen your CV:',
  checks: [],
  topActions: ['Action 1', 'Action 2', 'Action 3'],
}

describe('FullReport', () => {
  it('renders the topIntro sentence', () => {
    render(<FullReport result={frResult} />)
    expect(screen.getByText('Voici trois pistes pour renforcer ton profil :')).toBeInTheDocument()
  })

  it('renders French actions section title when language is fr', () => {
    render(<FullReport result={frResult} />)
    expect(screen.getByText('3 actions prioritaires')).toBeInTheDocument()
  })

  it('renders English actions section title when language is en', () => {
    render(<FullReport result={enResult} />)
    expect(screen.getByText('3 priority actions')).toBeInTheDocument()
  })

  it('renders all 3 topActions', () => {
    render(<FullReport result={frResult} />)
    expect(screen.getByText('Action 1')).toBeInTheDocument()
    expect(screen.getByText('Action 2')).toBeInTheDocument()
    expect(screen.getByText('Action 3')).toBeInTheDocument()
  })

  it('renders the score', () => {
    render(<FullReport result={frResult} />)
    expect(screen.getByText('67')).toBeInTheDocument()
  })

  it('renders the level', () => {
    render(<FullReport result={frResult} />)
    expect(screen.getByText('Bon')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run components/FullReport.test.tsx --reporter=verbose
```

Expected: FAIL — `topIntro` not rendered, wrong section title text, etc.

- [ ] **Step 3: Update `components/FullReport.tsx`**

Replace the entire file:

```tsx
import { CheckItem } from './CheckItem'
import type { AnalysisResult } from '@/types/analysis'

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  fr: {
    ats: 'Compatibilité ATS',
    content: 'Contenu',
    style: 'Style & Format',
    impact: 'Impact global',
  },
  en: {
    ats: 'ATS Compatibility',
    content: 'Content',
    style: 'Style & Format',
    impact: 'Overall Impact',
  },
}

const LEVEL_COLOR: Record<string, string> = {
  Passable: 'text-red-500',
  Bon: 'text-yellow-500',
  Excellent: 'text-green-500',
  Poor: 'text-red-500',
  Good: 'text-yellow-500',
}

const CATEGORY_MAP: Record<string, string> = {
  'essential-sections': 'ats',
  'no-complex-formatting': 'ats',
  'date-consistency': 'ats',
  quantification: 'content',
  'action-verbs': 'content',
  buzzwords: 'content',
  repetition: 'content',
  length: 'style',
  'contact-info': 'style',
  'tense-consistency': 'style',
  'weakest-sections': 'impact',
  'overall-impact': 'impact',
}

export function FullReport({ result }: { result: AnalysisResult }) {
  const labels = CATEGORY_LABELS[result.language] ?? CATEGORY_LABELS['fr']
  const actionsTitle = result.language === 'en' ? '3 priority actions' : '3 actions prioritaires'

  const byCategory = result.checks.reduce<Record<string, typeof result.checks>>(
    (acc, check) => {
      const cat = check.category || CATEGORY_MAP[check.id] || 'ats'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(check)
      return acc
    },
    {}
  )

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-1">
        <div className="text-7xl font-bold text-gray-800">{result.score}</div>
        <div className="text-gray-400 text-sm">/ 100</div>
        <div className={`text-xl font-semibold ${LEVEL_COLOR[result.level] ?? 'text-gray-700'}`}>
          {result.level}
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl p-5">
        <h2 className="font-semibold text-blue-800 mb-1">🎯 {actionsTitle}</h2>
        {result.topIntro && (
          <p className="text-sm text-blue-600 mb-3 italic">{result.topIntro}</p>
        )}
        <ol className="space-y-2">
          {result.topActions.map((action, i) => (
            <li key={i} className="flex gap-3 text-sm text-blue-700">
              <span className="font-bold">{i + 1}.</span>
              <span>{action}</span>
            </li>
          ))}
        </ol>
      </div>

      {Object.keys(labels).map((cat) => {
        const checks = byCategory[cat]
        if (!checks?.length) return null
        return (
          <div key={cat} className="space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
              {labels[cat]}
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

- [ ] **Step 4: Run all tests**

```bash
npx vitest run --reporter=verbose
```

Expected: all tests in both `lib/analyze.test.ts` and `components/FullReport.test.tsx` PASS.

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/FullReport.tsx components/FullReport.test.tsx
git commit -m "feat: language-aware labels and topIntro in FullReport"
```

---

## Task 5: Update result page title

**Files:**
- Modify: `app/result/[id]/page.tsx`

No unit test needed — this is a conditional string render in a server component; covered by TypeScript.

- [ ] **Step 1: Update `app/result/[id]/page.tsx`**

In `ResultPage`, after `const result = await fetchReport(id, sessionId)` and the null check, add a derived title:

```tsx
const pageTitle = result.language === 'en' ? 'Your full report' : 'Ton rapport complet'
```

Then replace the hardcoded title:

```tsx
// Before:
<h1 className="text-3xl font-bold text-gray-900">Ton rapport complet</h1>

// After:
<h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run all tests one final time**

```bash
npx vitest run --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add app/result/[id]/page.tsx
git commit -m "feat: language-aware page title on result page"
```

---

## Task 6: Final smoke test

- [ ] **Step 1: Run a full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run all tests**

```bash
npx vitest run --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 3: Run Next.js build**

```bash
npx next build
```

Expected: build succeeds (no type errors, no import errors).
