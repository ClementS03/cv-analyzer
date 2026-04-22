'use client'

import { useState } from 'react'
import { FreePreview } from '@/components/FreePreview'
import { HeroSection } from '@/components/landing/HeroSection'
import { ATSExplainer } from '@/components/landing/ATSExplainer'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { WhatYouGet } from '@/components/landing/WhatYouGet'
import { Pricing } from '@/components/landing/Pricing'
import { FAQSection } from '@/components/landing/FAQSection'
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

  if (preview) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-16 space-y-6">
          <button
            onClick={() => setPreview(null)}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Analyser un autre CV
          </button>
          <FreePreview {...preview} />
        </div>
      </main>
    )
  }

  return (
    <main>
      <div id="upload">
        <HeroSection onPreview={setPreview} />
      </div>
      <ATSExplainer />
      <HowItWorks />
      <WhatYouGet />
      <Pricing />
      <FAQSection />
      <footer className="py-8 px-4 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-400 space-y-1">
        <p>CV Analyzer · Analyse propulsée par Claude AI</p>
        <p>Données non conservées · Paiement sécurisé Stripe</p>
      </footer>
    </main>
  )
}
