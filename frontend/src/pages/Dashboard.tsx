import { useEffect, useState } from "react";
import type { Agent, Call, TriggerCallRequest } from "../types";
import { agentApi, callApi } from "../api/client";
import { PhoneCall, Truck, Clock, Smartphone, Activity } from "lucide-react";
import clsx from 'clsx';
import { WebCallButton } from "../components/WebCallButton";

export const Dashboard = () => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [calls, setCalls] = useState<Call[]>([]);


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
            alert("Call triggered successfully!");
            setTriggerForm({ driver_name: "", driver_phone: "", load_number: "", metadata: {} });
            setMetadataText("");
            loadCalls();
        } catch (e) {
            console.error(e);
            alert("Failed to trigger call");
        } finally {

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
                                    <span className="font-semibold text-slate-900">{call.driver_name}</span>
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
                            <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900 mb-2">{selectedCall.driver_name}</h1>
                                    <div className="flex items-center space-x-4 text-sm text-slate-600">
                                        <span className="flex items-center"><PhoneCall size={16} className="mr-1" /> {selectedCall.driver_phone}</span>
                                        <span className="flex items-center"><Truck size={16} className="mr-1" /> Load: {selectedCall.load_number}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-slate-500 mb-1">Status</div>
                                    <StatusBadge status={selectedCall.status} large />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                {/* Analysis Card */}
                                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Structured Analysis</h3>
                                    {selectedCall.analysis_json ? (
                                        <div className="space-y-2">
                                            {Object.entries(selectedCall.analysis_json).map(([k, v]) => (
                                                <div key={k} className="flex justify-between items-start text-sm border-b border-slate-200 pb-1 last:border-0">
                                                    <span className="text-slate-500 capitalize">{k.replace(/_/g, " ")}:</span>
                                                    <span className="font-medium text-slate-900 text-right">{String(v)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-slate-400 text-sm italic">Analysis pending or not available...</div>
                                    )}
                                </div>

                                {/* Audio/Debug Info */}
                                <div className="space-y-4">
                                    {selectedCall.audio_url && (
                                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Recording</h3>
                                            <audio controls src={selectedCall.audio_url} className="w-full h-8" />
                                        </div>
                                    )}
                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Metadata</h3>
                                        <div className="text-xs font-mono text-slate-600 break-all">
                                            Internal ID: {selectedCall.id}<br />
                                            Retell ID: {selectedCall.retell_call_id}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Transcript</h3>
                                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 h-96 overflow-y-auto whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
                                    {selectedCall.transcript || <span className="text-slate-400 italic">No transcript available.</span>}
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
