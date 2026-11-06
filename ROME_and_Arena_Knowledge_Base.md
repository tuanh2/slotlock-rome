# Rome Protocol & Arena — Complete Knowledge Base

> **Purpose of this file.** This is a self-contained briefing document to be imported into an AI coding assistant so it can design and build a project for the **Rome Arena** program. It explains what Rome Protocol is, how it works technically, every developer primitive you need, and exactly how the Arena program works and how to win in it. Read it top to bottom before writing any code.
>
> **Ghi chú (tiếng Việt):** Tài liệu này viết bằng tiếng Anh để AI lập trình đọc tối ưu (code, API, địa chỉ hợp đồng đều là tiếng Anh). Nó gồm 2 phần lớn: (A) hiểu Rome Protocol + cơ chế, (B) chương trình Arena và cách tham gia/thắng. Mọi thông tin kỹ thuật, địa chỉ, chain ID, lệnh CLI đều giữ nguyên gốc.
>
> **Sources:** `rome.builders`, `docs.rome.builders`, `arena.mainnet.romeprotocol.xyz`, `github.com/rome-protocol`, and the official `$ROME` token announcement (Nov 2026). Dates/facts current as of **2026-11-04**. Always re-verify live values (addresses, chain IDs, gas prices) with the `rome-cli` / `@rome-protocol/registry` — **never hardcode** chain facts.

---

## PART A — ROME PROTOCOL

### 1. One-sentence definition

**Rome runs real EVM chains natively *inside* the Solana runtime.** A Solidity contract can call any Solana program and have the work settle **atomically on Solana in a single transaction**, and the *same* contract can be driven by either an EVM wallet (MetaMask) or a Solana wallet (Phantom). Tagline: *"A REAL EVM INSIDE SOLANA — EVM and Solana, one market."*

### 2. The problem Rome solves

Solana has deep liquidity, assets, and programs (Jupiter, Kamino, Meteora, SPL tokens) that a normal Solidity contract **cannot touch inside one transaction**. Bridges move users and assets around with latency, custody risk, and broken atomicity. Rome closes that gap:

- A Solidity contract calls a Solana program; the work settles atomically on Solana (~400ms block time).
- An EVM wallet and a Solana wallet drive the **same** contract over **one shared state**.
- An EVM app can reach a Solana market **without moving its users** — they keep custody, sign on their own EVM chain, and their assets (e.g. USDC) earn in a Solana market.

This "reach a Solana market without moving users" pattern is called a **port** (see Portus, below).

### 3. Core architecture

| Component | What it does |
|---|---|
| **Rome EVM** | A full EVM bytecode interpreter deployed as **one Solana on-chain program** (on Solana mainnet). Solidity contracts execute inside Solana's runtime, not on a separate chain. Supports **many EVM chains and many gas tokens** on one program. |
| **CPI Engine** | Cross-Program-Invocation bridge. Lets Solidity call Solana programs (and vice-versa) atomically. Exposed to Solidity via **precompiles** (see §7). |
| **Single / Shared State** | EVM contracts and Solana programs read & write the **same** state. An SPL token and its ERC-20 wrapper point at **one** token account — no state divergence, no double accounting. |
| **Towers** | Ordering/sequencing layer for transactions. |
| **Settlement** | Final settlement on **Solana L1** (Solana is the settlement, data-availability, and — for the zkEVM — verification layer). |
| **Rome SDK** | Rust + TypeScript SDKs, a Solidity library, a machine-readable registry, a node stack, and a CLI/MCP server. |

**Key property:** A single Solana transaction can carry several EVM transactions across several Rome chains, and can mix EVM work with native Solana work in the same transaction.

### 4. Two product lines

1. **Rome EVM on Solana mainnet (live).** The Rome EVM program runs on Solana mainnet, **audited by Halborn**, and the deployed binary **reproduces from the public repo**. Rome's own mainnet chain (**Rubicon**) runs on it today. Builders can launch their own EVM chain with their own gas token and fees.
2. **Proved / ZK EVM chains.**
   - **Solana zkEVM** (on devnet): Solana is the *only* settlement, DA, and verification layer. Chain registration is **permissionless**; deposits/withdrawals work.
   - **Canton zkEVM** (**Ostia**, on a test network): Canton orders the EVM blocks and a zkVM proves them, so an EVM block and the Canton actions it needs settle in **one** Canton transaction.

