// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {D20VRFConsumer} from "@d20dao/vrf-sdk/contracts/D20VRFConsumer.sol";
import {ID20VRF} from "@d20dao/vrf-sdk/contracts/interfaces/ID20VRF.sol";
import {D20VRFRequests} from "@d20dao/vrf-sdk/contracts/libraries/D20VRFRequests.sol";
import {RandomnessMapping as M} from "@d20dao/vrf-sdk/contracts/libraries/RandomnessMapping.sol";

/// @notice Standalone integration example; add your application's eligibility rules before requesting.
/// @dev Constructor-based. Do not paste into an upgradeable application without reviewing its storage/initialization.
contract RandomnessConsumer is D20VRFConsumer {
    using D20VRFRequests for ID20VRF;
    enum Status { Unknown, Pending, Ready, Refunded }
    struct Outcome { address requester; Status status; bytes32 operationId; bytes32 contextHash; bytes32 word; }
    ID20VRF public immutable rng;
    mapping(uint256 => Outcome) public outcomes;
    mapping(address => mapping(bytes32 => bool)) public operationUsed;

    error WrongFee();
    error OperationAlreadyUsed();
    error UnexpectedCallback();
    error NotReady();

    constructor(address coordinator) D20VRFConsumer(coordinator) { rng = ID20VRF(coordinator); }

    function requestRaw(bytes32 operationId, bytes32 contextHash) external payable returns (uint256 id) {
        bytes32 seed = _begin(operationId, contextHash);
        id = rng.requestRandomness{value: msg.value}(seed, 100_000, msg.sender);
        _record(id, operationId, contextHash);
    }

    function requestMapped(bytes32 operationId, bytes32 contextHash, M.Spec calldata spec)
        external payable returns (uint256 id)
    {
        bytes32 seed = _begin(operationId, contextHash);
        id = rng.requestMappedRandomness{value: msg.value}(seed, 100_000, msg.sender, spec);
        _record(id, operationId, contextHash);
    }

    /// @dev itemsHash must commit to the application's ordered item list before the request.
    function requestShuffle(bytes32 operationId, bytes32 itemsHash, uint32 population)
        external payable returns (uint256 id)
    {
        bytes32 seed = _begin(operationId, itemsHash);
        id = rng.shuffle(population, D20VRFRequests.Options(seed, 100_000, msg.sender));
        _record(id, operationId, itemsHash);
    }

    function _begin(bytes32 operationId, bytes32 contextHash) private returns (bytes32) {
        if (msg.value != rng.requestFee()) revert WrongFee();
        if (operationUsed[msg.sender][operationId]) revert OperationAlreadyUsed();
        operationUsed[msg.sender][operationId] = true;
        return keccak256(abi.encode(address(this), msg.sender, operationId, contextHash));
    }

    function _record(uint256 id, bytes32 operationId, bytes32 contextHash) private {
        if (id == 0 || outcomes[id].status != Status.Unknown) revert UnexpectedCallback();
        outcomes[id] = Outcome(msg.sender, Status.Pending, operationId, contextHash, bytes32(0));
    }

    function _fulfillRandomness(uint256 id, bytes32 word) internal override {
        Outcome storage result = outcomes[id];
        if (result.status != Status.Pending) revert UnexpectedCallback();
        result.word = word;
        result.status = Status.Ready;
    }

    function _onRefund(uint256 id) internal override {
        Outcome storage result = outcomes[id];
        if (result.status != Status.Pending) revert UnexpectedCallback();
        result.status = Status.Refunded;
        // The fixed recipient was paid OR credited. Application assets settle separately.
    }

    function mappedResult(uint256 id) external view returns (uint256[] memory) {
        if (outcomes[id].status != Status.Ready) revert NotReady();
        return rng.getMappedResult(id);
    }
}
