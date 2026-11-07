import React, { useState } from "react";
import { Lock, Ticket, Plus, Compass, Wallet as WalletIcon, ChevronDown, CheckCircle2, Zap } from "lucide-react";
import type { Hex } from "viem";
import type { Wallet as SolanaWalletItem } from "../../lib/solanaWallet";

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  evmAddr?: Hex;
  solPk?: string;
  solSynth?: Hex;
  solWallets: SolanaWalletItem[];
  onConnectEvm: () => void;
  onConnectSol: (w: SolanaWalletItem) => void;
  onDisconnect: () => void;
  isConnecting: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  evmAddr,
  solPk,
  solSynth,
  solWallets,
  onConnectEvm,
  onConnectSol,
  onDisconnect,
  isConnecting,
}) => {
  const [showWalletModal, setShowWalletModal] = useState(false);

  const isConnected = !!evmAddr || !!solPk;

  const truncate = (str?: string) => {
    if (!str) return "";
    return str.slice(0, 6) + "..." + str.slice(-4);
  };

  return (
    <>
      <header className="navbar">
        <div className="container nav-inner">
          <div className="logo-group" onClick={() => setCurrentTab("explore")}>
            <div className="logo-icon">
              <Zap size={20} strokeWidth={2.5} />
            </div>
            <span>SlotLock</span>
            <span className="logo-badge">ROME</span>
          </div>

          <div className="nav-links">
            <button
              className={`nav-btn ${currentTab === "explore" ? "active" : ""}`}
              onClick={() => setCurrentTab("explore")}
            >
              <Compass size={17} />
              <span>Explore</span>
            </button>

            <button
              className={`nav-btn ${currentTab === "create" ? "active" : ""}`}
              onClick={() => setCurrentTab("create")}
            >
              <Plus size={17} />
              <span>Create Event</span>
            </button>

            <button
              className={`nav-btn ${currentTab === "my-tickets" ? "active" : ""}`}
              onClick={() => setCurrentTab("my-tickets")}
            >
              <Ticket size={17} />
              <span>My Tickets</span>
            </button>
          </div>

          {/* Wallet Section */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Network Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: "var(--radius-full)",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-color)",
                fontSize: "0.78rem",
                fontFamily: "var(--font-mono)",
                color: "var(--text-secondary)",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--success)",
                  boxShadow: "0 0 8px rgba(16, 185, 129, 0.6)",
                }}
              />
              <span style={{ fontWeight: 600 }}>Hadrian 200010</span>
            </div>

            {isConnected ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  className="mono-addr"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 12px",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                  }}
                  onClick={() => setShowWalletModal(true)}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: evmAddr ? "var(--rome-flame)" : "#9945FF",
                    }}
                  />
                  <span>
                    {evmAddr ? truncate(evmAddr) : truncate(solPk)}
                  </span>
                  {solSynth && (
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      (Synth: {truncate(solSynth)})
                    </span>
                  )}
                  <ChevronDown size={14} color="var(--text-muted)" />
                </div>
                <button
                  className="btn-secondary"
                  style={{ padding: "7px 12px", fontSize: "0.82rem" }}
                  onClick={onDisconnect}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                className="btn-primary"
                onClick={() => setShowWalletModal(true)}
                disabled={isConnecting}
              >
                <WalletIcon size={16} />
                <span>{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Wallet Selector Modal */}
      {showWalletModal && (
        <div className="modal-overlay" onClick={() => setShowWalletModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 440 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Connect to Rome
              </h3>
              <button
                onClick={() => setShowWalletModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.5 }}>
              Choose your wallet to interact with SlotLock on Rome Hadrian Testnet. Dual-lane supports MetaMask (EVM) and Solana wallets with synthetic derivation.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* EVM Lane Option */}
              <button
                onClick={() => {
                  onConnectEvm();
                  setShowWalletModal(false);
                }}
                className="card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  cursor: "pointer",
                  border: evmAddr ? "1px solid var(--rome-flame)" : "1px solid var(--border-color)",
                  background: "rgba(255, 255, 255, 0.03)",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: "rgba(255, 72, 0, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--rome-flame)",
                      fontSize: "1.2rem",
                    }}
                  >
                    🦊
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.98rem", color: "var(--text-primary)" }}>
                      MetaMask / EVM Lane
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Chain ID: 200010 (Rome Hadrian)
                    </div>
                  </div>
                </div>
                {evmAddr && <CheckCircle2 size={18} color="var(--rome-flame)" />}
              </button>

              {/* Solana Wallets (Standard) */}
              {solWallets.length > 0 ? (
                solWallets.map((w) => (
                  <button
                    key={w.name}
                    onClick={() => {
                      onConnectSol(w);
                      setShowWalletModal(false);
                    }}
                    className="card"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 20px",
                      cursor: "pointer",
                      border: solPk ? "1px solid #9945FF" : "1px solid var(--border-color)",
                      background: "rgba(255, 255, 255, 0.03)",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      {w.icon ? (
                        <img src={w.icon} alt={w.name} style={{ width: 38, height: 38, borderRadius: 10 }} />
                      ) : (
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: "rgba(153, 69, 255, 0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#9945FF",
                            fontSize: "1.2rem",
                          }}
                        >
                          🟣
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.98rem", color: "var(--text-primary)" }}>
                          {w.name} (Solana Lane)
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          Auto-derives synthetic Rome address
                        </div>
                      </div>
                    </div>
                    {solPk && <CheckCircle2 size={18} color="#9945FF" />}
                  </button>
                ))
              ) : (
                <div
                  style={{
                    padding: "14px 18px",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px dashed var(--border-color)",
                    fontSize: "0.82rem",
                    color: "var(--text-muted)",
                    textAlign: "center",
                  }}
                >
                  No Solana Wallet Standard extension detected (e.g. Solflare). You can use MetaMask EVM.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
