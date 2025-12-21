import { useEffect, useState } from "react";
import { callApi, agentApi } from "../api/client";
import { WebCallButton } from "../components/WebCallButton";
import { CallAnalysis } from "../components/CallAnalysis";
import { TranscriptViewer } from "../components/TranscriptViewer";
import type { Agent, Call, TriggerCallRequest } from "../types";
import clsx from "clsx";
import { PhoneCall, Truck, Clock, Smartphone, Activity, RefreshCw } from 'lucide-react';

export const Dashboard = () => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [calls, setCalls] = useState<Call[]>([]);
    const [analyzingCallId, setAnalyzingCallId] = useState<string | null>(null);


    // Trigger Form State
    const [selectedAgentId, setSelectedAgentId] = useState<string>("");
    const [triggerForm, setTriggerForm] = useState<Omit<TriggerCallRequest, "agent_id">>({
        driver_name: "",
        driver_phone: "",
        load_number: "",
        metadata: {}
    });
    const [metadataText, setMetadataText] = useState("");

    // Selected Call for Details
    const [selectedCall, setSelectedCall] = useState<Call | null>(null);

    // Audio Sync State
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        const audio = document.getElementById("main-audio-player") as HTMLAudioElement;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        audio.addEventListener("timeupdate", updateTime);
        return () => audio.removeEventListener("timeupdate", updateTime);
    }, [selectedCall?.id]); // Re-attach listener when call changes

    useEffect(() => {
        loadData();
        const interval = setInterval(loadCalls, 5000); // Poll for updates
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        await Promise.all([loadAgents(), loadCalls()]);
    };

    const loadAgents = async () => {
        try {
            const data = await agentApi.list();
            setAgents(data);
            if (data.length > 0 && !selectedAgentId) {
                setSelectedAgentId(data[0].id);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const loadCalls = async () => {
        try {
            // Backend needs to implement list calls
            const data = await callApi.list();
            // Sort by created_at desc
            setCalls(data.sort((a: Call, b: Call) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()));
        } catch (e) {
            console.error(e);
        }
    };

    const handleTriggerCall = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAgentId) {
            alert("Please select an agent");
            return;
        }
        try {
            await callApi.trigger({
                agent_id: selectedAgentId,
                ...triggerForm
            });
            alert("Call triggered successfully!");
            setTriggerForm({ driver_name: "", driver_phone: "", load_number: "", metadata: {} });
            setMetadataText("");
            loadCalls();
        } catch (e) {
            console.error(e);
            alert("Failed to trigger call");
        }
    };

    const handleReAnalyze = async (callId: string) => {
        if (analyzingCallId) return;
        setAnalyzingCallId(callId);
        try {
            await callApi.analyze(callId);
            loadCalls();
            // If selected call is the one we analyzed, refresh details
            if (selectedCall && selectedCall.id === callId) {
                // Reload call details individually or just rely on loadCalls update
                const updated = await callApi.get(callId);
                setSelectedCall(updated);
            }
            alert("Analysis re-run successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to re-analyze call");
        } finally {
            setAnalyzingCallId(null);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN: Trigger & Call List */}
            <div className="lg:col-span-1 space-y-8">
                {/* Trigger Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                        <Smartphone className="mr-2 text-blue-600" size={20} />
                        Trigger Test Call
                    </h2>
                    <form onSubmit={handleTriggerCall} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Agent</label>
                            <select
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={selectedAgentId}
                                onChange={(e) => setSelectedAgentId(e.target.value)}
                            >
                                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Driver Name</label>
                            <input
                                type="text"
                                required
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={triggerForm.driver_name}
                                onChange={(e) => setTriggerForm({ ...triggerForm, driver_name: e.target.value })}
                                placeholder="Michael Scott"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                            <input
                                type="tel"
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={triggerForm.driver_phone}
                                onChange={(e) => setTriggerForm({ ...triggerForm, driver_phone: e.target.value })}
                                placeholder="+15550001234"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Load Number</label>
                            <input
                                type="text"
                                required
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={triggerForm.load_number}
                                onChange={(e) => setTriggerForm({ ...triggerForm, load_number: e.target.value })}
                                placeholder="1234-ABC"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Additional Context</label>
                            <textarea
                                rows={3}
                                value={metadataText}
                                onChange={(e) => setMetadataText(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xs"
                                placeholder='Type instructions or paste JSON like {"condition": "traffic"}'
                            />
                        </div>
                        <WebCallButton
                            agentId={selectedAgentId}
                            driverName={triggerForm.driver_name}
                            driverPhone={triggerForm.driver_phone}
                            loadNumber={triggerForm.load_number}
                            metadata={(() => {
                                try {
                                    return JSON.parse(metadataText || "{}");
                                } catch {
                                    return { context: metadataText };
                                }
                            })()}
                            onCallStart={() => loadCalls()}
                            onCallEnd={() => loadCalls()}
                        />
                    </form>
                </div>

                {/* Recent Calls List */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col max-h-[600px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h2 className="font-bold text-slate-700">Recent Calls</h2>
                    </div>
                    <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                        {calls.length === 0 && <div className="p-6 text-center text-slate-400">No calls yet</div>}
                        {calls.map(call => (
                            <div
                                key={call.id}
                                onClick={() => setSelectedCall(call)}
                                className={clsx(
                                    "p-4 cursor-pointer hover:bg-slate-50 transition-colors",
                                    selectedCall?.id === call.id ? "bg-blue-50 border-l-4 border-blue-500" : "border-l-4 border-transparent"
                                )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div>
                                        <span className="font-semibold text-slate-900 block">{call.driver_name}</span>
                                        <span className="text-xs text-slate-500">
                                            {agents.find(a => a.id === call.agent_id)?.name || "Unknown Agent"}
                                        </span>
                                    </div>
                                    <StatusBadge status={call.status} />
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-2 mb-1">
                                    <Truck size={12} /> Load #{call.load_number}
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-2">
                                    <Clock size={12} /> {new Date(call.created_at || "").toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div >


            {/* RIGHT COLUMN: Call Details */}
            < div className="lg:col-span-2" >
                {
                    selectedCall ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col" >
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900 mb-2">{selectedCall.driver_name}</h1>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-3">
                                        <span className="flex items-center gap-1"><PhoneCall size={16} className="text-slate-400" /> {selectedCall.driver_phone}</span>
                                        <span className="flex items-center gap-1"><Truck size={16} className="text-slate-400" /> #{selectedCall.load_number}</span>
                                        <span className="flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded-full">
                                            🤖 {agents.find(a => a.id === selectedCall.agent_id)?.name || "Unknown Agent"}
                                        </span>
                                    </div>

                                    {/* Additional Context (Metadata) - Compact Header View */}
                                    {selectedCall.metadata && Object.keys(selectedCall.metadata).length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {Object.entries(selectedCall.metadata).map(([key, value]) => (
                                                <span key={key} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 flex items-center gap-1">
                                                    <Activity size={10} />
                                                    <span className="font-semibold capitalize">{key.replace(/_/g, ' ')}:</span>
                                                    {String(value)}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-slate-500 mb-1">Status</div>
                                    <StatusBadge status={selectedCall.status} large />
                                    <div className="mt-2 text-right">
                                        <button
                                            onClick={() => handleReAnalyze(selectedCall.id)}
                                            disabled={analyzingCallId === selectedCall.id}
                                            className="text-xs inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                        >
                                            <RefreshCw size={12} className={analyzingCallId === selectedCall.id ? "animate-spin" : ""} />
                                            {analyzingCallId === selectedCall.id ? "Analyzing..." : "Analyze Again"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {selectedCall.audio_url && (
                                <div className="bg-slate-900 rounded-xl p-4 mb-6 shadow-md text-white">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Audio Recording</h3>
                                        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">ID: {selectedCall.retell_call_id}</span>
                                    </div>
                                    <audio
                                        id="main-audio-player"
                                        controls
                                        src={selectedCall.audio_url}
                                        className="w-full h-10 accent-blue-500"
                                        style={{ filter: "invert(1) hue-rotate(180deg)" }}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
                                {/* LEFT SUB-COLUMN: Audio & Analysis */}
                                <div className="overflow-y-auto">
                                    {/* 2. Call Summary & Extracted Data */}
                                    <div className="mb-6">
                                        <CallAnalysis call={selectedCall} />
                                    </div>
                                </div>

                                {/* RIGHT SUB-COLUMN: Transcript */}
                                <div className="border-l border-slate-100 pl-6 flex flex-col h-[600px]">
                                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 flex-shrink-0">
                                        <span>💬</span> Transcript
                                    </h2>
                                    <div className="flex-1 min-h-0">
                                        <TranscriptViewer call={selectedCall} currentTime={currentTime} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center h-full flex flex-col items-center justify-center text-slate-500">
                            <div className="bg-slate-50 p-4 rounded-full mb-4">
                                <Activity size={32} className="text-slate-400" />
                            </div>
                            <p className="text-lg">Select a call to view details or start a new one.</p>
                        </div>
                    )}
            </div >
        </div >
    );
};

const StatusBadge = ({ status, large }: { status: string, large?: boolean }) => {
    const styles = {
        initiated: "bg-slate-100 text-slate-600",
        dialing: "bg-blue-100 text-blue-700",
        "in-progress": "bg-amber-100 text-amber-700",
        completed: "bg-green-100 text-green-700",
        analyzed: "bg-purple-100 text-purple-700",
        failed: "bg-red-100 text-red-700",
    };
    // @ts-ignore
    const className = styles[status] || styles.initiated;

    return (
        <span className={clsx(
            "rounded-full font-medium inline-flex items-center",
            className,
            large ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"
        )}>
            {status}
        </span>
    );
};
