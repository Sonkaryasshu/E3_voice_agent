from fastapi import APIRouter, Request, HTTPException
from app.database import supabase
import json

router = APIRouter(prefix="/api/webhook", tags=["webhook"])

@router.post("/retell_status")
async def handle_retell_status(request: Request):
    """
    Handles call status updates (call_ended, etc.)
    Triggered by Retell webhook configuration.
    """
    try:
        payload = await request.json()
        event = payload.get("event")
        
        print(f"[WEBHOOK] ========== RECEIVED WEBHOOK ==========")
        print(f"[WEBHOOK] Event: {event}")
        print(f"[WEBHOOK] Full payload keys: {list(payload.keys())}")
        
        # Retell sends call data nested in a 'call' object
        call_data = payload.get("call", {})
        call_id = call_data.get("call_id")
        
        print(f"[WEBHOOK] Call ID: {call_id}")
        
        if event == "call_ended":
            # Extract all relevant data from the call object
            transcript = call_data.get("transcript", "")
            transcript_object = call_data.get("transcript_object", [])
            recording_url = call_data.get("recording_url", "")
            call_analysis = call_data.get("call_analysis", {})
            
            # If transcript is empty, try building from transcript_object
            if not transcript and transcript_object:
                transcript = "\n".join([f"{t['role']}: {t['content']}" for t in transcript_object])
            
            print(f"[WEBHOOK] Transcript length: {len(transcript)} chars")
            print(f"[WEBHOOK] Transcript object entries: {len(transcript_object)}")
            print(f"[WEBHOOK] Recording URL: {recording_url}")
            print(f"[WEBHOOK] Analysis data: {call_analysis.keys() if call_analysis else 'None'}")

            update_data = {
                "status": "completed",
                "transcript": transcript,
                "transcript_object": transcript_object,  # Save structured data
                "audio_url": recording_url,
                "analysis_json": call_analysis  # Save analysis
            }
            
            print(f"[WEBHOOK] Updating call with retell_call_id={call_id}")
            
            # Update database
            result = supabase.table("calls").update(update_data).eq("retell_call_id", call_id).execute()
            
            print(f"[WEBHOOK] Update successful. Rows affected: {len(result.data)}")
            if result.data:
                print(f"[WEBHOOK] Updated call: {result.data[0].get('id')}")
            else:
                print(f"[WEBHOOK] WARNING: No rows updated! Call ID {call_id} not found in database")
            
        return {"received": True}

    except Exception as e:
        print(f"[WEBHOOK] ========== ERROR ==========")
        print(f"[WEBHOOK] Error: {e}")
        import traceback
        traceback.print_exc()
        # Return 200 to acknowledge receipt even on error to prevent retries
        return {"received": True, "error": str(e)}

