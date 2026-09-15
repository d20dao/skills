---
name: d20-consumer
description: Integrate D20 ArcVRF Solidity consumers, authenticated callbacks and deterministic result mappings in an existing application.
---

Use the target application's existing payment and claim flow. Start by inspecting the installed SDK's AGENTS.md, README, Solidity sources and `examples/DiceConsumer.sol`. Preserve actual ArcVRF identifiers.

## Compatibility

Guidance inspected against keeper commit `7656c3eca6d4b5889254d337c650543e8793af90` and SDK commit `29d38f8f0584bbd5e57503dcd118dfa9a2790a7e`. They are development baselines, not releases. Confirm the target ABI and package version before implementation. Current package is provisional `@arcdao/vrf-sdk` `0.1.0-alpha.0`, private and release-blocked. Do not invent an npm release or deployment address.

## Integration decisions

- Determine whether the coordinator binds legacy `EntropySources` V1 or precommitted `EntropySnapshots` V2. The consumer request/callback ABI stays the same. V2 requests require `requestedAt > committedAt`; a later block with the same timestamp is still ineligible. New source/signer/query/response means a new immutable catalog and coordinator. Route future requests explicitly while preserving old request/coordinator associations.

- Pin chain ID, coordinator address, deployed code and immutable configuration from an approved deployment. Constructor code-length validation alone does not establish trust. Obtain consumer allowlist/service onboarding before sending live requests.
- Solidity imports currently require exactly `pragma solidity 0.8.28;`. Use the packaged `ArcVRFConsumer`, `IArcVRF`, `ArcVRFRequests` and `RandomnessMapping` sources rather than reimplementing their ABI.
- `using ArcVRFRequests for IArcVRF;` permits `rng.d20(ArcVRFRequests.Options(clientSeed, callbackGasLimit, refundAddress))`. Require exact RNG fee with `msg.value == rng.requestFee()` when the entrypoint collects only the RNG fee; split and account for separate game payments explicitly. The helper forwards `requestFee()` to the coordinator.
- Fix the refund recipient when creating the request. Keep player/request association and mapping parameters stable. Validate the application does not permit a player to discard an unfavorable accepted result and reroll the same claim.
- Override `_fulfillRandomness(uint256 requestId, bytes32 randomness)` in `ArcVRFConsumer`; its external callback authenticates the coordinator. Validate the expected request and store the raw word with minimal work. Keep minting/transfers in a separate transaction.
- All built-in mappings still callback with the raw `bytes32` word. Fetch mapped results with `getMappedResult(requestId)` after acceptance. A d20 result is 1 through 20; the raw word is not that result.
- Valid proof acceptance must occur onchain at or before the 60-second deadline. Failed callbacks do not undo service payment. Retry only the accepted result; never request replacement randomness automatically.
- RNG-fee refunds do not implement game-payment refunds, PoW validation, claim locking or minting. Implement those only within the requested application's requirements.

Compile using the consuming project's actual SDK resolver and pinned compiler. Exercise unauthorized callbacks, unknown/duplicate requests, fee accounting, valid delivery, callback failure and the application's refund/claim behavior when changing those paths. Report deployment and service limitations separately from successful local compilation.
