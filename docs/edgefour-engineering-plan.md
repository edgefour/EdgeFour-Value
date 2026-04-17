# EdgeFour Value — Engineering Plan

**Purpose:** Migrate the existing single-file HTML valuation tool to a proper backend architecture with Supabase, Netlify Functions, audit tracking, email integration, and Calendly booking attribution.

**Audience:** Coding agent or engineer implementing the rebuild.

---

## 1. Context

EdgeFour Value is a lead-generation tool for Edge Four LLC, a small business advisory firm. Users enter business info + financials, get an EBITDA-based valuation and improvement plan, and are prompted to book a Calendly call. The tool is the top of Edge Four's sales funnel.

The existing implementation is a single `edgefour-value.html` file with all logic, calc, and DB calls inlined. It posts directly to Supabase using the anon key. The calc logic is proprietary (114 industry multiples, owner dependency arrays, slider adjustments — carefully calibrated by the business lead).

**What we're building:** A clean separation of frontend (form + UI only) and backend (calc + DB + email + webhooks), with full audit tracking of user behavior, email delivery attribution, and Calendly booking attribution. No auth — the tool is open to the public internet.

---

## 2. Stack

- **Frontend:** Plain HTML + ES modules (no build step, no framework)
- **Backend:** Netlify Functions written in TypeScript
- **Database:** Supabase (PostgreSQL)
- **Email:** Resend (domain `edgefourllc.com` already DNS-verified)
- **Booking:** Calendly (existing account at `calendly.com/edgefour`)
- **Local runtime:** Bun (dev server mimics Netlify Functions)
- **CI/CD:** GitHub Actions → Netlify CLI deploy
- **Hosting:** Netlify free tier (custom domain TBD — not yet purchased)

---

## 3. Architecture

### 3.1 Separation of Concerns

**Frontend owns:**
- Form state (all inputs across 3 steps)
- Step navigation and validation
- UI rendering of results, snapshot, and quiz
- Session ID generation and persistence
- UTM param capture on landing
- Debouncing of slider events
- Fire-and-forget audit event tracking

**Backend owns:**
- All valuation calculation logic
- Industry multiples, owner dep arrays, slider adjustments
- VIP recommendation copy generation
- Trajectory card content generation
- All database writes
- Email sending via Resend
- Webhook receivers for Resend and Calendly
- Input validation and bounds checking

The frontend never sees the industry multiples, slider formulas, or recommendation logic. The `calculate` function returns a fat JSON payload containing everything the UI needs to render — numbers, pre-computed copy strings, factor lists, all of it.

### 3.2 Data Flow

```
User lands
  └─ POST /save-session  → creates sessions row, returns session_id (stored in sessionStorage)

User completes Step 1 (Business Info)
  └─ POST /save-step1    → inserts valuations row, returns valuation_id

User interacts with form
  └─ POST /track-event   → appends to form_events (fire-and-forget, silent fail)

User clicks Calculate (end of Step 3)
  └─ POST /calculate     → runs calc, returns full result payload
  └─ POST /save-valuation → PATCHes valuations row with calc outputs

User completes quiz
  └─ POST /submit-quiz   → PATCHes lead_email + quiz answers
                         → triggers /send-email internally
                         → PATCHes report_sent_at on success

Resend delivery events
  └─ POST /resend-webhook → updates emails_sent row with delivered_at / opened_at / bounced_at

User books via Calendly CTA
  └─ Calendly POSTs /calendly-webhook → matches by email, inserts bookings row
```

### 3.3 Session Lifecycle

- `session_id` generated client-side as a UUID on page load
- Stored in `sessionStorage` (survives refresh within tab, dies on tab close)
- Restart button preserves session_id (intentional — tracks that the user restarted)
- Full page reload generates a new session_id (accepted tradeoff)
- Session has no expiration on the backend — rows persist indefinitely

---

## 4. Repository Structure

