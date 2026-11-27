'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Brain,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  Briefcase,
  Copy,
  Check,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { VerifyJobResponse } from '@/lib/api-client';

interface VerificationReportProps {
  data: VerifyJobResponse;
  onReset?: () => void;
}

export function VerificationReport({ data, onReset }: VerificationReportProps) {
  const { analysis, job } = data;
  const {
    verdict,
    riskScore,
    riskLevel,
    confidenceScore,
    evidenceSummary,
    positiveSignals,
    negativeSignals,
    recommendations,
    evidenceList,
  } = analysis;

  const [copied, setCopied] = useState(false);
  const [signalFilter, setSignalFilter] = useState<'ALL' | 'RED' | 'GREEN'>('ALL');

  const isLegit = verdict === 'LIKELY_LEGITIMATE';
  const isSuspicious = verdict === 'SUSPICIOUS';
  const isScam = verdict === 'LIKELY_FRAUDULENT';

  const handleCopyVerdict = () => {
    const textToCopy = `JobSentry AI Report:\nRole: ${job.title}\nVerdict: ${verdict}\nFraud Risk Score: ${riskScore}/100 (${riskLevel})\nConfidence: ${confidenceScore}%\nSummary: ${evidenceSummary}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Verdict styling configuration
  const verdictConfig = isLegit
    ? {
        title: 'Likely Legitimate Opening',
        desc: 'Verified against employer presence and corporate domain parameters. No critical red flags or advance fees found.',
        cardClass: 'border-emerald-300 bg-emerald-50/70',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        scoreColor: 'text-emerald-700',
        iconBg: 'bg-emerald-100 text-emerald-700',
        strokeColor: '#059669',
        icon: <ShieldCheck className="h-8 w-8" />,
      }
    : isSuspicious
    ? {
        title: 'Suspicious Job Listing',
        desc: 'Inconsistencies detected. Verify directly on the official employer careers site before sharing documents or information.',
        cardClass: 'border-amber-300 bg-amber-50/70',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        scoreColor: 'text-amber-700',
        iconBg: 'bg-amber-100 text-amber-700',
        strokeColor: '#d97706',
        icon: <AlertTriangle className="h-8 w-8" />,
      }
    : isScam
    ? {
        title: 'Critical Fraud Warning',
        desc: 'Scam signatures identified. Involves advance fee requests, unverified Telegram channels, or brand impersonation.',
        cardClass: 'border-rose-300 bg-rose-50/70',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
        scoreColor: 'text-rose-700',
        iconBg: 'bg-rose-100 text-rose-700',
        strokeColor: '#e11d48',
        icon: <ShieldAlert className="h-8 w-8" />,
      }
    : {
        title: 'Inconclusive Listing',
        desc: 'Limited evidence found online. Proceed with standard caution and verify employer registration on official registries.',
        cardClass: 'border-slate-300 bg-slate-50',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
        scoreColor: 'text-slate-700',
        iconBg: 'bg-slate-100 text-slate-700',
        strokeColor: '#64748b',
        icon: <HelpCircle className="h-8 w-8" />,
      };

  // SVG Gauge
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (riskScore / 100) * circumference;

  return (
    <div className="w-full max-w-3xl space-y-6 animate-in fade-in-50 duration-500">
      {/* Top Action Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider font-mono">
            Verification Result
          </span>
          <span className="text-[12px] text-slate-400 font-mono">
            #{job.id.slice(0, 8)}
          </span>
        </div>
        {onReset && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="h-8 px-3.5 text-xs font-semibold rounded-full border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Check another job
          </Button>
        )}
      </div>

      {/* 1. Master Verdict Card */}
      <div className={`rounded-[20px] border p-6 sm:p-7 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.05)] ${verdictConfig.cardClass}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Main Info */}
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl shrink-0 shadow-sm ${verdictConfig.iconBg}`}>
              {verdictConfig.icon}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {verdictConfig.title}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${verdictConfig.badgeClass}`}>
                  Risk: {riskLevel}
                </span>
                {data.isCacheHit && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border border-blue-200 bg-blue-50 text-blue-700">
                    ⚡ Instant Cache Hit (&lt;50ms)
                  </span>
                )}
              </div>
              <p className="text-[13.5px] text-slate-700 max-w-lg leading-relaxed">
                {verdictConfig.desc}
              </p>
              <div className="pt-1 flex items-center gap-2 text-xs text-slate-600 font-medium">
                <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                <span>{job.title}</span>
              </div>
            </div>
          </div>

          {/* Metric Badges */}
          <div className="flex items-center justify-around sm:justify-end gap-6 pt-4 md:pt-0 border-t md:border-t-0 md:border-l md:border-slate-200 md:pl-6 shrink-0">
            {/* Risk Gauge */}
            <div className="flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-slate-200/80"
                    fill="transparent"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    stroke={verdictConfig.strokeColor}
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className={`text-xl font-extrabold ${verdictConfig.scoreColor}`}>
                    {riskScore}
                  </span>
                  <span className="text-[10px] text-slate-500 block -mt-1 font-mono">/100</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mt-1">
                Fraud Score
              </span>
            </div>

            {/* Certainty */}
            <div className="flex flex-col items-center text-center pl-2">
              <div className="text-2xl font-black text-slate-900 font-mono">
                {confidenceScore}<span className="text-sm font-normal text-slate-500">%</span>
              </div>
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mt-1">
                Certainty
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold mt-0.5">High Precision</span>
            </div>
          </div>
        </div>

        {/* Footer actions bar */}
        <div className="mt-5 pt-4 border-t border-slate-200/80 flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-slate-600">
            Cross-referenced with official employer career portals and corporate registries.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyVerdict}
            className="h-8 px-3 text-xs rounded-full border-slate-300 bg-white hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 shadow-sm"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Copied summary!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy report summary
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2. AI Detective Reasoning Summary */}
      <div className="rounded-[20px] border border-slate-200/90 bg-white p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Brain className="h-4 w-4 text-blue-600" />
          AI Detective Reasoning & Synthesis
        </div>
        <p className="text-xs text-slate-500 -mt-1">
          Forensic breakdown generated by Google Gemini Flash based on verified web records.
        </p>
        <blockquote className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-[13.5px] leading-relaxed text-slate-800 italic">
          "{evidenceSummary}"
        </blockquote>
      </div>

      {/* 3. Signals Breakdown (Red Flags & Trust Signals) */}
      <div className="rounded-[20px] border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Signals Detected ({negativeSignals.length + positiveSignals.length})
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Specific scam patterns and legitimate corporate trust signals identified.
            </p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setSignalFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-all ${
                signalFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({negativeSignals.length + positiveSignals.length})
            </button>
            <button
              onClick={() => setSignalFilter('RED')}
              className={`px-3 py-1 rounded-lg transition-all ${
                signalFilter === 'RED'
                  ? 'bg-rose-100 text-rose-800 shadow-sm'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Scam Signs ({negativeSignals.length})
            </button>
            <button
              onClick={() => setSignalFilter('GREEN')}
              className={`px-3 py-1 rounded-lg transition-all ${
                signalFilter === 'GREEN'
                  ? 'bg-emerald-100 text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Trust Signals ({positiveSignals.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Red Flags */}
          {(signalFilter === 'ALL' || signalFilter === 'RED') && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2.5">
              <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5 uppercase tracking-wider">
                <XCircle className="h-4 w-4 text-rose-600" />
                Scam Signs Pointed Out ({negativeSignals.length})
              </div>
              {negativeSignals.length > 0 ? (
                <ul className="space-y-2">
                  {negativeSignals.map((sig, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-rose-900 leading-relaxed">
                      <span className="text-rose-600 font-bold shrink-0 mt-0.5">•</span>
                      <span>{sig}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 italic">No overt scam indicators discovered.</p>
              )}
            </div>
          )}

          {/* Positive Signals */}
          {(signalFilter === 'ALL' || signalFilter === 'GREEN') && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2.5">
              <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Verified Trust Anchors ({positiveSignals.length})
              </div>
              {positiveSignals.length > 0 ? (
                <ul className="space-y-2">
                  {positiveSignals.map((sig, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-emerald-900 leading-relaxed">
                      <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                      <span>{sig}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 italic">Limited verified public career records found.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Verified Evidence Sources */}
      {evidenceList && evidenceList.length > 0 && (
        <div className="rounded-[20px] border border-slate-200/90 bg-white p-6 shadow-sm space-y-3.5">
          <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building className="h-4 w-4 text-blue-600" />
            Verified Evidence Artifacts ({evidenceList.length})
          </div>
          <p className="text-xs text-slate-500 -mt-1">
            Real-time evidence gathered from search footprints and corporate registries.
          </p>

          <div className="space-y-2.5 pt-1">
            {evidenceList.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-all text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-900 flex items-center gap-2">
                    {item.isPositiveSignal ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    )}
                    {item.sourceTitle}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 shrink-0">
                    {Math.round(item.credibilityScore * 100)}% Credibility
                  </span>
                </div>
                <p className="text-slate-600 pl-5 leading-relaxed">{item.summary}</p>
                {item.sourceUrl && (
                  <div className="pl-5 pt-0.5">
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {item.sourceUrl.slice(0, 65)}...
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. What to do next / Candidate Action Plan */}
      {recommendations && recommendations.length > 0 && (
        <div className="rounded-[20px] border border-blue-200 bg-blue-50/50 p-6 space-y-3 shadow-sm">
          <div className="font-bold text-blue-950 flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-blue-600" />
            What You Should Do Next
          </div>
          <ul className="space-y-2 text-xs text-blue-900">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                <span className="text-blue-600 font-bold shrink-0 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
