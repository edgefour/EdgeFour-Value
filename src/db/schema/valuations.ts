import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { sessions } from "./sessions";

export const valuations = pgTable(
  "valuations",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.sessionId),
    recalculationNumber: integer("recalculation_number").notNull(),

    // Business info
    businessName: text("business_name"),
    industry: text("industry"),
    city: text("city"),
    state: text("state"),
    yearsInBusiness: integer("years_in_business"),
    employees: integer("employees"),

    // Financial inputs
    inputMode: text("input_mode"),
    revenue: numeric("revenue"),
    ebitda: numeric("ebitda"),
    earnings: numeric("earnings"),
    interestExpense: numeric("interest_expense"),
    taxesPaid: numeric("taxes_paid"),
    depreciationAmort: numeric("depreciation_amort"),
    ownerSalary: numeric("owner_salary"),
    marketSalary: numeric("market_salary"),
    addbacks: numeric("addbacks"),
    adjEbitda: numeric("adj_ebitda"),

    // Calc outputs
    baseMultiple: numeric("base_multiple"),
    estimatedMultiple: numeric("estimated_multiple"),
    yearsBonus: numeric("years_bonus"),
    revenueScaleBonus: numeric("revenue_scale_bonus"),
    valuationLow: numeric("valuation_low"),
    valuationBase: numeric("valuation_base"),
    valuationHigh: numeric("valuation_high"),
    valueScore: integer("value_score"),

    // Slider values
    growthSlider: integer("growth_slider"),
    ownerDepSlider: integer("owner_dep_slider"),
    recurringSlider: integer("recurring_slider"),
    custConcSlider: integer("cust_conc_slider"),
    systemsSlider: integer("systems_slider"),
    finRecordsSlider: integer("fin_records_slider"),

    // Lead capture
    leadEmail: text("lead_email"),
    quizTimeline: text("quiz_timeline"),
    quizAdvisorySource: text("quiz_advisory_source"),

    // Flags
    calculatedAt: timestamp("calculated_at", { withTimezone: true }),
    reportSentAt: timestamp("report_sent_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("idx_valuations_session").on(table.sessionId),
    index("idx_valuations_lead_email").on(table.leadEmail),
  ]
);
