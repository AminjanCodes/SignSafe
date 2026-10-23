@echo off
title SignSafe - AI Contract Guardian
echo ========================================================
echo        SignSafe - Plain-English Contract Guardian
echo ========================================================
echo.
echo Starting SignSafe local server on http://localhost:8000 ...
echo.
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
