---
name: d20-keeper
description: Configure, observe and recover d20dao-keeper with on-demand snapshots, UUPS implementation pins and one durable nonce lane.
---

Public protocol reference: `5cb939a27983e037bc4173dbaa2f021bd223dfbc`. Match installed SDK provenance and deployed implementation history before use; each deployment manifest records the source its implementations were deployed and upgraded from.

Read canonical AGENTS.md, keeper/README.md, keeper/MIGRATION.md, keeper/TELEGRAM.md and deploy/docker/README.md as relevant. Match reviewed source and deployment configuration. Successful setup is not production approval.

Epochs last 200 blocks. The source anchor is start-1; each epoch uses the catalog in force for it (`catalogAt`), 1 to 10 slots of a registered recipe and its Airnode signer. The keeper reads a selected recipe from the registry, posts its registered body byte for byte to that signer's gateway and accepts only a response its data template matches exactly. Prepare the first validated snapshot locally and persist it unchanged. Idle preparation has no publication transaction. Unused snapshots can remain for 50 epochs/10,000 blocks, with live demand and unresolved nonce protection. A live paid request triggers publication; its target becomes max(original requestBlock,commitBlock+1). If the selected source yields no valid packet, move through the fixed fallback order: attempt n (1 to count−1) is the slot n positions later, fetched and committed with commitEpochFallback only from n × 20 blocks into the epoch; never skip a source that produced a valid packet. A provider that fails repeatedly opens a short circuit breaker, and the ladder continues with the next slot. Never extend its original 60-second deadline, change query outside that order or refresh persisted data for another outcome.

The daemon is outbound-only. Epoch publication and fulfillment share one wallet nonce lane; HTTP work cannot sign. Use a dedicated transaction wallet and separate VRF key. A primary keeper's transaction wallet must be the registry `committer()`. A follower keeper (`KEEPER_ROLE=follower`) runs on another host with its own wallet, journal and host-local locks and the same VRF key; its wallet must be an allowed backup committer, and it sends only work the primary left unserved, waiting `FOLLOWER_BUSY_DELAY_SECONDS` while the committer's confirmed nonce advanced within `PRIMARY_LIVENESS_SECONDS` and `FOLLOWER_DELAY_SECONDS` otherwise. The keeper share is always paid to `committer()`, so a follower wallet needs its own gas funding. Core variable names are generic: RPC_URLS, CHAIN_ID, COORDINATOR_ADDRESS, KEEPER_DB, TX_KEY_FILE, VRF_KEY_FILE and SEND_TRANSACTIONS. CHAIN_ID is required explicitly; no Arc default is assumed. Keep sends disabled until authorized.

Pin EXPECTED_CODE_HASH, EXPECTED_PROTOCOL_HASH, EXPECTED_IMPLEMENTATION_CODE_HASH and EXPECTED_REGISTRY_IMPLEMENTATION_CODE_HASH as required by the deployment. Both implementations and their slot addresses are checked; an unreviewed change stops processing before reconciliation/sends. Two-step owners administer committer/payout/share and UUPS upgrades. Preserve journal and prepared data during review; do not bypass pins by adopting a fresh database.

For Docker, run init and configure keeper.env from reviewed settings first. Then the install wrapper builds, imports separately supplied keys and starts the service in one command:

- PowerShell: `./deploy/docker/keeper.ps1 install <transaction.key> <vrf.key>`
- POSIX: `sh deploy/docker/keeper.sh install <transaction.key> <vrf.key>`

The service uses d20dao-keeper, d20dao-state-v1/d20dao-keys-v1 volumes and /var/lib/d20dao state paths. Docker must already be available. Keep state, WAL and lock metadata together; stop and use the reviewed migration/backup workflow for identity changes. A setup request does not implicitly authorize funded operation.

Read-only local health is `d20dao-keeper health --db <absolute-path> --max-age 30`. Inspect freshness, current demand, local/published epoch state and actual receipts. Health alone is not a timely fulfillment guarantee. Bounded maintenance and constant-RPC-latency tests are local evidence, not a network SLA.

- Reconcile all signed attempts before another nonce. Timeout or missing acknowledgment is not failure. Preserve exact raw bytes and proof/calldata through restart; replacements retain nonce/destination/payload.
- Expired requests must not be proved or served. A bounded zero-value self-transaction may clear an unresolved nonce; it does not publish/refund/fulfill. Live previous-epoch demand can still settle without resampling.
- Preserve the first valid packet while its clock catches up. Respect same-query retry/backoff without refreshing a saved packet.
- Compaction removes eligible resolved payloads while retaining identities/hashes/status. Public events are the long-term replay source; unpublished expired local packets have no chain archive.
- Keeper fee share goes to the configured committer, whichever allowed wallet published or fulfilled; failed payment is keeper credit. Request refunds and callback retries are separate authorized operations.

Telegram is disabled by default. Both TELEGRAM_BOT_TOKEN and numeric TELEGRAM_CHAT_ID must be privately configured to opt in; do not read or expose actual credentials during documentation/test work. Only that chat can use read-only /status and /keeper. These return public observations and never modify settings, fund wallets or send transactions. Notifications are best-effort; group members in the configured chat can request summaries. No webhook or public application port is needed.

For code changes use canonical Rust/check/integration workflows. Optional NEON_DB enables an outbound public-evidence index; its availability must not block fulfillment. Local tests must explicitly remove NEON_DB and Telegram settings from child environments. Keep actual key/config files and bot calls outside ordinary source or documentation work.

Durable discovery and terminal classification read finalized state. Receipt reconciliation validates finalized height, transaction identity and canonical block hash before resolving the nonce; restart checks a persisted finalized checkpoint. Reversed finalized history stops processing for investigation, not an automatic nonce reset. Arc Testnet is the approved profile; review finality latency before another chain. Preparation uses persisted fair scheduling; large Explorer epoch refreshes stage 128-row pages and publish atomically.
