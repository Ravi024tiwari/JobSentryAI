import { z } from 'zod';

// URL Submission Schema
export const jobSubmitUrlSchema = z.object({
  type: z.literal('URL'),
  jobUrl: z.string().url('Please enter a valid URL (e.g. https://example.com/careers/job123)'),
  companyName: z.string().min(1).max(200).optional(),
  recruiterEmail: z.string().email('Invalid recruiter email').optional(),
});

// Text Description Submission Schema
export const jobSubmitTextSchema = z.object({
  type: z.literal('TEXT'),
  companyName: z.string().min(1, 'Company name is required').max(200),
  jobTitle: z.string().min(1, 'Job title is required').max(200),
  description: z.string().min(20, 'Job description must be at least 20 characters').max(50000),
  jobUrl: z.string().url().optional(),
  location: z.string().max(200).optional(),
  salary: z.string().max(200).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT', 'REMOTE']).optional(),
  recruiterEmail: z.string().email().optional(),
  recruiterName: z.string().max(200).optional(),
  recruitmentMessage: z.string().max(5000).optional(),
});

// Discriminated union of either URL or Full Text
export const jobSubmissionSchema = z.discriminatedUnion('type', [
  jobSubmitUrlSchema,
  jobSubmitTextSchema,
]);

export type JobSubmitUrlInput = z.infer<typeof jobSubmitUrlSchema>;
export type JobSubmitTextInput = z.infer<typeof jobSubmitTextSchema>;
export type JobSubmissionInput = z.infer<typeof jobSubmissionSchema>;
