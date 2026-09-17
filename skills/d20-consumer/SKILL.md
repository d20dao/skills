---
name: d20-consumer
description: Integrate d20dao randomness consumers, same-transaction fee quotes, refund credit, authenticated callbacks and deterministic mappings into an application.
---

Public protocol reference: `640b60cb992a7e3add1efe8e7b392341732ea004`. Match installed SDK provenance and deployed implementation history before use.

Install `@d20dao/vrf-sdk` 0.3.3 or newer from npm and read its packaged README, AGENTS.md, declarations and provenance; its `ID20VRF` exposes `quoteFee`, `quoteFeeAt`, `requestRandomness`, `requestMappedRandomness` and `getMappedResult`. Confirm the selected chain, effective coordinator/registry proxy addresses and both implementation histories. Use public documentation and the package when source repositories require separate access.

## Integration workflow and resources

Inspect the existing contract's authorization, storage/initializer design and request settlement first. Select raw randomness or the intended mapping; preserve application payment and eligibility rules. Do not introduce a keeper deployment into an application integration task.

- For Arc Mainnet (live), read [deployment addresses](references/arc-mainnet.md) and [machine-readable identities](references/arc-mainnet.json).
- For Arc Testnet, read [deployment addresses](references/arc-testnet.md) and [machine-readable identities](references/arc-testnet.json). Configure the coordinator proxy, not an implementation or the restricted pilot consumer.
- Read [methods and semantics](references/methods.md) for fee quoting, built-in signatures, bounds, list commitments and recovery functions.
- Adapt [RandomnessConsumer.sol](assets/RandomnessConsumer.sol) for a constructor-based consumer. It pays the same-transaction quote, returns change to the payer, acts as its own refund address, credits refunded fees to requesters from the refund notification and pulls coordinator refund credit. Add real eligibility rules; its public entry points do not decide who may obtain an application outcome.
- Use [mappings.mjs](assets/mappings.mjs) for SDK mapping specs. A mapped word alone does not verify a proof.

For an upgradeable existing application, preserve its initializer and storage layout. The SDK base uses a constructor/immutable coordinator; choose a reviewed adaptation or adapter instead of blindly copying inheritance. Compile in the user's actual toolchain and test quoted payment, overpayment, caller authorization, unknown/duplicate callbacks, same-word delivery repair, refund state and credit withdrawal. Summarize changed files, validation and any application integration work still required.

## Pay the quoted fee

`fee = max(minFee, feeMultiplier × baseFee × (fulfillGasOverhead + callbackGasLimit))` in native USDC (18 decimals). `pricing()` returns the live parameters; the owner can change them within fixed bounds (`PricingChanged`). Only contracts can request (`ContractConsumerRequired`); wallets go through a consumer contract.

- In the requesting transaction, `quoteFee(callbackGasLimit)` is exact: forward exactly that value, or let a `D20VRFRequests` helper pay it from the contract balance. Require `msg.value >= fee` and return or account for the difference.
- Off-chain, never use `quoteFee` through `eth_call`: it commonly sees a base fee of 0 (observed on Arc) and returns only `minFee`. Quote `quoteFeeAt(callbackGasLimit, latestBlock.baseFeePerGas)`, add a buffer for base-fee movement (the SDK's `quoteRequestFee(provider, coordinator, callbackGasLimit, { bufferBps })`) and send at least that.
- Below the transaction's own quote the coordinator reverts with `IncorrectFee(expected, actual)`; re-quote and resend. Anything above it is credited to the refund address (`FeeOverpaymentCredited`) as refund credit, never revenue, and only that address can withdraw it with `withdrawRefundCredit(recipient)`.
- `requestFeePaid(id)` and `requestRefundBps(id)` show what a request escrowed; keeper share, treasury share and refund settle from those snapshots, so a later pricing or ratio change never touches an open request.

Choose the refund address deliberately. A consumer contract that is the refund address must accept a 30,000-gas native push (`receive()`) or call `withdrawRefundCredit` to pull failed pushes and overpayment credit, as the example does. A wallet refund address withdraws its own credit directly from the coordinator.

## Lifecycle

After epoch activation, requests escrow their quoted fee even if publication is pending. The keeper publishes its first validated local snapshot for live paid demand, then targetBlock=max(requestBlock,commitBlock+1). Keep original request block, epoch, mapping, refund address and 60-second deadline fixed. Multiple requests may share a snapshot and may be fulfilled in one batch transaction with unchanged per-request events; never create a replacement request to recover an accepted result.

- Use packaged D20VRFConsumer, ID20VRF, D20VRFRequests and RandomnessMapping with compiler 0.8.28. coordinatorAbi/epochEntropyAbi describe the effective proxy endpoints.
- For a dice example, rng.d20(D20VRFRequests.Options(clientSeed, callbackGasLimit, refundAddress)) pays quoteFee(callbackGasLimit) from the calling contract's balance. Account separately for application payments.
- Fix caller/request association and application state so users cannot discard accepted outcomes. D20VRFConsumer authenticates the coordinator proxy; validate expected requests and store raw bytes32 with minimal work. Keep application actions/transfers separate.
- Mapped callbacks still return raw words. Read getMappedResult or use canonical mapping; d20 maps to 1 through 20.
- Valid onchain acceptance at or before original requestedAt+60 seconds is timely. Callback failure still earns service payment; retryCallback redelivers only the same result. Strictly after the deadline, `refundRequest(id)` pays `feePaid × refundBps / 10000` to the fixed refund address or records it as refund credit; the ratio was snapshotted at request time (default 100%; the owner may lower it to no less than 50% for future requests only).

Both contracts support owner-authorized UUPS upgrades and two-step ownership; `renounceOwnership` is disabled. Upgrade authority is trusted. The registry committer, coordinator payout recipient, keeper share, bounded pricing, refund ratio and future signer catalogs (scheduled at least two epochs ahead) are administrable; the current implementation provides no request-input or VRF-key override. Verify deployed code, implementation pins and the selected deployment rather than trusting code length or an address alone.

Use the application's existing validation/payment/result flow. SDK examples do not implement PoW, claim locking or minting. Compile through the actual resolver and test changed authentication, fee and lifecycle paths. Local success does not establish service readiness.

Override `_onRefund(uint256 requestId)` in `D20VRFConsumer` to react to refunds; the base authenticates the coordinator. Keep the initial hook within 100,000 gas and update only bounded application state. The notification means paid or credited to the fixed refund address, not necessarily paid to this consumer; read `requestFeePaid` and `requestRefundBps` for the amount. Reentry into coordinator request/refund/retry paths is rejected. Schedule any new, separately paid request in a later transaction under the application's own rules.
