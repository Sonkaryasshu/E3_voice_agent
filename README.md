# AI Voice Agent Tool [[Watch Demo]](https://www.loom.com/share/08e3ae23da29485fabb34d255a90cd4c)


A full-stack web application to configure and test AI Voice Agents for logistics. Supports **Web Browser Calls** (skipped phone call for this demo) powered by Retell AI.

## Note:
* **STS model**: skipping speech to speech models (more costly, but better quality)
* **Performance**: voice lists caching and other performance related features are skipped for this demo
* **Call transfer**: skipping call transfer for this demo
* **Single Prompt**: For this demo we are just using single system prompt, in real world we will be using multiple flows/prompts.

## Features
*   **Agent Configuration**: Define system prompts and voice settings.
*   **Web Call Testing**: Test your agent directly in the browser (WebRTC).
*   **Structured Analysis**: auto-extracts call outcomes (e.g., "Driver Status", "Emergency Type").
*   **Evidence backed Extractions**: All of the extractions are supported by call-timestamp based evidence. No hellucination, more confidence.
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
PUBLIC_URL=your-ngrok-url.ngrok-free.app
```

### 2. Backend
The backend manages the LLM logic and database.
```bash
cd backend
./setup.sh   # Creates venv and installs dependencies
./start.sh   # Starts the server on port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

## Enhanced Features
### Advanced Voice Configuration
In the **Agent Config** page, you can fine-tune:
*   **Interruption Sensitivity**: How easily the agent yields the floor.
*   **Backchanneling**: "mhm", "uh-huh" behavior.
*   **Speed & Temperature**: Control pacing and creativity.

### Dynamic Context Injection
In the **Dashboard**, you can provide a more info about driver or call by plain text and/or JSON object in "Additional Context" section.

Example:
```
driver is having fever, please take update on his health also.

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
