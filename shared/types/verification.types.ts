// Verification Verdicts (Core Product Requirement)
export const VERIFICATION_VERDICTS = [
  'LIKELY_LEGITIMATE',
  'SUSPICIOUS',
  'LIKELY_FRAUDULENT',
  'UNABLE_TO_VERIFY',
] as const;
export type VerificationVerdict = (typeof VERIFICATION_VERDICTS)[number];

// Risk Level Classification
export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

// Evidence Types
export const EVIDENCE_TYPES = [
  'COMPANY_WEBSITE',
  'REGISTRY_RECORD',
  'RECRUITER_DOMAIN',
  'CAREERS_PORTAL',
  'STUDENT_REPORT',
  'FRAUD_HEURISTIC',
  'COMMUNITY_EVIDENCE',
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

// Structured Evidence Item
export interface VerificationEvidenceItem {
  id: string;
  type: EvidenceType;
  sourceUrl?: string;
  sourceTitle: string;
  summary: string;
  isPositiveSignal: boolean;
  credibilityScore: number; // 0.0 - 1.0
  recordedAt: string;
}

// Fraud Signal Detected
export interface FraudSignal {
  ruleCode: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'FATAL';
  title: string;
  description: string;
  matchedText?: string;
}

// Complete Job Verification Assessment
export interface JobAnalysisResult {
  jobId: string;
  verdict: VerificationVerdict;
  riskScore: number;       // 0 to 100 (Higher = Higher Risk)
  riskLevel: RiskLevel;
  confidenceScore: number; // 0 to 100 (Completeness of evidence)
  positiveSignals: string[];
  negativeSignals: string[];
  fraudSignals: FraudSignal[];
  evidenceSummary: string;
  recommendations: string[];
  evidenceList: VerificationEvidenceItem[];
  modelVersions: {
    ruleEngine: string;
    langGraphVersion: string;
    analyzedAt: string;
  };
}
