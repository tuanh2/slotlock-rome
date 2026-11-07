import React, { useState, useEffect } from "react";
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Wallet,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatUnits, type Hex } from "viem";
import type { EventData, TicketData } from "../../lib/slotlock";
import type { RomeConfig } from "../../lib/config";

interface CheckInPageProps {
  eventId: bigint;
  sessionId: number;
  expiresAt: bigint;
  signature: Hex;
  event?: EventData;
  ticket?: TicketData;
  config: RomeConfig;
  userAddress?: string;
  onConnectWallet: () => void;
  onPerformCheckIn: () => Promise<{ txHash: string; refundedAmount: bigint }>;
  onBackToHome: () => void;
}

export const CheckInPage: React.FC<CheckInPageProps> = ({
  eventId,
  sessionId,
  expiresAt,
  signature,
  event,
  ticket,
  config,
  userAddress,
  onConnectWallet,
  onPerformCheckIn,
  onBackToHome,
}) => {
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [successResult, setSuccessResult] = useState<{ txHash: string; refundedAmount: bigint } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const now = BigInt(Math.floor(Date.now() / 1000));
  const isChallengeExpired = now > expiresAt;
  const isAlreadyCheckedIn = ticket && ticket.status === 2;
  const isNotRegistered = !ticket || ticket.status === 0;

  const depositHuman = event ? formatUnits(event.depositAmount, event.isTokenDeposit ? 6 : 18) : "3";

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    setErrorMsg("");
    try {
      const res = await onPerformCheckIn();
      setSuccessResult(res);
    } catch (err: any) {
      console.error("Check-in error:", err);
      setErrorMsg(err?.message || "Check-in failed. Please try again.");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="container" style={{ maxWidth: 580, padding: "40px 20px 80px" }}>
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        {/* Header Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "var(--accent-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            color: "var(--accent)",
          }}
        >
          <QrCode size={28} />
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-subtle)", padding: "4px 10px", borderRadius: 999, fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 12 }}>
          <ShieldCheck size={14} color="var(--accent)" />
          Venue Self-Service Check-In
        </div>

        <h1 style={{ fontSize: "1.7rem", fontWeight: 800, marginBottom: 8 }}>
          {event ? event.title : `Event #${eventId}`}
        </h1>

        <p style={{ fontSize: "0.92rem", color: "var(--text-secondary)", marginBottom: 24 }}>
          Session #{sessionId} • Verify attendance to unlock your <b>{depositHuman} USDC</b> refund.
        </p>

        {/* Success State */}
        {successResult ? (
          <div
            style={{
              background: "var(--success-bg)",
              border: "1px solid var(--success-border)",
              borderRadius: "var(--radius-lg)",
              padding: 24,
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            <CheckCircle2 size={48} color="var(--success)" style={{ margin: "0 auto 12px" }} />
            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--success)", marginBottom: 6 }}>
              Check-In Successful!
            </h3>
            <p style={{ fontSize: "0.95rem", color: "#065f46", marginBottom: 16 }}>
              Your spot is verified and your <b>{formatUnits(successResult.refundedAmount, event?.isTokenDeposit ? 6 : 18)} USDC</b> deposit has been refunded back to your wallet.
            </p>

            <a
              href={`${config.explorerUrl}/tx/${successResult.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255, 255, 255, 0.06)", fontSize: "0.86rem" }}
            >
              <span>View On-Chain Settlement ({truncate(successResult.txHash)})</span>
              <ExternalLink size={14} />
            </a>
          </div>
        ) : (
          <>
            {/* Wallet Verification State */}
            {!userAddress ? (
              <div style={{ background: "var(--bg-subtle)", padding: 20, borderRadius: "var(--radius-md)", marginBottom: 20 }}>
                <Wallet size={32} color="var(--text-muted)" style={{ margin: "0 auto 8px" }} />
                <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 4 }}>Connect Registered Wallet</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16 }}>
                  Connect the exact wallet you used to place your reservation deposit.
                </p>
                <button className="btn-primary" onClick={onConnectWallet}>
                  Connect Wallet
                </button>
              </div>
            ) : isAlreadyCheckedIn ? (
              <div style={{ background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: "var(--radius-md)", padding: 18, marginBottom: 20, color: "var(--success)" }}>
                <CheckCircle2 size={24} style={{ margin: "0 auto 8px" }} />
                <div style={{ fontWeight: 700 }}>Already Checked In!</div>
                <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
                  This ticket has already been checked in and your deposit was refunded.
                </div>
              </div>
            ) : isNotRegistered ? (
              /* Wrong wallet alert as strictly required! */
              <div style={{ background: "var(--warning-bg)", border: "1px solid #fde68a", borderRadius: "var(--radius-md)", padding: 20, marginBottom: 20, textAlign: "left" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <AlertTriangle size={20} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <h4 style={{ fontWeight: 700, color: "#92400e", fontSize: "0.95rem" }}>
                      Switch to the wallet you used to reserve this spot
                    </h4>
                    <p style={{ fontSize: "0.85rem", color: "#b45309", marginTop: 4, lineHeight: 1.5 }}>
                      The connected wallet (<span className="mono-addr" style={{ fontSize: "0.78rem" }}>{truncate(userAddress)}</span>) does not have an active reservation for this event.
                    </p>
                  </div>
                </div>
              </div>
            ) : isChallengeExpired ? (
              <div style={{ background: "var(--error-bg)", border: "1px solid #fecaca", borderRadius: "var(--radius-md)", padding: 18, marginBottom: 20, color: "var(--error)" }}>
                <Clock size={24} style={{ margin: "0 auto 8px" }} />
                <div style={{ fontWeight: 700 }}>QR Code Expired</div>
                <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
                  This dynamic QR challenge has expired. Please scan the current code on the host's screen.
                </div>
              </div>
            ) : (
              /* Ready for check-in */
              <div style={{ marginBottom: 24 }}>
                <div style={{ background: "var(--bg-subtle)", padding: 16, borderRadius: "var(--radius-md)", marginBottom: 16, textAlign: "left" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Connected Wallet:</span>
                    <span className="mono-addr">{truncate(userAddress)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Refund Amount:</span>
                    <span style={{ fontWeight: 700, color: "var(--success)" }}>+{depositHuman} USDC</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Settlement:</span>
                    <span style={{ fontWeight: 600 }}>Atomic On-Chain on Rome</span>
                  </div>
                </div>

                {errorMsg && (
                  <div style={{ background: "var(--error-bg)", border: "1px solid #fecaca", color: "var(--error)", padding: 12, borderRadius: "var(--radius-md)", fontSize: "0.85rem", marginBottom: 14 }}>
                    {errorMsg}
                  </div>
                )}

                <button
                  className="btn-accent"
                  style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "1.05rem" }}
                  onClick={handleCheckIn}
                  disabled={isCheckingIn}
                >
                  <Sparkles size={18} />
                  <span>{isCheckingIn ? "Confirming on Rome..." : `Check In & Claim ${depositHuman} USDC Refund`}</span>
                </button>
              </div>
            )}
          </>
        )}

        <button onClick={onBackToHome} className="nav-btn" style={{ margin: "16px auto 0" }}>
          Return to Events
        </button>
      </div>
    </div>
  );
};
