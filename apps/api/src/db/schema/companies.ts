import { pgTable, uuid, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull().unique(), // e.g. "google", "tcs"
  officialWebsite: text('official_website'),
  domain: text('domain'),                                      // e.g. "google.com"
  industry: text('industry'),
  registrationNumber: text('registration_number'),            // CIN / MCA number if India
  isVerifiedEntity: boolean('is_verified_entity').default(false).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
