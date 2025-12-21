import { type FC } from 'react';
import type { Call } from '../types';
import { PlayCircle } from 'lucide-react';

interface CallAnalysisProps {
    call: Call;
}

export const CallAnalysis: FC<CallAnalysisProps> = ({ call }) => {
    const analysis = call.analysis_json;

    if (!analysis || Object.keys(analysis).length === 0) {
        return null;
    }

    // Handle new structure where data might be nested in 'extracted_data'
    // or fallback to root (if legacy/mixed)
    const extractedRoot = analysis.extracted_data || analysis;

    // Summary might be at root
    const summary = analysis.call_summary || analysis.summary || 'No summary available';
    const reportValidity = analysis.data_validity; // valid, invalid, partial

    const sentimentColors: Record<string, string> = {
        'valid': 'bg-green-100 text-green-800',
        'partial': 'bg-yellow-100 text-yellow-800',
        'invalid': 'bg-red-100 text-red-800',
    };

    // Structured fields to look for (from requirements)
    const structuredFields = {
        'driver_status': { label: 'Driver Status', icon: '🚚' },
        'current_location': { label: 'Current Location', icon: '🗺️' },
        'eta': { label: 'ETA', icon: '⏱️' },
        'delay_reason': { label: 'Delay Reason', icon: '🚧' },
        'unloading_status': { label: 'Unloading Status', icon: '📦' },
        'pod_acknowledged': { label: 'POD Acknowledged', icon: '📝' },
        'call_outcome': { label: 'Call Outcome', icon: '🎬' },
        'emergency_type': { label: 'Emergency Type', icon: '⚠️' },
        'safety_status': { label: 'Safety Status', icon: '✓' },
        'injury_status': { label: 'Injury Status', icon: '🩹' },
        'emergency_location': { label: 'Emergency Location', icon: '🆘' },
        'load_secure': { label: 'Load Secure', icon: '📦' },
        'escalation_status': { label: 'Escalation', icon: '☎️' },
    };

    const handleSeek = (ms: number) => {
        const audio = document.getElementById('main-audio-player') as HTMLAudioElement;
        if (audio) {
            audio.currentTime = ms / 1000;
            audio.play().catch(e => console.error(e));
        }
    };

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-4">
            {/* AI Summary Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-indigo-200 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <span className="text-2xl">🤖</span>
                        AI Summary
                    </h3>
                    <div className="flex gap-2">
                        {reportValidity && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${sentimentColors[reportValidity] || 'bg-gray-100'}`}>
                                Data: {reportValidity}
                            </span>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm">
                    {/* <p className="text-sm font-medium text-slate-600 mb-2">Call Summary</p> */}
                    <p className="text-slate-700 leading-relaxed">{summary}</p>
                </div>
            </div>

            {/* Structured Data Extraction */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="text-xl">📊</span>
                    Extracted Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(structuredFields).map(([key, config]) => {
                        const dataPoint = extractedRoot[key];

                        if (dataPoint === undefined || dataPoint === null) return null;

                        let displayValue = "";
                        let timestamp = null;

                        if (typeof dataPoint === 'object' && dataPoint !== null && 'value' in dataPoint) {
                            displayValue = String(dataPoint.value);
                            timestamp = dataPoint.timestamp_ms;
                        } else {
                            displayValue = String(dataPoint);
                        }

                        // Boolean tweaks
                        if (displayValue === 'true') displayValue = 'Yes';
                        if (displayValue === 'false') displayValue = 'No';

                        return (
                            <div key={key} className="bg-slate-50 rounded-lg p-3 border border-slate-200 hover:border-blue-300 transition-colors group flex flex-col gap-2">
                                {/* Top Row: Icon + Label */}
                                <div className="flex items-center gap-2 text-slate-500">
                                    <span className="text-base opacity-70 flex-shrink-0">{config.icon}</span>
                                    <p className="text-[10px] font-bold uppercase tracking-wider truncate" title={config.label}>
                                        {config.label}
                                    </p>
                                </div>

                                {/* Bottom Row: Timestamp + Value */}
                                <div className="flex items-start justify-between gap-2 w-full">
                                    <p className="text-sm font-semibold text-slate-900 leading-snug break-words flex-1">
                                        {displayValue}
                                    </p>
                                    {timestamp !== null && (
                                        <button
                                            onClick={() => handleSeek(timestamp as number)}
                                            className="flex-shrink-0 text-[10px] flex items-center gap-1 text-blue-600 bg-blue-100 hover:bg-blue-200 px-1.5 py-0.5 rounded transition-colors font-medium mt-0.5 ml-2"
                                            title={`Jump to ${formatTime(timestamp as number)}`}
                                        >
                                            <PlayCircle size={10} />
                                            {formatTime(timestamp as number)}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

