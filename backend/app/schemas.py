from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from uuid import UUID

class VoiceSettings(BaseModel):
    interruption_sensitivity: float = Field(default=0.8, ge=0.0, le=1.0)
    backchanneling_enabled: bool = True
    filler_words: bool = True
    responsiveness: float = Field(default=1.0, ge=0.0, le=1.0)
    voice_temperature: float = Field(default=1.0, ge=0.0, le=2.0)

class LLMSettings(BaseModel):
    start_speaker: str = Field(default="agent")  # "agent" or "user"
    begin_message: Optional[str] = Field(default=None)
    begin_after_user_silence_ms: Optional[int] = Field(default=None)

class AgentConfigCreate(BaseModel):
    name: str
    system_prompt: str
    voice_id: str
    voice_settings: VoiceSettings
    llm_settings: Optional[LLMSettings] = Field(default_factory=LLMSettings)

class AgentConfigResponse(BaseModel):
    id: UUID
    name: str
    system_prompt: str
    voice_id: str
    voice_settings: Optional[Dict[str, Any]] = None
    llm_settings: Optional[Dict[str, Any]] = None
    retell_agent_id: Optional[str] = None
    created_at: str

class TriggerCallRequest(BaseModel):
    agent_id: UUID
    driver_name: str
    driver_phone: Optional[str] = None
    load_number: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

# Webhook Payloads (simplified)
class RetellEvent(BaseModel):
    event: str
    call_id: str
    payload: Dict[str, Any]