```
/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── public/
│   └── index.html
├── js/
│   ├── api.js              # fetch calls to Netlify functions
│   └── ui.js               # form state, step nav, rendering, event handlers
├── shared/
│   └── types.ts            # shared TS types used by both frontend and backend
├── netlify/
│   └── functions/
│       ├── _lib/
│       │   ├── cors.ts     # CORS helper with environment-aware allowlist
│       │   ├── db.ts       # Supabase client + logError() helper
│       │   ├── validate.ts # input bounds + email format validation
│       │   └── resend.ts   # Resend client wrapper
│       ├── save-session.ts
│       ├── save-step1.ts
│       ├── save-valuation.ts
│       ├── calculate.ts
│       ├── submit-quiz.ts
│       ├── send-email.ts
│       ├── track-event.ts
│       ├── resend-webhook.ts
│       └── calendly-webhook.ts
├── server.ts               # Bun local dev server (NOT deployed)
├── netlify.toml
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

**Notes:**
- `server.ts` is local-only. Netlify ignores it. It imports the same handlers that Netlify deploys and routes requests to them locally.
- `shared/types.ts` is imported by both `js/api.js` (via JSDoc type hints or TS-checked JS) and backend functions. Keeps the calc result shape in sync.
- Frontend uses plain JS with ES modules — no build step. If type safety on the frontend becomes desirable later, migrate to Vite + TS without changing the function architecture.

---

## 5. Database Schema

All tables use `timestamptz` for timestamps. Standard columns on every table: `created_at` (default `now()`), and `updated_at` where applicable (auto-updated via trigger).

### 5.1 `sessions`

One row per page load. Created by `save-session.ts` on landing.

```
id                 uuid PK default gen_random_uuid()
session_id         uuid UNIQUE NOT NULL                   -- the linking key across all tables
referrer           text
utm_source         text
utm_medium         text
utm_campaign       text
device_type        text                                    -- mobile | desktop | tablet
browser            text                                    -- parsed from user agent
ip_address         text                                    -- optional; discuss with Nate if concerned
landing_at         timestamptz NOT NULL default now()
last_seen_at       timestamptz NOT NULL default now()      -- updated on every event
furthest_step      text NOT NULL default 'landing'         -- enum, see below
completed          boolean NOT NULL default false          -- true when quiz submitted
created_at         timestamptz NOT NULL default now()
updated_at         timestamptz NOT NULL default now()
```

**`furthest_step` enum values:**
`landing`, `business_info`, `financials`, `value_drivers`, `results`, `quiz`, `snapshot`

Enforce via a CHECK constraint or a Postgres enum type. Advance this value whenever a user reaches a new step — never move it backward even if they navigate back.

### 5.2 `valuations`

One row per calculation run. If the user recalculates after going back, insert a new row — do not overwrite.

```
id                      uuid PK default gen_random_uuid()
session_id              uuid NOT NULL                       -- FK to sessions.session_id
recalculation_number    int NOT NULL                        -- computed server-side as COUNT(*)+1 for session

-- Business info
business_name           text
industry                text
city                    text
state                   text
years_in_business       int
employees               int

-- Financial inputs
input_mode              text                                -- 'know' or 'calc'
revenue                 numeric
ebitda                  numeric
earnings                numeric                             -- mode 'calc' only
interest_expense        numeric                             -- mode 'calc' only
taxes_paid              numeric                             -- mode 'calc' only
depreciation_amort      numeric                             -- mode 'calc' only
owner_salary            numeric
market_salary           numeric
addbacks                numeric
adj_ebitda              numeric

-- Calc outputs
base_multiple           numeric
estimated_multiple      numeric
years_bonus             numeric
revenue_scale_bonus     numeric
valuation_low           numeric
valuation_base          numeric
valuation_high          numeric
value_score             int

-- Slider values
growth_slider           int
owner_dep_slider        int
recurring_slider        int
cust_conc_slider        int
systems_slider          int
fin_records_slider      int

-- Lead capture
lead_email              text
quiz_timeline           text
quiz_advisory_source    text

