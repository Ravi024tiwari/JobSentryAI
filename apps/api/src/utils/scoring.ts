import type { FraudSignal, RiskLevel, VerificationVerdict } from '@shared/types/verification.types';
import type { DomainAnalysisResult } from '../services/domain.service';

export interface ScoringInputs {
  fraudSignals: FraudSignal[];
  domainAnalysis: DomainAnalysisResult | null;
  hasOfficialWebsite: boolean;
  hasJobUrl: boolean;
  descriptionLength: number;
  scamReportCount?: number;
}

export interface ScoringOutput {
  riskScore: number;       // 0 to 100 (Higher = Higher Risk)
  riskLevel: RiskLevel;
  confidenceScore: number; // 0 to 100 (Completeness of evidence)
  verdict: VerificationVerdict;
  positiveSignals: string[];
  negativeSignals: string[];
  recommendations: string[];
}

/**
 * Deterministic mathematical scoring formula.
 * Decoupled from LLM hallucinations to ensure transparent, auditable verdicts.
 */
export function calculateJobRiskAndVerdict(input: ScoringInputs): ScoringOutput {
  const {
    fraudSignals,
    domainAnalysis,
    hasOfficialWebsite,
    hasJobUrl,
    descriptionLength,
    scamReportCount = 0,
  } = input;

  const positiveSignals: string[] = [];
  const negativeSignals: string[] = [];
  const recommendations: string[] = [];

  let riskScore = 15; // baseline neutral score
  let evidencePoints = 0; // for confidence calculation

  // -------------------------------------------------------------
  // 1. EVALUATE DETERMINISTIC FRAUD SIGNALS
  // -------------------------------------------------------------
  const fatalSignals = fraudSignals.filter((s) => s.severity === 'FATAL');
  const highSignals = fraudSignals.filter((s) => s.severity === 'HIGH');
  const mediumSignals = fraudSignals.filter((s) => s.severity === 'MEDIUM');

  if (fatalSignals.length > 0) {
    // Fatal pattern (e.g. registration fee, laptop deposit, OTP demand)
    riskScore = 90 + Math.min(10, fatalSignals.length * 5);
    fatalSignals.forEach((s) => {
      negativeSignals.push(`🚨 CRITICAL FRAUD DETECTED: ${s.title} (${s.description})`);
    });
    recommendations.push('NEVER pay any registration, processing, or security deposit money.');
    recommendations.push('Do NOT share OTPs, bank credentials, or government IDs.');
  } else {
    // Normal weighted accumulation
    riskScore += highSignals.length * 25;
    riskScore += mediumSignals.length * 15;

    highSignals.forEach((s) => negativeSignals.push(`HIGH RISK: ${s.title}`));
    mediumSignals.forEach((s) => negativeSignals.push(`WARNING: ${s.title}`));
  }

  // -------------------------------------------------------------
  // 2. EVALUATE RECRUITER & DOMAIN ANALYSIS
  // -------------------------------------------------------------
  if (domainAnalysis) {
    evidencePoints += 30;

    if (domainAnalysis.matchesCompanyDomain) {
      riskScore -= 20;
      positiveSignals.push(
        `Recruiter email (@${domainAnalysis.domain}) officially matches the claimed company website.`
      );
    }

    if (domainAnalysis.isFreeProvider) {
      riskScore += 20;
      negativeSignals.push(
        `Recruiter is using a free public mail provider (@${domainAnalysis.domain}) instead of corporate email.`
      );
      recommendations.push('Verify recruiter identity through official company channels or LinkedIn.');
    }

    if (domainAnalysis.isDisposable) {
      riskScore += 45;
      negativeSignals.push(`Recruiter email domain belongs to a temporary/disposable email service.`);
    }

    if (domainAnalysis.hasSuspiciousTld) {
      riskScore += 20;
      negativeSignals.push(`Recruiter domain uses a high-risk low-reputation TLD (@${domainAnalysis.domain}).`);
    }

    if (domainAnalysis.hasHyphenMimicry) {
      riskScore += 15;
      negativeSignals.push(`Recruiter domain contains multiple hyphens, resembling typosquatting mimicry.`);
    }

    if (!domainAnalysis.hasMxRecords) {
      riskScore += 35;
      negativeSignals.push(`Recruiter domain has no valid MX records and cannot receive mail.`);
    }
  }

  // -------------------------------------------------------------
  // 3. EVALUATE COMPANY & SOURCE EVIDENCE
  // -------------------------------------------------------------
  if (hasOfficialWebsite) {
    evidencePoints += 25;
    riskScore -= 10;
    positiveSignals.push('Company has an identifiable official online presence.');
  }

  if (hasJobUrl) {
    evidencePoints += 20;
  }

  if (descriptionLength > 300) {
    evidencePoints += 25;
    if (fatalSignals.length === 0 && highSignals.length === 0) {
      positiveSignals.push('Detailed job description with specific role requirements provided.');
    }
  } else {
    recommendations.push('Ask the employer for a formal detailed job description and offer letter.');
  }

  // -------------------------------------------------------------
  // 4. COMMUNITY SCAM REPORTS PENALTY
  // -------------------------------------------------------------
  if (scamReportCount > 0) {
    riskScore += Math.min(30, scamReportCount * 15);
    negativeSignals.push(
      `${scamReportCount} community scam reports have been recorded against this company name.`
    );
  }

  // Bound Risk Score between 0 and 100
  const finalRiskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

  // Calculate Confidence Score (Completeness of verifiable information)
  const confidenceScore = Math.max(15, Math.min(100, evidencePoints));

  // -------------------------------------------------------------
  // 5. DETERMINE VERDICT & RISK LEVEL
  // -------------------------------------------------------------
  let riskLevel: RiskLevel = 'LOW';
  if (finalRiskScore >= 80) riskLevel = 'CRITICAL';
  else if (finalRiskScore >= 55) riskLevel = 'HIGH';
  else if (finalRiskScore >= 30) riskLevel = 'MEDIUM';
  else riskLevel = 'LOW';

  let verdict: VerificationVerdict = 'UNABLE_TO_VERIFY';

  if (fatalSignals.length > 0 || finalRiskScore >= 75) {
    verdict = 'LIKELY_FRAUDULENT';
  } else if (finalRiskScore >= 40) {
    verdict = 'SUSPICIOUS';
  } else if (finalRiskScore < 40 && confidenceScore >= 40) {
    verdict = 'LIKELY_LEGITIMATE';
    positiveSignals.push('No obvious fraudulent patterns or fee demands detected.');
  } else {
    // Under-evidenced startup or insufficient data -> UNABLE_TO_VERIFY
    verdict = 'UNABLE_TO_VERIFY';
    recommendations.push('Limited public data available. Exercise caution and verify credentials directly.');
  }

  // Standard recommendations
  if (recommendations.length === 0) {
    recommendations.push('Apply through the official company career portal whenever possible.');
    recommendations.push('Keep record of all interview communications.');
  }

  return {
    riskScore: finalRiskScore,
    riskLevel,
    confidenceScore,
    verdict,
    positiveSignals,
    negativeSignals,
    recommendations,
  };
}
