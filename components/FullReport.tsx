import { CheckItem } from './CheckItem'
import type { AnalysisResult } from '@/types/analysis'

const LEVEL_COLOR: Record<string, string> = {
  'Passable': 'text-red-500',
  'Bon': 'text-yellow-500',
  'Excellent': 'text-green-500',
}

const CATEGORY_LABELS: Record<string, string> = {
  ats: 'Compatibilité ATS',
  content: 'Contenu',
  style: 'Style & Format',
  impact: 'Impact global',
}

export function FullReport({ result }: { result: AnalysisResult }) {
  const CATEGORY_MAP: Record<string, string> = {
    'essential-sections': 'ats', 'no-complex-formatting': 'ats', 'date-consistency': 'ats',
    'quantification': 'content', 'action-verbs': 'content', 'buzzwords': 'content', 'repetition': 'content',
    'length': 'style', 'contact-info': 'style', 'tense-consistency': 'style',
    'weakest-sections': 'impact', 'overall-impact': 'impact',
  }

  const byCategory = result.checks.reduce<Record<string, typeof result.checks>>(
    (acc, check) => {
      const cat = check.category || CATEGORY_MAP[check.id] || 'ats'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(check)
      return acc
    },
    {}
  )

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-1">
        <div className="text-7xl font-bold text-gray-800">{result.score}</div>
        <div className="text-gray-400 text-sm">/ 100</div>
        <div className={`text-xl font-semibold ${LEVEL_COLOR[result.level]}`}>
          {result.level}
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl p-5">
        <h2 className="font-semibold text-blue-800 mb-3">🎯 3 actions prioritaires</h2>
        <ol className="space-y-2">
          {result.topActions.map((action, i) => (
            <li key={i} className="flex gap-3 text-sm text-blue-700">
              <span className="font-bold">{i + 1}.</span>
              <span>{action}</span>
            </li>
          ))}
        </ol>
      </div>

      {Object.keys(CATEGORY_LABELS).map((cat) => {
        const checks = byCategory[cat]
        if (!checks?.length) return null
        return (
          <div key={cat} className="space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
              {CATEGORY_LABELS[cat]}
            </h2>
            {checks.map((check) => (
              <CheckItem key={check.id} check={check} />
            ))}
          </div>
        )
      })}
    </div>
  )
}
