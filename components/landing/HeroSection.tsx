import { UploadZone } from '@/components/UploadZone'
import type { Check } from '@/types/analysis'

interface PreviewData {
  id: string
  score: number
  level: string
  previewChecks: Check[]
  totalChecks: number
}

interface HeroSectionProps {
  onPreview: (data: PreviewData) => void
}

export function HeroSection({ onPreview }: HeroSectionProps) {
  return (
    <section className="bg-gradient-to-b from-blue-50 to-white pt-16 pb-12 px-4">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <div className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
          Propulsé par IA · Résultat en 30 secondes
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
          Ton CV passe-t-il<br />les filtres ATS ?
        </h1>
        <p className="text-gray-500 text-lg max-w-md mx-auto">
          75% des candidatures sont rejetées automatiquement avant qu&apos;un recruteur les lise. Sache où tu en es.
        </p>
        <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
          <span>✓ Aperçu gratuit</span>
          <span>✓ Rapport complet à 5€</span>
          <span>✓ Sans compte</span>
        </div>
        <div className="pt-2">
          <UploadZone onPreview={onPreview} />
        </div>
      </div>
    </section>
  )
}
