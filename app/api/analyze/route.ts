import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { extractTextFromPDF, validatePDFSize, validateCVContent } from '@/lib/parse-pdf'
import { analyzeCV } from '@/lib/analyze'
import { storeAnalysis } from '@/lib/kv'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Fichier PDF requis' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    validatePDFSize(buffer)

    const cvText = await extractTextFromPDF(buffer)
    validateCVContent(cvText)

    const result = await analyzeCV(cvText)
    const id = randomUUID()

    await storeAnalysis(id, {
      result,
      createdAt: Date.now(),
    })

    return NextResponse.json({
      id,
      score: result.score,
      level: result.level,
      previewChecks: result.checks.slice(0, 2),
      totalChecks: result.checks.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
