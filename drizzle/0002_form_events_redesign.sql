-- Semantic note for analysts reading historical rows:
-- Before this migration, navigation rows (step_advance / step_back) stored the DESTINATION
-- step in `step`. After this migration, `step` is always the ORIGIN (where the user was),
-- and `to_step` is the destination. Pre-migration nav rows have `to_step IS NULL` and
-- `step` = destination — interpret accordingly when querying across the migration boundary.

ALTER TABLE "form_events" RENAME COLUMN "new_value" TO "current_value";--> statement-breakpoint
ALTER TABLE "form_events" ADD COLUMN "to_step" text;--> statement-breakpoint
ALTER TABLE "form_events" ADD COLUMN "step_duration_ms" integer;--> statement-breakpoint
ALTER TABLE "form_events" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
UPDATE "form_events" SET "step_duration_ms" = "duration_seconds" * 1000 WHERE "duration_seconds" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "form_events" DROP COLUMN "old_value";--> statement-breakpoint
ALTER TABLE "form_events" DROP COLUMN "duration_seconds";
