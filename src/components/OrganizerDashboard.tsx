import React, { useState } from "react";
import {
  ArrowLeft,
  QrCode,
  Users,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  ShieldAlert,
  Power,
  RotateCcw,
} from "lucide-react";
import { formatUnits, type Hex } from "viem";
import type { EventData, DashboardStats } from "../../lib/slotlock";
import type { RomeConfig } from "../../lib/config";

interface OrganizerDashboardProps {
  event: EventData;
  stats: DashboardStats;
  config: RomeConfig;
  participants: string[];
  checkedInList: string[];
  onBack: () => void;
  onOpenCheckIn: () => Promise<void>;
  onCloseCheckIn: () => Promise<void>;
  onRevokeSession: (sessionId: number) => Promise<void>;
  onSettleNoShows: () => Promise<void>;
  onCancelEvent: () => Promise<void>;
  onOpenFullscreenQR: () => void;
  isLoading: boolean;
  actionMessage: string;
}

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({
  event,
  stats,
  config,
  participants,
  checkedInList,
  onBack,
  onOpenCheckIn,
  onCloseCheckIn,
  onRevokeSession,
  onSettleNoShows,
  onCancelEvent,
  onOpenFullscreenQR,
  isLoading,
  actionMessage,
}) => {
  const [copied, setCopied] = useState(false);

  const now = BigInt(Math.floor(Date.now() / 1000));
  const isSessionOpen = event.activeSessionId > 0;
  const isCheckInWindowActive = now >= event.checkInStart && now <= event.checkInEnd;
  const isPastCheckInEnd = now > event.checkInEnd;

  const depositHuman = formatUnits(event.depositAmount, event.isTokenDeposit ? 6 : 18);
  const totalHeldHuman = formatUnits(stats.totalHeld, event.isTokenDeposit ? 6 : 18);
  const totalRefundedHuman = formatUnits(stats.totalRefunded, event.isTokenDeposit ? 6 : 18);
  const settleableHuman = formatUnits(stats.settleable, event.isTokenDeposit ? 6 : 18);

  const checkInUrl = `${window.location.origin}/#checkin?eventId=${event.id}&session=${event.activeSessionId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(checkInUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="container" style={{ padding: "30px 20px 80px" }}>
      <button onClick={onBack} className="nav-btn" style={{ marginBottom: 20, paddingLeft: 0 }}>
        <ArrowLeft size={16} />
        <span>Back to Event Detail</span>
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span className="badge badge-blue">Organizer Dashboard</span>
            {event.cancelled && <span className="badge badge-yellow">Cancelled</span>}
            {event.settled && <span className="badge badge-gray">Settled</span>}
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            {event.title}
          </h1>
        </div>

        {/* Live Session Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isSessionOpen ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--success-bg)",
                border: "1px solid var(--success-border)",
                padding: "8px 16px",
                borderRadius: "var(--radius-full)",
                color: "var(--success)",
                fontWeight: 700,
                fontSize: "0.88rem",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
              Session #{event.activeSessionId} Live
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-color)",
                padding: "8px 16px",
                borderRadius: "var(--radius-full)",
                color: "var(--text-secondary)",
                fontWeight: 600,
                fontSize: "0.88rem",
              }}
            >
              Check-in Closed
            </div>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 30 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 4 }}>Registered / Capacity</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>
            {stats.registered} <span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 500 }}>/ {event.capacity}</span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
            {stats.remaining} spots available
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 4 }}>Checked-In Attendees</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--success)" }}>
            {stats.checkedIn}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
            {stats.registered > 0 ? Math.round((stats.checkedIn / stats.registered) * 100) : 0}% attendance rate
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 4 }}>Deposits Held in Escrow</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>
            {totalHeldHuman} <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>USDC</span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
            Secured on Rome smart contract
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 4 }}>Total Refunded</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--accent)" }}>
            {totalRefundedHuman} <span style={{ fontSize: "0.9rem" }}>USDC</span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
            Returned instantly on check-in
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 4 }}>Settleable No-Show Funds</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: Number(settleableHuman) > 0 ? "var(--warning)" : "var(--text-primary)" }}>
            {settleableHuman} <span style={{ fontSize: "0.9rem" }}>USDC</span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
            {isPastCheckInEnd ? "Ready to settle" : "Available after check-in ends"}
          </div>
        </div>
      </div>

      {/* Check-In Control Center */}
      <div className="card" style={{ padding: 28, marginBottom: 30 }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 12 }}>
          Venue Check-In Control Center
        </h3>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: 20 }}>
          When guests arrive at the venue, open a check-in session. SlotLock will generate a dynamic signed QR code scannable with phone cameras.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {!isSessionOpen ? (
            <button
              className="btn-accent"
              onClick={onOpenCheckIn}
              disabled={isLoading || event.cancelled}
            >
              <Power size={16} />
              <span>{isLoading ? actionMessage || "Opening Session..." : "Open Check-In Session"}</span>
            </button>
          ) : (
            <>
              <button
                className="btn-primary"
                onClick={onOpenFullscreenQR}
              >
                <QrCode size={16} />
                <span>Launch Fullscreen QR Screen</span>
              </button>

              <button
                className="btn-secondary"
                onClick={copyLink}
              >
                <Copy size={16} />
                <span>{copied ? "Link Copied!" : "Copy Check-In Link"}</span>
              </button>

              <button
                className="btn-secondary"
                onClick={onCloseCheckIn}
                disabled={isLoading}
              >
                <span>Close Session</span>
              </button>

              <button
                className="btn-danger"
                onClick={() => onRevokeSession(event.activeSessionId)}
                disabled={isLoading}
              >
                <span>Revoke Session #{event.activeSessionId}</span>
              </button>
            </>
          )}

          {/* Settle No-Shows */}
          {Number(settleableHuman) > 0 && !event.settled && (
            <button
              className="btn-primary"
              style={{ background: "var(--warning)", borderColor: "var(--warning)" }}
              onClick={onSettleNoShows}
              disabled={isLoading}
            >
              <Coins size={16} />
              <span>Settle {settleableHuman} USDC No-Show Deposits</span>
            </button>
          )}
        </div>

        {isSessionOpen && (
          <div style={{ background: "var(--bg-subtle)", padding: 14, borderRadius: "var(--radius-md)", marginTop: 18, fontSize: "0.85rem" }}>
            <span style={{ fontWeight: 600 }}>Active Check-In URL: </span>
            <span className="mono-addr">{checkInUrl}</span>
          </div>
        )}
      </div>

      {/* Public Attendance Registry */}
      <div className="card" style={{ padding: 28, marginBottom: 30 }}>
        <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: 16 }}>
          Attendee Roster & On-Chain Status ({participants.length})
        </h3>

        {participants.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
            No registered attendees yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {participants.map((addr, idx) => {
              const isChecked = checkedInList.some((c) => c.toLowerCase() === addr.toLowerCase());

              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 18px",
                    borderRadius: "var(--radius-md)",
                    background: isChecked ? "var(--success-bg)" : "var(--bg-subtle)",
                    border: isChecked ? "1px solid var(--success-border)" : "1px solid var(--border-light)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-muted)" }}>#{idx + 1}</span>
                    <a
                      href={`${config.explorerUrl}/address/${addr}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mono-addr"
                    >
                      {truncate(addr)}
                    </a>
                  </div>

                  <div>
                    {isChecked ? (
                      <span className="badge badge-green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <CheckCircle2 size={13} />
                        Checked In • {depositHuman} USDC Refunded
                      </span>
                    ) : (
                      <span className="badge badge-gray">
                        Registered • Deposit Held
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      {!event.cancelled && !event.settled && (
        <div style={{ border: "1px solid #fecaca", borderRadius: "var(--radius-lg)", padding: 24, background: "#fff5f5" }}>
          <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--error)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={18} />
            Cancel Event
          </h4>
          <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", marginBottom: 14 }}>
            Cancelling the event immediately halts registrations and unlocks 100% self-claimable refunds for all registered attendees.
          </p>
          <button
            className="btn-danger"
            onClick={onCancelEvent}
            disabled={isLoading}
          >
            Cancel Entire Event & Enable Claims
          </button>
        </div>
      )}
    </div>
  );
};
