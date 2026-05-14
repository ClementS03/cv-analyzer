# Self-Critique Loop — Design Spec

**Date:** 2026-05-14  
**Status:** Approved

## Problem

Claude's first-pass analysis occasionally produces:
- **Factual errors**: hallucinated date overlaps, wrong format suggestions (e.g. MM/YYYY on an English CV)
- **Tone issues**: feedback that is too harsh, judgmental, or condescending
- **Unrealistic suggestions**: actions that presuppose information not in the CV, or that take hours not minutes

## Solution

A second Claude call (`critiqueAnalysis`) runs immediately after the main analysis. It reads the original CV text + the full analysis output and returns only the corrections needed. Corrections are merged into the result before it is stored in KV.

## Data Flow

```
cvText
  → [Call 1: Haiku] analyzeCV prompt  → parseAnalysisResponse() → result
  → [Call 2: Haiku] critique prompt   → parseCritiqueResponse() → corrections
  → mergeCorrections(result, corrections)
  → storeAnalysis()
```

## Critique Scope (all three)

For each check's `feedback` and `suggestions`, and for `topActions` / `topIntro`, the critique must flag and fix:

1. **Factual errors**
   - Hallucinated overlaps (sequential date ranges called "overlapping")
   - Wrong format suggestions (MM/YYYY recommended on an English CV)
   - Invented metrics or claims not supported by the CV text

2. **Tone issues**
   - Feedback that sounds judgmental, preachy, or condescending
   - Phrases that imply the candidate is careless or naive
   - Any wording that would sting someone who spent hours on their CV

3. **Unrealistic suggestions**
   - Actions that require information not present in the CV
   - Suggestions that take hours or require external resources (e.g. "completely restructure your work history")
   - Anything that assumes the candidate can change past facts

## Critique Output (compact JSON)

Only includes fields that actually need fixing. Unchanged checks are omitted entirely.

```json
{
  "corrections": [
    {
      "checkId": "date-consistency",
      "feedback": "corrected feedback string",
      "suggestions": ["corrected suggestion 1", "corrected suggestion 2"]
    }
  ],
  "topActions": ["corrected action 1", "action 2", "action 3"],
  "topIntro": "corrected intro string"
}
```

- `corrections`: array of 0..N check corrections. If a check needs only its `feedback` fixed, only include `feedback`. Same for `suggestions`.
- `topActions`: only present if at least one of the 3 actions needs fixing (replace all 3)
- `topIntro`: only present if the intro needs fixing

## Merge Logic

`mergeCorrections(result, corrections)`:
- For each entry in `corrections.corrections`: find the matching check by `checkId` and overwrite only the provided fields
- If `topActions` is present in corrections: replace `result.topActions` entirely
- If `topIntro` is present: replace `result.topIntro`
- All other fields (score, level, language, uncorrected checks) remain unchanged

## New Code Units

| File | Change |
|------|--------|
| `lib/analyze.ts` | Add `CRITIQUE_PROMPT`, `critiqueAnalysis(cvText, result)`, `parseCritiqueResponse(raw)`, `mergeCorrections(result, corrections)` |
| `lib/analyze.test.ts` | Tests for `parseCritiqueResponse` and `mergeCorrections` |

`analyzeCV` is updated to call `critiqueAnalysis` after the main parse, before returning.

## Model & Cost

- Both calls use `claude-haiku-4-5-20251001`
- Critique input: ~2000 tokens (CV text truncated to 4000 chars + result JSON)
- Critique output: ~300 tokens
- Added cost: ~$0.001 per analysis
- Added latency: ~300–500ms

## Error Handling

If `critiqueAnalysis` throws (network error, malformed JSON, etc.), `analyzeCV` logs the error and returns the original uncorrected result. The critique is best-effort — a failed critique must never block the user from getting their report.

## Testing

- `parseCritiqueResponse`: parses valid JSON, strips code fences, returns empty corrections if JSON is empty
- `mergeCorrections`: merges feedback only, merges suggestions only, merges both, leaves uncorrected checks intact, replaces topActions when present, leaves topActions unchanged when absent
- No real API calls in tests — mock the critique response

## What's NOT in scope

- Storing critique corrections separately for analytics
- Showing the user which checks were corrected
- Using a smarter model (Sonnet) for the critique
- Retrying the critique if it returns empty corrections
