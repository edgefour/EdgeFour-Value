import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const furthestStepEnum = [
  "landing",
  "business_info",
  "financials",
  "value_drivers",
  "results",
  "quiz",
  "snapshot",
] as const;

export const sessions = pgTable("sessions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").unique().notNull(),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  deviceType: text("device_type"),
  browser: text("browser"),
  ipAddress: text("ip_address"),
  landingAt: timestamp("landing_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  furthestStep: text("furthest_step", {
    enum: furthestStepEnum,
  })
    .notNull()
    .default("landing"),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
