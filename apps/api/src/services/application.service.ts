import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/client';
import {
  applications,
  applicationEvents,
  type JobApplicationStatus,
} from '../db/schema/applications';

export interface CreateApplicationDTO {
  userId: string;
  jobId?: string;
  jobTitle: string;
  companyName: string;
  jobUrl?: string;
  platform?: string;
  salary?: string;
  location?: string;
  notes?: string;
  appliedAt?: Date;
}

export interface ApplicationWithInsights {
  id: string;
  userId: string;
  jobId: string | null;
  jobTitle: string;
  companyName: string;
  jobUrl: string | null;
  platform: string;
  salary: string | null;
  location: string | null;
  currentStatus: string;
  appliedAt: Date;
  lastStatusUpdateAt: Date;
  notes: string | null;
  daysSinceApplied: number;
  isGhostedRecommended: boolean;
  reapproachTemplate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationStats {
  totalApplied: number;
  awaitingReply: number;
  repliedCount: number;
  interviewingCount: number;
  offersCount: number;
  rejectedCount: number;
  ghostedCount: number;
  staleGhostedWarningCount: number;
}

/**
 * Generates a polite, ready-to-send follow-up message for candidates to re-approach HR
 */
export function generateReapproachTemplate(
  companyName: string,
  jobTitle: string,
  appliedAt: Date
): string {
  const formattedDate = new Date(appliedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return `Hi Team ${companyName},\n\nI hope you are doing well. I wanted to politely follow up regarding my application for the ${jobTitle} position submitted on ${formattedDate}.\n\nI remain very enthusiastic about this opportunity and the work your team is doing. Could you please share if there are any updates regarding the next steps, or if the role is still open?\n\nThank you for your time and consideration!\n\nBest regards,`;
}

export class ApplicationService {
  /**
   * 1. Create a new tracked job application
   */
  static async createApplication(dto: CreateApplicationDTO): Promise<ApplicationWithInsights> {
    // Check if duplicate application already exists for this user (same company and job title)
    let existingApp = null;
    if (dto.companyName && dto.jobTitle) {
      const found = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.userId, dto.userId),
            eq(applications.companyName, dto.companyName.trim()),
            eq(applications.jobTitle, dto.jobTitle.trim())
          )
        )
        .limit(1);
      existingApp = found[0];
    }

