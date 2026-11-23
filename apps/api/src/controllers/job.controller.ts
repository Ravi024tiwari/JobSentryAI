import { Request, Response } from 'express';
import { jobService } from '../services/job.service';
import { jobSubmissionSchema } from '@shared/validators/job.validator';

/**
 * 1. Submit a Job (URL or Raw Text Description)
 * POST /api/v1/jobs/submit
 */
export const submitJob = async (req: Request, res: Response) => {
  try {
    //  Validate incoming request body with Zod
    const parseResult = jobSubmissionSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    // : Pass validated data to the Job Service
    const result = await jobService.submitJob(parseResult.data);

    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Job submission error:', error);

    // SSRF / Restricted Infrastructure Error
    if (
      error.message?.includes('SSRF') ||
      error.message?.includes('Forbidden protocol') ||
      error.message?.includes('forbidden')
    ) {
      return res.status(403).json({
        success: false,
        error: 'Security Alert: This URL is blocked because it targets internal or restricted infrastructure.',
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process job submission',
    });
  }
};

/**
 * GET /api/v1/jobs/:id
 */
export const getJobById = async (req: Request, res: Response) => {
  try {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Job ID is required' });
    }

    const result = await jobService.getJobById(id);

    if (!result) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Get job error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * 3. List all recently submitted jobs
 * GET /api/v1/jobs
 */
export const listJobs = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const jobList = await jobService.listJobs(limit);

    return res.status(200).json({
      success: true,
      count: jobList.length,
      jobs: jobList,
    });
  } catch (error: any) {
    console.error('List jobs error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
