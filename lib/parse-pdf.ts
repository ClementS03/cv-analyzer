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
