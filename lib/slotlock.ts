import {
  submitRomeTx,
  submitRomeTxV1,
  syntheticAddress,
  type SignerLike,
} from "@rome-protocol/sdk";
import {
  createPublicClient,
  http,
  encodeFunctionData,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  type Hex,
  type Address,
  erc20Abi,
} from "viem";
import { Connection, PublicKey } from "@solana/web3.js";
import type { RomeConfig } from "./config.js";
import slotLockArtifact from "../artifacts/SlotLock.json" with { type: "json" };

export const SLOTLOCK_ABI = slotLockArtifact.abi as readonly any[];

export interface EventData {
  id: bigint;
  organizer: Address;
  title: string;
  description: string;
  coverUrl: string;
  location: string;
  startTime: bigint;
  endTime: bigint;
  timezone: string;
  capacity: number;
  registeredCount: number;
  checkedInCount: number;
  registrationDeadline: bigint;
  checkInStart: bigint;
  checkInEnd: bigint;
  depositAmount: bigint;
  isTokenDeposit: boolean;
  cancelled: boolean;
  settled: boolean;
  sessionCount: number;
  activeSessionId: number;
  authorizedSigner: Address;
}

export interface TicketData {
  status: number; // 0=None, 1=Registered, 2=CheckedIn, 3=Refunded, 4=Claimed
  registeredAt: bigint;
  checkedInAt: bigint;
}

export interface DashboardStats {
  registered: number;
  remaining: number;
  checkedIn: number;
  totalHeld: bigint;
  totalRefunded: bigint;
  settleable: bigint;
}

export interface CreateEventInput {
  title: string;
  description: string;
  coverUrl: string;
  location: string;
  startTime: bigint;
  endTime: bigint;
  timezone: string;
  capacity: number;
  registrationDeadline: bigint;
  checkInStart: bigint;
  checkInEnd: bigint;
  depositAmount: bigint;
  isTokenDeposit: boolean;
}

type Eip1193 = { request: (args: { method: string; params?: any[] }) => Promise<any> };
export type SolanaWallet = { signer: SignerLike };

export function publicClient(cfg: RomeConfig) {
  return createPublicClient({ transport: http(cfg.proxyUrl) });
}

// ------------------------------ Reads ------------------------------

export async function fetchEventCount(cfg: RomeConfig, contract: Hex): Promise<bigint> {
  const client = publicClient(cfg);
  return client.readContract({
    address: contract,
    abi: SLOTLOCK_ABI,
    functionName: "getEventCount",
  }) as Promise<bigint>;
}

export async function fetchEvent(cfg: RomeConfig, contract: Hex, eventId: bigint): Promise<EventData> {
  const client = publicClient(cfg);
  const data: any = await client.readContract({
    address: contract,
    abi: SLOTLOCK_ABI,
    functionName: "getEvent",
    args: [eventId],
  });
  return {
    id: BigInt(data.id ?? data[0]),
    organizer: data.organizer ?? data[1],
    title: data.title ?? data[2],
    description: data.description ?? data[3],
    coverUrl: data.coverUrl ?? data[4],
    location: data.location ?? data[5],
    startTime: BigInt(data.startTime ?? data[6]),
    endTime: BigInt(data.endTime ?? data[7]),
    timezone: data.timezone ?? data[8],
    capacity: Number(data.capacity ?? data[9]),
    registeredCount: Number(data.registeredCount ?? data[10]),
    checkedInCount: Number(data.checkedInCount ?? data[11]),
    registrationDeadline: BigInt(data.registrationDeadline ?? data[12]),
    checkInStart: BigInt(data.checkInStart ?? data[13]),
    checkInEnd: BigInt(data.checkInEnd ?? data[14]),
    depositAmount: BigInt(data.depositAmount ?? data[15]),
    isTokenDeposit: Boolean(data.isTokenDeposit ?? data[16]),
    cancelled: Boolean(data.cancelled ?? data[17]),
    settled: Boolean(data.settled ?? data[18]),
    sessionCount: Number(data.sessionCount ?? data[19]),
    activeSessionId: Number(data.activeSessionId ?? data[20]),
    authorizedSigner: data.authorizedSigner ?? data[21],
  };
}

export async function fetchParticipants(cfg: RomeConfig, contract: Hex, eventId: bigint): Promise<Address[]> {
  const client = publicClient(cfg);
  return client.readContract({
    address: contract,
    abi: SLOTLOCK_ABI,
    functionName: "getParticipants",
    args: [eventId],
  }) as Promise<Address[]>;
}

