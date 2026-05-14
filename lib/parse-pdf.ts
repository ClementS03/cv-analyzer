import pdfParse from 'pdf-parse'
import { UserFacingError } from './errors'

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)
  return data.text.trim()
}

export function validatePDFSize(buffer: Buffer): void {
  if (buffer.length > 5 * 1024 * 1024) {
    throw new UserFacingError('Le fichier dépasse 5MB')
  }
}

export function validatePDFMagicBytes(buffer: Buffer): void {
  if (buffer.length < 4 || buffer.slice(0, 4).toString('binary') !== '%PDF') {
    throw new UserFacingError('Le fichier n\'est pas un PDF valide.')
  }
}

export function validateCVContent(text: string): void {
  if (text.trim().length < 100) {
    throw new UserFacingError(
      'Ton CV semble être une image scannée. pdf-parse ne peut pas lire les images — exporte ton CV en PDF texte depuis Word, LibreOffice ou Canva.'
    )
  }

  const lower = text.toLowerCase()
  const indicators = {
    contact: [
      /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i,
      /(\+?\d[\d\s\-().]{7,}\d)/,
      /linkedin\.com/i,
      /github\.com/i,
    ],
    identity: [
      /\b(nom|prénom|name|surname|firstname)\b/i,
      /\b(né(e)?|date de naissance|born)\b/i,
      /\b(adresse|address|ville|city)\b/i,
    ],
    experience: [
      /\b(expérience|experience|emploi|poste|mission|stage|internship|job)\b/i,
      /\b(entreprise|société|company|employeur|employer)\b/i,
      /\b(cdi|cdd|freelance|alternance|apprentissage)\b/i,
    ],
    education: [
      /\b(formation|education|études|diplôme|degree|bachelor|master|licence|bac|bts|dut|école|université|university)\b/i,
    ],
    skills: [
      /\b(compétences?|skills?|langues?|languages?|outils?|tools?|technologies?|maîtrise)\b/i,
    ],
  }

  const matched = Object.values(indicators).filter((patterns) =>
    patterns.some((p) => p.test(lower))
  ).length

  if (matched < 2) {
    throw new UserFacingError(
      "Ce document ne ressemble pas à un CV. Assure-toi d'uploader ton CV en PDF avec tes informations personnelles, expériences et formations."
    )
  }
}
