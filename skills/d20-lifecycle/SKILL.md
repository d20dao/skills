---
name: d20-lifecycle
description: Diagnose D20 ArcVRF request deadlines, accepted randomness, callback retries and fixed-recipient refunds from chain state.
---

Use independently trusted chain data for the pinned chain and coordinator. Inspect the target coordinator ABI/source before choosing a recovery transaction. Worker logs and UI labels are observations; receipts and contract state establish service status.

Current development baseline is keeper `7656c3eca6d4b5889254d337c650543e8793af90`. Verify newer versions rather than treating these instructions as a stable deployment specification. Read the target repository's AGENTS.md and `contracts/ArcVRFCoordinator.sol`.

| State | Meaning and permitted recovery |
| --- | --- |
| Pending, timestamp at or before deadline | A valid proof can still be accepted. No requester cancellation or automatic reroll. A pending transaction is not acceptance. |
| Fulfilled, callback delivered | Accepted result is final for this request. Continue the application's separate claim action. |
| Fulfilled, callback failed | The service fee is earned. `retryCallback(requestId, gasLimit)` can redeliver only the accepted result. Do not refund as unfulfilled. |
| Unfulfilled, timestamp strictly after deadline | `refundRequest(requestId)` is available unless already refunded. It pays the fixed request recipient, not whoever calls it. |
| Refund transfer failed | Inspect `refundCredits(recipient)` and the target ABI's withdrawal method. Credit is not a missing fulfillment or a reroll opportunity. |

The deadline is request time plus 60 seconds. Acceptance at the deadline is timely; refunding requires time strictly after it. Use the inclusion block timestamp, not browser time, API arrival time or transaction submission time. Apply the application's chain finality/reorg policy before presenting a definitive outcome.

For `EntropySnapshots` V2 also establish `requestedAt > committedAt` using trusted chain timestamps. Same-timestamp requests are ineligible even in a later block. Original committed API signatures may predate a V2 request; this is valid and does not relax legacy V1 freshness rules. V2 preserves the coordinator's deadline, fee, callback and refund rules.

Inspect `retryCallback` and `refundRequest` through the full coordinator ABI: they are absent from the smaller current `IArcVRF` consumer interface. Verify their precise preconditions and withdrawal signature in the target revision rather than inventing calls.

Separate RNG fees, callback delivery and game payments in status reporting. A coordinator refund is not proof that the application refunded mint/payment funds. Request source, query, mapping, key and input remain fixed throughout recovery. No alternate source or new randomness should repair an expired or failed-callback request.

Prepare a concrete recovery call and explain its target, recipient and effect within the user's authorized scope. Inspect ambiguous transaction outcomes before any retry. Do not infer authorization to spend gas from a read-only diagnosis request.
