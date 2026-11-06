import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { X, RefreshCw, ShieldCheck, Clock, ExternalLink } from "lucide-react";
import type { EventData } from "../../lib/slotlock";
import type { RomeConfig } from "../../lib/config";

interface FullscreenQRModalProps {
  event: EventData;
  config: RomeConfig;
  onClose: () => void;
  generateChallengeSignature: (expiresAt: bigint) => Promise<string>;
}

export const FullscreenQRModal: React.FC<FullscreenQRModalProps> = ({
  event,
  config,
  onClose,
  generateChallengeSignature,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [isRotating, setIsRotating] = useState(false);
  const [currentExpiresAt, setCurrentExpiresAt] = useState<bigint>(0n);
  const [currentSig, setCurrentSig] = useState("");

  const REFRESH_INTERVAL_SEC = 30;
  const CHALLENGE_VALIDITY_SEC = 60n;

  const rotateChallenge = async () => {
    setIsRotating(true);
    try {
      const now = BigInt(Math.floor(Date.now() / 1000));
      const expiresAt = now + CHALLENGE_VALIDITY_SEC;
      setCurrentExpiresAt(expiresAt);

      const sig = await generateChallengeSignature(expiresAt);
      setCurrentSig(sig);

      const url = `${window.location.origin}/#checkin?eventId=${event.id}&session=${event.activeSessionId}&exp=${expiresAt}&sig=${sig}`;
      setQrUrl(url);

      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, url, {
          width: 320,
          margin: 2,
          color: {
            dark: "#0f1115",
            light: "#ffffff",
          },
        });
      }
      setSecondsRemaining(REFRESH_INTERVAL_SEC);
    } catch (err) {
      console.error("Error generating challenge QR:", err);
    } finally {
      setIsRotating(false);
    }
  };

  useEffect(() => {
    rotateChallenge();
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          rotateChallenge();
          return REFRESH_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [event.id, event.activeSessionId]);

  return (
    <div className="qr-fullscreen">
      {/* Top Bar */}
      <div style={{ position: "absolute", top: 24, right: 28 }}>
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: "50%",
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            cursor: "pointer",
          }}
        >
          <X size={24} />
        </button>
      </div>

      <div style={{ maxWidth: 520, width: "100%", margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(37,99,235,0.2)", padding: "6px 14px", borderRadius: 999, border: "1px solid rgba(59,130,246,0.3)", marginBottom: 16 }}>
          <ShieldCheck size={16} color="#60a5fa" />
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#93c5fd" }}>
            Rome Dynamic Cryptographic Check-In
          </span>
        </div>

        <h2 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 8, letterSpacing: "-0.02em" }}>
          Scan to Check In & Refund
        </h2>

        <p style={{ fontSize: "1rem", color: "#a1a1aa", marginBottom: 12 }}>
          {event.title} • Session #{event.activeSessionId}
        </p>

        {/* QR Canvas Box */}
        <div className="qr-box">
          <canvas ref={canvasRef} style={{ display: "block", borderRadius: 12 }} />
        </div>

        {/* Countdown Timer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
          <Clock size={18} color="#60a5fa" />
          <span style={{ fontSize: "1.05rem", fontWeight: 700 }}>
            Refreshing in {secondsRemaining}s
          </span>
          <div
            style={{
              width: 140,
              height: 6,
              background: "rgba(255,255,255,0.15)",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(secondsRemaining / REFRESH_INTERVAL_SEC) * 100}%`,
                height: "100%",
                background: "#3b82f6",
                transition: "width 1s linear",
              }}
            />
          </div>
        </div>

        {/* Instructions */}
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 20px", fontSize: "0.85rem", color: "#d4d4d8", lineHeight: 1.6 }}>
          Point your phone camera at the QR code. You will be redirected to confirm check-in with your registered wallet. Your deposit will be refunded automatically on-chain.
        </div>
      </div>
    </div>
  );
};
