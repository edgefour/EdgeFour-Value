ALTER TABLE "valuations" ADD COLUMN "score_band" text;--> statement-breakpoint
ALTER TABLE "valuations" ADD COLUMN "trajectory_uplift_amount" numeric;--> statement-breakpoint
ALTER TABLE "valuations" ADD COLUMN "trajectory_new_valuation_low" numeric;--> statement-breakpoint
ALTER TABLE "valuations" ADD COLUMN "trajectory_new_valuation_base" numeric;--> statement-breakpoint
ALTER TABLE "valuations" ADD COLUMN "trajectory_new_valuation_high" numeric;--> statement-breakpoint
ALTER TABLE "valuations" ADD COLUMN "trajectory_top_factors" jsonb;--> statement-breakpoint
ALTER TABLE "valuations" ADD COLUMN "good_factors" jsonb;--> statement-breakpoint
ALTER TABLE "valuations" ADD COLUMN "bad_factors" jsonb;--> statement-breakpoint
ALTER TABLE "valuations" ADD COLUMN "vip_recommendations" jsonb;