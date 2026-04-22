# Landing Page CV Analyzer — Design Spec

## Objectif

Remplacer la page d'accueil minimaliste actuelle par une LP complète qui explique la valeur du produit, éduque sur les ATS, et convertit les visiteurs en utilisateurs.

## Style visuel

- **Palette** : blanc fond, gris texte secondaire, bleu `#2563eb` pour les CTA et accents
- **Typographie** : system-ui, hiérarchie claire h1 > h2 > p
- **Ton** : direct, factuel, pas de jargon — s'adresse à tout chercheur d'emploi
- **Pas de dark mode** pour cette version

## Cible

Tout chercheur d'emploi (étudiants, juniors, seniors, reconversion) — le message est universel.

## Architecture des sections

### ① Hero
- Badge : "Propulsé par IA · Résultat en 30 secondes"
- H1 : "Ton CV passe-t-il les filtres ATS ?"
- Sous-titre : "75% des candidatures sont rejetées automatiquement avant qu'un recruteur les lise. Sache où tu en es."
- 3 garanties inline : ✓ Aperçu gratuit · ✓ Rapport complet 5€ · ✓ Sans compte
- Zone upload directement dans le hero (composant `UploadZone` existant)

### ② Le problème ATS
- Titre : "Qu'est-ce qu'un ATS ?"
- Explication en 2-3 phrases simples : logiciel RH qui filtre les CV avant les humains
- Chiffre choc en grand : "75% des CV éliminés automatiquement"
- 3 raisons d'échec les plus courantes : formatage complexe, mots-clés manquants, sections absentes

### ③ Comment ça marche
- 3 étapes horizontales avec icônes :
  1. Upload ton CV (PDF)
  2. L'IA analyse 12 critères en 30s
  3. Reçois ton score + actions prioritaires
- Mention : aperçu gratuit, rapport complet après paiement

### ④ Ce que tu obtiens
- 4 catégories avec icônes et description courte :
  - 🤖 Compatibilité ATS (3 checks)
  - ✍️ Contenu & Impact (4 checks)
  - 🎨 Style & Format (3 checks)
  - 🎯 Impact global (2 checks)
- Comparaison Aperçu gratuit vs Rapport complet 5€ (tableau simple)

### ⑤ Tarif
- 2 colonnes : Aperçu (gratuit) / Rapport complet (5€)
- Aperçu : score /100, niveau, 2 checks visibles
- Rapport complet : 12 checks détaillés, 3 actions prioritaires, envoi par email
- CTA principal : "Analyser mon CV — c'est gratuit"

### ⑥ FAQ
4 questions en accordion :
1. "C'est quoi un ATS exactement ?" — explication simple
2. "Mon CV est-il en sécurité ?" — non conservé, analysé à la volée
3. "Ça marche pour quel type de CV ?" — tous secteurs, tous niveaux
4. "Puis-je être remboursé ?" — oui si le rapport ne s'affiche pas

## Architecture technique

- La page actuelle `app/page.tsx` est refactorisée en gardant la logique existante (état `preview`, `UploadZone`, `FreePreview`)
- Chaque section devient un composant dédié dans `components/landing/` :
  - `HeroSection.tsx` — intègre `UploadZone`
  - `ATSExplainer.tsx`
  - `HowItWorks.tsx`
  - `WhatYouGet.tsx`
  - `Pricing.tsx`
  - `FAQSection.tsx`
- `app/page.tsx` orchestre : affiche les sections LP si pas de preview, affiche `FreePreview` si preview

## Ce qui ne change pas

- `UploadZone`, `FreePreview`, `FullReport`, `CheckItem` — inchangés
- Toute la logique API — inchangée
- Le flow upload → aperçu → paiement → rapport — inchangé
