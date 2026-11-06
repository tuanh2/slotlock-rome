import React, { useState } from "react";
import { Calendar, Clock, MapPin, Users, Coins, Image, ArrowLeft, Shield } from "lucide-react";
import { parseUnits } from "viem";
import type { CreateEventInput } from "../../lib/slotlock";

interface CreateEventProps {
  onBack: () => void;
  onSubmit: (input: CreateEventInput) => Promise<void>;
  isLoading: boolean;
  userAddress?: string;
}

const PRESET_COVERS = [
  { label: "Tech Meetup", url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1000" },
  { label: "Developer Workshop", url: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1000" },
  { label: "Community Dinner", url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1000" },
  { label: "Crypto / Web3", url: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1000" },
];

export const CreateEvent: React.FC<CreateEventProps> = ({
  onBack,
  onSubmit,
  isLoading,
  userAddress,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState(PRESET_COVERS[0].url);
  const [location, setLocation] = useState("");
  const [timezone, setTimezone] = useState("UTC");

  // Dates
  const tomorrow = new Date(Date.now() + 86400000);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(tomorrowStr);
  const [startTime, setStartTime] = useState("18:00");
  const [endDate, setEndDate] = useState(tomorrowStr);
  const [endTime, setEndTime] = useState("20:30");

  const [capacity, setCapacity] = useState("30");
  const [depositPreset, setDepositPreset] = useState("3");
  const [customDeposit, setCustomDeposit] = useState("");

  const depositValue = customDeposit ? customDeposit : depositPreset;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !location) {
      alert("Please fill in all required fields.");
      return;
    }

    const startTimestamp = BigInt(Math.floor(new Date(`${startDate}T${startTime}:00`).getTime() / 1000));
    const endTimestamp = BigInt(Math.floor(new Date(`${endDate}T${endTime}:00`).getTime() / 1000));

    if (endTimestamp <= startTimestamp) {
      alert("Event end time must be after start time.");
      return;
    }

    // Default registration deadline: 2 hours before start time
    const registrationDeadline = startTimestamp - 7200n;
    // Default check-in window: opens 30 minutes before start, ends 1 hour after start
    const checkInStart = startTimestamp - 1800n;
    const checkInEnd = startTimestamp + 3600n;

    const depositAmount = parseUnits(depositValue || "3", 6); // wUSDC (6 decimals)

    const input: CreateEventInput = {
      title,
      description,
      coverUrl,
      location,
      startTime: startTimestamp,
      endTime: endTimestamp,
      timezone,
      capacity: Number(capacity) || 20,
      registrationDeadline,
      checkInStart,
      checkInEnd,
      depositAmount,
      isTokenDeposit: true, // wUSDC token deposit
    };

    await onSubmit(input);
  };

  return (
    <div className="container" style={{ maxWidth: 760, padding: "30px 20px 80px" }}>
      <button onClick={onBack} className="nav-btn" style={{ marginBottom: 20, paddingLeft: 0 }}>
        <ArrowLeft size={16} />
        <span>Back to Events</span>
      </button>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}>
          Create an Event
        </h1>
        <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
          Require a small refundable deposit to guarantee attendance and eliminate no-shows.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: 32 }}>
        {/* Title */}
        <div className="form-group">
          <label className="form-label">Event Name *</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Rome Developers & Founders Night"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label">Description *</label>
          <textarea
            className="form-textarea"
            rows={4}
            placeholder="Tell guests what to expect, the agenda, speakers, refreshments..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Location */}
        <div className="form-group">
          <label className="form-label">Location / Attendance Guide *</label>
          <input
            type="text"
            className="form-input"
            placeholder="Physical address or Google Meet / Discord link"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </div>

        {/* Date & Time */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Starts *</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="date"
                className="form-input"
                style={{ flex: 1 }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <input
                type="time"
                className="form-input"
                style={{ width: 110 }}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Ends *</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="date"
                className="form-input"
                style={{ flex: 1 }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
              <input
                type="time"
                className="form-input"
                style={{ width: 110 }}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Timezone & Capacity */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Timezone</label>
            <select
              className="form-select"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="UTC">UTC (Universal Time)</option>
              <option value="ICT">ICT (UTC+7, Vietnam / Bangkok)</option>
              <option value="EST">EST (UTC-5, New York)</option>
              <option value="PST">PST (UTC-8, San Francisco)</option>
              <option value="GMT">GMT (London)</option>
              <option value="JST">JST (UTC+9, Tokyo)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Capacity (Total Spots) *</label>
            <input
              type="number"
              className="form-input"
              min="1"
              max="10000"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Deposit Setting */}
        <div className="form-group">
          <label className="form-label">Refundable Stake Deposit (USDC) *</label>
          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 8 }}>
            Default is 3 USDC. Recommended presets increase attendance commitment:
          </div>
          <div className="preset-group">
            {["1", "3", "5"].map((p) => (
              <button
                key={p}
                type="button"
                className={`preset-pill ${depositPreset === p && !customDeposit ? "active" : ""}`}
                onClick={() => {
                  setDepositPreset(p);
                  setCustomDeposit("");
                }}
              >
                {p} USDC
              </button>
            ))}
            <input
              type="number"
              step="0.5"
              min="0.1"
              className="form-input"
              style={{ width: 120, padding: "5px 12px", height: 34 }}
              placeholder="Custom"
              value={customDeposit}
              onChange={(e) => setCustomDeposit(e.target.value)}
            />
          </div>
          <span className="form-hint" style={{ marginTop: 6 }}>
            Attendees who scan the dynamic QR code at the venue will have their <b>{depositValue} USDC</b> instantly refunded.
          </span>
        </div>

        {/* Cover Image */}
        <div className="form-group">
          <label className="form-label">Cover Image URL</label>
          <input
            type="url"
            className="form-input"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://..."
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {PRESET_COVERS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                className={`preset-pill ${coverUrl === preset.url ? "active" : ""}`}
                onClick={() => setCoverUrl(preset.url)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Policy Summary */}
        <div className="policy-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Shield size={16} color="var(--accent)" />
            <span style={{ fontSize: "0.88rem", fontWeight: 700 }}>Contract-Guaranteed Terms</span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            • Check-in window opens 30m prior to start and lasts until 1h after start.<br />
            • Registrations can be self-cancelled before deadline for a full refund.<br />
            • If you do not open check-in at the venue, attendees can self-claim their refunds after the event.
          </p>
        </div>

        <button
          type="submit"
          className="btn-accent"
          style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "1rem" }}
          disabled={isLoading || !userAddress}
        >
          {isLoading ? "Publishing on Rome..." : !userAddress ? "Connect Wallet to Publish" : "Publish Event on Rome"}
        </button>
      </form>
    </div>
  );
};
