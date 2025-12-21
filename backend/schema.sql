-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents Table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    retell_agent_id TEXT,
    system_prompt TEXT NOT NULL,
    voice_id TEXT NOT NULL,
    
    -- Advanced Voice Settings (JSONB)
    -- Expected Structure:
    -- {
    --   "interruption_sensitivity": 0.8,
    --   "backchannel_frequency": 0.9,
    --   "enable_backchannel": true,
    --   "voice_speed": 1.0,
    --   "voice_temperature": 1.0,
    --   "filler_words": true
    -- }
    voice_settings JSONB DEFAULT '{}'::jsonb,
    
    -- LLM Settings (JSONB)
    -- Expected Structure:
    -- {
    --   "start_speaker": "agent",
    --   "begin_message": "",
    --   "begin_after_user_silence_ms": 2000
    -- }
    llm_settings JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calls Table
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retell_call_id TEXT UNIQUE,
    agent_id UUID REFERENCES agents(id),
    
    -- Core Context
    driver_name TEXT,
    driver_phone TEXT,
    load_number TEXT,
    
    -- Extra Context (JSONB) for flexible data
    -- Example: {"last_location": "Phoenix API", "driver_rating": 4.5}
    metadata JSONB DEFAULT '{}'::jsonb,
    
    status TEXT DEFAULT 'initiated',
    transcript_object JSONB, -- Array of {role, content, timestamp} for waterfall UI
    audio_url TEXT,
    
    -- Structured Analysis Data (Result of the call)
    analysis_json JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
