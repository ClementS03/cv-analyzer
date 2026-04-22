import { notFound } from 'next/navigation'
import { FullReport } from '@/components/FullReport'
import type { AnalysisResult } from '@/types/analysis'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session_id?: string }>
}

async function fetchReport(id: string, sessionId: string): Promise<AnalysisResult | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!
  const res = await fetch(
    `${baseUrl}/api/report/${id}?session_id=${sessionId}`,
    { cache: 'no-store' }
  )
  if (!res.ok) return null
  return res.json()
}

export default async function ResultPage({ params, searchParams }: Props) {
  const { id } = await params
  const { session_id: sessionId } = await searchParams

  if (!sessionId) notFound()

  const result = await fetchReport(id, sessionId)

  if (!result) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3 px-4">
          <p className="text-xl font-medium text-gray-700">Rapport introuvable ou expiré</p>
          <p className="text-gray-400 text-sm">Les rapports sont disponibles pendant 2h après l&apos;analyse.</p>
          <a href="/" className="text-blue-600 text-sm hover:underline block">
            ← Analyser un nouveau CV
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-16 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Ton rapport complet</h1>
          <p className="text-sm text-gray-400">Rapport envoyé par email · Valable 2h</p>
          <a href="/" className="text-sm text-blue-500 hover:underline block">
            ← Analyser un autre CV
          </a>
        </div>
        <FullReport result={result} />
      </div>
    </main>
  )
}
