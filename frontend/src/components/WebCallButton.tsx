import React, { useState, useEffect } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import { callApi } from "../api/client";
import { Mic, PhoneOff, Loader2 } from "lucide-react";

// Initialize client outside component to avoid re-creation
const retellWebClient = new RetellWebClient();

interface WebCallButtonProps {
    agentId: string;
    driverName: string;
    driverPhone: string;
    loadNumber: string;
    metadata?: Record<string, any>;
    onCallStart?: (callId: string) => void;
    onCallEnd?: () => void;
}

export const WebCallButton: React.FC<WebCallButtonProps> = ({
    agentId, driverName, driverPhone, loadNumber, metadata, onCallStart, onCallEnd
}) => {
    const [isCalling, setIsCalling] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Setup listeners
        retellWebClient.on("call_started", () => {
            console.log("Call started");
            setIsCalling(true);
        });

        retellWebClient.on("call_ended", () => {
            console.log("Call ended");
            setIsCalling(false);
            onCallEnd?.();
        });

        retellWebClient.on("error", (error) => {
            console.error("Retell Error:", error);
            setIsCalling(false);
            setIsLoading(false);
            alert("Call failed: " + (error as any).message);
        });

        return () => {
            retellWebClient.removeAllListeners();
        };
    }, [onCallEnd]);

    const handleStartCall = async () => {
        if (!agentId) {
            alert("Please select an agent first.");
            return;
        }

        setIsLoading(true);
        try {
            // 1. Get Access Token from our Backend
            const response = await callApi.registerWebCall({
                agent_id: agentId,
                driver_name: driverName,
                driver_phone: driverPhone || "web-call",
                load_number: loadNumber,
                metadata: metadata
            });

            if (onCallStart) onCallStart(response.call_id);

            // 2. Start Call via SDK
            await retellWebClient.startCall({
                accessToken: response.access_token,
            });
            // Calling state updates via event listener
        } catch (err) {
            console.error(err);
            alert("Failed to start web call. Check console and backend.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStopCall = () => {
        retellWebClient.stopCall();
    };

    if (isCalling) {
        return (
            <button
                onClick={handleStopCall}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2 animate-pulse"
            >
                <PhoneOff size={20} />
                End Call
            </button>
        );
    }

    return (
        <button
            onClick={handleStartCall}
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
        >
            {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
            ) : (
                <Mic size={20} />
            )}
            {isLoading ? "Connecting..." : "Start Web Call"}
        </button>
    );
};
