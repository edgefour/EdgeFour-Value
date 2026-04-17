/**
 * API client for EdgeFour Value backend.
 *
 * @typedef {import('../../shared/types.ts').CalculateResult} CalculateResult
 * @typedef {import('../../shared/types.ts').CalculateInput} CalculateInput
 */

const API_BASE = window.location.origin;

async function post(path, data) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    if (res.status === 204) return null;
    return res.json();
  } catch (err) {
    console.warn(`[api] ${path} failed:`, err.message);
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────

export async function saveSession(data) {
  return post("/api/save-session", data);
}

export async function saveStep1(data) {
  return post("/api/save-step1", data);
}

/** @param {CalculateInput} data */
export async function calculate(data) {
  return post("/api/calculate", data);
}

export async function saveValuation(data) {
  return post("/api/save-valuation", data);
}

export async function submitQuiz(data) {
  return post("/api/submit-quiz", data);
}

export function trackEvent(data) {
  post("/api/track-event", data);
}
