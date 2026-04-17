/**
 * EdgeFour Value — client UI module.
 * Extracted from inline <script> to match reference HTML behavior.
 * Calculation is delegated to the backend API via api.js.
 */
import {
  saveSession as apiSaveSession,
  saveStep1 as apiSaveStep1,
  calculate as apiCalculate,
  saveValuation as apiSaveValuation,
  submitQuiz as apiSubmitQuiz,
  trackEvent as apiTrackEvent,
} from './api.js';

// ---- SLIDER LABELS ----
const growthLabels    = ['Declining (< 0%)','Flat (0–2%)','Stable (2–5%)','Growing (5–15%)','Hypergrowth (15%+)'];
const ownerDepLabels  = ['Just owner(s); difficult to leave','Owner(s) rarely away, but 1–2 senior staff','Some management leadership, but owner(s) make most decisions','Experienced team; key staff lead','Strong non-owner leadership; business runs without owner(s)'];
const recurringLabels = ['< 10%','10–25%','25–50%','50–75%','75%+ recurring'];
const custConcLabels  = ['< 5% (spread out)','5–10%','10–25%','25–50%','> 50% (high risk)'];
const systemsLabels   = ['None documented; no software systems','Basic notes','Partially documented; some use of software systems','Most processes documented; software systems in place','Full SOPs + training; extensive use of software platform'];
// mgmtLabels removed — combined into ownerDepLabels
const finRecordsLabels= ['Unclear / messy','Basic bookkeeping & customer records','Adequate bookkeeping & customer records','Clean QuickBooks/CPA; most underlying operational data available','Reviewed or audited financials; complete underlying operational data'];

function updateSliderLabel(sliderId, displayId, labels) {
  const val = parseInt(document.getElementById(sliderId).value);
  document.getElementById(displayId).textContent = labels[val - 1];
}

// Init all sliders
updateSliderLabel('growth','growth-display',growthLabels);
updateSliderLabel('owner-dep','owner-dep-display',ownerDepLabels);
updateSliderLabel('recurring','recurring-display',recurringLabels);
updateSliderLabel('cust-conc','cust-conc-display',custConcLabels);
updateSliderLabel('systems','systems-display',systemsLabels);
updateSliderLabel('fin-records','fin-records-display',finRecordsLabels);

// ---- NAVIGATION ----
const steps = { 'section-biz-info':1, 'section-financials':2, 'section-value-drivers':3, 'section-results':4, 'section-vip-quiz':5, 'section-vip-snapshot':6 };

// ---- EVENT TRACKING ----
let _stepEnteredAt = Date.now();
const _sectionToStep = {
  'section-landing': 'landing', 'section-biz-info': 'business_info',
  'section-financials': 'financials', 'section-value-drivers': 'value_drivers',
  'section-results': 'results', 'section-vip-quiz': 'quiz', 'section-vip-snapshot': 'snapshot',
};

function trackEvent(data) {
  apiTrackEvent({ session_id: getOrCreateSessionId(), ...data });
}

function goTo(sectionId) {
  // Track navigation: what step they came from and how long they spent
  const prevStep = _sectionToStep[_activeSection] || 'landing';
  const nextStep = _sectionToStep[sectionId] || sectionId;
  const duration = Math.max(0, Math.round((Date.now() - _stepEnteredAt) / 1000));
  const isBack = (steps[sectionId] || 0) < (steps[_activeSection] || 0);
  trackEvent({
    event_type: isBack ? 'step_back' : 'step_advance',
    step: nextStep,
    duration_seconds: duration,
  });
  _stepEnteredAt = Date.now();

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateProgress(sectionId);
}

// Track the active section so progressGoBack() knows where to go
let _activeSection = 'section-landing';

// ---- FIELD-LEVEL TRACKING ----
// Debounce helper for slider tracking
function _debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// Module scripts are deferred — DOM is ready when this runs
(function() {
  // Track text/number field changes on blur
  const fieldStepMap = {
    'biz-name': 'business_info', industry: 'business_info', city: 'business_info',
    years: 'business_info', employees: 'business_info',
    revenue: 'financials', ebitda: 'financials', 'owner-salary': 'financials',
    'market-salary': 'financials', addbacks: 'financials',
    'g-earnings': 'financials', 'g-interest': 'financials', 'g-taxes': 'financials', 'g-da': 'financials',
  };
  for (const [id, step] of Object.entries(fieldStepMap)) {
    const el = document.getElementById(id);
    if (!el) continue;
    const evtType = el.tagName === 'SELECT' ? 'change' : 'blur';
    el.addEventListener(evtType, () => {
      trackEvent({ event_type: 'field_change', field_name: id, new_value: el.value, step });
    });
  }
  // Track state custom dropdown
  const stateVal = document.getElementById('state-value');
  if (stateVal) {
    new MutationObserver(() => {
      if (stateVal.value) trackEvent({ event_type: 'field_change', field_name: 'state', new_value: stateVal.value, step: 'business_info' });
    }).observe(stateVal, { attributes: true, attributeFilter: ['value'] });
  }
  // Track slider changes (debounced)
  ['growth','owner-dep','recurring','cust-conc','systems','fin-records'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', _debounce(() => {
      trackEvent({ event_type: 'field_change', field_name: id, new_value: el.value, step: 'value_drivers' });
    }, 500));
  });
});

function updateProgress(sectionId) {
  _activeSection = sectionId;
  const prog = document.getElementById('progress-container');
  const fill = document.getElementById('progress-fill');
  const label = document.getElementById('progress-label');
  const backBtn = document.getElementById('progress-back-btn');

  if (sectionId === 'section-landing') {
    prog.classList.remove('show');
    if (backBtn) backBtn.classList.remove('visible');
    return;
  }

  prog.classList.add('show');

  // Show back button on all screens except landing and first step
  if (backBtn) {
    if (sectionId === 'section-biz-info') {
      // First step — back goes to landing, still useful to show it
      backBtn.classList.add('visible');
    } else {
      backBtn.classList.add('visible');
    }
  }

  if (sectionId === 'section-results') {
    fill.style.width = '100%';
    label.textContent = 'Valuation Complete';
  } else if (sectionId === 'section-vip-quiz') {
    fill.style.width = '100%';
    label.textContent = 'Improvement Plan';
  } else if (sectionId === 'section-vip-snapshot') {
    fill.style.width = '100%';
    label.textContent = 'Plan Ready ◆';
  } else {
    const step = steps[sectionId] || 1;
    fill.style.width = ((step / 3) * 100) + '%';
    label.textContent = `Step ${step} of 3`;
  }
}

// Smart back navigation from the progress bar
function progressGoBack() {
  const backMap = {
    'section-biz-info':       'section-landing',
    'section-financials':     'section-biz-info',
    'section-value-drivers':  'section-financials',
    'section-results':        'section-value-drivers',
    'section-vip-quiz':       'section-results',
    'section-vip-snapshot':   'section-results',
  };
  const dest = backMap[_activeSection];
  if (dest) goTo(dest);
}

function nextStep(fromSection, toSection, requiredFields) {
  let valid = true;
  requiredFields.forEach(id => {
    const el = document.getElementById(id);
    const group = el.closest('.field-group');
    if (!el.value || el.value.trim() === '') {
      group.classList.add('field-error');
      let err = group.querySelector('.error-msg');
      if (!err) {
        err = document.createElement('span');
        err.className = 'error-msg';
        err.textContent = 'This field is required.';
        group.appendChild(err);
      }
      err.style.display = 'block';
      valid = false;
    } else {
      group.classList.remove('field-error');
      const err = group.querySelector('.error-msg');
      if (err) err.style.display = 'none';
    }
  });
  if (valid) goTo(toSection);
}

// ---- CALCULATE ----

