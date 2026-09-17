---
name: d20-lifecycle
description: Diagnose d20dao on-demand publication, VRF deadlines, batch fulfillment, callback retries, fixed-recipient refunds and refund credit from chain evidence.
---

Public protocol reference: `640b60cb992a7e3add1efe8e7b392341732ea004`. Match installed SDK provenance and deployed implementation history before use.

Read current D20VRFCoordinator/EpochEntropy sources, actual proxy ABIs, implementation history and SDK provenance. Logs and health are observations; trusted receipts and state establish outcomes.

Idle local preparation produces no publication transaction. An unpublished idle epoch is normal. Before initial activation requests revert; afterwards a paid request escrows the fee quoted in its own transaction (`RandomnessRequested.feePaid`, `requestFeePaid(id)`) while waiting for the saved epoch packet. Publication accepts an attestation that is not future-dated and at most 240 seconds old at the publication block, then resolves targetBlock=max(requestBlock,commitBlock+1); there is no usable seed before the future block hash. A saved packet that has grown older than 240 seconds is never refreshed, so its live demand expires and refunds. An older epoch can still publish for timely pending demand across a boundary.

| State | Meaning and recovery |
| --- | --- |
| Request reverted with IncorrectFee(expected, actual) | msg.value was below the transaction's own quote; no request exists. Re-quote with quoteFeeAt and the latest base fee plus a buffer. |
| FeeOverpaymentCredited(requestId, refundAddress, amount) | The excess over the quote is refund credit of the refund address, independent of fulfillment; only that address withdraws it with withdrawRefundCredit. |
| Unpublished request, deadline live | Fee is escrowed. Inspect saved snapshot age against the 240-second bound, demand, target resolution and keeper nonce; no alternate query or reroll. |
| Published request, deadline live | Real proof can be accepted after target confirmations, alone or inside fulfillRandomnessBatch; pending transactions are not acceptance. |
| Batch member skipped | FulfillmentSkipped(requestId, reason): 1 already fulfilled, 2 refunded, 3 past deadline. That member is untouched; the other members settle normally. |
| Fulfilled, callback delivered | Result is final; continue the separate application action. |
| Fulfilled, callback failed | Service is earned from the escrowed fee. Retry only the same accepted result. |
| Unfulfilled strictly after deadline | refundRequest pays feePaid × refundBps / 10000 to the fixed refund address or its refund credit, not the caller; the remainder stays with the service. |
| Failed keeper payment | Keeper credit is separate from requester escrow and refund credit. |

Acceptance exactly at requestedAt+60 seconds is timely; refunds require strictly later. Preserve the original deadline, request block, epoch and target. Use actual inclusion timestamps and chain finality, not browser or submission time. A 30-second interruption can leave some requests timely and older ones expired; inspect each request, never assume a blanket outcome.

Each request settles from its own snapshots: `requestFeePaid(id)` fixes the amount that keeper share, treasury share and refund are computed from, and `requestRefundBps(id)` fixes the refund ratio; live `pricing()` and `refundBps()` apply only to later requests. `keeperFeeBps()` is not snapshotted: the keeper/treasury split uses its value at acceptance, including for requests opened before a change. Classify from per-request events (RandomnessRequested, RandomnessFulfilled, FulfillmentEvidence, CallbackAttempted, KeeperFeePaid, RequestRefundedTo), never from fulfillment calldata: one batch transaction carries up to 16 proofs.

Full coordinator ABI contains recovery functions omitted from ID20VRF. Separate request fees, application refunds, callback delivery, keeper credits and refund credits. After compaction, use retained IDs/hashes to retrieve original public events; raw local bodies may be gone. Unused local snapshots can be retained for 50 epochs with live-work protection.

An implementation change stops the keeper until explicit review and updated pins. Preserve journal/proof/nonce data; do not treat an upgrade as permission to reroll or bypass recovery. Prepare concrete authorized recovery calls; a read-only diagnosis does not authorize gas or administration.

## Refund notification

`refundRequest` settles the fixed-address payment (a 30,000-gas push) or backed credit, emits `RequestRefundedTo(requestId, refundAddress, amount, paid)`, then notifies the original consumer with `onRefund(requestId)` under 100,000 gas. Notification failure does not undo settlement. `retryRefundCallback(requestId, gasLimit)` retries only the notice, never a second payment or randomness. Check `refundCallbackDelivered` and `RefundCallbackAttempted` separately from the refund payment and refund credit.
