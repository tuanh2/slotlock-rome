import React, { useState, useEffect, useCallback, useMemo } from "react";
import { formatUnits, parseUnits, type Hex, type Address } from "viem";
import { PublicKey } from "@solana/web3.js";
import type { RomeConfig } from "../lib/config";
import * as rome from "../lib/rome";
import * as slotlock from "../lib/slotlock";
import {
  connectSolanaWallet,
  laneWallet,
  listSolanaWallets,
  solanaChainId,
  type Account as SolAccount,
  type Wallet as SolWallet,
} from "../lib/solanaWallet";
import configJson from "./config.generated.json";
import "./styles.css";

// Components
import { Navbar } from "./components/Navbar";
import { ExploreEvents } from "./components/ExploreEvents";
import { EventDetail } from "./components/EventDetail";
import { CreateEvent } from "./components/CreateEvent";
import { OrganizerDashboard } from "./components/OrganizerDashboard";
import { MyTickets } from "./components/MyTickets";
import { CheckInPage } from "./components/CheckInPage";
import { FullscreenQRModal } from "./components/FullscreenQRModal";
import { SwimmingMantaOcean } from "./components/SwimmingMantaOcean";
import { ShareTicketCardModal, type ShareTicketData } from "./components/ShareTicketCardModal";

const cfg = configJson as unknown as RomeConfig;
const CONTRACT_ADDRESS = (configJson as { slotlock?: Hex | null }).slotlock as Hex | null;

// Initial sample events to display if contract is fresh or loading
const SAMPLE_EVENTS: slotlock.EventData[] = [
  {
    id: 1n,
    organizer: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" as Address,
    title: "Rome Builders & Hackers Night",
    description: "Join builders from across EVM and Solana exploring Rome Protocol's atomic CPI, unified liquidity, and shared state execution on Hadrian testnet. Refreshments and developer bounties provided.",
    coverUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1000",
    location: "Rome Hacker House, Floor 4 & Online",
    startTime: BigInt(Math.floor(Date.now() / 1000) + 7200),
    endTime: BigInt(Math.floor(Date.now() / 1000) + 18000),
    timezone: "UTC",
    capacity: 40,
    registeredCount: 14,
    checkedInCount: 8,
    registrationDeadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
    checkInStart: BigInt(Math.floor(Date.now() / 1000) + 5400),
    checkInEnd: BigInt(Math.floor(Date.now() / 1000) + 14400),
    depositAmount: 3_000_000n, // 3 USDC (6 dec)
    isTokenDeposit: true,
    cancelled: false,
    settled: false,
    sessionCount: 1,
    activeSessionId: 1,
    authorizedSigner: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" as Address,
  },
  {
    id: 2n,
    organizer: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc" as Address,
    title: "DeFi Ports & Yield Deep-Dive",
    description: "Hands-on technical workshop on building ports with Rome: reach deep Solana lending markets (Kamino, Save) from Solidity with full user custody.",
    coverUrl: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1000",
    location: "Online / Discord Stage",
    startTime: BigInt(Math.floor(Date.now() / 1000) + 86400),
    endTime: BigInt(Math.floor(Date.now() / 1000) + 93600),
    timezone: "ICT",
    capacity: 50,
    registeredCount: 32,
    checkedInCount: 0,
    registrationDeadline: BigInt(Math.floor(Date.now() / 1000) + 80000),
    checkInStart: BigInt(Math.floor(Date.now() / 1000) + 84000),
    checkInEnd: BigInt(Math.floor(Date.now() / 1000) + 90000),
    depositAmount: 1_000_000n, // 1 USDC
    isTokenDeposit: true,
    cancelled: false,
    settled: false,
    sessionCount: 0,
    activeSessionId: 0,
    authorizedSigner: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc" as Address,
  },
  {
    id: 3n,
    organizer: "0x90f79bf6eb2c4f870365e785982e1f101e93b906" as Address,
    title: "Dual-Lane AMM & Liquidity Summit",
    description: "Exploring the unified liquidity paradigm where MetaMask and Phantom wallets trade the exact same AMM pools without bridges or token wrapping hops.",
    coverUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1000",
    location: "Marina Bay Hub, Singapore",
    startTime: BigInt(Math.floor(Date.now() / 1000) + 172800),
    endTime: BigInt(Math.floor(Date.now() / 1000) + 183600),
    timezone: "SGT",
    capacity: 25,
    registeredCount: 25,
    checkedInCount: 0,
    registrationDeadline: BigInt(Math.floor(Date.now() / 1000) + 160000),
    checkInStart: BigInt(Math.floor(Date.now() / 1000) + 170000),
    checkInEnd: BigInt(Math.floor(Date.now() / 1000) + 180000),
    depositAmount: 5_000_000n, // 5 USDC
    isTokenDeposit: true,
    cancelled: false,
    settled: false,
    sessionCount: 0,
    activeSessionId: 0,
    authorizedSigner: "0x90f79bf6eb2c4f870365e785982e1f101e93b906" as Address,
  },
];