// ── INDUSTRY METHODOLOGY NOTICE ─────────────────────────────────────────────
// Group 1: EBITDA multiple is genuinely misleading as primary method
// Group 2: EBITDA works but material value components are often excluded
const INDUSTRY_NOTICES = {

  // ── GROUP 1: Different primary framework ────────────────────────────────────
  saas: {
    title: 'SaaS businesses are typically not valued on an EBITDA multiple.',
    body: `This tool uses an <strong>EBITDA multiple</strong> — the most common method for valuing profitable, owner-operated small businesses. For SaaS companies, however, the primary valuation framework is an <strong>ARR (Annual Recurring Revenue) multiple</strong>, typically ranging from 3x to 12x ARR depending on growth rate, net revenue retention, and churn. EBITDA can be negative or misleading in high-growth SaaS. <em>That said, this tool is still useful — the Value Score, the factor analysis, and the improvement roadmap will help you identify exactly what drives enterprise value in your business. The valuation range shown is directional at best for your category.</em>`
  },
  wealth_mgmt: {
    title: 'Wealth management and RIA firms are primarily valued on AUM, not EBITDA.',
    body: `This tool uses an <strong>EBITDA multiple</strong> as its primary method. For RIAs and wealth management firms, the standard is an <strong>AUM (Assets Under Management) multiple</strong> — typically 1% to 3% of AUM — or a recurring revenue multiple applied to fee income. EBITDA is a secondary consideration and can materially understate or overstate value depending on the firm's cost structure. <em>That said, this tool is still valuable — the Value Score and improvement roadmap will surface exactly which factors drive buyer confidence and premium pricing in your business.</em>`
  },
  insurance_pc: {
    title: 'Insurance agencies are most commonly valued on a revenue or commission multiple, not EBITDA.',
    body: `This tool uses an <strong>EBITDA multiple</strong>. For P&C and commercial insurance agencies, buyers typically apply a <strong>multiple of recurring commission revenue</strong> — often 1.5x to 3x — based on retention rate, book quality, and carrier relationships. Because commission income is highly recurring and EBITDA margins vary widely, revenue-based methods often produce a more accurate picture. <em>This tool is still a strong directional guide — the value drivers and improvement roadmap apply directly to your business, and the EBITDA multiple provides a reasonable floor estimate.</em>`
  },
  insurance_life: {
    title: 'Life and benefits agencies are most commonly valued on a revenue or commission multiple, not EBITDA.',
    body: `This tool uses an <strong>EBITDA multiple</strong>. Life insurance and group benefits agencies are typically valued using a <strong>multiple of recurring commission revenue</strong>, with group benefits books — due to employer relationship stickiness — often commanding premiums. EBITDA margins can vary significantly based on how the owner structures compensation, making revenue-based methods more reliable. <em>This tool still provides a directional valuation and will help you identify the factors that matter most to buyers in your category.</em>`
  },
  mortgage: {
    title: 'Mortgage brokerages are difficult to value on a standard EBITDA multiple due to revenue cyclicality.',
    body: `This tool uses an <strong>EBITDA multiple</strong>. Mortgage brokerages are highly interest-rate sensitive, and EBITDA can swing dramatically year to year. Buyers typically look at <strong>normalized revenue, purchase vs. refi mix, and pipeline strength</strong> rather than a simple EBITDA multiple. The result shown here should be treated as a rough order-of-magnitude estimate only. <em>The value drivers analysis is still relevant — recurring purchase relationships, referral networks, and reduced owner dependency are all genuine value levers regardless of the valuation method used.</em>`
  },
  law_pi: {
    title: 'Personal injury contingency practices are not accurately valued on a current EBITDA multiple.',
    body: `This tool uses an <strong>EBITDA multiple</strong>. Contingency-based PI practices are typically valued using a <strong>case pipeline and historical settlement analysis</strong> — essentially a discounted expected value of the current case inventory — rather than a multiple of current EBITDA, which can be misleading depending on settlement timing. <em>This tool is still useful for identifying improvement opportunities — reduced owner dependency, strong systems, and diversified referral networks are real value drivers in any legal practice — but the valuation range shown should be treated as directional only.</em>`
  },
  auto_dealer_new: {
    title: 'New auto dealerships are not valued on an EBITDA multiple.',
    body: `This tool uses an <strong>EBITDA multiple</strong>. New vehicle dealerships are valued using a completely different framework: <strong>Blue Sky value</strong> (the intangible value of the franchise and market position) plus <strong>Net Asset Value</strong> (inventory, real estate, equipment). EBITDA multiples are not the standard method and will not produce an accurate result for your business. <em>The value drivers analysis is still applicable — strong systems, good financial records, and reduced owner dependency improve Blue Sky value and the overall attractiveness of the dealership to a buyer.</em>`
  },
  cpa_accounting: {
    title: 'CPA and accounting firms are often valued on a revenue multiple, not EBITDA.',
    body: `This tool uses an <strong>EBITDA multiple</strong>. Accounting practice acquisitions frequently use a <strong>revenue multiple</strong> — typically 0.8x to 1.3x of annual billings — applied to recurring client revenue rather than EBITDA, because margins vary significantly based on owner compensation structure. A well-run practice with strong recurring client relationships may be worth more on a revenue basis than an EBITDA-based estimate suggests. <em>This estimate is still directionally useful, and the improvement roadmap — particularly around recurring revenue, financial records, and reduced owner dependency — applies directly to what buyers look for.</em>`
  },
  real_estate_brokerage: {
    title: 'Real estate brokerages are typically valued on gross commission income, not EBITDA.',
    body: `This tool uses an <strong>EBITDA multiple</strong>. Real estate brokerages are commonly valued using a <strong>multiple of Gross Commission Income (GCI)</strong> or recurring commercial leasing revenue, because agent-dependent brokerages are highly personal and EBITDA can be inconsistent year to year. The result shown here is a directional reference point, not a reliable estimate. <em>The value drivers section is still highly relevant — reduced owner dependency, systems maturity, and durable commercial revenue are what separate a transferable brokerage from a book of personal relationships.</em>`
  },

  // ── GROUP 2: EBITDA works but material components often excluded ─────────────
  ecommerce_branded: {
    title: 'E-commerce businesses may be valued using revenue or SDE multiples alongside EBITDA.',
    body: `This tool uses an <strong>EBITDA multiple</strong>, which is appropriate for profitable, mature DTC brands. However, high-growth e-commerce businesses are often also valued on a <strong>revenue multiple</strong> or <strong>SDE (Seller's Discretionary Earnings)</strong> basis, with brand equity, customer LTV, and CAC trends factoring heavily into the final number. The estimate here is a reasonable baseline for a profitable brand. <em>The value drivers analysis is directly applicable — customer concentration, recurring subscription revenue, and systems maturity are critical value levers in e-commerce.</em>`
  },
  ecommerce_amazon: {
    title: 'Amazon FBA and marketplace businesses carry platform risk that EBITDA multiples may not fully reflect.',
    body: `This tool uses an <strong>EBITDA multiple</strong>, which applies to profitable marketplace businesses. However, heavy dependence on a single platform introduces risk that can discount the multiple significantly — buyers apply a <strong>platform concentration discount</strong> not fully captured here. Diversification across channels (Shopify, direct, wholesale) materially improves value. <em>The improvement roadmap is still directly applicable — customer diversification, brand registry strength, and financial record quality are real value drivers for marketplace businesses.</em>`
  },
  dental_specialty: {
    title: 'Specialty dental practices may also be valued on a collections or revenue basis.',
    body: `This tool uses an <strong>EBITDA multiple</strong>, which is used in dental M&A. Specialty practices — particularly orthodontics and oral surgery — are also commonly valued using a <strong>multiple of gross collections</strong> or production, especially by DSOs. The EBITDA estimate here is directionally reasonable, but a collections-based analysis may produce a different result depending on your procedure mix and overhead structure. <em>The value drivers analysis applies directly — referral network strength, patient retention, and team depth are the primary levers for specialty dental value.</em>`
  },
  security_systems: {
    title: 'Security monitoring businesses with RMR are often valued on a recurring revenue basis.',
    body: `This tool uses an <strong>EBITDA multiple</strong>. Security businesses with meaningful Monthly Recurring Revenue (MRR or RMR) from monitoring contracts are frequently also valued using a <strong>multiple of RMR</strong> — sometimes 30x to 45x MRR — because the recurring stream is what buyers are paying for. If your monitoring RMR is significant, an RMR-based valuation may produce a materially different result. <em>This estimate is still a useful directional baseline, and recurring revenue, customer retention, and systems maturity are the key drivers regardless of method.</em>`
  },
  hospice: {
    title: 'Hospice and palliative care practices may be valued on a census or revenue basis by institutional buyers.',
    body: `This tool uses an <strong>EBITDA multiple</strong>, which is one method used in healthcare M&A. PE and strategic buyers in hospice often use a <strong>revenue multiple or census-based model</strong> tied to ADC (Average Daily Census) and Medicare certification status. EBITDA can be volatile due to staffing costs, making revenue-based approaches more stable. <em>The valuation here is directional, and the value drivers — particularly financial record quality, systems maturity, and operational data — are directly relevant to how acquirers diligence hospice practices.</em>`
  },
  aba_autism: {
    title: 'ABA and autism services businesses are frequently valued on a revenue multiple due to rollup activity.',
    body: `This tool uses an <strong>EBITDA multiple</strong>. Due to very active consolidation by PE platforms, ABA practices are increasingly valued using a <strong>revenue multiple</strong> — often 1.5x to 2.5x revenue — particularly for practices with strong insurance authorization breadth and BCBA staffing depth. EBITDA can understate value if margins are compressed by growth investment. <em>The directional estimate here is useful, and the improvement roadmap — particularly owner dependency, systems, and financial records — maps directly to what ABA acquirers examine in diligence.</em>`
  },
  assisted_living_large: {
    title: 'Larger assisted living communities often include a real estate component not captured in an EBITDA multiple.',
    body: `This tool uses an <strong>EBITDA multiple</strong> on the operating business. For larger assisted living communities, the real estate is frequently owned separately and valued on a <strong>cap rate basis</strong> (NOI / cap rate) — which can represent a significant portion of total value not reflected here. If the real estate is included in the sale, a combined valuation methodology is needed. <em>The operating business estimate here is directional, and the value drivers — occupancy, payer mix, and operational quality — directly affect both operating value and real estate value.</em>`
  },
};

function showIndustryNotice(industry) {
  const noticeEl  = document.getElementById('industry-notice');
  const titleEl   = document.getElementById('industry-notice-title');
  const bodyEl    = document.getElementById('industry-notice-body');
  if (!noticeEl) return;

  const notice = INDUSTRY_NOTICES[industry];
  if (notice) {
    titleEl.textContent  = notice.title;
    bodyEl.innerHTML     = notice.body;
    noticeEl.style.display = 'block';
  } else {
    noticeEl.style.display = 'none';
  }
}

