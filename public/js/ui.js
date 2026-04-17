/**
 * EdgeFour Value — client UI (matches original edgefour-value layout).
 */

import {
  saveSession,
  saveStep1,
  calculate,
  saveValuation,
  submitQuiz,
  trackEvent,
} from "./api.js";

/** @typedef {import('../../shared/types.ts').CalculateResult} CalculateResult */

const STORAGE_SESSION = "edgefour_session_id";
const STORAGE_VALUATION = "edgefour_valuation_id";

const US_STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
  ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"],
  ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"],
  ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"],
  ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
  ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"],
  ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];

const GROWTH_LABELS = [
  "Declining (< 0%)",
  "Flat (0–2%)",
  "Stable (2–5%)",
  "Growing (5–15%)",
  "Hypergrowth (15%+)",
];
const OWNER_DEP_LABELS = [
  "Just owner(s); difficult to leave",
  "Owner(s) rarely away, but 1–2 senior staff",
  "Some management leadership, but owner(s) make most decisions",
  "Experienced team; key staff lead",
  "Strong non-owner leadership; business runs without owner(s)",
];
const RECURRING_LABELS = ["< 10%", "10–25%", "25–50%", "50–75%", "75%+ recurring"];
const CUST_CONC_LABELS = [
  "< 5% (spread out)",
  "5–10%",
  "10–25%",
  "25–50%",
  "> 50% (high risk)",
];
const SYSTEMS_LABELS = [
  "None documented; no software systems",
  "Basic notes",
  "Partially documented; some use of software systems",
  "Most processes documented; software systems in place",
  "Full SOPs + training; extensive use of software platform",
];
const FIN_RECORDS_LABELS = [
  "Unclear / messy",
  "Basic bookkeeping & customer records",
  "Adequate bookkeeping & customer records",
  "Clean QuickBooks/CPA; most underlying operational data available",
  "Reviewed or audited financials; complete underlying operational data",
];

/** Slider config: API key, DOM id (may include hyphen), display labels */
const SLIDER_CONFIG = [
  {
    key: "growth",
    domId: "growth",
    displayId: "growth-display",
    title: "3-Year Revenue Growth Rate",
    labels: GROWTH_LABELS,
    left: "Declining",
    right: "Hypergrowth",
    help: "How has revenue trended over the past 3 years?",
  },
  {
    key: "owner_dep",
    domId: "owner-dep",
    displayId: "owner-dep-display",
    title: "Owner Dependency / Management Team Strength",
    labels: OWNER_DEP_LABELS,
    left: "Fully dependent on owner(s)",
    right: "Runs without owner(s)",
    help: "How much does the business rely on the owner(s) day-to-day?",
  },
  {
    key: "recurring",
    domId: "recurring",
    displayId: "recurring-display",
    title: "Recurring Revenue Percentage",
    labels: RECURRING_LABELS,
    left: "All one-time",
    right: "Mostly recurring",
    help: "Contracts, subscriptions, retainers, or repeat customers.",
  },
  {
    key: "cust_conc",
    domId: "cust-conc",
    displayId: "cust-conc-display",
    title: "Largest Customer Revenue Concentration",
    labels: CUST_CONC_LABELS,
    left: "<5% (spread out)",
    right: ">50% (one big client)",
    help: "What percentage of revenue comes from your single largest customer?",
  },
  {
    key: "systems",
    domId: "systems",
    displayId: "systems-display",
    title: "Systems & Process Maturity",
    labels: SYSTEMS_LABELS,
    left: "Everything in owner(s) head",
    right: "Fully documented SOPs + systems",
    help: "How well are operations documented and followed?",
  },
  {
    key: "fin_records",
    domId: "fin-records",
    displayId: "fin-records-display",
    title: "Financial Record & Operational Data Quality",
    labels: FIN_RECORDS_LABELS,
    left: "Messy / incomplete",
    right: "CPA-reviewed or audited",
    help: "Accurate financials build buyer confidence.",
  },
];

/** @type {CalculateResult | null} */
let lastResult = null;
let valuationId = sessionStorage.getItem(STORAGE_VALUATION) || "";
let stepEnteredAt = Date.now();

