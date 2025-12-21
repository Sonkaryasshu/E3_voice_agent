from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import supabase

app = FastAPI(title="Voice Agent Admin API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def health_check():
    return {"status": "healthy", "service": "Voice Agent API"}

from app.routers import agents
from app.routers import calls
from app.routers import webhook

app.include_router(agents.router)
app.include_router(calls.router)
app.include_router(webhook.router)