export async function fetchCheckedIn(cfg: RomeConfig, contract: Hex, eventId: bigint): Promise<Address[]> {
  const client = publicClient(cfg);
  return client.readContract({
    address: contract,
    abi: SLOTLOCK_ABI,
    functionName: "getCheckedIn",
    args: [eventId],
  }) as Promise<Address[]>;
}

export async function fetchTicket(cfg: RomeConfig, contract: Hex, eventId: bigint, user: Address): Promise<TicketData> {
  const client = publicClient(cfg);
  const data: any = await client.readContract({
    address: contract,
    abi: SLOTLOCK_ABI,
    functionName: "getTicket",
    args: [eventId, user],
  });
  return {
    status: Number(data.status ?? data[0]),
    registeredAt: BigInt(data.registeredAt ?? data[1]),
    checkedInAt: BigInt(data.checkedInAt ?? data[2]),
  };
}

export async function fetchUserRegisteredEvents(cfg: RomeConfig, contract: Hex, user: Address): Promise<bigint[]> {
  const client = publicClient(cfg);
  const ids: any = await client.readContract({
    address: contract,
    abi: SLOTLOCK_ABI,
    functionName: "getUserRegisteredEvents",
    args: [user],
  });
  return ids.map((id: any) => BigInt(id));
}

export async function fetchDashboardStats(cfg: RomeConfig, contract: Hex, eventId: bigint): Promise<DashboardStats> {
  const client = publicClient(cfg);
  const stats: any = await client.readContract({
    address: contract,
    abi: SLOTLOCK_ABI,
    functionName: "getDashboardStats",
    args: [eventId],
  });
  return {
    registered: Number(stats[0]),
    remaining: Number(stats[1]),
    checkedIn: Number(stats[2]),
    totalHeld: BigInt(stats[3]),
    totalRefunded: BigInt(stats[4]),
    settleable: BigInt(stats[5]),
  };
}

// ------------------------------ Dynamic Challenge Generator ------------------------------

export function computeChallengeHash(
  chainId: number,
  contractAddress: Address,
  eventId: bigint,
  sessionId: number,
  expiresAt: bigint
): Hex {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("uint256, address, uint256, uint32, uint64"),
      [BigInt(chainId), contractAddress, eventId, sessionId, expiresAt]
    )
  );
}

// ------------------------------ EVM Lane Writes ------------------------------

export async function evmCreateEvent(
  provider: Eip1193,
  from: Hex,
  contract: Hex,
  input: CreateEventInput
) {
  const data = encodeFunctionData({
    abi: SLOTLOCK_ABI,
    functionName: "createEvent",
    args: [input],
  });
  return submitRomeTx(provider, { from, to: contract, data });
}

export async function evmRegister(
  provider: Eip1193,
  from: Hex,
  contract: Hex,
  eventId: bigint,
  depositAmount: bigint,
  isToken: boolean
) {
  const data = encodeFunctionData({
    abi: SLOTLOCK_ABI,
    functionName: "register",
    args: [eventId],
  });
  return submitRomeTx(provider, {
    from,
    to: contract,
    data,
    value: isToken ? 0n : depositAmount,
  });
}

export async function evmCancelRegistration(
  provider: Eip1193,
  from: Hex,
  contract: Hex,
  eventId: bigint
) {
  const data = encodeFunctionData({
    abi: SLOTLOCK_ABI,
    functionName: "cancelRegistration",
    args: [eventId],
  });
  return submitRomeTx(provider, { from, to: contract, data });
}

export async function evmCheckIn(
  provider: Eip1193,
  from: Hex,
  contract: Hex,
  eventId: bigint,
  sessionId: number,
  expiresAt: bigint,
  signature: Hex
) {
  const data = encodeFunctionData({
    abi: SLOTLOCK_ABI,
    functionName: "checkIn",
    args: [eventId, sessionId, expiresAt, signature],
  });
  return submitRomeTx(provider, { from, to: contract, data });
}

export async function evmClaimRefund(
  provider: Eip1193,
  from: Hex,
  contract: Hex,
  eventId: bigint
) {
  const data = encodeFunctionData({
    abi: SLOTLOCK_ABI,
    functionName: "claimRefund",
    args: [eventId],
  });
  return submitRomeTx(provider, { from, to: contract, data });
}

