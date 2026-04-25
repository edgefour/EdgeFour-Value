/**
 * Real calculation engine ported from the ORIGINAL edgefour-value HTML.
 * Source of truth: docs/ORIGINAL-edgefour-value_26_v4.16.26 (1).html
 */

import type { CalculateInput, CalculateResult } from '../../shared/types.js'

// ── INDUSTRY MULTIPLES (114 entries) ────────────────────────────────────────
export const industryMultiples: Record<string, number> = {
  restaurant_full: 2.0,
  restaurant_fast: 2.5,
  catering: 2.0,
  food_mfg: 3.5,
  bakery: 2.0,
  retail_general: 2.75,
  retail_specialty: 3.5,
  liquor_store: 3.0,
  auto_parts: 2.5,
  gas_station: 3.0,
  ecommerce_branded: 4.5,
  ecommerce_amazon: 3.0,
  hvac: 4.5,
  plumbing: 4.0,
  electrical: 4.0,
  roofing: 3.5,
  landscape_residential: 4.0,
  landscape_commercial: 5.0,
  pest_residential: 4.5,
  pest_commercial: 5.0,
  pool_service: 4.5,
  cleaning_residential: 3.0,
  cleaning_commercial: 4.0,
  security_systems: 5.0,
  painting: 3.0,
  junk_removal: 3.5,
  moving: 2.5,
  appliance_repair: 2.5,
  auto_repair: 3.0,
  auto_body: 3.5,
  car_wash: 4.0,
  auto_dealer_new: 0.5,
  auto_dealer_used: 2.0,
  auto_rental: 3.0,
  medical_primary: 3.5,
  dental_general: 4.5,
  dental_specialty: 5.5,
  optometry: 4.5,
  veterinary: 5.0,
  physical_therapy: 4.0,
  mental_health: 4.5,
  aba_autism: 5.5,
  med_spa: 4.0,
  home_health: 4.0,
  hospice: 5.5,
  fitness: 3.0,
  pharmacy: 3.5,
  cpa_accounting: 3.5,
  law_general: 3.0,
  law_pi: 2.5,
  engineering: 4.5,
  marketing_agency: 3.5,
  pr_firm: 3.5,
  mgmt_consulting: 3.5,
  staffing: 4.0,
  insurance_pc: 4.5,
  insurance_life: 4.0,
  wealth_mgmt: 5.5,
  mortgage: 2.5,
  title_escrow: 2.75,
  appraisal: 2.75,
  saas: 8.0,
  it_services: 5.0,
  custom_software: 3.5,
  tech_staffing: 4.0,
  digital_marketing: 3.5,
  cybersecurity: 5.0,
  data_analytics: 4.0,
  manufacturing: 4.0,
  mfg_specialty: 5.25,
  food_processing: 3.5,
  machine_shop: 3.25,
  distribution: 3.75,
  distribution_specialty: 4.0,
  industrial_services: 3.5,
  gc_commercial: 3.5,
  gc_residential: 3.0,
  contractor_mep: 4.5,
  contractor_other: 3.5,
  real_estate_brokerage: 2.5,
  property_mgmt: 3.25,
  real_estate_appraisal: 2.75,
  commercial_cleaning: 3.5,
  trucking_asset: 3.0,
  freight_brokerage: 3.75,
  last_mile: 3.0,
  moving_transport: 2.5,
  warehousing: 4.0,
  auto_transport: 3.0,
  childcare: 4.5,
  private_school: 3.5,
  tutoring: 3.0,
  vocational_school: 3.75,
  elearning: 4.25,
  assisted_living_small: 4.0,
  assisted_living_large: 5.25,
  home_care_private: 4.0,
  adult_day: 3.5,
  hair_salon: 2.25,
  day_spa: 3.0,
  tattoo: 2.0,
  funeral_home: 5.0,
  event_planning: 2.5,
  photography: 2.25,
  landscaping_design: 4.0,
  tree_service: 3.5,
  environmental: 4.0,
  waste_mgmt: 4.0,
  irrigation: 3.5,
  nursery: 3.0,
  publishing: 3.5,
  printing: 2.75,
  other: 3.25,
}

