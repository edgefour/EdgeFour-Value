import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const bookings = pgTable("bookings", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id"),
  valuationId: uuid("valuation_id"),
  leadEmail: text("lead_email").notNull(),
  inviteeName: text("invitee_name"),
  scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }).notNull(),
  scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }).notNull(),
  calendlyEventId: text("calendly_event_id").unique().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
