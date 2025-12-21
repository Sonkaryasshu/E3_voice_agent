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
Extract the following fields. If a field is NOT mentioned or cannot be inferred, set its valid key to false or null.
For every extracted fact, you MUST provide:
1. `value`: The extracted information string or boolean.
2. `timestamp_ms`: The approximate timestamp (in milliseconds) from the transcript where this information was first spoken by the USER. Use the `timestamp` of the user's message.

### FIELDS TO EXTRACT
1. `driver_status`: (String) e.g., "Driving", "Stopped", "Unloading", "Delayed".
2. `current_location`: (String) The specific location mentioned.
3. `eta`: (String) Estimated Time of Arrival.
4. `delay_reason`: (String) Why they are delayed (Traffic, Weather, Breakdown, None).
5. `pod_acknowledged`: (Boolean) Did they agree to upload the Proof of Delivery?
6. `emergency_type`: (String) "None", "Accident", "Medical", "Mechanism Failure".
7. `load_secure`: (Boolean) Is the cargo safe?
8. `safety_status`: (String) Are specific people safe?

### OUTPUT FORMAT
Return a SINGLE JSON object with this structure:
{
  "call_summary": "A brief 1-sentence summary of the call outcome.",
  "data_validity": "valid" | "invalid" | "partial", (Invalid if transcript is empty, garbled, or no useful info),
  "extracted_data": {
    "driver_status": { "value": "...", "timestamp_ms": 1234 },
    "current_location": { "value": "...", "timestamp_ms": 5678 },
    ... (other fields)
  }
}

### RULES
- Be precise.
- If data is missing, omit the key from `extracted_data` or set it to null.
- If the user is uncooperative or the call is empty, set `data_validity` to "invalid".
"""

def analyze_call_transcript(transcript_object: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyzes the call transcript using OpenAI to extract structured data with timestamps.
    """
    try:
        # Prepare the conversation for the model
        # We pass the raw object so the model can see timestamps
        user_message = json.dumps(transcript_object, indent=2)
        
        response = client.chat.completions.create(
            model="gpt-4-turbo-preview",  # Or gpt-3.5-turbo-json if preferred for speed
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Analyze this transcript:\n{user_message}"}
            ],
            temperature=0.1
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