// ── OWNER DEPENDENCY BY SECTOR (114 entries) ────────────────────────────────
// Each array: [slider=1, slider=2, slider=3, slider=4, slider=5]
// Source: docs/fix-ownerdependencyadjustments/Correct Ownership Dependency Adjustment_v4.24.26.numbers
// Values are ×1.5 scaled from base profiles. L3 is always 0 (neutral).
export const ownerDepBySector: Record<string, number[]> = {
  // Manufacturing & Distribution
  manufacturing: [-1.8, -0.9, 0, 0.45, 0.75],
  mfg_specialty: [-1.8, -0.9, 0, 0.45, 0.75],
  food_processing: [-1.8, -0.9, 0, 0.45, 0.75],
  machine_shop: [-1.8, -0.9, 0, 0.45, 0.75],
  distribution: [-1.5, -0.75, 0, 0.45, 0.75],
  distribution_specialty: [-1.5, -0.75, 0, 0.45, 0.75],
  industrial_services: [-1.5, -0.75, 0, 0.45, 0.75],
  // Home & Field Services
  hvac: [-2.1, -1.05, 0, 0.45, 0.75],
  plumbing: [-2.1, -1.05, 0, 0.45, 0.75],
  electrical: [-2.1, -1.05, 0, 0.45, 0.75],
  roofing: [-1.95, -1.05, 0, 0.45, 0.75],
  landscape_residential: [-2.1, -1.05, 0, 0.45, 0.75],
  landscape_commercial: [-1.5, -0.75, 0, 0.38, 0.6],
  pest_residential: [-2.1, -1.05, 0, 0.45, 0.75],
  pest_commercial: [-1.5, -0.75, 0, 0.38, 0.6],
  pool_service: [-1.5, -0.75, 0, 0.38, 0.6],
  cleaning_residential: [-1.5, -0.75, 0, 0.38, 0.6],
  cleaning_commercial: [-1.5, -0.75, 0, 0.38, 0.6],
  security_systems: [-1.5, -0.75, 0, 0.38, 0.6],
  painting: [-1.5, -0.75, 0, 0.38, 0.6],
  junk_removal: [-1.5, -0.75, 0, 0.38, 0.6],
  moving: [-1.5, -0.75, 0, 0.38, 0.6],
  appliance_repair: [-1.5, -0.75, 0, 0.38, 0.6],
  // Retail
  retail_general: [-1.2, -0.6, 0, 0.3, 0.6],
  retail_specialty: [-1.2, -0.6, 0, 0.3, 0.6],
  liquor_store: [-1.2, -0.6, 0, 0.3, 0.6],
  auto_parts: [-1.2, -0.6, 0, 0.3, 0.6],
  gas_station: [-1.2, -0.6, 0, 0.3, 0.6],
  ecommerce_branded: [-1.2, -0.6, 0, 0.45, 0.9],
  ecommerce_amazon: [-1.2, -0.6, 0, 0.45, 0.9],
  // Food & Beverage
  restaurant_full: [-1.05, -0.52, 0, 0.3, 0.45],
  restaurant_fast: [-1.05, -0.52, 0, 0.3, 0.45],
  catering: [-1.05, -0.52, 0, 0.3, 0.45],
  food_mfg: [-1.8, -0.9, 0, 0.45, 0.75],
  bakery: [-1.2, -0.6, 0, 0.3, 0.6],
  // Automotive
  auto_repair: [-1.35, -0.68, 0, 0.38, 0.6],
  auto_body: [-1.35, -0.68, 0, 0.38, 0.6],
  car_wash: [-1.2, -0.6, 0, 0.3, 0.6],
  auto_dealer_new: [-1.2, -0.6, 0, 0.3, 0.6],
  auto_dealer_used: [-1.2, -0.6, 0, 0.3, 0.6],
  auto_rental: [-1.5, -0.75, 0, 0.45, 0.75],
  // Healthcare & Wellness
  medical_primary: [-2.7, -1.5, 0, 0.6, 0.9],
  dental_general: [-2.5, -1.3, 0, 0.6, 0.9],
  dental_specialty: [-2.7, -1.5, 0, 0.6, 0.9],
  optometry: [-2.5, -1.3, 0, 0.6, 0.9],
  veterinary: [-2.5, -1.3, 0, 0.6, 0.9],
  physical_therapy: [-2.25, -1.2, 0, 0.52, 0.83],
  mental_health: [-2.25, -1.2, 0, 0.52, 0.83],
  aba_autism: [-2.25, -1.2, 0, 0.52, 0.83],
  med_spa: [-2.25, -1.2, 0, 0.52, 0.83],
  home_health: [-2.25, -1.2, 0, 0.52, 0.83],
  hospice: [-2.25, -1.2, 0, 0.52, 0.83],
  fitness: [-1.8, -0.9, 0, 0.45, 0.75],
  pharmacy: [-1.2, -0.6, 0, 0.3, 0.6],
  // Professional Services
  cpa_accounting: [-2.2, -1.1, 0, 0.6, 0.9],
  law_general: [-2.5, -1.3, 0, 0.6, 0.9],
  law_pi: [-2.5, -1.3, 0, 0.6, 0.9],
  engineering: [-2.3, -1.2, 0, 0.6, 0.9],
  marketing_agency: [-2.5, -1.3, 0, 0.6, 0.9],
  pr_firm: [-2.3, -1.2, 0, 0.6, 0.9],
  mgmt_consulting: [-2.3, -1.2, 0, 0.6, 0.9],
  staffing: [-1.5, -0.75, 0, 0.38, 0.6],
  insurance_pc: [-2.2, -1.1, 0, 0.6, 0.9],
  insurance_life: [-2.2, -1.1, 0, 0.6, 0.9],
  wealth_mgmt: [-2.5, -1.3, 0, 0.6, 0.9],
  mortgage: [-2.0, -1.0, 0, 0.6, 0.9],
  title_escrow: [-1.5, -0.75, 0, 0.38, 0.6],
  appraisal: [-2.2, -1.1, 0, 0.6, 0.9],
  // Technology
  saas: [-2.25, -1.2, 0, 0.6, 0.9],
  it_services: [-2.25, -1.2, 0, 0.6, 0.9],
  custom_software: [-2.0, -1.0, 0, 0.6, 0.9],
  tech_staffing: [-1.5, -0.75, 0, 0.38, 0.6],
  digital_marketing: [-3.0, -1.8, 0, 0.6, 0.9],
  cybersecurity: [-2.25, -1.2, 0, 0.6, 0.9],
  data_analytics: [-2.25, -1.2, 0, 0.6, 0.9],
  // Construction & Real Estate
  gc_commercial: [-1.95, -1.05, 0, 0.45, 0.75],
  gc_residential: [-1.95, -1.05, 0, 0.45, 0.75],
  contractor_mep: [-1.95, -1.05, 0, 0.45, 0.75],
  contractor_other: [-1.95, -1.05, 0, 0.45, 0.75],
  real_estate_brokerage: [-2.5, -1.3, 0, 0.6, 0.9],
  property_mgmt: [-1.5, -0.75, 0, 0.38, 0.6],
  real_estate_appraisal: [-3.0, -1.8, 0, 0.6, 0.9],
  commercial_cleaning: [-1.5, -0.75, 0, 0.38, 0.6],
  // Logistics & Transportation
  trucking_asset: [-1.5, -0.75, 0, 0.45, 0.75],
  freight_brokerage: [-1.5, -0.75, 0, 0.38, 0.6],
  last_mile: [-1.5, -0.75, 0, 0.45, 0.75],
  moving_transport: [-1.5, -0.75, 0, 0.38, 0.6],
  warehousing: [-1.5, -0.75, 0, 0.45, 0.75],
  auto_transport: [-1.5, -0.75, 0, 0.45, 0.75],
  // Education & Childcare
  childcare: [-1.8, -0.9, 0, 0.45, 0.75],
  private_school: [-1.8, -0.9, 0, 0.45, 0.75],
  tutoring: [-1.8, -0.9, 0, 0.45, 0.75],
  vocational_school: [-1.8, -0.9, 0, 0.45, 0.75],
  elearning: [-2.25, -1.2, 0, 0.6, 0.9],
  // Senior Care
  assisted_living_small: [-1.95, -0.98, 0, 0.45, 0.75],
  assisted_living_large: [-1.95, -0.98, 0, 0.45, 0.75],
  home_care_private: [-1.95, -0.98, 0, 0.45, 0.75],
  adult_day: [-1.95, -0.98, 0, 0.45, 0.75],
  // Personal Services
  hair_salon: [-1.8, -0.9, 0, 0.45, 0.75],
  day_spa: [-1.8, -0.9, 0, 0.45, 0.75],
  tattoo: [-1.8, -0.9, 0, 0.45, 0.75],
  funeral_home: [-1.8, -0.9, 0, 0.45, 0.75],
  event_planning: [-1.8, -0.9, 0, 0.45, 0.75],
  photography: [-1.8, -0.9, 0, 0.45, 0.75],
  // Agriculture & Environmental
  landscaping_design: [-1.95, -1.05, 0, 0.45, 0.75],
  tree_service: [-1.5, -0.75, 0, 0.38, 0.6],
  environmental: [-1.95, -1.05, 0, 0.45, 0.75],
  waste_mgmt: [-1.5, -0.75, 0, 0.45, 0.75],
  irrigation: [-1.5, -0.75, 0, 0.38, 0.6],
  nursery: [-1.2, -0.6, 0, 0.3, 0.6],
  // Publishing & Media
  publishing: [-2.0, -1.0, 0, 0.6, 0.9],
  printing: [-1.8, -0.9, 0, 0.45, 0.75],
  // Other
  other: [-1.95, -0.98, 0, 0.45, 0.75],
}

