import React, { useState } from "react";
import { Calendar, MapPin, Users, Coins, Search, ArrowRight, Clock, LayoutList, LayoutGrid } from "lucide-react";
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
  const [viewMode, setViewMode] = useState<"column" | "grid">("column");
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

  const getDateParts = (timestamp: bigint) => {
    const d = new Date(Number(timestamp) * 1000);
    const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const day = d.getDate();
    const weekday = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return { month, day, weekday, time };
  };

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
    <div style={{ paddingBottom: 60, position: "relative", zIndex: 1 }}>
      {/* Hero Section (Arena Style Layout) */}
      <div className="container" style={{ paddingTop: 40, paddingBottom: 32 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: 40,
            alignItems: "center",
          }}
        >
          {/* Left Column: Headline and Philosophy */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-pix)",
                fontSize: "0.78rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>[ HOST YOUR EVENT // ROME ARENA ]</span>
            </div>

            <h1
              style={{
                fontSize: "clamp(2.3rem, 5vw, 3.8rem)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                lineHeight: 1.12,
                color: "var(--text-primary)",
                marginBottom: 18,
              }}
            >
              Put your event <br />
              in the <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontWeight: 700, color: "var(--royal-purple)" }}>Arena</span>
            </h1>

            <p
              style={{
                fontSize: "1.12rem",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                marginBottom: 20,
                maxWidth: 520,
              }}
            >
              One event, two kinds of wallet. Solana users and EVM users reserve seats with small refundable USDC deposits. Dynamic QR check-in dispatches instant on-chain refunds at the door.
            </p>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-pix)" }}>
                :: PROTOCOL CAPABILITY ::
              </div>
              <HeroKeywordsTypewriter />
            </div>

            {/* Pill Tags like the Screenshot */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 26 }}>
              <span className="badge badge-blue">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--royal-purple)" }} />
                Solana app
              </span>
              <span className="badge badge-blue">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--royal-purple)" }} />
                EVM app
              </span>
              <span className="badge badge-blue">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--royal-purple)" }} />
                Both lanes
              </span>
              <span className="badge badge-gray">
                400ms CPI Settlement
              </span>
            </div>

            <div style={{ display: "flex", gap: 14 }}>
              <button className="btn-primary" onClick={onCreateClick} style={{ padding: "12px 28px" }}>
                <span>Register Event</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>

          {/* Right Column: The White Arena Card (Exact match to screenshot!) */}
          <div className="card" style={{ padding: "34px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-pix)" }}>
                [ PROTOCOL ESCROW ]
              </span>
              <span className="badge badge-green">Hadrian 200010</span>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Stake Token</label>
              <div
                className="form-input"
                style={{ background: "var(--bg-secondary)", border: "1.5px solid var(--border-color)", fontWeight: 600, color: "var(--royal-purple)", fontFamily: "var(--font-pix)", fontSize: "0.86rem" }}
              >
                Circle USDC (Native Gas & Escrow)
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Stake Presets</label>
              <div style={{ display: "flex", gap: 8 }}>
                <span className="preset-pill active">1 USDC</span>
                <span className="preset-pill">3 USDC</span>
                <span className="preset-pill">5 USDC</span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Check-In Mechanism</label>
              <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Dynamic venue QR rotates every 30s. Verified via ECDSA authorized challenge signature. 100% atomic refund to original reserving wallet.
              </div>
            </div>

            <div style={{ borderTop: "1.5px solid var(--border-color)", paddingTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.84rem", color: "var(--text-muted)", fontFamily: "var(--font-pix)" }}>TOTAL ESCROW LOCKED</span>
              <span style={{ fontFamily: "var(--font-pix)", fontWeight: 700, color: "var(--royal-purple)", fontSize: "1.1rem" }}>
                {totalRegistered * 3} USDC
              </span>
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
          <div className="card" style={{ padding: "20px 24px" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontFamily: "var(--font-pix)", textTransform: "uppercase" }}>
              [ 01 // EVENTS ]
            </span>
            <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 4 }}>
              {events.length}
            </div>
            <span style={{ fontSize: "0.82rem", color: "var(--royal-purple)", fontWeight: 600 }}>Active on Rome</span>
          </div>

          <div className="card" style={{ padding: "20px 24px" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontFamily: "var(--font-pix)", textTransform: "uppercase" }}>
              [ 02 // STAKED SEATS ]
            </span>
            <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 4 }}>
              {totalRegistered}
            </div>
            <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Reserved spots</span>
          </div>

          <div className="card" style={{ padding: "20px 24px" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontFamily: "var(--font-pix)", textTransform: "uppercase" }}>
              [ 03 // REFUNDED ]
            </span>
            <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--success)", marginTop: 4 }}>
              {totalCheckedIn}
            </div>
            <span style={{ fontSize: "0.82rem", color: "var(--success)", fontWeight: 600 }}>Instant settlements</span>
          </div>

          <div className="card" style={{ padding: "20px 24px" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontFamily: "var(--font-pix)", textTransform: "uppercase" }}>
              [ 04 // DUAL-LANE ]
            </span>
            <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--royal-purple)", marginTop: 4 }}>
              EVM + SOL
            </div>
            <span style={{ fontSize: "0.82rem", color: "var(--royal-purple)" }}>MetaMask & Solflare</span>
          </div>
        </div>

        {/* Controls Bar & View Switcher */}
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

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* View Mode Toggle */}
            <div
              style={{
                display: "inline-flex",
                background: "var(--bg-secondary)",
                borderRadius: "var(--radius-md)",
                padding: "3px",
                border: "1.5px solid var(--border-color)",
              }}
            >
              <button
                onClick={() => setViewMode("column")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: viewMode === "column" ? "#FFFFFF" : "transparent",
                  color: viewMode === "column" ? "var(--royal-purple)" : "var(--text-secondary)",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-pix)",
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  boxShadow: viewMode === "column" ? "1px 1px 0 rgba(88,28,135,0.15)" : "none",
                }}
              >
                <LayoutList size={14} />
                <span>Column</span>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: viewMode === "grid" ? "#FFFFFF" : "transparent",
                  color: viewMode === "grid" ? "var(--royal-purple)" : "var(--text-secondary)",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-pix)",
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  boxShadow: viewMode === "grid" ? "1px 1px 0 rgba(88,28,135,0.15)" : "none",
                }}
              >
                <LayoutGrid size={14} />
                <span>Grid</span>
              </button>
            </div>

            {/* Search */}
            <div style={{ position: "relative", minWidth: 260 }}>
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
        </div>

        {/* Events Content */}
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
        ) : viewMode === "column" ? (
          /* Intuitive Date-Column Timeline View */
          <div className="events-column-list">
            {filteredEvents.map((ev) => {
              const spotsRemaining = ev.capacity - ev.registeredCount;
              const isFull = spotsRemaining <= 0;
              const depositHuman = formatUnits(ev.depositAmount, ev.isTokenDeposit ? 6 : 18);
              const dateParts = getDateParts(ev.startTime);

              return (
                <div
                  key={Number(ev.id)}
                  className="event-col-card"
                  onClick={() => onSelectEvent(ev.id)}
                >
                  {/* Left Column: Date Tile */}
                  <div className="event-date-tile">
                    <span className="event-date-month">{dateParts.month}</span>
                    <span className="event-date-day">{dateParts.day}</span>
                    <span className="event-date-weekday">{dateParts.weekday}</span>
                  </div>

                  {/* Thumbnail */}
                  <div className="event-thumb-wrapper">
                    <img
                      src={ev.coverUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800"}
                      alt={ev.title}
                      className="event-thumb-img"
                    />
                  </div>

                  {/* Middle Column: Event Info */}
                  <div className="event-col-content">
                    <div className="event-col-meta">
                      <span className="badge badge-blue">
                        <Coins size={12} />
                        <span>{depositHuman} USDC Deposit</span>
                      </span>

                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-pix)", fontSize: "0.78rem", color: "var(--royal-purple)" }}>
                        <Clock size={13} />
                        <span>{dateParts.time} ({ev.timezone})</span>
                      </span>

                      {ev.cancelled && (
                        <span className="badge" style={{ background: "var(--error-bg)", color: "var(--error)" }}>
                          Cancelled
                        </span>
                      )}
                    </div>

                    <h3 className="event-col-title">{ev.title}</h3>

                    <p className="event-col-desc">{ev.description}</p>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: "0.84rem" }}>
                      <MapPin size={14} color="var(--royal-purple)" />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ev.location}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Spots & Action */}
                  <div className="event-col-actions">
                    <div style={{ textAlign: "right", width: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: "0.78rem", fontFamily: "var(--font-pix)", color: "var(--text-muted)" }}>
                          SEATS
                        </span>
                        {isFull ? (
                          <span className="badge badge-gray" style={{ padding: "2px 8px" }}>Full</span>
                        ) : (
                          <span className="badge badge-green" style={{ padding: "2px 8px" }}>
                            {spotsRemaining} Left
                          </span>
                        )}
                      </div>

                      <div className="progress-bar" style={{ width: "100%", margin: "4px 0" }}>
                        <div
                          className="progress-fill"
                          style={{ width: `${Math.min(100, (ev.registeredCount / ev.capacity) * 100)}%` }}
                        />
                      </div>

                      <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-pix)", color: "var(--text-muted)" }}>
                        {ev.registeredCount}/{ev.capacity} reserved
                      </span>
                    </div>

                    <button
                      className="btn-secondary"
                      style={{ padding: "8px 16px", fontSize: "0.86rem", fontFamily: "var(--font-pix)" }}
                    >
                      <span>View Event</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Grid View */
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
                      <span className="badge badge-blue" style={{ background: "#FFFFFF", color: "var(--royal-purple)", boxShadow: "var(--shadow-sm)" }}>
                        <Coins size={12} />
                        <span>{depositHuman} USDC Deposit</span>
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
                        color: "var(--royal-purple)",
                        fontSize: "0.82rem",
                        fontFamily: "var(--font-pix)",
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
                        borderTop: "1.5px solid var(--border-color)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "var(--text-secondary)", fontFamily: "var(--font-pix)" }}>
                        <Users size={14} color="var(--text-muted)" />
                        <span>
                          {ev.registeredCount} / {ev.capacity} spots
                        </span>
                      </div>

                      {isFull ? (
                        <span className="badge badge-gray">
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
