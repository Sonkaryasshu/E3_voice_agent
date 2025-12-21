export interface Agent {
    id: string;
    name: string;
    system_prompt: string;
    voice_id: string;
    retell_agent_id?: string;
    voice_settings?: {
        interruption_sensitivity?: number;
        backchanneling_enabled?: boolean;
        filler_words?: boolean;
        responsiveness?: number;
        voice_temperature?: number;
        voice_speed?: number;
    };
    llm_settings?: {
        start_speaker?: string;
        begin_message?: string;
        begin_after_user_silence_ms?: number;
    };
    created_at?: string;
}

export interface Call {
    id: string;
    retell_call_id?: string;
    agent_id: string;
    driver_name: string;
    driver_phone: string;
    load_number: string;
    metadata?: Record<string, any>;
    status: string;
    transcript?: string;
    transcript_object?: Array<{
        role: string;
        content: string;
        timestamp?: number;
    }>;
    audio_url?: string;
    analysis_json?: Record<string, any>;
    created_at?: string;
}

export interface TriggerCallRequest {
    agent_id: string;
    driver_name: string;
    driver_phone: string;
    load_number: string;
    metadata?: Record<string, any>;
}

export interface CallResponse {
    status: string;
    call_id: string;
    retell_call_id: string;
}