    // Secondary check: if jobUrl is an explicit unique job permalink (not a generic search/feed root)
    if (
      !existingApp &&
      dto.jobUrl &&
      dto.companyName &&
      !dto.jobUrl.endsWith('/Job/index.htm') &&
      !dto.jobUrl.endsWith('/jobs/search/') &&
      !dto.jobUrl.includes('search')
    ) {
      const found = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.userId, dto.userId),
            eq(applications.jobUrl, dto.jobUrl.trim()),
            eq(applications.companyName, dto.companyName.trim())
          )
        )
        .limit(1);
      existingApp = found[0];
    }

    if (existingApp) {
      return this.enrichApplication(existingApp);
    }

    const appliedDate = dto.appliedAt ? new Date(dto.appliedAt) : new Date();

    const [inserted] = await db
      .insert(applications)
      .values({
        userId: dto.userId,
        jobId: dto.jobId || null,
        jobTitle: dto.jobTitle.trim(),
        companyName: dto.companyName.trim(),
        jobUrl: dto.jobUrl?.trim() || null,
        platform: dto.platform || 'OTHER',
        salary: dto.salary?.trim() || null,
        location: dto.location?.trim() || null,
        currentStatus: 'APPLIED',
        appliedAt: appliedDate,
        lastStatusUpdateAt: appliedDate,
        notes: dto.notes || null,
      })
      .returning();

    // Log initial event in timeline
    await db.insert(applicationEvents).values({
      applicationId: inserted.id,
      previousStatus: null,
      newStatus: 'APPLIED',
      note: 'Job application tracked by user',
    });

    return this.enrichApplication(inserted);
  }

  /**
   * 2. Get all applications for user with calculated ghost recommendations
   */
  static async getUserApplications(
    userId: string,
    filterStatus?: string
  ): Promise<{ applications: ApplicationWithInsights[]; stats: ApplicationStats }> {
    const userApps = await db
      .select()
      .from(applications)
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.appliedAt));

    const enriched = userApps.map((app) => this.enrichApplication(app));

    // Calculate aggregated dashboard metrics
    const stats: ApplicationStats = {
      totalApplied: enriched.length,
      awaitingReply: enriched.filter((a) => a.currentStatus === 'APPLIED').length,
      repliedCount: enriched.filter((a) => a.currentStatus === 'REPLIED').length,
      interviewingCount: enriched.filter((a) => a.currentStatus === 'INTERVIEWING').length,
      offersCount: enriched.filter((a) => a.currentStatus === 'OFFER').length,
      rejectedCount: enriched.filter((a) => a.currentStatus === 'REJECTED').length,
      ghostedCount: enriched.filter((a) => a.currentStatus === 'GHOSTED').length,
      staleGhostedWarningCount: enriched.filter((a) => a.isGhostedRecommended).length,
    };

    const filtered = filterStatus
      ? enriched.filter((a) => a.currentStatus.toUpperCase() === filterStatus.toUpperCase())
      : enriched;

    return {
      applications: filtered,
      stats,
    };
  }

  /**
   * 3. Update application status (APPLIED, REPLIED, INTERVIEWING, OFFER, REJECTED, GHOSTED)
   */
  static async updateStatus(
    applicationId: string,
    userId: string,
    newStatus: JobApplicationStatus,
    note?: string
  ): Promise<ApplicationWithInsights> {
    const existing = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
      .limit(1);

    if (!existing[0]) {
      throw new Error('Application record not found or unauthorized');
    }

    const previousStatus = existing[0].currentStatus;
    const now = new Date();

    const [updated] = await db
      .update(applications)
      .set({
        currentStatus: newStatus,
        lastStatusUpdateAt: now,
        notes: note || existing[0].notes,
        updatedAt: now,
      })
      .where(eq(applications.id, applicationId))
      .returning();

    // Log timeline event
    await db.insert(applicationEvents).values({
      applicationId: updated.id,
      previousStatus,
      newStatus,
      note: note || `Status updated from ${previousStatus} to ${newStatus}`,
    });

    return this.enrichApplication(updated);
  }

  /**
   * 4. Quick check if a job URL or (Company + Title) is already tracked
   */
  static async checkApplication(
    userId: string,
    jobUrl?: string,
    companyName?: string,
    jobTitle?: string
  ): Promise<{ applied: boolean; application: ApplicationWithInsights | null }> {
    let match = null;

    if (jobUrl) {
      const found = await db
        .select()
        .from(applications)
        .where(and(eq(applications.userId, userId), eq(applications.jobUrl, jobUrl)))
        .limit(1);
      match = found[0];
    }

    if (!match && companyName && jobTitle) {
      const found = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.userId, userId),
            eq(applications.companyName, companyName.trim()),
            eq(applications.jobTitle, jobTitle.trim())
          )
        )
        .limit(1);
      match = found[0];
    }

    if (!match) {
      return { applied: false, application: null };
    }

    return {
      applied: true,
      application: this.enrichApplication(match),
    };
  }

  /**
   * 5. Delete application
   */
  static async deleteApplication(applicationId: string, userId: string): Promise<boolean> {
    const res = await db
      .delete(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
      .returning({ id: applications.id });

    return res.length > 0;
  }

  /**
   * Enriches an application row with real-time 14-day (2-week) ghost detection
   */
  private static enrichApplication(app: typeof applications.$inferSelect): ApplicationWithInsights {
    const now = Date.now();
    const appliedTime = new Date(app.appliedAt).getTime();
    const daysSinceApplied = Math.max(0, Math.floor((now - appliedTime) / (1000 * 60 * 60 * 24)));

    // 2-week (14 days) ghost heuristic:
    // If status is still 'APPLIED' and 14+ days have passed without update
    const isGhostedRecommended = app.currentStatus === 'APPLIED' && daysSinceApplied >= 14;

    const reapproachTemplate = isGhostedRecommended
      ? generateReapproachTemplate(app.companyName, app.jobTitle, app.appliedAt)
      : null;

    return {
      ...app,
      daysSinceApplied,
      isGhostedRecommended,
      reapproachTemplate,
    };
  }
}