const els = {
  loading: document.getElementById("loading"),
  slidersRoot: document.getElementById("sliders-root"),
  methodologyModal: document.getElementById("methodology-modal"),
  modalBody: document.getElementById("modal-body"),
  modalDismiss: document.getElementById("modal-dismiss"),
};

const views = {
  landing: document.getElementById("section-landing"),
  business_info: document.getElementById("section-biz-info"),
  financials: document.getElementById("section-financials"),
  value_drivers: document.getElementById("section-value-drivers"),
  results: document.getElementById("section-results"),
  quiz: document.getElementById("section-vip-quiz"),
  snapshot: document.getElementById("section-vip-snapshot"),
};

function showLoading(on) {
  els.loading.classList.toggle("is-open", on);
  els.loading.setAttribute("aria-hidden", on ? "false" : "true");
}

function formatUsd(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function getSessionId() {
  let id = sessionStorage.getItem(STORAGE_SESSION);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(STORAGE_SESSION, id);
  }
  return id;
}

function parseUtm() {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get("utm_source") || "",
    utm_medium: p.get("utm_medium") || "",
    utm_campaign: p.get("utm_campaign") || "",
  };
}

function markStepStart() {
  stepEnteredAt = Date.now();
}

function durationSinceStepStart() {
  return Math.max(0, Math.round((Date.now() - stepEnteredAt) / 1000));
}

function updateProgress(viewName) {
  const prog = document.getElementById("progress-container");
  const fill = document.getElementById("progress-fill");
  const label = document.getElementById("progress-label");
  const backBtn = document.getElementById("progress-back-btn");
  if (!prog || !fill || !label) return;

  if (viewName === "landing") {
    prog.classList.remove("show");
    backBtn?.classList.remove("visible");
    return;
  }

  prog.classList.add("show");
  backBtn?.classList.add("visible");

  if (viewName === "results") {
    fill.style.width = "100%";
    label.textContent = "Valuation Complete";
  } else if (viewName === "quiz") {
    fill.style.width = "100%";
    label.textContent = "Improvement Plan";
  } else if (viewName === "snapshot") {
    fill.style.width = "100%";
    label.textContent = "Plan Ready ◆";
  } else {
    const stepMap = { business_info: 1, financials: 2, value_drivers: 3 };
    const step = stepMap[viewName] || 1;
    fill.style.width = `${(step / 3) * 100}%`;
    label.textContent = `Step ${step} of 3`;
  }
}

function progressGoBack() {
  /** @type {Record<string, keyof typeof views | undefined>} */
  const backMap = {
    business_info: "landing",
    financials: "business_info",
    value_drivers: "financials",
    results: "value_drivers",
    quiz: "results",
    snapshot: "results",
  };
  const dest = backMap[getCurrentViewName()];
  if (dest) showView(dest);
}

function getCurrentViewName() {
  for (const [name, el] of Object.entries(views)) {
    if (el?.classList.contains("active")) return /** @type {keyof typeof views} */ (name);
  }
  return "landing";
}