async function calculateAndShow() {
  const bizName    = document.getElementById('biz-name').value || 'Your Business';
  const industry   = document.getElementById('industry').value || 'other';
  const years      = parseInt(document.getElementById('years').value) || 5;
  const activeMode = document.getElementById('mode-btn-know').classList.contains('active') ? 'know' : 'calc';
  const modeARevenue = parseCurrency(document.getElementById('revenue').value) || 0;
  const modeBRevenue = parseCurrency((document.getElementById('g-revenue-calc') || {value:''}).value) || 0;
  const revenue = activeMode === 'know' ? modeARevenue : (modeBRevenue || modeARevenue);
  const ebitda = activeMode === 'know'
    ? parseCurrency(document.getElementById('ebitda').value)
    : calcGuidedEbitda();
  const ownerSal    = parseCurrency(document.getElementById('owner-salary').value);
  const marketSal   = parseCurrency(document.getElementById('market-salary').value);
  const addbacks    = parseCurrency(document.getElementById('addbacks').value);
  const growth      = parseInt(document.getElementById('growth').value);
  const ownerDep    = parseInt(document.getElementById('owner-dep').value);
  const recurring   = parseInt(document.getElementById('recurring').value);
  const custConc    = parseInt(document.getElementById('cust-conc').value);
  const systemsVal  = parseInt(document.getElementById('systems').value);
  const finRec      = parseInt(document.getElementById('fin-records').value);

  const payload = {
    industry, years_in_business: years, revenue, ebitda,
    input_mode: activeMode, owner_salary: ownerSal, market_salary: marketSal,
    addbacks, sliders: { growth, owner_dep: ownerDep, recurring, cust_conc: custConc, systems: systemsVal, fin_records: finRec },
  };
  if (activeMode === 'calc') {
    payload.earnings = parseCurrency((document.getElementById('g-earnings') || {value:''}).value) || 0;
    payload.interest_expense = parseCurrency((document.getElementById('g-interest') || {value:''}).value) || 0;
    payload.taxes_paid = parseCurrency((document.getElementById('g-taxes') || {value:''}).value) || 0;
    payload.depreciation_amort = parseCurrency((document.getElementById('g-da') || {value:''}).value) || 0;
  }

  // Call backend calculator
  let r;
  try {
    r = await apiCalculate(payload);
    if (!r) throw new Error('Empty response');
  } catch (e) {
    console.error('EdgeFour: calculate failed:', e.message);
    alert('We couldn\'t calculate your valuation right now. Please try again.');
    return;
  }

  // ---- RENDER RESULTS FROM BACKEND RESPONSE ----
  document.getElementById('results-biz-name').textContent = bizName;
  document.getElementById('results-date').textContent = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  document.getElementById('score-num').textContent = r.value_score;
  document.getElementById('score-desc').textContent = r.score_band_description;

  const awarenessEl = document.getElementById('results-awareness');
  if (awarenessEl) awarenessEl.textContent = r.score_band + ' · Business Value Score';

  document.getElementById('val-low').textContent  = formatMoney(r.valuation_low);
  document.getElementById('val-base').textContent = formatMoney(r.valuation_base);
  document.getElementById('val-high').textContent = formatMoney(r.valuation_high);
  document.getElementById('adj-ebitda').textContent = formatMoney(r.adj_ebitda);
  document.getElementById('est-multiple').textContent = r.estimated_multiple.toFixed(1) + 'x';

  const revBonusLine = document.getElementById('revenue-bonus-line');
  const revBonusAmt  = document.getElementById('revenue-bonus-amt');
  if (revBonusLine && revBonusAmt && r.revenue_scale_bonus > 0) {
    revBonusAmt.textContent = `+${r.revenue_scale_bonus.toFixed(1)}x revenue scale premium`;
    revBonusLine.style.display = 'block';
  } else if (revBonusLine) {
    revBonusLine.style.display = 'none';
  }

  // Trajectory
  const traj = r.trajectory;
  document.getElementById('traj-today').textContent    = formatMoney(r.valuation_base);
  document.getElementById('traj-improved').textContent = formatMoney(traj.new_valuation_high);
  if (traj.uplift_amount > 0 && traj.top_factors.length > 0) {
    document.getElementById('traj-uplift').textContent = `${formatMoney(traj.uplift_amount)} increase in value with key improvements`;
    document.getElementById('traj-actions').innerHTML = traj.top_factors.map((f,i) =>
      `<div class="traj-action-item">
        <div class="traj-action-dot">${i+1}</div>
        <span>${f.name} <span style="color:var(--gold);font-weight:600;">(+${f.delta.toFixed(1)}x multiple)</span></span>
      </div>`
    ).join('');
    document.getElementById('trajectory-card').style.display = 'block';
  } else {
    document.getElementById('trajectory-card').style.display = 'none';
  }

  // Good / bad factors
  const goodFactors = r.good_factors.length > 0 ? r.good_factors.map(f => f.description) : ['No standout strengths identified — use the recommendations below to build your value.'];
  const badFactors  = r.bad_factors.length > 0 ? r.bad_factors.map(f => f.description) : ['No major red flags — great work!'];
  document.getElementById('factors-good').innerHTML = goodFactors.slice(0,4).map(f =>
    `<div class="factor-item"><div class="factor-dot"></div><span>${f}</span></div>`
  ).join('');
  document.getElementById('factors-bad').innerHTML = badFactors.slice(0,4).map(f =>
    `<div class="factor-item"><div class="factor-dot"></div><span>${f}</span></div>`
  ).join('');

  // Recommendations — snapshot page
  const recs = r.vip_recommendations;
  document.getElementById('recommendations').innerHTML = recs.map((rec) =>
    `<div class="rec-item">
      <div class="rec-diamond">◆</div>
      <div class="rec-content">
        <div class="rec-title">${rec.title}</div>
        <div class="rec-desc">${rec.body}</div>
      </div>
    </div>`
  ).join('');

  // Store result for quiz/snapshot
  window._lastCalcResult = r;

  // Save valuation to backend
  saveValuation({
    business_name: bizName, industry,
    city: document.getElementById('city').value || '',
    state: document.getElementById('state-value').value || '',
    years_in_business: years,
    employees: parseInt(document.getElementById('employees').value) || 0,
    input_mode: activeMode, revenue, ebitda,
    earnings: payload.earnings ?? null, interest_expense: payload.interest_expense ?? null,
    taxes_paid: payload.taxes_paid ?? null, depreciation_amort: payload.depreciation_amort ?? null,
    owner_salary: ownerSal, market_salary: marketSal, addbacks,
    adj_ebitda: r.adj_ebitda, base_multiple: r.base_multiple,
    estimated_multiple: r.estimated_multiple, years_bonus: r.years_bonus,
    revenue_scale_bonus: r.revenue_scale_bonus,
    valuation_low: r.valuation_low, valuation_base: r.valuation_base, valuation_high: r.valuation_high,
    value_score: r.value_score,
    growth_slider: growth, owner_dep_slider: ownerDep, recurring_slider: recurring,
    cust_conc_slider: custConc, systems_slider: systemsVal, fin_records_slider: finRec,
  });

  goTo('section-results');
  showIndustryNotice(industry);
}

function formatMoney(n) {
  if (!n || isNaN(n) || n <= 0) return '$0';
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K';
  return '$' + Math.round(n).toLocaleString();
}

function restartApp() {
  // Reset city/state fields
  const stateInput = document.getElementById('state-input');
  if (stateInput) { stateInput.value = ''; stateInput.classList.remove('state-selected'); }
  const stateVal = document.getElementById('state-value');
  if (stateVal) stateVal.value = '';
  const stateDD = document.getElementById('state-dropdown');
  if (stateDD) stateDD.classList.remove('open');

  // Reset quiz answers and UI
  quizAnswers[0] = ''; quizAnswers[1] = null; quizAnswers[2] = null;
  document.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
  document.querySelectorAll('.quiz-q-card').forEach(c => c.classList.remove('active'));
  document.getElementById('quiz-q0').classList.add('active');
  // Reset email field and re-activate Q0
  const emailInput = document.getElementById('quiz-email');
  if (emailInput) emailInput.value = '';
  const q0btn = document.getElementById('q0-next');
  if (q0btn) q0btn.disabled = true;
  document.getElementById('quiz-q0').classList.add('active');
  for (let i = 1; i <= 4; i++) {
    const btn = document.getElementById(`q${i}-next`);
    if (btn) btn.disabled = true;
  }
  updatePips(1);
  // Reset all fields
  document.querySelectorAll('input[type=text], input[type=number]').forEach(i => i.value = '');
  document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  document.querySelectorAll('input[type=range]').forEach(r => {
    r.value = r.id === 'recurring' || r.id === 'cust-conc' ? 2 : 3;
  });
  updateSliderLabel('growth','growth-display',growthLabels);
  updateSliderLabel('owner-dep','owner-dep-display',ownerDepLabels);
  updateSliderLabel('recurring','recurring-display',recurringLabels);
  updateSliderLabel('cust-conc','cust-conc-display',custConcLabels);
  updateSliderLabel('systems','systems-display',systemsLabels);
  updateSliderLabel('fin-records','fin-records-display',finRecordsLabels);
  goTo('section-landing');
}
// ---- VIP QUIZ LOGIC ----
// Q1 = single-select (timeline). Q2/Q3/Q4 = multi-select (arrays).
const quizAnswers = { 0: '', 1: null, 2: null }; // Q0=email, Q1=timeline, Q2=advisorSource

function isMultiQuestion(q) {
  const card = document.getElementById(`quiz-q${q}`);
  return card && card.dataset.multi === 'true';
}

