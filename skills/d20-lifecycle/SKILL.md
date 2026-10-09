---
name: d20-lifecycle
description: Diagnose d20dao requests on Arc and Robinhood Chain: on-demand publication, drand round binding, VRF deadlines, batch fulfillment, callback retries, fixed-recipient refunds and refund credit from chain evidence.
---

Public protocol reference: `b733d8d144649bd92a16158fe0b5d48eb6b27b1f`. Match the installed SDK provenance and the deployed implementation history before use; each deployment manifest records the source its implementations were deployed and upgraded from.

Diagnose from trusted receipts and state; logs and status output are observations. Read the actual coordinator and registry proxy ABIs, the implementation history for the transactions in question, and the SDK provenance.

## Arc

Idle epochs produce no publication transaction, so an unpublished idle epoch is normal. Before initial activation requests revert; afterwards a paid request escrows the fee quoted in its own transaction (`RandomnessRequested.feePaid`, `requestFeePaid(id)`) while it waits for the epoch packet. Publication accepts a record (a signed record, or a drand round at its scheduled time) that is not future-dated and at most 240 seconds old at the publication block, then resolves `targetBlock = max(requestBlock, commitBlock + 1)`; there is no usable seed before that future block hash. A saved signed record is never refreshed to obtain another result, so once it ages past 240 seconds its live demand expires and refunds; a saved drand round that is too old is replaced by a current round, and only while no commit of its epoch has been sent. The drand catalog has one source and no fallback. An older epoch can still publish for timely pending demand across a boundary. Each epoch uses the source catalog in force for it: a newly scheduled catalog applies only to epochs at least two ahead and never changes a current epoch or an open request.

| State | Meaning and recovery |
| --- | --- |
| Request reverted with IncorrectFee(expected, actual) | msg.value was below the transaction's own quote; no request exists. Re-quote with quoteFeeAt and the latest base fee plus a buffer. |
| FeeOverpaymentCredited(requestId, refundAddress, amount) | The excess over the quote is refund credit of the refund address, independent of fulfillment; only that address withdraws it with withdrawRefundCredit. |
| Unpublished request, deadline live | Fee is escrowed. Inspect the epoch's catalog, source selection and fallback windows (a one-source catalog has none); there is no alternate query and no reroll. |
| Published request, deadline live | A real proof can be accepted after target confirmations, alone or inside fulfillRandomnessBatch; pending transactions are not acceptance. |
| Batch member skipped | FulfillmentSkipped(requestId, reason): 1 already fulfilled, 2 refunded, 3 past deadline. That member is untouched; the other members settle normally. |
| Fulfilled, callback delivered | Result is final; continue the separate application action. |
| Fulfilled, callback failed | Service is earned from the escrowed fee. Retry only the same accepted result. |
| Unfulfilled strictly after deadline | refundRequest pays feePaid × refundBps / 10000 to the fixed refund address or its refund credit, not the caller; the remainder stays with the service. |
| KeeperFeePaid names an unexpected wallet | Expected. Proof submission is permissionless, and the share is paid to the submitting wallet when the registry authorizes it (committer or an allowed backup committer) and to committer() otherwise. It does not change what the consumer paid, was refunded or received. |

Acceptance exactly at `requestedAt + 60` seconds is timely; refunds require strictly later. Preserve the original deadline, request block, epoch and target. Use actual inclusion timestamps and chain finality, not browser or submission time. A short interruption can leave some requests timely and older ones expired; inspect each request rather than assuming a blanket outcome.

Each request settles from its own snapshots: `requestFeePaid(id)` fixes the amount that keeper share, treasury share and refund are computed from, and `requestRefundBps(id)` fixes the refund ratio. Live `pricing()` and `refundBps()` apply only to later requests. `keeperFeeBps()` is not snapshotted: the split uses its value at acceptance, including for requests opened before a change. Classify from per-request events (RandomnessRequested, RandomnessFulfilled, FulfillmentEvidence, CallbackAttempted, KeeperFeePaid, RequestRefundedTo), never from fulfillment calldata: one batch transaction carries up to 16 proofs. Keep request fees, application refunds, callback delivery, keeper credits and refund credits apart — the full coordinator ABI holds the recovery functions that `ID20VRF` omits.

An implementation upgrade keeps open requests serviceable and the consumer ABI compatible. It is never a reason to reroll, to extend a deadline or to bypass the refund path. A read-only diagnosis does not authorize gas or administration; prepare concrete authorized calls instead.

## Robinhood Chain

There is no epoch publication. A request binds, when it is made, the first drand evmnet round scheduled at least 3 seconds after its block's timestamp (`RoundAssigned(requestId, beaconId, round)`, `getRoundRequest(id).round`). The keeper fulfils with that round's BLS signature and a VRF proof; the first fulfilment of a round verifies the signature on chain and emits `RoundVerified`, and later requests of the round read the cached randomness. A typical delivery takes 5–8 seconds. Read state with `getRoundRequest(id)` or the SDK's `readRequest`, which returns `pending`, `fulfilled`, `expired` or `refunded`.

| State | Meaning and recovery |
| --- | --- |
| Pending, `roundRandomness` zero, deadline live | Normal: the round is not published or not verified yet. Wait up to the deadline. |
| Pending, `roundRandomness` set, deadline live | The round is verified (another request of it was served); this request's proof can still be accepted. |
| Fulfilled, callback failed | As on Arc: the word is final and earned; `retryCallback` redelivers it. |
| Unfulfilled strictly after deadline | As on Arc: `refundRequest` pays `feePaid × refundBps / 10000` (100% at deployment) to the fixed refund address or its refund credit. |
| `KeeperFeePaid` names an unexpected wallet | Expected: the share goes to the submitter when it is an allowed backup keeper and to `keeper()` otherwise. |

Fees, refund credit, retries and the refund notification work as on Arc; recovery gas was measured on Arc only, so on Robinhood Chain use `eth_estimateGas` with a margin. A request sent through Ethereum's delayed inbox rather than the sequencer takes an earlier timestamp and may bind a round that is already public; send requests as normal transactions.

## Refund notification

`refundRequest` settles the fixed-address payment (a 30,000-gas push) or backed credit, emits `RequestRefundedTo(requestId, refundAddress, amount, paid)`, then notifies the original consumer with `onRefund(requestId)` under 100,000 gas. Notification failure does not undo settlement. `retryRefundCallback(requestId, gasLimit)` retries only the notice, never a second payment or randomness. Check `refundCallbackDelivered` and `RefundCallbackAttempted` separately from the refund payment and refund credit.