/** @param {keyof typeof views} name */
function showView(name) {
  for (const el of Object.values(views)) {
    el?.classList.remove("active");
  }
  views[name]?.classList.add("active");
  updateProgress(name);
  markStepStart();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearErrors() {
  document.querySelectorAll('[id^="err-"]').forEach((el) => {
    el.textContent = "";
    el.style.display = "none";
  });
  document.querySelectorAll(".field-error").forEach((el) => {
    el.classList.remove("field-error");
  });
}

function setError(id, msg) {
  const err = document.getElementById(`err-${id}`);
  const input = document.getElementById(id);
  if (err) {
    err.textContent = msg || "";
    err.style.display = msg ? "block" : "none";
  }
  const group = input?.closest(".field-group");
  if (group) group.classList.toggle("field-error", Boolean(msg));
}

function readInputMode() {
  const v = document.getElementById("input_mode_field")?.value;
  return v === "calc" ? "calc" : "know";
}

function syncModeUi() {
  const mode = readInputMode();
  document.getElementById("mode-btn-know")?.classList.toggle("active", mode === "know");
  document.getElementById("mode-btn-calc")?.classList.toggle("active", mode === "calc");

  const knowCard = document.getElementById("mode-know-card");
  const calcFields = document.getElementById("calc-fields");
  const wrapEbitda = document.getElementById("wrap-ebitda");
  const ebitda = document.getElementById("ebitda");
  if (mode === "calc") {
    if (knowCard) knowCard.style.display = "none";
    if (calcFields) calcFields.style.display = "block";
    if (wrapEbitda) wrapEbitda.style.display = "none";
    ebitda?.removeAttribute("required");
  } else {
    if (knowCard) knowCard.style.display = "block";
    if (calcFields) calcFields.style.display = "none";
    if (wrapEbitda) wrapEbitda.style.display = "block";
    ebitda?.setAttribute("required", "");
  }
}

function readSlidersFromDom() {
  /** @type {import('../../shared/types.ts').SliderValues} */
  const sliders = {};
  for (const s of SLIDER_CONFIG) {
    const el = document.getElementById(s.domId);
    sliders[s.key] = el ? Number(el.value) : 3;
  }
  return sliders;
}

function writeSlidersToDom(values) {
  for (const s of SLIDER_CONFIG) {
    const el = document.getElementById(s.domId);
    const v = values[s.key];
    if (el && v != null) {
      el.value = String(v);
      updateSliderDisplay(s.domId, s.displayId, s.labels);
    }
  }
}

function updateSliderDisplay(sliderDomId, displayId, labels) {
  const input = document.getElementById(sliderDomId);
  const disp = document.getElementById(displayId);
  if (!input || !disp) return;
  const v = Number(input.value);
  disp.textContent = labels[v - 1] || "";
}

function renderSliders() {
  if (!els.slidersRoot) return;
  els.slidersRoot.innerHTML = SLIDER_CONFIG.map(
    (s) => `
    <div class="form-card">
      <div class="field-group slider-field">
        <label for="${s.domId}">${s.title}</label>
        <div class="slider-value-display" id="${s.displayId}">${s.labels[2]}</div>
        <input type="range" id="${s.domId}" min="1" max="5" step="1" value="3" />
        <div class="slider-labels"><span>${s.left}</span><span>${s.right}</span></div>
        <span class="helper">${s.help}</span>
      </div>
    </div>
  `
  ).join("");

  for (const s of SLIDER_CONFIG) {
    const input = document.getElementById(s.domId);
    if (!input) continue;
    input.addEventListener("input", () =>
      updateSliderDisplay(s.domId, s.displayId, s.labels)
    );
    const debouncedTrack = debounce(() => {
      trackEvent({
        session_id: getSessionId(),
        event_type: "field_change",
        field_name: s.domId,
        old_value: "",
        new_value: String(input.value),
        step: "value_drivers",
      });
    }, 500);
    input.addEventListener("input", debouncedTrack);
  }
}

function parseNum(id, required = true) {
  const el = document.getElementById(id);
  if (!el) return { ok: false, value: 0 };
  const raw = String(el.value).trim();
  if (raw === "") {
    if (required) return { ok: false, value: 0 };
    return { ok: true, value: 0 };
  }
  const n = Number(raw);
  if (Number.isNaN(n)) return { ok: false, value: 0 };
  return { ok: true, value: n };
}

function validateBusiness() {
  clearErrors();
  let ok = true;
  const name = document.getElementById("business_name")?.value.trim();
  if (!name) {
    setError("business_name", "This field is required.");
    ok = false;
  }
  const industry = document.getElementById("industry")?.value;
  if (!industry) {
    setError("industry", "Select an industry.");
    ok = false;
  }
  const city = document.getElementById("city")?.value.trim();
  if (!city) {
    setError("city", "This field is required.");
    ok = false;
  }
  const state = document.getElementById("state")?.value;
  if (!state) {
    setError("state", "Select a state.");
    ok = false;
  }
  const y = parseNum("years_in_business");
  if (!y.ok || y.value < 0) {
    setError("years_in_business", "Enter years in business.");
    ok = false;
  }
  const e = parseNum("employees");
  if (!e.ok || e.value < 0) {
    setError("employees", "Enter employee count.");
    ok = false;
  }
  return ok;
}

function validateFinancials() {
  clearErrors();
  let ok = true;
  const mode = readInputMode();

  const rev = parseNum("revenue");
  if (!rev.ok || rev.value < 0) {
    setError("revenue", "Enter annual revenue.");
    ok = false;
  }

  if (mode === "know") {
    const eb = parseNum("ebitda", true);
    if (!eb.ok) {
      setError("ebitda", "Enter EBITDA.");
      ok = false;
    }
  } else {
    const earnings = parseNum("earnings", true);
    if (!earnings.ok) {
      setError("earnings", "Enter net income.");
      ok = false;
    }
    for (const fid of ["interest_expense", "taxes_paid", "depreciation_amort"]) {
      const x = parseNum(fid, false);
      if (!x.ok) {
        setError(fid, "Enter a valid number.");
        ok = false;
      }
    }
  }

  for (const fid of ["owner_salary", "market_salary", "addbacks"]) {
    const x = parseNum(fid, true);
    if (!x.ok || x.value < 0) {
      setError(fid, "Enter a valid amount (0 or more).");
      ok = false;
    }
  }

  return ok;
}

function validateQuiz() {
  clearErrors();
  let ok = true;
  const email = document.getElementById("lead_email")?.value.trim() || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setError("lead_email", "Enter a valid email.");
    ok = false;
  }
  if (!document.getElementById("quiz_timeline")?.value) {
    setError("quiz_timeline", "Select a timeframe.");
    ok = false;
  }
  if (!document.getElementById("quiz_advisory_source")?.value) {
    setError("quiz_advisory_source", "Select an option.");
    ok = false;
  }
  return ok;
}

