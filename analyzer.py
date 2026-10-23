import os
import re
import json
import io
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from groq import Groq
import pypdf
import docx

load_dotenv()

# Initialize Groq client
def get_groq_client(api_key: Optional[str] = None) -> Groq:
    key = api_key or os.getenv("GROQ_API_KEY", "")
    if not key:
        raise ValueError("Groq API key is missing. Please set GROQ_API_KEY in .env or pass it in.")
    return Groq(api_key=key)

PRIMARY_MODEL = "openai/gpt-oss-120b"
FALLBACK_MODEL = "qwen/qwen3.8-27b"

ANALYSIS_SYSTEM_PROMPT = """You are SignSafe, an ultra-smart, friendly legal document guardian and contract analyst.
Your mission is to protect regular people (tenants, employees, freelancers, borrowers, consumers) from predatory agreements, hidden legal traps, financial surprises, and unfair terms.
You speak like a sharp, loyal friend who understands complex legal language and translates it into clear, simple, everyday English.

You MUST analyze the provided contract text and output your response in strict, valid JSON format only.
Do not wrap your JSON in markdown fences unless strictly necessary, and ensure no trailing commas or invalid JSON syntax.

The JSON structure must strictly follow this exact schema:
{
  "contract_type": "Rental Agreement | Employment Offer | Freelance Services | Loan / Financial | App Terms of Service | NDA | General Agreement",
  "contract_title": "Descriptive short title for this document",
  "summary": "2 to 3 sentences in warm, clear, plain conversational English explaining what this contract is and its core premise.",
  "risk_score": 0 to 100 integer (0-30 = Low/Safe, 31-65 = Moderate Caution, 66-100 = High Danger / Predatory),
  "risk_level": "Low" | "Moderate" | "High Danger",
  "verdict": "Clear bold takeaway (e.g. 'DO NOT SIGN AS-IS', 'SIGN WITH CAUTION - ASK FOR CHANGES', 'SAFE TO SIGN')",
  "verdict_explanation": "1-2 friendly sentences explaining the rationale behind the verdict.",
  "critical_red_flags": [
    {
      "clause_quote": "Verbatim quote or close excerpt from the contract",
      "plain_explanation": "Clear explanation of why this clause is dangerous, unfair, or traps the signer.",
      "severity": "Critical" | "Warning" | "Caution",
      "tag": "e.g., Uncapped Liability | Auto-Renewal | No Notice Eviction | 3-Year Non-Compete | Wage Deduction"
    }
  ],
  "hidden_fees_and_traps": [
    {
      "title": "Short title of the trap or fee (e.g., $150 Instant Late Fee + $35/day, Forfeited Security Deposit, 90-Day Unpaid Payment Terms)",
      "details": "Plain English breakdown of how money could be lost or rights forfeited."
    }
  ],
  "questions_to_ask": [
    "Specific, polite, professional question ready to copy and send via email/WhatsApp to the other party before signing"
  ],
  "fair_or_positive_clauses": [
    "Any standard, fair, or beneficial clause that protects the signer (e.g. 24h advance entry notice, 5-day grace period, standard IP boundaries)"
  ],
  "section_breakdown": [
    {
      "section_name": "e.g., Money & Payments | Leaving & Termination | Your Intellectual Rights | Landlord Entry & Privacy",
      "plain_meaning": "What this section means in plain 5th-grade English.",
      "safety_rating": "Fair" | "Watch Out" | "Dangerous"
    }
  ],
  "bottom_line_advice": "A direct, encouraging recommendation on what step to take next."
}
"""

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """Extracts raw text from PDF, DOCX, or TXT file."""
    ext = filename.lower().split('.')[-1]
    
    if ext == 'pdf':
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text_parts = []
            for i, page in enumerate(reader.pages):
                extracted = page.extract_text()
                if extracted:
                    text_parts.append(extracted)
            full_text = "\n\n".join(text_parts).strip()
            if not full_text:
                raise ValueError("The uploaded PDF contains no readable text (it might be a scanned image). Please paste the text directly.")
            return full_text
        except Exception as e:
            if "scanned" in str(e).lower():
                raise
            raise ValueError(f"Failed to read PDF: {str(e)}")
            
    elif ext in ['docx', 'doc']:
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            text_parts = [p.text for p in doc.paragraphs if p.text.strip()]
            full_text = "\n\n".join(text_parts).strip()
            if not full_text:
                raise ValueError("The Word document is empty.")
            return full_text
        except Exception as e:
            raise ValueError(f"Failed to read Word document: {str(e)}")
            
    elif ext in ['txt', 'md', 'rtf']:
        try:
            return file_bytes.decode('utf-8').strip()
        except UnicodeDecodeError:
            return file_bytes.decode('latin-1', errors='replace').strip()
    else:
        raise ValueError(f"Unsupported file format '.{ext}'. Supported formats: .pdf, .docx, .txt")

def sanitize_json_response(raw_text: str) -> Dict[str, Any]:
    """Cleans up LLM output and extracts valid JSON."""
    text = raw_text.strip()
    
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    
    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
        
    # Search for first '{' and last '}'
    match = re.search(r"(\{.*\})", text, re.DOTALL)
    if match:
        candidate = match.group(1)
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            # Common fix: remove trailing commas before } or ]
            cleaned = re.sub(r",\s*([\}\]])", r"\1", candidate)
            return json.loads(cleaned)
            
    raise ValueError("Failed to parse valid JSON report from AI output.")

def analyze_contract(contract_text: str, custom_api_key: Optional[str] = None) -> Dict[str, Any]:
    """Analyzes a contract using Groq."""
    cleaned_text = contract_text.strip()
    if len(cleaned_text) < 40:
        raise ValueError("The contract text is too short. Please paste or upload a complete contract clause or agreement (at least 40 characters).")
    
    # Truncate text if excessively long (e.g., > 40,000 characters) to fit context
    max_chars = 40000
    if len(cleaned_text) > max_chars:
        cleaned_text = cleaned_text[:max_chars] + "\n\n[Contract text truncated for length]..."

    client = get_groq_client(custom_api_key)
    
    user_prompt = f"""Here is the contract to analyze:
---
{cleaned_text}
---
Please perform a thorough, critical analysis and return the report strictly in the requested JSON structure."""

    # Try Primary Model first, fallback if unavailable
    for model_name in [PRIMARY_MODEL, FALLBACK_MODEL]:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2,
                max_tokens=3500
            )
            raw_content = response.choices[0].message.content
            report = sanitize_json_response(raw_content)
            report["_model_used"] = model_name
            return report
        except Exception as e:
            if model_name == FALLBACK_MODEL:
                raise RuntimeError(f"Contract analysis failed: {str(e)}")
            continue

    raise RuntimeError("Failed to complete contract analysis with available models.")