-- Flags
calculated_at           timestamptz
report_sent_at          timestamptz                         -- set after email success

created_at              timestamptz NOT NULL default now()
updated_at              timestamptz NOT NULL default now()
```

**Indexes:**
- `idx_valuations_session` on `session_id`
- `idx_valuations_lead_email` on `lead_email`

### 5.3 `form_events`

Append-only audit log. One row per field change, navigation event, or popup interaction.

```
id                 uuid PK default gen_random_uuid()
session_id         uuid NOT NULL
event_type         text NOT NULL                            -- enum, see below
field_name         text                                     -- null for non-field events
old_value          text                                     -- cast all values to text for simplicity
new_value          text
step               text NOT NULL                            -- which step when event fired
duration_seconds   int                                      -- set on step_advance events
created_at         timestamptz NOT NULL default now()
```

**`event_type` enum values:**
`field_change`, `step_advance`, `step_back`, `restart`, `popup_opened`, `popup_dismissed`, `mode_switch`, `recalculate`

**Indexes:**
- `idx_form_events_session` on `session_id`
- `idx_form_events_created` on `created_at`

### 5.4 `emails_sent`

One row per Resend send attempt.

```
id                       uuid PK default gen_random_uuid()
session_id               uuid NOT NULL
valuation_id             uuid NOT NULL                      -- FK to valuations.id
recipient_email          text NOT NULL
subject                  text NOT NULL
resend_id                text UNIQUE                        -- returned by Resend; used for dedup and webhook matching
status                   text NOT NULL                      -- 'sent' | 'failed'
error_message            text
delivered_at             timestamptz                        -- set by resend-webhook
opened_at                timestamptz                        -- set by resend-webhook (first open)
bounced_at               timestamptz                        -- set by resend-webhook
created_at               timestamptz NOT NULL default now()
```

**The `UNIQUE` on `resend_id` is the idempotency guarantee** for webhook retries.

### 5.5 `bookings`

One row per Calendly booking. Populated by `calendly-webhook.ts`.

```
id                   uuid PK default gen_random_uuid()
session_id           uuid                                   -- nullable; null if email match fails
valuation_id         uuid                                   -- nullable; null if email match fails
lead_email           text NOT NULL
invitee_name         text
scheduled_start_at   timestamptz NOT NULL
scheduled_end_at     timestamptz NOT NULL
calendly_event_id    text UNIQUE NOT NULL                   -- idempotency key
created_at           timestamptz NOT NULL default now()
```

**Matching logic in `calendly-webhook.ts`:** Query `valuations` for the most recent row with `lead_email = webhook.email`. If found, populate `session_id` and `valuation_id`. If not found, still insert the booking with nulls — the lead may have bypassed the tool.

### 5.6 `function_errors`

Append-only error log. Every function's top-level try/catch writes here on failure.

```
id               uuid PK default gen_random_uuid()
session_id       uuid                                       -- nullable; may not exist at error time
function_name    text NOT NULL
error_message    text NOT NULL
payload          jsonb                                      -- sanitized request payload
created_at       timestamptz NOT NULL default now()
```

### 5.7 Triggers

Create an `updated_at` trigger on `sessions` and `valuations`:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_set_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER valuations_set_updated_at
  BEFORE UPDATE ON valuations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

`form_events`, `emails_sent`, `bookings`, `function_errors` are append-only — no `updated_at` needed.

---

## 6. Security Model

### 6.1 Anon Role

The Supabase `anon` role must have **zero permissions** on all tables:

```sql
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
```

All database access happens via Netlify Functions using the `service_role` key, which bypasses RLS. The anon key is never shipped to the client.

### 6.2 RLS Policies

Keep RLS enabled on all tables as defense in depth. Since service role bypasses RLS and anon has no grants, the policies are essentially a fallback layer. Simple default-deny policies are sufficient:

```sql
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
-- no policies needed; default is deny for anon
```

Repeat for every table.

### 6.3 Webhook Verification

Both webhook endpoints verify HMAC signatures before processing:

- **`resend-webhook.ts`:** verify `Svix-Signature` header using `RESEND_WEBHOOK_SECRET`
- **`calendly-webhook.ts`:** verify `Calendly-Webhook-Signature` header using `CALENDLY_WEBHOOK_SECRET`

Reject with 401 if signature doesn't match. This prevents anyone from POSTing fake bookings or email events.

### 6.4 Input Validation

**`calculate.ts` — numeric bounds:**

| Field                | Min | Max            |
| -------------------- | --- | -------------- |
| revenue              | 0   | 10,000,000,000 |
| ebitda               | -1B | 10,000,000,000 |
| earnings             | -1B | 10,000,000,000 |
| interest_expense     | 0   | 1,000,000,000  |
| taxes_paid           | 0   | 1,000,000,000  |
| depreciation_amort   | 0   | 1,000,000,000  |
| owner_salary         | 0   | 100,000,000    |
| market_salary        | 0   | 100,000,000    |
| addbacks             | 0   | 1,000,000,000  |
| years_in_business    | 0   | 200            |
| employees            | 0   | 1,000,000      |
| all sliders          | 1   | 5              |

These are intentionally loose. Goal is to stop obvious garbage (negative revenue, $10 quadrillion EBITDA) without flagging edge-case real businesses. Return 400 with a generic error message if any field is out of bounds.

**`submit-quiz.ts` — email format:**

Validate `lead_email` against a standard regex before attempting the Resend call. Reject with 400 if invalid.

### 6.5 CORS

Every function returns CORS headers via the `_lib/cors.ts` helper. Allowlist is environment-aware:

- **Local dev:** `http://localhost:8888`
- **Production:** the deployed domain (initially `https://edgefourvaluation.netlify.app`, later the purchased custom domain)

