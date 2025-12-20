import os
import json
from openai import AsyncOpenAI
from app.database import supabase
from typing import AsyncGenerator, List, Dict, Any

client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Detailed Tools Definition
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "report_emergency",
            "description": "Call this IMMEDIATELY if the driver reports an emergency (accident, medical, breakdown, etc.). This transitions the call to emergency mode.",
            "parameters": {
                "type": "object",
                "properties": {
                    "emergency_type": {
                        "type": "string",
                        "enum": ["Accident", "Breakdown", "Medical", "Other"],
                        "description": "The category of the emergency."
                    },
                    "location": {
                        "type": "string",
                        "description": "The current location of the driver."
                    },
                    "injury_status": {
                        "type": "string",
                        "description": "Information about injuries (e.g. 'No injuries', 'Driver hurt')."
                    },
                    "load_secure": {
                        "type": "boolean",
                        "description": "Is the cargo safe/secure?"
                    }
                },
                "required": ["emergency_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "end_call_success",
            "description": "Call this when the driver check-in is complete and successful (all data gathered).",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["Driving", "Delayed", "Arrived", "Unloading"]},
                    "location": {"type": "string"},
                    "eta": {"type": "string"},
                    "delay_reason": {"type": "string"},
                    "unloading_status": {"type": "string"},
                    "pod_reminder_acknowledged": {"type": "boolean"}
                },
                "required": ["status"]
            }
        }
    }
]

