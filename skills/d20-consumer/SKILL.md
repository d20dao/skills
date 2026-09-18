---
name: d20-consumer
description: Integrate d20dao randomness consumers, same-transaction fee quotes, refund credit, authenticated callbacks and deterministic mappings into an application.
---

Public protocol reference: `de5f82eb9fc749c80e83270f57cde9908ddcf1f3`. Match the installed SDK provenance and the deployed implementation history before use; each deployment manifest records the source its implementations were deployed and upgraded from.

Install `@d20dao/vrf-sdk` 0.4.0 or newer and read its packaged README, AGENTS.md, declarations and provenance; its `ID20VRF` exposes `quoteFee`, `quoteFeeAt`, `requestRandomness`, `requestMappedRandomness` and `getMappedResult`. The [SDK API reference](https://github.com/d20dao/d20-sdk/blob/main/API.md) lists every coordinator and registry function, event and error with its selector, caller and what to do on each error.

## Integration workflow

Inspect the existing contract's authorization, storage/initializer design and settlement first. Select raw randomness or the intended mapping, and preserve application payment and eligibility rules. Do not introduce a keeper deployment into an application integration task.

- Arc Mainnet (live): [deployment addresses](references/arc-mainnet.md) and [machine-readable identities](references/arc-mainnet.json).
- Arc Testnet: [deployment addresses](references/arc-testnet.md) and [machine-readable identities](references/arc-testnet.json). Configure the coordinator proxy, not an implementation or the restricted cost client.
- [Methods and semantics](references/methods.md): fee quoting, built-in signatures, bounds, list commitments, reading results, recovery gas and front ends.
- [RandomnessConsumer.sol](assets/RandomnessConsumer.sol): a constructor-based consumer that pays the same-transaction quote, returns change to the payer, acts as its own refund address, credits refunded fees to requesters and pulls coordinator refund credit. Add real eligibility rules; its public entry points do not decide who may obtain an application outcome.
- [mappings.mjs](assets/mappings.mjs): SDK mapping specs and deterministic outputs. A mapped word alone does not verify a proof.

For an upgradeable application, preserve its initializer and storage layout: the SDK base uses a constructor and an immutable coordinator, so choose a reviewed adaptation or adapter rather than copying the inheritance. Compile in the user's actual toolchain and test quoted payment, overpayment, caller authorization, unknown and duplicate callbacks, same-word redelivery, refund state and credit withdrawal. Summarize changed files, validation and any application work still required.

## Rules that keep an integration correct

- **Request from a contract.** The coordinator rejects wallet requests with `ContractConsumerRequired`. A wallet or backend sends through a deployed consumer; a constructor cannot request either.
- **Quote with `quoteFeeAt` plus a buffer off-chain, never through `eth_call`.** See [Pay the quoted fee](#pay-the-quoted-fee).
- **Keep the callback small: store, do not compute.** Write the raw `bytes32` and a status flag, and do the mapping, payouts and application transitions in a later transaction. A callback that runs out of its `callbackGasLimit` costs the service fee anyway.
- **Map request id to context, and reject unknown or repeated callbacks.** Record the requester, operation and committed inputs when the request is created; in `_fulfillRandomness`, revert unless that entry exists and is still pending. Never let a user open a second request for the same application operation to discard an accepted outcome.
- **Derive many values from one word.** One request yields 256 bits: `keccak256(abi.encode(word, index))` gives as many independent draws as the application needs. Request once per operation, not once per value.
- **Handle the 60-second refund path.** A request not fulfilled by its deadline is never fulfilled late; `refundRequest(id)` pays the snapshotted ratio to the fixed refund address. Applications need a state for "expired" as well as "ready".
- **Never re-roll.** Once a proof is accepted the word is final. Delivery failure is repaired with `retryCallback`, which redelivers the same word. A replacement request is a different outcome and users can game it.
- **Never use `blockhash`, `block.timestamp` or `block.prevrandao` as randomness**, including as a fallback while a request is pending. Validators and callers influence them.
- **Withdraw leftover refund credit.** A buffered off-chain quote leaves the excess as refund credit of the refund address; it is not revenue and nobody sweeps it for you. Either return change in the requesting transaction or call `withdrawRefundCredit(recipient)` from that address.

## Pay the quoted fee

`fee = max(minFee, feeMultiplier × baseFee × (fulfillGasOverhead + callbackGasLimit))` in native USDC (18 decimals). `pricing()` returns the live parameters; the owner can change them within fixed bounds (`PricingChanged`).

- In the requesting transaction, `quoteFee(callbackGasLimit)` is exact: forward exactly that value, or let a `D20VRFRequests` helper pay it from the contract balance. Require `msg.value >= fee` and return or account for the difference.
- Off-chain, `quoteFee` through `eth_call` commonly sees a base fee of 0 and returns only `minFee`, so the real transaction reverts. Quote `quoteFeeAt(callbackGasLimit, latestBlock.baseFeePerGas)`, add a buffer for base-fee movement, and send at least that. The SDK's `quoteRequestFee(provider, coordinator, callbackGasLimit, { bufferBps })` does both.
- Below the transaction's own quote the coordinator reverts with `IncorrectFee(expected, actual)`; re-quote and resend. Anything above it is credited to the refund address (`FeeOverpaymentCredited`), never revenue, and only that address can withdraw it with `withdrawRefundCredit(recipient)`.
- `requestFeePaid(id)` and `requestRefundBps(id)` show what one request escrowed and the ratio it is refunded at; a later `setPricing` or `setRefundBps` never changes an open request. The keeper/treasury split of the escrowed fee uses `keeperFeeBps()` at acceptance and does not change what the consumer paid or can be refunded.

Choose the refund address deliberately. A consumer contract that is the refund address must accept a 30,000-gas native push (`receive()`) or pull failed pushes and overpayment credit with `withdrawRefundCredit`, as the example does. A wallet refund address withdraws its own credit directly from the coordinator.

## Lifecycle, results and recovery

A request escrows its quoted fee even if the epoch packet is not published yet, and fixes its request block, epoch, mapping, refund address and 60-second deadline. Multiple requests may be fulfilled in one batch transaction with unchanged per-request events.

- Take `requestId` from the coordinator's `RandomnessRequested` log in the request receipt, filtered by coordinator address and event name (`FeeOverpaymentCredited` comes first when there is excess), or return it from the consumer.
- Poll by reading the latest block first and then `getRequest(requestId)` from `coordinatorAbi`. `fulfilled` means the word is final: read `getMappedResult(requestId)` (it reverts `NotFulfilled` before) or the consumer's stored word. `delivered` only reports that the callback succeeded. Not fulfilled with a block timestamp after `deadline` means expired. Single requests are normally fulfilled within a few seconds, but wait up to the deadline; timings are not an SLA.
- Mapped callbacks still deliver raw words. Read `getMappedResult` or map off-chain with the original spec; `d20` maps to 1 through 20.
- Acceptance at or before `requestedAt + 60` seconds is timely; a failed callback still earns service payment and `retryCallback` redelivers only the same result. Strictly after the deadline, `refundRequest(id)` pays `feePaid × refundBps / 10000` to the fixed refund address or records it as refund credit (default 100%; the owner may lower the ratio to no less than 50% for future requests only).
- Recovery calls revert `InsufficientCallbackGas` instead of forwarding less gas. Transaction gas limits: `refundRequest` 400,000; `retryCallback(id, gasLimit)` `gasLimit + 250,000`; `retryRefundCallback(id, gasLimit)` `gasLimit + 150,000`. Size `callbackGasLimit` by measuring the callback (a new storage slot costs about 22,100 gas) and adding a margin.
- Override `_onRefund(uint256 requestId)` to react to refunds; the base authenticates the coordinator. Keep it within 100,000 gas and update only bounded state. The notice means paid or credited to the fixed refund address, not necessarily to this consumer; read `requestFeePaid` and `requestRefundBps` for the amount. Reentry into coordinator request, refund and retry paths is rejected, so any new request belongs in a later transaction.

## Front ends

- Add the network with `wallet_addEthereumChain` and `nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }`: Arc Mainnet `chainId: '0x13b2'` (5042), Arc Testnet `chainId: '0x4cef52'` (5042002).
- Coordinator reverts pass through the consumer's call unchanged. Decode them with `coordinatorAbi` (`coordinator.interface.parseError(data)` in ethers); the API reference gives the response to each error.
- ethers v6 structs are `Result` arrays: a field named like an array member, such as `values` or `length`, is shadowed; use `result.getValue(name)` or `result.toObject()`.
- Public Arc RPC endpoints are blocked by common browser ad-block lists (`net::ERR_BLOCKED_BY_CLIENT`) and some reject large JSON-RPC batches. Read through the connected wallet's provider or a same-origin read-only relay, and lower ethers' `batchMaxCount`; details in [methods](references/methods.md#front-ends).

Both service contracts use owner-authorized UUPS upgrades and two-step ownership; `renounceOwnership` is disabled, and upgrade authority is a trust assumption. Administrable without an upgrade: the registry committer and backup committers, registered recipes and epoch catalogs, the coordinator payout recipient and keeper share, bounded pricing and the refund ratio. There is no request-input or VRF-key override. Upgrades keep the consumer ABI compatible and keep serving requests that were open when they executed, so an upgrade is not a reason to change integration code — but verify deployed code and implementation pins when you integrate, and again whenever the manifest records an upgrade or a proxy emits `Upgraded(implementation)`.
