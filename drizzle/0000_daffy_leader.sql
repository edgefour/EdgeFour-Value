CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"valuation_id" uuid,
	"lead_email" text NOT NULL,
	"invitee_name" text,
	"scheduled_start_at" timestamp with time zone NOT NULL,
	"scheduled_end_at" timestamp with time zone NOT NULL,
	"calendly_event_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_calendly_event_id_unique" UNIQUE("calendly_event_id")
);
--> statement-breakpoint
CREATE TABLE "emails_sent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"valuation_id" uuid NOT NULL,
	"recipient_email" text NOT NULL,
	"subject" text NOT NULL,
	"resend_id" text,
	"status" text NOT NULL,
	"error_message" text,
	"delivered_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"bounced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "emails_sent_resend_id_unique" UNIQUE("resend_id")
);
--> statement-breakpoint
CREATE TABLE "form_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"field_name" text,
	"old_value" text,
	"new_value" text,
	"step" text NOT NULL,
	"duration_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "function_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"function_name" text NOT NULL,
	"error_message" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"referrer" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"device_type" text,
	"browser" text,
	"ip_address" text,
	"landing_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"furthest_step" text DEFAULT 'landing' NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "valuations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"recalculation_number" integer NOT NULL,
	"business_name" text,
	"industry" text,
	"city" text,
	"state" text,
	"years_in_business" integer,
	"employees" integer,
	"input_mode" text,
	"revenue" numeric,
	"ebitda" numeric,
	"earnings" numeric,
	"interest_expense" numeric,
	"taxes_paid" numeric,
	"depreciation_amort" numeric,
	"owner_salary" numeric,
	"market_salary" numeric,
	"addbacks" numeric,
	"adj_ebitda" numeric,
	"base_multiple" numeric,
	"estimated_multiple" numeric,
	"years_bonus" numeric,
	"revenue_scale_bonus" numeric,
	"valuation_low" numeric,
	"valuation_base" numeric,
	"valuation_high" numeric,
	"value_score" integer,
	"growth_slider" integer,
	"owner_dep_slider" integer,
	"recurring_slider" integer,
	"cust_conc_slider" integer,
	"systems_slider" integer,
	"fin_records_slider" integer,
	"lead_email" text,
	"quiz_timeline" text,
	"quiz_advisory_source" text,
	"calculated_at" timestamp with time zone,
	"report_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "emails_sent" ADD CONSTRAINT "emails_sent_valuation_id_valuations_id_fk" FOREIGN KEY ("valuation_id") REFERENCES "public"."valuations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuations" ADD CONSTRAINT "valuations_session_id_sessions_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("session_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_form_events_session" ON "form_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_form_events_created" ON "form_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_valuations_session" ON "valuations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_valuations_lead_email" ON "valuations" USING btree ("lead_email");