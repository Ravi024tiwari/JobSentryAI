import { pgTable, uuid, text, integer, timestamp, jsonb, index, pgEnum } from 'drizzle-orm/pg-core';
import { jobs } from './jobs';
import { VERIFICATION_VERDICTS, RISK_LEVELS } from '@shared/types/verification.types';

export const verdictEnum = pgEnum('verification_verdict', VERIFICATION_VERDICTS);
export const riskLevelEnum = pgEnum('risk_level', RISK_LEVELS);

export const jobAnalyses = pgTable('job_analyses', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  riskScore: integer('risk_score').notNull(),         // 0 to 100
  riskLevel: riskLevelEnum('risk_level').notNull(),   // LOW, MEDIUM, HIGH, CRITICAL
  confidence: integer('confidence').notNull(),       // 0 to 100
  verdict: verdictEnum('verdict').notNull(),          // LIKELY_LEGITIMATE, SUSPICIOUS, LIKELY_FRAUDULENT, UNABLE_TO_VERIFY
  analysisResult: jsonb('analysis_result').notNull(), // Complete structured output (signals, recommendations)
  contentHash: text('content_hash').notNull(),        // Job content hash when analyzed
  modelVersion: text('model_version').notNull(),
  workflowVersion: text('workflow_version').notNull(),
  analyzedAt: timestamp('analyzed_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),       // Stale cache expiration (7 days)
}, (table) => [
  index('job_analyses_job_id_idx').on(table.jobId),
  index('job_analyses_content_hash_idx').on(table.contentHash),
]);

export const analysisEvidence = pgTable('analysis_evidence', {
  id: uuid('id').defaultRandom().primaryKey(),
  analysisId: uuid('analysis_id').notNull().references(() => jobAnalyses.id, { onDelete: 'cascade' }),
  evidenceType: text('evidence_type').notNull(),
  sourceUrl: text('source_url'),
  sourceTitle: text('source_title').notNull(),
  evidenceSummary: text('evidence_summary').notNull(),
  sourceCredibility: integer('source_credibility').default(50).notNull(), // 0 to 100
  isPositiveSignal: text('is_positive_signal').default('false').notNull(),
  retrievedAt: timestamp('retrieved_at').defaultNow().notNull(),
}, (table) => [
  index('analysis_evidence_analysis_id_idx').on(table.analysisId),
]);

export const verificationHistory = pgTable('verification_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  analysisId: uuid('analysis_id').notNull().references(() => jobAnalyses.id, { onDelete: 'cascade' }),
  previousVerdict: text('previous_verdict'),
  newVerdict: text('new_verdict').notNull(),
  triggerReason: text('trigger_reason').default('USER_SUBMISSION'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('verification_history_job_id_idx').on(table.jobId),
]);
