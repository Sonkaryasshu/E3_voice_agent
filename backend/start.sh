#!/bin/bash

# Exit on error
set -e

# Setup Public URL warning
if [ -z "$PUBLIC_URL" ] && [ -f .env ]; then
    export $(cat .env | xargs)
fi

if [ -z "$PUBLIC_URL" ]; then
    echo "⚠️  WARNING: PUBLIC_URL is not set in .env"
    echo "   Retell (Cloud) cannot connect to your Localhost WebSocket without it."
    echo "   Please use ngrok (or similar) and set PUBLIC_URL=your-ngrok-url.ngrok-free.app"
    echo "   Continuing anyway..."
fi

# Activate venv
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "❌ venv not found. Run ./setup.sh first."
    exit 1
fi

# Run Uvicorn
echo "🚀 Starting FastAPI Server on port 8000..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
