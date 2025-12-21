#!/bin/bash

# Exit on error
set -e

# Setup Public URL warning
if [ -z "$PUBLIC_URL" ] && [ -f .env ]; then
    export $(cat .env | xargs)
fi

# TODO: Agent check for all variables here and exit if any is missing
if [ -z "$PUBLIC_URL" ]; then
    echo "❌ PUBLIC_URL is not set in .env"
    echo "   Retell (Cloud) cannot connect to your Localhost WebSocket without it."
    echo "   Please use ngrok (or similar) and set PUBLIC_URL=your-ngrok-url.ngrok-free.app"
    exit 1
fi

if [ -z "$RETELL_API_KEY" ]; then
    echo "❌ RETELL_API_KEY is not set in .env"
    exit 1
fi

if [ -z "$SUPABASE_URL" ]; then
    echo "❌ SUPABASE_URL is not set in .env"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY is not set in .env"
    exit 1
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
