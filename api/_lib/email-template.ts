/**
 * HTML email template for the EdgeFour valuation report.
 * All styles are inlined for email client compatibility.
 */

type EmailData = {
  business_name: string
  industry: string
  valuation_low: number
  valuation_base: number
  valuation_high: number
  value_score: number
  score_band: string
  adj_ebitda: number
  estimated_multiple: number
  good_factors: Array<{ name: string; description: string }>
  bad_factors: Array<{ name: string; description: string }>
  trajectory_top_factors: Array<{ name: string; delta: number }>
  trajectory_uplift?: {
    uplift_amount: number
    new_valuation_base: number
  }
  vip_recommendations: Array<{ title: string; body: string }>
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const INDUSTRY_LABELS: Record<string, string> = {
  restaurant_full: 'Full-Service Restaurant', restaurant_fast: 'Fast Casual / QSR',
  catering: 'Catering', food_mfg: 'Food Manufacturing', bakery: 'Bakery',
  retail_general: 'General Retail', retail_specialty: 'Specialty Retail',
  liquor_store: 'Liquor Store', auto_parts: 'Auto Parts', gas_station: 'Gas Station / C-Store',
  ecommerce_branded: 'E-Commerce (Branded)', ecommerce_amazon: 'E-Commerce (Amazon/Marketplace)',
  hvac: 'HVAC', plumbing: 'Plumbing', electrical: 'Electrical', roofing: 'Roofing',
  landscape_residential: 'Landscaping (Residential)', landscape_commercial: 'Landscaping (Commercial)',
  pest_residential: 'Pest Control (Residential)', pest_commercial: 'Pest Control (Commercial)',
  pool_service: 'Pool Service', cleaning_residential: 'Cleaning (Residential)',
  cleaning_commercial: 'Cleaning (Commercial)', security_systems: 'Security Systems',
  painting: 'Painting', junk_removal: 'Junk Removal', moving: 'Moving',
  appliance_repair: 'Appliance Repair', auto_repair: 'Auto Repair', auto_body: 'Auto Body',
  car_wash: 'Car Wash', other: 'Other',
}

export function buildReportEmail(data: EmailData): string {
  const bizName = escapeHtml(data.business_name)
  const industryLabel = escapeHtml(INDUSTRY_LABELS[data.industry] || data.industry)

  const goodFactorsHtml = data.good_factors.length > 0
    ? data.good_factors.slice(0, 4).map(f =>
        `<tr><td style="padding:6px 0;color:#2d6a4f;font-size:14px;line-height:1.5;vertical-align:top;width:20px;">&#9679;</td><td style="padding:6px 0 6px 8px;color:#2d6a4f;font-size:14px;line-height:1.5;">${escapeHtml(f.description)}</td></tr>`
      ).join('')
    : '<tr><td style="padding:6px 0;color:#4A6080;font-size:14px;">No standout strengths identified yet.</td></tr>'

  const badFactorsHtml = data.bad_factors.length > 0
    ? data.bad_factors.slice(0, 4).map(f =>
        `<tr><td style="padding:6px 0;color:#c0392b;font-size:14px;line-height:1.5;vertical-align:top;width:20px;">&#9679;</td><td style="padding:6px 0 6px 8px;color:#c0392b;font-size:14px;line-height:1.5;">${escapeHtml(f.description)}</td></tr>`
      ).join('')
    : '<tr><td style="padding:6px 0;color:#4A6080;font-size:14px;">No major red flags — great work!</td></tr>'

  const trajectoryHtml = data.trajectory_top_factors.length > 0
    ? data.trajectory_top_factors.map((f, i) =>
        `<tr>
          <td style="padding:8px 0;vertical-align:top;width:28px;">
            <div style="width:22px;height:22px;border-radius:50%;background:#C9A84C;color:#1B2A4A;font-size:12px;font-weight:700;text-align:center;line-height:22px;">${i + 1}</div>
          </td>
          <td style="padding:8px 0 8px 8px;font-size:14px;color:#1B2A4A;line-height:1.5;">
            ${escapeHtml(f.name)} <span style="color:#C9A84C;font-weight:600;">(+${f.delta.toFixed(1)}x multiple)</span>
          </td>
        </tr>`
      ).join('')
    : ''

  const recsHtml = data.vip_recommendations.length > 0
    ? data.vip_recommendations.map(rec =>
        `<tr>
          <td style="padding:12px 0;vertical-align:top;width:24px;">
            <span style="color:#C9A84C;font-size:16px;font-weight:700;">&#9670;</span>
          </td>
          <td style="padding:12px 0 12px 8px;">
            <div style="font-size:15px;font-weight:600;color:#1B2A4A;margin-bottom:4px;">${escapeHtml(rec.title)}</div>
            <div style="font-size:13px;color:#4A6080;line-height:1.6;">${escapeHtml(rec.body)}</div>
          </td>
        </tr>`
      ).join('')
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your EdgeFour Valuation Report</title>
</head>
<body style="margin:0;padding:0;background:#0E1A2E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<!-- Preheader (hidden text for inbox preview) -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
  ${bizName} — Estimated value: ${formatMoney(data.valuation_low)} to ${formatMoney(data.valuation_high)}
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0E1A2E;">
<tr><td align="center" style="padding:32px 16px;">

  <!-- Main container -->
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

    <!-- Header -->
    <tr><td style="padding:24px 32px;text-align:center;">
      <div style="font-size:22px;font-weight:700;color:#C9A84C;letter-spacing:1px;">EDGE FOUR</div>
      <div style="font-size:11px;color:#8FA3BA;letter-spacing:2px;margin-top:4px;">BUSINESS VALUATION REPORT</div>
    </td></tr>

    <!-- White content card -->
    <tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;">

        <!-- Business name + industry -->
        <tr><td style="padding:32px 32px 16px;">
          <h1 style="margin:0;font-size:24px;color:#1B2A4A;font-weight:700;">${bizName}</h1>
          <p style="margin:4px 0 0;font-size:14px;color:#8FA3BA;">${industryLabel}</p>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="border-top:1px solid #E8ECF1;"></div></td></tr>

        <!-- Valuation range -->
        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 12px;font-size:12px;color:#8FA3BA;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Estimated Business Value</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="text-align:center;width:33%;padding:8px 0;">
                <div style="font-size:12px;color:#8FA3BA;margin-bottom:4px;">Low</div>
                <div style="font-size:22px;font-weight:700;color:#4A6080;">${formatMoney(data.valuation_low)}</div>
              </td>
              <td style="text-align:center;width:34%;padding:8px 0;">
                <div style="font-size:12px;color:#C9A84C;margin-bottom:4px;font-weight:600;">Base</div>
                <div style="font-size:28px;font-weight:700;color:#1B2A4A;">${formatMoney(data.valuation_base)}</div>
              </td>
              <td style="text-align:center;width:33%;padding:8px 0;">
                <div style="font-size:12px;color:#8FA3BA;margin-bottom:4px;">High</div>
                <div style="font-size:22px;font-weight:700;color:#4A6080;">${formatMoney(data.valuation_high)}</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Key metrics row -->
        <tr><td style="padding:0 32px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;border-radius:8px;">
            <tr>
              <td style="padding:16px;text-align:center;width:33%;border-right:1px solid #E8ECF1;">
                <div style="font-size:11px;color:#8FA3BA;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Adj. EBITDA</div>
                <div style="font-size:18px;font-weight:700;color:#1B2A4A;">${formatMoney(data.adj_ebitda)}</div>
              </td>
              <td style="padding:16px;text-align:center;width:34%;border-right:1px solid #E8ECF1;">
                <div style="font-size:11px;color:#8FA3BA;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Multiple</div>
                <div style="font-size:18px;font-weight:700;color:#1B2A4A;">${data.estimated_multiple.toFixed(2)}x</div>
              </td>
              <td style="padding:16px;text-align:center;width:33%;">
                <div style="font-size:11px;color:#8FA3BA;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Value Score</div>
                <div style="font-size:18px;font-weight:700;color:#C9A84C;">${data.value_score}/100</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="border-top:1px solid #E8ECF1;"></div></td></tr>

        <!-- Strengths -->
        <tr><td style="padding:24px 32px 8px;">
          <p style="margin:0 0 8px;font-size:13px;color:#2d6a4f;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Strengths Working for You</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${goodFactorsHtml}
          </table>
        </td></tr>

        <!-- Areas to improve -->
        <tr><td style="padding:16px 32px 24px;">
          <p style="margin:0 0 8px;font-size:13px;color:#c0392b;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Areas Holding Back Your Value</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${badFactorsHtml}
          </table>
        </td></tr>

        ${trajectoryHtml ? `
        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="border-top:1px solid #E8ECF1;"></div></td></tr>

        <!-- Trajectory / Uplift -->
        <tr><td style="padding:24px 32px 8px;">
          <p style="margin:0 0 4px;font-size:13px;color:#C9A84C;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">What Your Business Could Be Worth</p>
          <p style="margin:0 0 16px;font-size:14px;color:#4A6080;line-height:1.5;">Most owners are surprised by the gap between the value of their company today and the value it could be after making just 2 key improvements.</p>
          ${data.trajectory_uplift ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            <tr>
              <td style="padding:12px 8px;text-align:center;width:45%;">
                <div style="font-size:11px;color:#8FA3BA;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;font-weight:600;">Today</div>
                <div style="font-size:22px;font-weight:700;color:#1B2A4A;">${formatMoney(data.valuation_base)}</div>
              </td>
              <td style="padding:12px 8px;text-align:center;width:10%;color:#C9A84C;font-size:20px;font-weight:700;">&rarr;</td>
              <td style="padding:12px 8px;text-align:center;width:45%;">
                <div style="font-size:11px;color:#8FA3BA;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;font-weight:600;">After Key Improvements</div>
                <div style="font-size:22px;font-weight:700;color:#C9A84C;">${formatMoney(data.trajectory_uplift.new_valuation_base)}</div>
              </td>
            </tr>
            <tr>
              <td colspan="3" style="padding:8px 0 0;text-align:center;">
                <span style="display:inline-block;padding:6px 14px;background:#E8F5E9;border:1px solid #2d6a4f;border-radius:999px;font-size:13px;font-weight:700;color:#2d6a4f;">+${formatMoney(data.trajectory_uplift.uplift_amount)} increase in value with key improvements</span>
              </td>
            </tr>
          </table>
          ` : ''}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${trajectoryHtml}
          </table>
        </td></tr>
        ` : ''}

        ${recsHtml ? `
        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="border-top:1px solid #E8ECF1;"></div></td></tr>

        <!-- Recommendations -->
        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 4px;font-size:13px;color:#1B2A4A;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Your Value Improvement Roadmap</p>
          <p style="margin:0 0 16px;font-size:14px;color:#4A6080;line-height:1.5;">These improvements are tailored to your specific business. Each one can meaningfully move both your profitability and your business value.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${recsHtml}
          </table>
        </td></tr>
        ` : ''}

        <!-- CTA -->
        <tr><td style="padding:16px 32px 32px;text-align:center;">
          <div style="border-top:1px solid #E8ECF1;padding-top:24px;">
            <p style="margin:0 0 16px;font-size:15px;color:#1B2A4A;font-weight:600;">Ready to take the next step?</p>
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://calendly.com/edgefour" style="height:52px;v-text-anchor:middle;width:340px;" arcsize="50%" stroke="f" fillcolor="#C9A84C">
              <w:anchorlock/>
              <center style="color:#1B2A4A;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:700;letter-spacing:0.3px;">Schedule a Value Improvement Call</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-- -->
            <a href="https://calendly.com/edgefour" target="_blank" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#C9A84C,#E8C97A);color:#1B2A4A;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:700;letter-spacing:0.3px;text-decoration:none;border-radius:100px;box-shadow:0 8px 32px rgba(201,168,76,0.35);">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline;vertical-align:middle;margin-right:10px;">
                <path d="M3 2.5 C3 2.5 4 2 5 3.5 L6 5.5 C6.3 6.1 6 6.5 5.5 7 C5 7.5 5.2 8 5.8 8.8 C6.5 9.8 7.2 10.5 8.2 11.2 C9 11.8 9.5 12 10 11.5 C10.5 11 10.9 10.7 11.5 11 L13.5 12 C15 13 14.5 14 14.5 14 C14.5 14 13 15.5 11 14.5 C7 12.5 3.5 9 1.5 5 C0.5 3 2 1.5 3 2.5 Z" stroke="#1B2A4A" stroke-width="1.2" fill="none" stroke-linejoin="round"/>
              </svg>Schedule a Value Improvement Call
            </a>
            <!--<![endif]-->
            <p style="margin:16px 0 0;font-size:13px;color:#8FA3BA;">
              Or email us at <a href="mailto:info@edgefourllc.com" style="color:#C9A84C;">info@edgefourllc.com</a>
            </p>
          </div>
        </td></tr>

      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:24px 32px;text-align:center;">
      <p style="margin:0 0 8px;font-size:12px;color:#8FA3BA;">
        <a href="https://edgefourllc.com" target="_blank" style="color:#C9A84C;text-decoration:none;">edgefourllc.com</a>
      </p>
      <p style="margin:0;font-size:11px;color:#4A6080;line-height:1.5;max-width:480px;display:inline-block;">
        This report is based on the information you provided and is intended for informational purposes only. It does not constitute financial, legal, or investment advice. The recommendations reflect commonly accepted drivers of profitability and business value, but actual results will vary. For a comprehensive evaluation, consider consulting a qualified business advisor.
      </p>
    </td></tr>

  </table>

</td></tr>
</table>

</body>
</html>`
}
