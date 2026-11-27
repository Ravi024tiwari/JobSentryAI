import { useState, useEffect } from 'react';
import {
  Shield,
  ExternalLink,
  Loader2,
  Settings,
  Sparkles,
  Briefcase,
  Clock,
  AlertTriangle,
  Plus,
  Lock,
  LogIn,
  User,
  Mail,
  Copy,
  CheckCircle,
} from 'lucide-react';
import type { ExtractedJobData } from '../content/parsers';

export function Popup() {
  const [activeTabNav, setActiveTabNav] = useState<'SCAN' | 'TRACKER'>('SCAN');
  const [activeJob, setActiveJob] = useState<ExtractedJobData | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [trackedSuccess, setTrackedSuccess] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiUrl, setApiUrl] = useState('https://jobsentryai-1.onrender.com/api/v1');
  const [savedSettings, setSavedSettings] = useState(false);

  // Authentication & Applications list for Tracker tab
  const [applications, setApplications] = useState<any[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [copiedAppId, setCopiedAppId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Load stored settings and last analysis
    chrome.storage.local.get(['apiUrl', 'lastVerifiedJob', 'userId', 'userName'], (res) => {
      if (res.apiUrl) setApiUrl(res.apiUrl);
      if (res.lastVerifiedJob) setLastAnalysis(res.lastVerifiedJob);
      if (res.userId) {
        setCurrentUser({ id: res.userId, name: res.userName || 'Account' });
        setAuthRequired(false);
      } else {
        setAuthRequired(true);
      }
    });

    // 2. Query active tab for current job
    setLoading(true);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, { action: 'EXTRACT_ACTIVE_JOB' }, (response) => {
          if (chrome.runtime.lastError) {
            setActiveJob(null);
          } else if (response) {
            setActiveJob(response);
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (activeTabNav === 'TRACKER') {
      loadApplications();
    }
  }, [activeTabNav]);

  const loadApplications = async () => {
    setAppsLoading(true);
    try {
      const stored = await chrome.storage.local.get(['userId', 'userName']);
      if (!stored.userId) {
        setAuthRequired(true);
        setCurrentUser(null);
        setApplications([]);
        return;
      }

      setCurrentUser({ id: stored.userId, name: stored.userName });
      setAuthRequired(false);

      const res: any = await chrome.runtime.sendMessage({ action: 'GET_APPLICATIONS' });
      if (res?.requireAuth || res?.data?.requireAuth || res?.data?.authenticated === false) {
        setAuthRequired(true);
        setApplications([]);
        return;
      }

      const apps = res?.data?.applications || res?.applications || res?.data || [];
      if (Array.isArray(apps)) {
        setApplications(apps);
      }
    } catch (e) {
      console.warn('Failed to load applications in popup:', e);
    } finally {
      setAppsLoading(false);
    }
  };

  const handleVerifyActiveJob = async () => {
    if (!activeJob) return;
    setError(null);
    setVerifying(true);

    try {
      const res: any = await chrome.runtime.sendMessage({
        action: 'VERIFY_JOB',
        payload: activeJob,
      });

      if (!res || !res.success) {
        throw new Error(res?.error || 'Verification failed');
      }

      setLastAnalysis({
        job: res.data.job,
        analysis: res.data.analysis,
        verifiedAt: new Date().toISOString(),
        platform: activeJob.platform,
      });
    } catch (err: any) {
      setError(err.message || 'Verification could not be completed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleTrackCurrentJob = async () => {
    if (!activeJob) return;
    const stored = await chrome.storage.local.get(['userId']);
    if (!stored.userId) {
      window.open('https://job-sentry-i.vercel.app/login?redirect=/applications', '_blank');
      return;
    }

    setTracking(true);
    try {
      const res: any = await chrome.runtime.sendMessage({
        action: 'TRACK_APPLICATION',
        payload: {
          jobTitle: activeJob.jobTitle,
          companyName: activeJob.companyName,
          jobUrl: activeJob.jobUrl,
          platform: activeJob.platform,
          salary: activeJob.salary,
          notes: activeJob.description || null,
        },
      });

      if (res?.success) {
        setTrackedSuccess(true);
        setTimeout(() => setTrackedSuccess(false), 3000);
      } else if (res?.error?.includes('AUTH_REQUIRED')) {
        window.open('https://job-sentry-i.vercel.app/login?redirect=/applications', '_blank');
      }
    } catch (e) {
      console.error('Failed to track job:', e);
    } finally {
      setTracking(false);
    }
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    try {
      await chrome.runtime.sendMessage({
        action: 'UPDATE_APPLICATION_STATUS',
        payload: { id: appId, status: newStatus },
      });
      setApplications((prev) =>
        prev.map((a) =>
          a.id === appId
            ? { ...a, currentStatus: newStatus, isGhostedRecommended: false }
            : a
        )
      );
      chrome.runtime.sendMessage({ action: 'REFRESH_BADGE' });
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  const handleSaveSettings = () => {
    chrome.storage.local.set({ apiUrl: apiUrl.trim() }, () => {
      setSavedSettings(true);
      setTimeout(() => {
        setSavedSettings(false);
        setShowSettings(false);
      }, 1000);
    });
  };

  return (
    <div className="w-[380px] bg-[#fafaf9] text-slate-900 flex flex-col min-h-[480px]">
      {/* Header */}
      <header className="px-4 py-3 bg-white border-b border-slate-200/90 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <Shield className="w-4 h-4 text-blue-400 fill-blue-400/20" />
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-tight text-slate-900">
              JobSentry <span className="text-blue-600 font-black">AI</span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium -mt-0.5">
              Fraud Radar & Job Tracker
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {currentUser ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10.5px] font-semibold text-slate-700 max-w-[120px] truncate" title={`Signed in as ${currentUser.name}`}>
              <User className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="truncate">{currentUser.name}</span>
            </div>
          ) : (
            <button
              onClick={() => window.open('https://job-sentry-i.vercel.app/login?redirect=/applications', '_blank')}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              Sign In
            </button>
          )}

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Navigation Switcher Tabs */}
      <div className="px-4 pt-2.5 bg-white border-b border-slate-200 flex items-center gap-2 text-xs">
        <button
          onClick={() => setActiveTabNav('SCAN')}
          className={`pb-2 font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTabNav === 'SCAN'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Scan Active Job</span>
        </button>

        <button
          onClick={() => setActiveTabNav('TRACKER')}
          className={`pb-2 font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTabNav === 'TRACKER'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>My Applications</span>
          {applications.filter((a) => a.isGhostedRecommended).length > 0 ? (
            <span
              className="px-1.5 py-0.2 rounded-full bg-rose-600 text-[10px] font-black text-white shadow-2xs"
              title={`${applications.filter((a) => a.isGhostedRecommended).length} applications need follow-up`}
            >
              {applications.filter((a) => a.isGhostedRecommended).length} ⚠️
            </span>
          ) : applications.length > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
              {applications.length}
            </span>
          ) : null}
        </button>
      </div>

      {/* Main Content Area */}
      <main className="p-4 flex-1 flex flex-col space-y-3.5">
        {showSettings ? (
          /* Settings Panel */
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
            <div className="text-xs font-bold text-slate-800">Extension Settings</div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                JobSentry Backend API URL
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 outline-none focus:border-slate-900"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleSaveSettings}
                className="text-xs font-semibold px-4 py-1.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                {savedSettings ? '✓ Saved!' : 'Save Settings'}
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        ) : activeTabNav === 'SCAN' ? (
          /* SCAN TAB */
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Active Tab Detection
                </span>
                {activeJob ? (
                  <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {activeJob.platform} Detected
                  </span>
                ) : (
                  <span className="text-[10.5px] font-medium text-slate-400">
                    No active job found
                  </span>
                )}
              </div>

              {loading ? (
                <div className="py-4 flex items-center justify-center text-xs text-slate-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                  Reading page DOM...
                </div>
              ) : activeJob ? (
                <div>
                  <div className="text-[14px] font-bold text-slate-900 line-clamp-1">
                    {activeJob.jobTitle}
                  </div>
                  <div className="text-[12px] text-slate-600 mt-0.5">
                    {activeJob.companyName}
                  </div>

                  <div className="pt-3 flex flex-col gap-2">
                    <button
                      onClick={handleVerifyActiveJob}
                      disabled={verifying}
                      className="w-full h-9 rounded-full bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Checking official records...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                          Verify This Job Now
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleTrackCurrentJob}
                      disabled={tracking}
                      className="w-full h-8.5 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {trackedSuccess ? (
                        <span className="text-emerald-700 font-bold">✓ Tracked in Applications!</span>
                      ) : (
                        <>
                          <Briefcase className="w-3 h-3 text-blue-600" />
                          <span>Mark as Applied & Track</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-600 py-2 leading-relaxed">
                  Open any job post on <strong>Glassdoor, LinkedIn, Indeed, or Naukri</strong>. JobSentry AI will automatically detect the listing and allow 1-click verification.
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {error}
              </div>
            )}

            {/* Latest Verification Report */}
            {lastAnalysis && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Latest Verification
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(lastAnalysis.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900 line-clamp-1">
                      {lastAnalysis.job.title}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Case #{lastAnalysis.job.id.slice(0, 8)}
                    </div>
                  </div>

                  {lastAnalysis.analysis.verdict === 'LIKELY_LEGITIMATE' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                      Authentic
                    </span>
                  ) : lastAnalysis.analysis.verdict === 'SUSPICIOUS' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                      Suspicious
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                      Scam Alert
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-600 font-medium">Fraud Risk Score:</span>
                  <span className="font-extrabold text-slate-900 font-mono">
                    {lastAnalysis.analysis.riskScore}/100
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          /* TRACKER TAB */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Tracked Applications</span>
              <a
                href="https://job-sentry-i.vercel.app/applications"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {appsLoading ? (
              <div className="py-8 flex items-center justify-center text-xs text-slate-500 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                Loading tracker...
              </div>
            ) : authRequired ? (
              <div className="p-6 rounded-2xl border border-slate-200 bg-white text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-800">Sign In Required</div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Application tracking is protected and tied to your verified account. Please sign in to track jobs and access smart follow-up reminders.
                </p>
                <button
                  onClick={() => window.open('https://job-sentry-i.vercel.app/login?redirect=/applications', '_blank')}
                  className="w-full h-8.5 rounded-full bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In / Create Account ↗</span>
                </button>
              </div>
            ) : applications.length === 0 ? (
              <div className="p-6 rounded-2xl border border-slate-200 bg-white text-center space-y-2">
                <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-xs font-bold text-slate-800">No Tracked Jobs Yet</div>
                <p className="text-[11px] text-slate-500">
                  When browsing any job, click <strong>"Mark as Applied & Track"</strong> to save it here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {applications.map((app: any) => (
                  <div
                    key={app.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {app.jobTitle}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {app.companyName}
                        </div>
                      </div>

                      {/* Status Dropdown */}
                      <select
                        value={app.currentStatus}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        className="text-[10px] font-bold rounded-lg px-2 py-1 border bg-slate-50 border-slate-200 cursor-pointer text-slate-800 focus:outline-none"
                      >
                        <option value="APPLIED">Applied</option>
                        <option value="REPLIED">Replied</option>
                        <option value="INTERVIEWING">Interview</option>
                        <option value="OFFER">Offer 🎉</option>
                        <option value="GHOSTED">Ghosted</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </div>

                    {/* Stale / Ghosted warning & 1-Click Actions */}
                    {app.isGhostedRecommended && (
                      <div className="mt-2 p-2 rounded-lg bg-rose-50/80 border border-rose-200/90 text-[10.5px] space-y-1.5">
                        <div className="flex items-center gap-1 font-bold text-rose-800">
                          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>14d+ no reply · Re-approach HR!</span>
                        </div>

                        <div className="flex items-center gap-1.5 pt-0.5">
                          {/* 1-Click Open in Gmail */}
                          {app.reapproachTemplate && (
                            <button
                              onClick={() => {
                                const subject = encodeURIComponent(
                                  `Following up on application: ${app.jobTitle} - ${app.companyName}`
                                );
                                const body = encodeURIComponent(app.reapproachTemplate);
                                window.open(
                                  `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`,
                                  '_blank'
                                );
                              }}
                              className="flex-1 py-1 px-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                              title="Open pre-filled follow-up email in Gmail"
                            >
                              <Mail className="w-2.5 h-2.5" />
                              <span>Open Gmail ↗</span>
                            </button>
                          )}

                          {/* Copy Note Button */}
                          {app.reapproachTemplate && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(app.reapproachTemplate);
                                setCopiedAppId(app.id);
                                setTimeout(() => setCopiedAppId(null), 2000);
                              }}
                              className="py-1 px-2 rounded-md bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 font-medium flex items-center gap-1 transition-all cursor-pointer"
                              title="Copy follow-up note"
                            >
                              {copiedAppId === app.id ? (
                                <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                                  <CheckCircle className="w-2.5 h-2.5" /> Copied!
                                </span>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          )}

                          {/* Quick Mark Ghosted */}
                          <button
                            onClick={() => handleStatusChange(app.id, 'GHOSTED')}
                            className="py-1 px-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-medium transition-all cursor-pointer"
                            title="Mark as Ghosted"
                          >
                            Ghosted
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <span className="text-[11px]">JobSentry AI · 100% Private</span>
        <a
          href="https://job-sentry-i.vercel.app/applications"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-900 hover:text-blue-600 transition-colors"
        >
          Open Tracker Dashboard <ExternalLink className="w-3 h-3" />
        </a>
      </footer>
    </div>
  );
}
