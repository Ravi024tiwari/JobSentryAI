'use client';

import React, { useState } from 'react';
import {
  Shield,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Lock,
  ArrowRight,
  ExternalLink,
  PhoneCall,
  Search,
  Building2,
  FileCheck2,
  UserCheck2,
  BadgeAlert,
} from 'lucide-react';
import { JobScanner } from '@/components/job-scanner';
import { VerificationReport } from '@/components/verification-report';
import { FAQAccordion } from '@/components/faq-accordion';
import type { VerifyJobResponse } from '@/lib/api-client';

export default function HomePage() {
  const [verificationResult, setVerificationResult] = useState<VerifyJobResponse | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleStart = () => {
    setIsScanning(true);
    setVerificationResult(null);
  };

  const handleComplete = (data: VerifyJobResponse) => {
    setIsScanning(false);
    setVerificationResult(data);
    // Smooth scroll to results
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleReset = () => {
    setVerificationResult(null);
    setIsScanning(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-start overflow-hidden px-4 py-8 sm:py-14">
      {/* Background Subtle Mesh */}
      <div className="absolute inset-0 bg-subtle-pattern pointer-events-none opacity-40 -z-10" />

      {/* Hero Header Section */}
      {!verificationResult && (
        <div className="relative z-10 text-center max-w-2xl mx-auto space-y-4 mb-8 sm:mb-10 animate-in fade-in-50 duration-500">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-sm">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            Free online verification tool
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.03em] text-slate-900 leading-[1.12]">
            Is this job real?
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            Checked against the employer's own careers site, with scam signs pointed out. Nothing is saved.
          </p>
        </div>
      )}

      {/* Main Interactive Scanner or Report */}
      <div className="relative z-10 w-full flex justify-center mb-16 sm:mb-20">
        {verificationResult ? (
          <div className="w-full flex flex-col items-center">
            <VerificationReport data={verificationResult} onReset={handleReset} />
          </div>
        ) : (
          <JobScanner
            onVerificationStart={handleStart}
            onVerificationComplete={handleComplete}
          />
        )}
      </div>

      {/* Section 1: What We Check */}
      <section id="how-it-works" className="w-full max-w-4xl mx-auto mb-16 sm:mb-20">
        <div className="text-left sm:text-center space-y-2 mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            What we check
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Four verification layers test every submission against authentic hiring channels.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Building2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Employer careers site match
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              We check if the role exists on the employer's verified corporate domain or official ATS (Workday, Greenhouse, Lever, Taleo), rather than unverified third-party message channels.
            </p>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <UserCheck2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Recruiter identity & channels
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Real HR recruiters use official domain emails (<code className="text-xs font-semibold">@company.com</code>). We flag recruiters operating through free Gmail/Outlook accounts or exclusively via Telegram and WhatsApp.
            </p>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
              <BadgeAlert className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Advance fee & registration traps
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Legitimate employers never charge candidates for application fees, training kits, gate passes, background verification, or laptop security deposits. Any request for money is a confirmed scam.
            </p>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Corporate entity registration
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Cross-referenced with Ministry of Corporate Affairs (MCA) records, corporate registries, and known scam domain databases in real time to catch cloned domains and ghost organizations.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: How Job Scams Work in 2026 */}
      <section id="scam-patterns" className="w-full max-w-4xl mx-auto mb-16 sm:mb-20">
        <div className="text-left sm:text-center space-y-2 mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            How job scams in India work in 2026
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Four patterns cover most of what candidates report to cyber crime portals.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wide">
              <span>Pattern 1</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Task scams
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              You receive a WhatsApp or Telegram message offering Rs. 1,500–5,000/day for liking YouTube videos, rating Google Maps locations, or hotel reviews. Small initial payouts are made to build trust, followed by demands for "prepaid deposits" to unlock higher-tier tasks.
            </p>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wide">
              <span>Pattern 2</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Fee for joining or equipment
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Scammers claim you have been shortlisted for Amazon, TCS, or a renowned bank, but demand a "refundable" security deposit (Rs. 1,500–15,000) for company ID cards, courier charges, or background verification. Real companies never charge candidates.
            </p>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wide">
              <span>Pattern 3</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Fake offer letters & zero-interview jobs
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              No genuine video or technical interview takes place. You receive a forged offer letter complete with corporate logos, signatures, and high compensation promises within hours, followed by urgent demands for bank details or advance fees.
            </p>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wide">
              <span>Pattern 4</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Lookalike sites & handles
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Fraudsters register deceptive typo-squatted domains (e.g. <code className="text-xs font-semibold">swiggy-careers.in</code> or <code className="text-xs font-semibold">amazonhiringportal.net</code>) that look authentic to harvest personal identity documents, Aadhaar cards, and bank details.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: What To Do & Official Helplines */}
      <section id="official-reporting" className="w-full max-w-4xl mx-auto mb-16 sm:mb-20">
        <div className="text-left sm:text-center space-y-2 mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            What to do if you suspect a scam
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Immediate steps and verified government reporting channels.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <PhoneCall className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                National Cyber Crime Helpline
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                If you have transferred funds or shared bank credentials, dial <strong className="text-slate-900">1930</strong> immediately to freeze the transfer, and file a formal report.
              </p>
            </div>
            <a
              href="https://cybercrime.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline pt-2"
            >
              cybercrime.gov.in <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Shield className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Chakshu (Sanchar Saathi)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Report suspicious WhatsApp recruitment messages, spam job SMS, or fraudulent callers directly to the Department of Telecommunications.
              </p>
            </div>
            <a
              href="https://sancharsaathi.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline pt-2"
            >
              sancharsaathi.gov.in <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Search className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Ministry of Corporate Affairs
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Verify whether an Indian company is legally registered by checking its Corporate Identification Number (CIN) and registered office on MCA Master Data.
              </p>
            </div>
            <a
              href="https://www.mca.gov.in/content/mca/global/en/mca/master-data/MDS.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline pt-2"
            >
              mca.gov.in <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </section>

      {/* Section 4: Questions People Ask (FAQ) */}
      <section id="faq" className="w-full max-w-3xl mx-auto mb-16 sm:mb-24">
        <div className="text-left sm:text-center space-y-2 mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Questions people ask
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Clear answers about job verification and candidate safety.
          </p>
        </div>

        <FAQAccordion />
      </section>
    </div>
  );
}