Set the production origin via an environment variable (`ALLOWED_ORIGIN`) so it can be updated without code changes when the custom domain is ready.

---

## 7. Functions

Each function has the standard Netlify handler signature:

```typescript
export const handler = async (event: HandlerEvent): Promise<HandlerResponse> => { ... }
```

All functions:
- Apply CORS headers via `_lib/cors.ts`
- Wrap logic in try/catch; log errors to `function_errors` via `_lib/db.ts#logError()`
- Return generic 500 with no stack trace on unexpected errors

### 7.1 `save-session.ts`

**Trigger:** Frontend calls on page load (or first user interaction).

**Input:** `{ session_id, referrer, utm_source, utm_medium, utm_campaign, user_agent }`

**Action:** INSERT into `sessions`. Parse `user_agent` for `device_type` and `browser`. Populate `landing_at`.

**Response:** 200 with `{ ok: true }`. Failures are silent — this is best-effort telemetry.

### 7.2 `save-step1.ts`

**Trigger:** User completes Business Info step and clicks Continue.

**Input:** `{ session_id, business_name, industry, city, state, years_in_business, employees }`

**Action:** INSERT into `valuations` with `recalculation_number = COUNT(*) WHERE session_id = $1) + 1`. Update `sessions.furthest_step` to `'financials'` and `sessions.last_seen_at`.

**Response:** `{ valuation_id: uuid }`. Frontend stores this as `current_record_id` in memory.

### 7.3 `calculate.ts`

**Trigger:** User clicks "Calculate My Business Value" at end of Step 3.

**Input:** `{ industry, years_in_business, revenue, ebitda, earnings?, interest_expense?, taxes_paid?, depreciation_amort?, input_mode, owner_salary, market_salary, addbacks, sliders: { growth, owner_dep, recurring, cust_conc, systems, fin_records } }`

**Action:**
1. Validate all inputs against bounds (Section 6.4)
2. Run the full valuation calc (ported from existing `calculateAndShow()` in the HTML)
3. Generate all derived copy: VIP recommendations, trajectory card content, good/bad factor lists, industry methodology notice (for flagged industries), score band descriptor
4. Return complete result payload

