import os
import time
import logging
from typing import Optional, Dict, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

logger = logging.getLogger("signsafe")

from analyzer import analyze_contract, extract_text_from_file
from samples import SAMPLE_CONTRACTS

load_dotenv()

app = FastAPI(
    title="SignSafe - Contract Guardian",
    description="Instant plain-English contract risk analysis powered by AI",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

# In-memory rate limiting: 10 requests per minute per IP for analysis endpoints
RATE_LIMIT_RECORDS: Dict[str, List[float]] = {}
RATE_LIMIT_MAX_REQUESTS = 10
RATE_LIMIT_WINDOW_SECONDS = 60.0

def rate_limiter(request: Request):
    # Pro subscribers have unlimited requests
    if request.headers.get("X-SignSafe-Pro") == "true":
        return
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    timestamps = [t for t in RATE_LIMIT_RECORDS.get(client_ip, []) if now - t < RATE_LIMIT_WINDOW_SECONDS]
    if len(timestamps) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Maximum 10 analysis requests per minute allowed. Upgrade to Pro for unlimited scans."
        )
    timestamps.append(now)
    RATE_LIMIT_RECORDS[client_ip] = timestamps

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

class TextAnalyzeRequest(BaseModel):
    text: str
    apiKey: Optional[str] = None

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()

@app.get("/api/health")
async def health_check():
    has_key = bool(os.getenv("GROQ_API_KEY"))
    return {
        "status": "healthy",
        "has_api_key": has_key,
        "service": "SignSafe API"
    }

@app.get("/api/config")
async def get_config():
    """Returns public configuration such as AdSense ID and Pro pricing."""
    return {
        "adsense_client_id": os.getenv("ADSENSE_CLIENT_ID", "ca-pub-XXXXXXXXXXXXXXXX"),
        "pro_price_monthly": 5,
        "pro_price_yearly": 48
    }

@app.get("/api/samples")
async def get_samples():
    """Return available sample contracts for instant testing."""
    return {
        key: {
            "title": data["title"],
            "type": data["type"],
            "description": data["description"]
        }
        for key, data in SAMPLE_CONTRACTS.items()
    }

@app.get("/api/sample/{sample_id}")
async def get_sample_detail(sample_id: str):
    """Return text of a specific sample contract."""
    if sample_id not in SAMPLE_CONTRACTS:
        raise HTTPException(status_code=404, detail="Sample contract not found")
    return SAMPLE_CONTRACTS[sample_id]

@app.post("/api/analyze-text", dependencies=[Depends(rate_limiter)])
async def analyze_text_endpoint(req: TextAnalyzeRequest):
    """Analyze contract provided as text."""
    if not req.text or len(req.text.strip()) < 30:
        raise HTTPException(
            status_code=400,
            detail="Contract text is too short. Please provide at least a complete clause or paragraph."
        )
    
    try:
        report = analyze_contract(req.text, custom_api_key=req.apiKey)
        return {"success": True, "report": report}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Something went wrong during analysis. Please try again."
        )

@app.post("/api/analyze-file", dependencies=[Depends(rate_limiter)])
async def analyze_file_endpoint(
    file: UploadFile = File(...),
    apiKey: Optional[str] = Form(None)
):
    """Analyze contract provided as uploaded PDF, Word (.docx), or Text document."""
    allowed_extensions = {".pdf", ".docx", ".doc", ".txt", ".md", ".rtf"}
    filename = file.filename or "unknown"
    _, ext = os.path.splitext(filename)
    
    if ext.lower() not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: .pdf, .docx, .txt"
        )
        
    try:
        content = await file.read()
        if len(content) > 15 * 1024 * 1024:  # 15MB limit
            raise HTTPException(status_code=400, detail="File size exceeds maximum limit of 15MB.")
            
        text = extract_text_from_file(content, filename)
        if len(text.strip()) < 30:
            raise HTTPException(
                status_code=400,
                detail="Extracted text is too short. The document might be an image scan or empty."
            )
            
        report = analyze_contract(text, custom_api_key=apiKey)
        return {"success": True, "filename": filename, "report": report}
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Failed to process file: {e}")
        raise HTTPException(
            status_code=500,
            detail="Something went wrong during analysis. Please try again."
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
