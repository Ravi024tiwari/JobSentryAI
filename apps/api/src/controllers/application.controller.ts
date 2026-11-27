import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  ApplicationService,
  CreateApplicationDTO,
} from '../services/application.service';
import {
  VALID_APPLICATION_STATUSES,
  JobApplicationStatus,
} from '../db/schema/applications';

export class ApplicationController {
  /**
   * POST /api/v1/applications
   * Track a new applied job
   */
  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { jobTitle, companyName, jobUrl, platform, salary, location, notes, appliedAt } =
        req.body;

      if (!jobTitle || !companyName) {
        return res.status(400).json({
          success: false,
          message: 'Both jobTitle and companyName are required to track an application.',
        });
      }

      const dto: CreateApplicationDTO = {
        userId,
        jobTitle,
        companyName,
        jobUrl,
        platform,
        salary,
        location,
        notes,
        appliedAt,
      };

      const application = await ApplicationService.createApplication(dto);

      return res.status(201).json({
        success: true,
        message: 'Application tracked successfully!',
        data: application,
      });
    } catch (error: any) {
      console.error('Track application error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to track job application',
      });
    }
  }

  /**
   * GET /api/v1/applications
   * Retrieve all tracked applications with metrics and ghost recommendations
   */
  static async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const filterStatus = req.query.status as string | undefined;

      const result = await ApplicationService.getUserApplications(userId, filterStatus);

      return res.status(200).json({
        success: true,
        data: result.applications,
        stats: result.stats,
      });
    } catch (error: any) {
      console.error('Get applications error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve applications',
      });
    }
  }

  /**
   * PATCH /api/v1/applications/:id/status
   * Update status (APPLIED, REPLIED, INTERVIEWING, OFFER, REJECTED, GHOSTED)
   */
  static async updateStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { status, note } = req.body;

      if (!status || !VALID_APPLICATION_STATUSES.includes(status as JobApplicationStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${VALID_APPLICATION_STATUSES.join(', ')}`,
        });
      }

      const updated = await ApplicationService.updateStatus(
        id,
        userId,
        status as JobApplicationStatus,
        note
      );

      return res.status(200).json({
        success: true,
        message: `Status updated to ${status}`,
        data: updated,
      });
    } catch (error: any) {
      console.error('Update status error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to update application status',
      });
    }
  }

  /**
   * GET /api/v1/applications/check
   * Check if user already applied to this URL or (company + title)
   */
  static async check(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(200).json({ success: true, applied: false });
      }

      const url = req.query.url as string | undefined;
      const company = req.query.company as string | undefined;
      const title = req.query.title as string | undefined;

      const result = await ApplicationService.checkApplication(userId, url, company, title);

      return res.status(200).json({
        success: true,
        applied: result.applied,
        data: result.application,
      });
    } catch (error: any) {
      console.error('Check application error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to check application',
      });
    }
  }

  /**
   * DELETE /api/v1/applications/:id
   */
  static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const deleted = await ApplicationService.deleteApplication(id, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Application not found or unauthorized',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Application removed successfully',
      });
    } catch (error: any) {
      console.error('Delete application error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete application',
      });
    }
  }
}
