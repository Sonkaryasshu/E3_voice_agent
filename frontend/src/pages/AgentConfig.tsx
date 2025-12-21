import { useEffect, useState, useRef } from "react";
import type { Agent } from "../types";
import { agentApi } from "../api/client";
import { Plus, Save, Bot, Settings, Trash2, Search, Check } from "lucide-react";

// Voice Combobox Component
const VoiceCombobox = ({
    voices,
    value,
    onChange
}: {
    voices: any[],
    value: string,
    onChange: (voiceId: string) => void
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredVoices = voices.filter(v =>
        v.voice_name.toLowerCase().includes(search.toLowerCase()) ||
        v.provider.toLowerCase().includes(search.toLowerCase())
    );

    const selectedVoice = voices.find(v => v.voice_id === value);

    return (
        <div className="relative" ref={wrapperRef}>
            <div
                className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white flex items-center justify-between cursor-pointer hover:border-slate-400 focus:ring-2 focus:ring-blue-500 transition-all"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={value ? "text-slate-900" : "text-slate-400"}>
                    {selectedVoice ? `${selectedVoice.voice_name} (${selectedVoice.provider})` : "Select a Voice..."}
                </span>
                <span className="text-slate-400">▼</span>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search voices..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-slate-200 outline-none focus:border-blue-500"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto max-h-48">
                        {filteredVoices.length === 0 ? (
                            <div className="p-3 text-center text-sm text-slate-400">No voices found</div>
                        ) : (
                            filteredVoices.map(voice => (
                                <div
                                    key={voice.voice_id}
                                    onClick={() => {
                                        onChange(voice.voice_id);
                                        setIsOpen(false);
                                        setSearch("");
                                    }}
                                    className={`px-4 py-2 text-sm hover:bg-slate-50 cursor-pointer flex justify-between items-center ${value === voice.voice_id ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                                >
                                    <span>
                                        <span className="font-medium">{voice.voice_name}</span>
                                        <span className="text-xs text-slate-500 ml-2">({voice.provider})</span>
                                    </span>
                                    {value === voice.voice_id && <Check size={14} />}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const AgentConfig = () => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [voices, setVoices] = useState<any[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Agent> & { showAdvanced?: boolean }>({
        name: "",
        system_prompt: "",
        voice_id: "",
        voice_settings: {
            interruption_sensitivity: 0.9,
            backchanneling_enabled: true,
            filler_words: true,
            responsiveness: 1.0,
            voice_temperature: 1.0
        },
        llm_settings: {
            start_speaker: "agent",
            begin_message: "",
            begin_after_user_silence_ms: undefined
        },
        showAdvanced: false
    });

    useEffect(() => {
        loadAgents();
        loadVoices();
    }, []);

    const loadVoices = async () => {
        try {
            const data = await agentApi.getVoices();
            setVoices(data);
        } catch (error) {
            console.error("Failed to load voices", error);
        }
    };

    const loadAgents = async () => {
        try {
            const data = await agentApi.list();
            setAgents(data);
        } catch (error) {
            console.error("Failed to load agents", error);
        }
    };

    const handleSelectAgent = (agent: Agent) => {
        setSelectedAgent(agent);
        setFormData(agent);
        setIsEditing(true);
    };

    const handleCreateNew = () => {
        setSelectedAgent(null);
        setFormData({
            name: "New Agent",
            system_prompt: `## Identity
You are Chloe from the dispatch team at SuperCool Logistics calling {{driver_name}} over the phone to check in on load {{load_number}}. You are a professional, supportive, and efficient dispatcher who cares deeply about driver safety and operational clarity. You understand the pressures of the road and always remain calm and helpful.

## Style Guardrails
* Be Concise: Respond succinctly, addressing one topic at most.
* Embrace Variety: Use diverse language and rephrasing to enhance clarity without repeating content.
* Be Conversational: Use everyday language, making the chat feel like talking to a colleague, not a robot.
* Be Proactive: Lead the conversation, often wrapping up with a question or next-step suggestion.
* Avoid multiple questions in a single response.
* Get clarity: If the driver only partially answers a question, or if the answer is unclear, keep asking to get clarity.
* Use natural phrasing for locations and times (like "I-10 near Phoenix" or "tomorrow morning at 8").

## Response Guideline
* Adapt and Guess: Try to understand transcripts that may contain transcription errors or road noise. Avoid mentioning "transcription error" in the response.
* Stay in Character: Keep conversations within your role's scope, guiding them back creatively without repeating.
* Ensure Fluid Dialogue: Respond in a role-appropriate, direct manner to maintain a smooth conversation flow.
* Be Supportive: Even if the driver is frustrated, short with you, or stressed, remain calm and helpful. Never argue or sound confrontational.

## Task
You will follow the steps below. Do not skip steps, and only ask up to one question in response. 

Be mindful about questions you are asking, don't ask questions that user has already answered in response to previous questions. like user may have answered reson for delay in previous question, don't ask again. you may confirm with user if you are not sure.

🚨 EMERGENCY OVERRIDE: If at ANY time the driver mentions an emergency (accident, crash, breakdown, blowout, injury, medical issue, unsafe situation), IMMEDIATELY stop the standard flow and jump to the Emergency Protocol section below.

If at any time the driver is angry, requests a human, or explicitly refuses to continue, politly say that a human dispatcher will be calling them back and end the call after saying goodbye.

Be mindful about data shared with Additional Context afield at bottom of the page. it may contain existing data, few additional questions to ask, and few notes. you should use this data in conversation and try to get answers to the questions asked.

### Standard Flow: (shared sentences are for example, you can use them as is or modify them as per your need)

1. Begin with a friendly self-introduction and verify the driver.
   - "Hi {{driver_name}}, this is Chloe from SuperCool dispatch. I'm calling about load {{load_number}}. Is this a good time for a quick check-in?"
   - If driver says they're busy, ask when is a good time to call back, then say goodbye.
   - If not the right person, apologize and say goodbye.

2. Ask for the driver's current status with an open-ended question.
   - "Can you give me a quick update on where you're at with this load?"
   - Listen carefully to determine if they are: driving, delayed, arrived, or currently unloading.

3. Based on the driver's status, ask follow-up questions to gather details:

   If driving:
   - Ask about current location: "Where are you right now?"
   - Ask about ETA: "When do you expect to arrive?"
   - Ask about delays: "Are you running on schedule, or have you hit any delays?"
     - If delayed, ask: "What's causing the delay?"

   If arrived/unloading:
   - Ask about unloading status: "Have you started unloading yet, or are you waiting on a dock?"

4. Remind the driver about POD (Proof of Delivery).
   - "Before I let you go, remember to get the POD signed and uploaded to the app when you're done, okay?"
   - Wait for acknowledgment.

5. Ask if they have any questions or need anything.
   - "Is there anything else you need from dispatch, or any questions?"
   - If no questions, thank them and say goodbye: "Appreciate the update. Drive safe out there!"

### Emergency Protocol:

If the driver mentions ANY emergency keywords or sounds distressed: accident, crash, breakdown, blowout, tire, injury, hurt, medical, unsafe, help, emergency, etc.

Immediately:

1. Break from standard flow (No need to gather standard flow questions) and stay calm and supportive: "I understand this is serious. I'm here to help you right away."

2. Gather critical information (ask these based on the data available, one at a time):
   - "First, is everyone safe right now?"
   - "Is anyone injured or hurt?"
   - "Where exactly are you? Can you give me a highway, mile marker, or exit number?"
   - "What type of emergency is this?"
   - "Is the load still secure?"
   - "Is police/fire is informed or I should inform them?"
   - etc.

3. Reassure and close:
   - "I have all the info I need. I am notifying the emergency team and human dispatch right now. Help is on the way. Please stay safe."
   - Say goodbye.

## Additional Context
{{metadata}}

## Important Notes
- Never rush the driver or sound impatient
- If they give one-word answers, try gentle probing once or twice
- If connection is bad/noisy, offer to call back
- Trust the driver's response over existing data like answered location over GPS data if there's a conflict
- Always end on a positive, supportive note`,
            voice_id: "", // User must select
            voice_settings: {},
            llm_settings: {
                start_speaker: "agent",
                begin_message: "",
                begin_after_user_silence_ms: 2000
            }
        });
        setIsEditing(true);
    };

    const handleSave = async () => {
        try {
            if (selectedAgent && selectedAgent.id) {
                // Update existing
                await agentApi.update(selectedAgent.id, formData);
            } else {
                // Create new
                await agentApi.create(formData);
            }
            await loadAgents();

            if (!selectedAgent?.id) {
                setIsEditing(false);
            }
            alert("Agent saved successfully!");
        } catch (error) {
            console.error("Failed to save agent", error);
            alert("Failed to save agent");
        }
    };

    const handleDelete = async () => {
        if (!selectedAgent?.id) return;
        if (!confirm(`Are you sure you want to delete "${selectedAgent.name}"? This cannot be undone.`)) return;

        try {
            await agentApi.delete(selectedAgent.id);
            await loadAgents();
            setSelectedAgent(null);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to delete agent", error);
            alert("Failed to delete agent");
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sidebar List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="font-semibold text-slate-700">Agents</h2>
                    <button
                        onClick={handleCreateNew}
                        className="p-1.5 hover:bg-white rounded-md transition-colors text-blue-600 border border-transparent hover:border-slate-200 hover:shadow-sm"
                    >
                        <Plus size={18} />
                    </button>
                </div>
                <div className="divide-y divide-slate-100">
                    {agents.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-sm">No agents found</div>
                    )}
                    {agents.map((agent) => (
                        <button
                            key={agent.id}
                            onClick={() => handleSelectAgent(agent)}
                            className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center space-x-3 ${selectedAgent?.id === agent.id ? "bg-blue-50 border-l-4 border-blue-500" : ""}`}
                        >
                            <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                                <Bot size={16} />
                            </div>
                            <div>
                                <div className="font-medium text-slate-900">{agent.name}</div>
                                <div className="text-xs text-slate-500 truncate w-32">{agent.voice_id}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Edit Area */}
            <div className="md:col-span-2">
                {isEditing ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">
                                {selectedAgent?.id ? "Edit Agent" : "Create New Agent"}
                            </h2>
                            <div className="flex items-center gap-3">
                                {selectedAgent?.id && (
                                    <button
                                        onClick={handleDelete}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Agent"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                                <button
                                    onClick={handleSave}
                                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                                >
                                    <Save size={18} />
                                    <span>{selectedAgent?.id ? "Update Agent" : "Create Agent"}</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Agent Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="e.g. Logistics Dispatcher"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Voice Selection</label>
                                <VoiceCombobox
                                    voices={voices}
                                    value={formData.voice_id || ""}
                                    onChange={(voiceId) => setFormData({ ...formData, voice_id: voiceId })}
                                />
                            </div>

                            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                <button
                                    onClick={() => setFormData({ ...formData, showAdvanced: !formData.showAdvanced })}
                                    className="flex items-center justify-between w-full text-left font-medium text-slate-700 mb-2 focus:outline-none"
                                >
                                    <span className="flex items-center gap-2">
                                        <Settings size={16} />
                                        Advanced Voice Settings
                                    </span>
                                    <span className="text-xs text-blue-600 hover:underline">{formData.showAdvanced ? "Hide" : "Show"}</span>
                                </button>

                                {formData.showAdvanced && (
                                    <div className="space-y-4 pt-4 border-t border-slate-200 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {/* Interruption Sensitivity */}
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                                                    Interruption Sensitivity
                                                    <span className="text-slate-400 cursor-help" title="How easily the agent stops talking when the user speaks. Lower = harder to interrupt.">ⓘ</span>
                                                </label>
                                                <span className="text-xs text-slate-500">{formData.voice_settings?.interruption_sensitivity ?? 0.8}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.0"
                                                max="1.0"
                                                step="0.1"
                                                value={formData.voice_settings?.interruption_sensitivity ?? 0.8}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    voice_settings: { ...formData.voice_settings, interruption_sensitivity: parseFloat(e.target.value) }
                                                })}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>

                                        {/* Responsiveness */}
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                                                    Responsiveness
                                                    <span className="text-slate-400 cursor-help" title="How fast the agent responds. 1.0 is normal. Higher is faster but might cut off user.">ⓘ</span>
                                                </label>
                                                <span className="text-xs text-slate-500">{formData.voice_settings?.responsiveness ?? 1.0}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.0"
                                                max="1.0"
                                                step="0.1"
                                                value={formData.voice_settings?.responsiveness ?? 1.0}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    voice_settings: { ...formData.voice_settings, responsiveness: parseFloat(e.target.value) }
                                                })}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>

                                        {/* Voice Temperature */}
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                                                    Creativity (Temperature)
                                                    <span className="text-slate-400 cursor-help" title="Higher values make the agent more creative/varied. Lower values make it more consistent.">ⓘ</span>
                                                </label>
                                                <span className="text-xs text-slate-500">{formData.voice_settings?.voice_temperature ?? 1.0}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.0"
                                                max="2.0"
                                                step="0.1"
                                                value={formData.voice_settings?.voice_temperature ?? 1.0}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    voice_settings: { ...formData.voice_settings, voice_temperature: parseFloat(e.target.value) }
                                                })}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>

                                        {/* Toggles */}
                                        <div className="flex items-center gap-6">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.voice_settings?.backchanneling_enabled ?? true}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        voice_settings: { ...formData.voice_settings, backchanneling_enabled: e.target.checked }
                                                    })}
                                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-slate-700">Enable Backchanneling</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.voice_settings?.filler_words ?? true}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        voice_settings: { ...formData.voice_settings, filler_words: e.target.checked }
                                                    })}
                                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-slate-700">Use Filler Words</span>
                                            </label>
                                        </div>

                                        {/* LLM Settings Section */}
                                        <div className="pt-4 border-t border-slate-200 mt-4">
                                            <h4 className="font-medium text-slate-700 mb-3">Conversation Settings</h4>

                                            {/* Who Speaks First */}
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Who Speaks First?</label>
                                                <select
                                                    value={formData.llm_settings?.start_speaker || "agent"}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        llm_settings: { ...formData.llm_settings, start_speaker: e.target.value }
                                                    })}
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                >
                                                    <option value="agent">Agent speaks first</option>
                                                    <option value="user">Wait for user to speak</option>
                                                </select>
                                            </div>

                                            {/* Begin Message */}
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                                    Opening Message
                                                    <span className="text-slate-400 text-xs ml-1">(Optional)</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.llm_settings?.begin_message || ""}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        llm_settings: { ...formData.llm_settings, begin_message: e.target.value }
                                                    })}
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                    placeholder="e.g., Hi, this is dispatch calling about your load..."
                                                />
                                                <p className="text-xs text-slate-500 mt-1">Leave empty to let AI generate greeting</p>
                                            </div>

                                            {/* Silence Timeout */}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                                    User Silence Timeout (ms)
                                                    <span className="text-slate-400 text-xs ml-1">(Optional)</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    value={formData.llm_settings?.begin_after_user_silence_ms || ""}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        llm_settings: {
                                                            ...formData.llm_settings,
                                                            begin_after_user_silence_ms: e.target.value ? parseInt(e.target.value) : undefined
                                                        }
                                                    })}
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                    placeholder="2000"
                                                    min="500"
                                                    step="100"
                                                />
                                                <p className="text-xs text-slate-500 mt-1">How long to wait before agent starts (if user speaks first)</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">System Prompt</label>
                                <div className="text-xs text-slate-500 mb-2">
                                    Define the agent's persona and logic. Use variables like <code className="bg-slate-100 px-1 rounded">{'{driver_name}'}</code>.
                                </div>
                                <textarea
                                    value={formData.system_prompt}
                                    onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                                    className="w-full h-64 px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm leading-relaxed"
                                    placeholder="You are a helpful assistant..."
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center flex flex-col items-center justify-center h-full text-slate-500">
                        <div className="bg-slate-50 p-4 rounded-full mb-4">
                            <Settings size={32} className="text-slate-400" />
                        </div>
                        <p className="text-lg">Select an agent to configure or create a new one.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
