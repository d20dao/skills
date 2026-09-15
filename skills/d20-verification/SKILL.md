---
name: d20-verification
description: Verify d20dao epoch API3 evidence, fixed-key VRF results and mappings using trusted request, publication and proxy history.
---

Public protocol reference: `8fe545a56aa8beea294a96b3ef3fd17a3f514b6b`. Match installed SDK provenance and deployed implementation history before use.

Use the public @d20dao/vrf-sdk. Read its current declarations, provenance and replay/epoch/evidence/mapping sources. Match the reviewed code and both proxy implementations for the relevant transactions; proxy addresses alone do not identify executed logic. Keep keeper/prover keys outside verification.

1. Pin chain, effective D20VRFCoordinator/EpochEntropy addresses, implementation histories, initialized public key and configuration independently of submitted proof. Retrieve successful receipts/state and validate log emitters.
2. Source anchor is epochStart-1. Decode original EpochCommitted evidence and replayEpochCommitment using its exact packet, ordered four signers, anchor, record and actual publication block/time. Publication is on demand and may occur after the first request or an epoch boundary.
3. Slots are Hyperliquid BTC volume, ANU, TickerLayer BTCUSD and TickerLayer ETHUSD; the latter share a signer. Preserve exact signed bytes up to 128 bytes. Attestation establishes wrapper provenance, not unbiased upstream data.
4. Decode FulfillmentEvidence with decodeEvidencePacket and call replayCoordinator using trusted RequestContext. Bind BOTH requestBlock and targetBlock; derive the epoch from requestBlock and require targetBlock=max(requestBlock,committedBlock+1). Use its actual canonical hash and timely inclusion block/time. Never trust an expected key/seed supplied by the proof.
5. configuration.feeRecipient must come from initialFeeRecipient, not mutable current feeRecipient. Compare transcript and commitments with both event and storage. Replayed computations do not authenticate RPC or prove receipt inclusion; apply finality/reorg policy.

Proof evidence is abi(Proof), 416 bytes; fulfillment calldata is 452 bytes. Epoch evidence is abi(string canonicalRequest,Attestation). Neither has a version prefix; trusted emitter/event determines the decoder. Wrapper submissions remain verifiable through logs.

D20Proxy is atomically initialized; implementations are locked. Owner-authorized UUPS upgrades are a trust assumption and require storage/behavior review. Compatible upgrades must retain old accepted replay and pending requests. Reuse original initialized configuration and evidence, not current payout settings or today's epoch packet.

CI fixture signatures and actual API3 signatures must be labeled honestly. Mapping alone does not verify origin, and callback failure does not invalidate accepted proof. Source admission, external review, upgrades and operational readiness remain separate from successful computation.
