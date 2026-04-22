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
