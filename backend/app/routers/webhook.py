from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from app.database import supabase
from app.services.analysis import analyze_call_transcript
import json
import asyncio

router = APIRouter(prefix="/api/webhook", tags=["webhook"])

@router.post("/retell-status")
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
        
        # LOGGING: Dump full payload to file for inspection
        try:
            with open("webhook_payloads.log", "a") as f:
                f.write(f"--- Event: {event} ---\n")
                f.write(json.dumps(payload, indent=2))
                f.write("\n\n")
        except Exception as log_err:
            print(f"[WEBHOOK] Failed to log to file: {log_err}")
        
        # Retell sends call data nested in a 'call' object
        call_data = payload.get("call", {})
        call_id = call_data.get("call_id")
        
        print(f"[WEBHOOK] Call ID: {call_id}")
        
        if event == "call_started":
            print(f"[WEBHOOK] Call Started: {call_id}")
            supabase.table("calls").update({"status": "in-progress"}).eq("retell_call_id", call_id).execute()

        elif event == "call_ended":
            # Extract all relevant data from the call object
            transcript_object = call_data.get("transcript_object", [])
            recording_url = call_data.get("recording_url", "")
            
            # Print minimal info
            print(f"[WEBHOOK] Transcript object entries: {len(transcript_object)}")
            print(f"[WEBHOOK] Recording URL: {recording_url}")

            # 1. Immediate Update: Completed
            update_data = {
                "status": "completed",
                "transcript_object": transcript_object,
                "audio_url": recording_url,
            }
            
            print(f"[WEBHOOK] Updating call with retell_call_id={call_id}")
            supabase.table("calls").update(update_data).eq("retell_call_id", call_id).execute()

            # 2. Async Analysis
            # We do this after the initial update so the UI shows "Completed" immediately.
            # Then we upgrade it to "Analyzed".
            
            print("[WEBHOOK] Starting OpenAI analysis...")
            # Run analysis asynchronously or synchronously
            context = {
                "driver_name": call_data.get("driver_name"),
                "load_number": call_data.get("load_number"),
                "metadata": call_data.get("metadata")
            }
            analysis_result = analyze_call_transcript(transcript_object, context)
            print(f"[WEBHOOK] Analysis complete. Valid: {analysis_result.get('data_validity')}")
            
            # Update call with analysis
            supabase.table("calls").update({
                "analysis_json": analysis_result,
                "status": "analyzed"
            }).eq("retell_call_id", call_id).execute()
            print("[WEBHOOK] Call upgraded to 'analyzed'.")
            
        return {"received": True}

    except Exception as e:
        print(f"[WEBHOOK] ========== ERROR ==========")
        print(f"[WEBHOOK] Error: {e}")
        import traceback
        traceback.print_exc()
        # Return 200 to acknowledge receipt even on error to prevent retries. As we already have UI driven retries.
        return {"received": True, "error": str(e)}

