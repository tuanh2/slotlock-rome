import React, { useState } from "react";
import { Lock, Ticket, Plus, Compass, Wallet as WalletIcon, ChevronDown, CheckCircle2 } from "lucide-react";
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
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "#121417",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff"
            }}>
              <Lock size={18} strokeWidth={2.5} />
            </div>
            <span>SlotLock</span>
            <span className="logo-badge">ROME</span>
          </div>

          <nav className="nav-links">
            <button
              className={`nav-btn ${currentTab === "explore" ? "active" : ""}`}
              onClick={() => setCurrentTab("explore")}
            >
              <Compass size={17} />
              <span>Explore</span>
            </button>

            <button
              className={`nav-btn ${currentTab === "tickets" ? "active" : ""}`}
              onClick={() => setCurrentTab("tickets")}
            >
              <Ticket size={17} />
              <span>My Tickets</span>
            </button>

            <button
              className={`nav-btn ${currentTab === "create" ? "active" : ""}`}
              onClick={() => setCurrentTab("create")}
            >
              <Plus size={17} />
              <span>Create Event</span>
            </button>
          </nav>

          <div>
            {isConnected ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="wallet-pill" onClick={() => setShowWalletModal(true)} style={{ cursor: "pointer" }}>
                  <div className="wallet-dot" />
                  <span>
                    {evmAddr ? `MetaMask (${truncate(evmAddr)})` : `Solana (${truncate(solPk)})`}
                  </span>
                  <ChevronDown size={14} color="#888" />
                </div>
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

      {/* Wallet Connection Modal */}
      {showWalletModal && (
        <div className="modal-overlay" onClick={() => setShowWalletModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                {isConnected ? "Connected Wallet" : "Connect on Rome"}
              </h3>
              <button
                onClick={() => setShowWalletModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#888" }}
              >
                ✕
              </button>
            </div>

            {isConnected ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "var(--bg-subtle)", padding: 16, borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 4 }}>
                    {evmAddr ? "EVM Address (MetaMask Lane)" : "Solana Wallet & Rome Synthetic Address"}
                  </div>
                  <div className="mono-addr" style={{ wordBreak: "break-all", fontSize: "0.88rem" }}>
                    {evmAddr || solPk}
                  </div>
                  {solSynth && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Synthetic EVM:</div>
                      <div className="mono-addr" style={{ fontSize: "0.78rem" }}>{solSynth}</div>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  Network: <b>Rome Hadrian Testnet</b> (Chain ID 200010)
                </div>

                <button
                  className="btn-danger"
                  style={{ width: "100%", justifyContent: "center", padding: "10px" }}
                  onClick={() => {
                    onDisconnect();
                    setShowWalletModal(false);
                  }}
                >
                  Disconnect Wallet
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: 6 }}>
                  Rome runs real EVM contracts natively inside Solana. Both EVM and Solana wallets access the exact same state.
                </p>

                {/* EVM Lane */}
                <button
                  className="card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 16,
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                  onClick={() => {
                    onConnectEvm();
                    setShowWalletModal(false);
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "#fef3c7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.2rem"
                    }}>
                      🦊
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>MetaMask / EVM Wallet</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Connect to Rome Hadrian (EVM lane)</div>
                    </div>
                  </div>
                  <span className="badge badge-blue">EVM</span>
                </button>

                {/* Solana Lane */}
                {solWallets.length > 0 ? (
                  solWallets.map((w, idx) => (
                    <button
                      key={idx}
                      className="card"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: 16,
                        cursor: "pointer",
                        textAlign: "left"
                      }}
                      onClick={() => {
                        onConnectSol(w);
                        setShowWalletModal(false);
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: "#ede9fe",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.2rem"
                        }}>
                          🟣
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{w.name} (Solana)</div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Signs with Solana key over shared state</div>
                        </div>
                      </div>
                      <span className="badge badge-green">Solana</span>
                    </button>
                  ))
                ) : (
                  <div style={{ background: "var(--bg-subtle)", padding: 14, borderRadius: "var(--radius-md)", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    💡 Install <b>Solflare</b> or a Wallet Standard Solana wallet to experience the native Solana lane on devnet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
