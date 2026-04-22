# CV Analyzer — Design Spec

## Produit

Outil d'analyse de CV one-shot, sans compte, sans email. L'utilisateur upload son CV, reçoit un aperçu gratuit (score + 2 checks), puis paie €5 une fois pour débloquer le rapport complet (12 checks).

## UX Flow

```
1. Landing page → drag & drop PDF
2. Analyse Claude Haiku (serveur) → stockage Vercel KV (TTL 2h)
3. Aperçu gratuit affiché : score /100 + 2 premiers checks
4. Bouton "Voir le rapport complet — €5" → Stripe Checkout
5. Succès Stripe → redirect /result/[analysisId]?session_id=xxx
6. Vérification paiement côté serveur → rapport complet affiché
```

## Stack

- **Framework** : Next.js 15 (App Router)
- **Language** : TypeScript
- **Style** : Tailwind CSS
- **PDF parsing** : pdf-parse
- **IA** : @anthropic-ai/sdk — Claude Haiku 4.5
- **Paiement** : Stripe Checkout (one-time €5)
- **Stockage temporaire** : Vercel KV (Redis, TTL 2h)
- **Hébergement** : Vercel

## 12 Checks

**ATS (3)**
1. `essential-sections` — Contact, Expérience, Formation, Compétences présents
2. `no-complex-formatting` — Pas de tableaux, colonnes multiples
3. `date-consistency` — Format de dates cohérent

**Contenu (4)**
4. `quantification` — % d'achievements avec des chiffres
5. `action-verbs` — % de bullets démarrant par un verbe fort
6. `buzzwords` — Clichés détectés ("passionné", "team player"…)
7. `repetition` — Mots répétés excessivement

**Style (3)**
8. `length` — Longueur adaptée au niveau d'expérience
9. `contact-info` — Email pro, liens LinkedIn/GitHub
10. `tense-consistency` — Cohérence des temps verbaux

**Impact (2)**
11. `weakest-sections` — Top 3 sections à améliorer en priorité
12. `overall-impact` — Score global + niveau (Passable / Bon / Excellent)

## Architecture

```
app/
  layout.tsx
  page.tsx                      # Upload + aperçu gratuit
  result/[id]/page.tsx          # Rapport complet post-paiement
  api/
    analyze/route.ts            # POST: parse PDF + analyse Claude + KV store
    checkout/route.ts           # POST: Stripe Checkout Session
    report/[id]/route.ts        # GET: vérifie paiement + retourne rapport complet

components/
  UploadZone.tsx
  FreePreview.tsx
  FullReport.tsx
  CheckItem.tsx

lib/
  parse-pdf.ts                  # Extraction texte PDF
  analyze.ts                    # Prompt Claude + parsing résultat
  stripe.ts                     # Client Stripe
  kv.ts                         # Helpers Vercel KV

types/
  analysis.ts                   # Types TypeScript
```

## Types principaux

```typescript
interface Check {
  id: string
  category: 'ats' | 'content' | 'style' | 'impact'
  title: string
  status: 'pass' | 'warning' | 'fail'
  score: number
  feedback: string
  suggestions: string[]
}

interface AnalysisResult {
  score: number
  level: 'Passable' | 'Bon' | 'Excellent'
  checks: Check[]
  topActions: string[]
}
```

## Monétisation

- Prix : €5 one-time (Stripe Checkout)
- Pas de compte, pas d'email requis
- Aperçu gratuit : score /100 + checks[0] et checks[1] visibles, reste flouté
- Après paiement : rapport complet débloqué, affiché instantanément

## Contraintes

- Taille max PDF : 5MB
- TTL analyse en KV : 2 heures
- Pas de base de données persistante
- Pas d'authentification