// ── INDUSTRY METHODOLOGY NOTICES ────────────────────────────────────────────
// Group 1: EBITDA multiple is genuinely misleading as primary method
// Group 2: EBITDA works but material value components are often excluded
export const INDUSTRY_NOTICES: Record<string, { title: string; body: string }> = {
  saas: {
    title: 'SaaS businesses are typically not valued on an EBITDA multiple.',
    body: 'This tool uses an EBITDA multiple — the most common method for valuing profitable, owner-operated small businesses. For SaaS companies, however, the primary valuation framework is an ARR (Annual Recurring Revenue) multiple, typically ranging from 3x to 12x ARR depending on growth rate, net revenue retention, and churn. EBITDA can be negative or misleading in high-growth SaaS. That said, this tool is still useful — the Value Score, the factor analysis, and the improvement roadmap will help you identify exactly what drives enterprise value in your business. The valuation range shown is directional at best for your category.',
  },
  wealth_mgmt: {
    title: 'Wealth management and RIA firms are primarily valued on AUM, not EBITDA.',
    body: 'This tool uses an EBITDA multiple as its primary method. For RIAs and wealth management firms, the standard is an AUM (Assets Under Management) multiple — typically 1% to 3% of AUM — or a recurring revenue multiple applied to fee income. EBITDA is a secondary consideration and can materially understate or overstate value depending on the firm\'s cost structure. That said, this tool is still valuable — the Value Score and improvement roadmap will surface exactly which factors drive buyer confidence and premium pricing in your business.',
  },
  insurance_pc: {
    title: 'Insurance agencies are most commonly valued on a revenue or commission multiple, not EBITDA.',
    body: 'This tool uses an EBITDA multiple. For P&C and commercial insurance agencies, buyers typically apply a multiple of recurring commission revenue — often 1.5x to 3x — based on retention rate, book quality, and carrier relationships. Because commission income is highly recurring and EBITDA margins vary widely, revenue-based methods often produce a more accurate picture. This tool is still a strong directional guide — the value drivers and improvement roadmap apply directly to your business, and the EBITDA multiple provides a reasonable floor estimate.',
  },
  insurance_life: {
    title: 'Life and benefits agencies are most commonly valued on a revenue or commission multiple, not EBITDA.',
    body: 'This tool uses an EBITDA multiple. Life insurance and group benefits agencies are typically valued using a multiple of recurring commission revenue, with group benefits books — due to employer relationship stickiness — often commanding premiums. EBITDA margins can vary significantly based on how the owner structures compensation, making revenue-based methods more reliable. This tool still provides a directional valuation and will help you identify the factors that matter most to buyers in your category.',
  },
  mortgage: {
    title: 'Mortgage brokerages are difficult to value on a standard EBITDA multiple due to revenue cyclicality.',
    body: 'This tool uses an EBITDA multiple. Mortgage brokerages are highly interest-rate sensitive, and EBITDA can swing dramatically year to year. Buyers typically look at normalized revenue, purchase vs. refi mix, and pipeline strength rather than a simple EBITDA multiple. The result shown here should be treated as a rough order-of-magnitude estimate only. The value drivers analysis is still relevant — recurring purchase relationships, referral networks, and reduced owner dependency are all genuine value levers regardless of the valuation method used.',
  },
  law_pi: {
    title: 'Personal injury contingency practices are not accurately valued on a current EBITDA multiple.',
    body: 'This tool uses an EBITDA multiple. Contingency-based PI practices are typically valued using a case pipeline and historical settlement analysis — essentially a discounted expected value of the current case inventory — rather than a multiple of current EBITDA, which can be misleading depending on settlement timing. This tool is still useful for identifying improvement opportunities — reduced owner dependency, strong systems, and diversified referral networks are real value drivers in any legal practice — but the valuation range shown should be treated as directional only.',
  },
  auto_dealer_new: {
    title: 'New auto dealerships are not valued on an EBITDA multiple.',
    body: 'This tool uses an EBITDA multiple. New vehicle dealerships are valued using a completely different framework: Blue Sky value (the intangible value of the franchise and market position) plus Net Asset Value (inventory, real estate, equipment). EBITDA multiples are not the standard method and will not produce an accurate result for your business. The value drivers analysis is still applicable — strong systems, good financial records, and reduced owner dependency improve Blue Sky value and the overall attractiveness of the dealership to a buyer.',
  },
  cpa_accounting: {
    title: 'CPA and accounting firms are often valued on a revenue multiple, not EBITDA.',
    body: 'This tool uses an EBITDA multiple. Accounting practice acquisitions frequently use a revenue multiple — typically 0.8x to 1.3x of annual billings — applied to recurring client revenue rather than EBITDA, because margins vary significantly based on owner compensation structure. A well-run practice with strong recurring client relationships may be worth more on a revenue basis than an EBITDA-based estimate suggests. This estimate is still directionally useful, and the improvement roadmap — particularly around recurring revenue, financial records, and reduced owner dependency — applies directly to what buyers look for.',
  },
  real_estate_brokerage: {
    title: 'Real estate brokerages are typically valued on gross commission income, not EBITDA.',
    body: 'This tool uses an EBITDA multiple. Real estate brokerages are commonly valued using a multiple of Gross Commission Income (GCI) or recurring commercial leasing revenue, because agent-dependent brokerages are highly personal and EBITDA can be inconsistent year to year. The result shown here is a directional reference point, not a reliable estimate. The value drivers section is still highly relevant — reduced owner dependency, systems maturity, and durable commercial revenue are what separate a transferable brokerage from a book of personal relationships.',
  },
  ecommerce_branded: {
    title: 'E-commerce businesses may be valued using revenue or SDE multiples alongside EBITDA.',
    body: 'This tool uses an EBITDA multiple, which is appropriate for profitable, mature DTC brands. However, high-growth e-commerce businesses are often also valued on a revenue multiple or SDE (Seller\'s Discretionary Earnings) basis, with brand equity, customer LTV, and CAC trends factoring heavily into the final number. The estimate here is a reasonable baseline for a profitable brand. The value drivers analysis is directly applicable — customer concentration, recurring subscription revenue, and systems maturity are critical value levers in e-commerce.',
  },
  ecommerce_amazon: {
    title: 'Amazon FBA and marketplace businesses carry platform risk that EBITDA multiples may not fully reflect.',
    body: 'This tool uses an EBITDA multiple, which applies to profitable marketplace businesses. However, heavy dependence on a single platform introduces risk that can discount the multiple significantly — buyers apply a platform concentration discount not fully captured here. Diversification across channels (Shopify, direct, wholesale) materially improves value. The improvement roadmap is still directly applicable — customer diversification, brand registry strength, and financial record quality are real value drivers for marketplace businesses.',
  },
  dental_specialty: {
    title: 'Specialty dental practices may also be valued on a collections or revenue basis.',
    body: 'This tool uses an EBITDA multiple, which is used in dental M&A. Specialty practices — particularly orthodontics and oral surgery — are also commonly valued using a multiple of gross collections or production, especially by DSOs. The EBITDA estimate here is directionally reasonable, but a collections-based analysis may produce a different result depending on your procedure mix and overhead structure. The value drivers analysis applies directly — referral network strength, patient retention, and team depth are the primary levers for specialty dental value.',
  },
  security_systems: {
    title: 'Security monitoring businesses with RMR are often valued on a recurring revenue basis.',
    body: 'This tool uses an EBITDA multiple. Security businesses with meaningful Monthly Recurring Revenue (MRR or RMR) from monitoring contracts are frequently also valued using a multiple of RMR — sometimes 30x to 45x MRR — because the recurring stream is what buyers are paying for. If your monitoring RMR is significant, an RMR-based valuation may produce a materially different result. This estimate is still a useful directional baseline, and recurring revenue, customer retention, and systems maturity are the key drivers regardless of method.',
  },
  hospice: {
    title: 'Hospice and palliative care practices may be valued on a census or revenue basis by institutional buyers.',
    body: 'This tool uses an EBITDA multiple, which is one method used in healthcare M&A. PE and strategic buyers in hospice often use a revenue multiple or census-based model tied to ADC (Average Daily Census) and Medicare certification status. EBITDA can be volatile due to staffing costs, making revenue-based approaches more stable. The valuation here is directional, and the value drivers — particularly financial record quality, systems maturity, and operational data — are directly relevant to how acquirers diligence hospice practices.',
  },
  aba_autism: {
    title: 'ABA and autism services businesses are frequently valued on a revenue multiple due to rollup activity.',
    body: 'This tool uses an EBITDA multiple. Due to very active consolidation by PE platforms, ABA practices are increasingly valued using a revenue multiple — often 1.5x to 2.5x revenue — particularly for practices with strong insurance authorization breadth and BCBA staffing depth. EBITDA can understate value if margins are compressed by growth investment. The directional estimate here is useful, and the improvement roadmap — particularly owner dependency, systems, and financial records — maps directly to what ABA acquirers examine in diligence.',
  },
  assisted_living_large: {
    title: 'Larger assisted living communities often include a real estate component not captured in an EBITDA multiple.',
    body: 'This tool uses an EBITDA multiple on the operating business. For larger assisted living communities, the real estate is frequently owned separately and valued on a cap rate basis (NOI / cap rate) — which can represent a significant portion of total value not reflected here. If the real estate is included in the sale, a combined valuation methodology is needed. The operating business estimate here is directional, and the value drivers — occupancy, payer mix, and operational quality — directly affect both operating value and real estate value.',
  },
}

