import "dotenv/config";
import { formatUnits, parseUnits, keccak256, encodeAbiParameters, parseAbiParameters } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { PublicKey, Keypair } from "@solana/web3.js";
import { loadConfig } from "../lib/config.js";
import { eip1193FromAccount } from "../lib/eip1193Node.js";
import { requireEvmKey, requireSolanaKey } from "../lib/keys.js";
import * as rome from "../lib/rome.js";
import * as slotlock from "../lib/slotlock.js";
import { deploySlotLock } from "./deploy-slotlock.js";

async function runDemo() {
  console.log("==================================================================");
  console.log("   SlotLock End-to-End Live Demo on Rome Hadrian Testnet");
  console.log("==================================================================");

  const cfg = loadConfig({
    chainId: process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : undefined,
    proxyUrl: process.env.PROXY_URL,
    solanaRpc: process.env.SOLANA_RPC,
  });

  const evm = requireEvmKey();
  const sol = requireSolanaKey();
  const provider = eip1193FromAccount(evm, cfg.proxyUrl, cfg.chainId);
  const synth = rome.syntheticFor(sol.publicKey);

  console.log(`Chain ID: ${cfg.chainId}`);
  console.log(`RPC URL: ${cfg.proxyUrl}`);
  console.log(`Explorer: ${cfg.explorerUrl}`);
  console.log(`Organizer & EVM Attendee: ${evm.address}`);
  console.log(`Solana Attendee (Pubkey): ${sol.publicKey.toBase58()}`);
  console.log(`Solana Attendee (Synthetic EVM): ${synth}`);
  console.log(`wUSDC Token: ${cfg.wusdc}`);

  let contractAddress = process.env.SLOTLOCK_ADDRESS as `0x${string}` | undefined;
  if (!contractAddress) {
    console.log("\n[1/6] Deploying SlotLock contract on Hadrian...");
    contractAddress = await deploySlotLock(cfg, evm);
  } else {
    console.log(`\n[1/6] Using existing SlotLock at: ${contractAddress}`);
  }

  // Check balances
  const client = slotlock.publicClient(cfg);
  const evmBalance = await client.getBalance({ address: evm.address });
  console.log(`EVM Account Native Gas Balance: ${formatUnits(evmBalance, 18)} USDC`);

  // Create an event
  console.log("\n[2/6] Creating Event: 'Solana x EVM Hackers Meetup'...");
  const block = await client.getBlock();
  const now = BigInt(block.timestamp);
  const depositAmount = 1_000_000n; // 1 USDC (6 decimals)

  const eventInput: slotlock.CreateEventInput = {
    title: "Solana x EVM Hackers Meetup",
    description: "Exclusive meetup on Rome Protocol featuring dual-lane demo and self-service check-in with instant deposit refund.",
    coverUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
    location: "Rome Hacker House, Floor 4 & Online",
    startTime: now + 300n,
    endTime: now + 3600n,
    timezone: "UTC",
    capacity: 10,
    registrationDeadline: now + 200n,
    checkInStart: now, // open immediately for demo
    checkInEnd: now + 3000n,
    depositAmount,
    isTokenDeposit: true,
  };

  const createTx = await slotlock.evmCreateEvent(provider, evm.address, contractAddress, eventInput);
  console.log(`Create Event Tx: ${createTx}`);
  await client.waitForTransactionReceipt({ hash: createTx });

  const eventCount = await slotlock.fetchEventCount(cfg, contractAddress);
  const eventId = eventCount;
  console.log(`Event created with ID: ${eventId}`);

  // Fetch event details
  const eventData = await slotlock.fetchEvent(cfg, contractAddress, eventId);
  console.log(`Event Title: ${eventData.title}`);
  console.log(`Deposit Required: ${formatUnits(eventData.depositAmount, 6)} USDC`);
  console.log(`Capacity: ${eventData.capacity} spots`);

  // EVM User (Organizer/Attendee) deposits & registers
  console.log("\n[3/6] EVM Attendee registering with 1 USDC deposit...");
  // Check and grant wrapper if needed
  await rome.evmGrant(provider, evm.address, cfg);
  await rome.evmApprove(provider, evm.address, cfg, contractAddress, depositAmount);

  const regTx = await slotlock.evmRegister(provider, evm.address, contractAddress, eventId, depositAmount, true);
  console.log(`Register Tx: ${regTx}`);
  await client.waitForTransactionReceipt({ hash: regTx });
  console.log("EVM Attendee successfully registered! Spot locked.");

  // Check public attendee list
  const participants = await slotlock.fetchParticipants(cfg, contractAddress, eventId);
  console.log(`Public registered attendees (${participants.length}):`, participants);

  // Organizer opens check-in session
  console.log("\n[4/6] Organizer opens Check-in Session at the venue...");
  const openSessionTx = await slotlock.evmOpenCheckInSession(provider, evm.address, contractAddress, eventId, evm.address);
  console.log(`Open Session Tx: ${openSessionTx}`);
  await client.waitForTransactionReceipt({ hash: openSessionTx });

  const evUpdated = await slotlock.fetchEvent(cfg, contractAddress, eventId);
  console.log(`Active Check-in Session ID: ${evUpdated.activeSessionId}`);
  console.log(`Authorized QR Signer: ${evUpdated.authorizedSigner}`);

  // Generate dynamic QR challenge
  console.log("\n[5/6] Generating Dynamic QR Challenge (valid for 60s)...");
  const expiresAt = now + 600n;
  const challengeHash = slotlock.computeChallengeHash(
    cfg.chainId,
    contractAddress,
    eventId,
    evUpdated.activeSessionId,
    expiresAt
  );

  // Sign challenge with authorized organizer key
  const signature = await evm.signMessage({
    message: { raw: challengeHash },
  });
  console.log(`Dynamic Challenge Signature: ${signature}`);

  // Self-service Check-in by attendee
  console.log("\n[6/6] Attendee scans QR and self-checks in...");
  const checkInTx = await slotlock.evmCheckIn(
    provider,
    evm.address,
    contractAddress,
    eventId,
    evUpdated.activeSessionId,
    expiresAt,
    signature
  );
  console.log(`Check-in & Refund Tx: ${checkInTx}`);
  const checkInReceipt = await client.waitForTransactionReceipt({ hash: checkInTx });
  console.log(`Check-in confirmed in block: ${checkInReceipt.blockNumber}, Status: ${checkInReceipt.status}`);

  // Verification & public transparency check
  const checkedInList = await slotlock.fetchCheckedIn(cfg, contractAddress, eventId);
  console.log("\n==================================================================");
  console.log("   DEMO COMPLETED SUCCESSFULLY!");
  console.log("==================================================================");
  console.log(`Public Checked-in Attendees:`, checkedInList);
  const finalStats = await slotlock.fetchDashboardStats(cfg, contractAddress, eventId);
  console.log(`Stats: Registered=${finalStats.registered}, CheckedIn=${finalStats.checkedIn}, TotalRefunded=${formatUnits(finalStats.totalRefunded, 6)} USDC`);
}

runDemo().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
