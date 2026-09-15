---
name: d20-lifecycle
description: Diagnose d20dao on-demand publication, VRF deadlines, callback retries and fixed-recipient refunds from chain evidence.
---

Public protocol reference: `c10699c490c0dd6c7b5ccba7e704cb01fa8c86fa`. Match installed SDK provenance and deployed implementation history before use.

Read current D20VRFCoordinator/EpochEntropy sources, actual proxy ABIs, implementation history and SDK provenance. Logs and health are observations; trusted receipts and state establish outcomes.

Idle local preparation produces no publication transaction. An unpublished idle epoch is normal. Before initial activation requests revert; afterwards a paid request may escrow its fee while waiting for the saved epoch packet. Publication resolves targetBlock=max(requestBlock,commitBlock+1); there is no usable seed before the future block hash. An older epoch can still publish for timely pending demand across a boundary.

| State | Meaning and recovery |
| --- | --- |
| Unpublished request, deadline live | Fee is escrowed. Inspect saved snapshot, demand, target resolution and keeper nonce; no alternate query or reroll. |
| Published request, deadline live | Real proof can be accepted after target confirmations; pending transactions are not acceptance. |
| Fulfilled, callback delivered | Result is final; continue the separate application action. |
| Fulfilled, callback failed | Service is earned. Retry only the same accepted result. |
| Unfulfilled strictly after deadline | refundRequest pays the fixed recipient or refund credit, not caller. |
| Failed keeper payment | Keeper credit is separate from requester escrow and refund credit. |

Acceptance exactly at requestedAt+60 seconds is timely; refunds require strictly later. Preserve the original deadline, request block, epoch and target. Use actual inclusion timestamps and chain finality, not browser or submission time. A 30-second interruption can leave some requests timely and older ones expired; inspect each request, never assume a blanket outcome.

Full coordinator ABI contains recovery functions omitted from ID20VRF. Separate request fees, application refunds, callback delivery and keeper credits. After compaction, use retained IDs/hashes to retrieve original public events; raw local bodies may be gone. Unused local snapshots can be retained for 50 epochs with live-work protection.

An implementation change stops the keeper until explicit review and updated pins. Preserve journal/proof/nonce data; do not treat an upgrade as permission to reroll or bypass recovery. Prepare concrete authorized recovery calls; a read-only diagnosis does not authorize gas or administration.
