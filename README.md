# SlotLock — Stake-to-Reserve Events & Self-Service Check-In on Rome Protocol

SlotLock is a modern, Luma-inspired event hosting application built for the **Rome Protocol**. It introduces a **stake-to-reserve deposit mechanism** and **dynamic cryptographic self-service check-in** to solve the pervasive problem of free event spam, fake registrations, and high no-show rates.

---

## 1. Product Concept & Problem Solved

### The Problem
Free tech events frequently suffer from 40–60% no-show rates because hoarding multiple spots has zero financial or social friction. As a result, genuine attendees are waitlisted while venues sit half-empty.

### The SlotLock Solution
- **Refundable Reservation Deposit:** Organizers configure a small refundable stake in USDC (e.g., **1, 3, or 5 USDC**).
- **Self-Service Dynamic Check-In:** Upon arriving at the venue, attendees scan a dynamic QR code displayed on the organizer's screen.
- **Instant On-Chain Refund:** Attendees confirm with the exact wallet used for reservation. The smart contract cryptographically verifies the challenge, records presence, and **immediately refunds 100% of the deposit** back to the attendee's wallet.
- **Zero Manual Approval:** Organizers do not need to manually check badges or verify identity. The smart contract handles state and escrow automatically.
- **Public Attendance Transparency:** Anyone can publicly inspect registered attendees and verified checked-in attendees on the event detail page.

---

## 2. Technical Architecture on Rome

SlotLock leverages Rome's unique architecture: **a real EVM running natively inside the Solana runtime**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SlotLock DApp Frontend                          │
│        (Vite + React + TypeScript + Luma Minimalist Design)            │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
            [ EVM Lane ]                      [ Solana Lane ]
        (MetaMask, EIP-1193)            (Solflare / Phantom Wallet)
                    │                                │
                    │                      Synthetic EVM Address
                    │                     keccak256(pubkey)[12:]
                    │                                │
                    ▼                                ▼
       submitRomeTx (Proxy)               submitRomeTxV1 (Solana v1 Tx)
                    │                                │
                    └────────────────┬───────────────┘
                                     ▼
      ┌─────────────────────────────────────────────────────────────┐
      │          Rome EVM on Solana (Hadrian Testnet 200010)        │
      │                                                             │
      │   ┌───────────────────────────────────────────────────────┐ │
      │   │                    SlotLock.sol                       │ │
      │   │  • Event Registry & Capacity Escrow                   │ │
      │   │  • Dynamic Session & ECDSA Challenge Verifier         │ │
      │   │  • Atomic Check-in & Immediate Refund Dispatcher      │ │
      │   │  • Anti-No-Show Settlement & Host Inactivity Guard    │ │
      │   └───────────────────────────┬───────────────────────────┘ │
      │                               │                             │
      │                               ▼                             │
      │   ┌───────────────────────────────────────────────────────┐ │
      │   │                 wUSDC (ERC20SPL Wrapper)               │ │
      │   │    address: 0xbce339ba4c3a8de3bb8af1c5539e6ac11da3112d│ │
      │   │    mintId:  4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJD... │ │
      │   └───────────────────────────────────────────────────────┘ │
      └───────────────────────────────┬─────────────────────────────┘
                                      │
                                      ▼
                      Solana Devnet Settlement (~400ms)
