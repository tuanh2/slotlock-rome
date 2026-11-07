import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Coins,
  Shield,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { formatUnits, type Hex } from "viem";
import type { EventData, TicketData } from "../../lib/slotlock";
import type { RomeConfig } from "../../lib/config";

interface EventDetailProps {
  event: EventData;
  config: RomeConfig;
  userAddress?: string;
  ticket?: TicketData;
  participants: string[];
  checkedInList: string[];
  onBack: () => void;
  onRegister: () => void;
  onCancelRegistration: () => void;
  onClaimRefund: () => void;
  onOpenDashboard: () => void;
  isActionLoading: boolean;
  actionMessage: string;
}

export const EventDetail: React.FC<EventDetailProps> = ({
  event,
  config,
  userAddress,
  ticket,
  participants,
  checkedInList,
  onBack,
  onRegister,
  onCancelRegistration,
  onClaimRefund,
  onOpenDashboard,
  isActionLoading,
  actionMessage,
}) => {
  const [activeTab, setActiveTab] = useState<"details" | "attendees">("details");

  const now = BigInt(Math.floor(Date.now() / 1000));
  const isOrganizer = userAddress && event.organizer.toLowerCase() === userAddress.toLowerCase();
  const isRegistered = ticket && ticket.status === 1; // TicketStatus.Registered
  const isCheckedIn = ticket && ticket.status === 2; // TicketStatus.CheckedIn
  const isRefunded = ticket && ticket.status === 3; // TicketStatus.Refunded
  const isClaimed = ticket && ticket.status === 4; // TicketStatus.Claimed

  const spotsRemaining = event.capacity - event.registeredCount;
  const isFull = spotsRemaining <= 0;
  const isPastDeadline = now > event.registrationDeadline;
  const isPastCheckInEnd = now > event.checkInEnd;

  const canClaimRefund =
    isRegistered &&
    (event.cancelled || (event.sessionCount === 0 && isPastCheckInEnd));

  const depositHuman = formatUnits(event.depositAmount, event.isTokenDeposit ? 6 : 18);

  const formatDate = (start: bigint, end: bigint, tz: string) => {
    const s = new Date(Number(start) * 1000);
    const e = new Date(Number(end) * 1000);
    return `${s.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    })} • ${s.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })} - ${e.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })} (${tz})`;
  };

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="container" style={{ padding: "30px 20px 80px" }}>
      {/* Back button */}
      <button
        onClick={onBack}
        className="nav-btn"
        style={{ marginBottom: 20, paddingLeft: 0 }}
      >
        <ArrowLeft size={16} />
        <span>Back to Events</span>
      </button>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 36, alignItems: "start" }}>
        {/* Left Column: Event details */}
        <div>
          {/* Cover Image */}
          <div
            style={{
              width: "100%",
              height: 320,
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              background: "var(--bg-card)",
              marginBottom: 24,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <img
              src={event.coverUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800"}
              alt={event.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          {/* Title & Host info */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <span className="badge badge-blue">
                <Coins size={12} /> {depositHuman} USDC Deposit
              </span>
              {event.cancelled && <span className="badge badge-yellow">Event Cancelled</span>}
              {isFull && !isRegistered && <span className="badge badge-gray">Event Full</span>}
            </div>

            <h1 style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 12 }}>
              {event.title}
            </h1>

            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              <span>Hosted by</span>
              <a
                href={`${config.explorerUrl}/address/${event.organizer}`}
                target="_blank"
                rel="noreferrer"
                className="mono-addr"
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                {truncate(event.organizer)}
                <ExternalLink size={12} />
              </a>
              {isOrganizer && <span className="badge badge-green">You are host</span>}
            </div>
          </div>

          {/* Tabs for Details vs Public Attendees */}
          <div className="tabs-container" style={{ marginBottom: 20 }}>
            <button
              className={`tab-btn ${activeTab === "details" ? "active" : ""}`}
              onClick={() => setActiveTab("details")}
            >
              Event Details
            </button>
            <button
              className={`tab-btn ${activeTab === "attendees" ? "active" : ""}`}
              onClick={() => setActiveTab("attendees")}
            >
              Public Attendees & Check-Ins ({participants.length})
            </button>
          </div>

          {activeTab === "details" ? (
            <>
              {/* Event Schedule & Location */}
              <div className="card" style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Calendar size={18} color="var(--accent)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.98rem" }}>Date & Time</div>
                    <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginTop: 2 }}>
                      {formatDate(event.startTime, event.endTime, event.timezone)}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <MapPin size={18} color="var(--accent)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.98rem" }}>Location</div>
                    <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginTop: 2 }}>
                      {event.location}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Clock size={18} color="var(--accent)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.98rem" }}>Check-in Window</div>
                    <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginTop: 2 }}>
                      Starts at {new Date(Number(event.checkInStart) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Ends at {new Date(Number(event.checkInEnd) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>About this event</h3>
                <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-line" }}>
                  {event.description}
                </p>
              </div>

              {/* Policy Explainer */}
              <div className="policy-card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Shield size={18} color="var(--accent)" />
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>SlotLock Transparent Deposit Policy</h4>
                </div>
                <ul style={{ fontSize: "0.86rem", color: "var(--text-secondary)", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                  <li><b>100% Refundable on Check-in:</b> Arrive at the venue, scan the dynamic QR on the organizer's screen with this exact wallet, and your {depositHuman} USDC is instantly refunded.</li>
                  <li><b>Cancel before deadline:</b> Cancel anytime before the registration deadline to receive an instant 100% refund and return your spot.</li>
                  <li><b>Organizer cancellation:</b> If the host cancels the event, you can self-claim your full refund anytime.</li>
                  <li><b>Host no-show protection:</b> If the host never opens check-in, you can self-claim your full refund after the check-in window.</li>
                  <li><b>No-show forfeit:</b> Un-checked-in deposits are only settled by the host after the check-in window closes.</li>
                </ul>
              </div>
            </>
          ) : (
            /* Public Attendees & Check-ins */
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                  Public Attendance Registry
                </h3>
                <span className="badge badge-blue">
                  {checkedInList.length} Checked-In / {participants.length} Registered
                </span>
              </div>

              <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", marginBottom: 18 }}>
                Every registration and check-in is verified on Rome blockchain. No manual approvals.
              </p>

              {participants.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                  No registrations yet. Be the first to reserve a spot!
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {participants.map((addr, i) => {
                    const isChecked = checkedInList.some(
                      (c) => c.toLowerCase() === addr.toLowerCase()
                    );
                    const isMe = userAddress && addr.toLowerCase() === userAddress.toLowerCase();

                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 16px",
                          borderRadius: "var(--radius-md)",
                          background: isChecked ? "var(--success-bg)" : "var(--bg-subtle)",
                          border: isChecked ? "1px solid var(--success-border)" : "1px solid var(--border-light)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              background: isChecked ? "#d1fae5" : "#e4e4e7",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "0.82rem",
                              color: isChecked ? "var(--success)" : "#71717a",
                            }}
                          >
                            {i + 1}
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <a
                                href={`${config.explorerUrl}/address/${addr}`}
                                target="_blank"
                                rel="noreferrer"
                                className="mono-addr"
                                style={{ fontSize: "0.84rem" }}
                              >
                                {truncate(addr)}
                              </a>
                              {isMe && <span className="badge badge-blue">You</span>}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isChecked ? (
                            <span className="badge badge-green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <CheckCircle2 size={13} />
                              Checked In & Refunded
                            </span>
                          ) : (
                            <span className="badge badge-gray">
                              Spot Reserved
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Sticky Ticket Box */}
        <div style={{ position: "sticky", top: 88 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: "1.8rem", fontWeight: 800 }}>{depositHuman}</span>
                <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-secondary)", marginLeft: 6 }}>USDC</span>
              </div>
              <span className="badge badge-green">100% Refundable</span>
            </div>

            {/* Capacity status */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6 }}>
                <span>Availability</span>
                <span style={{ color: isFull ? "var(--error)" : "var(--accent)" }}>
                  {isFull ? "Sold Out" : `${spotsRemaining} of ${event.capacity} spots left`}
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, (event.registeredCount / event.capacity) * 100)}%`,
                    background: isFull ? "var(--error)" : "var(--accent)",
                  }}
                />
              </div>
            </div>

            {/* Status alerts */}
            {isRegistered && (
              <div
                style={{
                  background: "var(--accent-light)",
                  border: "1px solid #bfdbfe",
                  borderRadius: "var(--radius-md)",
                  padding: 14,
                  fontSize: "0.86rem",
                  color: "var(--accent)",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CheckCircle size={18} />
                <span>You have a confirmed reservation! Scan QR at the venue to check in.</span>
              </div>
            )}

            {isCheckedIn && (
              <div
                style={{
                  background: "var(--success-bg)",
                  border: "1px solid var(--success-border)",
                  borderRadius: "var(--radius-md)",
                  padding: 14,
                  fontSize: "0.86rem",
                  color: "var(--success)",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CheckCircle2 size={18} />
                <span>You are checked in! Your {depositHuman} USDC has been refunded to your wallet.</span>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {!userAddress ? (
                <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled>
                  Connect Wallet to Reserve
                </button>
              ) : isOrganizer ? (
                <>
                  <button
                    className="btn-accent"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={onOpenDashboard}
                  >
                    Open Organizer Dashboard →
                  </button>
                </>
              ) : isRegistered ? (
                <>
                  {!isPastDeadline && (
                    <button
                      className="btn-secondary"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={onCancelRegistration}
                      disabled={isActionLoading}
                    >
                      {isActionLoading ? actionMessage || "Cancelling..." : "Cancel Reservation & Get Refund"}
                    </button>
                  )}
                  {canClaimRefund && (
                    <button
                      className="btn-accent"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={onClaimRefund}
                      disabled={isActionLoading}
                    >
                      {isActionLoading ? actionMessage || "Claiming..." : "Claim Deposit Refund"}
                    </button>
                  )}
                </>
              ) : (
                <button
                  className="btn-accent"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={onRegister}
                  disabled={isFull || isPastDeadline || isActionLoading || event.cancelled}
                >
                  {isActionLoading
                    ? actionMessage || "Processing Deposit..."
                    : isFull
                    ? "Event Full"
                    : isPastDeadline
                    ? "Registration Closed"
                    : `Deposit ${depositHuman} USDC to Reserve`}
                </button>
              )}
            </div>

            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 14, textAlign: "center", lineHeight: 1.4 }}>
              Protected by Rome Protocol. Gas is charged by the network. Your deposit is locked in the smart contract until check-in or cancellation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
