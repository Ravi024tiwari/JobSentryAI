import crypto from 'crypto';
import * as cheerio from 'cheerio';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/client';
import { companies, jobs, jobAnalyses, analysisEvidence } from '../db/schema';
import { safeFetchHtml } from './ssrf.service';
import type { JobSubmissionInput } from '@shared/validators/job.validator';

/**
 * Normalizes company name by removing legal suffixes and punctuation
 * e.g., "Google India Pvt. Ltd." -> "google india"
 */
export function normalizeCompanyName(rawName: string): string {
  if (!rawName) return 'unknown';

  return rawName
    .toLowerCase()
    .trim()
    .replace(/\b(pvt|private|ltd|limited|inc|llc|corp|corporation|technologies|solutions|services|group|co)\b/gi, '')
    .replace(/[^a-z0-9\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes deterministic SHA-256 content hash for duplicate job detection
 */
export function computeJobContentHash(company: string, title: string, description: string): string {
  const normalizedText = `${company.toLowerCase().trim()}|${title.toLowerCase().trim()}|${description
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()}`;

  return crypto.createHash('sha256').update(normalizedText).digest('hex');
}

/**
 * Extracts readable job text from fetched HTML using Cheerio
 */
export function extractJobFromHtml(html: string, pageUrl: string) {
  const $ = cheerio.load(html);

  // 1. Extract Meta & OpenGraph information BEFORE stripping tags (vital for React SPAs)
  const ogTitle =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content');
  const pageTitle = $('title').text().trim();
  const rawTitle = ogTitle || $('h1').first().text().trim() || pageTitle || 'Untitled Job Opening';

  const metaDesc =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content') ||
    '';

  // 2. Extract Company Name & clean Title
  const domain = new URL(pageUrl).hostname.replace(/^www\./, '');
  const domainBase = domain.split('.')[0] || 'Unknown Company';

  let company =
    $('meta[property="og:site_name"]').attr('content') ||
    $('meta[name="author"]').attr('content') ||
    '';

  let jobTitle = rawTitle;

  // Handle common job patterns: "Software Engineer at Google" or "Software Engineer Intern at Auraverse | Presio"
  if (rawTitle.includes(' at ')) {
    const parts = rawTitle.split(' at ');
    jobTitle = parts[0].trim();
    const candidateCompany = parts[1].split('|')[0].split('-')[0].trim();
    if (candidateCompany) {
      company = candidateCompany;
    }
  }

  if (!company) {
    company = domainBase;
  }

  // 3. Remove non-content elements
  $('script, style, noscript, nav, footer, header, svg, iframe, form').remove();

  // 4. Extract clean body text
  let bodyText =
    $('main').text() ||
    $('article').text() ||
    $('[class*="job"]').text() ||
    $('body').text();

  bodyText = bodyText.replace(/\s+/g, ' ').trim();

  // 5. Build rich description (handles React SPAs where body text is minimal or rendered client-side)
  let description = '';
  if (bodyText.length > 100) {
    description = bodyText.slice(0, 15000);
  } else if (metaDesc.length > 20) {
    description = metaDesc;
  } else {
    description = `Job opening posted at ${pageUrl}`;
  }

  return {
    title: jobTitle.slice(0, 200),
    company: company.slice(0, 100),
    description,
    domain,
  };
}

/**
 * Finds existing company or creates a new normalized record
 */
export async function findOrCreateCompany(companyName: string, officialWebsite?: string) {
  const normalized = normalizeCompanyName(companyName);

  // Search existing
  const existing = await db
    .select()
    .from(companies)
    .where(eq(companies.normalizedName, normalized))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new company record
  const newCompanyId = crypto.randomUUID();
  const [created] = await db
    .insert(companies)
    .values({
      id: newCompanyId,
      name: companyName.trim(),
      normalizedName: normalized,
      officialWebsite: officialWebsite || null,
      isVerifiedEntity: false,
    })
    .returning();

  return created;
}

export class JobService {
 
  async submitJob(input: JobSubmissionInput, _userId?: string) {
    let companyName = '';
    let jobTitle = '';
    let description = '';
    let jobUrl: string | undefined = undefined;
    let recruiterEmail: string | undefined = undefined;
    let location: string | undefined = undefined;
    let salary: string | undefined = undefined;
    let employmentType: string | undefined = undefined;
    let sourcePlatform = 'DIRECT_INPUT';

    // 1. Process URL submission with SSRF guard
    if (input.type === 'URL') {
      jobUrl = input.jobUrl;
      sourcePlatform = 'URL_CRAWLER';
      recruiterEmail = input.recruiterEmail;

      // Safe fetch HTML with SSRF verification
      const rawHtml = await safeFetchHtml(input.jobUrl);
      const extracted = extractJobFromHtml(rawHtml, input.jobUrl);

      companyName = input.companyName || extracted.company;
      jobTitle = extracted.title;
      description = extracted.description;
    } else {
      // 2. Process Raw Text Submission
      companyName = input.companyName;
      jobTitle = input.jobTitle;
      description = input.description;
      jobUrl = input.jobUrl;
      recruiterEmail = input.recruiterEmail;
      location = input.location;
      salary = input.salary;
      employmentType = input.employmentType;
      sourcePlatform = 'DIRECT_TEXT';
    }

    // 3. Compute SHA-256 Content Hash
    const contentHash = computeJobContentHash(companyName, jobTitle, description);

    // 4. Cache-First Deduplication Check
    const existingJob = await db
      .select()
      .from(jobs)
      .where(eq(jobs.contentHash, contentHash))
      .limit(1);

    if (existingJob.length > 0) {
      const foundJob = existingJob[0];

      // Check for fresh analysis (less than 7 days old)
      const freshAnalysis = await db
        .select()
        .from(jobAnalyses)
        .where(eq(jobAnalyses.jobId, foundJob.id))
        .orderBy(desc(jobAnalyses.analyzedAt))
        .limit(1);

      if (freshAnalysis.length > 0 && new Date(freshAnalysis[0].expiresAt) > new Date()) {
        const analysis = freshAnalysis[0];

        // Fetch supporting evidence
        const evidence = await db
          .select()
          .from(analysisEvidence)
          .where(eq(analysisEvidence.analysisId, analysis.id));

        return {
          isCacheHit: true,
          message: 'Found fresh existing verification analysis (Cache Hit)',
          job: foundJob,
          analysis: {
            ...analysis,
            evidence,
          },
        };
      }

      return {
        isCacheHit: false,
        message: 'Job already exists but requires new analysis',
        job: foundJob,
        analysis: null,
      };
    }

    // 5. Create / Link Company
    const company = await findOrCreateCompany(
      companyName,
      jobUrl ? new URL(jobUrl).origin : undefined
    );

    // 6. Insert New Job Record
    const newJobId = crypto.randomUUID();

    const [insertedJob] = await db
      .insert(jobs)
      .values({
        id: newJobId,
        companyId: company.id,
        title: jobTitle,
        description,
        jobUrl: jobUrl || null,
        sourcePlatform,
        contentHash,
        location: location || null,
        salary: salary || null,
        employmentType: employmentType || null,
        recruiterEmail: recruiterEmail || null,
      })
      .returning();

    return {
      isCacheHit: false,
      message: 'Job submitted successfully and queued for analysis',
      job: insertedJob,
      company,
      analysis: null,
    };
  }

  
  async getJobById(jobId: string) {
    const jobResults = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);

    if (jobResults.length === 0) {
      return null;
    }

    const job = jobResults[0];

    // Fetch company info if linked
    let company = null;
    if (job.companyId) {
      const compResults = await db.select().from(companies).where(eq(companies.id, job.companyId)).limit(1);
      company = compResults[0] || null;
    }

    // Fetch latest analysis
    const analysisResults = await db
      .select()
      .from(jobAnalyses)
      .where(eq(jobAnalyses.jobId, job.id))
      .orderBy(desc(jobAnalyses.analyzedAt))
      .limit(1);

    let analysis = null;
    if (analysisResults.length > 0) {
      const latestAnalysis = analysisResults[0];
      const evidence = await db
        .select()
        .from(analysisEvidence)
        .where(eq(analysisEvidence.analysisId, latestAnalysis.id));

      analysis = {
        ...latestAnalysis,
        evidence,
      };
    }

    return {
      job,
      company,
      analysis,
    };
  }

  /**
   * Lists recently submitted jobs
   */
  async listJobs(limit = 20) {
    return await db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(limit);
  }
}

export const jobService = new JobService();//here we are exporting those servvice to the controller calling that