export async function evmOpenCheckInSession(
  provider: Eip1193,
  from: Hex,
  contract: Hex,
  eventId: bigint,
  signer: Address
) {
  const data = encodeFunctionData({
    abi: SLOTLOCK_ABI,
    functionName: "openCheckInSession",
    args: [eventId, signer],
  });
  return submitRomeTx(provider, { from, to: contract, data });
}

export async function evmRevokeSession(
  provider: Eip1193,
  from: Hex,
  contract: Hex,
  eventId: bigint,
  sessionId: number
) {
  const data = encodeFunctionData({
    abi: SLOTLOCK_ABI,
    functionName: "revokeSession",
    args: [eventId, sessionId],
  });
  return submitRomeTx(provider, { from, to: contract, data });
}

export async function evmCloseCheckIn(
  provider: Eip1193,
  from: Hex,
  contract: Hex,
  eventId: bigint
) {
  const data = encodeFunctionData({
    abi: SLOTLOCK_ABI,
    functionName: "closeCheckIn",
    args: [eventId],
  });
  return submitRomeTx(provider, { from, to: contract, data });
}

export async function evmCancelEvent(
  provider: Eip1193,
  from: Hex,
  contract: Hex,
  eventId: bigint
) {
  const data = encodeFunctionData({
    abi: SLOTLOCK_ABI,
    functionName: "cancelEvent",
    args: [eventId],
  });
  return submitRomeTx(provider, { from, to: contract, data });
}

export async function evmSettleNoShows(
  provider: Eip1193,
  from: Hex,
  contract: Hex,
  eventId: bigint
) {
  const data = encodeFunctionData({
    abi: SLOTLOCK_ABI,
    functionName: "settleNoShows",
    args: [eventId],
  });
  return submitRomeTx(provider, { from, to: contract, data });
}

// ------------------------------ Solana Lane Writes ------------------------------

function laneV1Deps(cfg: RomeConfig, signer: SignerLike) {
  return {
    connection: new Connection(cfg.solanaRpc, "confirmed"),
    proxyUrl: cfg.proxyUrl,
    chainId: cfg.chainId,
    programId: cfg.programId,
    signer,
  };
}

async function landed<R extends { receipt: { status?: string } | null }>(step: string, call: Promise<R>): Promise<R> {
  const r = await call;
  if (r.receipt?.status !== "0x1") {
    throw new Error(`${step} did not succeed: ${r.receipt ? "the call reverted" : "no receipt arrived in time"}.`);
  }
  return r;
}

export async function solanaRegister(
  cfg: RomeConfig,
  wallet: SolanaWallet,
  contract: Hex,
  eventId: bigint
) {
  const data = encodeFunctionData({
    abi: SLOTLOCK_ABI,
    functionName: "register",
    args: [eventId],
  });
  return landed("register", submitRomeTxV1(laneV1Deps(cfg, wallet.signer), { to: contract, data }));
}

export async function solanaCheckIn(
  cfg: RomeConfig,
  wallet: SolanaWallet,
  contract: Hex,
  eventId: bigint,
  sessionId: number,
  expiresAt: bigint,
  signature: Hex
) {
  const data = encodeFunctionData({
    abi: SLOTLOCK_ABI,
    functionName: "checkIn",
    args: [eventId, sessionId, expiresAt, signature],
  });
  return landed("checkIn", submitRomeTxV1(laneV1Deps(cfg, wallet.signer), { to: contract, data }));
}

export async function solanaCancelRegistration(
  cfg: RomeConfig,
  wallet: SolanaWallet,
  contract: Hex,
  eventId: bigint
) {
  const data = encodeFunctionData({
    abi: SLOTLOCK_ABI,
    functionName: "cancelRegistration",
    args: [eventId],
  });
  return landed("cancelRegistration", submitRomeTxV1(laneV1Deps(cfg, wallet.signer), { to: contract, data }));
}

export async function solanaClaimRefund(
  cfg: RomeConfig,
  wallet: SolanaWallet,
  contract: Hex,
  eventId: bigint
) {
  const data = encodeFunctionData({
    abi: SLOTLOCK_ABI,
    functionName: "claimRefund",
    args: [eventId],
  });
  return landed("claimRefund", submitRomeTxV1(laneV1Deps(cfg, wallet.signer), { to: contract, data }));
}
