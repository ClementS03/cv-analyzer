'use client'

import { useCallback, useState } from 'react'
import type { Check } from '@/types/analysis'

interface PreviewData {
  id: string
  score: number
  level: string
  previewChecks: Check[]
  totalChecks: number
}

interface UploadZoneProps {
  onPreview: (data: PreviewData) => void
}

export function UploadZone({ onPreview }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Format invalide — ton CV doit être en PDF. Exporte-le depuis Word, LibreOffice ou Canva en "Enregistrer sous → PDF".')
      return
    }

    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/analyze', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onPreview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setIsLoading(false)
    }
  }, [onPreview])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
      `}
    >
      <input
        type="file"
        accept=".pdf"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        className="hidden"
        id="cv-upload"
        disabled={isLoading}
      />
      <label htmlFor="cv-upload" className="cursor-pointer block">
        {isLoading ? (
          <div className="space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-600">Analyse en cours… (~30 secondes)</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-4xl">📄</div>
            <p className="text-lg font-medium text-gray-700">
              Glisse ton CV ici ou clique pour uploader
            </p>
            <p className="text-sm text-gray-400">PDF uniquement · max 5MB</p>
          </div>
        )}
      </label>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
    </div>
  )
}
