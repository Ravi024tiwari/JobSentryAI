import { pgTable, uuid, text, timestamp, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { jobs } from './jobs';
import { APPLICATION_STATUSES } from '@shared/types/application.types';

export const applicationStatusEnum = pgEnum('application_status', APPLICATION_STATUSES);

export const applications = pgTable('applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  currentStatus: applicationStatusEnum('current_status').notNull(),
  appliedAt: timestamp('applied_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('applications_user_job_idx').on(table.userId, table.jobId),
  index('applications_user_status_idx').on(table.userId, table.currentStatus),
]);

// Immutable Event Sourcing for Application Tracking (Timeline History)
export const applicationEvents = pgTable('application_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  previousStatus: applicationStatusEnum('previous_status'),
  newStatus: applicationStatusEnum('new_status').notNull(),
  source: text('source').default('MANUAL').notNull(),
  note: text('note'),
  occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('application_events_application_id_idx').on(table.applicationId),
  index('application_events_occurred_at_idx').on(table.occurredAt),
]);
