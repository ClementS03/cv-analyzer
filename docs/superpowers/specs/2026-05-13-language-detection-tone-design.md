# Language Detection & Tone Improvement — Design Spec

**Date:** 2026-05-13  
**Status:** Approved

## Problem

The CV analyzer currently:
- Always outputs feedback in French, even for English CVs
- Uses a harsh, judgmental tone (e.g. "saturé de clichés")
- Has no introductory line before the 3 priority actions
- Proposed actions can be unrealistic or vague

## Goal

1. Detect the CV language (FR/EN) and respond in that language throughout
2. Adopt a warm, coaching tone — constructive, never moralistic
3. Add a `topIntro` sentence that gently frames the 3 actions
4. Ensure `topActions` are concrete and achievable

## Approach: Prompt-only + `language` field

Claude detects the CV language and outputs ALL text fields (feedback, suggestions, titles, topActions, topIntro) in that language. The result carries a `language: 'fr' | 'en'` field used by the UI to switch static labels (category names, level labels, section titles).

## Data Model Changes (`types/analysis.ts`)

```ts
export type CVLanguage = 'fr' | 'en'

export interface AnalysisResult {
  language: CVLanguage   // NEW — detected CV language
  topIntro: string       // NEW — intro sentence before topActions
  score: number
  level: string          // computed by scoreToLevel(score, language) — NOT from Claude
  checks: Check[]
  topActions: string[]
}
```

## Prompt Changes (`lib/analyze.ts`)

Claude outputs `language`, `topIntro`, and all text fields. The `level` label is NOT output by Claude — it is computed by a language-aware `scoreToLevel(score, language)` in `analyze.ts`.

The system prompt will instruct Claude to:

1. **Detect language**: Read the CV text and determine if it's primarily English or French. Output `language: "en"` or `language: "fr"`.
2. **Respond in detected language**: ALL text fields (title, feedback, suggestions, topActions, topIntro) must be in the detected language.
3. **Tone**: Adopt the voice of a supportive career coach — encouraging, specific, never judgmental. Avoid phrases that imply the candidate is naive or lazy. Frame problems as opportunities.
4. **topIntro**: A single warm sentence introducing the 3 actions. Example (EN): "Here are three targeted improvements that could meaningfully strengthen your CV:" / (FR): "Voici trois améliorations ciblées qui pourraient vraiment renforcer ton CV :"
5. **topActions**: Each action must be specific to THIS CV, achievable in under an hour, framed positively. Format: `"Verb + what to do + concrete example from the CV"`.
6. **Buzzwords check**: Instead of "your CV is full of clichés", use "A few common phrases could be made more specific" — then show which ones and a concrete replacement.

## UI Changes

### `components/FullReport.tsx`

- Add `CATEGORY_LABELS_EN` alongside the existing French labels, switch on `result.language`
- Add `LEVEL_COLOR` keys for English level labels ("Poor", "Good", "Excellent")
- `scoreToLevel(score, language)` returns the right label in the right language
- Add `topIntro` rendered above the `topActions` list
- Section title "3 actions prioritaires" / "3 priority actions" → language-aware

### `app/result/[id]/page.tsx`

- Title "Ton rapport complet" → "Your full report" for English CVs
  (passed as a prop or read from result)

### `types/analysis.ts`

- Add `language`, `topIntro`
- Widen `AnalysisLevel` to include English variants (or use `string`)

## Testing (TDD)

Tests will be written BEFORE implementation for each unit:

1. **`lib/analyze.test.ts`** — unit tests for `scoreToLevel`, language field mapping, topIntro presence, JSON parsing edge cases
2. **`lib/prompts.test.ts`** (optional) — snapshot test of the prompt string to catch regressions
3. **`components/FullReport.test.tsx`** — renders French labels for `language: 'fr'`, English labels for `language: 'en'`, renders `topIntro`, no crash on missing fields

Mock-based tests — no real Claude API calls in unit tests.

## What's NOT in scope

- Languages other than FR and EN
- Full i18n framework (overkill for 2 languages)
- Changing the scoring algorithm
- Email content changes
