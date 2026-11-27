import os
from pathlib import Path
from dotenv import load_dotenv, find_dotenv

# Search for .env starting from current directory up to repository root
dotenv_path = find_dotenv(usecwd=True)
if dotenv_path:
    load_dotenv(dotenv_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
PORT = int(os.getenv("AI_PORT", "8000"))
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