```

### Dual-Lane Wallet Parity
1. **EVM Lane (MetaMask):** Signs EIP-1559 transactions through Rome JSON-RPC (`submitRomeTx`).
2. **Solana Lane (Solflare / Phantom):** Signs Solana v1 transactions through `submitRomeTxV1`. Rome automatically maps the user's Solana public key to their **synthetic EVM address** (`keccak256(pubkey)[12:]`). Both lanes interact with the **same `SlotLock.sol` contract and the same shared state**.

---

## 3. Dynamic QR Check-In Security

### Threat Model & Countermeasures
- **Static Link Sharing:** Static URLs allow attendees to forward check-in links to remote friends.
- **SlotLock Dynamic Challenge:** The venue screen generates a fresh challenge signature every **30 seconds** with an expiration window of **60 seconds**.
- **Cryptographic Binding:**
  $$\text{Hash} = \text{keccak256}\Big(\text{chainId}, \text{contractAddress}, \text{eventId}, \text{sessionId}, \text{expiresAt}\Big)$$
  $$\text{SignedMessage} = \text{keccak256}\Big("\backslash\text{x19Ethereum Signed Message:}\backslash\text{n32}", \text{Hash}\Big)$$
  The organizer's authorized key signs the challenge. The `SlotLock.sol` contract validates:
  - `block.timestamp <= expiresAt` (expired QR rejected)
  - `sessionId == activeSessionId` (revoked or past sessions rejected)
  - `ecrecover(...) == authorizedSigner` (unauthorized signatures rejected)
  - `tickets[eventId][msg.sender].status == Registered` (matching wallet only)
- **Multi-Attendee Reuse:** Within the 60-second validity window, multiple legitimate attendees can scan the same screen QR. Double-spend / replay is prevented per-ticket on-chain because the ticket state transitions to `CheckedIn` immediately before releasing the refund.

---

## 4. Transparent Deposit & Escrow Policy

| Scenario | Condition | Outcome |
|---|---|---|
| **Attendee Self-Cancel** | Before registration deadline | 100% refund returned immediately; spot released for others. |
| **Late Cancel** | After registration deadline | Cannot self-cancel; spot is committed to prevent last-minute churn. |
| **Successful Check-In** | During check-in window at venue | 100% refund returned atomically in the check-in transaction. |
| **Organizer Cancels Event** | Anytime | All registered attendees can self-claim 100% refund on-chain. |
| **Organizer No-Show** | Host never opened check-in (`sessionCount == 0`) and check-in window ends | Host **cannot** settle no-show deposits; all attendees can self-claim 100% refunds. |
| **Attendee No-Show** | Check-in window closes and attendee did not check in | Host can settle unclaimed no-show deposits. |

---

## 5. Test Suite & Verification Evidence

All 14 comprehensive test cases covering edge cases, race conditions, and dual-lane access are verified with Hardhat and EDR simulated network:

```bash
npm test
```

### Verified Scenarios:
1. `✔ 1. Two people racing for the last spot (no oversell, atomic capacity check)`
2. `✔ 2. One wallet registering twice is rejected`
3. `✔ 3. Wrong wallet opening check-in link is rejected ("Switch to the wallet you used to reserve")`
4. `✔ 4. Expired QR challenge or challenge for another event is rejected`
5. `✔ 5. Challenge of revoked session is rejected`
6. `✔ 6. Replay check-in is rejected (cannot refund twice)`
7. `✔ 7. Two valid participants using the same active dynamic QR both succeed independently`
8. `✔ 8. Cancel registration before deadline refunds deposit; cannot check in after cancelling`
9. `✔ 9. Organizer cancels event: participants can self-claim refund`
10. `✔ 10. Organizer never opened check-in: cannot settle no-shows; participants claim refund`
11. `✔ 11. Organizer cannot settle no-shows before check-in window ends`
12. `✔ 12. After check-in window ends, organizer settles no-show funds correctly`
13. `✔ 13. Rome dual-lane: Solana wallet synthetic address can register and check in`
14. `✔ 14. Public transparency: participants and checked-in attendees publicly queryable`

---

## 6. How to Deploy to Rome Hadrian Testnet

### Prerequisites
1. Node.js >= 18 and npm installed.
2. A funded EVM wallet key with at least **1 USDC** on Rome Hadrian Testnet (Chain ID `200010`).
   - If needed, bridge USDC to Hadrian:
     ```bash
     npx github:rome-protocol/rome-cli fund hadrian --from sepolia --amount 1
     ```

### Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Set your private key:
```env
ROME_EVM_KEY=0xYOUR_32_BYTE_PRIVATE_KEY
```

### Step 1: Compile Smart Contracts
```bash
npm run compile
```

### Step 2: Deploy SlotLock to Hadrian Testnet
```bash
npm run deploy
```
*This deploys `SlotLock.sol` against the verified `wUSDC` wrapper (`0xbce339ba4c3a8de3bb8af1c5539e6ac11da3112d`), outputs the contract address, and automatically updates `.env` and `src/config.generated.json`.*

### Step 3: Run the End-to-End Live Demo
```bash
npm run demo
```
*Executes the complete on-chain lifecycle: creates a meetup, locks a USDC reservation deposit, opens a check-in session, generates a signed dynamic challenge, self-checks in, and verifies the instant deposit refund on Rome Hadrian.*

### Step 4: Start the Frontend
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 7. User Interface Guide

The UI is built with a clean, Luma-inspired minimalist aesthetic (crisp typography, generous whitespace, ivory/neutral backgrounds `#faf9f6`, responsive cards, mobile-first):

1. **Explore Events (`#explore`):** Browse upcoming public events with cover art, remaining spots counter, and USDC deposit badges.
2. **Event Details (`#event/:id`):** Full event info, date/time with clear timezone, location, transparent deposit policy, and the **Public Attendance Registry** showing real-time registered and checked-in wallets.
3. **Create Event (`#create`):** Intuitive creation form with presets for 1, 3, and 5 USDC deposits, timezone picker, capacity limits, and check-in window settings.
4. **Organizer Dashboard (`#dashboard/:id`):** Real-time escrow statistics (total held, total refunded, settleable no-show funds), Open Check-in Session button, Fullscreen QR launcher, and session revocation controls.
5. **Fullscreen Venue QR Screen:** Designed for tablets/monitors at the door. Renders a high-contrast dynamic QR code with a 30s auto-refresh circular countdown and cryptographic challenge signature.
6. **My Tickets (`#tickets`):** Personal dashboard displaying all active reservations, deposit escrow status, and one-click cancellation / refund claim buttons.
7. **Check-In Page (`#checkin?...`):** Scanned venue check-in interface. Compares connected wallet with ticket ownership, alerts if the wrong wallet is connected, executes the atomic check-in transaction, and links to the Rome Via Explorer transaction receipt.

---

## 8. Trust Assumptions & Limitations

- **Dynamic QR Limitations:** Dynamic QR rotation substantially reduces remote link forwarding, but a physically present attendee could still snapshot the live screen and forward it within the 60-second window. In accordance with the prompt, biometric or GPS surveillance is intentionally omitted in MVP.
- **Host Presence Assumption:** The protocol guarantees that organizers cannot claim no-show deposits if they never opened a check-in session. However, the protocol trusts the organizer to display the QR screen at the physical venue.
- **Testnet vs Mainnet:** This deployment targets Rome Hadrian Testnet (`200010`) on Solana Devnet. Mainnet graduation (`Rubicon 7531`) should undergo an external smart contract security audit before securing high-value deposits.