// ── INDUSTRY CATEGORY MAP (for display) ─────────────────────────────────────
const industryCategoryMap: Record<string, string> = {
  restaurant_full: 'Food & Beverage', restaurant_fast: 'Food & Beverage',
  catering: 'Food & Beverage', food_mfg: 'Food & Beverage', bakery: 'Food & Beverage',
  retail_general: 'Retail', retail_specialty: 'Retail', liquor_store: 'Retail',
  auto_parts: 'Retail', gas_station: 'Retail',
  ecommerce_branded: 'E-Commerce', ecommerce_amazon: 'E-Commerce',
  hvac: 'Home Services', plumbing: 'Home Services', electrical: 'Home Services',
  roofing: 'Construction', landscape_residential: 'Home Services',
  landscape_commercial: 'Home Services', pest_residential: 'Home Services',
  pest_commercial: 'Home Services', pool_service: 'Home Services',
  cleaning_residential: 'Home Services', cleaning_commercial: 'Home Services',
  security_systems: 'Home Services', painting: 'Home Services',
  junk_removal: 'Home Services', moving: 'Home Services',
  appliance_repair: 'Home Services',
  auto_repair: 'Automotive', auto_body: 'Automotive', car_wash: 'Automotive',
  auto_dealer_new: 'Automotive', auto_dealer_used: 'Automotive', auto_rental: 'Automotive',
  medical_primary: 'Healthcare', dental_general: 'Healthcare',
  dental_specialty: 'Healthcare', optometry: 'Healthcare', veterinary: 'Healthcare',
  physical_therapy: 'Healthcare', mental_health: 'Healthcare',
  aba_autism: 'Healthcare', med_spa: 'Healthcare', home_health: 'Healthcare',
  hospice: 'Healthcare', fitness: 'Health & Wellness', pharmacy: 'Healthcare',
  cpa_accounting: 'Professional Services', law_general: 'Professional Services',
  law_pi: 'Professional Services', engineering: 'Professional Services',
  marketing_agency: 'Professional Services',
  pr_firm: 'Professional Services', mgmt_consulting: 'Professional Services',
  staffing: 'Professional Services',
  insurance_pc: 'Financial Services', insurance_life: 'Financial Services',
  wealth_mgmt: 'Financial Services', mortgage: 'Financial Services',
  title_escrow: 'Financial Services', appraisal: 'Financial Services',
  saas: 'Technology', it_services: 'Technology', custom_software: 'Technology',
  tech_staffing: 'Technology', digital_marketing: 'Technology',
  cybersecurity: 'Technology', data_analytics: 'Technology',
  manufacturing: 'Manufacturing', mfg_specialty: 'Manufacturing',
  food_processing: 'Manufacturing', machine_shop: 'Manufacturing',
  distribution: 'Distribution', distribution_specialty: 'Distribution',
  industrial_services: 'Industrial Services',
  gc_commercial: 'Construction', gc_residential: 'Construction',
  contractor_mep: 'Construction', contractor_other: 'Construction',
  real_estate_brokerage: 'Real Estate', property_mgmt: 'Real Estate',
  real_estate_appraisal: 'Real Estate', commercial_cleaning: 'Facility Services',
  trucking_asset: 'Transportation', freight_brokerage: 'Transportation',
  last_mile: 'Transportation', moving_transport: 'Transportation',
  warehousing: 'Transportation', auto_transport: 'Transportation',
  childcare: 'Education', private_school: 'Education', tutoring: 'Education',
  vocational_school: 'Education', elearning: 'Education',
  assisted_living_small: 'Senior Care', assisted_living_large: 'Senior Care',
  home_care_private: 'Senior Care', adult_day: 'Senior Care',
  hair_salon: 'Personal Services', day_spa: 'Personal Services',
  tattoo: 'Personal Services', funeral_home: 'Personal Services',
  event_planning: 'Personal Services', photography: 'Personal Services',
  landscaping_design: 'Construction', tree_service: 'Home Services',
  environmental: 'Environmental Services', waste_mgmt: 'Environmental Services',
  irrigation: 'Home Services', nursery: 'Retail',
  publishing: 'Media', printing: 'Manufacturing',
  other: 'General Business Services',
}

