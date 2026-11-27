'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Search,
  ExternalLink,
  Clock,
  AlertTriangle,
  Copy,
  CheckCircle,
  Plus,
  Trash2,
  RefreshCw,
  Building,
  MapPin,
  DollarSign,
  ChevronRight,
  Send,
  MessageSquare,
  Sparkles,
  Mail,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

interface ApplicationItem {
  id: string;
  userId: string;
  jobTitle: string;
  companyName: string;
  jobUrl: string | null;
  platform: string;
  salary: string | null;
  location: string | null;
  currentStatus: 'APPLIED' | 'REPLIED' | 'INTERVIEWING' | 'OFFER' | 'REJECTED' | 'GHOSTED';
  appliedAt: string;
  notes: string | null;
  daysSinceApplied: number;
  isGhostedRecommended: boolean;
  reapproachTemplate: string | null;
}

interface ApplicationStats {
  totalApplied: number;
  awaitingReply: number;
  repliedCount: number;
  interviewingCount: number;
  offersCount: number;
  rejectedCount: number;
  ghostedCount: number;
  staleGhostedWarningCount: number;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  APPLIED: {
    label: 'Applied',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  REPLIED: {
    label: 'Recruiter Replied',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  INTERVIEWING: {
    label: 'Interviewing',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
  },
  OFFER: {
    label: 'Offer Received',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    dot: 'bg-emerald-500',
  },
  REJECTED: {
    label: 'Rejected',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-300',
    dot: 'bg-slate-400',
  },
  GHOSTED: {
    label: 'Ghosted / No Reply',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
};

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for manual add
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (user?.id) headers['x-user-id'] = user.id;

      const res = await fetch('/api/v1/applications', {
        headers,
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setApplications(data.data || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.id) headers['x-user-id'] = user.id;

      const res = await fetch(`/api/v1/applications/${id}/status`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh local state smoothly
        setApplications((prev) =>
          prev.map((app) => (app.id === id ? { ...app, currentStatus: newStatus as any, isGhostedRecommended: false } : app))
        );
        fetchApplications();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this tracked application?')) return;
    try {
      const headers: Record<string, string> = {};
      if (user?.id) headers['x-user-id'] = user.id;

      await fetch(`/api/v1/applications/${id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });
      setApplications((prev) => prev.filter((a) => a.id !== id));
      fetchApplications();
    } catch (err) {
      console.error('Error deleting application:', err);
    }
  };

  const handleCopyTemplate = (id: string, template: string) => {
    navigator.clipboard.writeText(template);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCompany.trim()) return;

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.id) headers['x-user-id'] = user.id;

      const res = await fetch('/api/v1/applications', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          jobTitle: newTitle.trim(),
          companyName: newCompany.trim(),
          jobUrl: newUrl.trim() || undefined,
          salary: newSalary.trim() || undefined,
          location: newLocation.trim() || undefined,
          platform: 'MANUAL',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewTitle('');
        setNewCompany('');
        setNewUrl('');
        setNewSalary('');
        setNewLocation('');
        fetchApplications();
      }
    } catch (err) {
      console.error('Error adding application:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter & Search logic
  const filteredApplications = applications.filter((app) => {
    const matchesFilter =
      selectedFilter === 'ALL'
        ? true
        : selectedFilter === 'STALE_WARNING'
        ? app.isGhostedRecommended
        : app.currentStatus === selectedFilter;

    const matchesSearch =
      app.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Unauthenticated user state: Strictly guide user to sign in
  if (!loading && !user) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-16 bg-slate-50/50">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 p-8 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100 shadow-2xs">
            <Briefcase className="w-7 h-7" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold mb-2">
              <span>🔒 Authentication Required</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Sign in to Access Your Tracker
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Job applications are saved securely and isolated to your verified account. Sign in to track your applied jobs, update interview stages, and receive 14-day ghosted alerts.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <Link
              href="/login?redirect=/applications"
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              Sign In
            </Link>
            <Link
              href="/register?redirect=/applications"
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              Create Account
            </Link>
          </div>

          <p className="text-[11px] text-slate-400">
            Once signed in, any job you track from the JobSentry Chrome Extension will automatically sync directly here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Top Header */}
      <div className="border-b border-slate-200/80 bg-white">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                <Briefcase className="h-3.5 w-3.5" />
                <span>Job Application Tracker</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                My Applications
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Track every job you applied for, monitor recruiter replies, and get smart 14-day ghosted follow-up reminders.
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all shadow-sm active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Add Applied Job</span>
            </button>
          </div>

          {/* Metric Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-xs">
                <div className="text-xs font-medium text-slate-500">Total Applied</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{stats.totalApplied}</div>
              </div>

              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 shadow-xs">
                <div className="text-xs font-medium text-blue-700">Awaiting Reply</div>
                <div className="text-2xl font-extrabold text-blue-900 mt-0.5">{stats.awaitingReply}</div>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 shadow-xs">
                <div className="text-xs font-medium text-amber-800">Interviews</div>
                <div className="text-2xl font-extrabold text-amber-900 mt-0.5">{stats.interviewingCount}</div>
              </div>

              <div
                onClick={() => setSelectedFilter(stats.staleGhostedWarningCount > 0 ? 'STALE_WARNING' : 'ALL')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                  stats.staleGhostedWarningCount > 0
                    ? 'border-rose-300 bg-rose-50/70 hover:bg-rose-100/70'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-medium text-rose-700">
                  <span>Ghosted Alerts (14d+)</span>
                  {stats.staleGhostedWarningCount > 0 && (
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  )}
                </div>
                <div className="text-2xl font-extrabold text-rose-900 mt-0.5">
                  {stats.staleGhostedWarningCount}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
            {[
              { id: 'ALL', label: 'All Jobs' },
              { id: 'APPLIED', label: 'Applied' },
              { id: 'REPLIED', label: 'Replied' },
              { id: 'INTERVIEWING', label: 'Interviewing' },
              { id: 'OFFER', label: 'Offers' },
              { id: 'GHOSTED', label: 'Ghosted' },
              { id: 'REJECTED', label: 'Rejected' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                className={`px-3 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  selectedFilter === f.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search company or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-full border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mb-2 text-blue-500" />
            <span className="text-xs">Loading your job applications...</span>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Briefcase className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No applications found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              {searchQuery
                ? 'Try tweaking your search keywords.'
                : 'Jobs you apply for via our Chrome Extension will automatically appear here, or you can add one manually.'}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Track an Application</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredApplications.map((app) => {
              const status = STATUS_CONFIG[app.currentStatus] || STATUS_CONFIG.APPLIED;

              return (
                <div
                  key={app.id}
                  className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 shadow-xs hover:shadow-sm ${
                    app.isGhostedRecommended
                      ? 'border-rose-300 ring-1 ring-rose-300/40'
                      : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Job Details Header */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                          {app.platform}
                        </span>

                        <span className="text-[11.5px] text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Applied {app.daysSinceApplied === 0 ? 'today' : `${app.daysSinceApplied}d ago`}
                        </span>

                        {app.isGhostedRecommended && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                            <AlertTriangle className="h-3 w-3 text-rose-600" />
                            14+ Days No Reply · Likely Ghosted
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900 truncate">
                          {app.jobTitle}
                        </h2>
                        {app.jobUrl && (
                          <a
                            href={app.jobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-blue-600 transition-colors"
                            title="View original job post"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600 flex-wrap">
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          {app.companyName}
                        </span>

                        {app.location && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {app.location}
                          </span>
                        )}

                        {app.salary && (
                          <span className="flex items-center gap-1 text-emerald-700 font-medium">
                            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                            {app.salary}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Changer & Quick Actions */}
                    <div className="flex items-center gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      {/* Status Dropdown */}
                      <select
                        value={app.currentStatus}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        className={`text-xs font-bold rounded-xl px-3 py-2 border cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${status.bg} ${status.text} ${status.border}`}
                      >
                        <option value="APPLIED">Applied (Waiting)</option>
                        <option value="REPLIED">Recruiter Replied</option>
                        <option value="INTERVIEWING">Interview Scheduled</option>
                        <option value="OFFER">Offer Received 🎉</option>
                        <option value="GHOSTED">Ghosted / No Response</option>
                        <option value="REJECTED">Rejected</option>
                      </select>

                      {/* Delete Action */}
                      <button
                        onClick={() => handleDelete(app.id)}
                        title="Delete application"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Saved Job Description / Notes */}
                  {app.notes && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-600">
                      <div className="font-semibold text-slate-700 mb-0.5 flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3 text-blue-500" />
                        <span>Job Description & Requirements:</span>
                      </div>
                      <p className="line-clamp-3 text-slate-500 leading-relaxed font-normal whitespace-pre-line bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 mt-1">
                        {app.notes}
                      </p>
                    </div>
                  )}

                  {/* 2-Week Ghosted Re-approach Box */}
                  {app.isGhostedRecommended && app.reapproachTemplate && (
                    <div className="mt-3.5 pt-3 border-t border-rose-200/80 bg-rose-50/60 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="text-xs text-rose-950 leading-snug">
                          <span className="font-extrabold text-rose-700 inline-flex items-center gap-1 mr-1">
                            <AlertTriangle className="h-3.5 w-3.5 inline text-rose-600" />
                            14-Day Alert:
                          </span>
                          It’s been <strong>{app.daysSinceApplied} days</strong> without a reply. Approach the hiring team or update your application status!
                        </div>

                        {/* Quick action buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                          {/* 1-Click Open in Gmail */}
                          <a
                            href={`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(
                              `Following up on application: ${app.jobTitle} - ${app.companyName}`
                            )}&body=${encodeURIComponent(app.reapproachTemplate)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shadow-2xs transition-all cursor-pointer"
                            title="Open pre-filled follow-up email in Gmail"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            <span>Open in Gmail ↗</span>
                          </a>

                          {/* Copy Note Button */}
                          <button
                            onClick={() => handleCopyTemplate(app.id, app.reapproachTemplate!)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-[11px] font-bold shadow-2xs transition-all cursor-pointer"
                            title="Copy follow-up note to clipboard"
                          >
                            {copiedId === app.id ? (
                              <>
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Copied Note!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy Note</span>
                              </>
                            )}
                          </button>

                          {/* Candidate moved forward to Interview */}
                          <button
                            onClick={() => handleStatusChange(app.id, 'INTERVIEWING')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition-all cursor-pointer"
                            title="Recruiter replied or invited you to an interview!"
                          >
                            <span>Got Interview! 🎉</span>
                          </button>

                          {/* Mark Ghosted */}
                          <button
                            onClick={() => handleStatusChange(app.id, 'GHOSTED')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Mark this job as ghosted"
                          >
                            Mark Ghosted
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Add Application Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                Track New Application
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SDE-1 / DevOps Engineer"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google / Swiggy / VBR Consultancy"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Job URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/jobs/view/..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru / Remote"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Salary / CTC</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹12-15 LPA"
                    value={newSalary}
                    onChange={(e) => setNewSalary(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : 'Track Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