function collectCalculateInput() {
  const mode = readInputMode();
  const sliders = readSlidersFromDom();
  const base = {
    industry: document.getElementById("industry").value,
    years_in_business: Number(document.getElementById("years_in_business").value),
    revenue: Number(document.getElementById("revenue").value),
    ebitda: mode === "know" ? Number(document.getElementById("ebitda").value) : 0,
    input_mode: mode,
    owner_salary: Number(document.getElementById("owner_salary").value),
    market_salary: Number(document.getElementById("market_salary").value),
    addbacks: Number(document.getElementById("addbacks").value),
    sliders,
  };
  if (mode === "calc") {
    base.earnings = Number(document.getElementById("earnings").value) || 0;
    base.interest_expense = Number(document.getElementById("interest_expense").value) || 0;
    base.taxes_paid = Number(document.getElementById("taxes_paid").value) || 0;
    base.depreciation_amort =
      Number(document.getElementById("depreciation_amort").value) || 0;
  }
  return base;
}

function getIndustryLabel() {
  const sel = document.getElementById("industry");
  if (!sel) return "";
  const opt = sel.options[sel.selectedIndex];
  return opt?.text?.trim() || "";
}

/** @param {CalculateResult} r */
function renderResults(r) {
  const biz = document.getElementById("business_name")?.value.trim() || "Your Business";
  document.getElementById("results-biz-name").textContent = biz;

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const indLabel = getIndustryLabel() || r.industry_category;
  document.getElementById("results-subtitle").textContent =
    `Valuation Estimate • ${dateStr} · ${indLabel}`;

  document.getElementById("results-awareness").textContent = `${r.score_band} · Business Value Score`;

  const noticeEl = document.getElementById("industry-notice");
  if (r.methodology_notice) {
    noticeEl.style.display = "block";
    document.getElementById("industry-notice-title").textContent =
      "Important context for your industry";
    document.getElementById("industry-notice-body").textContent = r.methodology_notice;
  } else {
    noticeEl.style.display = "none";
  }

  document.getElementById("score-num").textContent = String(r.value_score);
  document.getElementById("score-desc").textContent = r.score_band_description;

  document.getElementById("val-low").textContent = formatUsd(r.valuation_low);
  document.getElementById("val-base").textContent = formatUsd(r.valuation_base);
  document.getElementById("val-high").textContent = formatUsd(r.valuation_high);

  document.getElementById("adj-ebitda").textContent = formatUsd(r.adj_ebitda);
  document.getElementById("est-multiple").textContent = `${r.estimated_multiple.toFixed(2)}×`;

  const bonusLine = document.getElementById("revenue-bonus-line");
  if (r.revenue_scale_bonus > 0) {
    bonusLine.style.display = "block";
    document.getElementById("revenue-bonus-amt").textContent =
      `Includes +${r.revenue_scale_bonus.toFixed(2)}× revenue-scale adjustment (illustrative).`;
  } else {
    bonusLine.style.display = "none";
  }

  const traj = r.trajectory;
  document.getElementById("traj-today").textContent = formatUsd(r.valuation_base);
  document.getElementById("traj-improved").textContent = `${formatUsd(traj.new_valuation_low)} – ${formatUsd(traj.new_valuation_high)}`;
  document.getElementById("traj-uplift").textContent = `↑ ${formatUsd(traj.uplift_amount)} potential upside`;

  document.getElementById("traj-actions").innerHTML = traj.top_factors
    .map(
      (f) =>
        `<div style="font-size:13px;color:var(--slate-light);margin-bottom:8px;line-height:1.5;"><strong>${f.name}</strong>: ${f.current_level} → ${f.target_level}</div>`
    )
    .join("");

  const fg = document.getElementById("factors-good");
  const fb = document.getElementById("factors-bad");
  const good = r.good_factors.length
    ? r.good_factors
    : [
        {
          name: "—",
          level: "",
          description: "No standout strengths flagged at current ratings.",
        },
      ];
  const bad = r.bad_factors.length
    ? r.bad_factors
    : [
        {
          name: "—",
          level: "",
          description: "No major discount factors flagged — still room to optimize.",
        },
      ];

  fg.innerHTML = good
    .map(
      (f) => `<div class="factor-item"><span class="factor-dot"></span><div><strong>${f.name}</strong>${f.level ? ` — ${f.level}` : ""}<br>${f.description}</div></div>`
    )
    .join("");
  fb.innerHTML = bad
    .map(
      (f) => `<div class="factor-item"><span class="factor-dot"></span><div><strong>${f.name}</strong>${f.level ? ` — ${f.level}` : ""}<br>${f.description}</div></div>`
    )
    .join("");
}