// ── SLIDER ADJUSTMENT ARRAYS ────────────────────────────────────────────────
const growthAdj = [-1.0, -0.5, 0, 0.5, 1.2]
const recurringAdj = [-0.5, -0.2, 0.2, 0.6, 1.0]
const custConcAdj = [0.5, 0.2, -0.2, -0.7, -1.2]
const systemsAdj = [-0.6, -0.3, 0, 0.3, 0.7]
const finRecAdj = [-0.5, -0.2, 0, 0.2, 0.4]

// ── HELPERS ─────────────────────────────────────────────────────────────────

function clampDelta(adjArray: number[], currentIdx: number, maxLevels = 2): number {
  const targetIdx = Math.min(currentIdx - 1 + maxLevels, 4)
  return adjArray[targetIdx] - adjArray[currentIdx - 1]
}

type Factor = { name: string; level: string; description: string }

function makeGoodFactor(name: string, level: string, description: string): Factor {
  return { name, level, description }
}

function makeBadFactor(name: string, level: string, description: string): Factor {
  return { name, level, description }
}

// ── MAIN CALCULATION FUNCTION ───────────────────────────────────────────────

export function calculate(input: CalculateInput): CalculateResult {
  const {
    industry,
    years_in_business: years,
    revenue,
    ebitda,
    owner_salary: ownerSal,
    market_salary: marketSal,
    addbacks,
    sliders,
  } = input

  const { growth, owner_dep: ownerDep, recurring, cust_conc: custConc, systems, fin_records: finRec } = sliders

  // ── Compensation adjustment (can go negative) ──
  const compAdj = ownerSal - marketSal

  // ── Adjusted EBITDA ──
  const adjEBITDA = ebitda + compAdj + addbacks

  // ── Base multiple ──
  const baseMultiple = industryMultiples[industry] || 3.5

  // ── Slider adjustments ──
  let multipleAdj = 0
  const ownerDepAdj = ownerDepBySector[industry] || ownerDepBySector.other

  multipleAdj += growthAdj[growth - 1]
  multipleAdj += ownerDepAdj[ownerDep - 1]
  multipleAdj += recurringAdj[recurring - 1]
  multipleAdj += custConcAdj[custConc - 1]
  multipleAdj += systemsAdj[systems - 1]
  multipleAdj += finRecAdj[finRec - 1]

  // ── Years bonus — flat absolute multiple bump ──
  let yearsBonus = 0
  if (years >= 10) yearsBonus = 0.3
  else if (years >= 5) yearsBonus = 0.1
  multipleAdj += yearsBonus

  // ── Revenue scale bonus ──
  let revenueBonus = 0
  if (revenue >= 15_000_000) revenueBonus = 1.0
  else if (revenue >= 5_000_000) revenueBonus = 0.5
  multipleAdj += revenueBonus

  // ── Final multiple (floor at 1.0x) ──
  const finalMultiple = Math.max(1.0, baseMultiple + multipleAdj)

  // ── Valuation range ──
  const baseVal = adjEBITDA * finalMultiple
  const lowVal = baseVal * 0.85
  const highVal = baseVal * 1.15

  // ── Trajectory projection ──
  const factorImpacts = [
    { name: 'Reduce owner dependency & build management team', delta: clampDelta(ownerDepAdj, ownerDep), poor: ownerDep <= 3 },
    { name: 'Build recurring revenue', delta: clampDelta(recurringAdj, recurring), poor: recurring <= 3 },
    { name: 'Diversify customer base', delta: clampDelta(custConcAdj.slice().reverse(), 6 - custConc), poor: custConc >= 3 },
    { name: 'Document systems & processes', delta: clampDelta(systemsAdj, systems), poor: systems <= 3 },
    { name: 'Clean up financial records', delta: clampDelta(finRecAdj, finRec), poor: finRec <= 3 },
    { name: 'Improve revenue growth', delta: clampDelta(growthAdj, growth), poor: growth <= 3 },
  ]
    .filter(f => f.poor && f.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 2)

  const trajMultipleGain = factorImpacts.reduce((sum, f) => sum + f.delta, 0)
  const trajMultiple = Math.max(finalMultiple, Math.min(finalMultiple + trajMultipleGain, baseMultiple + 3.5))
  const trajVal = adjEBITDA * trajMultiple
  const trajUplift = trajVal - baseVal

  // Level names for trajectory display
  const sliderLevels = ['Very Low', 'Low', 'Moderate', 'High', 'Very High']

  const topFactors = factorImpacts.map(f => {
    // Determine current and target slider indices for display
    let currentSliderVal: number
    let targetSliderVal: number

    if (f.name.includes('owner dependency')) {
      currentSliderVal = ownerDep
      targetSliderVal = Math.min(ownerDep + 2, 5)
    } else if (f.name.includes('recurring')) {
      currentSliderVal = recurring
      targetSliderVal = Math.min(recurring + 2, 5)
    } else if (f.name.includes('customer base')) {
      currentSliderVal = custConc
      // For cust conc, improvement means going lower
      targetSliderVal = Math.max(custConc - 2, 1)
    } else if (f.name.includes('systems')) {
      currentSliderVal = systems
      targetSliderVal = Math.min(systems + 2, 5)
    } else if (f.name.includes('financial')) {
      currentSliderVal = finRec
      targetSliderVal = Math.min(finRec + 2, 5)
    } else {
      currentSliderVal = growth
      targetSliderVal = Math.min(growth + 2, 5)
    }

    return {
      name: f.name,
      current_level: sliderLevels[currentSliderVal - 1],
      target_level: sliderLevels[targetSliderVal - 1],
      delta: Number(f.delta.toFixed(2)),
    }
  })

  // ── Score (purely slider-driven, no margin bonus) ──
  let score = 50
  score += growthAdj[growth - 1] * 11
  score += ownerDepAdj[ownerDep - 1] * 12
  score += recurringAdj[recurring - 1] * 11
  score += custConcAdj[custConc - 1] * 9
  score += systemsAdj[systems - 1] * 9
  score += finRecAdj[finRec - 1] * 7
  if (years >= 10) score += 5
  score = Math.min(100, Math.max(10, Math.round(score)))

  // ── Good / bad factors ──
  const goodFactors: Factor[] = []
  const badFactors: Factor[] = []

  // Growth
  if (growth >= 4) goodFactors.push(makeGoodFactor('Revenue Growth', 'Strong', 'Strong revenue growth signals momentum to buyers'))
  else if (growth <= 2) badFactors.push(makeBadFactor('Revenue Growth', 'Weak', 'Flat or declining revenue reduces buyer confidence'))
  else badFactors.push(makeBadFactor('Revenue Growth', 'Moderate', 'Moving sales growth beyond low single percentages will attract more buyers'))

  // Owner dependency
  if (ownerDep >= 4) goodFactors.push(makeGoodFactor('Owner Dependency', 'Low', 'Low owner dependency/strong management means the business can run without you'))
  else if (ownerDep <= 2) badFactors.push(makeBadFactor('Owner Dependency', 'High', 'High owner dependency/thin management creates transition risk for buyers'))
  else badFactors.push(makeBadFactor('Owner Dependency', 'Moderate', 'Less owner dependence or stronger management staff will increase buyer confidence and value'))

  // Recurring revenue
  if (recurring >= 4) goodFactors.push(makeGoodFactor('Recurring Revenue', 'High', 'High recurring revenue increases predictability and value'))
  else if (recurring <= 2) badFactors.push(makeBadFactor('Recurring Revenue', 'Low', 'Low recurring revenue means less predictable future cash flow'))
  else badFactors.push(makeBadFactor('Recurring Revenue', 'Moderate', 'Higher recurring revenue will increase buyer confidence and valuation multiple'))

  // Customer concentration
  if (custConc <= 2) goodFactors.push(makeGoodFactor('Customer Concentration', 'Low', 'Diversified customer base reduces revenue concentration risk'))
  else if (custConc >= 4) badFactors.push(makeBadFactor('Customer Concentration', 'High', 'High customer concentration is a significant risk factor'))
  else badFactors.push(makeBadFactor('Customer Concentration', 'Moderate', 'Lower customer concentration is better for valuation \u2014 reducing reliance on a single customer reduces buyer risk'))

  // Systems
  if (systems >= 4) goodFactors.push(makeGoodFactor('Systems & Processes', 'Strong', 'Well-documented systems/processes and strong software platform to manage data make the business transferable'))
  else if (systems <= 2) badFactors.push(makeBadFactor('Systems & Processes', 'Weak', 'Lack of systems, processes, and seamless access to electronically-stored data are taken as additional costs to a buyer'))
  else badFactors.push(makeBadFactor('Systems & Processes', 'Moderate', 'Better systems, processes, and use of software to manage data will improve valuation'))

  // Financial records
  if (finRec >= 4) goodFactors.push(makeGoodFactor('Financial Records', 'Strong', 'Accurate, well-organized financials and underlying operational data build buyer confidence and reduce perceived risk'))
  else if (finRec <= 2) badFactors.push(makeBadFactor('Financial Records', 'Weak', 'Poor financial record quality and incomplete operational data records will create friction in due diligence'))
  else badFactors.push(makeBadFactor('Financial Records', 'Moderate', 'Cleaner financials and more complete operational data records will increase buyer confidence and valuation multiple'))

  // Years in business
  if (years >= 10) goodFactors.push(makeGoodFactor('Operating History', `${years} Years`, `${years} years of operating history demonstrates durability`))

  // ── VIP Recommendations ──
  const recDeltas: Record<string, number> = {
    finRec: clampDelta(finRecAdj, finRec),
    growth: clampDelta(growthAdj, growth),
    systems: clampDelta(systemsAdj, systems),
    recurring: clampDelta(recurringAdj, recurring),
    custConc: clampDelta(custConcAdj.slice().reverse(), 6 - custConc),
    ownerDep: clampDelta(ownerDepAdj, ownerDep),
  }

  const allRecs = [
    // Poor level triggers
    {
      trigger: finRec <= 2, factor: 'finRec',
      title: 'Get Your Financials and Underlying Operational Data in Order',
      body: 'Clean, well-organized financials are one of the highest-ROI improvements you can make before a sale. Buyers will scrutinize multiple years of results \u2014 unclear or inconsistent records create doubt, and doubt reduces value or delays closing. Start with monthly P&L reviews, clean up your chart of accounts, and work toward CPA-reviewed financials. In parallel, improve the quality and completeness of your underlying operational data \u2014 including customer sales history, purchase records, and inventory tracking (if applicable). Ensure this data is accurate, accessible, and tied to your financial results. When financials and operational data align, buyers can validate performance more easily, increasing confidence and reducing perceived risk.',
    },
    {
      trigger: growth <= 2, factor: 'growth',
      title: 'Build a Pricing/Margin Strategy and Focus on Growth',
      body: 'Flat or declining revenue is one of the largest valuation discounts buyers apply. It raises concerns about competitiveness, demand, and future earnings potential. Start by evaluating pricing to ensure it reflects the value you deliver. Even modest price increases can have an outsized impact on EBITDA. For example, a 5% price increase on $3M of revenue with 10% margins increases EBITDA by roughly 50% \u2014 with no additional cost. Beyond pricing, focus on rebuilding a consistent growth engine. Identify your most effective customer acquisition channels, strengthen your sales process, and re-engage existing customers. Even modest, sustained growth materially improves buyer confidence and valuation.',
    },
    {
      trigger: systems <= 2, factor: 'systems',
      title: 'Improve Your Systems and Process Orientation',
      body: 'Standard operating procedures for your core workflows make your business more transferable and reduce buyer risk. Start with the 5 to 10 processes most critical to revenue delivery. Document and pair these processes with the right systems \u2014 CRM, ERP, or POS \u2014 so they are consistently executed, measurable, and not dependent on individuals. Focus first on capturing reliable data around customers, sales activity, and operations. Centralized, well-organized data improves visibility, supports better decision-making, and increases buyer confidence during diligence. As a result, owner dependency declines as a natural byproduct \u2014 two problems, one solution.',
    },
    {
      trigger: recurring <= 2, factor: 'recurring',
      title: 'Build Recurring Revenue and Strengthen Customer Retention',
      body: 'Recurring revenue \u2014 whether through contracts, subscriptions, or a loyal, repeat customer base \u2014 is valued at a higher multiple because it is predictable and reduces buyer risk. Start by identifying your most consistent customers and the products or services they purchase regularly. Where appropriate, introduce simple agreements such as annual contracts, service plans, or maintenance programs. At the same time, focus on strengthening customer retention through consistent service, communication, and value delivery. Even without formal contracts, a stable and loyal customer base that generates repeat business can meaningfully improve visibility into future revenue and support a higher valuation.',
    },
    {
      trigger: custConc >= 4, factor: 'custConc',
      title: 'Diversify Your Customer Base',
      body: 'When one customer represents more than ~20% of revenue, buyers apply a meaningful discount due to concentration risk. Build a deliberate new business development effort to diversify your customer base. At the same time, evaluate the stability of your largest relationships \u2014 including contract terms, duration, and likelihood of retention. Set a clear target: reduce reliance on any single customer over time. Even partial progress can meaningfully improve perceived stability and valuation.',
    },
    {
      trigger: ownerDep <= 2, factor: 'ownerDep',
      title: 'Reduce Owner Dependency & Build Management Depth',
      body: 'High owner dependency is a structural issue that takes time to address \u2014 but starting early makes it achievable and materially improves value. Begin by documenting key processes and decisions currently handled by the owner. Identify 1\u20132 employees with leadership potential and begin delegating meaningful responsibility to them, including customer relationships, operations, or financial oversight. Focus on gradually shifting day-to-day decision-making away from the owner while building confidence and accountability within the team. Even partial progress \u2014 where the business can operate for periods without the owner \u2014 reduces risk and increases buyer confidence. Ownership dependency can also be mitigated if the owner is willing to stay on for a period to smooth the transition to new ownership.',
    },
    // Neutral level triggers
    {
      trigger: finRec === 3, factor: 'finRec',
      title: 'Improve Quality of Financials and Underlying Operational Data',
      body: 'Your financial records and operational data likely provide a solid foundation. The opportunity is to improve consistency, depth, and alignment between them. Focus on producing timely, reliable monthly financials and refining your chart of accounts to better reflect how the business operates. At the same time, strengthen the organization and usability of your operational data \u2014 such as customer-level sales history, purchasing trends, and inventory records \u2014 and ensure it ties cleanly to your financial reporting. Better alignment between financial and operational data improves visibility, supports more informed decision-making, and makes the business easier for a buyer to diligence and operate.',
    },
    {
      trigger: systems === 3, factor: 'systems',
      title: 'Deepen Your Systems and Process Orientation',
      body: 'Your business likely has some core processes and systems in place. The opportunity is to further standardize and integrate them to improve consistency, visibility, and scalability. Focus on tightening documentation around key workflows and ensuring your systems (CRM, ERP, POS) are fully utilized and connected. Look for gaps in data capture, reporting, and cross-functional visibility \u2014 particularly across sales, operations, and financial performance. Strengthening alignment between processes and systems will improve efficiency, enhance decision-making, and make the business easier for a buyer to understand and operate.',
    },
    {
      trigger: growth === 3, factor: 'growth',
      title: 'Refine Pricing/Margin Strategy & Improve Visibility into Growth Metrics',
      body: 'Your business demonstrates a modest level of growth. The opportunity is to make that growth more consistent, measurable, and repeatable. Focus on refining pricing strategy, improving sales execution, and identifying the most effective drivers of new and repeat revenue. Strengthen visibility into key metrics such as customer acquisition, retention, and average revenue per customer. More consistent and predictable growth \u2014 even at moderate levels \u2014 increases buyer confidence and supports higher valuation multiples.',
    },
    {
      trigger: custConc === 3, factor: 'custConc',
      title: 'Improve Diversification in Your Customer Base',
      body: 'Look to reduce customer concentration \u2014 further diversification can improve stability and buyer confidence. Focus on steadily expanding your customer base while maintaining strong relationships with key accounts. Monitor concentration levels over time and ensure no single customer remains or becomes disproportionately important. Where appropriate, strengthen visibility into customer-level revenue and retention, and consider contract structures that improve continuity. A balanced and well-understood customer base reduces risk and supports higher valuation multiples.',
    },
    {
      trigger: ownerDep === 3, factor: 'ownerDep',
      title: 'Reduce Owner Dependency & Strengthen Management Depth',
      body: 'Your business has some level of management support in place. The opportunity is to further develop and formalize the team to reduce reliance on the owner and improve scalability. Clarify roles, responsibilities, and decision authority across key functions. Continue developing internal leaders and ensure they are accountable for results in areas such as sales, operations, and finance. Where appropriate, formalize reporting structures, performance expectations, and regular management reviews. A business with a capable, accountable management team that can operate independently is more transferable and commands a higher valuation.',
    },
    {
      trigger: recurring === 3, factor: 'recurring',
      title: 'Increase Consistency and Visibility of Recurring Revenue',
      body: 'Your business benefits from some level of repeat or recurring revenue \u2014 either through contracts or a loyal customer base. The opportunity is to increase its consistency, visibility, and durability. Focus on converting repeat business into more structured arrangements where appropriate, while also strengthening customer retention and engagement. Improve visibility into key metrics such as repeat purchase behavior, customer concentration, and revenue consistency over time. Increasing the percentage of revenue that is either contractually committed or highly repeatable enhances predictability and supports higher valuation multiples.',
    },
  ]

  const recs = allRecs
    .filter(r => r.trigger)
    .sort((a, b) => (recDeltas[b.factor] || 0) - (recDeltas[a.factor] || 0))
    .slice(0, 3)

  if (recs.length < 3) {
    const fillers = [
      { title: 'Review and Optimize Your Pricing', body: 'Many small businesses have not raised prices in years and are leaving significant margin on the table. Conduct a pricing audit: compare your rates to the market, identify your highest-margin offerings, and build a case for increases where your value justifies it.' },
      { title: 'Start Your Exit Preparation Now', body: 'The businesses that achieve the best exits are those that prepared 2 to 3 years in advance. Use this window to address your specific weak spots, build clean financial history, and position your business as a premium asset when the time comes.' },
    ]
    fillers.forEach(f => { if (recs.length < 3) recs.push(f as typeof recs[0]) })
  }

  // ── Score band ──
  let scoreBand: string
  let scoreBandDescription: string
  if (score >= 80) {
    scoreBand = 'Excellent'
    scoreBandDescription = 'Excellent \u2014 your business is well-positioned for a premium exit.'
  } else if (score >= 65) {
    scoreBand = 'Good'
    scoreBandDescription = 'Good \u2014 solid fundamentals with specific opportunities to increase value.'
  } else if (score >= 50) {
    scoreBand = 'Fair'
    scoreBandDescription = 'Fair \u2014 meaningful improvements could significantly lift your valuation.'
  } else {
    scoreBand = 'Developing'
    scoreBandDescription = 'Developing \u2014 there are clear steps that could substantially increase what buyers will pay.'
  }

  // ── Methodology notice ──
  const notice = INDUSTRY_NOTICES[industry]
  const methodologyNotice = notice ? notice.body : null

  // ── Industry category ──
  const industryCategory = industryCategoryMap[industry] || 'General Business Services'

  return {
    adj_ebitda: adjEBITDA,
    base_multiple: baseMultiple,
    estimated_multiple: Number(finalMultiple.toFixed(2)),
    years_bonus: Number(yearsBonus.toFixed(3)),
    revenue_scale_bonus: revenueBonus,
    valuation_low: Math.round(lowVal),
    valuation_base: Math.round(baseVal),
    valuation_high: Math.round(highVal),
    value_score: score,
    score_band: scoreBand,
    score_band_description: scoreBandDescription,
    good_factors: goodFactors,
    bad_factors: badFactors,
    trajectory: {
      uplift_amount: Math.round(trajUplift),
      new_valuation_low: Math.round(lowVal + trajUplift * 0.85),
      new_valuation_base: Math.round(baseVal + trajUplift),
      new_valuation_high: Math.round(highVal + trajUplift * 1.15),
      top_factors: topFactors,
    },
    vip_recommendations: recs.map(r => ({ title: r.title, body: r.body })),
    methodology_notice: methodologyNotice,
    industry_category: industryCategory,
  }
}