// Wire up option clicks — handles both single and multi-select
document.querySelectorAll('.quiz-option').forEach(opt => {
  opt.addEventListener('click', () => {
    const q   = parseInt(opt.dataset.q);
    const val = opt.dataset.val;

    if (isMultiQuestion(q)) {
      // Toggle this option
      opt.classList.toggle('selected');
      const arr = quizAnswers[q];
      const idx = arr.indexOf(val);
      if (idx === -1) arr.push(val); else arr.splice(idx, 1);
      // Enable next if at least one selected
      document.getElementById(`q${q}-next`).disabled = arr.length === 0;
    } else {
      // Single-select: deselect all siblings first
      document.querySelectorAll(`.quiz-option[data-q="${q}"]`).forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      quizAnswers[q] = val;
      document.getElementById(`q${q}-next`).disabled = false;
    }
  });
});

function updatePips(activeQ) {
  // pip index = question index (Q0=pip1, Q1=pip2, Q2=pip3)
  for (let i = 1; i <= 3; i++) {
    const pip = document.getElementById(`pip-${i}`);
    if (!pip) continue;
    const qIndex = i - 1; // pip-1 maps to Q0
    pip.classList.remove('active','done');
    if (qIndex < activeQ) pip.classList.add('done');
    else if (qIndex === activeQ) pip.classList.add('active');
  }
}

