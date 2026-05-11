import PDFDocument from 'pdfkit'
import type { valuations } from '../../src/db/schema/valuations.js'
import type { InferSelectModel } from 'drizzle-orm'
import { INDUSTRY_LABELS } from './email-template.js'

type ValuationRow = InferSelectModel<typeof valuations>

// Colors matching Edge Four brand
const GOLD = '#C9A84C'
const NAVY = '#1B2A4A'
const LABEL_GRAY = '#8FA3BA'
const RULE_GRAY = '#E2E8F0'
const PAGE_BG = '#F8FAFC'

function usd(val: string | null | undefined): string {
  if (val == null) return '—'
  return '$' + Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function str(val: string | number | null | undefined): string {
  if (val == null || val === '') return '—'
  return String(val)
}

function buildPdfBuffer(v: ValuationRow): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 48, bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = doc.page.width - 96 // usable width (margins on both sides)
    const LEFT = 48
    const LABEL_W = 180

    const submitted = v.createdAt
      ? new Date(v.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '—'

    const industryLabel = v.industry ? (INDUSTRY_LABELS[v.industry] ?? v.industry) : '—'

    // ── Header band ──────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 88).fill(NAVY)

    doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(20)
      .text('EDGE FOUR', LEFT, 24, { characterSpacing: 1.5 })

    doc.fillColor('#8FA3BA').font('Helvetica').fontSize(9)
      .text('FORM SUBMISSION SUMMARY', LEFT, 50, { characterSpacing: 2 })

    // ── Business name + meta ─────────────────────────────────────────────────
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(18)
      .text(str(v.businessName), LEFT, 108)

    doc.fillColor(LABEL_GRAY).font('Helvetica').fontSize(11)
      .text(`${industryLabel}  ·  Submitted ${submitted}`, LEFT, 132)

    doc.moveTo(LEFT, 154).lineTo(LEFT + W, 154).lineWidth(1).strokeColor(RULE_GRAY).stroke()

    let y = 166

    // ── Section helper ───────────────────────────────────────────────────────
    function sectionHeader(title: string) {
      if (y > doc.page.height - 120) { doc.addPage(); y = 48 }
      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(8)
        .text(title.toUpperCase(), LEFT, y, { characterSpacing: 1.5 })
      y += 16
      doc.moveTo(LEFT, y).lineTo(LEFT + W, y).lineWidth(0.5).strokeColor(RULE_GRAY).stroke()
      y += 10
    }

    function dataRow(label: string, value: string) {
      if (y > doc.page.height - 60) { doc.addPage(); y = 48 }
      doc.fillColor(LABEL_GRAY).font('Helvetica').fontSize(11).text(label, LEFT, y, { width: LABEL_W })
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(11).text(value, LEFT + LABEL_W, y, { width: W - LABEL_W })
      y += 22
    }

    // ── Page 1: Business Information ─────────────────────────────────────────
    sectionHeader('Business Information')
    dataRow('Business Name', str(v.businessName))
    dataRow('Industry', industryLabel)
    dataRow('City', str(v.city))
    dataRow('State', str(v.state))
    dataRow('Years in Business', str(v.yearsInBusiness))
    dataRow('Employees', str(v.employees))
    y += 12

    // ── Page 2: Financials ───────────────────────────────────────────────────
    sectionHeader('Financials')
    dataRow('Revenue', usd(v.revenue))
    if (v.inputMode === 'calc') {
      dataRow('Earnings', usd(v.earnings))
      dataRow('Interest Expense', usd(v.interestExpense))
      dataRow('Taxes Paid', usd(v.taxesPaid))
      dataRow('Depreciation / Amort.', usd(v.depreciationAmort))
    } else {
      dataRow('EBITDA', usd(v.ebitda))
    }
    dataRow('Owner Salary', usd(v.ownerSalary))
    dataRow('Market Salary', usd(v.marketSalary))
    dataRow('Addbacks', usd(v.addbacks))
    y += 12

    // ── Page 3: Value Drivers ────────────────────────────────────────────────
    sectionHeader('Value Drivers')
    dataRow('Growth Trajectory', `${str(v.growthSlider)} / 5`)
    dataRow('Owner Dependency', `${str(v.ownerDepSlider)} / 5`)
    dataRow('Recurring Revenue', `${str(v.recurringSlider)} / 5`)
    dataRow('Customer Concentration', `${str(v.custConcSlider)} / 5`)
    dataRow('Systems & Processes', `${str(v.systemsSlider)} / 5`)
    dataRow('Financial Records', `${str(v.finRecordsSlider)} / 5`)
    y += 12

    // ── Page 4: Lead Information ─────────────────────────────────────────────
    sectionHeader('Lead Information')
    dataRow('Timeline', str(v.quizTimeline))
    dataRow('Advisory Source', str(v.quizAdvisorySource))

    // ── Footer ───────────────────────────────────────────────────────────────
    const pages = doc.bufferedPageRange()
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i)
      doc.fillColor(LABEL_GRAY).font('Helvetica').fontSize(8)
        .text('EdgeFour Business Valuation — Confidential', LEFT, doc.page.height - 32, {
          width: W, align: 'center',
        })
    }

    doc.end()
  })
}

export async function buildFormAttachment(v: ValuationRow): Promise<{ content: Buffer; filename: string }> {
  const content = await buildPdfBuffer(v)
  const safeName = (v.businessName ?? 'Business').replace(/[^\w\s-]/g, '').trim()
  const filename = `${safeName} - Form Submissions.pdf`
  return { content, filename }
}
