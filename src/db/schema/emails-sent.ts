import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { valuations } from "./valuations";

export const emailsSent = pgTable("emails_sent", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull(),
  valuationId: uuid("valuation_id")
    .notNull()
    .references(() => valuations.id),
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  resendId: text("resend_id").unique(),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  bouncedAt: timestamp("bounced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