function quizNext(currentQ) {
  // Save email from Q0
  if (currentQ === 0) {
    const emailVal = document.getElementById('quiz-email').value.trim();
    quizAnswers[0] = emailVal;
    // Update Supabase row with email immediately
    if (emailVal) updateValuationEmail(emailVal);
  }
  const ans = quizAnswers[currentQ];
  const hasAnswer = currentQ === 0 ? !!quizAnswers[0] : Array.isArray(ans) ? ans.length > 0 : !!ans;
  if (!hasAnswer) return;
  document.getElementById(`quiz-q${currentQ}`).classList.remove('active');
  const nextQ = currentQ + 1;
  document.getElementById(`quiz-q${nextQ}`).classList.add('active');
  updatePips(nextQ);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function quizBack(currentQ) {
  document.getElementById(`quiz-q${currentQ}`).classList.remove('active');
  const prevQ = currentQ - 1;
  if (prevQ < 0) { goTo('section-results'); return; }
  document.getElementById(`quiz-q${prevQ}`).classList.add('active');
  updatePips(prevQ);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- SNAPSHOT GENERATION (multi-select aware) ----

// Full data library for each selectable value
// ── DATA TABLES FOR SNAPSHOT GENERATION ────────────────────────────────────

// Q3 — biggest challenge maps to priority focus, why it matters, and action
// Q2 (formerly Q5) — advisory source informs the suggested next step
const ADVISORY_SOURCE_DATA = {
  consultant: {
    html: `You already understand the value of outside perspective — working with a coach or consultant puts you ahead of most owners when it comes to execution and accountability. The roadmap above gives you a specific set of business value improvements to bring into that engagement. At Edge Four, we complement that work by focusing specifically on how business improvements translate into measurable increases in profitability and enterprise value, drawing on hands-on operating and investing experience.`
  },
  cpa: {
    html: `Your CPA is an important partner — particularly on the financials and data quality improvements in your roadmap above, where their involvement can accelerate results. At Edge Four, we build on that foundation by focusing on the broader picture: how your financial performance, operational strength, and business characteristics translate into long-term enterprise value. We bring an operator's perspective to help identify the actions that will matter most, whether or not a sale is on the horizon.`
  },
  attorney: {
    html: `Your attorney is essential for protecting your interests — and their guidance will be especially relevant if any of the improvements above involve contracts, ownership structure, or transaction preparation. At Edge Four, our role is complementary: we focus on improving the underlying business itself — profitability, transferability, and overall value — so that when the time comes, you are in the strongest possible position.`
  },
  peers: {
    html: `Your peer group is a valuable resource — the real-world experience of fellow owners is hard to replicate. The roadmap above gives you concrete, data-grounded improvements to bring back to those conversations and benchmark against what others in your position are doing. At Edge Four, we complement peer insight with a more structured approach to building business value, helping you translate good ideas into focused, measurable actions.`
  },
  tools: {
    html: `You are comfortable using tools to make better decisions — and the roadmap above is designed to work the same way: specific, actionable, and grounded in how buyers actually evaluate businesses. At Edge Four, we build on that by providing a tailored, hands-on perspective grounded in real operating experience. The goal is to help you prioritize the actions that will have the greatest impact on both profitability and business value — not just general guidance.`
  },
  solo: {
    html: `You have built this business largely on your own judgment — which means you know how to execute when you have the right information. The roadmap above is designed for exactly that: clear, specific improvements with a direct line to business value. At Edge Four, we provide an additional, objective perspective for owners who want to pressure-test their thinking and identify opportunities they may not be seeing from inside the business.`
  },
  other: {
    html: `The roadmap above identifies the specific areas where focused effort will have the greatest impact on your profitability and business value. At Edge Four, we work with business owners to prioritize and execute on exactly these kinds of improvements — drawing on operating and investing experience to help you identify what matters most and make measurable progress.`
  },
};

function buildSnapshot() {
  if (!quizAnswers[2]) return;

  const emailVal      = quizAnswers[0] || '';
  const timeline      = quizAnswers[1];
  const advisorSource = quizAnswers[2];

  // ── Timeline pill + context sentence ──
  const timelineLabels = {
    within1:   'Within 12 months',
    '1to3':    '1–3 years',
    '3to5':    '3–5 years',
    morethan5: 'More than 5 years',
    noplans:   'No current thoughts regarding selling'
  };
  document.getElementById('snap-timeline-text').textContent =
    'Timeline: ' + (timelineLabels[timeline] || 'Not specified');

  // Timeline context sentence
  const timelineContextEl = document.getElementById('snap-timeline-context');
  const timelineContextMap = {
    within1:   'With a potential transition within the next 12 months, time is your most constrained resource. Focus first on improvements that buyers can see and verify quickly — clean financials, well-organized operational data, and a documented customer base. Structural changes like reducing owner dependency take longer, but even starting the process signals intention and reduces perceived risk. Engage a sell-side advisor now to help you sequence these steps correctly.',
    '1to3':    'A 1 to 3 year horizon gives you a realistic window to execute on most of the improvements below. Use this time to build a track record — buyers are paying for what they can see in your financial history, not just your current state. Improvements that are in place and documented for 12 to 24 months before a sale carry significantly more weight than last-minute changes.',
    '3to5':    'A 3 to 5 year window is the best position to be in. Improvements made now will be baked into your financial history by the time you go to market — and buyers pay a meaningful premium for demonstrated, sustained performance. Focus on the structural improvements first: recurring revenue, systems, and management depth compound over time in a way that financial cleanup cannot replicate.',
    morethan5: 'With a longer runway, these improvements are worth pursuing for the day-to-day benefit they provide — not just for a future sale. A business that runs with less owner dependency, cleaner financials, and more predictable revenue is more profitable, less stressful, and more resilient regardless of what you ultimately decide to do with it.',
    noplans:   'Whether or not a sale is ever on the horizon, the improvements identified here will make your business more profitable and easier to run right now. Treat them as operational priorities — the value creation is a byproduct of building a better business.'
  };
  if (timelineContextEl) {
    timelineContextEl.textContent = timelineContextMap[timeline] || timelineContextMap.noplans;
  }

  // ── Advisory source context ──
  const advisorData = ADVISORY_SOURCE_DATA[advisorSource] || {};
  document.getElementById('snap-nextstep').innerHTML =
    advisorData.html || `At Edge Four, we focus specifically on how business improvements translate into both ongoing profitability and overall enterprise value. Our perspective is grounded in operating and investing experience — helping you identify the actions that matter most.`;

  // ── Update Supabase ──
  updateValuationQuiz({
    lead_email:           emailVal,
    quiz_timeline:        quizAnswers[1] || '',
    quiz_advisory_source: quizAnswers[2] || '',
  });

  goTo('section-vip-snapshot');
}
// ---- FINANCIAL INPUT MODE TOGGLE ----
// ---- INDUSTRY-AWARE GUIDED EBITDA CALCULATOR ----

// Industry-aware guided EBITDA calculators
// Product businesses: Revenue - COGS - OpEx + D&A
// Service businesses: Revenue - OpEx + D&A
// Default fallback: Revenue - COGS - OpEx + D&A (product-style)

const GUIDED_CONFIGS = {
  _product: {
    icon: '🧮',
    title: 'Product Business Profit Calculator',
    sub: "We'll build up your EBITDA from revenue down through your costs.",
    fields: [
      { id:'g-revenue-calc', label:'Annual Revenue (Net Sales)', placeholder:'e.g., 4,200,000', sign:+1,
        helper:'Total product sales, net of returns and discounts.' },
      { id:'g-cogs', label:'Cost of Goods Sold', placeholder:'e.g., 1,800,000', sign:-1,
        helper:'Raw materials, purchased inventory, direct manufacturing labor, and freight-in.' },
      { id:'g-opex', label:'Operating Expenses (SG&A)', placeholder:'e.g., 950,000', sign:-1,
        helper:'Salaries (non-production), rent, utilities, insurance, marketing, and admin overhead.' },
      { id:'g-da', label:'Depreciation & Amortization (add back)', placeholder:'e.g., 60,000', sign:+1,
        helper:'Non-cash charge from your P&L for equipment, machinery, or patents. Add it back to get EBITDA.' },
    ],
    formula: 'EBITDA = Revenue − COGS − OpEx + D&A',
  },
  _service: {
    icon: '🧮',
    title: 'Service Business Profit Calculator',
    sub: "We'll build up your EBITDA from revenue down through your costs.",
    fields: [
      { id:'g-revenue-calc', label:'Annual Revenue', placeholder:'e.g., 2,500,000', sign:+1,
        helper:'Total service revenue for the last 12 months.' },
      { id:'g-opex', label:'Total Operating Expenses', placeholder:'e.g., 1,800,000', sign:-1,
        helper:'All operating costs: payroll, rent, utilities, insurance, marketing, supplies, and admin.' },
      { id:'g-da', label:'Depreciation & Amortization (add back)', placeholder:'e.g., 30,000', sign:+1,
        helper:'Non-cash charge from your P&L for equipment or vehicles. Add it back to get EBITDA.' },
    ],
    formula: 'EBITDA = Revenue − Operating Expenses + D&A',
  },
  _retail: {
    icon: '🧮',
    title: 'Retail Business Profit Calculator',
    sub: "We'll build up your EBITDA from revenue down through your costs.",
    fields: [
      { id:'g-revenue-calc', label:'Annual Revenue (Net Sales)', placeholder:'e.g., 3,200,000', sign:+1,
        helper:'Total retail sales, net of returns and discounts.' },
      { id:'g-cogs', label:'Cost of Goods Sold', placeholder:'e.g., 1,600,000', sign:-1,
        helper:'Wholesale cost of inventory purchased for resale.' },
      { id:'g-opex', label:'Operating Expenses (SG&A)', placeholder:'e.g., 800,000', sign:-1,
        helper:'Salaries, rent, utilities, insurance, marketing, and admin overhead.' },
      { id:'g-da', label:'Depreciation & Amortization (add back)', placeholder:'e.g., 40,000', sign:+1,
        helper:'Non-cash charge from your P&L for fixtures, equipment, or leasehold improvements.' },
    ],
    formula: 'EBITDA = Revenue − COGS − OpEx + D&A',
  },
  _restaurant: {
    icon: '🧮',
    title: 'Restaurant Profit Calculator',
    sub: "We'll build up your EBITDA from revenue down through your costs.",
    fields: [
      { id:'g-revenue-calc', label:'Annual Revenue (Net Sales)', placeholder:'e.g., 1,800,000', sign:+1,
        helper:'Total food and beverage sales.' },
      { id:'g-cogs', label:'Cost of Goods Sold (Food & Beverage)', placeholder:'e.g., 540,000', sign:-1,
        helper:'Food, beverage, and supply costs.' },
      { id:'g-opex', label:'Operating Expenses', placeholder:'e.g., 900,000', sign:-1,
        helper:'Labor, rent, utilities, insurance, marketing, and other overhead.' },
      { id:'g-da', label:'Depreciation & Amortization (add back)', placeholder:'e.g., 35,000', sign:+1,
        helper:'Non-cash charge for kitchen equipment, furniture, and leasehold improvements.' },
    ],
    formula: 'EBITDA = Revenue − COGS − OpEx + D&A',
  },
  _construction: {
    icon: '🧮',
    title: 'Construction Business Profit Calculator',
    sub: "We'll build up your EBITDA from revenue down through your costs.",
    fields: [
      { id:'g-revenue-calc', label:'Annual Revenue', placeholder:'e.g., 5,000,000', sign:+1,
        helper:'Total contract revenue for the last 12 months.' },
      { id:'g-cogs', label:'Direct Job Costs', placeholder:'e.g., 3,200,000', sign:-1,
        helper:'Materials, subcontractors, direct labor, and equipment rental.' },
      { id:'g-opex', label:'Overhead / G&A', placeholder:'e.g., 800,000', sign:-1,
        helper:'Office staff, insurance, rent, vehicles, and admin overhead.' },
      { id:'g-da', label:'Depreciation & Amortization (add back)', placeholder:'e.g., 80,000', sign:+1,
        helper:'Non-cash charge for equipment, vehicles, and tools.' },
    ],
    formula: 'EBITDA = Revenue − Job Costs − Overhead + D&A',
  },
  _healthcare: {
    icon: '🧮',
    title: 'Healthcare Practice Profit Calculator',
    sub: "We'll build up your EBITDA from collections down through your costs.",
    fields: [
      { id:'g-revenue-calc', label:'Annual Net Collections', placeholder:'e.g., 2,000,000', sign:+1,
        helper:'Total revenue collected after insurance adjustments.' },
      { id:'g-opex', label:'Total Operating Expenses', placeholder:'e.g., 1,400,000', sign:-1,
        helper:'Staff payroll, rent, supplies, insurance, billing, and admin overhead.' },
      { id:'g-da', label:'Depreciation & Amortization (add back)', placeholder:'e.g., 50,000', sign:+1,
        helper:'Non-cash charge for medical equipment, furniture, and leasehold improvements.' },
    ],
    formula: 'EBITDA = Net Collections − Operating Expenses + D&A',
  },
  _professional: {
    icon: '🧮',
    title: 'Professional Services Profit Calculator',
    sub: "We'll build up your EBITDA from revenue down through your costs.",
    fields: [
      { id:'g-revenue-calc', label:'Annual Revenue', placeholder:'e.g., 1,500,000', sign:+1,
        helper:'Total fees and billings for the last 12 months.' },
      { id:'g-opex', label:'Total Operating Expenses', placeholder:'e.g., 1,000,000', sign:-1,
        helper:'Staff payroll, rent, technology, insurance, marketing, and admin.' },
      { id:'g-da', label:'Depreciation & Amortization (add back)', placeholder:'e.g., 20,000', sign:+1,
        helper:'Non-cash charge for office equipment, software, and leasehold improvements.' },
    ],
    formula: 'EBITDA = Revenue − Operating Expenses + D&A',
  },
  _technology: {
    icon: '🧮',
    title: 'Technology Business Profit Calculator',
    sub: "We'll build up your EBITDA from revenue down through your costs.",
    fields: [
      { id:'g-revenue-calc', label:'Annual Revenue', placeholder:'e.g., 3,000,000', sign:+1,
        helper:'Total revenue including subscriptions, licenses, and services.' },
      { id:'g-opex', label:'Total Operating Expenses', placeholder:'e.g., 2,200,000', sign:-1,
        helper:'Engineering, sales, marketing, hosting, rent, and admin overhead.' },
      { id:'g-da', label:'Depreciation & Amortization (add back)', placeholder:'e.g., 100,000', sign:+1,
        helper:'Non-cash charge for servers, equipment, and capitalized software development.' },
    ],
    formula: 'EBITDA = Revenue − Operating Expenses + D&A',
  },
  _ecommerce: {
    icon: '🧮',
    title: 'E-Commerce Profit Calculator',
    sub: "We'll build up your EBITDA from revenue down through your costs.",
    fields: [
      { id:'g-revenue-calc', label:'Annual Revenue (Net Sales)', placeholder:'e.g., 2,800,000', sign:+1,
        helper:'Total sales net of returns, refunds, and marketplace fees.' },
      { id:'g-cogs', label:'Cost of Goods Sold', placeholder:'e.g., 1,200,000', sign:-1,
        helper:'Product cost, packaging, and inbound freight.' },
      { id:'g-opex', label:'Operating Expenses', placeholder:'e.g., 900,000', sign:-1,
        helper:'Advertising, fulfillment, software, staff, and admin overhead.' },
      { id:'g-da', label:'Depreciation & Amortization (add back)', placeholder:'e.g., 25,000', sign:+1,
        helper:'Non-cash charge for warehouse equipment, software, etc.' },
    ],
    formula: 'EBITDA = Revenue − COGS − OpEx + D&A',
  },
  _logistics: {
    icon: '🧮',
    title: 'Logistics Business Profit Calculator',
    sub: "We'll build up your EBITDA from revenue down through your costs.",
    fields: [
      { id:'g-revenue-calc', label:'Annual Revenue', placeholder:'e.g., 4,000,000', sign:+1,
        helper:'Total hauling, brokerage, or warehousing revenue.' },
      { id:'g-cogs', label:'Direct Costs', placeholder:'e.g., 2,400,000', sign:-1,
        helper:'Fuel, driver pay, maintenance, tolls, and carrier payments.' },
      { id:'g-opex', label:'Overhead / G&A', placeholder:'e.g., 800,000', sign:-1,
        helper:'Office staff, insurance, rent, dispatch, and admin overhead.' },
      { id:'g-da', label:'Depreciation & Amortization (add back)', placeholder:'e.g., 200,000', sign:+1,
        helper:'Non-cash charge for trucks, trailers, and warehouse equipment.' },
    ],
    formula: 'EBITDA = Revenue − Direct Costs − Overhead + D&A',
  },
  _default: {
    icon: '🧮',
    title: 'Business Profit Calculator',
    sub: "We'll build up your EBITDA from revenue down through your costs.",
    fields: [
      { id:'g-revenue-calc', label:'Annual Revenue', placeholder:'e.g., 3,000,000', sign:+1,
        helper:'Total revenue for the last 12 months.' },
      { id:'g-cogs', label:'Cost of Goods Sold', placeholder:'e.g., 1,200,000', sign:-1,
        helper:'Direct costs of products or services delivered. Enter $0 if not applicable.' },
      { id:'g-opex', label:'Operating Expenses (SG&A)', placeholder:'e.g., 900,000', sign:-1,
        helper:'Salaries, rent, utilities, insurance, marketing, and admin overhead.' },
      { id:'g-da', label:'Depreciation & Amortization (add back)', placeholder:'e.g., 50,000', sign:+1,
        helper:'Non-cash charge from your P&L. Add it back to get EBITDA.' },
    ],
    formula: 'EBITDA = Revenue − COGS − OpEx + D&A',
  },
};

// Map all industries to the universal calculator
const INDUSTRY_TO_CONFIG = {
  restaurant_full: '_restaurant',
  restaurant_fast: '_restaurant',
  catering: '_service',
  food_mfg: '_product',
  bakery: '_retail',
  retail_general: '_retail',
  retail_specialty: '_retail',
  liquor_store: '_retail',
  auto_parts: '_retail',
  gas_station: '_retail',
  ecommerce_branded: '_ecommerce',
  ecommerce_amazon: '_ecommerce',
  hvac: '_service',
  plumbing: '_service',
  electrical: '_service',
  roofing: '_construction',
  landscape_residential: '_service',
  landscape_commercial: '_service',
  pest_residential: '_service',
  pest_commercial: '_service',
  pool_service: '_service',
  cleaning_residential: '_service',
  cleaning_commercial: '_service',
  security_systems: '_service',
  painting: '_service',
  junk_removal: '_service',
  moving: '_service',
  appliance_repair: '_service',
  auto_repair: '_service',
  auto_body: '_service',
  car_wash: '_service',
  auto_dealer_new: '_retail',
  auto_dealer_used: '_retail',
  auto_rental: '_service',
  medical_primary: '_healthcare',
  dental_general: '_healthcare',
  dental_specialty: '_healthcare',
  optometry: '_healthcare',
  veterinary: '_healthcare',
  physical_therapy: '_healthcare',
  mental_health: '_professional',
  aba_autism: '_professional',
  med_spa: '_service',
  home_health: '_service',
  hospice: '_service',
  fitness: '_service',
  pharmacy: '_retail',
  cpa_accounting: '_professional',
  law_general: '_professional',
  law_pi: '_professional',
  engineering: '_professional',
  msp: '_technology',
  marketing_agency: '_professional',
  pr_firm: '_professional',
  mgmt_consulting: '_professional',
  staffing: '_professional',
  insurance_pc: '_professional',
  insurance_life: '_professional',
  wealth_mgmt: '_professional',
  mortgage: '_professional',
  title_escrow: '_professional',
  appraisal: '_professional',
  saas: '_technology',
  it_services: '_technology',
  custom_software: '_technology',
  tech_staffing: '_professional',
  digital_marketing: '_professional',
  cybersecurity: '_technology',
  data_analytics: '_technology',
  manufacturing: '_product',
  mfg_specialty: '_product',
  food_processing: '_product',
  machine_shop: '_product',
  distribution: '_product',
  distribution_specialty: '_product',
  industrial_services: '_service',
  gc_commercial: '_construction',
  gc_residential: '_construction',
  contractor_mep: '_construction',
  contractor_other: '_construction',
  real_estate_brokerage: '_professional',
  property_mgmt: '_service',
  real_estate_appraisal: '_professional',
  commercial_cleaning: '_service',
  trucking_asset: '_logistics',
  freight_brokerage: '_service',
  last_mile: '_logistics',
  moving_transport: '_logistics',
  warehousing: '_logistics',
  auto_transport: '_logistics',
  childcare: '_service',
  private_school: '_service',
  tutoring: '_service',
  vocational_school: '_service',
  elearning: '_technology',
  assisted_living_small: '_healthcare',
  assisted_living_large: '_healthcare',
  home_care_private: '_service',
  adult_day: '_service',
  hair_salon: '_service',
  day_spa: '_service',
  tattoo: '_service',
  funeral_home: '_service',
  event_planning: '_service',
  photography: '_service',
  landscaping_design: '_service',
  tree_service: '_service',
  environmental: '_service',
  waste_mgmt: '_service',
  irrigation: '_service',
  nursery: '_product',
  publishing: '_professional',
  printing: '_product',
  other: '_default',
};

function getGuidedConfig() {
  const industry = document.getElementById('industry').value || 'other';
  const key = INDUSTRY_TO_CONFIG[industry] || '_default';
  return GUIDED_CONFIGS[key];
}

function renderGuidedFields() {
  const cfg = getGuidedConfig() || GUIDED_CONFIGS._default;
  document.getElementById('guided-intro-icon').textContent  = cfg.icon || '🧮';
  document.getElementById('guided-intro-title').textContent = cfg.title;
  document.getElementById('guided-intro-sub').textContent   = cfg.sub;

  const container = document.getElementById('guided-fields');
  let html = '';

  cfg.fields.forEach(f => {
    html += `
    <div class="field-group">
      <label for="${f.id}">${f.label}</label>
      <div class="prefix-input"><span class="prefix">$</span>
        <input type="text" id="${f.id}" inputmode="numeric" placeholder="${f.placeholder}" class="currency-input" autocomplete="off" oninput="formatCurrencyInput(this); recalcGuided()">
      </div>
      <span class="helper">${f.helper}</span>
    </div>`;
  });

  // Formula line
  html += `<div class="guided-formula"><span class="guided-formula-icon"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline;vertical-align:middle;margin-right:8px;"><line x1="4" y1="7" x2="16" y2="7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="4" y1="13" x2="16" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span>${cfg.formula}</div>`;

  container.innerHTML = html;
  recalcGuided();
}

function clearGuidedFields() {
  // Clear any dynamically-rendered guided calculator fields
  const container = document.getElementById('guided-fields');
  if (container) {
    container.querySelectorAll('input').forEach(el => el.value = '');
  }
}

function setFinancialMode(mode) {
  const knowBtn  = document.getElementById('mode-btn-know');
  const calcBtn  = document.getElementById('mode-btn-calc');
  const knowCard = document.getElementById('mode-know');
  const calcCard = document.getElementById('mode-calc');

  if (mode === 'know') {
    knowBtn.classList.add('active');
    calcBtn.classList.remove('active');
    knowCard.style.display = 'block';
    calcCard.style.display = 'none';
    ['revenue','ebitda'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    clearGuidedFields();
  } else {
    calcBtn.classList.add('active');
    knowBtn.classList.remove('active');
    calcCard.style.display = 'block';
    knowCard.style.display = 'none';
    ['revenue','ebitda'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    renderGuidedFields();
  }
  // Clear shared fields (owner comp, market rate, addbacks) and Adj EBITDA preview
  ['owner-salary','market-salary','addbacks'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  updateAdjEbitda();
}

function calcGuidedEbitda() {
  const cfg = getGuidedConfig() || GUIDED_CONFIGS._default;
  let ebitda = 0;
  cfg.fields.forEach(f => {
    const el = document.getElementById(f.id);
    const val = el ? parseCurrency(el.value) : 0;
    ebitda += f.sign * val;
  });
  return ebitda;
}

function recalcGuided() {
  const cfg = getGuidedConfig() || GUIDED_CONFIGS._default;
  const ebitda   = calcGuidedEbitda();
  const resultEl = document.getElementById('guided-result');
  const valEl    = document.getElementById('guided-ebitda-display');
  const subEl    = document.getElementById('guided-margin-display');

  // Check if any guided field has a value
  let hasAny = false;
  cfg.fields.forEach(f => {
    const el = document.getElementById(f.id);
    if (el && parseCurrency(el.value)) hasAny = true;
  });

  // Revenue field for margin calculation (first field with sign +1 and id containing 'revenue')
  const revField = cfg.fields.find(f => f.id === 'g-revenue-calc');
  const rev = revField ? parseCurrency((document.getElementById(revField.id) || {value:''}).value) : 0;

  if (hasAny) {
    resultEl.style.display = 'flex';
    valEl.textContent = formatMoney(ebitda);
    if (rev > 0 && ebitda > 0) {
      const margin = ((ebitda / rev) * 100).toFixed(1);
      subEl.textContent = `${margin}% EBITDA margin`;
    } else {
      subEl.textContent = '';
    }
  } else {
    resultEl.style.display = 'none';
  }
}

// ---- FINANCIALS STEP VALIDATION (mode-aware) ----
function validateFinancialsAndContinue() {
  const mode = document.getElementById('mode-btn-know').classList.contains('active') ? 'know' : 'calc';
  let valid = true;

  const commonFields = ['owner-salary', 'market-salary'];
  commonFields.forEach(id => {
    const el = document.getElementById(id);
    const group = el.closest('.field-group');
    if (!el.value || el.value.trim() === '') {
      group.classList.add('field-error');
      let err = group.querySelector('.error-msg');
      if (!err) {
        err = document.createElement('span');
        err.className = 'error-msg';
        err.textContent = 'This field is required.';
        group.appendChild(err);
      }
      err.style.display = 'block';
      valid = false;
    } else {
      group.classList.remove('field-error');
      const err = group.querySelector('.error-msg');
      if (err) err.style.display = 'none';
    }
  });

  if (mode === 'know') {
    ['revenue', 'ebitda'].forEach(id => {
      const el = document.getElementById(id);
      const group = el.closest('.field-group');
      if (!el.value || el.value.trim() === '') {
        group.classList.add('field-error');
        let err = group.querySelector('.error-msg');
        if (!err) {
          err = document.createElement('span');
          err.className = 'error-msg';
          err.textContent = 'This field is required.';
          group.appendChild(err);
        }
        err.style.display = 'block';
        valid = false;
      } else {
        group.classList.remove('field-error');
        const err = group.querySelector('.error-msg');
        if (err) err.style.display = 'none';
      }
    });
  } else {
    // Mode B: check that at least Revenue is entered
    const revenueEl = document.getElementById('g-revenue-calc');
    if (revenueEl) {
      const revenueVal = parseCurrency(revenueEl.value);
      const group = revenueEl.closest('.field-group');
      if (!revenueVal && revenueVal !== 0) {
        group.classList.add('field-error');
        let err = group.querySelector('.error-msg');
        if (!err) {
          err = document.createElement('span');
          err.className = 'error-msg';
          err.textContent = 'Annual Revenue is required to continue.';
          group.appendChild(err);
        }
        err.style.display = 'block';
        valid = false;
      } else {
        group.classList.remove('field-error');
        const err = group.querySelector('.error-msg');
        if (err) err.style.display = 'none';
      }
    }
  }

  if (valid) goTo('section-value-drivers');
}

// ---- STATE AUTOCOMPLETE ----
const US_STATES = [
  ['Alabama','AL'],['Alaska','AK'],['Arizona','AZ'],['Arkansas','AR'],['California','CA'],
  ['Colorado','CO'],['Connecticut','CT'],['Delaware','DE'],['Florida','FL'],['Georgia','GA'],
  ['Hawaii','HI'],['Idaho','ID'],['Illinois','IL'],['Indiana','IN'],['Iowa','IA'],
  ['Kansas','KS'],['Kentucky','KY'],['Louisiana','LA'],['Maine','ME'],['Maryland','MD'],
  ['Massachusetts','MA'],['Michigan','MI'],['Minnesota','MN'],['Mississippi','MS'],['Missouri','MO'],
  ['Montana','MT'],['Nebraska','NE'],['Nevada','NV'],['New Hampshire','NH'],['New Jersey','NJ'],
  ['New Mexico','NM'],['New York','NY'],['North Carolina','NC'],['North Dakota','ND'],['Ohio','OH'],
  ['Oklahoma','OK'],['Oregon','OR'],['Pennsylvania','PA'],['Rhode Island','RI'],['South Carolina','SC'],
  ['South Dakota','SD'],['Tennessee','TN'],['Texas','TX'],['Utah','UT'],['Vermont','VT'],
  ['Virginia','VA'],['Washington','WA'],['West Virginia','WV'],['Wisconsin','WI'],['Wyoming','WY'],
  ['District of Columbia','DC']
];

let stateHighlightIndex = -1;

function filterStates() {
  const input    = document.getElementById('state-input');
  const dropdown = document.getElementById('state-dropdown');
  const q        = input.value.trim().toLowerCase();

  // Clear hidden value when user is typing a new query
  document.getElementById('state-value').value = '';
  input.classList.remove('state-selected');

  if (!q) {
    dropdown.classList.remove('open');
    return;
  }

  const matches = US_STATES.filter(([name, abbr]) =>
    name.toLowerCase().startsWith(q) ||
    abbr.toLowerCase() === q ||
    name.toLowerCase().includes(q)
  ).slice(0, 8);

  if (!matches.length) {
    dropdown.classList.remove('open');
    return;
  }

  stateHighlightIndex = -1;
  dropdown.innerHTML = matches.map(([name, abbr], i) =>
    `<div class="state-option" data-name="${name}" data-abbr="${abbr}"
       onmousedown="selectState('${name}','${abbr}')">
      <span>${name}</span>
      <span class="state-option-abbr">${abbr}</span>
    </div>`
  ).join('');

  dropdown.classList.add('open');
}

function selectState(name, abbr) {
  const input = document.getElementById('state-input');
  input.value = name;
  input.classList.add('state-selected');
  document.getElementById('state-value').value = abbr;
  document.getElementById('state-dropdown').classList.remove('open');
  stateHighlightIndex = -1;
}

function hideStateDropdown() {
  // Small delay so onmousedown on an option fires first
  setTimeout(() => {
    document.getElementById('state-dropdown').classList.remove('open');
    // If no valid state selected, check if the raw text exactly matches
    const input = document.getElementById('state-input');
    const q = input.value.trim().toLowerCase();
    const match = US_STATES.find(([name, abbr]) =>
      name.toLowerCase() === q || abbr.toLowerCase() === q
    );
    if (match) {
      selectState(match[0], match[1]);
    }
  }, 150);
}

function stateKeydown(e) {
  const dropdown = document.getElementById('state-dropdown');
  const options  = dropdown.querySelectorAll('.state-option');
  if (!options.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    stateHighlightIndex = Math.min(stateHighlightIndex + 1, options.length - 1);
    updateStateHighlight(options);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    stateHighlightIndex = Math.max(stateHighlightIndex - 1, 0);
    updateStateHighlight(options);
  } else if (e.key === 'Enter' && stateHighlightIndex >= 0) {
    e.preventDefault();
    const opt = options[stateHighlightIndex];
    selectState(opt.dataset.name, opt.dataset.abbr);
  } else if (e.key === 'Escape') {
    dropdown.classList.remove('open');
  }
}

function updateStateHighlight(options) {
  options.forEach((o, i) => {
    o.classList.toggle('highlighted', i === stateHighlightIndex);
    if (i === stateHighlightIndex) o.scrollIntoView({ block: 'nearest' });
  });
}

// ---- BIZ INFO VALIDATION (city + state aware) ----
function validateBizInfoAndContinue() {
  const requiredIds = ['biz-name', 'industry', 'city', 'years', 'employees'];
  let valid = true;

  requiredIds.forEach(id => {
    const el    = document.getElementById(id);
    const group = el.closest('.field-group');
    if (!el.value || el.value.trim() === '') {
      group.classList.add('field-error');
      let err = group.querySelector('.error-msg');
      if (!err) {
        err = document.createElement('span');
        err.className = 'error-msg';
        err.textContent = 'This field is required.';
        group.appendChild(err);
      }
      err.style.display = 'block';
      valid = false;
    } else {
      group.classList.remove('field-error');
      const err = group.querySelector('.error-msg');
      if (err) err.style.display = 'none';
    }
  });

  // Validate state separately (uses hidden input + custom UI)
  const stateVal   = document.getElementById('state-value').value;
  const stateInput = document.getElementById('state-input');
  const stateGroup = stateInput.closest('.field-group');
  if (!stateVal) {
    stateGroup.classList.add('field-error');
    stateInput.style.borderColor = 'var(--red)';
    let err = stateGroup.querySelector('.error-msg');
    if (!err) {
      err = document.createElement('span');
      err.className = 'error-msg';
      err.textContent = 'Please select a state.';
      stateGroup.appendChild(err);
    }
    err.style.display = 'block';
    valid = false;
  } else {
    stateGroup.classList.remove('field-error');
    stateInput.style.borderColor = '';
    const err = stateGroup.querySelector('.error-msg');
    if (err) err.style.display = 'none';
  }

  if (valid) {
    // Save step 1 to backend
    apiSaveStep1({
      session_id: getOrCreateSessionId(),
      business_name: document.getElementById('biz-name').value.trim(),
      industry: document.getElementById('industry').value || 'other',
      city: document.getElementById('city').value.trim(),
      state: document.getElementById('state-value').value || '',
      years_in_business: parseInt(document.getElementById('years').value) || 0,
      employees: parseInt(document.getElementById('employees').value) || 0,
    }).then(data => { if (data?.valuation_id) _currentValuationId = data.valuation_id; });

    const industry = document.getElementById('industry').value || 'other';
    const notice = INDUSTRY_NOTICES[industry];
    if (notice) {
      document.getElementById('methodology-early-title').textContent = notice.title;
      document.getElementById('methodology-early-body').innerHTML = notice.body;
      document.getElementById('methodology-early-popup').style.display = 'flex';
    } else {
      goTo('section-financials');
    }
  }
}

function closeMethodologyPopupAndContinue() {
  document.getElementById('methodology-early-popup').style.display = 'none';
  goTo('section-financials');
}

// Re-render guided fields if industry changes while calc mode is active
function onIndustryChange() {
  const calcCard = document.getElementById('mode-calc');
  if (calcCard && calcCard.style.display !== 'none') {
    renderGuidedFields();
  }
}

// ---- CURRENCY INPUT FORMATTING ----

// Strip commas and return a float (0 if empty/invalid)
function parseCurrency(val) {
  if (!val) return 0;
  return parseFloat(String(val).replace(/,/g, '')) || 0;
}

// Format a number string with commas as the user types
// Supports negative values (leading minus sign) for the addbacks field
function formatCurrencyInput(input) {
  const raw = String(input.value).replace(/,/g, '');
  // Preserve leading minus sign if present
  const isNegative = raw.startsWith('-');
  const digits = raw.replace(/[^0-9.]/g, '');
  const parts = digits.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = (isNegative ? '-' : '') +
    (parts.length > 1 ? parts[0] + '.' + parts[1] : parts[0]);
  // Preserve cursor position
  const selStart = input.selectionStart;
  const oldLen   = input.value.length;
  input.value    = formatted;
  const newLen   = input.value.length;
  const pos      = Math.max(0, selStart + (newLen - oldLen));
  try { input.setSelectionRange(pos, pos); } catch(e) {}
}

// Wire all static currency inputs on load
function initCurrencyInputs() {
  const ids = ['revenue','ebitda','owner-salary','market-salary','addbacks'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => formatCurrencyInput(el));
    // Also format on blur (catch paste events)
    el.addEventListener('blur', () => formatCurrencyInput(el));
  });
}

// Run after DOM is ready
initCurrencyInputs();

// ---- LIVE ADJ EBITDA PREVIEW ----
function updateAdjEbitdaPreview() {
  const ebitda    = parseCurrency((document.getElementById('ebitda') || {value:''}).value);
  const gEarnings = parseCurrency((document.getElementById('g-earnings') || {value:''}).value);
  const gInterest = parseCurrency((document.getElementById('g-interest') || {value:''}).value);
  const gTaxes    = parseCurrency((document.getElementById('g-taxes') || {value:''}).value);
  const gDA       = parseCurrency((document.getElementById('g-da') || {value:''}).value);
  const ownerSal  = parseCurrency((document.getElementById('owner-salary') || {value:''}).value);
  const marketSal = parseCurrency((document.getElementById('market-salary') || {value:''}).value);
  const addbacks  = parseCurrency((document.getElementById('addbacks') || {value:''}).value);

  const activeMode = document.getElementById('mode-btn-know') && document.getElementById('mode-btn-know').classList.contains('active') ? 'know' : 'calc';
  const baseEbitda = activeMode === 'know' ? ebitda : (gEarnings + gInterest + gTaxes + gDA);
  const excessComp = ownerSal && marketSal ? ownerSal - marketSal : 0;
  // In Mode B, also save the revenue field so it persists to the calculation
  if (activeMode === 'calc') {
    const calcRev = parseCurrency((document.getElementById('g-revenue-calc') || {value:''}).value);
    if (calcRev) document.getElementById('revenue').value = String(calcRev); // store raw number for parseCurrency
  }
  const adjEbitda  = baseEbitda + excessComp + addbacks;

  const previewEl = document.getElementById('adj-ebitda-preview');
  const valEl     = document.getElementById('adj-ebitda-preview-val');
  if (!previewEl || !valEl) return;

  const hasData = (baseEbitda || ownerSal || marketSal || addbacks);
  if (hasData) {
    previewEl.style.display = 'flex';
    valEl.textContent = formatMoney(adjEbitda);
    // Show EBITDA margin if revenue is available
    const marginPreviewEl = document.getElementById('adj-ebitda-margin-preview');
    // In Mode B use g-revenue-calc directly; in Mode A use revenue field
    const revForMargin = activeMode === 'calc'
      ? parseCurrency((document.getElementById('g-revenue-calc') || {value:''}).value)
      : parseCurrency((document.getElementById('revenue') || {value:''}).value);
    if (marginPreviewEl) {
      if (revForMargin > 0 && adjEbitda > 0) {
        const pct = ((adjEbitda / revForMargin) * 100).toFixed(1);
        marginPreviewEl.textContent = pct + '% Adjusted EBITDA margin';
        marginPreviewEl.style.display = 'block';
      } else {
        marginPreviewEl.style.display = 'none';
      }
    }
  } else {
    previewEl.style.display = 'none';
    const marginPreviewEl = document.getElementById('adj-ebitda-margin-preview');
    if (marginPreviewEl) marginPreviewEl.style.display = 'none';
  }
}

// Wire preview updates to financial fields
// Wire preview updates to financial fields (DOM ready in module context)
(function() {
  ['ebitda','owner-salary','market-salary','addbacks','g-earnings','g-interest','g-taxes','g-da'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateAdjEbitdaPreview);
  });
  // Wire static revenue field in Mode B
  const gRevCalc = document.getElementById('g-revenue-calc');
  if (gRevCalc) {
    gRevCalc.addEventListener('input', () => { formatCurrencyInput(gRevCalc); recalcGuided(); updateAdjEbitdaPreview(); });
  }
})();

// ---- RESTART CONFIRMATION MODAL ----
let _restartContext = 'results'; // which page triggered the modal

function confirmRestart(context) {
  _restartContext = context || 'results';
  // Tailor the unlock button label based on where they are
  const unlockBtn = document.getElementById('modal-btn-unlock');
  if (context === 'snapshot') {
    // They're already past the quiz — take them back to their snapshot
    unlockBtn.textContent = 'No — take me back to my plan';
  } else {
    // They're on the results page — invite them into the quiz
    unlockBtn.textContent = 'No — unlock my value improvement plan';
  }
  document.getElementById('restart-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeRestartModal() {
  document.getElementById('restart-modal').style.display = 'none';
  document.body.style.overflow = '';
}

function closeRestartModalAndUnlock() {
  closeRestartModal();
  if (_restartContext === 'snapshot') {
    goTo('section-vip-snapshot'); // already done the quiz, back to snapshot
  } else {
    goTo('section-vip-quiz');     // take them into the quiz
  }
}

// Close modal on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeRestartModal();
});


