'use client'

import { useState } from 'react'

const FAQS = [
  {
    q: "C'est quoi un ATS exactement ?",
    a: "Un ATS (Applicant Tracking System) est un logiciel utilisé par les recruteurs pour gérer et filtrer les candidatures. Il analyse automatiquement les CV et les classe selon des critères définis avant qu'un humain ne les lise. Si ton CV ne passe pas le filtre ATS, personne ne le verra.",
  },
  {
    q: 'Mon CV est-il en sécurité ?',
    a: "Oui. Ton CV est analysé à la volée et non conservé sur nos serveurs. Le texte extrait est envoyé à l'IA pour analyse, puis supprimé. Les résultats sont stockés temporairement 2h uniquement pour t'afficher ton rapport, puis effacés définitivement.",
  },
  {
    q: 'Ça marche pour quel type de CV ?',
    a: "Tous les secteurs, tous les niveaux d'expérience — étudiant, junior, senior, reconversion. Les critères ATS s'appliquent universellement. Le seul prérequis : ton CV doit être en PDF avec du texte sélectionnable (pas une image scannée).",
  },
  {
    q: 'Puis-je être remboursé ?',
    a: "Si ton rapport complet ne s'affiche pas après paiement (erreur technique de notre côté), contacte-nous et nous te remboursons intégralement sous 48h. Si le rapport s'est bien affiché, le paiement est définitif.",
  },
]

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">FAQ</span>
          <h2 className="text-3xl font-bold text-gray-900">Questions fréquentes</h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-800 text-sm">{faq.q}</span>
                <span className={`text-gray-400 text-lg transition-transform ${open === i ? 'rotate-45' : ''}`}>
                  +
                </span>
              </button>
              {open === i && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
