// Company Recruitment Intelligence Metrics
export interface CompanyRecruitmentStats {
  companyId: string;
  companyName: string;
  totalReportedApplications: number;
  totalInterviews: number;
  totalReportedOffers: number;
  medianResponseDays: number | null;
  scamReportCount: number;
  isVerifiedEntity: boolean;
}

// Community Scam Alert Category
export const REPORT_CATEGORIES = [
  'REGISTRATION_FEE_DEMAND',
  'FAKE_INTERNSHIP',
  'FAKE_OFFER_LETTER',
  'RECRUITER_IMPERSONATION',
  'NONEXISTENT_COMPANY',
  'MISLEADING_SALARY',
  'SUSPICIOUS_WEBSITE',
  'PERSONAL_DATA_HARVESTING',
  'OTHER',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
