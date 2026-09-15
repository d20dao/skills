---
name: d20-verification
description: Verify D20 API3 epoch commitments, fixed-key VRF evidence and mappings against independently trusted chain context.
---

Reviewed canonical keeper commit: `dcca615b3e07f273e45fa5596f80b63da241896a`. Reviewed SDK commit: `77b6b8bbbcb5d9b9e9fff1e33a42ac3fa205b321`; confirm its PROTOCOL-PROVENANCE.json matches this source pin.

Read target AGENTS.md, SDK declarations/provenance and current replay, epoch, evidence, verification and mapping source. Match the reviewed commit and deployed configuration. Use public helpers only; keep signer keys outside the verifier. The private alpha is not an approved production service.

Each 200-block epoch commits signed API3 data before starting. Requests pin epoch ID/hash in fixed-key VRF input; fulfillment submits only the real proof. Missing commitment rejects new requests without retaining fees.

1. Pin chain, coordinator/registry code, immutable key and configuration independently of evidence. Retrieve successful receipts/state and check actual log emitters.
2. Decode the original EpochCommitted packet with decodeEpochEvidencePacket and verify with replayEpochCommitment. Supply trusted catalog/signers, epoch ID, anchor hash, stored record and actual commit block/time. Verify exact query, signature, deterministic selection and pre-start commitment.
3. The four ordered recipe slots are 0 Hyperliquid BTC volume, 1 ANU, 2 TickerLayer BTCUSD lastTrade and 3 TickerLayer ETHUSD lastTrade. The TickerLayer recipes use assetClass crypto and the same Airnode signer 0x32f5eA20F05fdADfCD50Cb8eD920acE96D5f9f2c. Read four signer addresses in their fixed order; three providers do not mean a three-slot catalog. Preserve the entire signed raw response, limited to 128 bytes, and selected query. Read original public epoch event evidence even when resolved keeper history has compacted its raw local payload. Attestation proves wrapper provenance, not unbiased upstream data.
4. Decode FulfillmentEvidence.packet with decodeEvidencePacket and use replayCoordinator with its actual exported input fields. Expected key, request block/hash, epoch ID/hash, mapping, configuration and inclusion time/block come from trusted context, not the proof. Compare event AND stored commitments.
5. Explain result and trust boundary: local replay checks computations, not RPC authenticity or inclusion. Apply chain finality/reorg policy.

Proof packet encoding is abi(Proof), exactly 416 bytes. Epoch packet encoding is abi(string canonicalRequest, Attestation). Neither has a version prefix; trusted emitter/event determines the decoder. Logs support wrapper submissions whose outer calldata differs.

Accepted requests retain their epoch across boundaries. Timely onchain acceptance is at or before requestedAt +60 seconds, independent of callback success. Mapping is not proof verification. A real VRF proof is required. Source admission, external crypto review and deployment validation remain release gates.
