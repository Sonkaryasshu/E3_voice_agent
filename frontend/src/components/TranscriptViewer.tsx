import { type FC, useEffect, useRef } from 'react';
import type { Call } from '../types';

interface TranscriptViewerProps {
    call: Call;
    currentTime?: number;
}

export const TranscriptViewer: FC<TranscriptViewerProps> = ({ call, currentTime = 0 }) => {
    const transcriptObject = call.transcript_object;
    const activeRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to active element within the container
    useEffect(() => {
        if (activeRef.current && containerRef.current) {
            const container = containerRef.current;
            const element = activeRef.current;

            // Calculate position to center the element
            // We use offsetTop, assuming container is positioned (relative/absolute) or is the offset parent
            const elementTop = element.offsetTop;
            const elementHeight = element.offsetHeight;
            const containerHeight = container.clientHeight;

            // Target scroll position = element center - container half height
            const targetScroll = elementTop - (containerHeight / 2) + (elementHeight / 2);

            container.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
        }
    }, [currentTime]);

    // Fall back to plain transcript
    if (!transcriptObject || transcriptObject.length === 0) {
        return <p className="text-slate-400 text-sm">No transcript available</p>;
    }

    return (
        <div ref={containerRef} className="h-full overflow-y-auto pr-2 relative">
            <div className="space-y-6 pb-4">
                {transcriptObject.map((message: any, index) => {
                    const isAgent = message.role === 'agent';
                    const words = message.words || [];
                    let isActive = false;
                    if (words.length > 0) {
                        const start = words[0].start;
                        const end = words[words.length - 1].end;
                        // Broaden match slightly to prevent flickering
                        isActive = currentTime >= start && currentTime <= (end + 0.5);
                    }

                    return (
                        <div
                            key={index}
                            ref={isActive ? activeRef : null}
                            className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}
                        >
                            <div className={`max-w-[90%] ${isAgent ? 'mr-auto' : 'ml-auto'}`}>
                                {/* Speaker label */}
                                <div className={`text-xs font-medium mb-1 ${isAgent ? 'text-blue-600' : 'text-slate-600'}`}>
                                    {isAgent ? '🤖 Agent' : '👤 User'}
                                </div>

                                {/* Message bubble */}
                                <div className={`rounded-xl px-4 py-3 shadow-sm transition-all duration-300 ${isActive ? 'ring-2 ring-offset-1 ring-blue-400 shadow-md transform scale-[1.02]' : ''
                                    } ${isAgent
                                        ? 'bg-blue-50 text-blue-900 rounded-tl-sm'
                                        : 'bg-slate-50 text-slate-800 rounded-tr-sm'
                                    }`}>
                                    <p className="text-sm leading-relaxed">
                                        {words.length > 0 ? (
                                            words.map((w: any, i: number) => {
                                                const isWordActive = currentTime >= w.start && currentTime <= w.end;
                                                return (
                                                    <span
                                                        key={i}
                                                        className={`transition-colors duration-200 ${isWordActive ? 'bg-yellow-200 text-black font-semibold' : ''}`}
                                                    >
                                                        {w.word}
                                                    </span>
                                                );
                                            })
                                        ) : (
                                            message.content
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
