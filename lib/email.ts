import { BrevoClient } from '@getbrevo/brevo'
import type { AnalysisResult } from '@/types/analysis'

const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY! })

const STATUS_EMOJI = { pass: '✅', warning: '⚠️', fail: '❌' }

const LEVEL_COLOR_EMAIL: Record<string, string> = {
  Excellent: '#16a34a',
  Bon: '#ca8a04',
  Good: '#ca8a04',
  Passable: '#dc2626',
  Poor: '#dc2626',
}

const EMAIL_LABELS = {
  fr: {
    title: 'Ton rapport CV',
    actions: '🎯 3 actions prioritaires',
    detail: 'Analyse détaillée',
    footer: 'CV Analyzer · Rapport généré par IA',
    subject: (score: number, level: string) => `Ton rapport CV — Score ${score}/100 (${level})`,
  },
  en: {
    title: 'Your CV report',
    actions: '🎯 3 priority actions',
    detail: 'Detailed analysis',
    footer: 'CV Analyzer · AI-powered report',
    subject: (score: number, level: string) => `Your CV report — Score ${score}/100 (${level})`,
  },
}

function buildReportHtml(result: AnalysisResult): string {
  const lang = result.language === 'en' ? 'en' : 'fr'
  const labels = EMAIL_LABELS[lang]

  const checksHtml = result.checks
    .map(
      (c) => `
        <div style="margin-bottom:12px;padding:12px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <strong>${STATUS_EMOJI[c.status]} ${c.title}</strong>
            <span style="color:#6b7280">${c.score}/100</span>
          </div>
          <p style="margin:0 0 6px;color:#374151;font-size:14px">${c.feedback}</p>
          ${c.suggestions.map((s) => `<p style="margin:2px 0;color:#6b7280;font-size:13px">→ ${s}</p>`).join('')}
        </div>`
    )
    .join('')

  const actionsHtml = result.topActions
    .map((a, i) => `<li style="margin-bottom:6px;color:#1d4ed8">${i + 1}. ${a}</li>`)
    .join('')

  const levelColor = LEVEL_COLOR_EMAIL[result.level] ?? '#6b7280'

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h1 style="text-align:center;font-size:28px;color:#111827">${labels.title}</h1>
      <div style="text-align:center;margin:16px 0">
        <span style="font-size:64px;font-weight:700;color:#111827">${result.score}</span>
        <span style="color:#9ca3af">/100</span>
        <p style="font-size:18px;font-weight:600;margin:4px 0;color:${levelColor}">${result.level}</p>
      </div>
      <div style="background:#eff6ff;border-radius:8px;padding:16px;margin:20px 0">
        <h2 style="color:#1e40af;margin:0 0 10px">${labels.actions}</h2>
        <ol style="margin:0;padding-left:20px">${actionsHtml}</ol>
      </div>
      <h2 style="color:#374151;font-size:14px;text-transform:uppercase;letter-spacing:0.05em">${labels.detail}</h2>
      ${checksHtml}
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:32px">
        ${labels.footer}
      </p>
    </div>
  `
}

export async function sendReportEmail(toEmail: string, result: AnalysisResult): Promise<void> {
  const lang = result.language === 'en' ? 'en' : 'fr'
  const subject = EMAIL_LABELS[lang].subject(result.score, result.level)
  await brevo.transactionalEmails.sendTransacEmail({
    sender: {
      email: process.env.BREVO_FROM_EMAIL!,
      name: process.env.BREVO_FROM_NAME ?? 'CV Analyzer',
    },
    to: [{ email: toEmail }],
    subject,
    htmlContent: buildReportHtml(result),
  })
}
