// lib/analyze.ts
import Anthropic from '@anthropic-ai/sdk'
import type { AnalysisResult, Check } from '@/types/analysis'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `Tu es un expert en recrutement et optimisation de CV. Tu analyses des CV et fournis un retour structuré en JSON.

Voici les 12 checks que tu dois effectuer :

Checks à effectuer (chaque check doit inclure le champ "category" avec la valeur indiquée) :

category "ats":
1. essential-sections : Présence de Contact, Expérience, Formation, Compétences
2. no-complex-formatting : Absence de tableaux, colonnes multiples, images textuelles
3. date-consistency : Cohérence du format des dates (MM/YYYY, YYYY, etc.)

category "content":
4. quantification : Pourcentage d'achievements avec des chiffres concrets
5. action-verbs : Pourcentage de bullets démarrant par un verbe d'action fort
6. buzzwords : Présence de clichés ("passionné", "team player", "dynamique", "motivé", "rigoureux", "polyvalent")
7. repetition : Mots répétés excessivement (3+ fois sans raison)

category "style":
8. length : Longueur adaptée (1 page junior <3 ans, 2 pages senior, 3+ pages = trop long)
9. contact-info : Email professionnel, présence de LinkedIn ou GitHub
10. tense-consistency : Cohérence des temps verbaux dans les expériences

category "impact":
11. weakest-sections : Identification des 3 sections les plus faibles
12. overall-impact : Évaluation globale

Pour chaque check, attribue :
- status: "pass" (>= 70), "warning" (40-69), "fail" (< 40)
- score: 0-100
- feedback: 1 phrase concrète sur ce que tu observes
- suggestions: 1-3 suggestions actionnables et spécifiques

Le score global est la moyenne pondérée des 12 checks.
Le niveau est : "Passable" (0-49), "Bon" (50-74), "Excellent" (75-100).
topActions : tableau de 3 strings, les 3 actions les plus impactantes à faire en priorité. Chaque action doit être concrète et inclure un exemple tiré du CV analysé. Format : "Verbe + quoi faire + exemple concret entre guillemets". Ex: ["Chiffre tes résultats : remplace 'géré une équipe' par 'managé 5 développeurs, livré 3 projets en temps', "..."]

Réponds UNIQUEMENT avec du JSON valide, sans markdown.`

function buildUserPrompt(cvText: string): string {
  return `Voici le CV à analyser :\n\n${cvText.slice(0, 8000)}`
}

function scoreToLevel(score: number): AnalysisResult['level'] {
  if (score >= 75) return 'Excellent'
  if (score >= 50) return 'Bon'
  return 'Passable'
}

const MOCK_RESULT: AnalysisResult = {
  score: 67,
  level: 'Bon',
  checks: [
    { id: 'essential-sections', title: 'Sections essentielles', status: 'pass', score: 85, feedback: 'Toutes les sections clés sont présentes.', suggestions: ['Ajoute un résumé professionnel en haut du CV.'], category: 'ats' },
    { id: 'no-complex-formatting', title: 'Formatage ATS', status: 'pass', score: 90, feedback: 'Pas de tableaux ni de colonnes complexes détectés.', suggestions: [], category: 'ats' },
    { id: 'date-consistency', title: 'Cohérence des dates', status: 'warning', score: 60, feedback: 'Quelques incohérences dans le format des dates.', suggestions: ['Utilise un format uniforme : MM/YYYY partout.'], category: 'ats' },
    { id: 'quantification', title: 'Chiffres & résultats', status: 'fail', score: 30, feedback: 'Très peu d\'achievements chiffrés.', suggestions: ['Ajoute des % ou €/$ à tes réalisations.', 'Ex: "Augmenté les ventes de 25%"'], category: 'content' },
    { id: 'action-verbs', title: 'Verbes d\'action', status: 'warning', score: 55, feedback: '40% des bullets commencent par un verbe fort.', suggestions: ['Commence chaque bullet par un verbe : Développé, Géré, Optimisé...'], category: 'content' },
    { id: 'buzzwords', title: 'Clichés à éviter', status: 'warning', score: 50, feedback: 'Présence de "dynamique" et "motivé".', suggestions: ['Remplace les clichés par des faits concrets.'], category: 'content' },
    { id: 'repetition', title: 'Répétitions', status: 'pass', score: 75, feedback: 'Peu de répétitions excessives.', suggestions: [], category: 'content' },
    { id: 'length', title: 'Longueur', status: 'pass', score: 80, feedback: 'Longueur adaptée au profil.', suggestions: [], category: 'style' },
    { id: 'contact-info', title: 'Coordonnées', status: 'pass', score: 85, feedback: 'Email et LinkedIn présents.', suggestions: ['Ajoute ton GitHub si tu es dans la tech.'], category: 'style' },
    { id: 'tense-consistency', title: 'Temps verbaux', status: 'pass', score: 70, feedback: 'Temps verbaux globalement cohérents.', suggestions: [], category: 'style' },
    { id: 'weakest-sections', title: 'Sections faibles', status: 'warning', score: 45, feedback: 'Formation et compétences manquent de détails.', suggestions: ['Détaille tes compétences avec le niveau.', 'Ajoute des projets académiques si peu d\'expérience.'], category: 'impact' },
    { id: 'overall-impact', title: 'Impact global', status: 'warning', score: 60, feedback: 'CV correct mais manque de différenciation.', suggestions: ['Ajoute une section Projets ou Réalisations.', 'Personnalise le CV pour chaque offre.'], category: 'impact' },
  ],
  topActions: [
    'Ajoute des chiffres concrets à tes expériences (%, €, volumes)',
    'Remplace les clichés ("dynamique", "motivé") par des faits',
    'Uniformise le format de toutes tes dates en MM/YYYY',
  ],
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
    throw new Error('Réponse inattendue de Claude')
  }

  const raw = content.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(raw) as {
    checks: Check[]
    topActions: (string | { action?: string; rank?: number; impact?: string } )[]
  }

  const topActions = parsed.topActions.map((a) =>
    typeof a === 'string' ? a : (a.action ?? JSON.stringify(a))
  )

  const score = Math.round(
    parsed.checks.reduce((sum, c) => sum + c.score, 0) / parsed.checks.length
  )

  return {
    score,
    level: scoreToLevel(score),
    checks: parsed.checks,
    topActions,
  }
}
