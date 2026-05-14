import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { extractTextFromPDF, validatePDFSize, validatePDFMagicBytes, validateCVContent } from '@/lib/parse-pdf'
import { analyzeCV } from '@/lib/analyze'
import { storeAnalysis } from '@/lib/kv'
import { UserFacingError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Fichier PDF requis' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    validatePDFSize(buffer)
    validatePDFMagicBytes(buffer)
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
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[analyze]', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