**Response:** See `shared/types.ts#CalculateResult` — a fat object with every string and number the UI needs to render the Results + Snapshot pages without any additional logic.

This function does **not** write to the database. `save-valuation.ts` handles that separately so the calc can be retried without polluting the DB.

### 7.4 `save-valuation.ts`

**Trigger:** Frontend calls immediately after successful `calculate` response.

**Input:** `{ session_id, valuation_id, ...all financial inputs, ...all calc outputs, sliders }`

**Action:** PATCH `valuations` row identified by `valuation_id`. Set `calculated_at = now()`. Update `sessions.furthest_step` to `'results'`.

**If the frontend's `valuation_id` doesn't match a row for this session:** INSERT a new row instead (this handles the "user went back and recalculated" case — increment `recalculation_number`).

**Response:** `{ valuation_id: uuid }` (same as input unless a new row was created).

### 7.5 `submit-quiz.ts`

**Trigger:** User completes quiz and clicks "See My Improvement Plan".

**Input:** `{ session_id, valuation_id, lead_email, quiz_timeline, quiz_advisory_source, email_content }`

**`email_content`** is the rendered Snapshot content passed up from the frontend — business name, valuation range, score, top 3 VIP recs, trajectory. The frontend already has this from the `calculate` response, so we avoid recomputing.

**Action:**
1. Validate `lead_email` format (Section 6.4)
2. PATCH `valuations` row with email and quiz answers
3. Update `sessions.furthest_step` to `'quiz'`, set `sessions.completed = true`
4. Call `send-email.ts` logic internally (not a separate HTTP call — import and invoke)
5. On email success, PATCH `valuations.report_sent_at = now()`
6. On email failure, log to `function_errors` but still return success to the client (silent-fail UX)

**Response:** `{ ok: true }` — frontend proceeds to Snapshot regardless of email outcome.

**Timeout note:** Netlify free tier has a 10-second function timeout. The sequence PATCH → Resend → PATCH must complete within that. If Resend is degraded, the function may time out. Accepted risk on free tier.

### 7.6 `send-email.ts`

**Not a standalone function** — exported as a module imported by `submit-quiz.ts`. Keeping it as a separate file for code organization and testability.

**Input:** `{ recipient_email, email_content, session_id, valuation_id }`

**Action:**
1. Build HTML email body from `email_content` and static template
2. Send via Resend: FROM `valuations@edgefourllc.com`, TO `recipient_email`, `reply_to: info@edgefourllc.com`
3. Subject: `Your EdgeFour Business Valuation — {business_name}`
4. INSERT into `emails_sent` with `resend_id`, `status: 'sent'`
5. On Resend failure, INSERT with `status: 'failed'` and `error_message`, rethrow

**CTA in email:** Button linking to `calendly.com/edgefour?email={recipient_email}&name={business_name}` to prefill the Calendly booking.

**Email content sections:**
- Business name and valuation date
- Valuation range (conservative / base / optimistic)
- Business Value Score out of 100
- Trajectory ("After Key Improvements" value + top 2 improvement factors)
- Top 3 VIP recommendations (title + body each)
- CTA button to Calendly
- Footer: EdgeFour branding, `info@edgefourllc.com`, `edgefourllc.com`

### 7.7 `track-event.ts`

**Trigger:** Frontend fires on every tracked interaction. Fire-and-forget.

**Input:** `{ session_id, event_type, field_name?, old_value?, new_value?, step, duration_seconds? }`

**Action:**
1. INSERT into `form_events`
2. Update `sessions.last_seen_at`
3. If `event_type === 'step_advance'` and the new step is further than current `furthest_step`, update `furthest_step`

**Response:** 204 No Content. Failures are logged but never surface to the user.

**Frontend debouncing:** slider changes are debounced 500ms before firing. Text input changes fire on blur, not keystroke.

### 7.8 `resend-webhook.ts`

**Trigger:** Resend POSTs on delivery events (`email.delivered`, `email.opened`, `email.bounced`).

