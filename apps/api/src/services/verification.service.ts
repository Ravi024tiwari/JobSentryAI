import crypto from 'crypto';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/client';
import { jobs, companies, jobAnalyses, analysisEvidence, verificationHistory, userReports } from '../db/schema';
import { scanForFraudSignals } from './fraud-rules.service';
import { analyzeRecruiterDomain } from './domain.service';
import { calculateJobRiskAndVerdict } from '../utils/scoring';
import type { JobAnalysisResult, VerificationEvidenceItem } from '@shared/types/verification.types';

export class VerificationService {
 
  
  async verifyJob(jobId: string, forceReAnalysis = false): Promise<JobAnalysisResult> {
    // 1. Fetch Job from Database
    const jobList = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (jobList.length === 0) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    const job = jobList[0];

    // 2. Fetch Associated Company
    let company = null;
    if (job.companyId) {
      const companyList = await db.select().from(companies).where(eq(companies.id, job.companyId)).limit(1);
      company = companyList[0] || null;
    }

    // 3. Cache Check (Unless forced refresh)
    if (!forceReAnalysis) {
      const existingAnalysis = await db
        .select()
        .from(jobAnalyses)
        .where(eq(jobAnalyses.jobId, job.id))
        .orderBy(desc(jobAnalyses.analyzedAt))
        .limit(1);

      if (existingAnalysis.length > 0 && new Date(existingAnalysis[0].expiresAt) > new Date()) {
        const stored = existingAnalysis[0];
        const evidenceRows = await db
          .select()
          .from(analysisEvidence)
          .where(eq(analysisEvidence.analysisId, stored.id));

        const structuredResult = stored.analysisResult as any;

        return {
          jobId: job.id,
          verdict: stored.verdict as any,
          riskScore: stored.riskScore,
          riskLevel: stored.riskLevel as any,
          confidenceScore: stored.confidence,
          positiveSignals: structuredResult.positiveSignals || [],
          negativeSignals: structuredResult.negativeSignals || [],
          fraudSignals: structuredResult.fraudSignals || [],
          evidenceSummary: structuredResult.evidenceSummary || 'Cached verification result',
          recommendations: structuredResult.recommendations || [],
          evidenceList: evidenceRows.map((e) => ({
            id: e.id,
            type: e.evidenceType as any,
            sourceUrl: e.sourceUrl || undefined,
            sourceTitle: e.sourceTitle,
            summary: e.evidenceSummary,
            isPositiveSignal: e.isPositiveSignal === 'true',
            credibilityScore: e.sourceCredibility / 100,
            recordedAt: e.retrievedAt.toISOString(),
          })),
          modelVersions: {
            ruleEngine: stored.modelVersion,
            langGraphVersion: stored.workflowVersion,
            analyzedAt: stored.analyzedAt.toISOString(),
          },
        };
      }
    }

    // 4. Run Deterministic Fraud Rules
    const fraudSignals = scanForFraudSignals(job.title, job.description);

    // 5. Run Recruiter & Domain Analysis
    const domainAnalysis = await analyzeRecruiterDomain(
      job.recruiterEmail,
      company?.officialWebsite,
      company?.name
    );

    // 6. Check Community Scam Reports Count
    let scamReportCount = 0;
    if (company?.id) {
      const reports = await db
        .select()
        .from(userReports)
        .where(eq(userReports.companyId, company.id));
      scamReportCount = reports.length;
    }

    // 7. Calculate Mathematical Risk & Verdict (Deterministic Baseline)
    const scoring = calculateJobRiskAndVerdict({
      fraudSignals,
      domainAnalysis,
      hasOfficialWebsite: Boolean(company?.officialWebsite),
      hasJobUrl: Boolean(job.jobUrl),
      descriptionLength: job.description.length,
      scamReportCount,
    });

    // 8. Phase 4: Consult Python AI Engine (LangGraph + Tavily + Gemini)
    let aiInvestigation: any = null;
    const aiEngineUrl = process.env.AI_ENGINE_URL?.replace('localhost', '127.0.0.1') || 'http://127.0.0.1:8000';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for web research + LLM

      const aiResponse = await fetch(`${aiEngineUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          companyName: company?.name || job.title,
          jobTitle: job.title,
          description: job.description,
          jobUrl: job.jobUrl,
          salary: job.salary,
          location: job.location,
          employmentType: job.employmentType,
          preComputedHints: {
            fatalFlags: fraudSignals.filter((s) => s.severity === 'FATAL').map((s) => s.title),
            suspiciousSignals: fraudSignals.filter((s) => s.severity !== 'FATAL').map((s) => s.title),
            deterministicRiskScore: scoring.riskScore,
            domainTrustScore: domainAnalysis?.trustScore,
            domainWarningMessages: domainAnalysis?.warningMessages || [],
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (aiResponse.ok) {
        aiInvestigation = await aiResponse.json();
      } else {
        console.warn(`[AI Engine] Verification service returned HTTP ${aiResponse.status}`);
      }
    } catch (err: any) {
      console.warn(`[AI Engine] Unavailable or timed out: ${err.message}. Proceeding with deterministic baseline.`);
    }

    // 9. Score Fusion: Blend Deterministic Math with AI Evidence
    const hasFatalSignal = fraudSignals.some((s) => s.severity === 'FATAL');
    let finalRiskScore = scoring.riskScore;
    let finalConfidenceScore = scoring.confidenceScore;
    let finalVerdict = scoring.verdict;
    let finalPositiveSignals = [...scoring.positiveSignals];
    let finalNegativeSignals = [...scoring.negativeSignals];
    let finalEvidenceSummary = '';

    if (aiInvestigation) {
      // If deterministic found fatal scam, never let LLM hallucinate it away
      if (hasFatalSignal) {
        finalRiskScore = Math.max(scoring.riskScore, aiInvestigation.aiRiskScore);
        finalVerdict = 'LIKELY_FRAUDULENT';
        finalConfidenceScore = Math.max(scoring.confidenceScore, aiInvestigation.aiConfidenceScore || 0, 95);
      } else {
        // Weighted blend: 35% deterministic baseline + 65% AI contextual reasoning
        finalRiskScore = Math.round(scoring.riskScore * 0.35 + aiInvestigation.aiRiskScore * 0.65);
        finalConfidenceScore = Math.max(scoring.confidenceScore, aiInvestigation.aiConfidenceScore);

        if (finalRiskScore >= 70) {
          finalVerdict = 'LIKELY_FRAUDULENT';
        } else if (finalRiskScore >= 35) {
          finalVerdict = 'SUSPICIOUS';
        } else if (finalConfidenceScore < 40) {
          finalVerdict = 'UNABLE_TO_VERIFY';
        } else {
          finalVerdict = 'LIKELY_LEGITIMATE';
        }
      }

      // Merge signals discovered by AI
      if (Array.isArray(aiInvestigation.contextualRedFlags)) {
        finalNegativeSignals.push(...aiInvestigation.contextualRedFlags);
      }
      if (Array.isArray(aiInvestigation.positiveIndicators)) {
        finalPositiveSignals.push(...aiInvestigation.positiveIndicators);
      }

      finalEvidenceSummary = aiInvestigation.reasoningSummary || '';
    } else {
      finalEvidenceSummary =
        scoring.verdict === 'LIKELY_FRAUDULENT'
          ? 'Critical warning signs detected in recruitment statements.'
          : scoring.verdict === 'LIKELY_LEGITIMATE'
          ? 'No suspicious patterns found; company & recruiter align with official records.'
          : 'Inconclusive signals; exercise diligence before sharing information.';
    }

    // Deduplicate signal lists
    finalPositiveSignals = Array.from(new Set(finalPositiveSignals));
    finalNegativeSignals = Array.from(new Set(finalNegativeSignals));

    // 10. Assemble Evidence Items
    const evidenceList: VerificationEvidenceItem[] = [];

    // Add AI Reasoning Evidence if available
    if (aiInvestigation) {
      evidenceList.push({
        id: crypto.randomUUID(),
        type: 'LLM_REASONING' as any,
        sourceTitle: 'JobSentry AI Contextual Investigation',
        summary: aiInvestigation.reasoningSummary,
        isPositiveSignal: finalVerdict === 'LIKELY_LEGITIMATE',
        credibilityScore: (aiInvestigation.aiConfidenceScore || 75) / 100,
        recordedAt: new Date().toISOString(),
      });

      // Add ATS Matches Evidence if found
      if (aiInvestigation.careersPortalMatches && aiInvestigation.careersPortalMatches.length > 0) {
        evidenceList.push({
          id: crypto.randomUUID(),
          type: 'CAREERS_PORTAL' as any,
          sourceUrl: aiInvestigation.careersPortalMatches[0].url,
          sourceTitle: `Career Portal Listing: ${aiInvestigation.careersPortalMatches[0].title}`,
          summary: `Cross-referenced vacancy matched official career portal listings.`,
          isPositiveSignal: true,
          credibilityScore: 0.9,
          recordedAt: new Date().toISOString(),
        });
      }
    }

    // Add Domain Evidence
    if (domainAnalysis) {
      evidenceList.push({
        id: crypto.randomUUID(),
        type: 'RECRUITER_DOMAIN',
        sourceTitle: `Recruiter Domain Inspection (@${domainAnalysis.domain})`,
        summary: domainAnalysis.warningMessages.length > 0
          ? domainAnalysis.warningMessages.join('. ')
          : `Domain @${domainAnalysis.domain} verified with valid MX records and matches company.`,
        isPositiveSignal: domainAnalysis.matchesCompanyDomain && !domainAnalysis.isFreeProvider,
        credibilityScore: domainAnalysis.trustScore / 100,
        recordedAt: new Date().toISOString(),
      });
    }

    // Add Fraud Rules Evidence
    fraudSignals.forEach((signal) => {
      evidenceList.push({
        id: crypto.randomUUID(),
        type: 'FRAUD_HEURISTIC',
        sourceTitle: `Rule Triggered: ${signal.title}`,
        summary: `${signal.description} (Matched pattern: "${signal.matchedText || 'pattern'}")`,
        isPositiveSignal: false,
        credibilityScore: signal.severity === 'FATAL' ? 0.95 : 0.8,
        recordedAt: new Date().toISOString(),
      });
    });

    // Add Company Online Presence Evidence
    if (company?.officialWebsite) {
      evidenceList.push({
        id: crypto.randomUUID(),
        type: 'COMPANY_WEBSITE',
        sourceUrl: company.officialWebsite,
        sourceTitle: 'Company Official Online Presence',
        summary: `Identified candidate official website at ${company.officialWebsite}`,
        isPositiveSignal: true,
        credibilityScore: 0.85,
        recordedAt: new Date().toISOString(),
      });
    }

    // 11. Save Analysis to Neon Database
    const newAnalysisId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 Days Cache TTL

    const finalRiskLevel =
      finalRiskScore < 20 ? 'LOW' : finalRiskScore < 50 ? 'MEDIUM' : finalRiskScore < 80 ? 'HIGH' : 'CRITICAL';

    const analysisPayload = {
      positiveSignals: finalPositiveSignals,
      negativeSignals: finalNegativeSignals,
      fraudSignals,
      recommendations: scoring.recommendations,
      evidenceSummary: finalEvidenceSummary,
    };

    await db.insert(jobAnalyses).values({
      id: newAnalysisId,
      jobId: job.id,
      riskScore: finalRiskScore,
      riskLevel: finalRiskLevel,
      confidence: finalConfidenceScore,
      verdict: finalVerdict,
      analysisResult: analysisPayload,
      contentHash: job.contentHash,
      modelVersion: 'deterministic-rules-v1.0 + gemini-3.8-flash',
      workflowVersion: 'langgraph-detective-v1.0',
      analyzedAt: now,
      expiresAt,
    });

    // 12. Save Evidence Items to Neon Database
    if (evidenceList.length > 0) {
      for (const item of evidenceList) {
        await db.insert(analysisEvidence).values({
          id: item.id,
          analysisId: newAnalysisId,
          evidenceType: item.type,
          sourceUrl: item.sourceUrl || null,
          sourceTitle: item.sourceTitle,
          evidenceSummary: item.summary,
          sourceCredibility: Math.round(item.credibilityScore * 100),
          isPositiveSignal: item.isPositiveSignal ? 'true' : 'false',
          retrievedAt: new Date(item.recordedAt),
        });
      }
    }

    // 13. Record Verification History
    await db.insert(verificationHistory).values({
      id: crypto.randomUUID(),
      jobId: job.id,
      analysisId: newAnalysisId,
      newVerdict: finalVerdict,
      triggerReason: forceReAnalysis ? 'RE_ANALYSIS' : 'USER_SUBMISSION',
    });

    return {
      jobId: job.id,
      verdict: finalVerdict,
      riskScore: finalRiskScore,
      riskLevel: finalRiskLevel,
      confidenceScore: finalConfidenceScore,
      positiveSignals: finalPositiveSignals,
      negativeSignals: finalNegativeSignals,
      fraudSignals,
      evidenceSummary: finalEvidenceSummary,
      recommendations: scoring.recommendations,
      evidenceList,
      modelVersions: {
        ruleEngine: 'deterministic-rules-v1.0',
        langGraphVersion: 'langgraph-detective-v1.0',
        analyzedAt: now.toISOString(),
      },
    };
  }
}

export const verificationService = new VerificationService();
