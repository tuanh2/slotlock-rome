import React, { useState } from "react";
import { Calendar, MapPin, Users, Coins, Search, ShieldCheck, ArrowRight, Zap, Sparkles, CheckCircle2 } from "lucide-react";
import { formatUnits } from "viem";
import type { EventData } from "../../lib/slotlock";
import { HeroKeywordsTypewriter, MarqueeTickerRibbon } from "./RunningKeywordsTicker";

interface ExploreEventsProps {
  events: EventData[];
  onSelectEvent: (eventId: bigint) => void;
  userAddress?: string;
  onCreateClick: () => void;
}

export const ExploreEvents: React.FC<ExploreEventsProps> = ({
  events,
  onSelectEvent,
  userAddress,
  onCreateClick,
}) => {
  const [filter, setFilter] = useState<"upcoming" | "all" | "hosted">("upcoming");
  const [searchTerm, setSearchTerm] = useState("");

  const now = BigInt(Math.floor(Date.now() / 1000));

  const filteredEvents = events.filter((ev) => {
    // Search
    const matchesSearch =
      ev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.location.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === "upcoming") {
      return ev.endTime > now && !ev.cancelled;
    }
    if (filter === "hosted") {
      return userAddress && ev.organizer.toLowerCase() === userAddress.toLowerCase();
    }
    return true;
  });

  const formatDate = (timestamp: bigint, timezone: string) => {
    const d = new Date(Number(timestamp) * 1000);
    return (
      d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }) +
      " • " +
      d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }) +
      ` (${timezone})`
    );
  };

  const totalRegistered = events.reduce((acc, e) => acc + e.registeredCount, 0);
  const totalCheckedIn = events.reduce((acc, e) => acc + e.checkedInCount, 0);

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Hero Section */}
      <div className="container" style={{ paddingTop: 40, paddingBottom: 32 }}>
        <div
          style={{
            position: "relative",
            background: "linear-gradient(145deg, rgba(24, 27, 36, 0.85) 0%, rgba(12, 14, 19, 0.95) 100%)",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-xl)",
            padding: "54px 44px",
            color: "#ffffff",
            boxShadow: "var(--shadow-lg), 0 0 80px -20px rgba(255, 72, 0, 0.15)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div
            style={{
              position: "absolute",
              top: "-50px",
              right: "-50px",
              width: "350px",
              height: "350px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255, 72, 0, 0.2) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, zIndex: 1 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255, 72, 0, 0.14)",
                color: "var(--rome-flame)",
                border: "1px solid rgba(255, 72, 0, 0.35)",
                padding: "4px 12px",
                borderRadius: "var(--radius-full)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--rome-flame)",
                  animation: "live-pulse 1.8s infinite ease-in-out",
                }}
              />
              Rome Hadrian Devnet (200010)
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              • 400ms Solana CPI Settlement
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3.2rem)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              lineHeight: 1.15,
              zIndex: 1,
              maxWidth: 820,
            }}
          >
            Deposit-backed events with instant check-in refund. <br />
            <HeroKeywordsTypewriter />
          </h1>

          <p
            style={{
              fontSize: "1.08rem",
              color: "var(--text-secondary)",
              maxWidth: 720,
              lineHeight: 1.65,
              zIndex: 1,
            }}
          >
            Stop multi-account hoarding and empty venue seats. Attendees stake a small refundable deposit in USDC.
            Scan the dynamic QR challenge at the door to check in and receive an atomic 100% refund straight to your wallet.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 10, zIndex: 1 }}>
            <button className="btn-primary" onClick={onCreateClick} style={{ padding: "12px 24px" }}>
              <span>Host an Event</span>
              <ArrowRight size={17} />
            </button>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: "var(--radius-md)",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-color)",
                fontSize: "0.88rem",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              <Zap size={15} color="var(--rome-flame)" />
              <span>USDC Native Gas • Zero Overbooking</span>
            </div>
          </div>
        </div>
      </div>

      {/* Infinite Running Marquee Ribbon */}
      <MarqueeTickerRibbon />

      {/* Main Content Container */}
      <div className="container" style={{ paddingTop: 36 }}>
        {/* Quick Protocol Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div className="card" style={{ padding: "18px 22px" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
              Public Events
            </span>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 4 }}>
              {events.length}
            </div>
            <span style={{ fontSize: "0.8rem", color: "var(--rome-flame)" }}>Live on-chain</span>
          </div>

          <div className="card" style={{ padding: "18px 22px" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
              Registered Attendees
            </span>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 4 }}>
              {totalRegistered}
            </div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Spots reserved</span>
          </div>

          <div className="card" style={{ padding: "18px 22px" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
              Verified Check-Ins
            </span>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--success)", marginTop: 4 }}>
              {totalCheckedIn}
            </div>
            <span style={{ fontSize: "0.8rem", color: "var(--success)" }}>Instant refunds dispatched</span>
          </div>

          <div className="card" style={{ padding: "18px 22px" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
              Dual-Lane Support
            </span>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 4 }}>
              EVM + SOL
            </div>
            <span style={{ fontSize: "0.8rem", color: "var(--rome-amber)" }}>MetaMask & Solflare</span>
          </div>
        </div>

        {/* Controls Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div className="tabs-container">
            <button
              className={`tab-btn ${filter === "upcoming" ? "active" : ""}`}
              onClick={() => setFilter("upcoming")}
            >
              Upcoming
            </button>
            <button
              className={`tab-btn ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All Events
            </button>
            {userAddress && (
              <button
                className={`tab-btn ${filter === "hosted" ? "active" : ""}`}
                onClick={() => setFilter("hosted")}
              >
                My Hosted Events
              </button>
            )}
          </div>

          {/* Search */}
          <div style={{ position: "relative", minWidth: 280 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 38, width: "100%", fontSize: "0.88rem" }}
              placeholder="Search events, cities, topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: "center",
              padding: "70px 24px",
              color: "var(--text-secondary)",
            }}
          >
            <Calendar size={48} strokeWidth={1.5} color="var(--text-muted)" style={{ margin: "0 auto 18px" }} />
            <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              No events found
            </h3>
            <p style={{ maxWidth: 440, margin: "0 auto 24px", fontSize: "0.95rem", lineHeight: 1.6 }}>
              Be the first to host an event with deposit-backed reservations and dynamic check-in on Rome!
            </p>
            <button className="btn-primary" onClick={onCreateClick}>
              Create an Event
            </button>
          </div>
        ) : (
          <div className="events-grid">
            {filteredEvents.map((ev) => {
              const spotsRemaining = ev.capacity - ev.registeredCount;
              const isFull = spotsRemaining <= 0;
              const depositHuman = formatUnits(ev.depositAmount, ev.isTokenDeposit ? 6 : 18);

              return (
                <div
                  key={Number(ev.id)}
                  className="event-card"
                  onClick={() => onSelectEvent(ev.id)}
                >
                  <div className="event-cover-wrapper">
                    <img
                      src={ev.coverUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800"}
                      alt={ev.title}
                      className="event-cover-img"
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 14,
                        right: 14,
                        display: "flex",
                        gap: 6,
                      }}
                    >
                      <span className="badge badge-yellow" style={{ backdropFilter: "blur(8px)" }}>
                        <Coins size={12} />
                        <span>{depositHuman} USDC</span>
                      </span>
                    </div>

                    {ev.cancelled && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(0,0,0,0.75)",
                          backdropFilter: "blur(4px)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span className="badge" style={{ background: "var(--error-bg)", color: "var(--error)", border: "1px solid var(--error-border)", fontSize: "0.9rem", padding: "6px 14px" }}>
                          Event Cancelled
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="event-card-content">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: "var(--rome-flame)",
                        fontSize: "0.82rem",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        marginBottom: 10,
                      }}
                    >
                      <Calendar size={13} />
                      <span>{formatDate(ev.startTime, ev.timezone)}</span>
                    </div>

                    <h3
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        lineHeight: 1.3,
                        marginBottom: 10,
                        color: "var(--text-primary)",
                      }}
                    >
                      {ev.title}
                    </h3>

                    <p
                      style={{
                        fontSize: "0.9rem",
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                        marginBottom: 16,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {ev.description}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: "var(--text-muted)",
                        fontSize: "0.84rem",
                        marginBottom: 18,
                      }}
                    >
                      <MapPin size={14} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ev.location}
                      </span>
                    </div>

                    {/* Footer Row */}
                    <div
                      style={{
                        marginTop: "auto",
                        paddingTop: 16,
                        borderTop: "1px solid var(--border-color)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                        <Users size={14} color="var(--text-muted)" />
                        <span>
                          {ev.registeredCount} / {ev.capacity} spots
                        </span>
                      </div>

                      {isFull ? (
                        <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
                          Sold Out
                        </span>
                      ) : (
                        <span className="badge badge-green">
                          {spotsRemaining} Left
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