**Action:**
1. Verify Svix signature against `RESEND_WEBHOOK_SECRET` — reject with 401 if invalid
2. Parse payload — extract `resend_id` and event type
3. UPDATE `emails_sent` WHERE `resend_id = $1`:
   - `email.delivered` → set `delivered_at`
   - `email.opened` → set `opened_at` (only if null — first open wins)
   - `email.bounced` → set `bounced_at`
4. Return 200 to Resend

**Idempotency:** The `UNIQUE` constraint on `resend_id` plus "only set if null" behavior makes retries safe.

### 7.9 `calendly-webhook.ts`

**Trigger:** Calendly POSTs on `invitee.created` events.

**Action:**
1. Verify `Calendly-Webhook-Signature` against `CALENDLY_WEBHOOK_SECRET` — reject with 401 if invalid
2. Parse payload — extract invitee email, name, event ID, start/end times
3. Look up most recent `valuations` row WHERE `lead_email = webhook.email` (ordered by `created_at DESC`)
4. INSERT into `bookings`:
   - If match found: populate `session_id` and `valuation_id` from the valuation row
   - If no match: leave both null but still insert (lead may have bypassed the tool)
5. `ON CONFLICT (calendly_event_id) DO NOTHING` for idempotency

**Setup:** Register the webhook URL in Calendly dashboard → Integrations → Webhooks, subscribed to `invitee.created`. Calendly provides the signing secret at registration.

---

## 8. Shared Types

`shared/types.ts` defines the contract between frontend and backend. The critical shapes:

```typescript
// Slider values (1-5 scale)
export type SliderValues = {
  growth: number
  owner_dep: number
  recurring: number
  cust_conc: number
  systems: number
  fin_records: number
}

// Input to calculate function
export type CalculateInput = {
  industry: string
  years_in_business: number
  revenue: number
  ebitda: number
  earnings?: number
  interest_expense?: number
  taxes_paid?: number
  depreciation_amort?: number
  input_mode: 'know' | 'calc'
  owner_salary: number
  market_salary: number
  addbacks: number
  sliders: SliderValues
}

// Output from calculate function — everything the UI needs to render
export type CalculateResult = {
  // Core numbers
  adj_ebitda: number
  base_multiple: number
  estimated_multiple: number
  years_bonus: number
  revenue_scale_bonus: number
  valuation_low: number
  valuation_base: number
  valuation_high: number
  value_score: number

  // Display copy
  score_band: string                    // "Strong", "Developing", etc.
  score_band_description: string

  // Good / bad factors
  good_factors: Array<{ name: string; level: string; description: string }>
  bad_factors: Array<{ name: string; level: string; description: string }>

  // Trajectory card
  trajectory: {
    uplift_amount: number
    new_valuation_low: number
    new_valuation_base: number
    new_valuation_high: number
    top_factors: Array<{ name: string; current_level: string; target_level: string; delta: number }>
  }

  // VIP recommendations for Snapshot page (top 3, already sorted)
  vip_recommendations: Array<{ title: string; body: string }>

  // Flagged industry methodology notice (null if not flagged)
  methodology_notice: string | null

  // Industry metadata (for display)
  industry_category: string
}

export type FormEventType =
  | 'field_change'
  | 'step_advance'
  | 'step_back'
  | 'restart'
  | 'popup_opened'
  | 'popup_dismissed'
  | 'mode_switch'
  | 'recalculate'

export type FurthestStep =
  | 'landing'
  | 'business_info'
  | 'financials'
  | 'value_drivers'
  | 'results'
  | 'quiz'
  | 'snapshot'
```

---

## 9. Local Development

### 9.1 `server.ts`

Bun server that imports function handlers and routes requests. Approximate shape:

