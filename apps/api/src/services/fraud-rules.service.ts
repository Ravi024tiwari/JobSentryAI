import type { FraudSignal } from '@shared/types/verification.types';

interface FraudRuleDefinition {
  ruleCode: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'FATAL';
  title: string;
  description: string;
  patterns: RegExp[];
}

// Master Deterministic Fraud Rules Knowledge Base
const FRAUD_RULES: FraudRuleDefinition[] = [
  {
    ruleCode: 'FATAL_REGISTRATION_FEE',
    severity: 'FATAL',
    title: 'Registration or Application Fee Demanded',
    description:
      'Legitimate companies and campus recruitment never ask job seekers to pay registration, processing, or application fees.',
    patterns: [
      /\b(registration|application|processing|interview|portal|enrollment)\s+(fee|charge|charges|cost|amount|payment)\b/i,
      /\bpay\s+(rs\.?|inr|usd|\$)?\s*\d+\s*(for|towards)?\s*(registration|processing|interview|test)\b/i,
      /\brefundable\s+(deposit|fee|charge|security)\b/i,
    ],
  },
  {
    ruleCode: 'FATAL_TRAINING_OR_LAPTOP_DEPOSIT',
    severity: 'FATAL',
    title: 'Training, Equipment or Laptop Deposit Required',
    description:
      'Demanding advance payment for laptops, equipment, badges, or training materials is a classic recruitment scam pattern.',
    patterns: [
      /\b(laptop|equipment|badge|uniform|id\s*card|kit)\s+(deposit|security|fee|charges|cost)\b/i,
      /\bpay\s+for\s+(training|module|internship\s+certificate|onboarding)\b/i,
      /\bsecurity\s+deposit\s+before\s+(joining|offer|employment)\b/i,
    ],
  },
  {
    ruleCode: 'FATAL_BANKING_OR_OTP_DEMAND',
    severity: 'FATAL',
    title: 'Sensitive Financial / OTP Request',
    description:
      'Requests for OTPs, UPI PINs, net banking passwords, or credit card details during recruitment are malicious harvesting attacks.',
    patterns: [
      /\b(send|share|provide|enter)\s+(your\s+)?(otp|pin|cvv|net\s*banking|debit\s*card|credit\s*card)\b/i,
      /\btransfer\s+(money|funds|rs\.?|inr)\s+to\s+confirm\b/i,
    ],
  },
  {
    ruleCode: 'FATAL_TASK_BASED_SCAM',
    severity: 'FATAL',
    title: 'Task-Based / Like & Earn Scam Pattern',
    description:
      'Unrealistic daily earnings for trivial online actions (e.g. liking videos, rating hotels) are fraudulent investment/task scams.',
    patterns: [
      /\b(like|subscribe|rate)\s+(youtube|google|hotel|app|video)s?\s+(and|to)\s+(earn|get\s+paid)\b/i,
      /\bearn\s+(rs\.?|inr|\$)?\s*\d{3,5}\s*(per|a|every)?\s*(day|daily|hour)\s*(from\s+home)?\b/i,
      /\bpart\s*time\s*job\s*daily\s*income\s*(guaranteed)?\b/i,
    ],
  },
  {
    ruleCode: 'HIGH_TELEGRAM_WHATSAPP_ONLY_INTERVIEW',
    severity: 'HIGH',
    title: 'Exclusive WhatsApp/Telegram Recruitment Channel',
    description:
      'Conducting hiring solely through Telegram or WhatsApp without corporate email, ATS, or verified video calls is highly suspicious.',
    patterns: [
      /\b(interview|hiring|contact\s+hr)\s+(only\s+)?(via|on|through)\s+(telegram|whatsapp)\b/i,
      /\b(join|message)\s+(our\s+)?telegram\s+(channel|group|bot|handle)\b/i,
      /\bhttps?:\/\/t\.me\/[a-z0-9_]+/i,
    ],
  },
  {
    ruleCode: 'HIGH_FAKE_OFFER_COURIER_CHARGE',
    severity: 'HIGH',
    title: 'Offer Letter Courier / Medical Verification Fee',
    description:
      'Scammers issue fake offer letters and demand immediate money under the pretext of courier fees, medical checkups, or gate passes.',
    patterns: [
      /\b(courier|dispatch|delivery)\s+(charge|fee|cost)\s+for\s+(offer|appointment)\s+letter\b/i,
      /\bmedical\s+(checkup|fitness|examination)\s+(fee|cost)\s+to\s+be\s+paid\b/i,
    ],
  },
  {
    ruleCode: 'MEDIUM_HIGH_PRESSURE_URGENCY',
    severity: 'MEDIUM',
    title: 'Artificial Urgency & Seat Booking Pressure',
    description:
      'Imposing strict deadlines (e.g. "Pay within 2 hours or offer cancelled") is used to panic students into paying without due diligence.',
    patterns: [
      /\b(offer|seat|slot)\s+valid\s+only\s+for\s+(today|\d+\s*(hours?|mins?|minutes?))\b/i,
      /\bpay\s+immediately\s+to\s+(confirm|reserve|block)\s+(your\s+)?(seat|slot|offer)\b/i,
    ],
  },
];

/**
 * Scans job title, description, and message against deterministic fraud patterns
 */
export function scanForFraudSignals(title: string, description: string, recruitmentMessage?: string | null): FraudSignal[] {
  const combinedText = `${title}\n${description}\n${recruitmentMessage || ''}`.toLowerCase();
  const detectedSignals: FraudSignal[] = [];

  for (const rule of FRAUD_RULES) {
    for (const pattern of rule.patterns) {
      const match = combinedText.match(pattern);
      if (match) {
        detectedSignals.push({
          ruleCode: rule.ruleCode,
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
          matchedText: match[0],
        });
        break; // One match per rule is sufficient
      }
    }
  }

  return detectedSignals;
}
