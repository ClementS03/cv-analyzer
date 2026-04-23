import pdfParse from 'pdf-parse'

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)
  return data.text.trim()
}

export function validatePDFSize(buffer: Buffer): void {
  const maxSize = 5 * 1024 * 1024
  if (buffer.length > maxSize) {
    throw new Error('Le fichier dépasse 5MB')
  }
}

export function validateCVContent(text: string): void {
  const lower = text.toLowerCase()

  // Detect scanned PDF (almost no text)
  if (text.trim().length < 100) {
    throw new Error('Ton CV semble être une image scannée. pdf-parse ne peut pas lire les images — exporte ton CV en PDF texte depuis Word, LibreOffice ou Canva.')
  }

  // Check for CV indicators across categories
  const indicators = {
    contact: [
      /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i,           // email
      /(\+?\d[\d\s\-().]{7,}\d)/,                    // phone
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
    throw new Error("Ce document ne ressemble pas à un CV. Assure-toi d'uploader ton CV en PDF avec tes informations personnelles, expériences et formations.")
  }
}
