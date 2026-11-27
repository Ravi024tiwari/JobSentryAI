from typing import TypedDict, List, Dict, Any, Optional
from pydantic import BaseModel, Field

class VerificationRequest(BaseModel):
    jobId: str
    companyName: str
    jobTitle: str
    description: str
    jobUrl: Optional[str] = None
    salary: Optional[str] = None
    location: Optional[str] = None
    employmentType: Optional[str] = None
    preComputedHints: Dict[str, Any] = Field(default_factory=dict)

class InvestigationState(TypedDict, total=False):
    # Job input payload
    job_id: str
    company_name: str
    job_title: str
    description: str
    job_url: Optional[str]
    salary: Optional[str]
    location: Optional[str]
    employment_type: Optional[str]
    pre_computed_hints: Dict[str, Any]

    # Investigation artifacts (Nodes 1 & 2)
    company_research: List[Dict[str, Any]]
    official_domains_found: List[str]
    job_vacancies_found: List[Dict[str, Any]]
    careers_url_found: Optional[str]

    # Synthesized Detective Findings (Node 3)
    contextual_red_flags: List[str]
    positive_indicators: List[str]
    reasoning_summary: str
    ai_risk_score: int
    ai_confidence_score: int
    recommended_verdict: str

class VerificationResponse(BaseModel):
    jobId: str
    companyName: str
    jobTitle: str
    aiRiskScore: int
    aiConfidenceScore: int
    recommendedVerdict: str
    reasoningSummary: str
    contextualRedFlags: List[str]
    positiveIndicators: List[str]
    companyPresence: Dict[str, Any]
    careersPortalMatches: List[Dict[str, Any]]
