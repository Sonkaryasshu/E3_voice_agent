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
        # We assume Agent is configured in Retell (using voice_id as agent_id for simplicity or just passing LLM url)
        # If we use Retell Agent:
        # call_response = retell_client.call.register(
        #     agent_id=agent["voice_id"], # Assuming voice_id field holds Retell Agent ID
        #     retell_llm_dynamic_variables=dynamic_variables
        # )
        
        # If we use Custom LLM via WebSocket (which we are):
        # We need to register the call pointing to our WebSocket.
        # But 'register' API is for Web Call... 
        # Retell SDK: client.call.register(agent_id=...)
        # Wait, if we use Custom LLM, we must have created a Retell Agent that points to our WebSocket URL or use 'agent_id' that is configured.
        # For this task, let's assume the user has a Retell Agent ID in `voice_id` field.
        # OR we can pass `llm_websocket_url` to `register`? 
        # Checking Retell Docs pattern: usually you create an agent -> get agent_id -> register call to that agent.
        # IF we want to force our dynamic websocket:
        # We might need to update the agent via API first? 
        # Let's assume for this specific flow, we are using a pre-configured Retell Agent (stored in `agent.voice_id`) 
        # that *already* points to our webhook/websocket OR we just rely on Retell's capability.
        #
        # ACTUALLY: The requirement is "Your FastAPI backend will serve as the webhook... logic to interpret prompts...".
        # This implies "Custom LLM".
        # Retell Web Calls with Custom LLM:
        # 1. Create Retell Agent (API or Dashboard) -> Set LLM URL to `wss://...`
        # 2. Register Call with that Agent ID.
        #
        # Limitation: We can't dynamically set `llm_websocket_url` in `register` call (unlike `create_phone_call`).
        # Workaround: 
        # Option A: We assume `voice_id` IS a Retell Agent ID configured to hit our generic websocket `wss://.../llm-websocket` (no params?). 
        # But we need `call_id` in the URL for our logic: `.../llm-websocket/{call_id}`.
        # If Retell Agent is static, it can't know the future `call_id`.
        #
        # SOLUTION: 
        # We will use `retell_client.agent.update(agent_id, llm_websocket_url=...)` dynamically? No, race conditions.
        #
        # BETTER: Retell sends `call_id` (Retell's ID) in the first WebSocket message ("call_started").
        # Detailed Flow:
        # 1. Register Call -> Get `retell_call_id`.
        # 2. Update our DB with `retell_call_id`.
        # 3. Web Client connects -> Retell connects to generic `wss://.../llm-websocket` (configured in Retell Dashboard once).
        # 4. Our WebSocket receives "call_started" with `call_id`.
        # 5. We look up `call_id` in our DB to find `internal_call_id` / context.
        #
        # PLAN ADJUSTMENT for `llm_websocket.py`: 
        # It needs to handle lookup by `retell_call_id` instead of path param if we can't use path param.
        # BUT `create_phone_call` allowed specific URL. `register` might not.
        # Let's check if `register` accepts `llm_websocket_url`. 
        # Retell Docs say: `register` takes `agent_id`.
        #
        # Let's assume for this task: `agent.voice_id` is a Retell Agent ID.
        # We will require the User to set their Retell Agent's LLM URL to `wss://[PUBLIC_URL]/llm-websocket/generic`.
        # AND we will pass `internal_call_id` as a metadata/variable.
        #
        # HOWEVER, the prompt says "Custom LLM" and we built `/llm-websocket/{call_id}`.
        # Let's try to stick to that.
        # If `register` supports `retell_llm_dynamic_variables`, we can pass `internal_call_id`.
        # Then the WebSocket (generic endpoint) can read `internal_call_id` from the "call_started" event variables?
        #
        # Let's Refactor `llm_websocket.py` to be smarter later.
        # For now, let's implement `register` and assume we pass vars.
        
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

