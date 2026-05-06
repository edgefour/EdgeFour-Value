import type { valuations } from '../../src/db/schema/valuations.js'
import type { InferSelectModel } from 'drizzle-orm'
import { INDUSTRY_LABELS } from './email-template.js'

type ValuationRow = InferSelectModel<typeof valuations>

function esc(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function usd(val: string | null | undefined): string {
  if (val == null) return '—'
  return '$' + Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function str(val: string | number | null | undefined): string {
  if (val == null || val === '') return '—'
  return esc(val)
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;font-size:14px;color:#8FA3BA;width:200px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;font-size:14px;color:#1B2A4A;font-weight:500;">${value}</td>
  </tr>`
}

function section(title: string, rows: string[]): string {
  return `<div style="margin-bottom:24px;">
  <div style="font-size:11px;font-weight:700;color:#C9A84C;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #E8EDF2;">${title}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${rows.join('\n')}
  </table>
</div>`
}

export function buildFormAttachment(v: ValuationRow): { content: Buffer; filename: string } {
  const submitted = v.createdAt
    ? new Date(v.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  const industryLabel = v.industry ? (INDUSTRY_LABELS[v.industry] ?? esc(v.industry)) : '—'

  const financialRows = [row('Revenue', usd(v.revenue))]
  if (v.inputMode === 'calc') {
    financialRows.push(
      row('Earnings', usd(v.earnings)),
      row('Interest Expense', usd(v.interestExpense)),
      row('Taxes Paid', usd(v.taxesPaid)),
      row('Depreciation / Amort.', usd(v.depreciationAmort)),
    )
  } else {
    financialRows.push(row('EBITDA', usd(v.ebitda)))
  }
  financialRows.push(
    row('Owner Salary', usd(v.ownerSalary)),
    row('Market Salary', usd(v.marketSalary)),
    row('Addbacks', usd(v.addbacks)),
  )

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Form Submissions — ${esc(v.businessName)}</title>
</head>
<body style="margin:0;padding:0;background:#0E1A2E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0E1A2E;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

    <tr><td style="padding:24px 32px;text-align:center;">
      <div style="font-size:22px;font-weight:700;color:#C9A84C;letter-spacing:1px;">EDGE FOUR</div>
      <div style="font-size:11px;color:#8FA3BA;letter-spacing:2px;margin-top:4px;">FORM SUBMISSION SUMMARY</div>
    </td></tr>

    <tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;">
        <tr><td style="padding:32px 32px 24px;">

          <h1 style="margin:0 0 4px;font-size:22px;color:#1B2A4A;font-weight:700;">${esc(v.businessName)}</h1>
          <p style="margin:0 0 4px;font-size:14px;color:#8FA3BA;">${industryLabel}</p>
          <p style="margin:0 0 28px;font-size:12px;color:#B0BEC5;">Submitted ${submitted}</p>

          ${section('Business Information', [
            row('Business Name', str(v.businessName)),
            row('Industry', industryLabel),
            row('City', str(v.city)),
            row('State', str(v.state)),
            row('Years in Business', str(v.yearsInBusiness)),
            row('Employees', str(v.employees)),
          ])}

          ${section('Financials', financialRows)}

          ${section('Value Drivers', [
            row('Growth Trajectory', `${str(v.growthSlider)} / 5`),
            row('Owner Dependency', `${str(v.ownerDepSlider)} / 5`),
            row('Recurring Revenue', `${str(v.recurringSlider)} / 5`),
            row('Customer Concentration', `${str(v.custConcSlider)} / 5`),
            row('Systems &amp; Processes', `${str(v.systemsSlider)} / 5`),
            row('Financial Records', `${str(v.finRecordsSlider)} / 5`),
          ])}

          ${section('Lead Information', [
            row('Timeline', str(v.quizTimeline)),
            row('Advisory Source', str(v.quizAdvisorySource)),
          ])}

        </td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:20px 32px;text-align:center;">
      <div style="font-size:11px;color:#4A6080;">EdgeFour Business Valuation &mdash; Confidential</div>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`

  const content = Buffer.from(html, 'utf-8')
  const safeName = (v.businessName ?? 'Business').replace(/[^\w\s-]/g, '').trim()
  const filename = `${safeName} - Form Submissions.html`

  return { content, filename }
}
