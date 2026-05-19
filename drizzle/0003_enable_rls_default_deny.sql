ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "emails_sent" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "form_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "function_errors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "valuations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Keep public roles blocked while preserving runtime access for explicitly known
-- app roles only (production pooler role + local postgres for development).
CREATE POLICY "bookings_runtime_access" ON "bookings" FOR ALL TO PUBLIC USING (current_user IN ('postgres', 'postgres.pmotvyecxokfqygfbjyo')) WITH CHECK (current_user IN ('postgres', 'postgres.pmotvyecxokfqygfbjyo'));--> statement-breakpoint
CREATE POLICY "emails_sent_runtime_access" ON "emails_sent" FOR ALL TO PUBLIC USING (current_user IN ('postgres', 'postgres.pmotvyecxokfqygfbjyo')) WITH CHECK (current_user IN ('postgres', 'postgres.pmotvyecxokfqygfbjyo'));--> statement-breakpoint
CREATE POLICY "form_events_runtime_access" ON "form_events" FOR ALL TO PUBLIC USING (current_user IN ('postgres', 'postgres.pmotvyecxokfqygfbjyo')) WITH CHECK (current_user IN ('postgres', 'postgres.pmotvyecxokfqygfbjyo'));--> statement-breakpoint
CREATE POLICY "function_errors_runtime_access" ON "function_errors" FOR ALL TO PUBLIC USING (current_user IN ('postgres', 'postgres.pmotvyecxokfqygfbjyo')) WITH CHECK (current_user IN ('postgres', 'postgres.pmotvyecxokfqygfbjyo'));--> statement-breakpoint
CREATE POLICY "sessions_runtime_access" ON "sessions" FOR ALL TO PUBLIC USING (current_user IN ('postgres', 'postgres.pmotvyecxokfqygfbjyo')) WITH CHECK (current_user IN ('postgres', 'postgres.pmotvyecxokfqygfbjyo'));--> statement-breakpoint
CREATE POLICY "valuations_runtime_access" ON "valuations" FOR ALL TO PUBLIC USING (current_user IN ('postgres', 'postgres.pmotvyecxokfqygfbjyo')) WITH CHECK (current_user IN ('postgres', 'postgres.pmotvyecxokfqygfbjyo'));--> statement-breakpoint
REVOKE ALL ON TABLE "bookings" FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON TABLE "emails_sent" FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON TABLE "form_events" FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON TABLE "function_errors" FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON TABLE "sessions" FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON TABLE "valuations" FROM PUBLIC;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE "bookings" FROM "anon"';
    EXECUTE 'REVOKE ALL ON TABLE "emails_sent" FROM "anon"';
    EXECUTE 'REVOKE ALL ON TABLE "form_events" FROM "anon"';
    EXECUTE 'REVOKE ALL ON TABLE "function_errors" FROM "anon"';
    EXECUTE 'REVOKE ALL ON TABLE "sessions" FROM "anon"';
    EXECUTE 'REVOKE ALL ON TABLE "valuations" FROM "anon"';
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE "bookings" FROM "authenticated"';
    EXECUTE 'REVOKE ALL ON TABLE "emails_sent" FROM "authenticated"';
    EXECUTE 'REVOKE ALL ON TABLE "form_events" FROM "authenticated"';
    EXECUTE 'REVOKE ALL ON TABLE "function_errors" FROM "authenticated"';
    EXECUTE 'REVOKE ALL ON TABLE "sessions" FROM "authenticated"';
    EXECUTE 'REVOKE ALL ON TABLE "valuations" FROM "authenticated"';
  END IF;
END $$;
