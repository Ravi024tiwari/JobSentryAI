import { z } from 'zod';
import { REPORT_CATEGORIES } from '../types/company.types';

export const reportCategoryEnum = z.enum(REPORT_CATEGORIES);

export const submitReportSchema = z.object({
  companyId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  companyName: z.string().min(1, 'Company name is required').max(200),
  category: reportCategoryEnum,
  description: z.string().min(20, 'Please describe the scam activity with at least 20 characters').max(5000),
  evidenceUrls: z.array(z.string().url()).max(5).optional(),
});

export type SubmitReportInput = z.infer<typeof submitReportSchema>;
