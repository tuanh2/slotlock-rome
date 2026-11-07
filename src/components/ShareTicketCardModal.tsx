import React, { useState, useRef, useEffect } from "react";
import { X, Download, Copy, Share2, Check, ExternalLink, Eye, EyeOff, Sparkles } from "lucide-react";
import type { EventData } from "../../lib/slotlock";
import type { RomeConfig } from "../../lib/config";

export interface ShareTicketData {
  mode: "registered" | "checked_in" | "created";
  event: EventData;
  userAddress?: string;
  txHash?: string;
  depositHuman?: string;
  refundedHuman?: string;
  ticketId?: number | string;
}

interface ShareTicketCardModalProps {
  data: ShareTicketData;
  config: RomeConfig;
  onClose: () => void;
}

// 24x24 Pixel Art Matrix for the mascot (Rome Cyber Tiger / Guardian with Headset)
// 0: transparent, 1: dark outline (#1E1513), 2: tiger orange (#E87A40), 3: white (#FFF), 
// 4: ear blush/pink (#F87171), 5: headset grey (#475569), 6: headset mic/cyan (#38BDF8), 7: stripes (#18181B)
const PIXEL_MASCOT_GRID: number[][] = [
  [0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0],
  [0,0,0,0,1,2,4,2,1,0,0,0,0,0,0,1,2,4,2,1,0,0,0,0],
  [0,0,0,1,2,4,4,2,1,0,0,0,0,0,0,1,2,4,4,2,1,0,0,0],
  [0,0,0,1,2,2,2,2,1,1,1,1,1,1,1,1,2,2,2,2,1,0,0,0],
  [0,0,5,5,5,1,2,2,2,7,7,2,2,7,7,2,2,2,1,5,5,5,0,0],
  [0,5,5,5,5,5,1,2,2,2,7,2,2,7,2,2,2,1,5,5,5,5,5,0],
  [0,5,5,1,1,5,1,2,2,2,2,2,2,2,2,2,2,1,5,1,1,5,5,0],
  [5,5,1,3,3,1,1,2,7,2,2,2,2,2,2,7,2,1,1,3,3,1,5,5],
  [5,5,1,3,3,1,2,2,7,2,2,2,2,2,2,7,2,2,1,3,3,1,5,5],
  [0,5,5,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,5,5,0],
  [0,0,5,1,2,2,3,3,1,2,2,2,2,2,2,1,3,3,2,2,1,5,0,0],
  [0,0,0,1,2,3,1,1,3,1,2,2,2,2,1,3,1,1,3,2,1,0,0,0],
  [0,0,0,1,2,3,1,1,3,1,2,2,2,2,1,3,1,1,3,2,1,0,0,0],
  [0,0,0,1,2,2,3,3,1,2,2,1,1,2,2,1,3,3,2,2,1,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,1,3,3,1,2,2,2,2,2,2,1,0,0,0],
  [0,0,0,1,2,7,2,2,3,3,3,1,1,3,3,3,2,2,7,2,1,0,0,0],
  [0,0,0,1,2,7,2,3,3,3,1,2,2,1,3,3,3,2,7,2,1,0,0,0],
  [0,0,0,0,1,2,2,3,3,3,3,2,2,3,3,3,3,2,2,1,0,0,0,0],
  [0,0,0,0,1,1,2,2,3,3,3,3,3,3,3,3,2,2,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,2,2,2,2,2,2,2,2,2,2,1,1,6,6,0,0,0],
  [0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,1,6,6,6,0,0,0],
  [0,0,0,0,0,0,1,2,7,2,2,2,2,2,2,7,2,1,0,6,0,0,0,0],
  [0,0,0,0,0,0,1,2,7,2,2,2,2,2,2,7,2,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0]
];

const COLOR_MAP: Record<number, string> = {
  1: "#140f0c",
  2: "#f97316", // tiger orange
  3: "#ffffff",
  4: "#fda4af",
  5: "#334155", // slate dark
  6: "#38bdf8", // neon cyan mic
  7: "#7c2d12", // dark stripe
};

