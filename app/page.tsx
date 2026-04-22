'use client'

import { useState } from 'react'
import { UploadZone } from '@/components/UploadZone'
import { FreePreview } from '@/components/FreePreview'
import type { Check } from '@/types/analysis'

interface PreviewData {
  id: string
  score: number
  level: string
  previewChecks: Check[]
  totalChecks: number
}

export default function HomePage() {
  const [preview, setPreview] = useState<PreviewData | null>(null)

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-16 space-y-10">

        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
            Propulsé par IA · Résultat en 30 secondes
          </div>
          <h1 className="text-4xl font-bold text-gray-900 leading-tight">
            Ton CV passe-t-il les filtres ATS ?
          </h1>
          <p className="text-gray-500 text-lg">
            12 checks · Score /100 · 3 actions prioritaires
          </p>
          {!preview && (
            <div className="flex items-center justify-center gap-6 text-sm text-gray-400 pt-2">
              <span>✓ Aperçu gratuit</span>
              <span>✓ Rapport complet à 5€</span>
              <span>✓ Sans compte</span>
            </div>
          )}
        </div>

        {/* Upload ou Preview */}
        {!preview ? (
          <UploadZone onPreview={setPreview} />
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setPreview(null)}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Analyser un autre CV
            </button>
            <FreePreview {...preview} />
          </div>
        )}

        {/* Social proof minimaliste */}
        {!preview && (
          <p className="text-center text-xs text-gray-400">
            Analysés avec Claude AI · Données non conservées · Paiement sécurisé Stripe
          </p>
        )}
      </div>
    </main>
  )
}
