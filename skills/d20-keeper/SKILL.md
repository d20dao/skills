---
name: d20-keeper
description: "Protocol rules for operating a d20dao keeper: epoch source selection and fallback, publication timing, implementation pins, backup committers and the keeper share."
---

Public protocol reference: `de5f82eb9fc749c80e83270f57cde9908ddcf1f3`. Match the installed SDK provenance and the deployed implementation history before use; each deployment manifest records the source its implementations were deployed and upgraded from.

Use this only when the user is actually operating a keeper; an integration request is not operator authorization. It states the protocol rules a keeper must satisfy. The keeper's own repository documents how to configure and run it, and a successful setup is not production approval.

**Epochs and sources.** Epochs last 200 blocks and the source anchor is start − 1. Each epoch uses the catalog in force for it (`catalogAt`): 1 to 10 slots, each a registered recipe id and its Airnode signer. Read the selected recipe from the registry, refuse to fetch unless the registered body canonicalizes to that recipe's canonical request, post the body byte for byte to the slot signer's gateway, and accept only a response its data template matches exactly. Prepare the first validated snapshot locally and persist it unchanged; idle preparation sends no transaction.

**Fallback ladder.** If the selected source yields no valid packet, move through the fixed order: attempt n (1 to count − 1) is the slot n positions later, committed with `commitEpochFallback` only from n × 20 blocks into the epoch. Never skip a source that produced a valid packet, never query outside that order, and never refresh a persisted packet to obtain another outcome. A saved packet is unusable once it would be more than 240 seconds old at publication; its demand then expires and refunds.

**Publication and deadlines.** A live paid request triggers publication of the saved packet, and the target becomes max(original requestBlock, commitBlock + 1). Never extend a request's original 60-second deadline. Expired requests must not be proved or served.

**Authorization and the keeper share.** A primary keeper's transaction wallet must be the registry `committer()`. The owner can allow up to four backup committers (`setBackupCommitter`), which publish epochs under exactly the committer's rules; `isAuthorizedCommitter` reports either. Proof submission itself is permissionless, and the coordinator pays each request's keeper share to the submitting wallet when `isAuthorizedCommitter` accepts it and to `committer()` otherwise. A backup keeper can therefore take over automatically and earns the share of what it serves, while funding its own gas. A wallet whose authorization is revoked stops sending but keeps running and reconciling what it already signed. Failed keeper payment becomes keeper credit. Refunds and callback retries are separate authorized calls.

**Pins.** Pin the proxy code hash, the protocol configuration hash and the runtime code hash of both implementations. Both are checked, and an unreviewed change must stop processing before any reconciliation or send. Configure the chain id explicitly: Arc is one network, not an assumed default.

**Recovery.** Reconcile every signed attempt before taking another nonce; a timeout or a missing acknowledgment is not failure. Preserve exact raw bytes and proof calldata across restarts, and keep a replacement on the same nonce, destination and payload. A bounded zero-value self-transaction may clear an unresolved nonce; it publishes, refunds and fulfills nothing. Live previous-epoch demand can still settle without resampling. Public events are the long-term replay source: an unpublished expired local packet has no chain archive.

**Adding a source** is an owner transaction, not an upgrade. The owner registers the recipe and schedules a catalog listing its id with its Airnode, at least two epochs ahead. A keeper needs no release for a new recipe — it reads the definition from the registry — only a gateway for that Airnode.
