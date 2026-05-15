import Anthropic from '@anthropic-ai/sdk'
import type { AnalysisResult, Check, CVLanguage } from '@/types/analysis'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are an expert recruiter and CV coach. You analyse CVs and provide structured feedback in JSON format.

LANGUAGE DETECTION: Read the CV text carefully. If it is primarily written in English, set "language" to "en". If it is primarily in French, set "language" to "fr".

IMPORTANT: ALL text fields you produce (title, feedback, suggestions, topIntro, topActions) must be in the detected language. If the CV is in English, respond in English. If French, respond in French.

TONE: Adopt the voice of a supportive career coach — encouraging, specific, and constructive. Never judgmental, preachy, or condescending. Frame issues as opportunities. Avoid implying the candidate is naive or careless. A CV is a personal document someone spent time on — treat it with respect.

Perform the following 12 checks. Each check object in the JSON MUST include both "id" (the exact string shown below) and "category" fields.

category "ats":
1. id "essential-sections": Presence of Contact, Experience, Education, Skills
2. id "no-complex-formatting": Absence of tables, multi-column layouts, text images
3. id "date-consistency": Check that date formats are consistent throughout the CV. Rules:
   - The goal is uniformity within the format already used — do NOT suggest switching to a different format unless the CV mixes multiple formats.
   - For English CVs, "Month YYYY" or "Month YYYY – Month YYYY" is the correct standard. NEVER suggest MM/YYYY for English CVs — that is a French/European convention.
   - For French CVs, MM/YYYY is acceptable.
   - A single date like "December 2024" with no end date is VALID for a current role or a short single-month position. Do NOT flag this as inconsistent with date ranges.
   - Only flag ACTUAL overlapping date ranges (where two entries for the same person genuinely overlap in time). A sequential gap between entries (e.g., one ending December 2019, next starting September 2020) is completely normal — do NOT call this an overlap.

category "content":
4. id "quantification": Percentage of achievements with concrete numbers
5. id "action-verbs": Percentage of bullets starting with a strong action verb
6. id "buzzwords": Presence of vague filler phrases ("passionate", "team player", "dynamic", "motivated", "rigorous", "versatile", "passionné", "dynamique", "motivé")
7. id "repetition": Words repeated excessively (3+ times without reason)

category "style":
8. id "length": Appropriate length (1 page junior <3 yrs, 2 pages senior, 3+ pages = too long)
9. id "contact-info": Professional email, LinkedIn or GitHub present
10. id "tense-consistency": Consistent verb tenses in experience sections

category "impact":
11. id "weakest-sections": Identify the 3 weakest sections
12. id "overall-impact": Overall evaluation

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

