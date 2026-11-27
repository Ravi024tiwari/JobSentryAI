import uvicorn
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from src.config import PORT, GEMINI_MODEL
from src.graph.state import VerificationRequest, VerificationResponse, InvestigationState
from src.graph.workflow import investigation_graph

app = FastAPI(
    title="JobSentry AI Intelligence Engine",
    description="Multi-agent Job Authenticity & Fraud Detection Engine powered by LangGraph, Tavily, and Gemini",
    version="1.0.0"
)

# Enable CORS for internal microservice communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    return {
        "status": "healthy",
        "service": "JobSentry AI Intelligence Engine",
        "gemini_model": GEMINI_MODEL
    }

@app.post("/verify", response_model=VerificationResponse, status_code=status.HTTP_200_OK)
async def verify_job(request: VerificationRequest):
    try:
        # Build initial investigation state (Case File)
        initial_state: InvestigationState = {
            "job_id": request.jobId,
            "company_name": request.companyName,
            "job_title": request.jobTitle,
            "description": request.description,
            "job_url": request.jobUrl,
            "salary": request.salary,
            "location": request.location,
            "employment_type": request.employmentType,
            "pre_computed_hints": request.preComputedHints,
            "company_research": [],
            "official_domains_found": [],
            "job_vacancies_found": [],
            "careers_url_found": None,
            "contextual_red_flags": [],
            "positive_indicators": [],
            "reasoning_summary": "",
            "ai_risk_score": 0,
            "ai_confidence_score": 0,
            "recommended_verdict": "UNABLE_TO_VERIFY"
        }

        # Run LangGraph detective workflow asynchronously
        final_state = await investigation_graph.ainvoke(initial_state)

        return VerificationResponse(
            jobId=request.jobId,
            companyName=request.companyName,
            jobTitle=request.jobTitle,
            aiRiskScore=final_state.get("ai_risk_score", 50),
            aiConfidenceScore=final_state.get("ai_confidence_score", 70),
            recommendedVerdict=final_state.get("recommended_verdict", "UNABLE_TO_VERIFY"),
            reasoningSummary=final_state.get("reasoning_summary", "Verification complete."),
            contextualRedFlags=final_state.get("contextual_red_flags", []),
            positiveIndicators=final_state.get("positive_indicators", []),
            companyPresence={
                "officialDomains": final_state.get("official_domains_found", []),
                "webFindingsCount": len(final_state.get("company_research", [])),
                "topFindings": [
                    {"title": f.get("title"), "url": f.get("url")}
                    for f in final_state.get("company_research", [])[:2]
                ]
            },
            careersPortalMatches=[
                {"title": m.get("title"), "url": m.get("url")}
                for m in final_state.get("job_vacancies_found", [])[:3]
            ]
        )

    except Exception as e:
        print(f"[FastAPI Verify Error] {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Investigation failed: {str(e)}"
        )

if __name__ == "__main__":
    uvicorn.run("src.main:app", host="0.0.0.0", port=PORT, reload=True)
