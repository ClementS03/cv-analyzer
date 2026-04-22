import * as SibApiV3Sdk from '@getbrevo/brevo'
import type { AnalysisResult } from '@/types/analysis'

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
apiInstance.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY!
)

const STATUS_EMOJI = { pass: '✅', warning: '⚠️', fail: '❌' }

function buildReportHtml(result: AnalysisResult): string {
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

  const levelColor =
    result.level === 'Excellent' ? '#16a34a' : result.level === 'Bon' ? '#ca8a04' : '#dc2626'

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h1 style="text-align:center;font-size:28px;color:#111827">Ton rapport CV</h1>
      <div style="text-align:center;margin:16px 0">
        <span style="font-size:64px;font-weight:700;color:#111827">${result.score}</span>
        <span style="color:#9ca3af">/100</span>
        <p style="font-size:18px;font-weight:600;margin:4px 0;color:${levelColor}">${result.level}</p>
      </div>
      <div style="background:#eff6ff;border-radius:8px;padding:16px;margin:20px 0">
        <h2 style="color:#1e40af;margin:0 0 10px">🎯 3 actions prioritaires</h2>
        <ol style="margin:0;padding-left:20px">${actionsHtml}</ol>
      </div>
      <h2 style="color:#374151;font-size:14px;text-transform:uppercase;letter-spacing:0.05em">Analyse détaillée</h2>
      ${checksHtml}
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:32px">
        CV Analyzer · Rapport généré par IA
      </p>
    </div>
  `
}

export async function sendReportEmail(toEmail: string, result: AnalysisResult): Promise<void> {
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()
  sendSmtpEmail.sender = {
    email: process.env.BREVO_FROM_EMAIL!,
    name: process.env.BREVO_FROM_NAME ?? 'CV Analyzer',
  }
  sendSmtpEmail.to = [{ email: toEmail }]
  sendSmtpEmail.subject = `Ton rapport CV — Score ${result.score}/100 (${result.level})`
  sendSmtpEmail.htmlContent = buildReportHtml(result)

  await apiInstance.sendTransacEmail(sendSmtpEmail)
}
