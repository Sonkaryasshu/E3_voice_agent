# AI Voice Agent Tool

A full-stack web application to configure and test AI Voice Agents for logistics. Supports both Phone Calls and **Web Browser Calls** powered by Retell AI and OpenAI.

## Features
*   **Agent Configuration**: Define system prompts and voice settings.
*   **Web Call Testing**: Test your agent directly in the browser (WebRTC).
*   **Structured Analysis**: auto-extracts call outcomes (e.g., "Driver Status", "Emergency Type").
*   **Scenarios**: Built-in logic for "Driver Check-in" and "Emergency Protocol".

## Prerequisites
1.  **Node.js** & **npm**
2.  **Python 3.10+**
3.  **Supabase** project (URL & Service Key)
4.  **Retell AI** Account (API Key)
5.  **OpenAI** Account (API Key)
6.  **Ngrok** (for local development/webhooks)

## Setup

### 1. Environment Variables
Create `backend/.env` with the following:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_key
RETELL_API_KEY=your_retell_key
OPENAI_API_KEY=your_openai_key
PUBLIC_URL=your-ngrok-url.ngrok-free.app  # Critical for WebSockets!
```

### 2. Backend
The backend manages the LLM logic and database.
```bash
cd backend
./setup.sh   # Creates venv and installs dependencies
./start.sh   # Starts the server on port 8000
```

### 3. Frontend
The admin dashboard.
```bash
cd frontend
npm install
npm run dev
```

## Enhanced Features
### Advanced Voice Configuration
In the **Agent Config** page, you can now fine-tune:
*   **Interruption Sensitivity**: How easily the agent yields the floor.
*   **Backchanneling**: "mhm", "uh-huh" behavior.
*   **Speed & Temperature**: Control pacing and creativity.

### Dynamic Context Injection
In the **Dashboard**, you can provide a JSON object in "Additional Context".
Example:
```json
{
  "last_location": "Phoenix Distribution Center",
  "driver_rating": 4.8,
  "special_instructions": "Ask about the flat tire."
}
```
This data is injected directly into the LLM's system prompt context for that specific call.

## How to Test (Web Call)
1.  Start your backend (`./start.sh`) and expose it via ngrok (`ngrok http 8000`).
2.  Update `PUBLIC_URL` in `.env` with your ngrok URL and restart backend.
3.  Open Frontend (http://localhost:5173).
4.  **Important**: Run the updated `schema.sql` in Supabase if you haven't!

## Project Structure
*   `frontend/`: React + Vite + Tailwind application.
*   `backend/`: FastAPI application.
    *   `app/routers/llm_websocket.py`: The core "Custom LLM" logic.
    *   `app/services/llm_logic.py`: System prompts and Tool Definitions (Scenarios).
