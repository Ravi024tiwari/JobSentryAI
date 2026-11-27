import type { ExtractedJobData } from '../content/parsers';

const DEFAULT_API_URL = 'https://jobsentryai-1.onrender.com/api/v1';

// Service Worker for JobSentry AI Extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('[JobSentry AI] Extension installed successfully.');
  updateToolbarBadge();
  setupPeriodicAlarms();
});

chrome.runtime.onStartup.addListener(() => {
  updateToolbarBadge();
  setupPeriodicAlarms();
});

function setupPeriodicAlarms() {
  try {
    chrome.alarms.create('SYNC_APPLICATIONS_BADGE', { periodInMinutes: 2 });
  } catch (err) {
    console.warn('[JobSentry AI] Alarm initialization error:', err);
  }
}

if (chrome.alarms?.onAlarm) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'SYNC_APPLICATIONS_BADGE') {
      updateToolbarBadge();
    }
  });
}

// Message listener for verification and application tracking requests
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'VERIFY_JOB') {
    handleVerifyJob(request.payload)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) =>
        sendResponse({ success: false, error: err.message || 'Verification failed' })
      );
    return true;
  }

  if (request.action === 'TRACK_APPLICATION') {
    handleTrackApplication(request.payload)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) =>
        sendResponse({ success: false, error: err.message || 'Failed to track application' })
      );
    return true;
  }

  if (request.action === 'CHECK_APPLICATION') {
    handleCheckApplication(request.payload)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) =>
        sendResponse({ success: false, error: err.message || 'Check failed' })
      );
    return true;
  }

  if (request.action === 'GET_APPLICATIONS') {
    handleGetApplications()
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) =>
        sendResponse({ success: false, error: err.message || 'Failed to fetch applications' })
      );
    return true;
  }

  if (request.action === 'UPDATE_APPLICATION_STATUS') {
    handleUpdateStatus(request.payload.id, request.payload.status)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) =>
        sendResponse({ success: false, error: err.message || 'Failed to update status' })
      );
    return true;
  }

  if (request.action === 'GET_LAST_VERIFIED') {
    chrome.storage.local.get(['lastVerifiedJob'], (result) => {
      sendResponse(result.lastVerifiedJob || null);
    });
    return true;
  }

  if (request.action === 'REFRESH_BADGE') {
    updateToolbarBadge()
      .then((count) => sendResponse({ success: true, count }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function getApiUrl(): Promise<string> {
  const config = await chrome.storage.local.get(['apiUrl']);
  return config.apiUrl || DEFAULT_API_URL;
}

async function getAuthTokenFromCookies(): Promise<string | null> {
  try {
    const cookie =
      (await chrome.cookies.get({ url: 'https://job-sentry-i.vercel.app', name: 'token' })) ||
      (await chrome.cookies.get({ url: 'https://jobsentryai-1.onrender.com', name: 'token' })) ||
      (await chrome.cookies.get({ url: 'http://localhost:3000', name: 'token' })) ||
      (await chrome.cookies.get({ url: 'http://localhost:5000', name: 'token' })) ||
      (await chrome.cookies.get({ url: 'http://127.0.0.1:3000', name: 'token' })) ||
      (await chrome.cookies.get({ url: 'http://127.0.0.1:5000', name: 'token' }));
    return cookie?.value || null;
  } catch (err) {
    return null;
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  let stored = await chrome.storage.local.get(['userId']);
  if (!stored.userId) {
    const backendUser = await syncSessionFromBackend();
    if (backendUser) {
      stored = { userId: backendUser.id };
    }
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (stored.userId) {
    headers['x-user-id'] = stored.userId;
  }
  const token = await getAuthTokenFromCookies();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function syncSessionFromBackend() {
  try {
    const apiUrl = await getApiUrl();
    const token = await getAuthTokenFromCookies();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${apiUrl}/me`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.user?.id) {
        await chrome.storage.local.set({
          userId: data.user.id,
          userName: data.user.name,
          userEmail: data.user.email,
        });
        return data.user;
      }
    }
  } catch {}
  return null;
}

async function handleVerifyJob(job: ExtractedJobData) {
  const apiUrl = await getApiUrl();

  const payload = {
    type: 'TEXT',
    companyName: job.companyName,
    jobTitle: job.jobTitle,
    description: job.description,
    salary: job.salary,
    jobUrl: job.jobUrl,
  };

  const res = await fetch(`${apiUrl}/jobs/verify-direct`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Failed to verify job listing with JobSentry AI');
  }

  // Cache latest result in chrome.storage for toolbar popup display
  await chrome.storage.local.set({
    lastVerifiedJob: {
      job: data.job,
      analysis: data.analysis,
      verifiedAt: new Date().toISOString(),
      platform: job.platform,
    },
  });

  return data;
}

async function handleTrackApplication(payload: any) {
  const apiUrl = await getApiUrl();
  const headers = await getAuthHeaders();
  let storedUser = await chrome.storage.local.get(['userId']);

  if (!storedUser.userId) {
    const backendUser = await syncSessionFromBackend();
    if (backendUser) {
      storedUser = { userId: backendUser.id };
    }
  }

  if (!storedUser.userId) {
    throw new Error('AUTH_REQUIRED: Please sign in to your JobSentry account to track applications.');
  }

  const res = await fetch(`${apiUrl}/applications`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (res.status === 401 || !res.ok || !data.success) {
    if (res.status === 401) {
      await chrome.storage.local.remove(['userId', 'userName', 'userEmail']);
      throw new Error('AUTH_REQUIRED: Session expired. Please sign in again.');
    }
    throw new Error(data.message || 'Failed to track application');
  }

  // Immediately refresh toolbar badge with updated counts
  updateToolbarBadge().catch(() => {});

  return data.data;
}

async function handleCheckApplication(payload: { jobUrl?: string; companyName?: string; jobTitle?: string }) {
  const apiUrl = await getApiUrl();
  const headers = await getAuthHeaders();
  let storedUser = await chrome.storage.local.get(['userId']);

  if (!storedUser.userId) {
    const backendUser = await syncSessionFromBackend();
    if (backendUser) {
      storedUser = { userId: backendUser.id };
    }
  }

  if (!storedUser.userId) {
    return { applied: false, requireAuth: true };
  }

  try {
    const params = new URLSearchParams();
    if (payload.jobUrl) params.set('url', payload.jobUrl);
    if (payload.companyName) params.set('company', payload.companyName);
    if (payload.jobTitle) params.set('title', payload.jobTitle);

    const res = await fetch(`${apiUrl}/applications/check?${params.toString()}`, {
      headers,
      credentials: 'include',
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return data;
    }
    if (res.status === 401) {
      return { applied: false, requireAuth: true };
    }
  } catch (err) {
    console.warn('API check error:', err);
  }

  return {
    applied: false,
    data: null,
  };
}

async function handleGetApplications() {
  const apiUrl = await getApiUrl();
  const headers = await getAuthHeaders();
  let storedUser = await chrome.storage.local.get(['userId']);

  if (!storedUser.userId) {
    const backendUser = await syncSessionFromBackend();
    if (backendUser) {
      storedUser = { userId: backendUser.id };
    }
  }

  if (!storedUser.userId) {
    return {
      authenticated: false,
      requireAuth: true,
      applications: [],
      stats: null,
    };
  }

  try {
    const res = await fetch(`${apiUrl}/applications`, {
      headers,
      credentials: 'include',
    });

    const data = await res.json();
    if (res.status === 401) {
      return {
        authenticated: false,
        requireAuth: true,
        applications: [],
        stats: null,
      };
    }

    if (res.ok && data.success) {
      if (data.stats?.staleGhostedWarningCount !== undefined) {
        updateToolbarBadge(data.stats.staleGhostedWarningCount).catch(() => {});
      }
      return {
        authenticated: true,
        applications: data.data || [],
        stats: data.stats || null,
      };
    }
  } catch (err) {
    console.warn('API get applications error:', err);
  }

  return {
    authenticated: true,
    applications: [],
    stats: null,
  };
}

async function handleUpdateStatus(id: string, status: string) {
  const apiUrl = await getApiUrl();
  const headers = await getAuthHeaders();
  const storedUser = await chrome.storage.local.get(['userId']);

  if (!storedUser.userId) {
    throw new Error('AUTH_REQUIRED: Please sign in to update application status.');
  }

  const res = await fetch(`${apiUrl}/applications/${id}/status`, {
    method: 'PATCH',
    headers,
    credentials: 'include',
    body: JSON.stringify({ status }),
  });

  const data = await res.json();
  if (res.status === 401) {
    throw new Error('AUTH_REQUIRED: Session expired. Please sign in again.');
  }
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to update application status');
  }

  // Immediately refresh toolbar badge with updated counts
  updateToolbarBadge().catch(() => {});

  return data.data;
}

/**
 * Updates the Chrome toolbar badge with the count of stale (14d+) applications
 * needing candidate follow-up.
 */
async function updateToolbarBadge(knownStaleCount?: number): Promise<number> {
  try {
    let staleCount = knownStaleCount;
    if (staleCount === undefined) {
      const res = await handleGetApplications();
      staleCount = res?.stats?.staleGhostedWarningCount || 0;
    }

    if (typeof staleCount === 'number' && staleCount > 0) {
      const badgeText = staleCount > 9 ? '9+' : staleCount.toString();
      await chrome.action.setBadgeText({ text: badgeText });
      await chrome.action.setBadgeBackgroundColor({ color: '#e11d48' }); // Rose-600
      if (chrome.action.setBadgeTextColor) {
        await chrome.action.setBadgeTextColor({ color: '#ffffff' });
      }
      await chrome.action.setTitle({
        title: `JobSentry AI: ${staleCount} application${staleCount > 1 ? 's' : ''} awaiting response (14d+) — follow-up recommended!`,
      });
      return staleCount;
    } else {
      await chrome.action.setBadgeText({ text: '' });
      await chrome.action.setTitle({
        title: 'JobSentry AI — Recruitment Fraud Radar & Job Tracker',
      });
      return 0;
    }
  } catch (err) {
    console.warn('[JobSentry AI] Could not update badge:', err);
    return 0;
  }
}
