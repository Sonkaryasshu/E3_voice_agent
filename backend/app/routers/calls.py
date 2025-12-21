from fastapi import APIRouter, HTTPException
from app.database import supabase
from app.schemas import TriggerCallRequest
import os
from retell import Retell
from typing import Dict, Any

router = APIRouter(prefix="/api/calls", tags=["calls"])

# Initialize Retell Client
retell_client = Retell(api_key=os.environ.get("RETELL_API_KEY"))

@router.post("/register-web-call")
async def register_web_call(request: TriggerCallRequest):
    try:
        # 1. Fetch Agent Config
        agent_res = supabase.table("agents").select("*").eq("id", str(request.agent_id)).execute()
        if not agent_res.data:
            raise HTTPException(status_code=404, detail="Agent not found")
        agent = agent_res.data[0]
        
        # 2. Create Initial Call Record
        call_data = {
            "agent_id": str(request.agent_id),
            "driver_name": request.driver_name,
            "driver_phone": request.driver_phone or "web-call", 
            "load_number": request.load_number,
            "metadata": request.metadata,
            "status": "registered"
        }
        call_insert = supabase.table("calls").insert(call_data).execute()
        if not call_insert.data:
            raise HTTPException(status_code=500, detail="Failed to create call record")
        call_id_internal = call_insert.data[0]["id"]

        # 3. Dynamic Variables
        # Format metadata as a readable string
        metadata_str = ""
        if request.metadata:
            metadata_str = ", ".join([f"{k}: {v}" for k, v in request.metadata.items()])
        
        dynamic_variables = {
            "driver_name": request.driver_name,
            "load_number": request.load_number,
            "internal_call_id": str(call_id_internal),
            "metadata": metadata_str or "None",
            **request.metadata # Also include individual metadata keys
        }

        # 4. Register Web Call via Retell
        # We use the Retell Agent configured with Managed LLM.
        # Dynamic variables (driver_name, load_number) will be injected into the Prompt.
        
        # 4. Register Web Call via Retell
        if not agent.get("retell_agent_id"):
             raise HTTPException(status_code=400, detail="This agent does not have a Retell Agent ID. Please recreate the agent to generate one.")

        call_response = retell_client.call.create_web_call(
            agent_id=agent["retell_agent_id"], 
            retell_llm_dynamic_variables=dynamic_variables
        )
        
        # Update DB with retell call id
        retell_call_id = call_response.call_id
        supabase.table("calls").update({
            "retell_call_id": retell_call_id,
            "status": "registered"
        }).eq("id", call_id_internal).execute()

        return {
            "access_token": call_response.access_token, 
            "call_id": call_id_internal,
            "retell_call_id": retell_call_id
        }

    except Exception as e:
        error_msg = str(e)
        if "agent_id" in error_msg.lower() or "not found" in error_msg.lower():
             raise HTTPException(status_code=400, detail=f"Retell API Error: Invalid Agent ID '{agent.get('voice_id')}'. Please check Agent Config.")
        print(f"Error registering web call: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Failed to register call: {error_msg}")


@router.get("/")
async def list_calls():
    # Order by created_at desc
    res = supabase.table("calls").select("*").order("created_at", desc=True).limit(50).execute()
    return res.data

