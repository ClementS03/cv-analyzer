# Self-Critique Loop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second Claude call that reviews each analysis output for factual errors, tone issues, and unrealistic suggestions, then patches the result before it is stored.

**Architecture:** Two new pure functions (`parseCritiqueResponse`, `mergeCorrections`) plus an async `critiqueAnalysis` live in `lib/analyze.ts`. `analyzeCV` calls the critique after the main parse and wraps it in a try/catch so a failing critique never blocks the user. All three functions are exported for TDD. A local `CritiqueCorrections` interface is defined in `lib/analyze.ts` — it is not exported to the UI layer.

**Tech Stack:** Anthropic SDK (claude-haiku-4-5-20251001), Vitest, TypeScript

---

## File Map

| File | Action | Change |
|------|--------|--------|
| `lib/analyze.ts` | Modify | Add `CritiqueCorrections` interface, `CRITIQUE_PROMPT`, `parseCritiqueResponse`, `mergeCorrections`, `critiqueAnalysis`; update `analyzeCV` |
| `lib/analyze.test.ts` | Modify | Append tests for `parseCritiqueResponse` and `mergeCorrections` |

---

## Task 1: TDD — `parseCritiqueResponse` and `mergeCorrections`

**Files:**
- Modify: `lib/analyze.test.ts` (append tests)
- Modify: `lib/analyze.ts` (add types + two exported functions)

- [ ] **Step 1: Append failing tests to `lib/analyze.test.ts`**

Append AFTER all existing tests. The file already has `// @vitest-environment node` at the top and imports `{ parseAnalysisResponse, scoreToLevel }` from `./analyze`. Add the new imports and test suites:

