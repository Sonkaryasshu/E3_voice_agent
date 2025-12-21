import os
import json
from openai import OpenAI
from typing import List, Dict, Any

# Initialize OpenAI client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

SYSTEM_PROMPT = """
You are an expert Logistics Data Analyst. Your goal is to extract structured, actionable data from a conversation between a dispatcher AI and a truck driver.

### INPUT DATA
You will receive a `transcript_object` which is a list of messages with 'role', 'content', and 'timestamp' (ms).
Example: 
[
  {"role": "agent", "content": "Where are you?", "timestamp": 1000},
  {"role": "user", "content": "I'm on I-80 near Reno.", "timestamp": 3500}
]

### EXTRACTION GOAL
Extract the following fields. If a field is NOT mentioned or cannot be inferred, DO NOT include it in the JSON output (omit the key entirely). Do not return null or "null" or empty values.

For every extracted fact, you MUST provide:
1. `value`: The extracted information string or boolean.
2. `timestamp_ms`: The approximate timestamp (in milliseconds) from the transcript where this information was first discussed. Use the `timestamp` of the message from transcript.

### FIELDS TO EXTRACT
1. `call_outcome`: (String) REQUIRED. A concise, descriptive summary of the call's result. 
   - Examples: "In-Transit Update", "Arrival Confirmation", "Emergency Escalation", "Voicemail", "No Dialogue", "Rescheduled", "Wrong Number".
   - Be specific and capture the actual outcome even if unique (e.g., "Driver Refused Load").
   - If audio/transcript is empty or just "Hello?", use "No Dialogue".
   - Give priority to emergency over other outcomes.
2. `driver_status`: (String) e.g., "Driving", "Stopped", "Unloading", "Delayed", etc.
3. `current_location`: (String) The specific location mentioned. eg. "I-80 near Reno".
4. `eta`: (String) Estimated Time of Arrival. eg. "Tomorrow, 8:00 AM" or "23rd Dec, 2:00 PM".
5. `delay_reason`: (String) If delayed, why? e.g., "Heavy Traffic", "Weather"
6. `unloading_status`: (String) "Started", "Waiting", "Done", etc.
7. `pod_acknowledged`: (Boolean) Did they confirm they will handle POD?
8. `emergency_type`: (String) If emergency, what type? eg. "Accident", "Medical", "Mechanism Failure"
9. `safety_status`: (String) In case if an emergency, Is everyone safe? e.g. "Driver confirmed everyone is safe"
10. `injury_status`: (String) In case if an emergency, Any injuries? e.g. "No injuries reported"
11. `emergency_location`: (String) In case if an emergency, Specific location of emergency.
12. `load_secure`: (Boolean) In case if an emergency, Is the load secure?
13. `escalation_status`: (Boolean) Was call transferred or escalation promised? eg. "Connected to Human Dispatcher" or "Human callback promised"
14. any other fields that you think are relevant that agent may have asked.

### OUTPUT FORMAT
Return a SINGLE JSON object with this structure. Omit keys that are null/unknown. `call_outcome` is mandatory.
{
  "call_summary": "Check-in with driver John. He is in Phoenix...",
  "data_validity": "valid" | "no-transcript" | "noisy-transcript" | etc.,
  "extracted_data": {
    "driver_status": { "value": "...", "timestamp_ms": 1234 },
    "current_location": { "value": "...", "timestamp_ms": 5678 },
    ... (other fields)
  }
}

### RULES
- Be precise.
- If data is missing, omit the key from `extracted_data`, don't return null/empty values.
- If the user is uncooperative or the call is empty, can set `data_validity` to "unclear dialogue".
"""

def analyze_call_transcript(transcript_object: List[Dict[str, Any]], call_context: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Analyzes the call transcript using OpenAI to extract structured data with timestamps.
    """
    try:
        if not transcript_object:
            return {"call_summary": "No transcript available.", "data_validity": "invalid", "extracted_data": {}}

        # Add context to the user message
        context_str = ""
        if call_context:
            context_str = f"### CALL CONTEXT\n{json.dumps(call_context, indent=2)}\n\n"

        user_message = f"{context_str}### TRANSCRIPT\n{json.dumps(transcript_object, indent=2)}"
        
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            temperature=0.0
        )
        
        result_json = response.choices[0].message.content
        if not result_json:
            return {"error": "Empty response from OpenAI"}
            
        return json.loads(result_json)

    except Exception as e:
        print(f"Error in analysis service: {e}")
        return {
            "error": str(e),
            "call_summary": "Analysis failed due to an internal error.",
            "data_validity": "invalid"
        }
