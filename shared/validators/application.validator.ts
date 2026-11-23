import { z } from 'zod';
import { APPLICATION_STATUSES } from '../types/application.types';

export const applicationStatusEnum = z.enum(APPLICATION_STATUSES);

// Create initial application record
export const createApplicationSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  initialStatus: applicationStatusEnum.default('SAVED'),
  appliedAt: z.string().datetime().optional(),
  studentNote: z.string().max(1000).optional(),
});

// Update application status (creates immutable audit event)
export const updateApplicationStatusSchema = z.object({
  newStatus: applicationStatusEnum,
  studentNote: z.string().max(1000).optional(),
  occurredAt: z.string().datetime().optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;
