CREATE TYPE "public"."risk_level" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."verification_verdict" AS ENUM('LIKELY_LEGITIMATE', 'SUSPICIOUS', 'LIKELY_FRAUDULENT', 'UNABLE_TO_VERIFY');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('SAVED', 'APPLIED', 'ASSESSMENT_COMPLETED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'SELECTED', 'OFFER_RECEIVED', 'JOINED', 'REJECTED', 'NO_RESPONSE', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."report_category" AS ENUM('REGISTRATION_FEE_DEMAND', 'FAKE_INTERNSHIP', 'FAKE_OFFER_LETTER', 'RECRUITER_IMPERSONATION', 'NONEXISTENT_COMPANY', 'MISLEADING_SALARY', 'SUSPICIOUS_WEBSITE', 'PERSONAL_DATA_HARVESTING', 'OTHER');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password" text NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"college" text,
	"graduation_year" integer,
	"skills" jsonb DEFAULT '[]'::jsonb,
	"preferred_location" text,
	"experience_level" text DEFAULT 'FRESHER',
	"preferred_job_categories" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"official_website" text,
	"domain" text,
	"industry" text,
	"registration_number" text,
	"is_verified_entity" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_normalized_name_unique" UNIQUE("normalized_name")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"job_url" text,
	"source_platform" text DEFAULT 'DIRECT_INPUT',
	"content_hash" text NOT NULL,
	"location" text,
	"salary" text,
	"employment_type" text,
	"recruiter_email" text,
	"recruiter_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_saved_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"job_id" uuid NOT NULL,
	"saved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analysis_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"evidence_type" text NOT NULL,
	"source_url" text,
	"source_title" text NOT NULL,
	"evidence_summary" text NOT NULL,
	"source_credibility" integer DEFAULT 50 NOT NULL,
	"is_positive_signal" text DEFAULT 'false' NOT NULL,
	"retrieved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"risk_score" integer NOT NULL,
	"risk_level" "risk_level" NOT NULL,
	"confidence" integer NOT NULL,
	"verdict" "verification_verdict" NOT NULL,
	"analysis_result" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"model_version" text NOT NULL,
	"workflow_version" text NOT NULL,
	"analyzed_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"analysis_id" uuid NOT NULL,
	"previous_verdict" text,
	"new_verdict" text NOT NULL,
	"trigger_reason" text DEFAULT 'USER_SUBMISSION',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"previous_status" "application_status",
	"new_status" "application_status" NOT NULL,
	"source" text DEFAULT 'MANUAL' NOT NULL,
	"note" text,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"job_id" uuid NOT NULL,
	"current_status" "application_status" NOT NULL,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"company_id" uuid,
	"job_id" uuid,
	"company_name" text NOT NULL,
	"category" "report_category" NOT NULL,
	"description" text NOT NULL,
	"evidence_urls" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_research_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"company_id" uuid,
	"job_id" uuid,
	"question" text NOT NULL,
	"answer" jsonb NOT NULL,
	"retrieved_sources" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"chunk_text" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"job_id" uuid,
	"document_type" text NOT NULL,
	"source_url" text,
	"source_type" text DEFAULT 'COMMUNITY' NOT NULL,
	"content_hash" text NOT NULL,
	"ingested_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_jobs" ADD CONSTRAINT "user_saved_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_jobs" ADD CONSTRAINT "user_saved_jobs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_evidence" ADD CONSTRAINT "analysis_evidence_analysis_id_job_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."job_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_analyses" ADD CONSTRAINT "job_analyses_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_history" ADD CONSTRAINT "verification_history_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_history" ADD CONSTRAINT "verification_history_analysis_id_job_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."job_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_research_queries" ADD CONSTRAINT "ai_research_queries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_research_queries" ADD CONSTRAINT "ai_research_queries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_research_queries" ADD CONSTRAINT "ai_research_queries_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_content_hash_idx" ON "jobs" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "jobs_company_id_idx" ON "jobs" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_saved_jobs_user_job_idx" ON "user_saved_jobs" USING btree ("user_id","job_id");--> statement-breakpoint
CREATE INDEX "analysis_evidence_analysis_id_idx" ON "analysis_evidence" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "job_analyses_job_id_idx" ON "job_analyses" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "job_analyses_content_hash_idx" ON "job_analyses" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "verification_history_job_id_idx" ON "verification_history" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "application_events_application_id_idx" ON "application_events" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "application_events_occurred_at_idx" ON "application_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "applications_user_job_idx" ON "applications" USING btree ("user_id","job_id");--> statement-breakpoint
CREATE INDEX "applications_user_status_idx" ON "applications" USING btree ("user_id","current_status");--> statement-breakpoint
CREATE INDEX "user_reports_company_id_idx" ON "user_reports" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "user_reports_job_id_idx" ON "user_reports" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "ai_research_queries_user_id_idx" ON "ai_research_queries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_chunks_document_id_idx" ON "document_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "knowledge_documents_company_id_idx" ON "knowledge_documents" USING btree ("company_id");