import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { companies } from './companies';
import { jobs } from './jobs';

export const knowledgeDocuments = pgTable('knowledge_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  documentType: text('document_type').notNull(), // ADVISORY, COMMUNITY_REPORT, INTERVIEW_EXPERIENCE, PLACEMENT_NOTICE
  sourceUrl: text('source_url'),
  sourceType: text('source_type').default('COMMUNITY').notNull(),
  contentHash: text('content_hash').notNull(),
  ingestedAt: timestamp('ingested_at').defaultNow().notNull(),
}, (table) => [
  index('knowledge_documents_company_id_idx').on(table.companyId),
]);

export const documentChunks = pgTable('document_chunks', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id').notNull().references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
  chunkText: text('chunk_text').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('document_chunks_document_id_idx').on(table.documentId),
]);

export const aiResearchQueries = pgTable('ai_research_queries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  question: text('question').notNull(),
  answer: jsonb('answer').notNull(),
  retrievedSources: jsonb('retrieved_sources').$type<Array<{ title: string; url?: string; snippet: string }>>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('ai_research_queries_user_id_idx').on(table.userId),
]);
