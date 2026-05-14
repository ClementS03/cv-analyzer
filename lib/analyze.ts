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
3. date-consistency: Consistency of date format throughout the CV. The goal is uniformity — whatever format is used (Month YYYY, MM/YYYY, YYYY, etc.) should be consistent. A single-month role using only "Month YYYY" is perfectly valid and should NOT be flagged. Only flag genuine inconsistencies (mixing formats across different entries).

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
      ? "Here are three targeted improvements that could meaningfully strengthen your CV:"
      : "Voici trois pistes sur lesquelles je t'invite à travailler pour renforcer ton profil :"

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
  return `CV to analyse:\n\n${cvText.slice(0, 8000)}`
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
