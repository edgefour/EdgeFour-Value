import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const eventTypeEnum = [
  "field_change",
  "step_advance",
  "step_back",
  "restart",
  "popup_opened",
  "popup_dismissed",
  "mode_switch",
  "recalculate",
] as const;

export const formEvents = pgTable(
  "form_events",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: uuid("session_id").notNull(),
    eventType: text("event_type", { enum: eventTypeEnum }).notNull(),
    fieldName: text("field_name"),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    step: text("step").notNull(),
    durationSeconds: integer("duration_seconds"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("idx_form_events_session").on(table.sessionId),
    index("idx_form_events_created").on(table.createdAt),
  ]
);