class LLMService:
    def __init__(self, call_id: str):
        self.call_id = call_id
        # Default system prompt, we will enhance this in get_response based on dynamic vars
        self.system_prompt = """You are a professional logistics dispatcher for a trucking company. 
        Your goal is to conduct a check-call with a driver efficiently and politely.
        
        CRITICAL RULES:
        1. EMERGENCY OVERRIDE: If the driver mentions ANY emergency (accident, breakdown, injury), STOP your regular flow IMMEDIATELY. 
           - Ask for location and safety status if not provided.
           - Use the `report_emergency` tool.
           - Tell them you are connecting them to a human dispatcher.
        
        2. UNCOOPERATIVE DRIVER: If the driver gives short, one-word answers, be patient but probing. 
           - Example: "Could you be a bit more specific about where you are?"
           - Do not end the call until you have the required info, unless they are seemingly hostile/hanging up.
           
        3. NOISY ENVIRONMENT: If the user input seems garbled or empty (which might be indicated by system messages or context), 
           ask them to repeat calmly. "I'm sorry, the line is a bit static, could you say that again?"
        
        4. CONFLICTING DATA: If their location contradicts GPS (simulated), query it gently. "Our system shows you near X, is that right?"
        
        DATA TO COLLECT (Normal Flow):
        - Current Status (Driving, Delayed, Arrived, Unloading)
        - Location
        - ETA
        - Delay Reason (if any)
        - Unloading details (if at destination)
        - Remind them about Proof of Delivery (POD).
        
        Once you have all this, use `end_call_success`.
        """

    async def get_response(self, transcript: List[Dict[str, Any]], dynamic_vars: Dict[str, Any]) -> AsyncGenerator[str, None]:
        """
        Generates a streaming response from OpenAI.
        Handles Function Calling internally.
        """
        
        last_user_content = ""
        if transcript and transcript[-1]["role"] == "user":
             last_user_content = transcript[-1]["content"]

        # 1. Handle Silent/Garbled input (Simple Heuristic)
        # In a real system, Retell sends specific flags for "silence" or "no_speech". 
        # Here we just check empty string if that's how it's passed, or short non-informative content.
        if not last_user_content or len(last_user_content.strip()) < 2:
             yield "I didn't quite catch that. Could you please repeat?"
             return

        # 2. Construct Prompt with Context
        driver_name = dynamic_vars.get('driver_name', 'Driver')
        load_number = dynamic_vars.get('load_number', 'Unknown')
        
        # Merge Extra Metadata if any
        # We assume dynamic_vars includes fields from 'metadata' column if passed correctly in calls.trigger
        extra_context = ""
        for key, val in dynamic_vars.items():
            if key not in ["driver_name", "load_number", "internal_call_id", "voice_settings"]:
                extra_context += f"{key.replace('_', ' ').title()}: {val}\n"

        context_str = f"\n\nCONTEXT:\nCalling Driver: {driver_name}\nLoad Number: {load_number}\n{extra_context}"
        
        messages = [{"role": "system", "content": self.system_prompt + context_str}]
        messages.extend(transcript)

        try:
            stream = await client.chat.completions.create(
                model="gpt-4-turbo-preview", 
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                stream=True,
                temperature=dynamic_vars.get('voice_settings', {}).get('voice_temperature', 1.0) # Use dynamic settings if available
            )

            async for chunk in stream:
                # Text content
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                
                # Tool calls (For streaming, we usually need to accumulate the tool call)
                # This is a simplification. OpenAI SDK's stream does not yield fully formed tool calls in one chunk usually.
                # However, for the Retell WebSocket "response" event, we often just want the text to speak.
                # If there is a tool call, we might not speak anything, or speak a confirmation.
                # Since Retell likely handles the TTS of the text yielded.
                
                # CRITICAL: If a tool is called, we should execute it. 
                # Integrating streaming tool execution is complex. 
                # For this task, we will check 'finish_reason' or accumulate tool calls.
                # BUT, `yield` here sends text to Retell to speak.
                # If we have a tool call, we usually stop speaking or speak "One moment..."
                
                if chunk.choices[0].delta.tool_calls:
                    # In a real robust implementation, we accumulate. 
                    # Here we'll rely on the non-streaming fallback or just accept that 
                    # we might miss the tool execution in this specific generator if we only yield strings.
                    # WAIT: The caller (llm_websocket) expects strings for TTS.
                    # If we need to execute a tool, we should probably do it and maybe yield a result message?
                    
                    # For this Take-Home simplicity:
                    # We will NOT execute tools inside this generator for the *speech* stream.
                    # We need a separate mechanism or we need to buffer the whole response if it's a tool call.
                    # Let's pivot: The caller needs to know if it's a tool call.
                    pass

        except Exception as e:
            yield f"I'm sorry, I'm having trouble connecting. {str(e)}"

    async def check_and_execute_tools(self, transcript: List[Dict[str, Any]], dynamic_vars: Dict[str, Any]) -> Dict[str, Any]:
        """
        Helper to check for tool calls in a non-streaming way to execute side effects.
        We call this in parallel or after the stream in the websocket handler to ensure DB updates.
        """
        driver_name = dynamic_vars.get('driver_name', 'Driver')
        load_number = dynamic_vars.get('load_number', 'Unknown')
        context_str = f"\n\nCONTEXT:\nCalling Driver: {driver_name}\nLoad Number: {load_number}\n"
        messages = [{"role": "system", "content": self.system_prompt + context_str}]
        messages.extend(transcript)
        
        response = await client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=messages,
            tools=TOOLS,
            tool_choice="auto" 
        )
        
        message = response.choices[0].message
        if message.tool_calls:
            for tool_call in message.tool_calls:
                await self.handle_tool_call(tool_call.function.name, json.loads(tool_call.function.arguments))
            return {"tool_executed": True}
        return {"tool_executed": False}

    async def handle_tool_call(self, tool_name: str, args: Dict[str, Any]):
        """
        Executes the tool logic (updating DB).
        """
        print(f"Executing Tool: {tool_name} with args {args}")
        if tool_name == "report_emergency":
             supabase.table("calls").update({
                "status": "emergency",
                "analysis_json": args
             }).eq("id", self.call_id).execute()
             
        elif tool_name == "end_call_success":
             supabase.table("calls").update({
                "status": "completed",
                "analysis_json": args
             }).eq("id", self.call_id).execute()

