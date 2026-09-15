---
name: d20-lifecycle
description: Diagnose D20 epoch admission, VRF acceptance deadlines, callback retries and fixed-recipient refunds from chain state.
---

Reviewed canonical keeper commit: `db7101890b151f4539b3f6050d708bf7bfd381c7`. Reviewed SDK commit: `3a96f4c3c2878401fdf4c371bfe3e509b0992af4`; confirm its PROTOCOL-PROVENANCE.json matches this source pin.

Read target AGENTS.md, ArcVRFCoordinator.sol, EpochEntropy.sol and actual ABI. Match the SDK provenance commit and deployed configuration. The alpha is not an approved production service. Logs/UI labels are observations; trusted receipts and chain state establish status.

Each 200-block epoch must commit signed API3 data before starting. No current commitment means new requests revert without retaining their fee; that is admission failure rather than an accepted request timeout. Late commitments cannot repair started epochs. Accepted requests retain their epoch ID/hash across subsequent boundaries.

| State | Meaning and recovery |
| --- | --- |
| Pending through deadline | Valid proof may still be accepted. Pending transaction is not acceptance. No cancellation or automatic reroll. |
| Fulfilled, callback delivered | Result is final; continue separate application claim. |
| Fulfilled, callback failed | Fee is earned. retryCallback redelivers only the same result. |
| Unfulfilled strictly after deadline | refundRequest pays the fixed recipient, not caller, unless already refunded. |
| Refund transfer failed | Inspect refundCredits and actual withdrawal ABI. Credit is not a reroll opportunity. |

The deadline is requestedAt +60 seconds. Inclusion exactly at the deadline is timely; refund requires strictly later. Use actual inclusion timestamp and finality/reorg policy, not browser time or submission time. Keep key/input/mapping/epoch fixed.

Recovery functions are in the full coordinator ABI, not the smaller IArcVRF interface. Separate RNG fees, delivery and game-payment accounting. Diagnose ambiguous transaction outcomes before retrying. Prepare a concrete target, recipient and effect for authorized recovery; read-only diagnosis does not authorize gas spending.
