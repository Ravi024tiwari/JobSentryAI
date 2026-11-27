'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  FileText,
  Loader2,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Zap,
  CheckCircle2,
  Lock,
  Search,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { verifyJobDirect, type VerifyInput, type VerifyJobResponse } from '@/lib/api-client';

interface JobScannerProps {
  onVerificationComplete: (data: VerifyJobResponse) => void;
  onVerificationStart: () => void;
}

// Helper to parse slug from major job aggregators (Glassdoor, LinkedIn, Indeed)
function parseAggregatorUrl(rawUrl: string): { company?: string; title?: string } {
  try {
    const url = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    const pathname = decodeURIComponent(url.pathname);

    // Glassdoor: /job-listing/software-engineer-intern-google-JV_IC2940587...
    if (url.hostname.includes('glassdoor')) {
      const match = pathname.match(/job-listing\/([^\/_]+)/i);
      if (match && match[1]) {
        const parts = match[1].split('-');
        if (parts.length >= 2) {
          const company = parts[parts.length - 1];
          const title = parts.slice(0, parts.length - 1).join(' ');
          return {
            company: company.charAt(0).toUpperCase() + company.slice(1),
            title: title
              .split(' ')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' '),
          };
        }
      }
    }

    // LinkedIn: /jobs/view/software-engineer-at-swiggy-123456...
    if (url.hostname.includes('linkedin')) {
      const match = pathname.match(/jobs\/view\/([^\/]+)/i);
      if (match && match[1]) {
        const slug = match[1].replace(/-\d+$/, '');
        if (slug.includes('-at-')) {
          const [titlePart, companyPart] = slug.split('-at-');
          return {
            title: titlePart
              .split('-')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' '),
            company: companyPart
              .split('-')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' '),
          };
        }
      }
    }

    // Indeed: /cmp/company-name/jobs/...
    if (url.hostname.includes('indeed')) {
      const cmpMatch = pathname.match(/cmp\/([^\/]+)/i);
      if (cmpMatch && cmpMatch[1]) {
        return {
          company: cmpMatch[1]
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
        };
      }
    }
  } catch {}
  return {};
}

