---
name: d20-consumer
description: Integrate D20 ArcVRF Solidity consumers, authenticated callbacks and deterministic mappings into an existing application.
---

Reviewed canonical keeper commit: `db7101890b151f4539b3f6050d708bf7bfd381c7`. Reviewed SDK commit: `3a96f4c3c2878401fdf4c371bfe3e509b0992af4`; confirm its PROTOCOL-PROVENANCE.json matches this source pin.

Read the target SDK AGENTS.md, README, declarations, provenance and DiceConsumer.sol. Match the reviewed canonical commit and deployed configuration. The current alpha is private and release-blocked; preserve ArcVRF identifiers and do not invent production availability.

The coordinator fixes a precommitted API3 epoch ID/hash in every request's VRF input. Each epoch lasts 200 blocks and must be committed before starting. Missing commitment rejects new requests without retaining the fee. Per-game fulfillment contains only the real fixed-key VRF proof.

- Pin chain, coordinator code/configuration, epoch registry and immutable public key. A code-length check alone is not trust. Obtain keeper allowlist onboarding before live requests.
- Use packaged ArcVRFConsumer, IArcVRF, ArcVRFRequests and RandomnessMapping with compiler 0.8.28. Use coordinatorAbi and epochEntropyAbi for chain reads; do not duplicate ABI or mapping arithmetic.
- The request helper supports rng.d20(ArcVRFRequests.Options(clientSeed, callbackGasLimit, refundAddress)). Require exact requestFee when collecting only RNG fees; helpers send the quote from consumer balance. Account separately for game payments without subsidizing underpayment or retaining overpayment.
- Fix recipient, player/request association and mapping. Preserve claim locking so a player cannot discard an accepted outcome and reroll the same claim.
- Override _fulfillRandomness(uint256 requestId, bytes32 randomness). ArcVRFConsumer authenticates the external callback; validate the expected request and store raw bytes32 with minimal work. Keep minting/transfers separate.
- Built-in mappings still callback with raw bytes32. Read getMappedResult or use canonical mapping. A d20 result is 1 through 20.
- Timely service requires onchain proof acceptance at or before requestedAt +60 seconds. Callback failure still earns the fee; retry only the same result. Expired unfulfilled requests refund only the fixed recipient or its refund credit.

Use the application's existing game payment/claim flow. RNG refunds do not implement game-payment refunds, PoW, claim locking or minting. Compile with the actual consumer resolver and exercise changed authentication, fee and lifecycle paths. Successful local tests do not establish deployment or service readiness.