// ---- AWARENESS POPUP ----
function showAwarenessPopup() {
  document.getElementById('awareness-popup').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeAwarenessPopup() {
  document.getElementById('awareness-popup').style.display = 'none';
  document.body.style.overflow = '';
}
function closeAwarenessPopupAndContinue() {
  closeAwarenessPopup();
  goTo('section-biz-info');
}

// ================================================================
// BACKEND INTEGRATION (via api.js module)
// ================================================================
const SESSION_KEY = 'edgefour_session_id';
let _currentValuationId = null;
let _pendingLeadEmail = '';

function getOrCreateSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : String(Date.now());
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// Save session on page load
(function initSession() {
  const sid = getOrCreateSessionId();
  const params = new URLSearchParams(window.location.search);
  apiSaveSession({
    session_id: sid,
    referrer: document.referrer || '',
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    user_agent: navigator.userAgent,
  });
})();

function getResultNumber(id) {
  const t = (document.getElementById(id)?.textContent || '').trim();
  const n = parseFloat(t.replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

async function saveValuation(data) {
  try {
    if (!_currentValuationId) {
      _currentValuationId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : String(Date.now());
    }

    const payload = {
      session_id: getOrCreateSessionId(),
      valuation_id: _currentValuationId,
      ...data,
      sliders: {
        growth: Number(data.growth_slider || 3),
        owner_dep: Number(data.owner_dep_slider || 3),
        recurring: Number(data.recurring_slider || 3),
        cust_conc: Number(data.cust_conc_slider || 3),
        systems: Number(data.systems_slider || 3),
        fin_records: Number(data.fin_records_slider || 3),
      },
    };

    const out = await apiSaveValuation(payload);
    if (out?.valuation_id) _currentValuationId = out.valuation_id;
  } catch (e) {
    console.warn('EdgeFour: save-valuation error:', e.message);
  }
}

function updateValuationEmail(email) {
  _pendingLeadEmail = email || '';
}

async function updateValuationQuiz(quizData) {
  try {
    if (!_currentValuationId) {
      _currentValuationId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : String(Date.now());
    }

    const payload = {
      session_id: getOrCreateSessionId(),
      valuation_id: _currentValuationId,
      lead_email: quizData?.lead_email || _pendingLeadEmail || '',
      quiz_timeline: quizData?.quiz_timeline || '',
      quiz_advisory_source: quizData?.quiz_advisory_source || '',
      email_content: {
        business_name: document.getElementById('results-biz-name')?.textContent?.trim() || 'Your Business',
        valuation_low: getResultNumber('val-low'),
        valuation_base: getResultNumber('val-base'),
        valuation_high: getResultNumber('val-high'),
        value_score: getResultNumber('score-num'),
        trajectory_top_factors: [],
        vip_recommendations: [],
      },
    };

    await apiSubmitQuiz(payload);
  } catch (e) {
    console.warn('EdgeFour: submit-quiz error:', e.message);
  }
}
// ================================================================


// ── Expose to global scope for inline HTML handlers ────────────────────
// Slider label arrays (referenced by oninput="updateSliderLabel(...,growthLabels)")
window.growthLabels = growthLabels;
window.ownerDepLabels = ownerDepLabels;
window.recurringLabels = recurringLabels;
window.custConcLabels = custConcLabels;
window.systemsLabels = systemsLabels;
window.finRecordsLabels = finRecordsLabels;

// Functions referenced by onclick/oninput/onblur/onfocus/onkeydown handlers
window.updateSliderLabel = updateSliderLabel;
window.goTo = goTo;
window.progressGoBack = progressGoBack;
window.showAwarenessPopup = showAwarenessPopup;
window.closeAwarenessPopup = closeAwarenessPopup;
window.closeAwarenessPopupAndContinue = closeAwarenessPopupAndContinue;
window.closeMethodologyPopupAndContinue = closeMethodologyPopupAndContinue;
window.validateBizInfoAndContinue = validateBizInfoAndContinue;
window.validateFinancialsAndContinue = validateFinancialsAndContinue;
window.setFinancialMode = setFinancialMode;
window.calculateAndShow = calculateAndShow;
window.confirmRestart = confirmRestart;
window.closeRestartModal = closeRestartModal;
window.closeRestartModalAndUnlock = closeRestartModalAndUnlock;
window.restartApp = restartApp;
window.quizNext = quizNext;
window.quizBack = quizBack;
window.buildSnapshot = buildSnapshot;
window.filterStates = filterStates;
window.selectState = selectState;
window.hideStateDropdown = hideStateDropdown;
window.stateKeydown = stateKeydown;
window.formatCurrencyInput = formatCurrencyInput;
window.recalcGuided = recalcGuided;
window.onIndustryChange = onIndustryChange;