const CRITIQUE_PROMPT = `You are a quality reviewer for CV analysis feedback. You receive a CV text and an analysis. Your job: identify and correct specific problems only. Write all corrected text in the same language as the original CV (match the detected language from the analysis).

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

Include "topActions" (all 3 strings) only if any action has a problem. Include "topIntro" only if the intro has a problem. Omit optional fields entirely if they are correct.

{
  "corrections": [
    {
      "checkId": "exact-id-from-analysis",
      "feedback": "rewritten feedback (only if feedback has a problem)",
      "suggestions": ["rewritten suggestion"]
    }
  ],
  "topActions": ["action 1", "action 2", "action 3"],
  "topIntro": "rewritten intro"
}

Omit any field that does not need correction. Return ONLY valid JSON, no markdown.`

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
  const parsed = JSON.parse(raw) as Record<string, unknown>

  if (!Array.isArray(parsed.checks) || (parsed.checks as unknown[]).length === 0) {
    throw new Error('Invalid response: checks must be a non-empty array')
  }
  if (!Array.isArray(parsed.topActions)) {
    throw new Error('Invalid response: topActions must be an array')
  }

  const language: CVLanguage = parsed.language === 'en' ? 'en' : 'fr'
  const checks = parsed.checks as Check[]
  for (const check of checks) {
    if (typeof check !== 'object' || check === null) {
      throw new Error('Invalid response: each check must be an object')
    }
    if (typeof (check as unknown as Record<string, unknown>).score !== 'number') {
      throw new Error('Invalid response: each check must have a numeric score')
    }
  }
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
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return { corrections: [] }
  }

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

  if (Array.isArray(parsed.topActions)) {
    const filtered = (parsed.topActions as unknown[]).filter((a): a is string => typeof a === 'string')
    if (filtered.length === 3) result.topActions = filtered
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

async function critiqueAnalysis(cvText: string, result: AnalysisResult): Promise<CritiqueCorrections> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    temperature: 0,
    system: CRITIQUE_PROMPT,
    messages: [
      {
        role: 'user',
        content: `<cv_content>\n${cvText.slice(0, 8000)}\n</cv_content>\n\n<analysis>\n${JSON.stringify(result)}\n</analysis>\n\nReview the analysis for the three issue types. Return corrections only.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response from Claude critique')
  }

  return parseCritiqueResponse(content.text)
}

const MOCK_RESULT: AnalysisResult = {
  language: 'fr',
  score: 67,
  level: 'Bon',
  topIntro: "Voici trois pistes concrètes pour renforcer ton profil :",
  checks: [
    { id: 'essential-sections', title: 'Sections essentielles', status: 'pass', score: 85, feedback: 'Toutes les sections clés sont présentes.', suggestions: ['Ajoute un résumé professionnel en haut du CV.'], category: 'ats' },
    { id: 'no-complex-formatting', title: 'Formatage ATS', status: 'pass', score: 90, feedback: 'Pas de tableaux ni de colonnes complexes détectés.', suggestions: [], category: 'ats' },
    { id: 'date-consistency', title: 'Cohérence des dates', status: 'warning', score: 60, feedback: "Quelques variations dans le format des dates.", suggestions: ['Utilise un format uniforme : MM/YYYY partout.'], category: 'ats' },
    { id: 'quantification', title: 'Chiffres & résultats', status: 'fail', score: 30, feedback: "Peu de réalisations sont chiffrées — c'est une belle opportunité de te démarquer.", suggestions: ['Ajoute des %, €/$ ou volumes à tes réalisations.', 'Par ex. : "Augmenté les ventes de 25%"'], category: 'content' },
    { id: 'action-verbs', title: "Verbes d'action", status: 'warning', score: 55, feedback: "40% des bullets commencent par un verbe fort.", suggestions: ['Commence chaque bullet par un verbe : Développé, Géré, Optimisé...'], category: 'content' },
    { id: 'buzzwords', title: 'Formulations vagues', status: 'warning', score: 50, feedback: 'Les expressions "dynamique" et "motivé" pourraient être rendues plus concrètes.', suggestions: ['Remplace "dynamique" par un exemple : "Lancé 3 initiatives en autonomie en 6 mois"'], category: 'content' },
    { id: 'repetition', title: 'Répétitions', status: 'pass', score: 75, feedback: 'Peu de répétitions excessives.', suggestions: [], category: 'content' },
    { id: 'length', title: 'Longueur', status: 'pass', score: 80, feedback: 'Longueur adaptée au profil.', suggestions: [], category: 'style' },
    { id: 'contact-info', title: 'Coordonnées', status: 'pass', score: 85, feedback: 'Email et LinkedIn présents.', suggestions: ['Ajoute ton GitHub si tu es dans la tech.'], category: 'style' },
    { id: 'tense-consistency', title: 'Temps verbaux', status: 'pass', score: 70, feedback: 'Temps verbaux globalement cohérents.', suggestions: [], category: 'style' },
    { id: 'weakest-sections', title: 'Sections à renforcer', status: 'warning', score: 45, feedback: "La formation et les compétences gagneraient à être plus détaillées.", suggestions: ['Détaille tes compétences avec le niveau.', "Ajoute des projets si tu as peu d'expérience."], category: 'impact' },
    { id: 'overall-impact', title: 'Impact global', status: 'warning', score: 60, feedback: 'CV solide mais qui peut encore se différencier davantage.', suggestions: ['Ajoute une section Projets ou Réalisations.', 'Personnalise le CV pour chaque offre.'], category: 'impact' },
  ],
  topActions: [
    'Chiffre tes réalisations : remplace "géré une équipe" par "managé 5 développeurs, livré 3 projets dans les délais"',
    'Remplace "dynamique" par un fait concret : "Lancé 3 initiatives en autonomie en 6 mois"',
    'Uniformise toutes tes dates au format MM/YYYY',
  ],
}

function buildUserPrompt(cvText: string): string {
  const safe = cvText.slice(0, 8000).replace(/<\/cv_content>/gi, '')
  return `<cv_content>\n${safe}\n</cv_content>\n\nAnalyse the CV above.`
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

  const result = parseAnalysisResponse(content.text)

  try {
    const corrections = await critiqueAnalysis(cvText, result)
    return mergeCorrections(result, corrections)
  } catch (err) {
    console.error('[critique] failed, returning original result:', err)
    return result
  }
}
