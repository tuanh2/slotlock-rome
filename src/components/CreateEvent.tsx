import React, { useState, useRef } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Coins,
  ArrowLeft,
  Shield,
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Sparkles,
} from "lucide-react";
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

  // Image upload mode: "upload" (file picker), "presets", "url"
  const [imageMode, setImageMode] = useState<"upload" | "presets" | "url">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Process & compress uploaded image file to lightweight optimized Data URI
  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (JPG, PNG, WebP, GIF).");
      return;
    }

    setIsProcessingImage(true);
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new window.Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 562; // 16:9 ratio
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setCoverUrl(e.target?.result as string);
          setIsProcessingImage(false);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG with 0.82 quality for high fidelity and fast loading
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        setCoverUrl(dataUrl);

        // Approximate size
        const sizeInKb = Math.round((dataUrl.length * (3 / 4)) / 1024);
        setUploadedFileSize(`${sizeInKb} KB`);
        setIsProcessingImage(false);
      };
      img.onerror = () => {
        setIsProcessingImage(false);
        alert("Failed to read image.");
      };
    };
    reader.onerror = () => {
      setIsProcessingImage(false);
      alert("Error reading file.");
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const removeUploadedImage = () => {
    setCoverUrl(PRESET_COVERS[0].url);
    setUploadedFileName(null);
    setUploadedFileSize(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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

  const isCustomUploaded = coverUrl.startsWith("data:image");

  return (
    <div className="container" style={{ maxWidth: 780, padding: "30px 20px 80px" }}>
      <button onClick={onBack} className="nav-btn" style={{ marginBottom: 20, paddingLeft: 0 }}>
        <ArrowLeft size={16} />
        <span>Back to Events</span>
      </button>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "var(--font-pix)", fontSize: "0.78rem", color: "var(--royal-purple)", marginBottom: 6 }}>
          [ ROME ARENA // PUBLISH EVENT ]
        </div>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}>
          Host an Event in the <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--royal-purple)" }}>Arena</span>
        </h1>
        <p style={{ fontSize: "0.98rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Require a small refundable deposit in USDC to guarantee attendance. Every event is written directly to the Rome Hadrian smart contract with a verifiable transaction hash (`txHash`), visible to all participants.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: "36px 32px" }}>
        {/* Title */}
        <div className="form-group">
          <label className="form-label">Event Name *</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Solana x EVM Builders Meetup"
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
              style={{ width: 120, padding: "5px 12px", height: 36, fontFamily: "var(--font-pix)" }}
              placeholder="Custom"
              value={customDeposit}
              onChange={(e) => setCustomDeposit(e.target.value)}
            />
          </div>
          <span className="form-hint" style={{ marginTop: 6 }}>
            Attendees who scan the dynamic QR code at the venue will have their <b>{depositValue} USDC</b> instantly refunded.
          </span>
        </div>

        {/* Cover Image Upload & Selection Section */}
        <div className="form-group" style={{ marginBottom: 26 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Cover Image *</label>
            {/* Mode Switcher */}
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className={`preset-pill ${imageMode === "upload" ? "active" : ""}`}
                onClick={() => setImageMode("upload")}
                style={{ padding: "4px 12px", fontSize: "0.75rem" }}
              >
                Upload File
              </button>
              <button
                type="button"
                className={`preset-pill ${imageMode === "presets" ? "active" : ""}`}
                onClick={() => setImageMode("presets")}
                style={{ padding: "4px 12px", fontSize: "0.75rem" }}
              >
                Preset Covers
              </button>
              <button
                type="button"
                className={`preset-pill ${imageMode === "url" ? "active" : ""}`}
                onClick={() => setImageMode("url")}
                style={{ padding: "4px 12px", fontSize: "0.75rem" }}
              >
                Custom URL
              </button>
            </div>
          </div>

          {/* Mode 1: Direct File Upload Area */}
          {imageMode === "upload" && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={handleFileChange}
              />

              {isCustomUploaded ? (
                /* Uploaded Preview with Remove Button */
                <div
                  style={{
                    position: "relative",
                    borderRadius: "var(--radius-lg)",
                    overflow: "hidden",
                    border: "2px solid var(--royal-purple)",
                    boxShadow: "var(--shadow-md)",
                  }}
                >
                  <img
                    src={coverUrl}
                    alt="Cover preview"
                    style={{ width: "100%", height: 210, objectFit: "cover", display: "block" }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: "rgba(25, 20, 31, 0.78)",
                      backdropFilter: "blur(8px)",
                      padding: "10px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      color: "#FFFFFF",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem" }}>
                      <CheckCircle2 size={16} color="var(--success)" />
                      <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>
                        {uploadedFileName || "Uploaded Custom Image"}
                      </span>
                      {uploadedFileSize && (
                        <span className="badge badge-gray" style={{ background: "rgba(255,255,255,0.15)", color: "#FFFFFF", padding: "2px 6px" }}>
                          {uploadedFileSize}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={removeUploadedImage}
                        className="btn-danger"
                        style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Drag & Drop Upload Zone */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${isDragging ? "var(--royal-purple)" : "var(--border-color)"}`,
                    background: isDragging ? "var(--bg-secondary)" : "#FFFFFF",
                    borderRadius: "var(--radius-lg)",
                    padding: "36px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      background: "var(--purple-pill-bg)",
                      border: "1.5px solid var(--purple-pill-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--royal-purple)",
                      margin: "0 auto 12px",
                      boxShadow: "2px 2px 0 rgba(88,28,135,0.1)",
                    }}
                  >
                    <UploadCloud size={26} strokeWidth={2.2} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)", marginBottom: 4 }}>
                    {isProcessingImage ? "Processing & Compressing Image..." : "Click or Drag & Drop to Upload Cover"}
                  </div>
                  <div style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
                    Supports PNG, JPG, WebP, GIF. Automatically optimized for on-chain persistence.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Preset Covers */}
          {imageMode === "presets" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {PRESET_COVERS.map((preset, idx) => (
                  <div
                    key={idx}
                    onClick={() => setCoverUrl(preset.url)}
                    style={{
                      border: coverUrl === preset.url ? "2px solid var(--royal-purple)" : "1.5px solid var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                      cursor: "pointer",
                      position: "relative",
                      height: 100,
                      boxShadow: coverUrl === preset.url ? "2px 2px 0 var(--royal-purple)" : "none",
                    }}
                  >
                    <img src={preset.url} alt={preset.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: "rgba(0,0,0,0.65)",
                        color: "#FFFFFF",
                        padding: "4px 8px",
                        fontSize: "0.78rem",
                        fontFamily: "var(--font-pix)",
                      }}
                    >
                      {preset.label} {coverUrl === preset.url && "✓"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mode 3: Direct URL */}
          {imageMode === "url" && (
            <div>
              <input
                type="url"
                className="form-input"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
              />
            </div>
          )}
        </div>

        {/* Policy Summary */}
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1.5px solid var(--purple-pill-border)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            marginBottom: 26,
            boxShadow: "2px 2px 0 rgba(88,28,135,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Shield size={16} color="var(--royal-purple)" />
            <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--royal-purple)", fontFamily: "var(--font-pix)" }}>
              [ CONTRACT-GUARANTEED TERMS ]
            </span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            • Check-in window opens 30m prior to start and lasts until 1h after start.<br />
            • Registrations can be self-cancelled before deadline for a full refund.<br />
            • If you do not open check-in at the venue, attendees can self-claim their refunds after the event.<br />
            • <b>Transaction Hash (`txHash`):</b> Once published, an on-chain transaction hash will be generated on Rome Hadrian Testnet, linking your wallet permanently to this event.
          </p>
        </div>

        <button
          type="submit"
          className="btn-primary"
          style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "1.05rem" }}
          disabled={isLoading || !userAddress}
        >
          {isLoading ? "Publishing on Rome Testnet..." : !userAddress ? "Connect Wallet to Publish" : "Publish Event on Rome"}
        </button>
      </form>
    </div>
  );
};