```typescript
import { handler as calculate } from './netlify/functions/calculate'
import { handler as saveStep1 } from './netlify/functions/save-step1'
// ... import all handlers

const routes: Record<string, any> = {
  '/.netlify/functions/calculate': calculate,
  '/.netlify/functions/save-step1': saveStep1,
  // ... all routes
}

Bun.serve({
  port: 8888,
  async fetch(req) {
    const url = new URL(req.url)

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:8888',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
    }

    // Route to function
    const handler = routes[url.pathname]
    if (handler) {
      const body = await req.text()
      const event = {
        body,
        httpMethod: req.method,
        headers: Object.fromEntries(req.headers),
        queryStringParameters: Object.fromEntries(url.searchParams),
      }
      const result = await handler(event)
      return new Response(result.body, {
        status: result.statusCode,
        headers: { 'Content-Type': 'application/json', ...(result.headers ?? {}) },
      })
    }

    // Static file serving from public/ and js/
    let path = url.pathname === '/' ? '/index.html' : url.pathname
    let file: any
    if (path.startsWith('/js/')) {
      file = Bun.file(`.${path}`)
    } else {
      file = Bun.file(`public${path}`)
    }
    return new Response(file)
  },
})

console.log('Dev server at http://localhost:8888')
```

**Critical:** `server.ts` is never deployed to Netlify. It exists only for local dev. Netlify reads `netlify.toml`, finds `netlify/functions/`, and bundles each `.ts` file independently.

### 9.2 Dev Commands

```bash
bun install
cp .env.example .env   # fill in keys
bun dev                # server at localhost:8888
bun run typecheck      # tsc --noEmit
```

### 9.3 Environment Variables

`.env.example`:

```
# Supabase
SUPABASE_URL=
# WARNING: service_role key bypasses ALL RLS. Never expose client-side.
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=

# Calendly
CALENDLY_WEBHOOK_SECRET=

# CORS
ALLOWED_ORIGIN=http://localhost:8888
```

Production values live in Netlify dashboard → Site settings → Environment variables.

---

## 10. CI/CD

### 10.1 Branching

- Single long-lived branch: `main`
- Feature branches → PR → merge to `main` → auto-deploy
- Git tags for meaningful releases: `v1.0.0`, `v1.1.0`, etc.

### 10.2 `netlify.toml`

```toml
[build]
  functions = "netlify/functions"
  publish = "public"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/js/*"
  to = "/js/:splat"
  status = 200
```

The redirect ensures `js/` is served alongside `public/`. Alternative: copy `js/` into `public/js/` during a build step. Simpler option is to put `js/` inside `public/` from the start — update the repo structure accordingly.

### 10.3 `.github/workflows/deploy.yml`