/** @param {CalculateResult} r */
function buildEmailContent(r) {
  const biz = document.getElementById("business_name").value.trim() || "Your business";
  return {
    business_name: biz,
    valuation_low: r.valuation_low,
    valuation_base: r.valuation_base,
    valuation_high: r.valuation_high,
    value_score: r.value_score,
    trajectory_top_factors: r.trajectory.top_factors.map((f) => ({
      name: f.name,
      delta: f.delta,
    })),
    vip_recommendations: r.vip_recommendations,
  };
}

/** @param {CalculateResult} r */
function renderSnapshot(r) {
  const biz = document.getElementById("business_name").value.trim() || "your business";
  document.getElementById("snap-lede").textContent = `Based on your valuation, here are the highest-impact moves for ${biz} — tailored to what you shared.`;

  const qt = document.getElementById("quiz_timeline");
  const timelineLabel =
    qt?.options[qt.selectedIndex]?.text?.trim() || "Your timeline";
  document.getElementById("snap-timeline-text").textContent = `Timeline: ${timelineLabel}`;

  const rec = document.getElementById("recommendations");
  rec.innerHTML = r.vip_recommendations
    .map(
      (v, i) => `
    <div class="rec-item">
      <div class="rec-diamond">◆</div>
      <div class="rec-content">
        <div class="rec-title">${v.title}</div>
        <div class="rec-desc">${v.body}</div>
      </div>
    </div>
  `
    )
    .join("");

  const t = r.trajectory;
  document.getElementById("snap-traj").textContent = `Illustrative range after key improvements: ${formatUsd(t.new_valuation_low)} – ${formatUsd(t.new_valuation_high)}. Prioritize ${t.top_factors
    .slice(0, 2)
    .map((f) => f.name.toLowerCase())
    .join(" and ")}.`;

  const email = encodeURIComponent(document.getElementById("lead_email").value.trim());
  const name = encodeURIComponent(biz);
  const cal = document.getElementById("snap-calendly");
  cal.href = `https://calendly.com/edgefour?email=${email}&name=${name}`;
}

