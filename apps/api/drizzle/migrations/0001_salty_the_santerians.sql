ALTER TABLE "applications" DROP CONSTRAINT "applications_job_id_jobs_id_fk";
--> statement-breakpoint
DROP INDEX "application_events_occurred_at_idx";--> statement-breakpoint
DROP INDEX "applications_user_job_idx";--> statement-breakpoint
ALTER TABLE "application_events" ALTER COLUMN "previous_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "application_events" ALTER COLUMN "new_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "job_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "current_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "current_status" SET DEFAULT 'APPLIED';--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "applied_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "applied_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "job_title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "company_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "job_url" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "platform" text DEFAULT 'OTHER' NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "salary" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "last_status_update_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_user_id_idx" ON "applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "applications_applied_at_idx" ON "applications" USING btree ("applied_at");--> statement-breakpoint
ALTER TABLE "application_events" DROP COLUMN "source";--> statement-breakpoint
ALTER TABLE "application_events" DROP COLUMN "occurred_at";--> statement-breakpoint
DROP TYPE "public"."application_status";