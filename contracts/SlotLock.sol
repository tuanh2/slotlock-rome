// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

/**
 * @title SlotLock
 * @notice Self-service event ticketing with stake-to-reserve deposits and verified dynamic check-in on ROME.
 * Supports both EVM (MetaMask) and Solana (Phantom/Solflare via Rome synthetic address) lanes over shared state.
 */
contract SlotLock {
    // -------------------------------------------------------------------------
    // Storage & Enums
    // -------------------------------------------------------------------------

    enum TicketStatus {
        None,
        Registered,
        CheckedIn,
        Refunded, // Self-cancelled before deadline
        Claimed   // Refund claimed after event cancellation or organizer no-show
    }

    struct Ticket {
        TicketStatus status;
        uint64 registeredAt;
        uint64 checkedInAt;
    }

    struct CreateEventParams {
        string title;
        string description;
        string coverUrl;
        string location;
        uint64 startTime;
        uint64 endTime;
        string timezone;
        uint32 capacity;
        uint64 registrationDeadline;
        uint64 checkInStart;
        uint64 checkInEnd;
        uint256 depositAmount;
        bool isTokenDeposit;
    }

    struct EventDetails {
        uint256 id;
        address organizer;
        string title;
        string description;
        string coverUrl;
        string location;
        uint64 startTime;
        uint64 endTime;
        string timezone;
        uint32 capacity;
        uint32 registeredCount;
        uint32 checkedInCount;
        uint64 registrationDeadline;
        uint64 checkInStart;
        uint64 checkInEnd;
        uint256 depositAmount; // in token or wei units
        bool isTokenDeposit;   // true = wUSDC (6 dec), false = native USDC (18 dec)
        bool cancelled;
        bool settled;
        uint32 sessionCount;
        uint32 activeSessionId;
        address authorizedSigner;
    }

    IERC20 public immutable wusdc;

    uint256 public nextEventId = 1;
    mapping(uint256 => EventDetails) internal _events;
    mapping(uint256 => mapping(address => Ticket)) internal _tickets;
    mapping(uint256 => address[]) internal _eventParticipants;
    mapping(uint256 => address[]) internal _eventCheckedIn;
    mapping(uint256 => mapping(uint32 => bool)) internal _sessionRevoked;
    mapping(address => uint256[]) internal _userRegisteredEvents;

    // Reentrancy guard
    uint8 private _unlocked = 1;
    modifier nonReentrant() {
        require(_unlocked == 1, "SlotLock: REENTRANCY");
        _unlocked = 0;
        _;
        _unlocked = 1;
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event EventCreated(
        uint256 indexed eventId,
        address indexed organizer,
        string title,
        uint32 capacity,
        uint256 depositAmount,
        bool isTokenDeposit,
        uint64 startTime,
        uint64 endTime,
        uint64 registrationDeadline,
        uint64 checkInStart,
        uint64 checkInEnd
    );

    event Registered(
        uint256 indexed eventId,
        address indexed participant,
        uint256 depositAmount,
        uint32 currentRegistered
    );

    event RegistrationCancelledAndRefunded(
        uint256 indexed eventId,
        address indexed participant,
        uint256 refundedAmount
    );

    event CheckInSessionOpened(
        uint256 indexed eventId,
        uint32 indexed sessionId,
        address indexed authorizedSigner
    );

    event CheckInSessionRevoked(
        uint256 indexed eventId,
        uint32 indexed sessionId
    );

    event CheckInClosed(
        uint256 indexed eventId
    );

    event CheckedInAndRefunded(
        uint256 indexed eventId,
        address indexed participant,
        uint256 refundedAmount,
        uint32 indexed sessionId
    );

    event EventCancelled(
        uint256 indexed eventId,
        address indexed organizer
    );

    event RefundClaimed(
        uint256 indexed eventId,
        address indexed participant,
        uint256 amount
    );

    event NoShowsSettled(
        uint256 indexed eventId,
        address indexed organizer,
        uint256 settledAmount,
        uint32 noShowCount
    );

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(IERC20 _wusdc) {
        wusdc = _wusdc;
    }

    // -------------------------------------------------------------------------
    // Organizer Functions
    // -------------------------------------------------------------------------

    function createEvent(
        CreateEventParams calldata p
    ) external returns (uint256 eventId) {
        require(p.capacity > 0, "SlotLock: capacity must be > 0");
        require(p.registrationDeadline < p.startTime, "SlotLock: deadline must be before start");
        require(p.startTime < p.endTime, "SlotLock: start must be before end");
        require(p.checkInStart <= p.checkInEnd, "SlotLock: check-in start must be <= check-in end");
        require(p.checkInEnd >= p.startTime, "SlotLock: check-in end must be >= start");
        require(p.depositAmount > 0, "SlotLock: deposit must be > 0");

        eventId = nextEventId++;

        EventDetails storage ev = _events[eventId];
        ev.id = eventId;
        ev.organizer = msg.sender;
        ev.title = p.title;
        ev.description = p.description;
        ev.coverUrl = p.coverUrl;
        ev.location = p.location;
        ev.startTime = p.startTime;
        ev.endTime = p.endTime;
        ev.timezone = p.timezone;
        ev.capacity = p.capacity;
        ev.registrationDeadline = p.registrationDeadline;
        ev.checkInStart = p.checkInStart;
        ev.checkInEnd = p.checkInEnd;
        ev.depositAmount = p.depositAmount;
        ev.isTokenDeposit = p.isTokenDeposit;
        ev.authorizedSigner = msg.sender; // default challenge signer

        emit EventCreated(
            eventId,
            msg.sender,
            p.title,
            p.capacity,
            p.depositAmount,
            p.isTokenDeposit,
            p.startTime,
            p.endTime,
            p.registrationDeadline,
            p.checkInStart,
            p.checkInEnd
        );
    }

    function openCheckInSession(
        uint256 eventId,
        address sessionSigner
    ) external {
        EventDetails storage ev = _events[eventId];
        require(ev.id != 0, "SlotLock: event not found");
        require(msg.sender == ev.organizer, "SlotLock: only organizer");
        require(!ev.cancelled, "SlotLock: event is cancelled");
        require(!ev.settled, "SlotLock: event already settled");
        require(block.timestamp >= ev.checkInStart, "SlotLock: check-in not started yet");
        require(block.timestamp <= ev.checkInEnd, "SlotLock: check-in window passed");

        ev.sessionCount++;
        ev.activeSessionId = ev.sessionCount;
        ev.authorizedSigner = (sessionSigner == address(0)) ? msg.sender : sessionSigner;

        emit CheckInSessionOpened(eventId, ev.activeSessionId, ev.authorizedSigner);
    }

    function revokeSession(uint256 eventId, uint32 sessionId) external {
        EventDetails storage ev = _events[eventId];
        require(ev.id != 0, "SlotLock: event not found");
        require(msg.sender == ev.organizer, "SlotLock: only organizer");
        require(sessionId > 0 && sessionId <= ev.sessionCount, "SlotLock: invalid sessionId");

        _sessionRevoked[eventId][sessionId] = true;
        if (ev.activeSessionId == sessionId) {
            ev.activeSessionId = 0;
        }

        emit CheckInSessionRevoked(eventId, sessionId);
    }

    function closeCheckIn(uint256 eventId) external {
        EventDetails storage ev = _events[eventId];
        require(ev.id != 0, "SlotLock: event not found");
        require(msg.sender == ev.organizer, "SlotLock: only organizer");

        ev.activeSessionId = 0;
        emit CheckInClosed(eventId);
    }

    function cancelEvent(uint256 eventId) external {
        EventDetails storage ev = _events[eventId];
        require(ev.id != 0, "SlotLock: event not found");
        require(msg.sender == ev.organizer, "SlotLock: only organizer");
        require(!ev.cancelled, "SlotLock: already cancelled");
        require(!ev.settled, "SlotLock: already settled");

        ev.cancelled = true;
        ev.activeSessionId = 0;

        emit EventCancelled(eventId, msg.sender);
    }

    function settleNoShows(uint256 eventId) external nonReentrant {
        EventDetails storage ev = _events[eventId];
        require(ev.id != 0, "SlotLock: event not found");
        require(msg.sender == ev.organizer, "SlotLock: only organizer");
        require(!ev.cancelled, "SlotLock: event is cancelled");
        require(!ev.settled, "SlotLock: already settled");
        require(block.timestamp > ev.checkInEnd, "SlotLock: check-in window still active");
        require(ev.sessionCount > 0, "SlotLock: organizer never opened check-in");

        ev.settled = true;

        uint32 noShowCount = 0;
        if (ev.registeredCount > ev.checkedInCount) {
            noShowCount = ev.registeredCount - ev.checkedInCount;
        }

        uint256 settleAmount = uint256(noShowCount) * ev.depositAmount;

        if (settleAmount > 0) {
            if (ev.isTokenDeposit) {
                require(wusdc.transfer(ev.organizer, settleAmount), "SlotLock: transfer failed");
            } else {
                (bool success, ) = ev.organizer.call{value: settleAmount}("");
                require(success, "SlotLock: native transfer failed");
            }
        }

        emit NoShowsSettled(eventId, ev.organizer, settleAmount, noShowCount);
    }

    // -------------------------------------------------------------------------
    // Participant Functions
    // -------------------------------------------------------------------------

    function register(uint256 eventId) external payable nonReentrant {
        EventDetails storage ev = _events[eventId];
        require(ev.id != 0, "SlotLock: event not found");
        require(!ev.cancelled, "SlotLock: event is cancelled");
        require(block.timestamp <= ev.registrationDeadline, "SlotLock: registration closed");
        require(ev.registeredCount < ev.capacity, "SlotLock: event is full");
        require(_tickets[eventId][msg.sender].status == TicketStatus.None, "SlotLock: already registered");

        // Handle deposit
        if (ev.isTokenDeposit) {
            require(msg.value == 0, "SlotLock: native value sent for token deposit");
            require(wusdc.transferFrom(msg.sender, address(this), ev.depositAmount), "SlotLock: token transfer failed");
        } else {
            require(msg.value == ev.depositAmount, "SlotLock: incorrect native deposit amount");
        }

        ev.registeredCount++;
        _tickets[eventId][msg.sender] = Ticket({
            status: TicketStatus.Registered,
            registeredAt: uint64(block.timestamp),
            checkedInAt: 0
        });

        _eventParticipants[eventId].push(msg.sender);
        _userRegisteredEvents[msg.sender].push(eventId);

        emit Registered(eventId, msg.sender, ev.depositAmount, ev.registeredCount);
    }

    function cancelRegistration(uint256 eventId) external nonReentrant {
        EventDetails storage ev = _events[eventId];
        require(ev.id != 0, "SlotLock: event not found");
        require(block.timestamp <= ev.registrationDeadline, "SlotLock: cannot cancel after deadline");
        require(_tickets[eventId][msg.sender].status == TicketStatus.Registered, "SlotLock: not registered");

        _tickets[eventId][msg.sender].status = TicketStatus.Refunded;
        ev.registeredCount--;

        uint256 refundAmount = ev.depositAmount;
        if (ev.isTokenDeposit) {
            require(wusdc.transfer(msg.sender, refundAmount), "SlotLock: refund transfer failed");
        } else {
            (bool success, ) = msg.sender.call{value: refundAmount}("");
            require(success, "SlotLock: native refund failed");
        }

        emit RegistrationCancelledAndRefunded(eventId, msg.sender, refundAmount);
    }

    function checkIn(
        uint256 eventId,
        uint32 sessionId,
        uint64 expiresAt,
        bytes calldata signature
    ) external nonReentrant {
        EventDetails storage ev = _events[eventId];
        _validateCheckInEligible(ev, eventId, sessionId, expiresAt, signature);

        // Mark checked-in
        _tickets[eventId][msg.sender].status = TicketStatus.CheckedIn;
        _tickets[eventId][msg.sender].checkedInAt = uint64(block.timestamp);
        ev.checkedInCount++;
        _eventCheckedIn[eventId].push(msg.sender);

        // Immediate refund
        uint256 refundAmount = ev.depositAmount;
        if (ev.isTokenDeposit) {
            require(wusdc.transfer(msg.sender, refundAmount), "SlotLock: refund transfer failed");
        } else {
            (bool success, ) = msg.sender.call{value: refundAmount}("");
            require(success, "SlotLock: native refund failed");
        }

        emit CheckedInAndRefunded(eventId, msg.sender, refundAmount, sessionId);
    }

    function _validateCheckInEligible(
        EventDetails storage ev,
        uint256 eventId,
        uint32 sessionId,
        uint64 expiresAt,
        bytes calldata signature
    ) internal view {
        require(ev.id != 0, "SlotLock: event not found");
        require(!ev.cancelled, "SlotLock: event is cancelled");
        require(block.timestamp >= ev.checkInStart, "SlotLock: check-in not open yet");
        require(block.timestamp <= ev.checkInEnd, "SlotLock: check-in window closed");
        require(sessionId > 0 && sessionId == ev.activeSessionId, "SlotLock: session not active");
        require(!_sessionRevoked[eventId][sessionId], "SlotLock: session was revoked");
        require(block.timestamp <= expiresAt, "SlotLock: challenge QR expired");
        require(_tickets[eventId][msg.sender].status == TicketStatus.Registered, "SlotLock: ticket not eligible for check-in");

        bytes32 messageHash = keccak256(
            abi.encode(
                block.chainid,
                address(this),
                eventId,
                sessionId,
                expiresAt
            )
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        address recovered = _recoverSigner(ethSignedMessageHash, signature);
        require(recovered != address(0) && recovered == ev.authorizedSigner, "SlotLock: invalid challenge signature");
    }

    function claimRefund(uint256 eventId) external nonReentrant {
        EventDetails storage ev = _events[eventId];
        require(ev.id != 0, "SlotLock: event not found");
        require(_tickets[eventId][msg.sender].status == TicketStatus.Registered, "SlotLock: not eligible for claim");

        bool canClaim = false;
        if (ev.cancelled) {
            canClaim = true;
        } else if (ev.sessionCount == 0 && block.timestamp > ev.checkInEnd) {
            // Organizer never opened check-in and check-in window is over
            canClaim = true;
        }

        require(canClaim, "SlotLock: conditions for refund claim not met");

        _tickets[eventId][msg.sender].status = TicketStatus.Claimed;

        uint256 refundAmount = ev.depositAmount;
        if (ev.isTokenDeposit) {
            require(wusdc.transfer(msg.sender, refundAmount), "SlotLock: claim transfer failed");
        } else {
            (bool success, ) = msg.sender.call{value: refundAmount}("");
            require(success, "SlotLock: native claim failed");
        }

        emit RefundClaimed(eventId, msg.sender, refundAmount);
    }

    // -------------------------------------------------------------------------
    // View Functions
    // -------------------------------------------------------------------------

    function getEvent(uint256 eventId) external view returns (EventDetails memory) {
        return _events[eventId];
    }

    function getEventCount() external view returns (uint256) {
        return nextEventId - 1;
    }

    function getParticipants(uint256 eventId) external view returns (address[] memory) {
        return _eventParticipants[eventId];
    }

    function getCheckedIn(uint256 eventId) external view returns (address[] memory) {
        return _eventCheckedIn[eventId];
    }

    function getTicket(uint256 eventId, address user) external view returns (Ticket memory) {
        return _tickets[eventId][user];
    }

    function getUserRegisteredEvents(address user) external view returns (uint256[] memory) {
        return _userRegisteredEvents[user];
    }

    function isSessionRevoked(uint256 eventId, uint32 sessionId) external view returns (bool) {
        return _sessionRevoked[eventId][sessionId];
    }

    function getDashboardStats(uint256 eventId) external view returns (
        uint32 registered,
        uint32 remaining,
        uint32 checkedIn,
        uint256 totalHeld,
        uint256 totalRefunded,
        uint256 settleable
    ) {
        EventDetails storage ev = _events[eventId];
        registered = ev.registeredCount;
        remaining = ev.capacity > ev.registeredCount ? ev.capacity - ev.registeredCount : 0;
        checkedIn = ev.checkedInCount;

        // Active unrefunded deposits still held in contract for this event
        uint32 activeDeposits = registered - checkedIn;
        totalHeld = uint256(activeDeposits) * ev.depositAmount;
        totalRefunded = uint256(checkedIn) * ev.depositAmount;

        // Settleable after check-in ends if check-in was opened and not cancelled/settled
        if (!ev.cancelled && !ev.settled && ev.sessionCount > 0 && block.timestamp > ev.checkInEnd) {
            settleable = totalHeld;
        } else {
            settleable = 0;
        }
    }

    // -------------------------------------------------------------------------
    // Internal Helpers
    // -------------------------------------------------------------------------

    function _recoverSigner(bytes32 ethSignedMessageHash, bytes memory sig) internal pure returns (address) {
        if (sig.length != 65) {
            return address(0);
        }

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly ("memory-safe") {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        if (v != 27 && v != 28) {
            return address(0);
        }

        return ecrecover(ethSignedMessageHash, v, r, s);
    }

    receive() external payable {}
}
