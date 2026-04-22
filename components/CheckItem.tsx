import type { Check } from '@/types/analysis'

const STATUS_CONFIG = {
  pass: { icon: '✅', color: 'text-green-600', bg: 'bg-green-50' },
  warning: { icon: '⚠️', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  fail: { icon: '❌', color: 'text-red-600', bg: 'bg-red-50' },
}

interface CheckItemProps {
  check: Check
  blurred?: boolean
}

export function CheckItem({ check, blurred = false }: CheckItemProps) {
  const config = STATUS_CONFIG[check.status]

  return (
    <div className={`rounded-lg p-4 ${config.bg} ${blurred ? 'select-none' : ''}`}>
      <div className={blurred ? 'blur-sm' : ''}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span>{config.icon}</span>
            <span className="font-medium text-gray-800">{check.title}</span>
          </div>
          <span className={`text-sm font-bold ${config.color}`}>
            {check.score}/100
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-2">{check.feedback}</p>
        {check.suggestions.length > 0 && (
          <ul className="space-y-1">
            {check.suggestions.map((s, i) => (
              <li key={i} className="text-xs text-gray-500 flex gap-1">
                <span>→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
