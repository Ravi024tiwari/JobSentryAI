import { Request, Response } from 'express';
import { verificationService } from '../services/verification.service';

/**
 * Trigger job verification analysis
 * POST /api/v1/jobs/:id/verify
 */
export const verifyJobController = async (req: Request, res: Response) => {
  try {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Job ID parameter is required' });
    }

    const forceRefresh = req.query.refresh === 'true';
    const result = await verificationService.verifyJob(id, forceRefresh);

    return res.status(200).json({
      success: true,
      message: 'Job verification completed successfully',
      analysis: result,
    });
  } catch (error: any) {
    console.error('Job verification error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify job',
    });
  }
};
