#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "   🎙️ Starting MSOT AI Viva Platform (Problem 1)        "
echo "=========================================================="

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

if [ -d "$SCRIPT_DIR/.node/bin" ]; then
    export PATH="$SCRIPT_DIR/.node/bin:$PATH"
fi

# 1. Python Environment Check
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install fastapi uvicorn pydantic python-multipart sqlalchemy aiofiles requests
else
    source venv/bin/activate
fi

# 2. Start FastAPI Backend in background
echo "Starting FastAPI Backend on http://localhost:8000..."
uvicorn server.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 3. Client Check & Launch
echo "Starting React Frontend on http://localhost:5173..."
cd client
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

echo "=========================================================="
echo "  🚀 AI Viva Platform Running!"
echo "  👉 Student Viva Room:    http://localhost:5173"
echo "  👉 Faculty Dashboard:   http://localhost:5173 (Select Tab)"
echo "  👉 API & Swagger Docs:   http://localhost:8000/docs"
echo "=========================================================="
echo "Press Ctrl+C to terminate both servers."

wait