async function loadIndustryOptions() {
  const sel = document.getElementById("industry");
  try {
    const res = await fetch("/industry-options-fragment.html");
    const html = await res.text();
    sel.innerHTML = html.trim();
  } catch {
    sel.innerHTML =
      '<option value="">Select your industry…</option><option value="other">Other / Not Listed</option>';
  }
}

async function startFromLanding() {
  trackEvent({
    session_id: getSessionId(),
    event_type: "step_advance",
    step: "business_info",
    duration_seconds: durationSinceStepStart(),
  });
  showView("business_info");
}

async function advanceFromBusiness() {
  if (!validateBusiness()) return;

  trackEvent({
    session_id: getSessionId(),
    event_type: "step_advance",
    step: "financials",
    duration_seconds: durationSinceStepStart(),
  });

  showLoading(true);
  const res = await saveStep1({
    session_id: getSessionId(),
    business_name: document.getElementById("business_name").value.trim(),
    industry: document.getElementById("industry").value,
    city: document.getElementById("city").value.trim(),
    state: document.getElementById("state").value,
    years_in_business: Number(document.getElementById("years_in_business").value),
    employees: Number(document.getElementById("employees").value),
  });
  showLoading(false);

  if (res?.valuation_id) {
    valuationId = res.valuation_id;
    sessionStorage.setItem(STORAGE_VALUATION, valuationId);
  }

  showView("financials");
}

function goBackToLanding() {
  trackEvent({
    session_id: getSessionId(),
    event_type: "step_back",
    step: "business_info",
    duration_seconds: durationSinceStepStart(),
  });
  showView("landing");
}

function goBackToBusiness() {
  trackEvent({
    session_id: getSessionId(),
    event_type: "step_back",
    step: "business_info",
    duration_seconds: durationSinceStepStart(),
  });
  showView("business_info");
}

function advanceFromFinancials() {
  if (!validateFinancials()) return;
  trackEvent({
    session_id: getSessionId(),
    event_type: "step_advance",
    step: "value_drivers",
    duration_seconds: durationSinceStepStart(),
  });
  showView("value_drivers");
}

function goBackToFinancials() {
  trackEvent({
    session_id: getSessionId(),
    event_type: "step_back",
    step: "financials",
    duration_seconds: durationSinceStepStart(),
  });
  showView("financials");
}

async function runCalculate() {
  trackEvent({
    session_id: getSessionId(),
    event_type: "step_advance",
    step: "results",
    duration_seconds: durationSinceStepStart(),
  });

  const payload = collectCalculateInput();
  showLoading(true);
  const result = await calculate(payload);
  showLoading(false);

  if (!result) {
    alert("We couldn’t calculate your valuation right now. Check your connection and try again.");
    return;
  }

  lastResult = result;
  renderResults(result);

  showLoading(true);
  const savePayload = {
    session_id: getSessionId(),
    valuation_id: valuationId,
    business_name: document.getElementById("business_name").value.trim(),
    industry: payload.industry,
    city: document.getElementById("city").value.trim(),
    state: document.getElementById("state").value,
    years_in_business: payload.years_in_business,
    employees: Number(document.getElementById("employees").value),
    input_mode: payload.input_mode,
    revenue: payload.revenue,
    ebitda: payload.input_mode === "know" ? payload.ebitda : 0,
    earnings: payload.earnings,
    interest_expense: payload.interest_expense,
    taxes_paid: payload.taxes_paid,
    depreciation_amort: payload.depreciation_amort,
    owner_salary: payload.owner_salary,
    market_salary: payload.market_salary,
    addbacks: payload.addbacks,
    adj_ebitda: result.adj_ebitda,
    base_multiple: result.base_multiple,
    estimated_multiple: result.estimated_multiple,
    years_bonus: result.years_bonus,
    revenue_scale_bonus: result.revenue_scale_bonus,
    valuation_low: result.valuation_low,
    valuation_base: result.valuation_base,
    valuation_high: result.valuation_high,
    value_score: result.value_score,
    growth_slider: payload.sliders.growth,
    owner_dep_slider: payload.sliders.owner_dep,
    recurring_slider: payload.sliders.recurring,
    cust_conc_slider: payload.sliders.cust_conc,
    systems_slider: payload.sliders.systems,
    fin_records_slider: payload.sliders.fin_records,
    sliders: payload.sliders,
  };

  const saved = await saveValuation(savePayload);
  showLoading(false);
  if (saved?.valuation_id) {
    valuationId = saved.valuation_id;
    sessionStorage.setItem(STORAGE_VALUATION, valuationId);
  }

  showView("results");
}

