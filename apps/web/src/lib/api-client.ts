export interface VerifyUrlInput {
  type: 'URL';
  jobUrl: string;
  companyName?: string;
  recruiterEmail?: string;
}

export interface VerifyTextInput {
  type: 'TEXT';
  companyName: string;
  jobTitle: string;
  description: string;
  salary?: string;
  location?: string;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'INTERNSHIP' | 'CONTRACT' | 'REMOTE';
  recruiterEmail?: string;
  recruiterName?: string;
  recruitmentMessage?: string;
}

export type VerifyInput = VerifyUrlInput | VerifyTextInput;

export interface VerificationEvidenceItem {
  id: string;
  type: string;
  sourceUrl?: string;
  sourceTitle: string;
  summary: string;
  isPositiveSignal: boolean;
  credibilityScore: number;
  recordedAt: string;
}

export interface JobAnalysisResult {
  jobId: string;
  verdict: 'LIKELY_LEGITIMATE' | 'SUSPICIOUS' | 'LIKELY_FRAUDULENT' | 'UNABLE_TO_VERIFY';
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidenceScore: number;
  positiveSignals: string[];
  negativeSignals: string[];
  evidenceSummary: string;
  recommendations: string[];
  evidenceList: VerificationEvidenceItem[];
}

export interface VerifyJobResponse {
  success: boolean;
  isCacheHit: boolean;
  message: string;
  job: {
    id: string;
    title: string;
    description: string;
    companyId?: string;
    jobUrl?: string;
  };
  analysis: JobAnalysisResult;
  error?: string;
}

const API_BASE =
  typeof window !== 'undefined'
    ? '/api/v1'
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1');

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  createdAt?: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
}

export async function registerUser(input: RegisterInput): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Registration failed');
  }

  return data;
}

export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Login failed');
  }

  return data;
}

export async function logoutUser(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  const data = await response.json();
  return data;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE}/me`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user || null;
  } catch (err) {
    return null;
  }
}

export async function verifyJobDirect(input: VerifyInput): Promise<VerifyJobResponse> {
  const response = await fetch(`${API_BASE}/jobs/verify-direct`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to verify job listing');
  }

  return data as VerifyJobResponse;
}