### 5. Four things you can build (the mental model)

1. **EVM app serving Solana wallets** — deploy Solidity unchanged; a Phantom user signs with their Solana key and drives it (no EVM keypair needed).
2. **Solana programs called from EVM** — a Solidity contract invokes a Solana program directly & atomically.
3. **Ports & bridges** — a port lets your EVM-chain users reach a Solana program while keeping custody (the flagship pattern). Bridges move USDC/SOL/ETH in and out.
4. **Sovereign / custom chains** — launch your own Rome EVM chain with a custom gas token, custom fees; or a ZK rollup that settles only on Solana.

### 6. Networks (verify live with `rome-cli` before using)

| Network | Role | Chain ID | RPC | Explorer | Gas token |
|---|---|---|---|---|---|
| **Rubicon** | Mainnet | `7531` | `https://rubicon.mainnet.romeprotocol.xyz/` | `https://via.mainnet…` | ROME (Rome's own chain); per-chain otherwise |
| **Hadrian** | Testnet (on Solana devnet) | `200010` | `https://hadrian.testnet.romeprotocol.xyz/` | `https://via-hadrian.testnet.romeprotocol.xyz/` | **USDC** |
| **Ostia** | Canton zkEVM devnet | `770101` (verify) | `https://ostia.devnet.romeprotocol.xyz/rpc` | — | tROME (test) |

> **Build target for Arena:** start on **Hadrian testnet** (USDC gas, easy faucet), then graduate to **Rubicon mainnet**. The Academy curriculum is built around this testnet→mainnet path.

### 7. Developer primitives — the technical core

#### 7a. Precompiles (how Solidity reaches Solana)

Import from the Solidity SDK and call fixed precompile addresses:

```solidity
import {ICrossProgramInvocation, ISystemProgram, IHelperProgram}
    from "@rome-protocol/rome-solidity/contracts/interface.sol";

// CPI dispatcher — call Solana programs
ICrossProgramInvocation constant CpiProgram =
    ICrossProgramInvocation(0xFF00000000000000000000000000000000000008);
// PDA derivation + base58 conversion
ISystemProgram constant SystemProgram =
    ISystemProgram(0xFF00000000000000000000000000000000000007);
// Lamport & SPL transfer helpers
IHelperProgram constant Helper =
    IHelperProgram(0xFF00000000000000000000000000000000000009);
```

Invoke a Solana program:

```solidity
// Unsigned CPI
CpiProgram.invoke(programId, accounts, instructionData);

// Signed CPI — the contract's external-authority PDA signs
CpiProgram.invoke_signed(programId, accounts, data, salts);
```

Build account metadata manually:

```solidity
ICrossProgramInvocation.AccountMeta[] memory accounts =
    new ICrossProgramInvocation.AccountMeta[](2);
//                               (pubkey,  isSigner, isWritable)
accounts[0] = ICrossProgramInvocation.AccountMeta(account1, false, true);
accounts[1] = ICrossProgramInvocation.AccountMeta(account2, false, false);
CpiProgram.invoke(MY_PROGRAM, accounts, ixData);
```

**Hard constraints (memorize these):**
- **All accounts must be declared upfront** (Solana requires explicit account lists).
- **CPI depth is limited to 4 levels.**
- Solana pubkeys are `bytes32` in Solidity.
- Instruction data = raw bytes in the target program's expected format (**usually Borsh-encoded**).
- Execution can be **atomic** (one tx) or **iterative** (large work split across txs) — see the "Execution Model" doc.

Use `rome cookbook cpi-recipe` to get **verified** program IDs, account rules, and SDK encoders — don't hand-write Borsh if you can avoid it.

#### 7b. The registry — single source of truth for chain facts

```bash
npm install github:rome-protocol/registry#v0.3.0   # @rome-protocol/registry
```

```javascript
import { getChain, listChains, getTokens, getContracts, getOracle, getPrograms }
  from "@rome-protocol/registry";

const hadrian = getChain(200010);
// → { chainId, name, network, rpcUrl, explorerUrl, romeEvmProgramId,
//     nativeCurrency:{symbol,decimals}, tokens, contracts, oracle, programs, ALTs }
getPrograms("mainnet"); // Solana program IDs
```

Contains: chain IDs, RPC URLs, contract addresses, token catalogs (gas + wUSDC/wETH/wSOL), oracle feeds, Address Lookup Tables, app deployments, Solana program IDs. **Read this instead of hardcoding.**

#### 7c. Rome CLI + MCP server (**use this heavily when building**)

```bash
# zero-install
npx github:rome-protocol/rome-cli facts chain hadrian
# durable
git clone https://github.com/rome-protocol/rome-cli && cd rome-cli && npm i && npm i -g .
```

Two grounded layers so an AI never hallucinates addresses/selectors:

- **Facts (read-only):** `rome facts chain <name>` · `facts tokens <chain>` · `facts contracts <chain>` · `facts gas <chain>` · `facts balance <chain> <addr>` · `facts programs <network>`
- **Cookbook:** `rome cookbook cpi-recipe` · `cookbook patterns <goal>` · `cookbook errors "<error>"`
- **Utilities:** `rome preset foundry <chain>` (Foundry/Hardhat config) · `rome call <chain> <addr> "<fn>" <args>` · `rome doctor <chain>` (preflight) · `rome tx <chain> <txhash>` (EVM receipt + Solana settlement)
- **Actions (sign with `ROME_EVM_KEY`):** `rome new <app> --chain <chain>` (scaffold dual-lane app, wraps `create-rome-app`) · `rome deploy <chain> <artifact.json>` · `rome send …` · `rome fund <chain> --from <src> --amount <n>` (bridge USDC gas via CCTP) · `rome bridge …` (wrapper / Wormhole ETH / bridge-out) · `rome activate <chain>` (fund external-auth PDA) · `rome verify <chain> --path solidity|solana-program`

**MCP server for AI agents** — stdio child process, read-only, holds no keys, exposes all `facts` + `cookbook` as tools:

```json
{ "mcpServers": { "rome": { "command": "rome", "args": ["mcp"] } } }
```

> **Recommendation:** wire the Rome MCP server into the building AI so it pulls live, verified chain facts and CPI recipes instead of guessing.

#### 7d. GitHub repos (`github.com/rome-protocol`, ~27 repos)

| Repo | What it is |
|---|---|
| `rome-evm` | Rome EVM: Solana program, emulator, verification tooling |
| `rome-solidity` | Solidity SDK — precompile interfaces + libraries to call Solana from Solidity |
| `rome-sdk-ts` | TypeScript SDK |
| `rome-registry` | Canonical machine-readable chain metadata |
| `rome-cli` | Dev CLI + MCP server |
| `rome-bridge-api` | Stateless HTTP API for bridge primitives (CCTP, Wormhole, Solana SPL); off-chain orchestrator + fee-sponsor, holds no keys |
| `create-rome-app` | Scaffolder for dual-lane apps (invoked by `rome new`) |
| `rome-dex` | Dual-lane unified-liquidity AMM — one pool traded by both EVM & Solana wallets |
| `aerarium` | Compound III lending app — MetaMask + Phantom lanes over one shared Comet |
| `compound-on-rome-comet` | Compound v3 (Comet), unchanged Solidity, gaining native Solana execution |
| `rome-aave-v3-demo` | Aave v3 lending demo (supply/borrow/repay) |
| `cardo` | App Distribution Portal — EVM users drive Solana dApps via CPI |
| `canton-zk-evm` | Ostia, the Canton zkEVM |

### 8. Live / reference apps (what Rome built to prove the rails)

- **Rome App** — swaps, bridging, tokens (mainnet).
- **Portus (a "port")** — EVM users' USDC earns in **Solana lending markets** while they keep custody & sign on their EVM chain (live on mainnet). *The canonical pattern to clone.*
- **Rome Bridge** — USDC + other assets, with wrapped assets (wUSDC/wETH/wSOL).
- **Oracle Gateway + keeper** — brings Solana price feeds (Pyth/Switchboard) to Solidity.
- **Block explorer** (via…).
- Devnet/testnet: a DEX serving EVM+Solana from one pool, Compound v3 & Aave v3 unchanged against Solana assets, private swaps on Solana, a compliant private-paper issuance venue, and **Cardo** (portal putting Solana apps in front of EVM users).

### 9. Contract addresses (snapshot — ALWAYS re-verify via `rome facts contracts <chain>`)

**Rubicon mainnet (7531):** ERC20SPLFactory `0x4068aa74…ae6e` · Multicall3 `0xd6e0b13e…a759` · RomeBridgeWithdraw `0xceea1917…9c84` · UniswapV2Factory `0x23af4d20…1dc2` · UniswapV2Router `0x445d7af7…37f7` · UniswapV3Factory `0x02aed776…a025` · SwapRouter(V3) `0x680b7645…d034` · wETH `0x01e8b357…92e9` · wSOL `0xc4e29e0f…a113` · wUSDC `0x0952d233…f9b3` · **Program ID** `RomePq9X3iAoTr813HR7uRarafFDUJty6GdiEceYpzX`

**Hadrian testnet (200010):** ERC20SPLFactory `0x37c13e4f…1078` · Multicall3 `0xb7180d3c…ae4c` · RomeBridgeWithdraw `0x6eeacb4e…ec73` · UniswapV3Factory `0xD9E32308…D5bD` · UniswapV4PoolManager `0x8a281Be9…07f7` · MeteoraDAMMv1Factory `0xd68b355f…a3c4` · **Program ID** `RPTWwELXAY4KC9ZPHhaxp7Sq1hHtU3HNEgLbSegCcWf`

**Solana well-known (all nets):** SPL Token `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` · System `11111111111111111111111111111111` · Associated Token `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL`

### 10. The `$ROME` token

- Native token of Rome Protocol. **A builder's chain runs on the builder's own token; Rome's own chain (Rubicon) runs on `ROME`** — you hold ROME for gas to transact on it. As activity grows, working ROME balances grow with it. ROME is **gas on a live chain from day one**.
- **Not a sale.** No valuation, date, or listing announced. Supply/schedules will be published when there's a venue.
- There is an active **airdrop / rewards narrative** (testnet activity, quests, "Imperia" NFT, whitelist spots) — Arena participation feeds into this.

### 11. Backers

$9M raised. **Portal Ventures, Hack VC, HashKey, Anagram, Robot Ventures, Comfy Capital, Bankless Ventures, P2 Ventures, LBank Labs, Polygon Ventures.** Angels: **Anatoly Yakovenko** (Solana co-founder), Austin Federa, Santiago Santos, Jason Yanowitz, Nick White.

---

## PART B — THE ARENA PROGRAM

> URL: `https://arena.mainnet.romeprotocol.xyz/` · Register an app at `/apps/new`.

### 12. What Arena is

Rome Arena is a **builder & ambassador program** (growth/incentive program, not a fixed-deadline hackathon). You register apps, link your deployed contracts, and log activity to earn points called **Laurels**. You climb tiers based on **real on-chain traction** (users, value locked, transaction volume). Grants are discretionary.

### 13. Two participant roles

1. **Builders** — register apps and take them from **testnet → live mainnet** deployment. Earn Laurels from building + real usage.
2. **Ambassadors** — log events, workshops, X posts, and builders they recruit. Earn Laurels from activity & growth.

(You sign in with **wallet or email**, then pick your role.)

### 14. Ranking tiers (climb by traction)

Metrics: **user acquisition + value locked + transaction volume.**

1. **Legionary** — hit the first targets for users/value and transactions.
2. **Patrician** — higher targets.
3. **Pontifex Maximus** — highest targets.

*(Exact numeric thresholds are shown in-app and change; check the live dashboard.)*

### 15. Grants

> "Grants are **never automatic**. Any team can apply **once its app is built on testnet**, and the Rome team decides whether to give a grant and how much, **case by case**."

So: ship something real on testnet first → apply → get evaluated. Traction (the tier metrics) is your leverage.

### 16. Rome Academy (the learning path Arena expects)

A **12-lesson course** in 4 parts, mirroring the build journey:
1. **Fundamentals** — core concepts + first contract deployed.
2. **Both Worlds** — cross-chain integration (EVM ↔ Solana).
3. **Reach & Ship** — bridge integration + mainnet deployment.
4. **The Bigger Step** — running your own Rome chain.

You "register what you build in Arena."

### 17. How to participate — concrete checklist

1. **Set up wallets:** MetaMask (EVM) + a Solana wallet (Phantom/Backpack/Solflare).
2. **Add Hadrian testnet** (chainId `200010`, RPC above). `rome doctor hadrian` to preflight.
3. **Get gas (USDC on Hadrian):** fund ≥ **0.5 USDC** (1 USDC = comfortable headroom). Two paths:
   - Solana path: get devnet USDC (Circle faucet) + a little devnet SOL → `rome fund hadrian --from solana …` / Rome Bridge.
   - Ethereum path: mint test USDC on **Sepolia** → bridge via **CCTP**.
4. **Scaffold:** `rome new <app> --chain hadrian` (dual-lane app) — or Hardhat/Foundry via `rome preset foundry hadrian`.
5. **Build & deploy** your contracts; make the Rome-unique thing work (CPI into a Solana program, or dual-wallet access, or a port).
6. **Verify it works:** `rome verify hadrian --path solidity` ("works-gate" validation) and `rome tx hadrian <hash>` to confirm EVM receipt + Solana settlement.
7. **Register the app** at `arena.mainnet.romeprotocol.xyz/apps/new` and **link contracts**.
8. **Graduate to Rubicon mainnet**, drive real users/volume/TVL, climb tiers, and **apply for a grant**.

### 17b. Official Arena structure ("Learn → Build → Win")

Arena front page frames it as three steps:
1. **Learn** — Rome Academy (12 lessons).
2. **Build** — "Register your app and link your contracts. Take it from testing to live."
3. **Win** — "Complete milestones to earn Laurels."

Join links: Builders → `/apps/new`. Ambassadors → `/enter`. Sections in-app: **Ideas** (`/ideas`), **Civitas** (community/ambassador leaderboard).

> **Important honesty note:** Exact Laurel point values and exact numeric tier thresholds (how many users / how much TVL / how many txns for Legionary vs Patrician vs Pontifex Maximus) are **not published publicly** — they appear only inside the app after sign-in. Treat tier metrics qualitatively (first targets → higher → highest) and check the live dashboard for current numbers.

### 17c. Official Arena idea catalogue (56 ideas, grouped by category)

Rome publishes a build-ideas list at `/ideas`, organized by the same five build categories. Representative ideas (use as inspiration or pick one directly):

**Solidity apps using Solana liquidity**
- *Arbitrage Engine* — bot reads pool state, simulates trades, submits strategies via Rome contracts calling Solana programs in one tx.
- *Arbitrage Executor* — Solidity contract trading against Solana pools; each atomic strategy fits in one Solana tx.
- *Arbitrage Simulation Network* — simulate trades vs Rome contracts + Solana programs, record costs/outcomes before submitting.

**EVM and Solana wallets (one app, both wallet types)**
- *DEX with Bridge Funding* — DEX on Rome with embedded bridge; EVM + Solana wallets trade the same pools.
- *HIREhub* — contributor directory with work records + employer attestations, both wallet types.
- *Identity Manager* — profile linking an EVM wallet and a Solana wallet after proving control of each.

**Solana programs for EVM users**
- *BTC Options Platform* — options app, USDC settlement, Bitcoin price feed; shared contracts for both wallets.
- *Perps Aggregator* — compares Solana perp markets, lets EVM wallets reach them through Rome.
- *Perps DEX* — perpetuals market, shared contracts, prices from Solana oracles.

**Assets and users across chains**
- *Atomic Swaps* — Solidity calls a Solana trading program in one tx; if either step fails, the whole tx reverts.
- *Bridge Funding Interface* — lists bridge routes, brings USDC to Rome, shows transfer status before entering a DeFi app.
- *Bridge Liquidity Provider* — market-maker funding a token's route between EVM chains and Solana, earning fees (Solgate).

**Own chain (Rome operates the infra)**
- *AI Agent Chain* — a Rome chain for agent transactions, own chain ID + SPL gas token.
- *DePIN App Chain* — a Rome chain for a DePIN app, own chain ID + SPL gas token.
- *Gaming Platform* — a game where both wallet types interact with the same contracts for player actions + assets.

(56 ideas total across these categories — full list in-app at `/ideas`.)

### 18. Prior hackathon tracks (signal for what Rome values)

At ETHGlobal Bangkok, Rome's $10k prize had three streams — useful as idea categories:
1. Leverage Rome's L2 stack for EVM L2s.
2. Build modular dApps using Rome interop.
3. Deploy an EVM-compatible dApp / smart contract on Rome EVM.

---

## PART C — BUILD GUIDANCE FOR THE PROJECT

### 19. What makes a *strong* Arena project

A project that merely deploys vanilla Solidity to an EVM chain is weak — that works anywhere. A strong Rome project **uses something only Rome can do**:

- **Atomic CPI:** a Solidity contract calls a Solana program (Jupiter swap, Kamino/Save/marginfi lending, Meteora LP, an oracle) **in one transaction** — no bridge, no second signature.
- **Dual-lane / shared state:** one contract, one liquidity pool, one state — driven by both a MetaMask user and a Phantom user (clone the `rome-dex` / `aerarium` pattern).
- **A port:** your own EVM chain's users keep custody and earn/trade in a Solana market (clone **Portus**).
- **Sovereign chain:** launch an EVM chain with your own gas token + fees, or a ZK rollup settling only on Solana.

### 20. Recommended starter architectures (pick one)

1. **Yield port** — EVM users deposit USDC on your Rome chain; contract CPIs into a Solana lending market (Kamino/Save); users keep custody, earn Solana yield. *(Portus pattern — highest "wow", clearly Rome-native.)*
2. **Dual-lane DEX / vault** — single pool, both wallet types trade it; optionally CPI into Jupiter for routing. *(rome-dex pattern.)*
3. **Solana-program front-door** — wrap a popular Solana program so EVM users drive it from Solidity. *(cardo pattern.)*
4. **Oracle-driven app** — use the Oracle Gateway (Pyth/Switchboard feeds in Solidity) for a perp/lending/insurance primitive.

### 21. Recommended stack

- **Contracts:** Solidity ^0.8.28, Hardhat **or** Foundry (`rome preset foundry hadrian` to generate config). Import `@rome-protocol/rome-solidity`.
- **Frontend:** Next.js (App Router) + wagmi/viem for the EVM lane + `@solana/web3.js` + wallet adapters for the Solana lane. Deploy on Vercel.
- **Chain facts:** `@rome-protocol/registry` at runtime; **never hardcode** addresses/chain IDs.
- **Tooling/AI:** wire `rome mcp` into the coding agent; use `rome cookbook cpi-recipe` for verified CPI encoders; `rome doctor` + `rome tx` for debugging.
- **Bridging:** `rome-bridge-api` / `rome fund` / `rome bridge` for CCTP (USDC) + Wormhole (ETH) + SPL.

### 22. Minimal end-to-end example

`hardhat.config.ts`:
```typescript
networks: {
  hadrian: {
    type: "http", chainType: "l1", chainId: 200010,
    url: "https://hadrian.testnet.romeprotocol.xyz/",
    accounts: [configVariable("PRIVATE_KEY")],
  },
}
```
`contracts/HelloRome.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
contract HelloRome {
    string public greeting = "Hello from Solana!";
    uint256 public counter;
    event Greeted(address indexed sender, uint256 count);
    function greet() external returns (string memory) {
        counter++; emit Greeted(msg.sender, counter); return greeting;
    }
    function setGreeting(string calldata g) external { greeting = g; }
}
```
Deploy: `export PRIVATE_KEY="0x…" && npx hardhat run scripts/deploy.ts --network hadrian`

Then extend `greet()` to actually `CpiProgram.invoke(...)` into a Solana program — that's the Rome-native leap.

### 23. Gotchas / constraints checklist

- All Solana accounts **declared upfront**; CPI **depth ≤ 4**; pubkeys are `bytes32`; instruction data usually **Borsh**.
- Gas token differs per chain (Hadrian = USDC; Rubicon = ROME). Fund **before** deploying (`rome doctor`).
- Signed CPI uses the contract's **external-authority PDA**; may need `rome activate <chain>` to fund that PDA.
- Prefer **atomic** execution; fall back to **iterative** only for large workloads.
- Re-verify every address/chain-ID from the registry at build time — testnet values rotate.

### 24. Quick links

- Site: `https://www.rome.builders/` · Docs: `https://docs.rome.builders/` · Arena: `https://arena.mainnet.romeprotocol.xyz/` (register: `/apps/new`)
- GitHub org: `https://github.com/rome-protocol` · Registry: `rome-protocol/rome-registry` · CLI/MCP: `rome-protocol/rome-cli` · Solidity SDK: `rome-protocol/rome-solidity`
- Sovereign portal: `https://sovereign.devnet.romeprotocol.xyz`

---

*End of knowledge base. When in doubt about a live value, call `rome facts …` or read `@rome-protocol/registry` — treat those as ground truth over anything written here.*
