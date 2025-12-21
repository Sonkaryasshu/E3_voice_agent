from fastapi import APIRouter, HTTPException, Depends
from app.database import supabase
from app.schemas import AgentConfigCreate, AgentConfigResponse
from retell import Retell
import os

router = APIRouter(prefix="/api/agents", tags=["agents"])
retell_client = Retell(api_key=os.environ.get("RETELL_API_KEY"))

# Should cache voices, skipping as its interview demo task only
@router.get("/voices")
async def list_voices():
    try:
        # Fetch voices from Retell
        # This provides a list of available voices (11Labs, OpenAI, etc.)
        voices = retell_client.voice.list()
        return voices
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=AgentConfigResponse)
async def create_agent_config(agent: AgentConfigCreate):
    try:
        # Step 1: Create Retell LLM (Managed LLM)
        llm_settings_data = agent.llm_settings.model_dump() if agent.llm_settings else {}
        
        # Extract settings with defaults
        start_speaker = llm_settings_data.get("start_speaker", "agent")
        begin_message = llm_settings_data.get("begin_message")
        begin_after_user_silence_ms = llm_settings_data.get("begin_after_user_silence_ms")
        
        # If begin_message is not set and agent starts, use empty string (waits)
        if begin_message is None and start_speaker == "agent":
            begin_message = ""  # Agent starts but waits for user

        llm_create_params = {
            "general_prompt": agent.system_prompt,
            "model": "gpt-5",
            "begin_message": begin_message,
            "general_tools": [
                {
                    "type": "end_call",
                    "name": "end_call",
                    "description": "End the call when the conversation is finished or if the user requests it."
                }
            ]
        }
        
        if begin_after_user_silence_ms is not None:
            llm_create_params["begin_after_user_silence_ms"] = begin_after_user_silence_ms
        
        retell_llm = retell_client.llm.create(**llm_create_params)
        llm_id = retell_llm.llm_id
        print(f"Created Retell Managed LLM with ID: {llm_id}")
        
        # Step 2: Create Retell Agent
        vs = agent.voice_settings.model_dump() if agent.voice_settings else {}
        public_url = os.environ.get('PUBLIC_URL', '').replace('https://', '').replace('http://', '')
        webhook_url = f"https://{public_url}/api/webhook/retell-status" if public_url else None
        
        retell_agent = retell_client.agent.create(
            response_engine={
                "type": "retell-llm",
                "llm_id": llm_id
            },
            voice_id=agent.voice_id,
            agent_name=agent.name,
            interruption_sensitivity=vs.get("interruption_sensitivity", 0.9),
            responsiveness=vs.get("responsiveness", 1.0),
            voice_temperature=vs.get("voice_temperature", 1.0),
            enable_backchannel=vs.get("backchanneling_enabled", True),
            webhook_url=webhook_url
        )
        
        retell_agent_id = retell_agent.agent_id
        print(f"Created Retell Agent with ID: {retell_agent_id}")

        # Step 3: Save to Supabase
        agent_data = agent.model_dump()
        data = {
            "name": agent_data["name"],
            "system_prompt": agent_data["system_prompt"],
            "voice_id": agent_data["voice_id"],
            "voice_settings": agent_data["voice_settings"],
            "llm_settings": agent_data.get("llm_settings", {}),
            "retell_agent_id": retell_agent_id
        }

        response = supabase.table("agents").insert(data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create agent config")
            
        return response.data[0]

    except Exception as e:
        print(f"Error creating agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=list[AgentConfigResponse])
async def list_agents():
    try:
        response = supabase.table("agents").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{agent_id}", response_model=AgentConfigResponse)
async def update_agent_config(agent_id: str, agent: AgentConfigCreate):
    try:
        # Check if agent exists
        existing = supabase.table("agents").select("*").eq("id", agent_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        existing_agent = existing.data[0]
        retell_agent_id = existing_agent.get("retell_agent_id")
        
        # Step 1: Update Retell Agent (and LLM if needed)
        llm_settings_data = agent.llm_settings.model_dump() if agent.llm_settings else {}
        start_speaker = llm_settings_data.get("start_speaker", "agent")
        begin_message = llm_settings_data.get("begin_message")
        begin_after_user_silence_ms = llm_settings_data.get("begin_after_user_silence_ms")
        
        if begin_message is None and start_speaker == "agent":
            begin_message = ""

        llm_create_params = {
            "general_prompt": agent.system_prompt,
            "model": "gpt-5",
            "begin_message": begin_message,
            "general_tools": [
                {
                    "type": "end_call",
                    "name": "end_call",
                    "description": "End the call when the conversation is finished or if the user requests it."
                }
            ]
        }
        
        if begin_after_user_silence_ms is not None:
            llm_create_params["begin_after_user_silence_ms"] = begin_after_user_silence_ms
            
        retell_llm = retell_client.llm.create(**llm_create_params)
        new_llm_id = retell_llm.llm_id
        
        vs = agent.voice_settings.model_dump() if agent.voice_settings else {}
        public_url = os.environ.get('PUBLIC_URL', '').replace('https://', '').replace('http://', '')
        webhook_url = f"https://{public_url}/api/webhook/retell-status" if public_url else None

        retell_client.agent.update(
            retell_agent_id,
            response_engine={
                "type": "retell-llm",
                "llm_id": new_llm_id
            },
            voice_id=agent.voice_id,
            agent_name=agent.name,
            interruption_sensitivity=vs.get("interruption_sensitivity", 0.9),
            responsiveness=vs.get("responsiveness", 1.0),
            voice_temperature=vs.get("voice_temperature", 1.0),
            enable_backchannel=vs.get("backchanneling_enabled", True),
            webhook_url=webhook_url
        )
        
        # Step 2: Update Supabase
        agent_data = agent.model_dump()
        update_data = {
            "name": agent_data["name"],
            "system_prompt": agent_data["system_prompt"],
            "voice_id": agent_data["voice_id"],
            "voice_settings": agent_data["voice_settings"],
            "llm_settings": agent_data.get("llm_settings", {}),
        }
        
        response = supabase.table("agents").update(update_data).eq("id", agent_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update agent config")
            
        return response.data[0]

    except Exception as e:
        print(f"Error updating agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{agent_id}")
async def delete_agent(agent_id: str):
    try:
        # Check if agent exists
        existing = supabase.table("agents").select("*").eq("id", agent_id).execute()
        if not existing.data:
             raise HTTPException(status_code=404, detail="Agent not found")
        
        retell_agent_id = existing.data[0].get("retell_agent_id")
        
        # Delete from Retell
        if retell_agent_id:
            try:
                retell_client.agent.delete(retell_agent_id)
            except Exception as e:
                print(f"Warning: Failed to delete Retell agent {retell_agent_id}: {e}")
        
        # Delete from Supabase
        supabase.table("agents").delete().eq("id", agent_id).execute()
        
        return {"success": True, "message": "Agent deleted"}
        
    except Exception as e:
        print(f"Error deleting agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))
