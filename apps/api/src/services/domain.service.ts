import dns from 'dns/promises';
import type { MxRecord } from 'dns';

// Free consumer email providers
const FREE_EMAIL_PROVIDERS = new Set([
  'gmail.com',
  'yahoo.com',
  'yahoo.co.in',
  'outlook.com',
  'hotmail.com',
  'rediffmail.com',
  'zoho.com',
  'icloud.com',
  'protonmail.com',
  'aol.com',
]);

// Suspicious / Low-reputation TLDs frequently used in recruitment phishing
const SUSPICIOUS_TLDS = new Set([
  '.xyz',
  '.top',
  '.click',
  '.buzz',
  '.tk',
  '.ml',
  '.ga',
  '.cf',
  '.gq',
  '.work',
  '.loan',
  '.rest',
]);

// Temporary / Disposable email providers
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'throwawaymail.com',
  'sharklasers.com',
]);

export interface DomainAnalysisResult {
  email: string;
  domain: string;
  isFreeProvider: boolean;
  isDisposable: boolean;
  hasSuspiciousTld: boolean;
  hasHyphenMimicry: boolean;
  hasMxRecords: boolean;
  matchesCompanyDomain: boolean;
  trustScore: number; // 0 to 100
  warningMessages: string[];
}

/**
 * Normalizes domain by stripping subdomains like 'www'
 */
function cleanDomain(rawDomain: string): string {
  return rawDomain.toLowerCase().trim().replace(/^www\./, '');
}

/**
 * Analyzes recruiter email domain and cross-references it with the company
 */
export async function analyzeRecruiterDomain(
  recruiterEmail?: string | null,
  companyWebsite?: string | null,
  _companyName?: string | null
): Promise<DomainAnalysisResult | null> {
  if (!recruiterEmail || !recruiterEmail.includes('@')) {
    return null;
  }

  const email = recruiterEmail.toLowerCase().trim();
  const domain = email.split('@')[1];
  const warnings: string[] = [];
  let trustScore = 70; // baseline neutral

  // 1. Check for free email provider (e.g. hr@gmail.com)
  const isFreeProvider = FREE_EMAIL_PROVIDERS.has(domain);
  if (isFreeProvider) {
    trustScore -= 30;
    warnings.push(
      `Recruiter is using a free public email provider (@${domain}) instead of an official company corporate domain.`
    );
  }

  // 2. Check for disposable / temporary email
  const isDisposable = DISPOSABLE_DOMAINS.has(domain);
  if (isDisposable) {
    trustScore -= 60;
    warnings.push(`Recruiter email domain (@${domain}) belongs to a disposable temporary email service.`);
  }

  // 3. Check for suspicious phishing TLDs (.xyz, .top, etc.)
  const hasSuspiciousTld = Array.from(SUSPICIOUS_TLDS).some((tld) => domain.endsWith(tld));
  if (hasSuspiciousTld) {
    trustScore -= 25;
    warnings.push(`Recruiter domain (@${domain}) uses a suspicious low-reputation top-level domain.`);
  }

  // 4. Check for hyphenated mimicry (e.g. google-careers-jobs.com, amazon-hiring-india.in)
  const hasHyphenMimicry = (domain.match(/-/g) || []).length >= 2;
  if (hasHyphenMimicry) {
    trustScore -= 20;
    warnings.push(
      `Recruiter domain (@${domain}) contains multiple hyphens, a common pattern in phishing impersonation domains.`
    );
  }

  // 5. Cross-check against official company website
  let matchesCompanyDomain = false;
  if (companyWebsite) {
    try {
      const parsedUrl = new URL(companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`);
      const companyDomain = cleanDomain(parsedUrl.hostname);

      if (domain === companyDomain || domain.endsWith(`.${companyDomain}`)) {
        matchesCompanyDomain = true;
        trustScore += 25;
      } else if (!isFreeProvider) {
        trustScore -= 25;
        warnings.push(
          `Domain mismatch: Recruiter domain (@${domain}) does not match the company's official website (${companyDomain}).`
        );
      }
    } catch {
      // invalid URL format, ignore
    }
  }

  // 6. Check MX (Mail Exchange) DNS records with a 3-second timeout protection
  let hasMxRecords = false;
  try {
    const mxPromise = dns.resolveMx(domain);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('DNS MX resolution timeout')), 3000)
    );
    const mxRecords = (await Promise.race([mxPromise, timeoutPromise])) as MxRecord[];
    hasMxRecords = Boolean(mxRecords && mxRecords.length > 0);
  } catch {
    hasMxRecords = false;
    trustScore -= 30;
    warnings.push(`Domain (@${domain}) has no valid MX records or DNS lookup timed out.`);
  }

  return {
    email,
    domain,
    isFreeProvider,
    isDisposable,
    hasSuspiciousTld,
    hasHyphenMimicry,
    hasMxRecords,
    matchesCompanyDomain,
    trustScore: Math.max(0, Math.min(100, trustScore)),
    warningMessages: warnings,
  };
}
