import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import hardhat from "hardhat";
import { parseUnits, encodeAbiParameters, parseAbiParameters, keccak256, toHex } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { PublicKey } from "@solana/web3.js";
import { syntheticAddress } from "@rome-protocol/sdk";

describe("SlotLock Comprehensive Contract Test Suite", function () {
  let viem: any;
  let testClient: any;
  let publicClient: any;
  let organizer: any;
  let attendeeA: any;
  let attendeeB: any;
  let attendeeC: any;
  let challengeSigner: any;

  let mockUsdc: any;
  let slotLock: any;

  const DEPOSIT_USDC_6DEC = parseUnits("3", 6); // 3 wUSDC
  const DEPOSIT_NATIVE_18DEC = parseUnits("3", 18); // 3 native USDC

  let chainId: number;

  before(async function () {
    const conn = (await hardhat.network.connect()) as any;
    viem = conn.viem;
    publicClient = await viem.getPublicClient();
    testClient = await viem.getTestClient();

    chainId = await publicClient.getChainId();
    console.log("Connected to test network with chainId:", chainId);

    const wallets = await viem.getWalletClients();
    organizer = wallets[0];
    attendeeA = wallets[1];
    attendeeB = wallets[2];
    attendeeC = wallets[3];

    // Challenge signer key
    const privKey = generatePrivateKey();
    challengeSigner = privateKeyToAccount(privKey);

    // Deploy Mock wUSDC
    mockUsdc = await viem.deployContract("MockERC20", []);

    // Deploy SlotLock
    slotLock = await viem.deployContract("SlotLock", [mockUsdc.address]);

    // Mint wUSDC to attendees and approve slotLock
    for (const w of [attendeeA, attendeeB, attendeeC]) {
      await mockUsdc.write.mint([w.account.address, parseUnits("100", 6)], { account: organizer.account });
      await mockUsdc.write.approve([slotLock.address, parseUnits("100", 6)], { account: w.account });
    }
  });

  async function createStandardEvent(overrides: Partial<any> = {}) {
    const block = await publicClient.getBlock();
    const now = Number(block.timestamp);

    const params = {
      title: "Rome Developers Night",
      description: "Building on Rome Hadrian Testnet",
      coverUrl: "https://example.com/cover.jpg",
      location: "Rome HQ / Online",
      startTime: BigInt(now + 1000),
      endTime: BigInt(now + 3000),
      timezone: "UTC",
      capacity: 2,
      registrationDeadline: BigInt(now + 500),
      checkInStart: BigInt(now + 800),
      checkInEnd: BigInt(now + 2500),
      depositAmount: DEPOSIT_USDC_6DEC,
      isTokenDeposit: true,
      ...overrides,
    };

    const hash = await slotLock.write.createEvent([params], { account: organizer.account });
    await publicClient.waitForTransactionReceipt({ hash });
    const count = await slotLock.read.getEventCount();
    return Number(count);
  }

  async function createChallengeSignature(
    signerAccount: any,
    chainId: number,
    contractAddress: `0x${string}`,
    eventId: number,
    sessionId: number,
    expiresAt: bigint
  ) {
    const messageHash = keccak256(
      encodeAbiParameters(
        parseAbiParameters("uint256, address, uint256, uint32, uint64"),
        [BigInt(chainId), contractAddress, BigInt(eventId), sessionId, expiresAt]
      )
    );

    const signature = await signerAccount.signMessage({
      message: { raw: messageHash },
    });

    return signature;
  }

  it("1. Two people racing for the last spot (no oversell)", async function () {
    const eventId = await createStandardEvent({ capacity: 1 });

    // Attendee A registers successfully
    await slotLock.write.register([BigInt(eventId)], { account: attendeeA.account });
    const evAfterA = await slotLock.read.getEvent([BigInt(eventId)]);
    assert.equal(evAfterA.registeredCount, 1);

    // Attendee B tries to register for the filled event -> reverts
    await assert.rejects(
      async () => {
        await slotLock.write.register([BigInt(eventId)], { account: attendeeB.account });
      },
      /SlotLock: event is full/
    );
  });

  it("2. One wallet registering twice is rejected", async function () {
    const eventId = await createStandardEvent({ capacity: 5 });

    await slotLock.write.register([BigInt(eventId)], { account: attendeeA.account });

    await assert.rejects(
      async () => {
        await slotLock.write.register([BigInt(eventId)], { account: attendeeA.account });
      },
      /SlotLock: already registered/
    );
  });

  it("3. Wrong wallet opening check-in link / checking in is rejected", async function () {
    const eventId = await createStandardEvent({ capacity: 5 });

    // Only Attendee A registers
    await slotLock.write.register([BigInt(eventId)], { account: attendeeA.account });

    // Advance time to check-in start
    const ev = await slotLock.read.getEvent([BigInt(eventId)]);
    await testClient.setNextBlockTimestamp({ timestamp: ev.checkInStart + 10n });

    // Organizer opens check-in session with challengeSigner
    await slotLock.write.openCheckInSession([BigInt(eventId), challengeSigner.address], { account: organizer.account });

    const now = ev.checkInStart + 10n;
    const expiresAt = now + 60n;
    const sig = await createChallengeSignature(challengeSigner, chainId, slotLock.address, eventId, 1, expiresAt);

    // Attendee B (not registered) tries to check in with the QR challenge
    await assert.rejects(
      async () => {
        await slotLock.write.checkIn([BigInt(eventId), 1, expiresAt, sig], { account: attendeeB.account });
      },
      /SlotLock: ticket not eligible for check-in/
    );
  });

  it("4. Expired QR challenge or challenge for another event is rejected", async function () {
    const eventId = await createStandardEvent({ capacity: 5 });
    await slotLock.write.register([BigInt(eventId)], { account: attendeeA.account });

    const ev = await slotLock.read.getEvent([BigInt(eventId)]);
    const timeNow = ev.checkInStart + 10n;
    await testClient.setNextBlockTimestamp({ timestamp: timeNow });

    await slotLock.write.openCheckInSession([BigInt(eventId), challengeSigner.address], { account: organizer.account });

    // Signature with past expiry
    const expiredAt = timeNow - 5n;
    const sigExpired = await createChallengeSignature(challengeSigner, chainId, slotLock.address, eventId, 1, expiredAt);

    await assert.rejects(
      async () => {
        await slotLock.write.checkIn([BigInt(eventId), 1, expiredAt, sigExpired], { account: attendeeA.account });
      },
      /SlotLock: challenge QR expired/
    );

    // Signature for wrong eventId (e.g. event 999)
    const validExpiry = timeNow + 60n;
    const sigWrongEvent = await createChallengeSignature(challengeSigner, chainId, slotLock.address, 999, 1, validExpiry);
    await assert.rejects(
      async () => {
        await slotLock.write.checkIn([BigInt(eventId), 1, validExpiry, sigWrongEvent], { account: attendeeA.account });
      },
      /SlotLock: invalid challenge signature/
    );
  });

  it("5. Challenge of revoked session is rejected", async function () {
    const eventId = await createStandardEvent({ capacity: 5 });
    await slotLock.write.register([BigInt(eventId)], { account: attendeeA.account });

    const ev = await slotLock.read.getEvent([BigInt(eventId)]);
    const timeNow = ev.checkInStart + 10n;
    await testClient.setNextBlockTimestamp({ timestamp: timeNow });

    await slotLock.write.openCheckInSession([BigInt(eventId), challengeSigner.address], { account: organizer.account });

    // Organizer revokes session 1
    await slotLock.write.revokeSession([BigInt(eventId), 1], { account: organizer.account });

    const expiresAt = timeNow + 60n;
    const sig = await createChallengeSignature(challengeSigner, chainId, slotLock.address, eventId, 1, expiresAt);

    await assert.rejects(
      async () => {
        await slotLock.write.checkIn([BigInt(eventId), 1, expiresAt, sig], { account: attendeeA.account });
      },
      /SlotLock: session not active/
    );
  });

  it("6. Replay check-in is rejected (cannot refund twice)", async function () {
    const eventId = await createStandardEvent({ capacity: 5 });
    await slotLock.write.register([BigInt(eventId)], { account: attendeeA.account });

    const ev = await slotLock.read.getEvent([BigInt(eventId)]);
    const timeNow = ev.checkInStart + 10n;
    await testClient.setNextBlockTimestamp({ timestamp: timeNow });

    await slotLock.write.openCheckInSession([BigInt(eventId), challengeSigner.address], { account: organizer.account });

    const expiresAt = timeNow + 60n;
    const sig = await createChallengeSignature(challengeSigner, chainId, slotLock.address, eventId, 1, expiresAt);

    // First check-in succeeds
    const balBefore = await mockUsdc.read.balanceOf([attendeeA.account.address]);
    await slotLock.write.checkIn([BigInt(eventId), 1, expiresAt, sig], { account: attendeeA.account });
    const balAfter = await mockUsdc.read.balanceOf([attendeeA.account.address]);
    assert.equal(balAfter - balBefore, DEPOSIT_USDC_6DEC);

    // Second check-in attempt reverts
    await assert.rejects(
      async () => {
        await slotLock.write.checkIn([BigInt(eventId), 1, expiresAt, sig], { account: attendeeA.account });
      },
      /SlotLock: ticket not eligible for check-in/
    );
  });

  it("7. Two valid participants using the same active dynamic QR both succeed", async function () {
    const eventId = await createStandardEvent({ capacity: 5 });
    await slotLock.write.register([BigInt(eventId)], { account: attendeeA.account });
    await slotLock.write.register([BigInt(eventId)], { account: attendeeB.account });

    const ev = await slotLock.read.getEvent([BigInt(eventId)]);
    const timeNow = ev.checkInStart + 10n;
    await testClient.setNextBlockTimestamp({ timestamp: timeNow });

    await slotLock.write.openCheckInSession([BigInt(eventId), challengeSigner.address], { account: organizer.account });

    // The single QR currently shown at venue
    const expiresAt = timeNow + 60n;
    const commonSig = await createChallengeSignature(challengeSigner, chainId, slotLock.address, eventId, 1, expiresAt);

    // Attendee A scans and checks in
    await slotLock.write.checkIn([BigInt(eventId), 1, expiresAt, commonSig], { account: attendeeA.account });

    // Attendee B scans the same QR and checks in
    await slotLock.write.checkIn([BigInt(eventId), 1, expiresAt, commonSig], { account: attendeeB.account });

    const checkedInList = await slotLock.read.getCheckedIn([BigInt(eventId)]);
    assert.equal(checkedInList.length, 2);
    assert.equal(checkedInList[0].toLowerCase(), attendeeA.account.address.toLowerCase());
    assert.equal(checkedInList[1].toLowerCase(), attendeeB.account.address.toLowerCase());
  });

  it("8. Cancel registration before deadline refunds deposit; cannot check in after cancelling", async function () {
    const eventId = await createStandardEvent({ capacity: 5 });
    const balBefore = await mockUsdc.read.balanceOf([attendeeA.account.address]);

    await slotLock.write.register([BigInt(eventId)], { account: attendeeA.account });
    const balRegistered = await mockUsdc.read.balanceOf([attendeeA.account.address]);
    assert.equal(balBefore - balRegistered, DEPOSIT_USDC_6DEC);

    // Cancel registration before deadline
    await slotLock.write.cancelRegistration([BigInt(eventId)], { account: attendeeA.account });
    const balCancelled = await mockUsdc.read.balanceOf([attendeeA.account.address]);
    assert.equal(balCancelled, balBefore);

    // Later when check-in opens, cancelled user cannot check in
    const ev = await slotLock.read.getEvent([BigInt(eventId)]);
    const timeNow = ev.checkInStart + 10n;
    await testClient.setNextBlockTimestamp({ timestamp: timeNow });
    await slotLock.write.openCheckInSession([BigInt(eventId), challengeSigner.address], { account: organizer.account });

    const expiresAt = timeNow + 60n;
    const sig = await createChallengeSignature(challengeSigner, chainId, slotLock.address, eventId, 1, expiresAt);

    await assert.rejects(
      async () => {
        await slotLock.write.checkIn([BigInt(eventId), 1, expiresAt, sig], { account: attendeeA.account });
      },
      /SlotLock: ticket not eligible for check-in/
    );
  });

  it("9. Organizer cancels event: participants can self-claim refund", async function () {
    const eventId = await createStandardEvent({ capacity: 5 });
    await slotLock.write.register([BigInt(eventId)], { account: attendeeA.account });

    const balAfterReg = await mockUsdc.read.balanceOf([attendeeA.account.address]);

    // Organizer cancels event
    await slotLock.write.cancelEvent([BigInt(eventId)], { account: organizer.account });

    // Attendee claims refund
    await slotLock.write.claimRefund([BigInt(eventId)], { account: attendeeA.account });
    const balAfterClaim = await mockUsdc.read.balanceOf([attendeeA.account.address]);
    assert.equal(balAfterClaim - balAfterReg, DEPOSIT_USDC_6DEC);
  });

  it("10. Organizer never opened check-in: cannot settle no-shows; participants claim refund", async function () {
    const eventId = await createStandardEvent({ capacity: 5 });
    await slotLock.write.register([BigInt(eventId)], { account: attendeeA.account });

    const ev = await slotLock.read.getEvent([BigInt(eventId)]);
    // Advance past checkInEnd WITHOUT organizer ever opening check-in
    await testClient.setNextBlockTimestamp({ timestamp: ev.checkInEnd + 100n });

    // Organizer tries to settle no-shows -> rejected because check-in was never opened
    await assert.rejects(
      async () => {
        await slotLock.write.settleNoShows([BigInt(eventId)], { account: organizer.account });
      },
      /SlotLock: organizer never opened check-in/
    );

    // Attendee A can self-claim refund
    const balBefore = await mockUsdc.read.balanceOf([attendeeA.account.address]);
    await slotLock.write.claimRefund([BigInt(eventId)], { account: attendeeA.account });
    const balAfter = await mockUsdc.read.balanceOf([attendeeA.account.address]);
    assert.equal(balAfter - balBefore, DEPOSIT_USDC_6DEC);
  });

  it("11. Organizer cannot settle no-shows before check-in window ends", async function () {
    const eventId = await createStandardEvent({ capacity: 5 });
    await slotLock.write.register([BigInt(eventId)], { account: attendeeA.account });

    const ev = await slotLock.read.getEvent([BigInt(eventId)]);
    // Advance into check-in window and open check-in
    await testClient.setNextBlockTimestamp({ timestamp: ev.checkInStart + 10n });
    await slotLock.write.openCheckInSession([BigInt(eventId), challengeSigner.address], { account: organizer.account });

    // Try to settle while checkInEnd has not arrived -> rejected
    await assert.rejects(
      async () => {
        await slotLock.write.settleNoShows([BigInt(eventId)], { account: organizer.account });
      },
      /SlotLock: check-in window still active/
    );
  });

  it("12. After check-in window ends, organizer settles no-show funds correctly", async function () {
    const eventId = await createStandardEvent({ capacity: 5 });
    await slotLock.write.register([BigInt(eventId)], { account: attendeeA.account }); // will check in
    await slotLock.write.register([BigInt(eventId)], { account: attendeeB.account }); // no-show

    const ev = await slotLock.read.getEvent([BigInt(eventId)]);
    const timeNow = ev.checkInStart + 10n;
    await testClient.setNextBlockTimestamp({ timestamp: timeNow });
    await slotLock.write.openCheckInSession([BigInt(eventId), challengeSigner.address], { account: organizer.account });

    // Attendee A checks in
    const expiresAt = timeNow + 60n;
    const sig = await createChallengeSignature(challengeSigner, chainId, slotLock.address, eventId, 1, expiresAt);
    await slotLock.write.checkIn([BigInt(eventId), 1, expiresAt, sig], { account: attendeeA.account });

    // Fast-forward past check-in end
    await testClient.setNextBlockTimestamp({ timestamp: ev.checkInEnd + 50n });

    // Organizer settles no-shows (Attendee B's deposit)
    const orgBalBefore = await mockUsdc.read.balanceOf([organizer.account.address]);
    await slotLock.write.settleNoShows([BigInt(eventId)], { account: organizer.account });
    const orgBalAfter = await mockUsdc.read.balanceOf([organizer.account.address]);

    assert.equal(orgBalAfter - orgBalBefore, DEPOSIT_USDC_6DEC);
  });

  it("13. Rome dual-lane: Solana wallet synthetic address can register and check in", async function () {
    const eventId = await createStandardEvent({ capacity: 5 });

    // Derive a Solana wallet public key and its Rome synthetic EVM address
    const solPubkey = new PublicKey("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
    const solSynthetic = syntheticAddress(solPubkey);

    // Fund the synthetic address with native gas and wUSDC, and approve SlotLock
    await testClient.setBalance({ address: solSynthetic, value: parseUnits("10", 18) });
    await mockUsdc.write.mint([solSynthetic, DEPOSIT_USDC_6DEC], { account: organizer.account });
    await testClient.impersonateAccount({ address: solSynthetic });

    // Impersonated synthetic address approves and registers
    await mockUsdc.write.approve([slotLock.address, DEPOSIT_USDC_6DEC], { account: solSynthetic });
    await slotLock.write.register([BigInt(eventId)], { account: solSynthetic });

    const ticket = await slotLock.read.getTicket([BigInt(eventId), solSynthetic]);
    assert.equal(ticket.status, 1); // TicketStatus.Registered

    // Check in with synthetic address
    const ev = await slotLock.read.getEvent([BigInt(eventId)]);
    const timeNow = ev.checkInStart + 10n;
    await testClient.setNextBlockTimestamp({ timestamp: timeNow });
    await slotLock.write.openCheckInSession([BigInt(eventId), challengeSigner.address], { account: organizer.account });

    const expiresAt = timeNow + 60n;
    const sig = await createChallengeSignature(challengeSigner, chainId, slotLock.address, eventId, 1, expiresAt);

    await slotLock.write.checkIn([BigInt(eventId), 1, expiresAt, sig], { account: solSynthetic });

    const ticketAfter = await slotLock.read.getTicket([BigInt(eventId), solSynthetic]);
    assert.equal(ticketAfter.status, 2); // TicketStatus.CheckedIn
    const balSynthetic = await mockUsdc.read.balanceOf([solSynthetic]);
    assert.equal(balSynthetic, DEPOSIT_USDC_6DEC); // Refunded!

    await testClient.stopImpersonatingAccount({ address: solSynthetic });
  });

  it("14. Public transparency: participants and checked-in attendees publicly queryable", async function () {
    const eventId = await createStandardEvent({ capacity: 5 });
    await slotLock.write.register([BigInt(eventId)], { account: attendeeA.account });

    const participants = await slotLock.read.getParticipants([BigInt(eventId)]);
    assert.equal(participants.length, 1);
    assert.equal(participants[0].toLowerCase(), attendeeA.account.address.toLowerCase());

    const stats = await slotLock.read.getDashboardStats([BigInt(eventId)]);
    assert.equal(stats[0], 1); // registered
    assert.equal(stats[1], 4); // remaining
    assert.equal(stats[2], 0); // checked-in
  });
});
