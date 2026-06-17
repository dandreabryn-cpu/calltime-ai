"use client";

import { useRef, useState, useCallback } from "react";

type CallState = "idle" | "connecting" | "in_call" | "ended";

/**
 * Wraps the Twilio Voice SDK. Twilio's Device is loaded dynamically so this
 * file doesn't break the build when no Twilio credentials are configured —
 * the import only resolves when a call is actually attempted.
 */
export function useTwilioDialer() {
  const [callState, setCallState] = useState<CallState>("idle");
  const [error, setError] = useState<string | null>(null);
  const deviceRef = useRef<import("@twilio/voice-sdk").Device | null>(null);
  const activeCallRef = useRef<import("@twilio/voice-sdk").Call | null>(null);

  const startCall = useCallback(async (phoneNumber: string) => {
    setError(null);
    setCallState("connecting");
    try {
      const tokenRes = await fetch("/api/call/start");
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        throw new Error(tokenData.error || "Could not get a calling token.");
      }

      const { Device } = await import("@twilio/voice-sdk");

      if (!deviceRef.current) {
        deviceRef.current = new Device(tokenData.token, {
          logLevel: "error",
        });
      }

      const call = await deviceRef.current.connect({
        params: { To: phoneNumber },
      });
      activeCallRef.current = call;

      call.on("accept", () => setCallState("in_call"));
      call.on("disconnect", () => setCallState("ended"));
      call.on("cancel", () => setCallState("ended"));
      call.on("error", (e: Error) => {
        setError(e.message);
        setCallState("ended");
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the call.");
      setCallState("idle");
    }
  }, []);

  const endCall = useCallback(() => {
    activeCallRef.current?.disconnect();
    setCallState("ended");
  }, []);

  return { callState, error, startCall, endCall };
}
