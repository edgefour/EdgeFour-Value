/**
 * EdgeFour Value — client UI (steps, validation, rendering).
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

const SLIDER_META = [
  { key: "growth", label: "Revenue growth & market position" },
  { key: "owner_dep", label: "Owner dependency & team depth" },
  { key: "recurring", label: "Recurring / predictable revenue" },
  { key: "cust_conc", label: "Customer concentration" },
  { key: "systems", label: "Systems, processes & documentation" },
  { key: "fin_records", label: "Financial records quality" },
];

const LEVELS = ["Very low", "Low", "Moderate", "High", "Very high"];

/** @type {CalculateResult | null} */
let lastResult = null;
let valuationId = sessionStorage.getItem(STORAGE_VALUATION) || "";
let stepEnteredAt = Date.now();
let pendingMethodology = null;

const els = {
  loading: document.getElementById("loading"),
  stepper: document.getElementById("stepper"),
  slidersRoot: document.getElementById("sliders-root"),
  methodologyBanner: document.getElementById("methodology-banner"),
  methodologyModal: document.getElementById("methodology-modal"),
  modalBody: document.getElementById("modal-body"),
  modalDismiss: document.getElementById("modal-dismiss"),
};

const views = {
  business_info: document.getElementById("view-business"),
  financials: document.getElementById("view-financials"),
  value_drivers: document.getElementById("view-drivers"),
  results: document.getElementById("view-results"),
  quiz: document.getElementById("view-quiz"),
  snapshot: document.getElementById("view-snapshot"),
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

function getStepFromViewEl(el) {
  return el?.dataset?.view || "landing";
}

function markStepStart() {
  stepEnteredAt = Date.now();
}

function durationSinceStepStart() {
  return Math.max(0, Math.round((Date.now() - stepEnteredAt) / 1000));
}

/** @param {keyof typeof views} name */
function showView(name) {
  for (const v of Object.values(views)) {
    v.classList.toggle("is-visible", v === views[name]);
  }

  const isForm =
    name === "business_info" || name === "financials" || name === "value_drivers";
  els.stepper.hidden = !isForm;
  if (isForm) {
    const stepMap = { business_info: 1, financials: 2, value_drivers: 3 };
    const n = stepMap[name];
    els.stepper.dataset.phase = "form";
    els.stepper.querySelectorAll(".step-dot").forEach((dot) => {
      dot.classList.toggle("is-active", dot.dataset.step === String(n));
    });
  } else {
    els.stepper.dataset.phase = "post";
  }

  markStepStart();
  const main = document.getElementById("main");
  const visible = main.querySelector(".view.is-visible");
  if (visible) visible.focus?.();
}

function readInputMode() {
  const sel = document.querySelector('input[name="input_mode"]:checked');
  return sel?.value === "calc" ? "calc" : "know";
}

function syncModeUi() {
  const mode = readInputMode();
  const calcFields = document.getElementById("calc-fields");
  const wrapEbitda = document.getElementById("wrap-ebitda");
  const ebitda = document.getElementById("ebitda");
  if (mode === "calc") {
    calcFields.style.display = "grid";
    wrapEbitda.style.display = "none";
    ebitda.removeAttribute("required");
  } else {
    calcFields.style.display = "none";
    wrapEbitda.style.display = "flex";
    ebitda.setAttribute("required", "");
  }
}

function readSlidersFromDom() {
  /** @type {import('../../shared/types.ts').SliderValues} */
  const sliders = {};
  for (const { key } of SLIDER_META) {
    const el = document.getElementById(`slider_${key}`);
    sliders[key] = el ? Number(el.value) : 3;
  }
  return sliders;
}

function writeSlidersToDom(values) {
  for (const { key } of SLIDER_META) {
    const el = document.getElementById(`slider_${key}`);
    if (el && values[key] != null) el.value = String(values[key]);
  }
}

function renderSliders() {
  els.slidersRoot.innerHTML = SLIDER_META.map(
    ({ key, label }) => `
    <div class="slider-block" data-slider-key="${key}">
      <div class="slider-head">
        <span class="name">${label}</span>
        <span class="val" id="slider_${key}_label">${LEVELS[2]}</span>
      </div>
      <input type="range" id="slider_${key}" min="1" max="5" step="1" value="3" aria-valuemin="1" aria-valuemax="5" />
      <div class="slider-scale"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
    </div>
  `
  ).join("");

  for (const { key } of SLIDER_META) {
    const input = document.getElementById(`slider_${key}`);
    const label = document.getElementById(`slider_${key}_label`);
    const updateLabel = () => {
      const v = Number(input.value);
      label.textContent = LEVELS[v - 1];
    };
    input.addEventListener("input", updateLabel);
    updateLabel();

    const debouncedTrack = debounce(() => {
      trackEvent({
        session_id: getSessionId(),
        event_type: "field_change",
        field_name: `slider_${key}`,
        old_value: "",
        new_value: String(input.value),
        step: "value_drivers",
      });
    }, 500);
    input.addEventListener("input", debouncedTrack);
  }
}

function clearErrors() {
  document.querySelectorAll('[id^="err-"]').forEach((el) => {
    el.textContent = "";
  });
}

function setError(id, msg) {
  const el = document.getElementById(`err-${id}`);
  if (el) el.textContent = msg || "";
}

function parseNum(id, required = true) {
  const el = document.getElementById(id);
  if (!el) return { ok: false, value: 0 };
  const raw = el.value.trim();
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
  const name = document.getElementById("business_name").value.trim();
  if (!name) {
    setError("business_name", "Enter a business name.");
    ok = false;
  }
  const industry = document.getElementById("industry").value;
  if (!industry) {
    setError("industry", "Select an industry.");
    ok = false;
  }
  const city = document.getElementById("city").value.trim();
  if (!city) {
    setError("city", "Enter a city.");
    ok = false;
  }
  const state = document.getElementById("state").value;
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
  const email = document.getElementById("lead_email").value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setError("lead_email", "Enter a valid email.");
    ok = false;
  }
  if (!document.getElementById("quiz_timeline").value) {
    setError("quiz_timeline", "Select a timeline.");
    ok = false;
  }
  if (!document.getElementById("quiz_advisory_source").value) {
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

/** @param {CalculateResult} r */
function renderResults(r) {
  document.getElementById("res-range").textContent = `${formatUsd(r.valuation_low)} – ${formatUsd(r.valuation_high)}`;
  const biz = document.getElementById("business_name").value.trim();
  document.getElementById("res-business-line").textContent = biz
    ? `${biz} · ${r.industry_category}`
    : r.industry_category;

  const stats = document.getElementById("res-stats");
  stats.innerHTML = [
    ["Adjusted EBITDA", formatUsd(r.adj_ebitda)],
    ["Base multiple", `${r.base_multiple.toFixed(2)}×`],
    ["Est. multiple", `${r.estimated_multiple.toFixed(2)}×`],
    ["Base value", formatUsd(r.valuation_base)],
  ]
    .map(
      ([k, v]) => `
    <div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>
  `
    )
    .join("");

  document.getElementById("res-score").textContent = String(r.value_score);
  document.getElementById("res-band").textContent = `Business Value Score — ${r.score_band}`;
  document.getElementById("res-band-desc").textContent = r.score_band_description;

  const good = document.getElementById("res-good");
  const bad = document.getElementById("res-bad");
  good.innerHTML = (r.good_factors.length ? r.good_factors : [{ name: "—", level: "", description: "No standout strengths at this rating level yet." }])
    .map(
      (f) => `
    <div class="factor-card good">
      <div class="t">${f.name}${f.level ? ` · ${f.level}` : ""}</div>
      <p>${f.description}</p>
    </div>
  `
    )
    .join("");
  bad.innerHTML = (r.bad_factors.length ? r.bad_factors : [{ name: "—", level: "", description: "No critical gaps flagged—still room to optimize." }])
    .map(
      (f) => `
    <div class="factor-card bad">
      <div class="t">${f.name}${f.level ? ` · ${f.level}` : ""}</div>
      <p>${f.description}</p>
    </div>
  `
    )
    .join("");

  const traj = r.trajectory;
  document.getElementById("res-traj-copy").innerHTML = `If you address the biggest levers, a realistic upside scenario could move enterprise value toward <span class="new-range">${formatUsd(traj.new_valuation_low)} – ${formatUsd(traj.new_valuation_high)}</span> (illustrative).`;
  const ul = document.getElementById("res-traj-factors");
  ul.innerHTML = traj.top_factors
    .map((f) => `<li><strong>${f.name}</strong>: ${f.current_level} → ${f.target_level} (~${formatUsd(f.delta)} illustrative EBITDA impact)</li>`)
    .join("");

  const banner = els.methodologyBanner;
  if (r.methodology_notice) {
    banner.textContent = r.methodology_notice;
    banner.classList.add("is-visible");
    pendingMethodology = r.methodology_notice;
  } else {
    banner.classList.remove("is-visible");
    banner.textContent = "";
    pendingMethodology = null;
  }
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
  document.getElementById("snap-lede").textContent = `Here are the three moves that typically unlock the most value for ${biz}—based on your inputs and our EBITDA-based model.`;

  const grid = document.getElementById("snap-vip");
  grid.innerHTML = r.vip_recommendations
    .map(
      (v) => `
    <div class="vip-card">
      <h4>${v.title}</h4>
      <p>${v.body}</p>
    </div>
  `
    )
    .join("");

  const t = r.trajectory;
  document.getElementById("snap-traj").textContent = `Illustrative “after improvements” range: ${formatUsd(t.new_valuation_low)} – ${formatUsd(t.new_valuation_high)}. Focus on ${t.top_factors
    .slice(0, 2)
    .map((f) => f.name.toLowerCase())
    .join(" and ")} first.`;

  const email = encodeURIComponent(document.getElementById("lead_email").value.trim());
  const name = encodeURIComponent(biz);
  document.getElementById("snap-calendly").href = `https://calendly.com/edgefour?email=${email}&name=${name}`;
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

  if (pendingMethodology) {
    els.modalBody.textContent = pendingMethodology;
    els.methodologyModal.hidden = false;
    els.methodologyModal.classList.add("is-open");
    trackEvent({
      session_id: getSessionId(),
      event_type: "popup_opened",
      step: "results",
      field_name: "methodology",
    });
  }
}

function goBackToDrivers() {
  trackEvent({
    session_id: getSessionId(),
    event_type: "step_back",
    step: "value_drivers",
    duration_seconds: durationSinceStepStart(),
  });
  showView("value_drivers");
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
    step: "business_info",
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
  document.getElementById("mode_know").checked = true;
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

  showView("business_info");
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

function bindModeSwitch() {
  const radios = document.querySelectorAll('input[name="input_mode"]');
  radios.forEach((r) => {
    r.addEventListener("change", () => {
      syncModeUi();
      trackEvent({
        session_id: getSessionId(),
        event_type: "mode_switch",
        field_name: "input_mode",
        old_value: "",
        new_value: readInputMode(),
        step: "financials",
      });
    });
  });
}

function init() {
  populateStates();
  renderSliders();
  syncModeUi();
  bindFieldBlurTracking();
  bindModeSwitch();

  document.getElementById("btn-business-next").addEventListener("click", advanceFromBusiness);
  document.getElementById("btn-financials-back").addEventListener("click", goBackToBusiness);
  document.getElementById("btn-financials-next").addEventListener("click", advanceFromFinancials);
  document.getElementById("btn-drivers-back").addEventListener("click", goBackToFinancials);
  document.getElementById("btn-calculate").addEventListener("click", runCalculate);
  document.getElementById("btn-results-edit").addEventListener("click", editInputsFromResults);
  document.getElementById("btn-results-quiz").addEventListener("click", openQuiz);
  document.getElementById("btn-quiz-back").addEventListener("click", backFromQuiz);
  document.getElementById("btn-quiz-submit").addEventListener("click", submitQuizForm);
  document.getElementById("btn-restart").addEventListener("click", restartFlow);

  els.modalDismiss.addEventListener("click", () => {
    els.methodologyModal.classList.remove("is-open");
    els.methodologyModal.hidden = true;
    trackEvent({
      session_id: getSessionId(),
      event_type: "popup_dismissed",
      step: "results",
      field_name: "methodology",
    });
  });

  const sessionId = getSessionId();
  saveSession({
    session_id: sessionId,
    referrer: document.referrer || "",
    ...parseUtm(),
    user_agent: navigator.userAgent,
  });

  showView("business_info");
}

init();