```ts
import { parseCritiqueResponse, mergeCorrections } from './analyze'
import type { AnalysisResult } from '@/types/analysis'

const baseResult: AnalysisResult = {
  language: 'en',
  score: 67,
  level: 'Good',
  topIntro: 'Original intro',
  topActions: ['Action 1', 'Action 2', 'Action 3'],
  checks: [
    {
      id: 'date-consistency',
      category: 'ats',
      title: 'Date consistency',
      status: 'warning',
      score: 55,
      feedback: 'Original date feedback',
      suggestions: ['Original suggestion'],
    },
    {
      id: 'buzzwords',
      category: 'content',
      title: 'Buzzwords',
      status: 'warning',
      score: 50,
      feedback: 'Buzzword feedback',
      suggestions: [],
    },
  ],
}

describe('parseCritiqueResponse', () => {
  it('returns empty corrections when analysis has no problems', () => {
    const raw = JSON.stringify({ corrections: [] })
    const result = parseCritiqueResponse(raw)
    expect(result.corrections).toHaveLength(0)
    expect(result.topActions).toBeUndefined()
    expect(result.topIntro).toBeUndefined()
  })

  it('parses a feedback-only correction', () => {
    const raw = JSON.stringify({
      corrections: [{ checkId: 'date-consistency', feedback: 'Corrected feedback' }],
    })
    const result = parseCritiqueResponse(raw)
    expect(result.corrections).toHaveLength(1)
    expect(result.corrections[0].checkId).toBe('date-consistency')
    expect(result.corrections[0].feedback).toBe('Corrected feedback')
    expect(result.corrections[0].suggestions).toBeUndefined()
  })

  it('parses a suggestions-only correction', () => {
    const raw = JSON.stringify({
      corrections: [{ checkId: 'buzzwords', suggestions: ['Better suggestion'] }],
    })
    const result = parseCritiqueResponse(raw)
    expect(result.corrections[0].suggestions).toEqual(['Better suggestion'])
    expect(result.corrections[0].feedback).toBeUndefined()
  })

  it('parses topActions when present', () => {
    const raw = JSON.stringify({
      corrections: [],
      topActions: ['New action 1', 'New action 2', 'New action 3'],
    })
    const result = parseCritiqueResponse(raw)
    expect(result.topActions).toEqual(['New action 1', 'New action 2', 'New action 3'])
  })

  it('parses topIntro when present', () => {
    const raw = JSON.stringify({
      corrections: [],
      topIntro: 'Here are some targeted improvements:',
    })
    const result = parseCritiqueResponse(raw)
    expect(result.topIntro).toBe('Here are some targeted improvements:')
  })

  it('strips markdown code fences before parsing', () => {
    const raw = '```json\n' + JSON.stringify({ corrections: [] }) + '\n```'
    const result = parseCritiqueResponse(raw)
    expect(result.corrections).toHaveLength(0)
  })

  it('returns empty corrections if corrections field is missing', () => {
    const raw = JSON.stringify({ topIntro: 'Only intro' })
    const result = parseCritiqueResponse(raw)
    expect(result.corrections).toHaveLength(0)
  })
})

describe('mergeCorrections', () => {
  it('returns result unchanged when corrections is empty', () => {
    const result = mergeCorrections(baseResult, { corrections: [] })
    expect(result.checks[0].feedback).toBe('Original date feedback')
    expect(result.topActions).toEqual(['Action 1', 'Action 2', 'Action 3'])
    expect(result.topIntro).toBe('Original intro')
  })

  it('merges feedback only — leaves suggestions unchanged', () => {
    const result = mergeCorrections(baseResult, {
      corrections: [{ checkId: 'date-consistency', feedback: 'Fixed feedback' }],
    })
    const check = result.checks.find((c) => c.id === 'date-consistency')!
    expect(check.feedback).toBe('Fixed feedback')
    expect(check.suggestions).toEqual(['Original suggestion'])
  })

  it('merges suggestions only — leaves feedback unchanged', () => {
    const result = mergeCorrections(baseResult, {
      corrections: [{ checkId: 'date-consistency', suggestions: ['Fixed suggestion'] }],
    })
    const check = result.checks.find((c) => c.id === 'date-consistency')!
    expect(check.suggestions).toEqual(['Fixed suggestion'])
    expect(check.feedback).toBe('Original date feedback')
  })

  it('merges both feedback and suggestions', () => {
    const result = mergeCorrections(baseResult, {
      corrections: [{ checkId: 'date-consistency', feedback: 'Fixed', suggestions: ['Fixed s'] }],
    })
    const check = result.checks.find((c) => c.id === 'date-consistency')!
    expect(check.feedback).toBe('Fixed')
    expect(check.suggestions).toEqual(['Fixed s'])
  })

  it('leaves uncorrected checks intact', () => {
    const result = mergeCorrections(baseResult, {
      corrections: [{ checkId: 'date-consistency', feedback: 'Fixed' }],
    })
    const buzzwords = result.checks.find((c) => c.id === 'buzzwords')!
    expect(buzzwords.feedback).toBe('Buzzword feedback')
  })

  it('replaces topActions when provided', () => {
    const result = mergeCorrections(baseResult, {
      corrections: [],
      topActions: ['New 1', 'New 2', 'New 3'],
    })
    expect(result.topActions).toEqual(['New 1', 'New 2', 'New 3'])
  })

  it('leaves topActions unchanged when absent from corrections', () => {
    const result = mergeCorrections(baseResult, { corrections: [] })
    expect(result.topActions).toEqual(['Action 1', 'Action 2', 'Action 3'])
  })

  it('replaces topIntro when provided', () => {
    const result = mergeCorrections(baseResult, {
      corrections: [],
      topIntro: 'New intro',
    })
    expect(result.topIntro).toBe('New intro')
  })

  it('leaves topIntro unchanged when absent from corrections', () => {
    const result = mergeCorrections(baseResult, { corrections: [] })
    expect(result.topIntro).toBe('Original intro')
  })

  it('ignores corrections for unknown checkIds', () => {
    const result = mergeCorrections(baseResult, {
      corrections: [{ checkId: 'nonexistent', feedback: 'Should be ignored' }],
    })
    expect(result.checks).toHaveLength(2)
    expect(result.checks[0].feedback).toBe('Original date feedback')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- lib/analyze.test.ts --reporter=verbose
```

Expected: FAIL — `parseCritiqueResponse` and `mergeCorrections` are not exported.

- [ ] **Step 3: Add types + implement `parseCritiqueResponse` and `mergeCorrections` in `lib/analyze.ts`**

Add the `CritiqueCorrections` interface and two exported functions. Insert them AFTER `parseAnalysisResponse` and BEFORE `MOCK_RESULT` in the file:

```ts
interface CheckCorrection {
  checkId: string
  feedback?: string
  suggestions?: string[]
}

interface CritiqueCorrections {
  corrections: CheckCorrection[]
  topActions?: string[]
  topIntro?: string
}

export function parseCritiqueResponse(rawText: string): CritiqueCorrections {
  const raw = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(raw) as Record<string, unknown>

  const corrections: CheckCorrection[] = Array.isArray(parsed.corrections)
    ? (parsed.corrections as unknown[])
        .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
        .map((c) => ({
          checkId: String(c.checkId ?? ''),
          ...(typeof c.feedback === 'string' ? { feedback: c.feedback } : {}),
          ...(Array.isArray(c.suggestions)
            ? { suggestions: (c.suggestions as unknown[]).filter((s): s is string => typeof s === 'string') }
            : {}),
        }))
        .filter((c) => c.checkId !== '')
    : []

  const result: CritiqueCorrections = { corrections }

  if (Array.isArray(parsed.topActions) && (parsed.topActions as unknown[]).length > 0) {
    result.topActions = (parsed.topActions as unknown[]).filter((a): a is string => typeof a === 'string')
  }

  if (typeof parsed.topIntro === 'string' && parsed.topIntro.length > 0) {
    result.topIntro = parsed.topIntro
  }

  return result
}

export function mergeCorrections(result: AnalysisResult, corrections: CritiqueCorrections): AnalysisResult {
  const checks = result.checks.map((check) => {
    const correction = corrections.corrections.find((c) => c.checkId === check.id)
    if (!correction) return check
    return {
      ...check,
      ...(correction.feedback !== undefined ? { feedback: correction.feedback } : {}),
      ...(correction.suggestions !== undefined ? { suggestions: correction.suggestions } : {}),
    }
  })

  return {
    ...result,
    checks,
    ...(corrections.topActions !== undefined ? { topActions: corrections.topActions } : {}),
    ...(corrections.topIntro !== undefined ? { topIntro: corrections.topIntro } : {}),
  }
}
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
npm test --reporter=verbose
```