function editInputsFromResults() {
  trackEvent({
    session_id: getSessionId(),
    event_type: "recalculate",
    step: "value_drivers",
  });
  showView("value_drivers");
}

function openQuiz() {
  trackEvent({
    session_id: getSessionId(),
    event_type: "step_advance",
    step: "quiz",
    duration_seconds: durationSinceStepStart(),
  });
  showView("quiz");
}

function backFromQuiz() {
  trackEvent({
    session_id: getSessionId(),
    event_type: "step_back",
    step: "results",
    duration_seconds: durationSinceStepStart(),
  });
  showView("results");
}

async function submitQuizForm() {
  if (!validateQuiz() || !lastResult) return;

  showLoading(true);
  await submitQuiz({
    session_id: getSessionId(),
    valuation_id: valuationId,
    lead_email: document.getElementById("lead_email").value.trim(),
    quiz_timeline: document.getElementById("quiz_timeline").value,
    quiz_advisory_source: document.getElementById("quiz_advisory_source").value,
    email_content: buildEmailContent(lastResult),
  });
  showLoading(false);

  renderSnapshot(lastResult);
  trackEvent({
    session_id: getSessionId(),
    event_type: "step_advance",
    step: "snapshot",
    duration_seconds: durationSinceStepStart(),
  });
  showView("snapshot");
}

function restartFlow() {
  trackEvent({
    session_id: getSessionId(),
    event_type: "restart",
    step: "landing",
    duration_seconds: durationSinceStepStart(),
  });

  lastResult = null;
  valuationId = "";
  sessionStorage.removeItem(STORAGE_VALUATION);

  document.getElementById("business_name").value = "";
  document.getElementById("industry").value = "";
  document.getElementById("city").value = "";
  document.getElementById("state").value = "";
  document.getElementById("years_in_business").value = "";
  document.getElementById("employees").value = "";

  document.getElementById("revenue").value = "";
  document.getElementById("ebitda").value = "";
  document.getElementById("earnings").value = "";
  document.getElementById("interest_expense").value = "";
  document.getElementById("taxes_paid").value = "";
  document.getElementById("depreciation_amort").value = "";
  document.getElementById("owner_salary").value = "0";
  document.getElementById("market_salary").value = "0";
  document.getElementById("addbacks").value = "0";
  document.getElementById("input_mode_field").value = "know";
  syncModeUi();

  writeSlidersToDom({
    growth: 3,
    owner_dep: 3,
    recurring: 3,
    cust_conc: 3,
    systems: 3,
    fin_records: 3,
  });

  document.getElementById("lead_email").value = "";
  document.getElementById("quiz_timeline").value = "";
  document.getElementById("quiz_advisory_source").value = "";

  loadIndustryOptions();
  showView("landing");
}

function populateStates() {
  const sel = document.getElementById("state");
  for (const [abbr, name] of US_STATES) {
    const opt = document.createElement("option");
    opt.value = abbr;
    opt.textContent = `${name} (${abbr})`;
    sel.appendChild(opt);
  }
}

