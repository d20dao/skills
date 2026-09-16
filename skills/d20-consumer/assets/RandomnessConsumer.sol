// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {D20VRFConsumer} from "@d20dao/vrf-sdk/contracts/D20VRFConsumer.sol";
import {ID20VRF} from "@d20dao/vrf-sdk/contracts/interfaces/ID20VRF.sol";
import {D20VRFRequests} from "@d20dao/vrf-sdk/contracts/libraries/D20VRFRequests.sol";
import {RandomnessMapping as M} from "@d20dao/vrf-sdk/contracts/libraries/RandomnessMapping.sol";

/// @dev Coordinator functions this example uses beyond the minimal ID20VRF interface; all are in coordinatorAbi.
interface ID20VRFRefunds {
    function requestFeePaid(uint256 requestId) external view returns (uint256);
    function requestRefundBps(uint256 requestId) external view returns (uint16);
    function withdrawRefundCredit(address payable recipient) external;
}

/// @notice Standalone integration example; add your application's eligibility rules before requesting.
/// @dev Constructor-based. Do not paste into an upgradeable application without reviewing its storage/initialization.
///      This contract is the fixed refund address of its requests: expiry refunds and any fee overpayment credit
///      return here, so it accepts native transfers and can pull refund credit from the coordinator.
contract RandomnessConsumer is D20VRFConsumer {
    using D20VRFRequests for ID20VRF;
    enum Status { Unknown, Pending, Ready, Refunded }
    struct Outcome { address requester; Status status; bytes32 operationId; bytes32 contextHash; bytes32 word; }
    uint32 public constant CALLBACK_GAS = 100_000;
    ID20VRF public immutable rng;
    mapping(uint256 => Outcome) public outcomes;
    mapping(address => mapping(bytes32 => bool)) public operationUsed;
    /// @notice Refunded RNG fees owed to requesters; withdrawn with withdrawRefund.
    mapping(address => uint256) public refundable;

    error IncorrectFee(uint256 expected, uint256 actual);
    error OperationAlreadyUsed();
    error UnexpectedCallback();
    error NotReady();
    error NothingToWithdraw();
    error TransferFailed();

    constructor(address coordinator) D20VRFConsumer(coordinator) { rng = ID20VRF(coordinator); }

    /// @dev Receives expiry refunds pushed by the coordinator and credit pulled by claimRefundCredit.
    receive() external payable {}

    function requestRaw(bytes32 operationId, bytes32 contextHash) external payable returns (uint256 id) {
        (bytes32 seed, uint256 fee) = _begin(operationId, contextHash);
        id = rng.requestRandomness{value: fee}(seed, CALLBACK_GAS, address(this));
        _record(id, operationId, contextHash, fee);
    }

    function requestMapped(bytes32 operationId, bytes32 contextHash, M.Spec calldata spec)
        external payable returns (uint256 id)
    {
        (bytes32 seed, uint256 fee) = _begin(operationId, contextHash);
        id = rng.requestMappedRandomness{value: fee}(seed, CALLBACK_GAS, address(this), spec);
        _record(id, operationId, contextHash, fee);
    }

    /// @dev itemsHash must commit to the application's ordered item list before the request.
    function requestShuffle(bytes32 operationId, bytes32 itemsHash, uint32 population)
        external payable returns (uint256 id)
    {
        (bytes32 seed, uint256 fee) = _begin(operationId, itemsHash);
        // The library pays the same quoteFee(CALLBACK_GAS) from this contract's balance, which msg.value funded.
        id = rng.shuffle(population, D20VRFRequests.Options(seed, CALLBACK_GAS, address(this)));
        _record(id, operationId, itemsHash, fee);
    }

    /// @dev quoteFee is exact inside the requesting transaction. Callers quote off-chain with
    ///      quoteFeeAt(CALLBACK_GAS, latest baseFeePerGas) plus a buffer; _record returns the difference.
    function _begin(bytes32 operationId, bytes32 contextHash) private returns (bytes32 seed, uint256 fee) {
        fee = rng.quoteFee(CALLBACK_GAS);
        if (msg.value < fee) revert IncorrectFee(fee, msg.value);
        if (operationUsed[msg.sender][operationId]) revert OperationAlreadyUsed();
        operationUsed[msg.sender][operationId] = true;
        seed = keccak256(abi.encode(address(this), msg.sender, operationId, contextHash));
    }

    function _record(uint256 id, bytes32 operationId, bytes32 contextHash, uint256 fee) private {
        if (id == 0 || outcomes[id].status != Status.Unknown) revert UnexpectedCallback();
        outcomes[id] = Outcome(msg.sender, Status.Pending, operationId, contextHash, bytes32(0));
        uint256 change = msg.value - fee;
        if (change != 0) _pay(msg.sender, change);
    }

    function _fulfillRandomness(uint256 id, bytes32 word) internal override {
        Outcome storage result = outcomes[id];
        if (result.status != Status.Pending) revert UnexpectedCallback();
        result.word = word;
        result.status = Status.Ready;
    }

    /// @dev Runs inside the coordinator's 100,000-gas notification, after feePaid * refundBps / 10000 was paid
    ///      to this contract or recorded as its refund credit. Bounded state only; coordinator reentry is rejected.
    function _onRefund(uint256 id) internal override {
        Outcome storage result = outcomes[id];
        if (result.status != Status.Pending) revert UnexpectedCallback();
        result.status = Status.Refunded;
        ID20VRFRefunds coordinator = ID20VRFRefunds(address(rng));
        refundable[result.requester] += coordinator.requestFeePaid(id) * coordinator.requestRefundBps(id) / 10000;
        // Application assets and the retained remainder settle under the application's own rules.
    }

    /// @notice Pulls refund credit the coordinator holds for this contract (failed push or fee overpayment).
    function claimRefundCredit() external {
        ID20VRFRefunds(address(rng)).withdrawRefundCredit(payable(address(this)));
    }

    /// @notice Withdraws refunded RNG fees. Call claimRefundCredit first while the coordinator still holds credit.
    function withdrawRefund() external {
        uint256 amount = refundable[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        refundable[msg.sender] = 0;
        _pay(msg.sender, amount);
    }

    function mappedResult(uint256 id) external view returns (uint256[] memory) {
        if (outcomes[id].status != Status.Ready) revert NotReady();
        return rng.getMappedResult(id);
    }

    function _pay(address to, uint256 amount) private {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
