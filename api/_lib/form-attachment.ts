import type { valuations } from '../../src/db/schema/valuations.js'
import type { InferSelectModel } from 'drizzle-orm'

type ValuationRow = InferSelectModel<typeof valuations>

function usd(val: string | null | undefined): string {
  if (val == null) return '—'
  return '$' + Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function str(val: string | number | null | undefined): string {
  if (val == null || val === '') return '—'
  return String(val)
}

function pad(label: string, value: string, width = 26): string {
  return label.padEnd(width) + value
}

export function buildFormAttachment(v: ValuationRow): { content: Buffer; filename: string } {
  const submitted = v.createdAt
    ? new Date(v.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  const lines: string[] = [
    'EDGE FOUR — FORM SUBMISSION SUMMARY',
    `Business: ${str(v.businessName)}`,
    `Submitted: ${submitted}`,
    '='.repeat(60),
    '',
    'PAGE 1: BUSINESS INFORMATION',
    '-'.repeat(60),
    pad('Business Name:', str(v.businessName)),
    pad('Industry:', str(v.industry)),
    pad('City:', str(v.city)),
    pad('State:', str(v.state)),
    pad('Years in Business:', str(v.yearsInBusiness)),
    pad('Employees:', str(v.employees)),
    '',
    'PAGE 2: FINANCIALS',
    '-'.repeat(60),
    pad('Revenue:', usd(v.revenue)),
  ]

  if (v.inputMode === 'calc') {
    lines.push(
      pad('Earnings:', usd(v.earnings)),
      pad('Interest Expense:', usd(v.interestExpense)),
      pad('Taxes Paid:', usd(v.taxesPaid)),
      pad('Depreciation/Amort:', usd(v.depreciationAmort)),
    )
  } else {
    lines.push(pad('EBITDA:', usd(v.ebitda)))
  }

  lines.push(
    pad('Owner Salary:', usd(v.ownerSalary)),
    pad('Market Salary:', usd(v.marketSalary)),
    pad('Addbacks:', usd(v.addbacks)),
    '',
    'PAGE 3: VALUE DRIVERS',
    '-'.repeat(60),
    pad('Growth Trajectory:', `${str(v.growthSlider)} / 5`),
    pad('Owner Dependency:', `${str(v.ownerDepSlider)} / 5`),
    pad('Recurring Revenue:', `${str(v.recurringSlider)} / 5`),
    pad('Customer Concentration:', `${str(v.custConcSlider)} / 5`),
    pad('Systems & Processes:', `${str(v.systemsSlider)} / 5`),
    pad('Financial Records:', `${str(v.finRecordsSlider)} / 5`),
    '',
    'PAGE 4: LEAD INFORMATION',
    '-'.repeat(60),
    pad('Timeline:', str(v.quizTimeline)),
    pad('Advisory Source:', str(v.quizAdvisorySource)),
  )

  const content = Buffer.from(lines.join('\n'), 'utf-8')
  const slug = (v.businessName ?? 'submission').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const filename = `${slug}-form-submission.txt`

  return { content, filename }
}
