import React from "react";
import { Ticket, Calendar, MapPin, Coins, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { formatUnits } from "viem";
import type { EventData, TicketData } from "../../lib/slotlock";
import type { RomeConfig } from "../../lib/config";

interface UserTicketItem {
  event: EventData;
  ticket: TicketData;
}

interface MyTicketsProps {
  tickets: UserTicketItem[];
  config: RomeConfig;
  userAddress?: string;
  onSelectEvent: (eventId: bigint) => void;
  onCancelTicket: (eventId: bigint) => Promise<void>;
  onClaimRefund: (eventId: bigint) => Promise<void>;
  isLoading: boolean;
  onExploreClick: () => void;
}

export const MyTickets: React.FC<MyTicketsProps> = ({
  tickets,
  config,
  userAddress,
  onSelectEvent,
  onCancelTicket,
  onClaimRefund,
  isLoading,
  onExploreClick,
}) => {
  const now = BigInt(Math.floor(Date.now() / 1000));

  const getStatusBadge = (status: number, event: EventData) => {
    switch (status) {
      case 1: // Registered
        if (event.cancelled) {
          return <span className="badge badge-yellow">Event Cancelled • Claim Refund</span>;
        }
        if (event.sessionCount === 0 && now > event.checkInEnd) {
          return <span className="badge badge-yellow">Host No-Show • Claim Refund</span>;
        }
        return <span className="badge badge-blue">Spot Reserved</span>;
      case 2: // CheckedIn
        return <span className="badge badge-green">Checked In • Refunded</span>;
      case 3: // Refunded
        return <span className="badge badge-gray">Cancelled & Refunded</span>;
      case 4: // Claimed
        return <span className="badge badge-green">Refund Claimed</span>;
      default:
        return <span className="badge badge-gray">None</span>;
    }
  };

  const formatDate = (start: bigint, tz: string) => {
    const d = new Date(Number(start) * 1000);
    return `${d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })} • ${d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })} (${tz})`;
  };

  return (
    <div className="container" style={{ padding: "40px 20px 80px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>
          My Tickets & Stakes
        </h1>
        <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
          View your confirmed reservations, check-in status, and deposit refund records.
        </p>
      </div>

      {!userAddress ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <Ticket size={48} strokeWidth={1.5} color="var(--text-muted)" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 8 }}>Connect Wallet</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
            Connect your wallet to see events you have registered for.
          </p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <Ticket size={48} strokeWidth={1.5} color="var(--text-muted)" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 8 }}>No Tickets Found</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>
            You haven't reserved any spots yet. Explore upcoming events on Rome!
          </p>
          <button className="btn-primary" onClick={onExploreClick}>
            Explore Events
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {tickets.map(({ event, ticket }) => {
            const depositHuman = formatUnits(event.depositAmount, event.isTokenDeposit ? 6 : 18);
            const isRegistered = ticket.status === 1;
            const canCancel = isRegistered && now <= event.registrationDeadline;
            const canClaim =
              isRegistered &&
              (event.cancelled || (event.sessionCount === 0 && now > event.checkInEnd));

            return (
              <div
                key={Number(event.id)}
                className="card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 20,
                  padding: 24,
                }}
              >
                <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                  <img
                    src={event.coverUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400"}
                    alt={event.title}
                    style={{ width: 100, height: 75, borderRadius: "var(--radius-md)", objectFit: "cover" }}
                  />

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      {getStatusBadge(ticket.status, event)}
                      <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        {depositHuman} USDC Stake
                      </span>
                    </div>

                    <h3
                      style={{ fontSize: "1.15rem", fontWeight: 700, cursor: "pointer", marginBottom: 4 }}
                      onClick={() => onSelectEvent(event.id)}
                    >
                      {event.title}
                    </h3>

                    <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={13} /> {formatDate(event.startTime, event.timezone)}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <MapPin size={13} /> {event.location}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {canCancel && (
                    <button
                      className="btn-secondary"
                      onClick={() => onCancelTicket(event.id)}
                      disabled={isLoading}
                    >
                      Cancel & Refund
                    </button>
                  )}

                  {canClaim && (
                    <button
                      className="btn-accent"
                      onClick={() => onClaimRefund(event.id)}
                      disabled={isLoading}
                    >
                      Claim Refund
                    </button>
                  )}

                  <button
                    className="btn-primary"
                    onClick={() => onSelectEvent(event.id)}
                  >
                    View Ticket Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
