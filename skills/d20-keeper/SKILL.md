---
name: d20-keeper
description: Configure and recover the outbound D20 keeper and epoch publisher while preserving commitments, persisted proofs, nonce ownership and expiry.
---

Reviewed canonical keeper commit: `dcca615b3e07f273e45fa5596f80b63da241896a`. Reviewed SDK commit: `67d6b0113c92d860b3771ba9e496fa716d17d9ec`; confirm its PROTOCOL-PROVENANCE.json matches this source pin.

Read target AGENTS.md, keeper/README.md, .env.example and keeper/MIGRATION.md for migration; use deploy/docker/README.md for containers. Match the actual build/configuration and SDK provenance commit. This alpha is not an approved production service.

The publisher uses four recipe slots across three providers: Hyperliquid BTC volume, ANU, TickerLayer BTCUSD lastTrade and TickerLayer ETHUSD lastTrade. The latter two share their Airnode signer. It fetches the deterministic API3 source/query, authenticates and persists the record, then commits before the next 200-block epoch starts. Game requests pin epoch ID/hash and need only the fixed-key VRF proof without further API fetches. Missing commitment rejects requests without retaining fees; a late commit cannot repair a started epoch.

Publisher and fulfillment share one wallet nonce lane. Publication is automatic; the registry committer must equal the transaction wallet. Off local chains require ARC_EXPECTED_PROTOCOL_HASH and ARC_EXPECTED_CODE_HASH. Follow actual configuration names and preserve lane ownership. The process is outbound-only. The public verification site stays keyless and separate. Outbound health reporting creates no incoming API.

Use separate VRF/transaction key files, a dedicated wallet, approved chain/code/protocol/registry pins and absolute persistent ARC_DB. The binary reads process environment. ARC_SEND_TRANSACTIONS defaults false. Keep credentials private and fixture keys restricted to isolated local tests. HTTP 402 requires separate payment authorization.

Read-only health is arcdao-keeper health --db /absolute/journal.sqlite --max-age 30. Nonzero may mean degraded, absent, stale or future-dated health. Verify the actual active epoch commitment separately: a known readiness gap can report healthy while it is missing. Inspect chain/journal; local locks do not establish backup freshness or distributed exclusion.

- Reconcile receipts and signed attempts before another nonce. Timeout, missing response and already-known acknowledgment do not establish failure or acceptance.
- Reuse the first persisted authenticated epoch response and commitment across retries/restarts, including when waiting for chain time to catch up. Transient HTTP retries are bounded same-query attempts, not response refresh after persistence. Keep request epoch/input and prepared proof/calldata fixed.
- Journal before broadcast. Rebroadcast identical signed bytes; bounded replacements retain nonce, destination and calldata. Respect gas/fee/cost caps.
- Enforce request deadlines and epoch pre-start cutoffs. A pending nonce may use bounded zero-value self-transaction cleanup; its gas cost does not fulfill or refund a request.
- Unknown nonce conflicts stop the lane for investigation. Preserve journal, lock and signed-attempt history; maintain exclusive wallet ownership.
- Restore consistent SQLite/WAL and scope metadata together, then reconcile freshness. Wallet/coordinator transitions use the canonical drained-only migration.
- Accepted proof with failed callback is fulfilled service. Refund claims and callback recovery use separate authorized coordinator actions.

Configuration changes require restart, which cannot fix insufficient budget, source unavailability or elapsed epoch windows. For Rust changes run canonical fmt/check, clippy with warnings denied, locked tests/build and keeper integration. Local tests do not establish real source admission, chain economics, refunds or crypto safety. Documentation/setup does not authorize a funded launch.

Resolved-history compaction removes raw job proof/calldata, signed transaction payloads and committed/expired epoch raw data only when associated work is resolved. It retains IDs, hashes, status and timing metadata, and preserves live nonce recovery data. Fetch public epoch/fulfillment events for later replay; expired unpublished epoch payloads have no chain archive. Compaction does not promise a smaller SQLite file or a complete raw local archive.