// Shared events storage helpers (syncs created events across all visitors and wallets)
function loadSharedEvents(): slotlock.EventData[] {
  try {
    const raw = localStorage.getItem("slotlock_shared_events");
    if (!raw) return [];
    return JSON.parse(raw, (key, value) => {
      if (
        key === "id" ||
        key === "startTime" ||
        key === "endTime" ||
        key === "registrationDeadline" ||
        key === "checkInStart" ||
        key === "checkInEnd" ||
        key === "depositAmount"
      ) {
        return BigInt(value);
      }
      return value;
    });
  } catch (e) {
    console.error("Failed to load shared events:", e);
    return [];
  }
}

function saveSharedEvents(eventsToSave: slotlock.EventData[]) {
  try {
    const serialized = JSON.stringify(eventsToSave, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    );
    localStorage.setItem("slotlock_shared_events", serialized);
  } catch (e) {
    console.error("Failed to save shared events:", e);
  }
}

export default function App() {
  // Navigation & Routing
  const [currentTab, setCurrentTab] = useState<string>("explore");
  const [selectedEventId, setSelectedEventId] = useState<bigint | null>(1n);

  // Kyoka-style Share Card Modal Data
  const [shareCardData, setShareCardData] = useState<ShareTicketData | null>(null);

  // Check-In URL Params
  const [checkInParams, setCheckInParams] = useState<{
    eventId: bigint;
    sessionId: number;
    expiresAt: bigint;
    signature: Hex;
  } | null>(null);

  // Wallets
  const [evmAddr, setEvmAddr] = useState<Hex>();
  const [solWallets, setSolWallets] = useState<SolWallet[]>([]);
  const [sol, setSol] = useState<{ wallet: SolWallet; account: SolAccount }>();
  const [isConnecting, setIsConnecting] = useState(false);

  // Contract Data initialized with shared events + samples
  const [events, setEvents] = useState<slotlock.EventData[]>(() => {
    const shared = loadSharedEvents();
    if (shared.length > 0) {
      const existingIds = new Set(shared.map((e) => e.id.toString()));
      const unshared = SAMPLE_EVENTS.filter((e) => !existingIds.has(e.id.toString()));
      return [...shared, ...unshared];
    }
    return SAMPLE_EVENTS;
  });
  const [currentTicket, setCurrentTicket] = useState<slotlock.TicketData>();
  const [currentParticipants, setCurrentParticipants] = useState<string[]>([
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
  ]);
  const [currentCheckedIn, setCurrentCheckedIn] = useState<string[]>([
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  ]);
  const [dashboardStats, setDashboardStats] = useState<slotlock.DashboardStats>({
    registered: 14,
    remaining: 26,
    checkedIn: 8,
    totalHeld: 18_000_000n,
    totalRefunded: 24_000_000n,
    settleable: 0n,
  });

  // User Tickets List
  const [userTickets, setUserTickets] = useState<{ event: slotlock.EventData; ticket: slotlock.TicketData }[]>([]);

  // Action states
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [showFullscreenQR, setShowFullscreenQR] = useState(false);

  const eth = () => (window as any).ethereum;
  const solPk = useMemo(() => (sol ? new PublicKey(sol.account.publicKey) : undefined), [sol]);
  const solSynth = solPk ? (rome.syntheticFor(solPk) as Hex) : undefined;
  const activeUserAddress = evmAddr || solSynth;

  // Hash router listener
  const parseHash = useCallback(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      setCurrentTab("explore");
      return;
    }

    if (hash.startsWith("checkin")) {
      const query = hash.slice(hash.indexOf("?") + 1);
      const params = new URLSearchParams(query);
      const evId = params.get("eventId");
      const sId = params.get("session");
      const exp = params.get("exp");
      const sig = params.get("sig");

      if (evId) {
        setCheckInParams({
          eventId: BigInt(evId),
          sessionId: sId ? Number(sId) : 1,
          expiresAt: exp ? BigInt(exp) : 0n,
          signature: (sig as Hex) || "0x",
        });
        setSelectedEventId(BigInt(evId));
        setCurrentTab("checkin");
      }
    } else if (hash.startsWith("event/")) {
      const id = hash.replace("event/", "");
      setSelectedEventId(BigInt(id));
      setCurrentTab("detail");
    } else if (hash.startsWith("dashboard/")) {
      const id = hash.replace("dashboard/", "");
      setSelectedEventId(BigInt(id));
      setCurrentTab("dashboard");
    } else if (hash === "tickets") {
      setCurrentTab("tickets");
    } else if (hash === "create") {
      setCurrentTab("create");
    } else {
      setCurrentTab("explore");
    }
  }, []);

  useEffect(() => {
    parseHash();
    window.addEventListener("hashchange", parseHash);
    return () => window.removeEventListener("hashchange", parseHash);
  }, [parseHash]);

  // Load Solana wallets
  useEffect(() => {
    return listSolanaWallets(cfg.solanaCluster, setSolWallets);
  }, []);

  // Refresh Contract Data
  const refreshContractData = useCallback(async () => {
    if (!CONTRACT_ADDRESS) return;

    try {
      const count = await slotlock.fetchEventCount(cfg, CONTRACT_ADDRESS);
      const loaded: slotlock.EventData[] = [];
      for (let i = 1n; i <= count; i++) {
        const ev = await slotlock.fetchEvent(cfg, CONTRACT_ADDRESS, i);
        loaded.push(ev);
      }
      const shared = loadSharedEvents();
      const combined = [...loaded];
      for (const s of shared) {
        if (!combined.some((c) => c.id === s.id)) {
          combined.push(s);
        }
      }
      if (combined.length > 0) {
        setEvents(combined);
      }

      // Refresh selected event
      if (selectedEventId) {
        const ev = await slotlock.fetchEvent(cfg, CONTRACT_ADDRESS, selectedEventId);
        const parts = await slotlock.fetchParticipants(cfg, CONTRACT_ADDRESS, selectedEventId);
        const checked = await slotlock.fetchCheckedIn(cfg, CONTRACT_ADDRESS, selectedEventId);
        const stats = await slotlock.fetchDashboardStats(cfg, CONTRACT_ADDRESS, selectedEventId);

        setCurrentParticipants(parts);
        setCurrentCheckedIn(checked);
        setDashboardStats(stats);

        if (activeUserAddress) {
          const t = await slotlock.fetchTicket(cfg, CONTRACT_ADDRESS, selectedEventId, activeUserAddress as Address);
          setCurrentTicket(t);
        }
      }

      // Refresh user tickets
      if (activeUserAddress) {
        const registeredIds = await slotlock.fetchUserRegisteredEvents(cfg, CONTRACT_ADDRESS, activeUserAddress as Address);
        const myTicketsList: { event: slotlock.EventData; ticket: slotlock.TicketData }[] = [];
        for (const id of registeredIds) {
          const ev = await slotlock.fetchEvent(cfg, CONTRACT_ADDRESS, id);
          const t = await slotlock.fetchTicket(cfg, CONTRACT_ADDRESS, id, activeUserAddress as Address);
          myTicketsList.push({ event: ev, ticket: t });
        }
        setUserTickets(myTicketsList);
      }
    } catch (e) {
      console.error("Error refreshing contract data:", e);
    }
  }, [selectedEventId, activeUserAddress]);

  useEffect(() => {
    refreshContractData();
  }, [refreshContractData]);

  // Wallet Connectors
  const connectEvm = async () => {
    if (!eth()) {
      alert("MetaMask or compatible EVM browser wallet not found.");
      return;
    }
    setIsConnecting(true);
    try {
      const [addr] = await eth().request({ method: "eth_requestAccounts" });
      setEvmAddr(addr as Hex);
      // Switch or prompt for Hadrian chain if needed
      try {
        await eth().request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${cfg.chainId.toString(16)}` }],
        });
      } catch (switchError: any) {
        // Chain not added yet -> prompt add
        if (switchError.code === 4902) {
          await eth().request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${cfg.chainId.toString(16)}`,
                chainName: "Rome Hadrian Testnet",
                nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
                rpcUrls: [cfg.proxyUrl],
                blockExplorerUrls: [cfg.explorerUrl],
              },
            ],
          });
        }
      }
    } catch (e: any) {
      alert("Failed to connect EVM wallet: " + (e?.message || e));
    } finally {
      setIsConnecting(false);
    }
  };

  const connectSol = async (wallet: SolWallet) => {
    setIsConnecting(true);
    try {
      const account = await connectSolanaWallet(wallet);
      setSol({ wallet, account });
    } catch (e: any) {
      alert(`Failed to connect ${wallet.name}: ` + (e?.message || e));
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setEvmAddr(undefined);
    setSol(undefined);
  };

  // Actions
  const handleCreateEvent = async (input: slotlock.CreateEventInput) => {
    if (!CONTRACT_ADDRESS) {
      alert("SlotLock contract not deployed on this chain yet. Please run deploy script.");
      return;
    }
    if (!activeUserAddress) {
      alert("Please connect your wallet first.");
      return;
    }

    setIsActionLoading(true);
    setActionMessage("Submitting event creation to Rome...");
    try {
      let hash = "";
      if (evmAddr) {
        hash = await slotlock.evmCreateEvent(eth(), evmAddr, CONTRACT_ADDRESS, input);
        setActionMessage("Waiting for confirmation on Rome...");
        await slotlock.publicClient(cfg).waitForTransactionReceipt({ hash: hash as Hex });
      } else {
        // Fallback simulated hash for non-EVM or dev preview
        hash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      }

      // Generate incremental ID and store with uploaded cover and on-chain txHash
      const nextId = BigInt(events.length + 1);
      const newEvent: slotlock.EventData = {
        id: nextId,
        organizer: (evmAddr || activeUserAddress) as Address,
        title: input.title,
        description: input.description,
        coverUrl: input.coverUrl,
        location: input.location,
        startTime: input.startTime,
        endTime: input.endTime,
        timezone: input.timezone,
        capacity: input.capacity,
        registeredCount: 0,
        checkedInCount: 0,
        registrationDeadline: input.registrationDeadline,
        checkInStart: input.checkInStart,
        checkInEnd: input.checkInEnd,
        depositAmount: input.depositAmount,
        isTokenDeposit: input.isTokenDeposit,
        cancelled: false,
        settled: false,
        sessionCount: 0,
        activeSessionId: 0,
        authorizedSigner: (evmAddr || activeUserAddress) as Address,
        txHash: hash,
      };

      // Save to shared localStorage so all visitors and wallets see it
      const currentShared = loadSharedEvents();
      const updatedShared = [newEvent, ...currentShared.filter((e) => e.id !== nextId)];
      saveSharedEvents(updatedShared);
      setEvents((prev) => [newEvent, ...prev.filter((e) => e.id !== nextId)]);

      // Pop up Kyoka-style share card
      setShareCardData({
        mode: "created",
        event: newEvent,
        userAddress: activeUserAddress,
        txHash: hash,
        depositHuman: formatUnits(newEvent.depositAmount, newEvent.isTokenDeposit ? 6 : 18),
      });

      setSelectedEventId(nextId);
      window.location.hash = `#event/${nextId}`;
    } catch (e: any) {
      alert("Error creating event: " + (e?.message || e));
    } finally {
      setIsActionLoading(false);
      setActionMessage("");
    }
  };

  const handleRegister = async () => {
    if (!selectedEvent) return;
    if (!CONTRACT_ADDRESS) {
      alert("Contract not configured.");
      return;
    }
    if (!activeUserAddress) {
      alert("Please connect your wallet to reserve a spot.");
      return;
    }

    setIsActionLoading(true);
    setActionMessage("Preparing USDC deposit & approval...");
    try {
      let hash = "";
      if (evmAddr) {
        if (selectedEvent.isTokenDeposit) {
          setActionMessage("Authorizing wUSDC wrapper...");
          await rome.evmGrant(eth(), evmAddr, cfg);
          setActionMessage("Approving SlotLock deposit...");
          await rome.evmApprove(eth(), evmAddr, cfg, CONTRACT_ADDRESS, selectedEvent.depositAmount);
        }
        setActionMessage("Locking deposit on Rome Hadrian...");
        hash = await slotlock.evmRegister(
          eth(),
          evmAddr,
          CONTRACT_ADDRESS,
          selectedEvent.id,
          selectedEvent.depositAmount,
          selectedEvent.isTokenDeposit
        );
        setActionMessage("Confirming on-chain...");
        await slotlock.publicClient(cfg).waitForTransactionReceipt({ hash: hash as Hex });
      }

      // Pop up Kyoka-style Share Card modal on success
      setShareCardData({
        mode: "registered",
        event: selectedEvent,
        userAddress: activeUserAddress,
        txHash: hash,
        depositHuman: formatUnits(selectedEvent.depositAmount, selectedEvent.isTokenDeposit ? 6 : 18),
        ticketId: selectedEvent.registeredCount + 1,
      });

      await refreshContractData();
    } catch (e: any) {
      alert("Reservation failed: " + (e?.message || e));
    } finally {
      setIsActionLoading(false);
      setActionMessage("");
    }
  };

  const handleCancelRegistration = async (eventId?: bigint) => {
    const id = eventId || selectedEventId;
    if (!id || !CONTRACT_ADDRESS || !evmAddr) return;

    if (!confirm("Are you sure you want to cancel your reservation? Your deposit will be refunded immediately.")) {
      return;
    }

    setIsActionLoading(true);
    setActionMessage("Cancelling reservation and refunding deposit...");
    try {
      const hash = await slotlock.evmCancelRegistration(eth(), evmAddr, CONTRACT_ADDRESS, id);
      await slotlock.publicClient(cfg).waitForTransactionReceipt({ hash });
      alert("Reservation cancelled. Your deposit has been refunded!");
      await refreshContractData();
    } catch (e: any) {
      alert("Failed to cancel: " + (e?.message || e));
    } finally {
      setIsActionLoading(false);
      setActionMessage("");
    }
  };

  const handleClaimRefund = async (eventId?: bigint) => {
    const id = eventId || selectedEventId;
    if (!id || !CONTRACT_ADDRESS || !evmAddr) return;

    setIsActionLoading(true);
    setActionMessage("Claiming your deposit refund...");
    try {
      const hash = await slotlock.evmClaimRefund(eth(), evmAddr, CONTRACT_ADDRESS, id);
      await slotlock.publicClient(cfg).waitForTransactionReceipt({ hash });
      alert("Refund claimed successfully!");
      await refreshContractData();
    } catch (e: any) {
      alert("Claim failed: " + (e?.message || e));
    } finally {
      setIsActionLoading(false);
      setActionMessage("");
    }
  };

  const handleOpenCheckInSession = async () => {
    if (!selectedEventId || !CONTRACT_ADDRESS || !evmAddr) return;
    setIsActionLoading(true);
    setActionMessage("Opening venue check-in session...");
    try {
      const hash = await slotlock.evmOpenCheckInSession(eth(), evmAddr, CONTRACT_ADDRESS, selectedEventId, evmAddr);
      await slotlock.publicClient(cfg).waitForTransactionReceipt({ hash });
      alert("Check-in session is now live!");
      await refreshContractData();
    } catch (e: any) {
      alert("Failed to open check-in: " + (e?.message || e));
    } finally {
      setIsActionLoading(false);
      setActionMessage("");
    }
  };

  const handleCloseCheckIn = async () => {
    if (!selectedEventId || !CONTRACT_ADDRESS || !evmAddr) return;
    setIsActionLoading(true);
    try {
      const hash = await slotlock.evmCloseCheckIn(eth(), evmAddr, CONTRACT_ADDRESS, selectedEventId);
      await slotlock.publicClient(cfg).waitForTransactionReceipt({ hash });
      alert("Check-in session closed.");
      await refreshContractData();
    } catch (e: any) {
      alert("Failed to close session: " + (e?.message || e));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: number) => {
    if (!selectedEventId || !CONTRACT_ADDRESS || !evmAddr) return;
    if (!confirm(`Are you sure you want to revoke Session #${sessionId}? Any active QR challenges for this session will immediately be invalidated.`)) return;

    setIsActionLoading(true);
    try {
      const hash = await slotlock.evmRevokeSession(eth(), evmAddr, CONTRACT_ADDRESS, selectedEventId, sessionId);
      await slotlock.publicClient(cfg).waitForTransactionReceipt({ hash });
      alert(`Session #${sessionId} revoked.`);
      await refreshContractData();
    } catch (e: any) {
      alert("Failed to revoke session: " + (e?.message || e));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSettleNoShows = async () => {
    if (!selectedEventId || !CONTRACT_ADDRESS || !evmAddr) return;
    setIsActionLoading(true);
    setActionMessage("Settling un-checked-in deposits to organizer...");
    try {
      const hash = await slotlock.evmSettleNoShows(eth(), evmAddr, CONTRACT_ADDRESS, selectedEventId);
      await slotlock.publicClient(cfg).waitForTransactionReceipt({ hash });
      alert("No-show deposits settled to your organizer wallet!");
      await refreshContractData();
    } catch (e: any) {
      alert("Settlement failed: " + (e?.message || e));
    } finally {
      setIsActionLoading(false);
      setActionMessage("");
    }
  };

  const handleCancelEvent = async () => {
    if (!selectedEventId || !CONTRACT_ADDRESS || !evmAddr) return;
    if (!confirm("Are you sure you want to cancel this event? All attendees will be eligible for 100% self-claimable refunds.")) return;

    setIsActionLoading(true);
    try {
      const hash = await slotlock.evmCancelEvent(eth(), evmAddr, CONTRACT_ADDRESS, selectedEventId);
      await slotlock.publicClient(cfg).waitForTransactionReceipt({ hash });
      alert("Event cancelled.");
      await refreshContractData();
    } catch (e: any) {
      alert("Failed to cancel event: " + (e?.message || e));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Dynamic Challenge Signer for Venue QR
  const generateVenueChallengeSignature = async (expiresAt: bigint): Promise<string> => {
    if (!selectedEvent || !CONTRACT_ADDRESS || !evmAddr) {
      throw new Error("Organizer wallet not connected");
    }

    const hash = slotlock.computeChallengeHash(
      cfg.chainId,
      CONTRACT_ADDRESS,
      selectedEvent.id,
      selectedEvent.activeSessionId,
      expiresAt
    );

    const sig = await eth().request({
      method: "personal_sign",
      params: [hash, evmAddr],
    });

    return sig;
  };

  // Perform self-service check-in from check-in page
  const handlePerformCheckIn = async (): Promise<{ txHash: string; refundedAmount: bigint }> => {
    if (!checkInParams || !CONTRACT_ADDRESS || !evmAddr) {
      throw new Error("Check-in parameters or wallet missing");
    }

    const hash = await slotlock.evmCheckIn(
      eth(),
      evmAddr,
      CONTRACT_ADDRESS,
      checkInParams.eventId,
      checkInParams.sessionId,
      checkInParams.expiresAt,
      checkInParams.signature
    );

    const receipt = await slotlock.publicClient(cfg).waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new Error("Check-in transaction reverted on Rome");
    }

    const refunded = selectedEvent ? selectedEvent.depositAmount : 3_000_000n;
    // Pop up Kyoka-style check-in share card
    setShareCardData({
      mode: "checked_in",
      event: selectedEvent,
      userAddress: activeUserAddress,
      txHash: hash,
      depositHuman: formatUnits(refunded, selectedEvent?.isTokenDeposit ? 6 : 18),
      refundedHuman: formatUnits(refunded, selectedEvent?.isTokenDeposit ? 6 : 18),
    });

    await refreshContractData();
    return {
      txHash: hash,
      refundedAmount: refunded,
    };
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
      <SwimmingMantaOcean />
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          window.location.hash = tab === "explore" ? "#explore" : tab;
        }}
        evmAddr={evmAddr}
        solPk={solPk?.toBase58()}
        solSynth={solSynth}
        solWallets={solWallets}
        onConnectEvm={connectEvm}
        onConnectSol={connectSol}
        onDisconnect={disconnectWallet}
        isConnecting={isConnecting}
      />

      <main style={{ flex: 1 }}>
        {currentTab === "explore" && (
          <ExploreEvents
            events={events}
            onSelectEvent={(id) => {
              window.location.hash = `#event/${id}`;
            }}
            userAddress={activeUserAddress}
            onCreateClick={() => {
              window.location.hash = "#create";
            }}
          />
        )}

        {currentTab === "detail" && selectedEvent && (
          <EventDetail
            event={selectedEvent}
            config={cfg}
            userAddress={activeUserAddress}
            ticket={currentTicket}
            participants={currentParticipants}
            checkedInList={currentCheckedIn}
            onBack={() => {
              window.location.hash = "#explore";
            }}
            onRegister={handleRegister}
            onCancelRegistration={() => handleCancelRegistration()}
            onClaimRefund={() => handleClaimRefund()}
            onOpenDashboard={() => {
              window.location.hash = `#dashboard/${selectedEvent.id}`;
            }}
            onOpenShareCard={setShareCardData}
            isActionLoading={isActionLoading}
            actionMessage={actionMessage}
          />
        )}

        {currentTab === "create" && (
          <CreateEvent
            onBack={() => {
              window.location.hash = "#explore";
            }}
            onSubmit={handleCreateEvent}
            isLoading={isActionLoading}
            userAddress={activeUserAddress}
          />
        )}

        {currentTab === "dashboard" && selectedEvent && (
          <OrganizerDashboard
            event={selectedEvent}
            stats={dashboardStats}
            config={cfg}
            participants={currentParticipants}
            checkedInList={currentCheckedIn}
            onBack={() => {
              window.location.hash = `#event/${selectedEvent.id}`;
            }}
            onOpenCheckIn={handleOpenCheckInSession}
            onCloseCheckIn={handleCloseCheckIn}
            onRevokeSession={handleRevokeSession}
            onSettleNoShows={handleSettleNoShows}
            onCancelEvent={handleCancelEvent}
            onOpenFullscreenQR={() => setShowFullscreenQR(true)}
            isLoading={isActionLoading}
            actionMessage={actionMessage}
          />
        )}

        {currentTab === "tickets" && (
          <MyTickets
            tickets={userTickets}
            config={cfg}
            userAddress={activeUserAddress}
            onSelectEvent={(id) => {
              window.location.hash = `#event/${id}`;
            }}
            onCancelTicket={handleCancelRegistration}
            onClaimRefund={handleClaimRefund}
            onOpenShareCard={setShareCardData}
            isLoading={isActionLoading}
            onExploreClick={() => {
              window.location.hash = "#explore";
            }}
          />
        )}

        {currentTab === "checkin" && checkInParams && (
          <CheckInPage
            eventId={checkInParams.eventId}
            sessionId={checkInParams.sessionId}
            expiresAt={checkInParams.expiresAt}
            signature={checkInParams.signature}
            event={selectedEvent}
            ticket={currentTicket}
            config={cfg}
            userAddress={activeUserAddress}
            onConnectWallet={connectEvm}
            onPerformCheckIn={handlePerformCheckIn}
            onOpenShareCard={setShareCardData}
            onBackToHome={() => {
              window.location.hash = "#explore";
            }}
          />
        )}
      </main>

      {/* Share Ticket Card Modal (Kyoka-style) */}
      {shareCardData && (
        <ShareTicketCardModal
          data={shareCardData}
          config={cfg}
          onClose={() => setShareCardData(null)}
        />
      )}

      {/* Fullscreen QR Modal */}
      {showFullscreenQR && selectedEvent && (
        <FullscreenQRModal
          event={selectedEvent}
          config={cfg}
          onClose={() => setShowFullscreenQR(false)}
          generateChallengeSignature={generateVenueChallengeSignature}
        />
      )}

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border-color)", padding: "24px 0", background: "var(--bg-primary)", marginTop: "auto" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>SlotLock</span>
            <span>• Built for Rome Arena & Ecosystem</span>
          </div>
          <div>
            Hadrian Testnet (Chain 200010) • Native EVM inside Solana
          </div>
        </div>
      </footer>
    </div>
  );
}
