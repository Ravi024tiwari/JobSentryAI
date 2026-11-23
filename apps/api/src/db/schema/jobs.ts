import { pgTable, uuid, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { companies } from './companies';

export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  jobUrl: text('job_url'),
  sourcePlatform: text('source_platform').default('DIRECT_INPUT'),
  contentHash: text('content_hash').notNull(), // SHA-256 for instant cache deduplication
  location: text('location'),
  salary: text('salary'),
  employmentType: text('employment_type'),
  recruiterEmail: text('recruiter_email'),
  recruiterName: text('recruiter_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('jobs_content_hash_idx').on(table.contentHash),
  index('jobs_company_id_idx').on(table.companyId),
]);

export const userSavedJobs = pgTable('user_saved_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  savedAt: timestamp('saved_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('user_saved_jobs_user_job_idx').on(table.userId, table.jobId),
]);
