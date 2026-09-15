---
name: d20-verification
description: Verify D20 API3 epoch commitments, fixed-key VRF evidence and mappings against independently trusted chain context.
---

Reviewed canonical keeper commit: `db7101890b151f4539b3f6050d708bf7bfd381c7`. Reviewed SDK commit: `3a96f4c3c2878401fdf4c371bfe3e509b0992af4`; confirm its PROTOCOL-PROVENANCE.json matches this source pin.

Read target AGENTS.md, SDK declarations/provenance and current replay, epoch, evidence, verification and mapping source. Match the reviewed commit and deployed configuration. Use public helpers only; keep signer keys outside the verifier. The private alpha is not an approved production service.

Each 200-block epoch commits signed API3 data before starting. Requests pin epoch ID/hash in fixed-key VRF input; fulfillment submits only the real proof. Missing commitment rejects new requests without retaining fees.

1. Pin chain, coordinator/registry code, immutable key and configuration independently of evidence. Retrieve successful receipts/state and check actual log emitters.
2. Decode the original EpochCommitted packet with decodeEpochEvidencePacket and verify with replayEpochCommitment. Supply trusted catalog/signers, epoch ID, anchor hash, stored record and actual commit block/time. Verify exact query, signature, deterministic selection and pre-start commitment.
3. Source IDs are 0 Hyperliquid and 1 ANU. Preserve exact signed bytes and selected query. Attestation proves wrapper provenance, not unbiased upstream data.
4. Decode FulfillmentEvidence.packet with decodeEvidencePacket and use replayCoordinator with its actual exported input fields. Expected key, request block/hash, epoch ID/hash, mapping, configuration and inclusion time/block come from trusted context, not the proof. Compare event AND stored commitments.
5. Explain result and trust boundary: local replay checks computations, not RPC authenticity or inclusion. Apply chain finality/reorg policy.

Proof packet encoding is abi(Proof), exactly 416 bytes. Epoch packet encoding is abi(string canonicalRequest, Attestation). Neither has a version prefix; trusted emitter/event determines the decoder. Logs support wrapper submissions whose outer calldata differs.

Accepted requests retain their epoch across boundaries. Timely onchain acceptance is at or before requestedAt +60 seconds, independent of callback success. Mapping is not proof verification. A real VRF proof is required. Source admission, external crypto review and deployment validation remain release gates.
