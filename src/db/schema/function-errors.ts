import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const functionErrors = pgTable("function_errors", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id"),
  functionName: text("function_name").notNull(),
  errorMessage: text("error_message").notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