function bindFieldBlurTracking() {
  const fields = [
    ["business_name", "business_info"],
    ["city", "business_info"],
    ["years_in_business", "business_info"],
    ["employees", "business_info"],
    ["revenue", "financials"],
    ["ebitda", "financials"],
    ["earnings", "financials"],
    ["interest_expense", "financials"],
    ["taxes_paid", "financials"],
    ["depreciation_amort", "financials"],
    ["owner_salary", "financials"],
    ["market_salary", "financials"],
    ["addbacks", "financials"],
  ];

  for (const [id, step] of fields) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener("blur", () => {
      trackEvent({
        session_id: getSessionId(),
        event_type: "field_change",
        field_name: id,
        old_value: "",
        new_value: String(el.value),
        step,
      });
    });
  }

  document.getElementById("industry").addEventListener("change", () => {
    trackEvent({
      session_id: getSessionId(),
      event_type: "field_change",
      field_name: "industry",
      old_value: "",
      new_value: document.getElementById("industry").value,
      step: "business_info",
    });
  });

  document.getElementById("state").addEventListener("change", () => {
    trackEvent({
      session_id: getSessionId(),
      event_type: "field_change",
      field_name: "state",
      old_value: "",
      new_value: document.getElementById("state").value,
      step: "business_info",
    });
  });
}

function bindModeButtons() {
  document.getElementById("mode-btn-know")?.addEventListener("click", () => {
    document.getElementById("input_mode_field").value = "know";
    syncModeUi();
    trackEvent({
      session_id: getSessionId(),
      event_type: "mode_switch",
      field_name: "input_mode",
      old_value: "",
      new_value: "know",
      step: "financials",
    });
  });
  document.getElementById("mode-btn-calc")?.addEventListener("click", () => {
    document.getElementById("input_mode_field").value = "calc";
    syncModeUi();
    trackEvent({
      session_id: getSessionId(),
      event_type: "mode_switch",
      field_name: "input_mode",
      old_value: "",
      new_value: "calc",
      step: "financials",
    });
  });
}

async function init() {
  await loadIndustryOptions();
  populateStates();
  renderSliders();
  syncModeUi();
  bindFieldBlurTracking();
  bindModeButtons();

  document.getElementById("btn-landing-start")?.addEventListener("click", startFromLanding);
  document.getElementById("btn-biz-back")?.addEventListener("click", goBackToLanding);
  document.getElementById("btn-business-next")?.addEventListener("click", advanceFromBusiness);
  document.getElementById("btn-financials-back")?.addEventListener("click", goBackToBusiness);
  document.getElementById("btn-financials-next")?.addEventListener("click", advanceFromFinancials);
  document.getElementById("btn-drivers-back")?.addEventListener("click", goBackToFinancials);
  document.getElementById("btn-calculate")?.addEventListener("click", runCalculate);
  document.getElementById("btn-results-back-drivers")?.addEventListener("click", editInputsFromResults);
  document.getElementById("btn-results-quiz")?.addEventListener("click", openQuiz);
  document.getElementById("btn-quiz-back")?.addEventListener("click", backFromQuiz);
  document.getElementById("btn-quiz-submit")?.addEventListener("click", submitQuizForm);
  document.getElementById("btn-restart")?.addEventListener("click", restartFlow);
  document.getElementById("btn-restart-from-results")?.addEventListener("click", restartFlow);
  document.getElementById("btn-snapshot-back-results")?.addEventListener("click", () =>
    showView("results")
  );
  document.getElementById("progress-back-btn")?.addEventListener("click", progressGoBack);

  els.modalDismiss?.addEventListener("click", () => {
    els.methodologyModal.classList.remove("is-open");
    els.methodologyModal.hidden = true;
    trackEvent({
      session_id: getSessionId(),
      event_type: "popup_dismissed",
      step: "results",
      field_name: "methodology",
    });
  });

  saveSession({
    session_id: getSessionId(),
    referrer: document.referrer || "",
    ...parseUtm(),
    user_agent: navigator.userAgent,
  });

  showView("landing");
}

init();
