#!/bin/bash

# Exit on error
set -e

echo "🚀 Setting up Backend Environment..."

# 1. Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3."
    exit 1
fi

# 2. Create venv if not exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment (venv)..."
    python3 -m venv venv
else
    echo "✅ venv already exists."
fi

# 3. Activate venv
source venv/bin/activate

# 4. Install Dependencies
echo "⬇️ Installing dependencies from requirements.txt..."
pip install -r requirements.txt

echo "✅ Setup Complete!"
echo "To start the server, run: ./start.sh"
