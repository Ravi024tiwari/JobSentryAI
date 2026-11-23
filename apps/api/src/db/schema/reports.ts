import { pgTable, uuid, text, timestamp, jsonb, index, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { companies } from './companies';
import { jobs } from './jobs';
import { REPORT_CATEGORIES } from '@shared/types/company.types';

export const reportCategoryEnum = pgEnum('report_category', REPORT_CATEGORIES);

export const userReports = pgTable('user_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  companyName: text('company_name').notNull(),
  category: reportCategoryEnum('category').notNull(),
  description: text('description').notNull(),
  evidenceUrls: jsonb('evidence_urls').$type<string[]>().default([]),
  status: text('status').default('ACTIVE').notNull(), // ACTIVE, ARCHIVED, DISPUTED
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('user_reports_company_id_idx').on(table.companyId),
  index('user_reports_job_id_idx').on(table.jobId),
]);
