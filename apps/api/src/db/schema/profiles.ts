import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  college: text('college'),
  graduationYear: integer('graduation_year'),
  skills: jsonb('skills').$type<string[]>().default([]),
  preferredLocation: text('preferred_location'),
  experienceLevel: text('experience_level').default('FRESHER'),
  preferredJobCategories: jsonb('preferred_job_categories').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
