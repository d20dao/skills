---
name: d20-consumer
description: Integrate d20dao randomness consumers, authenticated callbacks and deterministic mappings into an application.
---

Public protocol reference: `d7e785dda57499220bd37d73bc6fad9226872dcc`. Match installed SDK provenance and deployed implementation history before use.

Install `@d20dao/vrf-sdk` from npm and read its packaged README, AGENTS.md, declarations and provenance. The reviewed package is 0.1.1. Confirm the selected chain, effective coordinator/registry proxy addresses and both implementation histories. Use public documentation and the package when source repositories require separate access.

## Integration workflow and resources

Inspect the existing contract's authorization, storage/initializer design and request settlement first. Select raw randomness or the intended mapping; preserve application payment and eligibility rules. Do not introduce a keeper deployment into an application integration task.

- For Arc Testnet, read [deployment addresses](references/arc-testnet.md) and [machine-readable identities](references/arc-testnet.json). Configure the coordinator proxy, not an implementation or the restricted pilot consumer.
- Read [methods and semantics](references/methods.md) for built-in signatures, bounds, list commitments and recovery functions.
- Adapt [RandomnessConsumer.sol](assets/RandomnessConsumer.sol) for a constructor-based consumer. It includes raw/mapped/shuffle requests, caller-scoped operation association and refund notifications. Add real eligibility rules; its public entry points do not decide who may obtain an application outcome.
- Use [mappings.mjs](assets/mappings.mjs) for SDK mapping specs. A mapped word alone does not verify a proof.

For an upgradeable existing application, preserve its initializer and storage layout. The SDK base uses a constructor/immutable coordinator; choose a reviewed adaptation or adapter instead of blindly copying inheritance. Compile in the user's actual toolchain and test exact fees, caller authorization, unknown/duplicate callbacks, same-word delivery repair and refund state. Summarize changed files, validation and any consumer onboarding still required.

After epoch activation, requests escrow exact fees even if publication is pending. The keeper publishes its first validated local snapshot for live allowlisted demand, then targetBlock=max(requestBlock,commitBlock+1). Keep original request block, epoch, mapping, recipient and 60-second deadline fixed. Multiple requests may share a snapshot; never create a replacement request to recover an accepted result.

- Use packaged D20VRFConsumer, ID20VRF, D20VRFRequests and RandomnessMapping with compiler 0.8.28. coordinatorAbi/epochEntropyAbi describe the effective proxy endpoints.
- For a dice example, rng.d20(D20VRFRequests.Options(clientSeed, callbackGasLimit, refundAddress)) forwards the quoted requestFee. Require exact payment and account separately for application payments.
- Fix caller/request association and application state so users cannot discard accepted outcomes. D20VRFConsumer authenticates the coordinator proxy; validate expected requests and store raw bytes32 with minimal work. Keep application actions/transfers separate.
- Mapped callbacks still return raw words. Read getMappedResult or use canonical mapping; d20 maps to 1 through 20.
- Valid onchain acceptance at or before original requestedAt+60 seconds is timely. Callback failure still earns service payment; retryCallback redelivers only the same result. Expired unfulfilled requests refund their fixed recipient or refund credit.

Both contracts support owner-authorized UUPS upgrades and two-step ownership. Upgrade authority is trusted. The registry committer, coordinator payout recipient and keeper share are administrable; the current implementation provides no request-input or VRF-key override. Verify deployed code, implementation pins and service onboarding rather than trusting code length or an address alone.

Use the application's existing validation/payment/result flow. SDK examples do not implement application refunds, PoW, claim locking or minting. Compile through the actual resolver and test changed authentication, fee and lifecycle paths. Local success does not establish service readiness.

Consumers using the refund-enabled implementation can override `_onRefund(uint256 requestId)` in `D20VRFConsumer`. The base authenticates the coordinator. Keep the initial hook within 100,000 gas and update only bounded application state. The notification means paid or credited to the fixed refund recipient, not necessarily paid to this consumer. Reentry into coordinator request/refund/retry paths is rejected. Schedule any new, separately paid request in a later transaction under the application's own rules. Verify live implementation capability before depending on the hook.
