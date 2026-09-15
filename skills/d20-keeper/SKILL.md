---
name: d20-keeper
description: Configure, inspect and recover the outbound D20 ArcDao Rust keeper while preserving persisted randomness, nonce ownership and expiry rules.
---

Read the target keeper's AGENTS.md, `keeper/README.md`, `.env.example`, and `keeper/MIGRATION.md` for migration work; use `deploy/docker/README.md` for containers. Baseline inspected: keeper `7656c3eca6d4b5889254d337c650543e8793af90`. Confirm the running build/configuration before applying guidance; this implemented local prototype is not an externally audited production service.

## Operating boundary

Identify the source-contract version from pinned configuration. V1 uses fresh API attestations and bounded same-query retries. V2 `EntropySnapshots` reads the exact committed signed record onchain, authenticates and journals it, and has no per-request external API call or API attempt charge. Require `requestedAt > committedAt`; original signatures may be older than the request. Never switch an existing request's catalog/version as a recovery step. New records require a new immutable catalog and coordinator, with explicit future-request routing.

The process is outbound-only. It exposes no public HTTP/WebSocket/proof endpoint. Keep the public verification site separate and keyless. Optional outbound health reporting does not create an incoming keeper API.

Use separate VRF and transaction key files, a dedicated transaction wallet, verified chain/code/source pins and an absolute persistent `ARC_DB`. The binary reads process environment, not dotenv automatically. `ARC_SEND_TRANSACTIONS` defaults false; preparation can still fetch unpaid API data, and HTTP 402 is never paid automatically. Never display secrets or use public fixture keys outside isolated local testing.

Read-only health: `arcdao-keeper health --db /absolute/journal.sqlite --max-age 30`. Nonzero can mean degraded, absent, stale or future-dated health; inspect chain state and journal context before deciding recovery. Host-local locks and journal identity do not establish backup freshness or distributed multi-host exclusion.

## Recovery invariants

- Reconcile receipts and all signed attempts before another nonce. An RPC timeout, missing response or “already known” acknowledgment does not establish failure or fulfillment.
- Reuse the first persisted valid V1 API response, or the exact onchain V2 committed record, and prepared proof/calldata. V1 transient API retries are bounded same-query attempts only. Never switch source or resample randomness after an error. V2 must not refresh or re-sign a record, including after restart.
- Retain journal-before-broadcast ordering. Timely rebroadcast uses identical signed bytes; bounded fee replacement retains nonce, destination and calldata. Respect fee/gas/cost caps.
- After deadline, never fetch, prove or rebroadcast expired randomness. A journaled pending nonce may use a bounded zero-value self transaction for cleanup; it costs gas and does not fulfill or refund the request.
- Unknown nonce conflicts stop that lane. Do not skip it, reset the journal, delete lock files or start another wallet/host to bypass ownership. Investigate signed history and chain state first.
- Restore consistent SQLite/WAL and scope metadata together, then reconcile freshness. For intentional wallet/coordinator transitions use the canonical drained-only migration procedure; do not improvise live takeover.
- Accepted proof plus failed callback is fulfilled service. The worker does not automatically claim user refunds or repeatedly retry consumer callbacks; use the coordinator's separate recovery paths within authorized scope.

Configuration changes require restart. A degraded daemon may continue reconciliation; restarting does not fix insufficient budget or source unavailability. External alert delivery requires operator configuration.

For Rust code changes follow canonical checks: cargo fmt/check, clippy with warnings denied, locked tests/build and the local keeper integration test. Use the target repository's scripts/toolchain pins. V2 precommitment removes per-request API-response choice but retains initial catalog choice, withholding and block-producer influence; legacy seed response-selection risk remains relevant to V1. Local tests do not establish source admission, game refunds, chain economics or external crypto review. Do not launch a real-funded service as a consequence of documentation/setup work alone.
