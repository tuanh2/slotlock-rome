import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { X, RefreshCw, ShieldCheck, Clock, ExternalLink, Zap } from "lucide-react";
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
          width: 330,
          margin: 2,
          color: {
            dark: "#090a0d",
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
      <div style={{ position: "absolute", top: 28, right: 32 }}>
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "50%",
            width: 48,
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
        >
          <X size={22} />
        </button>
      </div>

      <div style={{ maxWidth: 540, width: "100%", margin: "0 auto" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255, 72, 0, 0.15)",
            padding: "6px 16px",
            borderRadius: "var(--radius-full)",
            border: "1px solid rgba(255, 72, 0, 0.35)",
            marginBottom: 18,
          }}
        >
          <Zap size={15} color="var(--rome-flame)" />
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--rome-flame)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Rome Dynamic Cryptographic Check-In
          </span>
        </div>

        <h2 style={{ fontSize: "2.2rem", fontWeight: 800, marginBottom: 8, letterSpacing: "-0.03em" }}>
          Scan to Check In & Refund
        </h2>

        <p style={{ fontSize: "1rem", color: "var(--text-secondary)", marginBottom: 16 }}>
          {event.title} • <span style={{ fontFamily: "var(--font-mono)", color: "var(--rome-amber)" }}>Session #{event.activeSessionId}</span>
        </p>

        {/* QR Canvas Box */}
        <div className="qr-box">
          <canvas ref={canvasRef} style={{ display: "block", borderRadius: 14 }} />
        </div>

        {/* Countdown Timer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 20 }}>
          <Clock size={17} color="var(--rome-flame)" />
          <span style={{ fontSize: "1.05rem", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
            Rotating in <span style={{ color: "var(--rome-flame)" }}>{secondsRemaining}s</span>
          </span>
          <div
            style={{
              width: 150,
              height: 6,
              background: "rgba(255,255,255,0.1)",
              borderRadius: "var(--radius-full)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(secondsRemaining / REFRESH_INTERVAL_SEC) * 100}%`,
                height: "100%",
                background: "linear-gradient(90deg, var(--rome-flame), var(--rome-amber))",
                transition: "width 1s linear",
              }}
            />
          </div>
        </div>

        {/* Instructions */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)",
            padding: "16px 24px",
            fontSize: "0.88rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          Scan the QR with your phone camera. You will be redirected to confirm attendance with the wallet you used to reserve. Your USDC deposit will be refunded automatically on-chain with zero manual approval.
        </div>
      </div>
    </div>
  );
};