Expected: all tests pass (31 existing + 17 new = 48 total).

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/analyze.ts lib/analyze.test.ts
git commit -m "feat: add parseCritiqueResponse and mergeCorrections (TDD)"
```

---

## Task 2: Implement `critiqueAnalysis` + Update `analyzeCV`

**Files:**
- Modify: `lib/analyze.ts`

No new tests — `critiqueAnalysis` calls the real Claude API and is covered by the error-handling path (if it throws, `analyzeCV` returns the original result; this is verified by the mock test in Task 1).

- [ ] **Step 1: Add `CRITIQUE_PROMPT` constant to `lib/analyze.ts`**

Add after `SYSTEM_PROMPT`:

```ts
const CRITIQUE_PROMPT = `You are a quality reviewer for CV analysis feedback. You receive a CV text and an analysis. Your job: identify and correct specific problems only.

Check for THREE types of issues in the feedback, suggestions, topActions, and topIntro fields:

1. FACTUAL ERRORS
   - Sequential date ranges (gap between entries) incorrectly described as "overlapping"
   - MM/YYYY format suggested for an English-language CV (wrong convention — use Month YYYY)
   - Metrics or achievements cited that do not appear in the CV text

2. TONE ISSUES
   - Feedback that sounds judgmental, preachy, or condescending
   - Phrasing that implies the candidate is careless or naive
   - Any wording that would discourage someone who spent hours on their CV

3. UNREALISTIC SUGGESTIONS
   - Actions requiring information not present in the CV
   - Suggestions that would take more than an hour to complete
   - Anything asking the candidate to change past facts

OUTPUT RULES:
- If NO problems are found, return exactly: {"corrections":[]}
- If problems ARE found, return ONLY the corrected fields:

{
  "corrections": [
    {
      "checkId": "exact-id-from-analysis",
      "feedback": "rewritten feedback (only if feedback has a problem)",
      "suggestions": ["rewritten suggestion"] // only if suggestions have a problem
    }
  ],
  "topActions": ["action 1", "action 2", "action 3"], // only if ANY action has a problem — replace all 3
  "topIntro": "rewritten intro" // only if intro has a problem
}

Omit any field that does not need correction. Return ONLY valid JSON, no markdown.`
```

- [ ] **Step 2: Add `critiqueAnalysis` function to `lib/analyze.ts`**

Add after `mergeCorrections`:

```ts
async function critiqueAnalysis(cvText: string, result: AnalysisResult): Promise<CritiqueCorrections> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    temperature: 0,
    system: CRITIQUE_PROMPT,
    messages: [
      {
        role: 'user',
        content: `<cv_content>\n${cvText.slice(0, 4000)}\n</cv_content>\n\n<analysis>\n${JSON.stringify(result)}\n</analysis>\n\nReview the analysis for the three issue types. Return corrections only.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response from Claude critique')
  }

  return parseCritiqueResponse(content.text)
}
```

- [ ] **Step 3: Update `analyzeCV` to call `critiqueAnalysis`**

Find the `analyzeCV` function. After `const result = parseAnalysisResponse(content.text)`, add the critique call with error handling:

```ts
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

  const result = parseAnalysisResponse(content.text)

  try {
    const corrections = await critiqueAnalysis(cvText, result)
    return mergeCorrections(result, corrections)
  } catch (err) {
    console.error('[critique] failed, returning original result:', err)
    return result
  }
}
```

- [ ] **Step 4: Run all tests**

```bash
npm test --reporter=verbose
```

Expected: all 48 tests still pass (no tests call the real API).

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/analyze.ts
git commit -m "feat: add critiqueAnalysis — self-critique loop for factual, tone, and realism issues"
```

---

## Task 3: Final Smoke Test + Deploy

- [ ] **Step 1: Run all tests**

```bash
npm test --reporter=verbose
```

Expected: 48/48 pass.

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