export const ShareTicketCardModal: React.FC<ShareTicketCardModalProps> = ({
  data,
  config,
  onClose,
}) => {
  const [showAddress, setShowAddress] = useState(true);
  const [showAmount, setShowAmount] = useState(true);
  const [showTx, setShowTx] = useState(true);
  const [copied, setCopied] = useState(false);
  const [colorTheme, setColorTheme] = useState<"kyoka" | "rome" | "emerald">("kyoka");

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const amountDisplay =
    data.mode === "registered"
      ? `${data.depositHuman || "3.00"} USDC`
      : data.mode === "checked_in"
      ? `+${data.refundedHuman || data.depositHuman || "3.00"} USDC`
      : `${data.depositHuman || "3.00"} USDC`;

  const statusLabel =
    data.mode === "registered"
      ? "SPOT LOCKED"
      : data.mode === "checked_in"
      ? "CHECKED IN"
      : "EVENT CREATED";

  const subtitleLabel =
    data.mode === "registered"
      ? "ATOMIC ESCROW • 100% REFUNDABLE"
      : data.mode === "checked_in"
      ? "100% REFUNDED • VERIFIED ON-CHAIN"
      : "SLOTLOCK ESCROW • HADRIAN TESTNET";

  const truncate = (addr?: string) => {
    if (!addr) return "0x••••••••";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formattedDate = new Date(Number(data.event.startTime) * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Render Card to Canvas for PNG download
  const renderToCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 800;
    const height = 480;
    canvas.width = width;
    canvas.height = height;

    // Background gradient based on theme
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    if (colorTheme === "rome") {
      bgGrad.addColorStop(0, "#190826");
      bgGrad.addColorStop(1, "#0d0214");
    } else if (colorTheme === "emerald") {
      bgGrad.addColorStop(0, "#06221c");
      bgGrad.addColorStop(1, "#020f0d");
    } else {
      // Kyoka dark amber
      bgGrad.addColorStop(0, "#19120e");
      bgGrad.addColorStop(1, "#0f0b09");
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Diagonal isometric pattern lines
    ctx.strokeStyle = colorTheme === "rome" ? "rgba(168, 85, 247, 0.07)" : "rgba(249, 115, 22, 0.07)";
    ctx.lineWidth = 1;
    for (let x = -width; x < width * 2; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + height, height);
      ctx.stroke();
    }
    for (let x = -width; x < width * 2; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - height, height);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = colorTheme === "rome" ? "#7e22ce" : "#ea580c";
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Inner subtle border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    // Header Tag: ■ SLOTLOCK
    ctx.fillStyle = colorTheme === "rome" ? "#c084fc" : "#fb923c";
    ctx.fillRect(40, 36, 14, 14);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.fillText("SLOTLOCK", 64, 48);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px 'Courier New', monospace";
    ctx.textAlign = "right";
    ctx.fillText("#ROMEPROTOCOL  #HADRIAN", width - 40, 48);
    ctx.textAlign = "left";

    // Status & Amount
    ctx.fillStyle = colorTheme === "rome" ? "#d8b4fe" : "#fdba74";
    ctx.font = "bold 20px 'Courier New', monospace";
    ctx.fillText(statusLabel, 40, 105);

    // Pill label for mode
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(200, 88, 250, 24);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.strokeRect(200, 88, 250, 24);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "11px 'Courier New', monospace";
    ctx.fillText(subtitleLabel, 212, 104);

    // Giant Amount
    ctx.fillStyle = data.mode === "checked_in" ? "#4ade80" : "#ffffff";
    ctx.font = "bold 58px 'Courier New', monospace";
    const displayedAmt = showAmount ? amountDisplay : "•••••• USDC";
    ctx.fillText(displayedAmt, 40, 185);

    // Event title
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 22px 'Courier New', monospace";
    const truncTitle = data.event.title.length > 30 ? data.event.title.slice(0, 30) + "..." : data.event.title;
    ctx.fillText(truncTitle, 40, 240);

    // Data table grid
    ctx.fillStyle = "#64748b";
    ctx.font = "12px 'Courier New', monospace";
    ctx.fillText("WALLET", 40, 290);
    ctx.fillText("SEAT #", 210, 290);
    ctx.fillText("DATE", 310, 290);

    ctx.fillStyle = "#f1f5f9";
    ctx.font = "bold 14px 'Courier New', monospace";
    const dispWallet = showAddress ? (data.userAddress ? truncate(data.userAddress) : "CONNECTED") : "0x••••••••";
    ctx.fillText(dispWallet, 40, 312);
    ctx.fillText(`#0${data.ticketId || "1"}`, 210, 312);
    ctx.fillText(formattedDate, 310, 312);

    // TxHash row
    ctx.fillStyle = "#64748b";
    ctx.font = "12px 'Courier New', monospace";
    ctx.fillText("TRANSACTION HASH (ROME HADRIAN)", 40, 360);

    ctx.fillStyle = colorTheme === "rome" ? "#c084fc" : "#fb923c";
    ctx.font = "bold 13px 'Courier New', monospace";
    const dispTx = showTx && data.txHash ? `${data.txHash.slice(0, 18)}...${data.txHash.slice(-8)}` : (showTx ? "ON-CHAIN SETTLED" : "0x••••••••••••••••");
    ctx.fillText(dispTx, 40, 382);

    // Bottom brand tag
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px 'Courier New', monospace";
    ctx.fillText(`SLOTLOCK.APP • VERIFIED ON ROME HADRIAN (CHAIN 200010)`, 40, 435);

    // Draw Pixel Mascot on Right (scale = 8)
    const scale = 7;
    const startX = 540;
    const startY = 130;

    for (let r = 0; r < PIXEL_MASCOT_GRID.length; r++) {
      for (let c = 0; c < PIXEL_MASCOT_GRID[r].length; c++) {
        const val = PIXEL_MASCOT_GRID[r][c];
        if (val !== 0) {
          ctx.fillStyle = COLOR_MAP[val] || "#ffffff";
          ctx.fillRect(startX + c * scale, startY + r * scale, scale, scale);
        }
      }
    }
  };

  useEffect(() => {
    renderToCanvas();
  }, [showAddress, showAmount, showTx, colorTheme, data]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `slotlock-pass-${data.event.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleCopy = () => {
    const text = `🎟️ SlotLock Pass [${statusLabel}]: ${data.event.title}\nStake: ${amountDisplay}\nVerified on Rome Protocol Hadrian!\nCheck it out: ${window.location.origin}/#event/${data.event.id}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareX = () => {
    const text = encodeURIComponent(
      `Just ${data.mode === "checked_in" ? "checked in and claimed my refund at" : "locked my spot for"} "${data.event.title}" on @RomeProtocol! 🎟️\n\nStake-to-reserve with instant on-chain check-in refunds on Hadrian Testnet.\n\n#Rome #SlotLock #Web3`
    );
    const url = encodeURIComponent(`${window.location.origin}/#event/${data.event.id}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 820,
          width: "95%",
          background: "#0c0a09",
          borderRadius: 8,
          border: "2px solid #3b0764",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 6px 6px 0 #3b0764",
          color: "#fff",
          padding: 0,
          overflow: "hidden",
          fontFamily: "'Departure Mono', 'Courier New', monospace",
        }}
      >
        {/* Top Terminal Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 16px",
            background: "#1c1917",
            borderBottom: "1px solid #292524",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fb923c" }}>
            <span>[!] SHARE CARD</span>
            <span style={{ color: "#78716c" }}>•</span>
            <span style={{ color: "#a855f7" }}>ROME HADRIAN</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Color theme selectors */}
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => setColorTheme("kyoka")}
                title="Amber / Kyoka"
                style={{
                  width: 14,
                  height: 14,
                  background: "#f97316",
                  border: colorTheme === "kyoka" ? "2px solid #fff" : "1px solid #000",
                  cursor: "pointer",
                }}
              />
              <button
                onClick={() => setColorTheme("rome")}
                title="Rome Purple"
                style={{
                  width: 14,
                  height: 14,
                  background: "#9333ea",
                  border: colorTheme === "rome" ? "2px solid #fff" : "1px solid #000",
                  cursor: "pointer",
                }}
              />
              <button
                onClick={() => setColorTheme("emerald")}
                title="Emerald"
                style={{
                  width: 14,
                  height: 14,
                  background: "#10b981",
                  border: colorTheme === "emerald" ? "2px solid #fff" : "1px solid #000",
                  cursor: "pointer",
                }}
              />
            </div>

            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#a8a29e",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Card Canvas Container */}
        <div style={{ padding: "16px", display: "flex", justifyContent: "center", background: "#0c0a09" }}>
          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              maxWidth: 780,
              height: "auto",
              display: "block",
              borderRadius: 6,
              imageRendering: "pixelated",
            }}
          />
        </div>

        {/* Bottom Kyoka-style Toolbar */}
        <div
          style={{
            borderTop: "1px solid #292524",
            background: "#14110f",
            padding: "8px 12px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
            gap: 6,
          }}
        >
          <button
            onClick={() => setShowAddress(!showAddress)}
            className="retro-control-btn"
            style={{
              background: showAddress ? "#292524" : "#44403c",
              color: "#e2e8f0",
              border: "1px solid #57534e",
              padding: "8px 6px",
              fontSize: "0.74rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            {showAddress ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{showAddress ? "HIDE ADDR" : "SHOW ADDR"}</span>
          </button>

          <button
            onClick={() => setShowAmount(!showAmount)}
            className="retro-control-btn"
            style={{
              background: showAmount ? "#292524" : "#44403c",
              color: "#e2e8f0",
              border: "1px solid #57534e",
              padding: "8px 6px",
              fontSize: "0.74rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <span>{showAmount ? "HIDE $" : "SHOW $"}</span>
          </button>

          <button
            onClick={() => setShowTx(!showTx)}
            className="retro-control-btn"
            style={{
              background: showTx ? "#292524" : "#44403c",
              color: "#e2e8f0",
              border: "1px solid #57534e",
              padding: "8px 6px",
              fontSize: "0.74rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <span>{showTx ? "HIDE TX" : "SHOW TX"}</span>
          </button>

          <button
            onClick={handleDownload}
            className="retro-control-btn"
            style={{
              background: colorTheme === "rome" ? "#7e22ce" : "#ea580c",
              color: "#ffffff",
              border: "none",
              padding: "8px 6px",
              fontSize: "0.74rem",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Download size={13} />
            <span>DOWNLOAD</span>
          </button>

          <button
            onClick={handleCopy}
            className="retro-control-btn"
            style={{
              background: copied ? "#059669" : "#292524",
              color: "#ffffff",
              border: "1px solid #57534e",
              padding: "8px 6px",
              fontSize: "0.74rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? "COPIED" : "COPY"}</span>
          </button>

          <button
            onClick={handleShareX}
            className="retro-control-btn"
            style={{
              background: "#0284c7",
              color: "#ffffff",
              border: "none",
              padding: "8px 6px",
              fontSize: "0.74rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Share2 size={13} />
            <span>SHARE ON X</span>
          </button>

          <button
            onClick={onClose}
            className="retro-control-btn"
            style={{
              background: "#1c1917",
              color: "#a8a29e",
              border: "1px solid #44403c",
              padding: "8px 6px",
              fontSize: "0.74rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span>CLOSE</span>
          </button>
        </div>

        {/* Explorer link if txHash available */}
        {data.txHash && (
          <div
            style={{
              padding: "8px 16px",
              background: "#0c0a09",
              borderTop: "1px solid #1c1917",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.76rem",
              color: "#94a3b8",
            }}
          >
            <span>ROME HADRIAN TRANSACTION:</span>
            <a
              href={`${config.explorerUrl}/tx/${data.txHash}`}
              target="_blank"
              rel="noreferrer"
              style={{
                color: colorTheme === "rome" ? "#c084fc" : "#fb923c",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                textDecoration: "underline",
              }}
            >
              <span>{data.txHash.slice(0, 16)}...{data.txHash.slice(-8)}</span>
              <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
