import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { jobs } from './jobs';

export const VALID_APPLICATION_STATUSES = [
  'APPLIED',
  'REPLIED',
  'INTERVIEWING',
  'OFFER',
  'REJECTED',
  'GHOSTED',
] as const;

export type JobApplicationStatus = (typeof VALID_APPLICATION_STATUSES)[number];

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
    jobTitle: text('job_title').notNull(),
    companyName: text('company_name').notNull(),
    jobUrl: text('job_url'),
    platform: text('platform').default('OTHER').notNull(),
    salary: text('salary'),
    location: text('location'),
    currentStatus: text('current_status').default('APPLIED').notNull(),
    appliedAt: timestamp('applied_at').defaultNow().notNull(),
    lastStatusUpdateAt: timestamp('last_status_update_at').defaultNow().notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('applications_user_id_idx').on(table.userId),
    index('applications_user_status_idx').on(table.userId, table.currentStatus),
    index('applications_applied_at_idx').on(table.appliedAt),
  ]
);

// Application Status History / Timeline Log
export const applicationEvents = pgTable(
  'application_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    previousStatus: text('previous_status'),
    newStatus: text('new_status').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('application_events_application_id_idx').on(table.applicationId),
  ]
);
