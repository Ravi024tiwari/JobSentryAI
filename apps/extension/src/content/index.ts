import { extractCurrentJobData, type ExtractedJobData } from './parsers';

let overlayRoot: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;

// Inject CSS styles into Shadow DOM so host page styles never interfere
const INJECTED_CSS = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
  }

  .jobsentry-floating-btn {
    pointer-events: auto !important;
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: #0f172a;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 9999px;
    padding: 10px 18px;
    font-size: 13.5px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }
  .jobsentry-floating-btn:hover {
    transform: translateY(-2px);
    background: #1e293b;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
  }

  .jobsentry-badge-icon {
    width: 18px;
    height: 18px;
    color: #38bdf8;
  }

  /* Slide-out Drawer */
  .jobsentry-drawer {
    pointer-events: auto !important;
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 380px;
    max-width: calc(100vw - 32px);
    background: #ffffff;
    color: #0f172a;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.3);
    z-index: 2147483647;
    overflow: hidden;
    animation: jobsentryFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes jobsentryFadeIn {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .jobsentry-header {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .jobsentry-title {
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .jobsentry-close-btn {
    background: transparent;
    border: none;
    color: #64748b;
    font-size: 18px;
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    line-height: 1;
  }
  .jobsentry-close-btn:hover {
    color: #0f172a;
    background: #e2e8f0;
  }

  .jobsentry-body {
    padding: 16px 18px;
    max-height: 480px;
    overflow-y: auto;
  }

  .jobsentry-job-info {
    margin-bottom: 14px;
  }
  .jobsentry-job-title {
    font-size: 14.5px;
    font-weight: 700;
    color: #0f172a;
  }
  .jobsentry-company-name {
    font-size: 12.5px;
    color: #64748b;
    margin-top: 2px;
  }

  /* Verdict states */
  .jobsentry-verdict-card {
    border-radius: 14px;
    padding: 12px 14px;
    margin-bottom: 12px;
    border: 1px solid transparent;
  }
  .jobsentry-verdict-legit {
    background: #ecfdf5;
    border-color: #a7f3d0;
    color: #065f46;
  }
  .jobsentry-verdict-suspicious {
    background: #fffbeb;
    border-color: #fde68a;
    color: #92400e;
  }
  .jobsentry-verdict-fraud {
    background: #fff1f2;
    border-color: #fecdd3;
    color: #9f1239;
  }

  .jobsentry-verdict-title {
    font-size: 13.5px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .jobsentry-verdict-desc {
    font-size: 11.5px;
    margin-top: 4px;
    line-height: 1.4;
  }

  .jobsentry-score-pill {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 9999px;
    background: rgba(0, 0, 0, 0.06);
  }

  .jobsentry-signals-list {
    margin-top: 10px;
    font-size: 11.5px;
    line-height: 1.45;
  }
  .jobsentry-signals-list li {
    margin-bottom: 5px;
    list-style: none;
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }

  .jobsentry-verify-btn {
    width: 100%;
    height: 40px;
    border-radius: 9999px;
    background: #0f172a;
    color: #ffffff;
    font-size: 13px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.15s ease-in-out;
  }
  .jobsentry-verify-btn:hover {
    background: #1e293b;
  }
  .jobsentry-verify-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .jobsentry-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid #ffffff;
    border-top-color: transparent;
    border-radius: 50%;
    animation: jobsentrySpin 0.7s linear infinite;
  }

  @keyframes jobsentrySpin {
    to { transform: rotate(360deg); }
  }

  .jobsentry-footer-text {
    font-size: 10.5px;
    color: #94a3b8;
    text-align: center;
    margin-top: 10px;
  }
`;

function isJobContext(): boolean {
  const host = window.location.hostname.toLowerCase();
  const path = window.location.pathname.toLowerCase();

  // If on known job portals, ALWAYS show
  if (
    host.includes('glassdoor') ||
    host.includes('linkedin') ||
    host.includes('indeed') ||
    host.includes('naukri') ||
    host.includes('internshala') ||
    host.includes('unstop') ||
    host.includes('wellfound') ||
    host.includes('foundit') ||
    host.includes('monster') ||
    host.includes('greenhouse') ||
    host.includes('lever.co') ||
    host.includes('workday') ||
    host.includes('smartrecruiters') ||
    host.includes('localhost') ||
    host.includes('127.0.0.1')
  ) {
    return true;
  }

  // If URL path indicates job / career page
  if (
    path.includes('/job') ||
    path.includes('/career') ||
    path.includes('/vacancy') ||
    path.includes('/opening') ||
    path.includes('/internship')
  ) {
    return true;
  }

  // Schema.org JobPosting in document
  if (document.querySelector('script[type="application/ld+json"]')) {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      if (s.textContent?.includes('JobPosting')) return true;
    }
  }

  return false;
}

function initializeOverlay() {
  if (document.getElementById('jobsentry-extension-root')) return;
  if (!isJobContext()) return;

  const target = document.documentElement || document.body;
  if (!target) {
    setTimeout(initializeOverlay, 150);
    return;
  }

  overlayRoot = document.createElement('div');
  overlayRoot.id = 'jobsentry-extension-root';
  overlayRoot.style.position = 'fixed';
  overlayRoot.style.bottom = '0';
  overlayRoot.style.right = '0';
  overlayRoot.style.zIndex = '2147483647';
  overlayRoot.style.pointerEvents = 'none';

  shadowRoot = overlayRoot.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = INJECTED_CSS;
  shadowRoot.appendChild(styleEl);

  const container = document.createElement('div');
  container.id = 'jobsentry-container';
  shadowRoot.appendChild(container);

  target.appendChild(overlayRoot);

  renderFloatingButton();
  console.log('🛡️ [JobSentry AI] Floating badge injected successfully on:', window.location.hostname);
}

function renderFloatingButton() {
  if (!shadowRoot) return;
  const container = shadowRoot.querySelector('#jobsentry-container');
  if (!container) return;

  container.innerHTML = `
    <button class="jobsentry-floating-btn" id="jobsentry-launch-btn">
      <svg class="jobsentry-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      <span>Verify with JobSentry AI</span>
    </button>
  `;

  const btn = shadowRoot.querySelector('#jobsentry-launch-btn');
  btn?.addEventListener('click', handleOpenVerification);
}

async function handleOpenVerification() {
  if (!shadowRoot) return;
  const container = shadowRoot.querySelector('#jobsentry-container');
  if (!container) return;

  const job = extractCurrentJobData();

  if (!job) {
    renderManualJobInput();
    return;
  }

  handleVerifyJobPayload(job);
}

function renderManualJobInput() {
  if (!shadowRoot) return;
  const container = shadowRoot.querySelector('#jobsentry-container');
  if (!container) return;

  container.innerHTML = `
    <div class="jobsentry-drawer">
      <div class="jobsentry-header">
        <div class="jobsentry-title">
          <svg style="width:16px; height:16px; color:#2563eb;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span>Verify Job or Recruiter Post</span>
        </div>
        <button class="jobsentry-close-btn" id="jobsentry-close">✕</button>
      </div>
      <div class="jobsentry-body">
        <p style="font-size:12px; color:#475569; margin-bottom:10px; line-height:1.45;">
          Select any text on the page with your mouse, or paste the recruiter's message / job post below:
        </p>

        <textarea id="jobsentry-manual-input" placeholder="e.g. Position: DevOps Engineer, Company: VBR Consultancy, Salary: 13 LPA..." style="width:100%; height:110px; border:1px solid #cbd5e1; border-radius:10px; padding:10px; font-size:12px; font-family:inherit; resize:none; margin-bottom:12px; outline:none; box-sizing:border-box;"></textarea>

        <button class="jobsentry-verify-btn" id="jobsentry-manual-run-btn">
          <span>Run AI Authenticity Scan</span>
        </button>

        <div class="jobsentry-footer-text">
          💡 Tip: You can also highlight any text on the page and click Verify!
        </div>
      </div>
    </div>
  `;

  shadowRoot.querySelector('#jobsentry-close')?.addEventListener('click', renderFloatingButton);
  shadowRoot.querySelector('#jobsentry-manual-run-btn')?.addEventListener('click', () => {
    const textarea = shadowRoot?.querySelector('#jobsentry-manual-input') as HTMLTextAreaElement | null;
    const rawText = textarea?.value.trim();
    if (!rawText || rawText.length < 20) {
      alert('Please enter at least 20 characters of the job or recruiter message.');
      return;
    }

    const firstLine = rawText.split('\n')[0].slice(0, 50);
    handleVerifyJobPayload({
      companyName: 'Recruiter Post',
      jobTitle: firstLine || 'Hiring Opening',
      description: rawText,
      jobUrl: window.location.href,
      platform: 'GENERIC',
    });
  });
}

async function handleVerifyJobPayload(job: ExtractedJobData) {
  if (!shadowRoot) return;
  const container = shadowRoot.querySelector('#jobsentry-container');
  if (!container) return;

  // Render dynamic loading state drawer with animated multi-phase investigation
  container.innerHTML = `
    <div class="jobsentry-drawer">
      <div class="jobsentry-header">
        <div class="jobsentry-title">
          <svg style="width:16px; height:16px; color:#2563eb;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span>JobSentry AI Radar</span>
        </div>
        <button class="jobsentry-close-btn" id="jobsentry-close">✕</button>
      </div>
      <div class="jobsentry-body">
        <div class="jobsentry-job-info">
          <div class="jobsentry-job-title">${escapeHtml(job.jobTitle)}</div>
          <div class="jobsentry-company-name">${escapeHtml(job.companyName)} · Detected on ${job.platform}</div>
        </div>

        <div style="padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; margin-bottom: 12px;">
          <div class="jobsentry-spinner" style="margin: 0 auto 10px; border-color: #2563eb; border-top-color: transparent;"></div>
          <div id="jobsentry-scan-title" style="font-size: 12px; font-weight: 700; color: #0f172a; transition: all 0.3s ease;">
            🔍 [1/3] Extracting listing signals & corporate entity...
          </div>
          <div id="jobsentry-scan-desc" style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.4;">
            Parsing job specifications, required tech stack & employer profile
          </div>

          <div style="margin-top: 12px; height: 5px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;">
            <div id="jobsentry-scan-bar" style="height: 100%; width: 25%; background: linear-gradient(90deg, #2563eb, #38bdf8); transition: width 0.8s ease; border-radius: 9999px;"></div>
          </div>
          <div id="jobsentry-scan-timer" style="font-size: 10px; color: #94a3b8; margin-top: 6px; font-family: monospace;">
            AI Deep Research: 0s elapsed
          </div>
        </div>

        <div class="jobsentry-footer-text">
          🔒 Zero server scraping · 100% ephemeral check
        </div>
      </div>
    </div>
  `;

  let elapsedSec = 0;
  const timerEl = shadowRoot.querySelector('#jobsentry-scan-timer');
  const titleEl = shadowRoot.querySelector('#jobsentry-scan-title');
  const descEl = shadowRoot.querySelector('#jobsentry-scan-desc');
  const barEl = shadowRoot.querySelector('#jobsentry-scan-bar') as HTMLElement | null;

  const interval = setInterval(() => {
    elapsedSec += 1;
    if (timerEl) timerEl.textContent = `AI Deep Research: ${elapsedSec}s elapsed`;

    if (elapsedSec >= 3 && elapsedSec < 9) {
      if (titleEl) titleEl.textContent = '🌐 [2/3] Querying ATS registries & live postings (Tavily)...';
      if (descEl) descEl.textContent = 'Cross-referencing corporate career portals, LinkedIn & official domain';
      if (barEl) barEl.style.width = '55%';
    } else if (elapsedSec >= 9 && elapsedSec < 15) {
      if (titleEl) titleEl.textContent = '🤖 [3/3] AI Agent reasoning & fraud heuristic scan (Gemini)...';
      if (descEl) descEl.textContent = 'Evaluating scam flags, payment requests & recruitment legitimacy';
      if (barEl) barEl.style.width = '82%';
    } else if (elapsedSec >= 15) {
      if (titleEl) titleEl.textContent = '⚖️ Synthesizing evidence & finalizing authenticity case...';
      if (descEl) descEl.textContent = 'Compiling trust anchors and generating final verdict';
      if (barEl) barEl.style.width = '96%';
    }
  }, 1000);

  shadowRoot.querySelector('#jobsentry-close')?.addEventListener('click', () => {
    clearInterval(interval);
    renderFloatingButton();
  });

  try {
    // Send to background worker
    const response: any = await chrome.runtime.sendMessage({
      action: 'VERIFY_JOB',
      payload: job,
    });

    clearInterval(interval);

    if (!response || !response.success) {
      throw new Error(response?.error || 'Verification failed');
    }

    renderVerdictResult(job, response.data);
  } catch (err: any) {
    clearInterval(interval);
    renderError(job, err.message || 'Verification could not be completed.');
  }
}

async function renderVerdictResult(job: ExtractedJobData, data: any) {
  if (!shadowRoot) return;
  const container = shadowRoot.querySelector('#jobsentry-container');
  if (!container) return;

  const analysis = data.analysis;
  const isLegit = analysis.verdict === 'LIKELY_LEGITIMATE';
  const isSuspicious = analysis.verdict === 'SUSPICIOUS';

  const cardClass = isLegit
    ? 'jobsentry-verdict-legit'
    : isSuspicious
    ? 'jobsentry-verdict-suspicious'
    : 'jobsentry-verdict-fraud';

  const verdictLabel = isLegit
    ? 'Likely Legitimate Opening'
    : isSuspicious
    ? 'Caution: Suspicious Inconsistencies'
    : 'Critical Scam Alert';

  // Check if this job is already tracked
  let isAlreadyTracked = false;
  let trackedStatus = 'APPLIED';
  let isLoggedIn = false;
  let loggedInUserName = '';

  try {
    const authStored = await chrome.storage.local.get(['userId', 'userName']);
    if (authStored.userId) {
      isLoggedIn = true;
      loggedInUserName = authStored.userName || '';
    }

    if (isLoggedIn) {
      const checkRes: any = await chrome.runtime.sendMessage({
        action: 'CHECK_APPLICATION',
        payload: { jobUrl: job.jobUrl, companyName: job.companyName, jobTitle: job.jobTitle },
      });
      if (checkRes?.applied) {
        isAlreadyTracked = true;
        trackedStatus = checkRes.data?.currentStatus || 'APPLIED';
      }
    }
  } catch {}

  container.innerHTML = `
    <div class="jobsentry-drawer">
      <div class="jobsentry-header">
        <div class="jobsentry-title">
          <svg style="width:16px; height:16px; color:#2563eb;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span>Investigation Case #${data.job.id.slice(0, 6)}</span>
        </div>
        <button class="jobsentry-close-btn" id="jobsentry-close">✕</button>
      </div>
      <div class="jobsentry-body">
        <div class="jobsentry-job-info">
          <div class="jobsentry-job-title">${escapeHtml(job.jobTitle)}</div>
          <div class="jobsentry-company-name">${escapeHtml(job.companyName)}</div>
        </div>

        <div class="jobsentry-verdict-card ${cardClass}">
          <div class="jobsentry-verdict-title">
            <span>${verdictLabel}</span>
            <span class="jobsentry-score-pill">Risk: ${analysis.riskScore}/100</span>
          </div>
          <div class="jobsentry-verdict-desc">
            ${escapeHtml(analysis.evidenceSummary)}
          </div>
        </div>

        ${
          analysis.negativeSignals.length > 0
            ? `
          <div style="margin-bottom: 12px;">
            <div style="font-size: 11.5px; font-weight: 700; color: #9f1239; margin-bottom: 4px;">Scam Signs Pointed Out:</div>
            <ul class="jobsentry-signals-list">
              ${analysis.negativeSignals.map((s: string) => `<li><span style="color:#e11d48; font-weight:bold;">•</span> <span>${escapeHtml(s)}</span></li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }

        ${
          analysis.positiveSignals.length > 0
            ? `
          <div style="margin-bottom: 12px;">
            <div style="font-size: 11.5px; font-weight: 700; color: #065f46; margin-bottom: 4px;">Verified Trust Anchors:</div>
            <ul class="jobsentry-signals-list">
              ${analysis.positiveSignals.map((s: string) => `<li><span style="color:#10b981; font-weight:bold;">✓</span> <span>${escapeHtml(s)}</span></li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }

        <!-- Application Tracker Section -->
        <div style="margin-top: 12px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 12px; font-weight: 700; color: #0f172a;">Application Tracker</span>
            <span id="jobsentry-track-status-pill">
              ${
                !isLoggedIn
                  ? `<span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 9999px; background: #fef3c7; color: #92400e;">🔒 Login Required</span>`
                  : isAlreadyTracked
                  ? `<span style="font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; background: #dbeafe; color: #1e40af;">📌 Tracked: ${trackedStatus}</span>`
                  : `<span style="font-size: 10.5px; color: #475569;">👤 ${escapeHtml(loggedInUserName || 'Signed In')}</span>`
              }
            </span>
          </div>

          <div id="jobsentry-track-action-box">
            ${
              !isLoggedIn
                ? `
              <button id="jobsentry-auth-btn" style="width: 100%; height: 34px; border-radius: 8px; background: #0f172a; color: #ffffff; font-size: 11.5px; font-weight: 600; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                <span>🔒 Sign In to Track Applications ↗</span>
              </button>
            `
                : !isAlreadyTracked
                ? `
              <button id="jobsentry-track-btn" style="width: 100%; height: 34px; border-radius: 8px; background: #2563eb; color: #ffffff; font-size: 12px; font-weight: 600; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                <span>📝 Mark as Applied & Track</span>
              </button>
            `
                : `
              <a href="https://job-sentry-i.vercel.app/applications" target="_blank" style="display: block; text-align: center; font-size: 11.5px; font-weight: 600; color: #2563eb; text-decoration: none; padding: 6px; border: 1px dashed #bfdbfe; border-radius: 8px; background: #eff6ff;">
                View in My Applications Dashboard ↗
              </a>
            `
            }
          </div>
        </div>

        <button class="jobsentry-verify-btn" id="jobsentry-open-web-btn" style="margin-top: 10px;">
          Open Applications Dashboard ↗
        </button>

        <div class="jobsentry-footer-text">
          JobSentry AI · Authenticity & Application Tracker
        </div>
      </div>
    </div>
  `;

  shadowRoot.querySelector('#jobsentry-close')?.addEventListener('click', renderFloatingButton);
  shadowRoot.querySelector('#jobsentry-open-web-btn')?.addEventListener('click', () => {
    window.open('https://job-sentry-i.vercel.app/applications', '_blank');
  });

  shadowRoot.querySelector('#jobsentry-auth-btn')?.addEventListener('click', () => {
    window.open('https://job-sentry-i.vercel.app/login?redirect=/applications', '_blank');
  });

  const trackBtn = shadowRoot.querySelector('#jobsentry-track-btn');
  const statusPill = shadowRoot.querySelector('#jobsentry-track-status-pill');
  const actionBox = shadowRoot.querySelector('#jobsentry-track-action-box');

  trackBtn?.addEventListener('click', async () => {
    trackBtn.setAttribute('disabled', 'true');
    trackBtn.textContent = 'Saving to Tracker...';
    try {
      const res: any = await chrome.runtime.sendMessage({
        action: 'TRACK_APPLICATION',
        payload: {
          jobTitle: job.jobTitle,
          companyName: job.companyName,
          jobUrl: job.jobUrl,
          platform: job.platform,
          salary: job.salary,
          notes: job.description || null,
        },
      });

      if (!res?.success) {
        throw new Error(res?.error || 'Tracking failed');
      }

      if (statusPill) {
        statusPill.innerHTML = `<span style="font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; background: #dbeafe; color: #1e40af;">📌 Tracked: APPLIED</span>`;
      }
      if (actionBox) {
        actionBox.innerHTML = `
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 8px; text-align: center;">
            <div style="font-size: 12px; font-weight: 700; color: #065f46; margin-bottom: 3px;">
              ✅ Successfully Tracked in Your Account!
            </div>
            <a href="https://job-sentry-i.vercel.app/applications" target="_blank" style="display: inline-block; font-size: 11px; font-weight: 600; color: #2563eb; text-decoration: underline;">
              View in Web Dashboard ↗
            </a>
          </div>
        `;
      }
    } catch (err: any) {
      trackBtn.removeAttribute('disabled');
      if (err?.message?.includes('AUTH_REQUIRED')) {
        trackBtn.textContent = 'Sign In Required ↗';
        window.open('https://job-sentry-i.vercel.app/login?redirect=/applications', '_blank');
      } else {
        trackBtn.textContent = 'Failed to save. Try again';
      }
    }
  });
}

function renderError(job: ExtractedJobData, errorMsg: string) {
  if (!shadowRoot) return;
  const container = shadowRoot.querySelector('#jobsentry-container');
  if (!container) return;

  container.innerHTML = `
    <div class="jobsentry-drawer">
      <div class="jobsentry-header">
        <div class="jobsentry-title" style="color: #e11d48;">
          <span>Verification Notice</span>
        </div>
        <button class="jobsentry-close-btn" id="jobsentry-close">✕</button>
      </div>
      <div class="jobsentry-body">
        <div class="jobsentry-job-info">
          <div class="jobsentry-job-title">${escapeHtml(job.jobTitle)}</div>
          <div class="jobsentry-company-name">${escapeHtml(job.companyName)}</div>
        </div>
        <div style="padding: 12px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; color: #9f1239; font-size: 12px; line-height: 1.45;">
          ${escapeHtml(errorMsg)}
        </div>
        <button class="jobsentry-verify-btn" id="jobsentry-retry-btn" style="margin-top: 14px;">
          Retry Scan
        </button>
      </div>
    </div>
  `;

  shadowRoot.querySelector('#jobsentry-close')?.addEventListener('click', renderFloatingButton);
  shadowRoot.querySelector('#jobsentry-retry-btn')?.addEventListener('click', handleOpenVerification);
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Auto-sync logged-in user session from Web Dashboard into extension storage
if (
  window.location.origin.includes('localhost:3000') ||
  window.location.origin.includes('127.0.0.1:3000') ||
  window.location.origin.includes('job-sentry-i.vercel.app') ||
  window.location.origin.includes('vercel.app')
) {
  const syncUserSession = () => {
    try {
      const raw = localStorage.getItem('jobsentry_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.id) {
          chrome.storage.local.set({ userId: parsed.id, userName: parsed.name, userEmail: parsed.email });
          return;
        }
      }
      // If logged out on web, clear extension auth storage
      chrome.storage.local.remove(['userId', 'userName', 'userEmail']);
    } catch {}
  };

  syncUserSession();
  window.addEventListener('storage', syncUserSession);
  setInterval(syncUserSession, 1500);
}

// Listen for messages from toolbar popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'EXTRACT_ACTIVE_JOB') {
    const job = extractCurrentJobData();
    sendResponse(job);
    return true;
  }
});

// Initialize on page load and on dynamic URL changes in SPAs
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeOverlay();
    setupAutoApplyListener();
  });
} else {
  initializeOverlay();
  setupAutoApplyListener();
}

function showFloatingToast(message: string, isAuthPrompt: boolean = false) {
  if (!shadowRoot) {
    initializeOverlay();
  }
  if (!shadowRoot) return;

  const existing = shadowRoot.querySelector('#jobsentry-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'jobsentry-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 24px;
    z-index: 2147483647;
    background: #0f172a;
    color: #ffffff;
    padding: 12px 16px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    font-weight: 500;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 380px;
    animation: jobsentryFadeIn 0.2s ease-out;
    pointer-events: auto;
  `;

  toast.innerHTML = `
    <span style="flex: 1; line-height: 1.4;">${escapeHtml(message)}</span>
    ${
      isAuthPrompt
        ? '<a href="https://job-sentry-i.vercel.app/login?redirect=/applications" target="_blank" style="padding: 4px 8px; border-radius: 6px; background: #2563eb; color: #fff; text-decoration: none; font-size: 11px; font-weight: 700; white-space: nowrap;">Sign In ↗</a>'
        : '<a href="https://job-sentry-i.vercel.app/applications" target="_blank" style="padding: 4px 8px; border-radius: 6px; background: #334155; color: #fff; text-decoration: none; font-size: 11px; font-weight: 600; white-space: nowrap;">View ↗</a>'
    }
    <button id="jobsentry-toast-close" style="background: none; border: none; color: #94a3b8; font-size: 14px; cursor: pointer; padding: 2px;">✕</button>
  `;

  shadowRoot.appendChild(toast);

  toast.querySelector('#jobsentry-toast-close')?.addEventListener('click', () => toast.remove());
  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 7000);
}

function extractJobFromButtonContext(button: HTMLElement): ExtractedJobData | null {
  try {
    // 1. Is button inside a specific list card?
    const card = button.closest(
      'li[data-test="jobListing"], div[class*="jobCard"], [data-test="jobCard"], li[class*="JobsList_jobListItem"]'
    );
    if (card) {
      const titleEl = card.querySelector(
        '[data-test="job-title"], [class*="JobTitle"], h2, a[data-test="job-link"], strong'
      );
      const compEl = card.querySelector(
        '[data-test="employer-name"], [class*="EmployerName"], [class*="company"], span[class*="employer"]'
      );
      const salaryEl = card.querySelector('[data-test="detailSalary"], [class*="salary"]');
      const linkEl = card.querySelector('a[href*="/job-listing/"], a[href*="/jobs/"]') as HTMLAnchorElement | null;

      const jobTitle = titleEl?.textContent?.replace(/\s+/g, ' ').trim();
      const companyName = compEl?.textContent?.replace(/\s+/g, ' ').trim();
      if (jobTitle && companyName) {
        return {
          jobTitle,
          companyName,
          salary: salaryEl?.textContent?.replace(/\s+/g, ' ').trim() || undefined,
          jobUrl: linkEl?.href || window.location.href,
          description: '',
          platform: 'GLASSDOOR',
        };
      }
    }

    // 2. Is button inside the main detail pane?
    const detailPane = button.closest(
      'article, section, [class*="JobDetails"], [class*="JobView"], div[class*="jobDetailsContainer"], [data-test="job-details"], main'
    );
    if (detailPane) {
      const titleEl = detailPane.querySelector(
        'h1, [data-test="job-title"], [class*="JobTitle"], h2[class*="heading"]'
      );
      const compEl = detailPane.querySelector(
        '[data-test="employer-name"], [class*="EmployerName"], [class*="profileContainer"], div[class*="employer"], h4'
      );
      const descEl = detailPane.querySelector(
        '[data-test="jobDescriptionText"], [class*="JobDetails_jobDescription"], [class*="desc"]'
      );
      const salaryEl = detailPane.querySelector(
        '[data-test="detailSalary"], [class*="SalaryEstimate"]'
      );

      const jobTitle = titleEl?.textContent?.replace(/\s+/g, ' ').trim();
      const companyName = compEl?.textContent?.replace(/\s+/g, ' ').trim();
      if (jobTitle && companyName) {
        return {
          jobTitle,
          companyName,
          salary: salaryEl?.textContent?.replace(/\s+/g, ' ').trim() || undefined,
          jobUrl: window.location.href,
          description: descEl?.textContent?.replace(/\s+/g, ' ').trim() || '',
          platform: 'GLASSDOOR',
        };
      }
    }
  } catch {}
  return null;
}

function setupAutoApplyListener() {
  document.addEventListener(
    'click',
    async (e) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const applyButton = target.closest(
        'button, a, input[type="submit"], input[type="button"], [role="button"]'
      ) as HTMLElement | null;
      if (!applyButton) return;

      if (
        applyButton.id?.startsWith('jobsentry') ||
        applyButton.closest('#jobsentry-extension-root')
      ) {
        return;
      }

      const text = (
        applyButton.innerText ||
        applyButton.textContent ||
        (applyButton as HTMLInputElement).value ||
        ''
      )
        .toLowerCase()
        .trim();
      const ariaLabel = (applyButton.getAttribute('aria-label') || '').toLowerCase();
      const className = (applyButton.className || '').toString().toLowerCase();
      const dataTest = (
        applyButton.getAttribute('data-test') ||
        applyButton.getAttribute('data-testid') ||
        ''
      ).toLowerCase();
      const buttonId = (applyButton.getAttribute('id') || '').toLowerCase();

      const isApplyAction =
        text.includes('apply') ||
        text.includes('submit') ||
        ariaLabel.includes('apply') ||
        className.includes('apply') ||
        dataTest.includes('apply') ||
        buttonId.includes('apply');

      if (!isApplyAction) return;

      // Extract context immediately from the clicked button
      const contextualJob = extractJobFromButtonContext(applyButton);

      setTimeout(async () => {
        const job = contextualJob || extractCurrentJobData();
        if (!job || !job.jobTitle || !job.companyName) return;

        try {
          const res: any = await chrome.runtime.sendMessage({
            action: 'TRACK_APPLICATION',
            payload: {
              jobTitle: job.jobTitle,
              companyName: job.companyName,
              jobUrl: job.jobUrl,
              platform: job.platform,
              salary: job.salary,
              notes: job.description || null,
            },
          });

          if (res?.success) {
            showFloatingToast(
              `🎉 Detected Job Application: Automatically saved "${job.jobTitle}" at ${job.companyName} to your Tracker!`
            );
          } else if (res?.error?.includes('AUTH_REQUIRED')) {
            showFloatingToast(
              `🔒 Detected application for "${job.jobTitle}" at ${job.companyName}! Sign in to save & track it.`,
              true
            );
          }
        } catch (err) {
          console.warn('Auto-apply tracking error:', err);
        }
      }, 500);
    },
    true
  );
}

// Ensure the button persists across single-page app (SPA) client-side routing
setInterval(() => {
  if (!document.getElementById('jobsentry-extension-root')) {
    overlayRoot = null;
    shadowRoot = null;
    initializeOverlay();
  }
}, 1500);

// Production-grade SPA URL & Job Switch Observer
let lastObservedUrl = window.location.href;

function handleSpaNavigation() {
  if (window.location.href !== lastObservedUrl) {
    lastObservedUrl = window.location.href;
    console.log('🛡️ [JobSentry AI] Active job navigation detected:', lastObservedUrl);

    // If drawer is open showing an older job, return to floating button for the newly selected job
    const drawer = shadowRoot?.querySelector('.jobsentry-drawer');
    if (drawer) {
      renderFloatingButton();
    }
  }
}

try {
  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    setTimeout(handleSpaNavigation, 150);
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    setTimeout(handleSpaNavigation, 150);
  };

  window.addEventListener('popstate', handleSpaNavigation);
  setInterval(handleSpaNavigation, 1000);
} catch {}
