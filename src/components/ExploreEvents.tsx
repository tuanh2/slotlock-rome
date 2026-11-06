import React, { useState } from "react";
import { Calendar, MapPin, Users, Coins, Search, ShieldCheck, ArrowRight } from "lucide-react";
import { formatUnits } from "viem";
import type { EventData } from "../../lib/slotlock";

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

  return (
    <div className="container" style={{ padding: "40px 20px" }}>
      {/* Hero Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #181b22 0%, #0d0f13 100%)",
          borderRadius: "var(--radius-lg)",
          padding: "48px 36px",
          color: "#ffffff",
          marginBottom: 36,
          boxShadow: "var(--shadow-md)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className="badge badge-green">Live on Rome Hadrian Testnet</span>
          <span style={{ fontSize: "0.85rem", color: "#a1a1aa" }}>• 400ms atomic settlement</span>
        </div>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
          Event hosting with stake-to-reserve & self-service check-in.
        </h1>
        <p style={{ fontSize: "1.05rem", color: "#d4d4d8", maxWidth: 680, lineHeight: 1.6 }}>
          Eliminate no-shows and multi-account hoarding. Attendees deposit a small refundable stake (e.g. 1–5 USDC).
          Scan the dynamic venue QR code to check in and receive an instant 100% refund on-chain.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button className="btn-accent" onClick={onCreateClick}>
            <span>Create New Event</span>
            <ArrowRight size={16} />
          </button>
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
          marginBottom: 20,
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
        <div style={{ position: "relative", minWidth: 260 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 36, width: "100%", fontSize: "0.88rem" }}
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
            padding: "60px 20px",
            color: "var(--text-secondary)",
          }}
        >
          <Calendar size={48} strokeWidth={1.5} color="var(--text-muted)" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            No events found
          </h3>
          <p style={{ maxWidth: 400, margin: "0 auto 20px", fontSize: "0.92rem" }}>
            Be the first to host an event with deposit-backed reservations on Rome!
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
                      top: 12,
                      right: 12,
                      display: "flex",
                      gap: 6,
                    }}
                  >
                    <span className="badge badge-blue" style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)" }}>
                      <Coins size={12} />
                      {depositHuman} USDC Deposit
                    </span>
                  </div>
                </div>

                <div className="event-card-content">
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--accent)", marginBottom: 6 }}>
                    {formatDate(ev.startTime, ev.timezone)}
                  </div>

                  <h3
                    style={{
                      fontSize: "1.15rem",
                      fontWeight: 700,
                      marginBottom: 8,
                      lineHeight: 1.3,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {ev.title}
                  </h3>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 12 }}>
                    <MapPin size={14} color="var(--text-muted)" />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.location}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: "0.86rem",
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

                  <div style={{ marginTop: "auto", borderTop: "1px solid var(--border-light)", paddingTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: isFull ? "var(--error)" : "var(--text-secondary)" }}>
                      <Users size={14} />
                      <span>{isFull ? "Event Full" : `${spotsRemaining} spots left`}</span>
                    </div>

                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4 }}>
                      View Details →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
