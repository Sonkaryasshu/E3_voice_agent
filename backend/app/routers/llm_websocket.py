from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.llm_logic import LLMService
import json
import asyncio

router = APIRouter(tags=["llm_websocket"])

@router.websocket("/llm-websocket/{call_id}")
async def websocket_endpoint(websocket: WebSocket, call_id: str):
    await websocket.accept()
    print(f"WebSocket connected for call: {call_id}")
    
    # Initialize LLM Service with call_id. 
    # Note: In a production "Retell Agent" setup, we might hit a generic /llm-websocket endpoint
    # and need to parse call_id from the first 'call_started' message. 
    # But for now, we assume we can parameterize the URL or use this specific endpoint mapping.
    llm_service = LLMService(call_id=call_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            event = json.loads(data)
            
            # Identify the event type
            interaction_type = event.get("interaction_type")
            
            if interaction_type == "call_started":
                # Ensure we have the latest call context
                print(f"Call started event received for {call_id}: {event}")
                real_call_id = event.get("call_id")
                if real_call_id:
                    print(f"Switching context to real call_id: {real_call_id}")
                    # Re-initialize service with the actual Retell Call ID
                    # Note: We need to make sure we can map Retell Call ID to Internal Call ID if needed
                    # But LLMService currently uses 'call_id'. 
                    # If we use Internal ID in DB, we need to lookup Internal ID by Retell ID here?
                    # logic: 
                    # 1. We registered the call and saved 'retell_call_id' in DB.
                    # 2. So we can find the internal ID using 'retell_call_id'.
                    # Let's assume LLMService handles lookup or we do it here.
                    # For simplicity, let's update LLMService to be able to look up by Retell ID if the ID format looks like one.
                    llm_service = LLMService(call_id=real_call_id)
                continue

            if interaction_type == "response_required":
                # Retell sends the full transcript history
                transcript_history = event.get("transcript", [])
                response_id = event.get("response_id")
                
                # Stream response from OpenAI
                async for chunk in llm_service.get_response(transcript_history, {}):
                     if chunk:
                        response_event = {
                            "response_id": response_id,
                            "content": chunk,
                            "content_complete": False,
                            "end_call": False
                        }
                        await websocket.send_text(json.dumps(response_event))
                
                # Send complete
                await websocket.send_text(json.dumps({
                    "response_id": response_id,
                    "content": "",
                    "content_complete": True,
                    "end_call": False
                }))

                # Post-Response: Check if any tools need to be executed (side-effects)
                # We do this asynchronously to not block audio
                asyncio.create_task(llm_service.check_and_execute_tools(transcript_history, {}))

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for call: {call_id}")
    except Exception as e:
        print(f"Error in WebSocket: {e}")
        try:
            await websocket.close()
        except:
            pass
