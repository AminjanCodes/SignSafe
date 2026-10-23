# 🛡️ SignSafe — Understand Before You Sign

**SignSafe** is an AI-powered legal document guardian designed for regular people: tenants, employees, freelancers, borrowers, and consumers.

People sign contracts they don't understand — rental agreements, job offers, freelance contracts, loan papers, and app terms. The language is intentionally dense, and dangerous traps are buried deep within pages of fine print.

**SignSafe solves this in under 30 seconds.** Upload or paste any contract, and get a plain-English report with:
- 📊 **Risk Score (0–100)**: Visual gauge showing safety rating (Low Risk, Moderate, High Danger).
- ⚖️ **Clear Bottom-Line Verdict**: e.g., *"DO NOT SIGN AS-IS"*, *"SAFE TO SIGN"*.
- 🚨 **Critical Red Flags**: Exact verbatim clauses highlighted with plain-English breakdowns of why they harm you.
- 💸 **Hidden Penalties & Charges**: Sneaky automatic renewals, deposit forfeitures, late fees, and non-compete traps.
- ❓ **What to Ask Before Signing**: Specific, polite questions ready to copy-paste into an email or WhatsApp to the counterparty.
- 📖 **Section-by-Section Translation**: 5th-grade plain-English explanations of key sections.
- 🖨️ **Print & PDF Export**: Instant printable audit report.

---

## 🚀 Quick Start

### 1. Requirements
- Python 3.10+
- Installed packages: `fastapi`, `uvicorn`, `groq`, `pypdf`, `python-docx`, `python-dotenv`

### 2. Run the App
Double-click `run.bat` or run:
```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Open your browser to:
👉 **[http://localhost:8000](http://localhost:8000)**

---

## ⚡ Free API Engine
SignSafe uses **Groq's Ultra-Fast Inference** (`openai/gpt-oss-120b` & `qwen/qwen3.8-27b`) for rapid analysis with zero latency.
The API key is securely managed via `.env`:
```env
GROQ_API_KEY=gsk_...
PORT=8000
ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
```
Users can also enter their own Groq key or AdSense Publisher ID directly in the UI settings modal.

---

## 💰 Monetization & Paid Version ($5 / month)
1. **Google AdSense**:
   - Pre-integrated with 3 high-converting, non-intrusive ad slots (Top, In-Report, and Bottom).
   - Edit `ADSENSE_CLIENT_ID` in `.env` or input it in the UI Settings modal to link your approved publisher ID.
2. **SignSafe Pro ($5 / month)**:
   - **100% Ad-Free**: Permanently hides all AdSense slots and sponsor banners across the application.
   - **Unlimited Scans**: Bypasses the 10 scans/minute rate limit.
   - **Deep Redline Generator**: Line-by-line contract revision counter-proposals.
   - Users can subscribe via the header or modal, with instant toggle support.

---

## 🔒 Privacy First
- **Ephemeral in-memory processing**: Uploaded documents (`.pdf`, `.docx`, `.txt`) are read in RAM and **never stored on disk**.
- No personal tracking or document databases.