```yaml
name: Deploy to Netlify

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - run: bun install

      - name: Typecheck
        run: bun run typecheck

      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=public --functions=netlify/functions
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### 10.4 Required GitHub Secrets

- `NETLIFY_AUTH_TOKEN` — from Netlify user settings → Personal access tokens
- `NETLIFY_SITE_ID` — from Netlify site settings → Site details → Site ID

### 10.5 `.gitignore`

```
node_modules/
.env
.netlify/
dist/
```

---

## 11. Frontend Module Structure

### 11.1 `public/index.html`

Keep the existing HTML structure, styling, and copy. Remove all inline `<script>` logic. Replace with:

```html
<script type="module" src="/js/ui.js"></script>
```

All Supabase direct calls, calculation logic, and industry multiples are **removed**. The HTML is purely structural.

### 11.2 `js/api.js`

Thin wrapper around fetch calls to Netlify functions. Handles base URL, JSON serialization, error handling. Exposes one function per endpoint:

```javascript
export async function saveSession(data) { ... }
export async function saveStep1(data) { ... }
export async function calculate(data) { ... }
export async function saveValuation(data) { ... }
export async function submitQuiz(data) { ... }
export async function trackEvent(data) { ... }
```

Every call is wrapped so network failures never throw to the UI. `trackEvent` in particular must fire-and-forget with no error surfacing.

### 11.3 `js/ui.js`

All the existing UI logic from the HTML — step navigation, form validation, rendering, event handlers. This is where the bulk of the existing code moves. Imports `api.js` for all backend calls.

**Key responsibilities:**
- Generate `session_id` on load, store in `sessionStorage`, call `saveSession`
- Capture UTM params from `window.location.search` on load
- Debounce slider changes 500ms before calling `trackEvent`
- Fire `trackEvent` on: field changes (on blur), step transitions, restart, popup open/dismiss, mode switch, recalculate
- Render Results and Snapshot pages from `CalculateResult` payload (no calc logic in the UI)
- Track time-on-step using `Date.now()` deltas, send with `step_advance` events

---

## 12. Migration Steps

Rough order of operations for the implementation:

1. **Repo scaffold**
   - Create folder structure
   - `package.json`, `tsconfig.json`, `netlify.toml`, `.env.example`, `.gitignore`
   - Stub all function files with empty handlers
   - Set up `server.ts`

2. **Database**
   - Run SQL to create all 6 tables, triggers, indexes
   - Revoke all anon permissions
   - Confirm RLS enabled with default-deny

3. **Shared lib**
   - Implement `_lib/cors.ts`, `_lib/db.ts`, `_lib/validate.ts`, `_lib/resend.ts`
   - Implement `shared/types.ts`

4. **Calculate function** (priority — isolates the proprietary logic)
   - Port all industry multiples, owner dep arrays, slider adjustments from existing HTML
   - Port VIP recommendation copy and trajectory logic
   - Implement input validation with bounds
   - Return full `CalculateResult` payload

5. **DB write functions**
   - `save-session`, `save-step1`, `save-valuation`, `submit-quiz`, `track-event`
   - Wire all to `_lib/db.ts` with consistent error logging

6. **Email**
   - Implement `send-email.ts` module
   - Build HTML email template
   - Wire into `submit-quiz.ts`

7. **Webhooks**
   - `resend-webhook.ts` with signature verification
   - `calendly-webhook.ts` with signature verification and email matching
   - Register both webhooks in respective dashboards

8. **Frontend refactor**
   - Strip all logic from `index.html`
   - Build `js/api.js` with fetch wrappers
   - Build `js/ui.js` by migrating logic from the original HTML
   - Wire up `session_id`, UTM capture, debounced tracking
   - Render from `CalculateResult` instead of local calc

9. **Deploy**
   - Set Netlify env vars
   - Push to `main`, verify GHA deploy
   - End-to-end test: full flow from landing → calendly booking
   - Verify all 6 tables receive expected data
   - Verify email sends and tracks delivery/open events

10. **Custom domain** (when purchased)
    - Point DNS to Netlify
    - Update `ALLOWED_ORIGIN` env var
    - Update CORS allowlist if hardcoded anywhere
    - Update Resend `from` address if moving to domain-specific subdomain

---

## 13. Documentation Requirements

The `README.md` should cover:

- Local dev setup (clone, `bun install`, `.env` setup, `bun dev`)
- Deploy process (push to `main`, GHA handles the rest)
- How to rotate secrets (Supabase service role, Resend API key, webhook secrets)
- How to restore from Supabase backup (7-day retention on free tier)
- Supabase free tier gotcha: project pauses after 1 week of inactivity
- Links to service dashboards (Supabase, Netlify, Resend, Calendly)

---

## 14. Known Limitations (Accepted)

These are tradeoffs accepted as part of the free-tier scope:

- **No rate limiting on functions** — free tier lacks this; mitigated by input validation and bounds
- **10-second function timeout** — `submit-quiz` could time out if Resend is degraded; accepted
- **Supabase pauses after 1 week idle** — first user after a quiet week hits cold start
- **No staging environment** — single `main` branch deploys straight to production
- **No observability tooling beyond Netlify logs + `function_errors`**
- **Session linking breaks across tabs** — two tabs = two `session_id`s, no user identity to reconcile
- **No admin dashboard** — leads are viewed via Supabase dashboard directly

All of these have clear upgrade paths if/when the tool warrants investment.
