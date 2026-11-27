from typing import List, Dict, Any, Optional
from tavily import TavilyClient
from src.config import TAVILY_API_KEY

_tavily_client: Optional[TavilyClient] = None

def get_tavily_client() -> TavilyClient:
    global _tavily_client
    if _tavily_client is None:
        if not TAVILY_API_KEY:
            raise ValueError("TAVILY_API_KEY is not configured in environment")
        _tavily_client = TavilyClient(api_key=TAVILY_API_KEY)
    return _tavily_client

def search_company_presence(company_name: str) -> List[Dict[str, Any]]:
    """
    Searches for official company presence, domain, and career/about pages.
    """
    try:
        client = get_tavily_client()
        query = f'"{company_name}" official website careers about'
        response = client.search(
            query=query,
            search_depth="advanced",
            max_results=5
        )
        results = []
        for item in response.get("results", []):
            results.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "content": item.get("content", ""),
                "score": item.get("score", 0.0)
            })
        return results
    except Exception as e:
        print(f"[Tavily Search] Company search error for '{company_name}': {e}")
        return []

def search_job_vacancies(company_name: str, job_title: str) -> List[Dict[str, Any]]:
    """
    Searches for official job vacancy listings on ATS / company portals.
    """
    try:
        client = get_tavily_client()
        query = f'"{company_name}" "{job_title}" jobs careers (site:greenhouse.io OR site:lever.co OR site:myworkdayjobs.com OR site:linkedin.com/jobs OR careers)'
        response = client.search(
            query=query,
            search_depth="advanced",
            max_results=5
        )
        results = []
        for item in response.get("results", []):
            results.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "content": item.get("content", ""),
                "score": item.get("score", 0.0)
            })
        return results
    except Exception as e:
        print(f"[Tavily Search] Job vacancy search error for '{company_name} - {job_title}': {e}")
        return []