export function JobScanner({ onVerificationComplete, onVerificationStart }: JobScannerProps) {
  // Mode: 'UNIFIED' (Single paste link/message) or 'STRUCTURED' (Fields: link, company, title)
  const [mode, setMode] = useState<'UNIFIED' | 'STRUCTURED'>('UNIFIED');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unified mode single input
  const [unifiedInput, setUnifiedInput] = useState('');

  // Structured mode inputs
  const [jobLink, setJobLink] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [salary, setSalary] = useState('');
  const [recruiterEmail, setRecruiterEmail] = useState('');
  const [recruitmentMessage, setRecruitmentMessage] = useState('');

  // Scanning progress step
  const [scanStep, setScanStep] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setScanStep(0);
      interval = setInterval(() => {
        setScanStep((prev) => (prev < 3 ? prev + 1 : prev));
      }, 2200);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Demo presets
  const applyPreset = (preset: 'TELEGRAM_TRAP' | 'FEE_SCAM' | 'GOOGLE_INTERN') => {
    setError(null);
    if (preset === 'GOOGLE_INTERN') {
      setMode('UNIFIED');
      setUnifiedInput('https://careers.google.com/jobs/results/');
    } else if (preset === 'TELEGRAM_TRAP') {
      setMode('STRUCTURED');
      setCompanyName('Cloud Tasks Global');
      setJobTitle('Junior Content & Data Evaluator');
      setJobDescription(
        'We are hiring freshers for remote content evaluation. Zero application fee! Flexible working hours with daily payout of Rs. 1500 to Rs. 2500. Shortlisted candidates must immediately join our official Telegram group for initial task verification and daily briefing.'
      );
      setSalary('45,000 INR/month');
      setRecruiterEmail('hr.tasksteam@gmail.com');
      setRecruitmentMessage('Click here to join Telegram group: https://t.me/cloudtasks_intern_onboarding');
    } else if (preset === 'FEE_SCAM') {
      setMode('STRUCTURED');
      setCompanyName('Amazon India');
      setJobTitle('Data Entry & Document Verification Specialist');
      setJobDescription(
        'Dear Candidate, you have been shortlisted for Amazon Work from Home. Immediate joining! Monthly salary: Rs. 65,000. You need to pay a refundable security deposit of Rs. 2,500 for the company ID card and background verification kit. Further interview will be conducted on Telegram @amazon_recruiter_hr.'
      );
      setSalary('65,000 INR/month');
      setRecruiterEmail('amazon.careers.hiring@gmail.com');
      setRecruitmentMessage('Kindly transfer Rs. 2,500 registration deposit to confirm onboarding slot.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    onVerificationStart();

    try {
      let payload: VerifyInput;

      if (mode === 'UNIFIED') {
        const text = unifiedInput.trim();
        if (!text) {
          throw new Error('Please paste a job link or the recruitment message you received.');
        }

        // Check if the input is a URL
        const isUrl = /^https?:\/\//i.test(text) || /^www\./i.test(text);

        if (isUrl) {
          const formattedUrl = text.startsWith('http') ? text : `https://${text}`;
          payload = {
            type: 'URL',
            jobUrl: formattedUrl,
          };
        } else {
          // If user pasted message text in the unified box, parse or populate description
          if (text.length < 20) {
            throw new Error(
              'Please provide a bit more detail (at least 20 characters) or click "Or type the link, company and job title" to enter details individually.'
            );
          }

          // Smart heuristic: extract first line or company name if found
          const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
          const potentialTitle = lines[0]?.slice(0, 80) || 'Job Posting / Recruitment Message';
          
          payload = {
            type: 'TEXT',
            companyName: 'Specified in Submission',
            jobTitle: potentialTitle,
            description: text,
            recruitmentMessage: text,
          };
        }
      } else {
        // Structured Mode
        if (jobLink.trim() && !companyName.trim() && !jobDescription.trim()) {
          // If only job link was filled
          payload = {
            type: 'URL',
            jobUrl: jobLink.trim(),
            recruiterEmail: recruiterEmail.trim() || undefined,
          };
        } else {
          if (!companyName.trim() || !jobTitle.trim() || !jobDescription.trim()) {
            throw new Error('Company name, job title, and description (at least 20 characters) are required.');
          }
          if (jobDescription.trim().length < 20) {
            throw new Error('Job description must be at least 20 characters long.');
          }

          payload = {
            type: 'TEXT',
            companyName: companyName.trim(),
            jobTitle: jobTitle.trim(),
            description: jobDescription.trim(),
            salary: salary.trim() || undefined,
            recruiterEmail: recruiterEmail.trim() || undefined,
            recruitmentMessage: recruitmentMessage.trim() || undefined,
          };
        }
      }

      const response = await verifyJobDirect(payload);
      onVerificationComplete(response);
    } catch (err: any) {
      console.error('Scan error:', err);
      setError(err.message || 'Verification failed. Please check inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  const investigationSteps = [
    { title: 'Domain & Career Portal Verification', desc: 'Checking official corporate careers site & anti-bot safety' },
    { title: 'Deterministic Scam Engine', desc: 'Screening for advance fee keywords, Telegram traps & free email providers' },
    { title: 'Tavily Live Web Footprint', desc: 'Cross-referencing employer filings, active listings & MCA records' },
    { title: 'AI Detective Synthesis', desc: 'Evaluating impersonation risk, scam signatures & final verdict' },
  ];

  const handleSwitchToManualFromUrl = () => {
    const parsed = parseAggregatorUrl(unifiedInput);
    if (parsed.company && !companyName) setCompanyName(parsed.company);
    if (parsed.title && !jobTitle) setJobTitle(parsed.title);
    if (unifiedInput.trim() && !jobLink) setJobLink(unifiedInput.trim());
    setMode('STRUCTURED');
    setError(null);
  };

  const isBotBlockedError =
    error && (error.includes('403') || error.includes('blocked automated') || error.includes('Cloudflare'));

  const isAggregatorUrl =
    unifiedInput &&
    (/glassdoor\./i.test(unifiedInput) ||
      /linkedin\.com\/jobs/i.test(unifiedInput) ||
      /indeed\./i.test(unifiedInput) ||
      /naukri\./i.test(unifiedInput));

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* 1-Click Test Scenarios Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 px-1">
        <span className="text-[12.5px] font-semibold text-slate-600 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
          Test live scenarios:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyPreset('TELEGRAM_TRAP')}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100/80 hover:border-amber-300 transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
          >
            🚨 Telegram Task Scam
          </button>
          <button
            type="button"
            onClick={() => applyPreset('FEE_SCAM')}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-full border border-rose-200 bg-rose-50/70 text-rose-800 hover:bg-rose-100/80 hover:border-rose-300 transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
          >
            💸 Advance Fee Trap
          </button>
          <button
            type="button"
            onClick={() => applyPreset('GOOGLE_INTERN')}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/80 hover:border-emerald-300 transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
          >
            🏢 Google SWE Intern
          </button>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="rounded-[20px] border border-slate-200/90 bg-white p-6 sm:p-8 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.05),0_1px_3px_0_rgba(0,0,0,0.03)] transition-all">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            isBotBlockedError ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-[13px] space-y-2.5 animate-in fade-in-50">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-950">Job Portal Anti-Scraping Protection (HTTP 403)</p>
                    <p className="mt-0.5 text-amber-800 text-xs leading-relaxed">
                      {error}
                    </p>
                  </div>
                </div>
                <div className="pl-6.5 pt-0.5">
                  <button
                    type="button"
                    onClick={handleSwitchToManualFromUrl}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-900 text-white text-xs font-semibold hover:bg-amber-800 transition-all shadow-sm cursor-pointer active:scale-95"
                  >
                    <span>Paste Job Details Manually Instead</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[13px] leading-relaxed">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-900">Verification Error</p>
                  <p className="mt-0.5 text-rose-700">{error}</p>
                </div>
              </div>
            )
          )}

          {/* Mode Header with Highlisted-Style Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-1">
            <label className="text-[14.5px] font-bold text-slate-900 tracking-[-0.01em]">
              {mode === 'UNIFIED'
                ? 'The job link or the message you got'
                : 'Job link, company and job details'}
            </label>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'UNIFIED' ? 'STRUCTURED' : 'UNIFIED');
                setError(null);
              }}
              className="text-[13px] font-semibold text-slate-500 hover:text-slate-900 transition-colors underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900 cursor-pointer text-left"
            >
              {mode === 'UNIFIED'
                ? 'Or type the link, company and job title'
                : 'Or paste a single link or message'}
            </button>
          </div>

          {mode === 'UNIFIED' ? (
            /* Mode A: Single Unified Input (Link or Message) */
            <div className="space-y-2">
              <Textarea
                placeholder="Paste the job link (e.g. careers.google.com/...) or paste the WhatsApp/Telegram message, email or offer letter you received..."
                value={unifiedInput}
                onChange={(e) => setUnifiedInput(e.target.value)}
                disabled={loading}
                className="w-full rounded-[14px] border border-slate-300 bg-white px-4 py-3.5 text-[15.5px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 min-h-[140px] resize-y"
                required
              />
              {isAggregatorUrl && (
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-[12px] text-blue-900">
                  <span>
                    💡 <strong>Aggregator detected</strong>: Glassdoor and LinkedIn use Cloudflare bot firewalls. If direct link scraping fails, use the manual form below.
                  </span>
                  <button
                    type="button"
                    onClick={handleSwitchToManualFromUrl}
                    className="shrink-0 font-semibold underline text-blue-700 hover:text-blue-900 cursor-pointer"
                  >
                    Switch to form
                  </button>
                </div>
              )}
              <p className="text-[12px] text-slate-500 flex items-center gap-1.5 pt-1">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                Nothing you type or paste is stored. Works instantly without signing in.
              </p>
            </div>
          ) : (
            /* Mode B: Structured Fields */
            <div className="space-y-4">
              <div>
                <label className="text-[13px] font-semibold text-slate-700 block mb-1.5">
                  Job link <span className="text-slate-400 font-normal">(Optional if entering text below)</span>
                </label>
                <Input
                  type="url"
                  placeholder="The address of the job page, e.g. https://company.com/careers/..."
                  value={jobLink}
                  onChange={(e) => setJobLink(e.target.value)}
                  disabled={loading}
                  className="h-11 w-full rounded-[12px] border border-slate-300 bg-white px-3.5 text-[14.5px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[13px] font-semibold text-slate-700 block mb-1.5">
                    Company name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Swiggy, TCS, Amazon"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={loading}
                    className="h-11 w-full rounded-[12px] border border-slate-300 bg-white px-3.5 text-[14.5px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition outline-none"
                    required={mode === 'STRUCTURED' && !jobLink.trim()}
                  />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-slate-700 block mb-1.5">
                    Job title <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Software Engineer Intern"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    disabled={loading}
                    className="h-11 w-full rounded-[12px] border border-slate-300 bg-white px-3.5 text-[14.5px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition outline-none"
                    required={mode === 'STRUCTURED' && !jobLink.trim()}
                  />
                </div>
              </div>

              <div>
                <label className="text-[13px] font-semibold text-slate-700 block mb-1.5">
                  Job description or message text <span className="text-rose-500">*</span>
                </label>
                <Textarea
                  placeholder="Paste the job description, responsibilities, salary promised, or email text received..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-[12px] border border-slate-300 bg-white px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 min-h-[110px] resize-y transition outline-none"
                  required={mode === 'STRUCTURED' && !jobLink.trim()}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[13px] font-semibold text-slate-700 block mb-1.5">
                    Salary promised <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <Input
                    placeholder="e.g. Rs. 45,000/month"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    disabled={loading}
                    className="h-11 w-full rounded-[12px] border border-slate-300 bg-white px-3.5 text-[14.5px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition outline-none"
                  />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-slate-700 block mb-1.5">
                    Recruiter email <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="e.g. hr@company.com"
                    value={recruiterEmail}
                    onChange={(e) => setRecruiterEmail(e.target.value)}
                    disabled={loading}
                    className="h-11 w-full rounded-[12px] border border-slate-300 bg-white px-3.5 text-[14.5px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[13px] font-semibold text-slate-700 block mb-1.5">
                  Telegram or WhatsApp handle/link <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <Input
                  placeholder="e.g. 'Join Telegram @recruiter_hr' or https://t.me/..."
                  value={recruitmentMessage}
                  onChange={(e) => setRecruitmentMessage(e.target.value)}
                  disabled={loading}
                  className="h-11 w-full rounded-[12px] border border-slate-300 bg-white px-3.5 text-[14.5px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition outline-none"
                />
              </div>
            </div>
          )}

          {/* Real-Time Stepper Progress when loading */}
          {loading && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5 animate-in fade-in-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-2 text-[13px] font-bold text-slate-800">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-900" />
                  Verifying Against Official Employer Records...
                </div>
                <span className="text-[11.5px] font-medium text-slate-500">
                  Step {scanStep + 1} of 4
                </span>
              </div>

              <div className="space-y-2">
                {investigationSteps.map((step, idx) => {
                  const isDone = idx < scanStep;
                  const isCurrent = idx === scanStep;
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2.5 text-xs transition-opacity ${
                        isDone
                          ? 'text-emerald-700'
                          : isCurrent
                          ? 'text-slate-900 font-semibold'
                          : 'text-slate-400 opacity-60'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                      ) : isCurrent ? (
                        <div className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-900 border-t-transparent animate-spin mt-0.5" />
                      ) : (
                        <div className="h-4 w-4 shrink-0 rounded-full border border-slate-300 mt-0.5" />
                      )}
                      <div>
                        <div className="font-medium">{step.title}</div>
                        <div className="text-[11px] text-slate-500 font-normal">{step.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Highlisted Signature Action Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.015em] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none bg-slate-900 text-white hover:bg-slate-800 shadow-[0_2px_10px_rgba(15,23,42,0.18)] h-[52px] px-8 text-[15.5px] w-full sm:w-auto cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking employer portal...
                </>
              ) : (
                <>
                  Check this job
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <span className="text-[12px] text-slate-500 text-center sm:text-left">
              Free · Instant verification · 100% private
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
