import { type FC } from 'react';
import type { Call } from '../types';

interface TranscriptViewerProps {
    call: Call;
}

export const TranscriptViewer: FC<TranscriptViewerProps> = ({ call }) => {
    const transcriptObject = call.transcript_object;

    // Fall back to plain transcript if transcript_object not available
    if (!transcriptObject || transcriptObject.length === 0) {
        if (call.transcript) {
            return (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600 mb-3">Transcript (Plain Text)</p>
                    <div className="bg-slate-50 rounded-lg p-4 font-mono text-sm text-slate-700 whitespace-pre-wrap">
                        {call.transcript}
                    </div>
                </div>
            );
        }
        return <p className="text-slate-400 text-sm">No transcript available</p>;
    }

    return (
        <div className="space-y-3">
            <p className="text-sm font-medium text-slate-600 mb-3">
                Conversation ({transcriptObject.length} messages)
            </p>
            <div className="space-y-4">
                {transcriptObject.map((message, index) => {
                    const isAgent = message.role === 'agent';

                    return (
                        <div
                            key={index}
                            className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}
                        >
                            <div className={`max-w-[75%] ${isAgent ? 'mr-auto' : 'ml-auto'}`}>
                                {/* Speaker label */}
                                <div className={`text-xs font-medium mb-1 ${isAgent ? 'text-blue-600' : 'text-slate-600'
                                    }`}>
                                    {isAgent ? '🤖 Agent' : '👤 User'}
                                </div>

                                {/* Message bubble */}
                                <div className={`rounded-2xl px-4 py-3 shadow-sm ${isAgent
                                    ? 'bg-blue-100 text-blue-900 rounded-tl-sm'
                                    : 'bg-slate-100 text-slate-800 rounded-tr-sm'
                                    }`}>
                                    <p className="text-sm leading-relaxed">{message.content}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
