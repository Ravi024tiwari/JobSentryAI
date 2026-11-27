import json
import re
from urllib.parse import urlparse
from typing import Dict, Any, List

from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from src.config import GEMINI_API_KEY, GEMINI_MODEL
from src.graph.state import InvestigationState
from src.tools.tavily_search import search_company_presence, search_job_vacancies

def _extract_domain(url: str) -> str:
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        return netloc
    except Exception:
        return ""

def company_research_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Node 1: Investigates the company's live web presence, official domain, and corporate reputation.
    """
    company_name = state.get("company_name", "").strip()
    if not company_name:
        return {"company_research": [], "official_domains_found": []}

    print(f"[Detective Node 1] Researching web footprint for company: '{company_name}'...")
    results = search_company_presence(company_name)

    domains = set()
    for item in results:
        domain = _extract_domain(item.get("url", ""))
        if domain:
            domains.add(domain)

    return {
        "company_research": results,
        "official_domains_found": list(domains)
    }

def job_cross_check_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Node 2: Cross-references the job vacancy against verified career portals (ATS, official career pages).
    """
    company_name = state.get("company_name", "").strip()
    job_title = state.get("job_title", "").strip()

    if not company_name or not job_title:
        return {"job_vacancies_found": [], "careers_url_found": None}

    print(f"[Detective Node 2] Cross-checking vacancies for '{job_title}' at '{company_name}'...")
    results = search_job_vacancies(company_name, job_title)

    careers_url = None
    ats_keywords = ["greenhouse.io", "lever.co", "myworkdayjobs.com", "careers", "jobs", "linkedin.com/jobs"]
    for item in results:
        url = item.get("url", "").lower()
        if any(kw in url for kw in ats_keywords):
            careers_url = item.get("url")
            break

    return {
        "job_vacancies_found": results,
        "careers_url_found": careers_url
    }

def _parse_llm_json_response(raw_text: str) -> Dict[str, Any]:
    """
    Safely parses JSON output from LLM, stripping markdown code fences if present.
    """
    text = raw_text.strip()
    # Strip markdown ```json ... ``` or ``` ... ```
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Fallback regex search for JSON object
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        return {}

def llm_reasoning_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Node 3: Contextual Reasoning Engine powered by Gemini.
    Synthesizes job description, Phase 3 deterministic hints, and Tavily web research.
    """
    print(f"[Detective Node 3] Gemini synthesizing evidence for '{state.get('job_title')}' at '{state.get('company_name')}'...")

    llm = ChatGoogleGenerativeAI(
        model=GEMINI_MODEL,
        google_api_key=GEMINI_API_KEY,
        temperature=0.1
    )

    system_prompt = (
        "You are JobSentry AI's Chief Fraud Intelligence Investigator.\n"
        "Your task is to analyze a job listing for authenticity, scam patterns, brand impersonation, and stealth traps.\n"
        "You have been provided with:\n"
        "1. The original job post details (Title, Company, Description, Salary, Location).\n"
        "2. Deterministic pre-computed hints calculated in previous security phases (fatal payment/deposit rules, domain checks, mathematical risk score).\n"
        "3. Live web research results from Tavily (company web footprint and career portal matches).\n\n"
        "EVALUATION CRITERIA:\n"
        "- If the recruiter requires payment, training fee, security deposit, laptop fee, or crypto: FATAL SCAM.\n"
        "- If interview is exclusively conducted via unverified Telegram/WhatsApp handles without an official corporate email/portal: HIGH FRAUD RISK.\n"
        "- If the company is a well-known brand (e.g. Google, Microsoft, Infosys) but the recruiter domain is a free provider (gmail.com, hotmail.com) or a typo-squatted domain: BRAND IMPERSONATION SCAM.\n"
        "- If salary is wildly inflated for very basic tasks (e.g. Data Entry, Copy-Paste offering ₹80,000/month or $5,000/week): TYPICAL PHISHING TRAP.\n"
        "- If the company has a verified corporate footprint and active career portal listings: POSITIVE LEGITIMACY SIGNAL.\n\n"
        "Output ONLY a valid JSON object with the following exact keys:\n"
        "{\n"
        '  "contextual_red_flags": ["list of specific red flags discovered, or empty list"],\n'
        '  "positive_indicators": ["list of positive legitimacy indicators, or empty list"],\n'
        '  "reasoning_summary": "Clear, objective 2-3 sentence markdown verdict explaining the analysis to a student/jobseeker.",\n'
        '  "ai_risk_score": <integer from 0 to 100, where 0 is completely safe and 100 is definite scam>,\n'
        '  "ai_confidence_score": <integer from 0 to 100 reflecting how certain you are based on available evidence>,\n'
        '  "recommended_verdict": "LIKELY_LEGITIMATE" | "SUSPICIOUS" | "LIKELY_FRAUDULENT" | "UNABLE_TO_VERIFY"\n'
        "}"
    )

    investigation_context = {
        "job_title": state.get("job_title", ""),
        "company_name": state.get("company_name", ""),
        "description": state.get("description", ""),
        "salary": state.get("salary"),
        "location": state.get("location"),
        "pre_computed_hints": state.get("pre_computed_hints", {}),
        "company_research_summary": [
            {"title": item.get("title"), "url": item.get("url")}
            for item in state.get("company_research", [])[:3]
        ],
        "career_matches_summary": [
            {"title": item.get("title"), "url": item.get("url")}
            for item in state.get("job_vacancies_found", [])[:3]
        ]
    }

    user_message = f"Investigate this job posting case file:\n\n{json.dumps(investigation_context, indent=2)}"

    try:
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message)
        ])

        # ChatGoogleGenerativeAI content can be a string or a list of content blocks
        content_text = ""
        if isinstance(response.content, str):
            content_text = response.content
        elif isinstance(response.content, list):
            for part in response.content:
                if isinstance(part, str):
                    content_text += part
                elif isinstance(part, dict) and "text" in part:
                    content_text += part["text"]

        parsed = _parse_llm_json_response(content_text)

        red_flags = parsed.get("contextual_red_flags", [])
        positive_indicators = parsed.get("positive_indicators", [])
        reasoning_summary = parsed.get("reasoning_summary", "AI verification completed.")
        ai_risk_score = int(parsed.get("ai_risk_score", 50))
        ai_confidence_score = int(parsed.get("ai_confidence_score", 70))
        recommended_verdict = parsed.get("recommended_verdict", "SUSPICIOUS")

        return {
            "contextual_red_flags": red_flags,
            "positive_indicators": positive_indicators,
            "reasoning_summary": reasoning_summary,
            "ai_risk_score": ai_risk_score,
            "ai_confidence_score": ai_confidence_score,
            "recommended_verdict": recommended_verdict
        }

    except Exception as e:
        print(f"[Detective Node 3 Error] Gemini reasoning failed: {e}")
        # Safe fallback based on pre_computed_hints
        pre_hints = state.get("pre_computed_hints", {})
        fallback_risk = pre_hints.get("deterministic_risk_score", 50)
        return {
            "contextual_red_flags": ["AI engine reasoning encountered an error, falling back to deterministic baseline"],
            "positive_indicators": [],
            "reasoning_summary": "Automated verification was unable to reach deep LLM reasoning. Reliance placed on Phase 3 deterministic rule engine.",
            "ai_risk_score": fallback_risk,
            "ai_confidence_score": 40,
            "recommended_verdict": "UNABLE_TO_VERIFY" if fallback_risk < 70 else "LIKELY_FRAUDULENT"
        }
