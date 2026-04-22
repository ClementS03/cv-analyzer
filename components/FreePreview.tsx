'use client'

import { useState } from 'react'
import { CheckItem } from './CheckItem'
import type { Check } from '@/types/analysis'

interface FreePreviewProps {
  id: string
  score: number
  level: string
  previewChecks: Check[]
  totalChecks: number
}

const LEVEL_COLOR: Record<string, string> = {
  'Passable': 'text-red-500',
  'Bon': 'text-yellow-500',
  'Excellent': 'text-green-500',
}

export function FreePreview({ id, score, level, previewChecks, totalChecks }: FreePreviewProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lockedCount = totalChecks - previewChecks.length

  const handlePay = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <div className="text-7xl font-bold text-gray-800">{score}</div>
        <div className="text-gray-400 text-sm">/ 100</div>
        <div className={`text-xl font-semibold ${LEVEL_COLOR[level] ?? 'text-gray-600'}`}>
          {level}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-gray-500 font-medium">
          Aperçu gratuit — {previewChecks.length} checks sur {totalChecks}
        </p>
        {previewChecks.map((check) => (
          <CheckItem key={check.id} check={check} />
        ))}
      </div>

      <div className="relative">
        <div className="space-y-3 pointer-events-none">
          {Array.from({ length: Math.min(lockedCount, 3) }).map((_, i) => (
            <CheckItem
              key={i}
              check={{
                id: `locked-${i}`,
                category: 'content',
                title: 'Check masqué',
                status: 'warning',
                score: 60,
                feedback: 'Débloquez le rapport complet pour voir cette analyse.',
                suggestions: ['Suggestion disponible après paiement'],
              }}
              blurred
            />
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px] rounded-lg">
          <div className="text-center space-y-3 px-4">
            <p className="font-medium text-gray-700">+ {lockedCount} checks masqués</p>
            <button
              onClick={handlePay}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              {isLoading ? 'Redirection…' : 'Voir le rapport complet — 5€'}
            </button>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <p className="text-xs text-gray-400">Paiement sécurisé par Stripe · Sans compte</p>
          </div>
        </div>
      </div>
    </div>
  )
}
