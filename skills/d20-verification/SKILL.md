---
name: d20-verification
description: Verify D20 ArcVRF public fulfillment evidence, source attestations, VRF proofs and deterministic mapping using trusted chain context.
---

Use the public SDK replay implementation. Inspect its exported types and `protocol/src/replay.ts`, `verification.ts`, `sources.ts` and `evidence.ts` before constructing inputs. Current baseline is SDK `29d38f8f0584bbd5e57503dcd118dfa9a2790a7e` and keeper `7656c3eca6d4b5889254d337c650543e8793af90`; neither is a release guarantee. Match the installed package provenance and deployed coordinator before verifying.

## Evidence workflow

First identify the source-contract/protocol version from trusted deployment configuration. V1 uses `EntropySources`; V2 uses `EntropySnapshots` with its original immutable catalog. Do not run V1 verification over V2 evidence or reinterpret old requests with a newer catalog. Source recipe version and evidence packet version are separate: V2 retains evidence packet version 1.

1. Pin the chain, coordinator, bytecode/configuration and expected request independently of the proof. Retrieve successful receipt/logs and request state using trusted chain infrastructure. Check the log emitter; a matching event shape from another contract is insufficient.
2. Decode `FulfillmentEvidence.packet` with `decodeEvidencePacket`. The event packet supports wrapper submissions; do not assume the fulfillment calldata is the outer transaction calldata. Decoding is not verification.
3. Build `replayCoordinator` input from its actual exported type: `context`, `requestedAt`, `deadline`, `acceptanceTimestamp`, `publicKey`, `sourceSigners`, `apiProof`, `vrfProof`, `enabledSourceMask`, optional `snapshotCatalog`, and `recorded`. Use `decoded.apiProof` and `decoded.proof` for the two proof fields. For V1 omit `snapshotCatalog`. For V2 supply the original `{records, committedAt}`; `sourceSigners` remains required by the shared type but is unused in that branch, so pass `[]`.
4. Anchor context to the request's actual block hash, immutable public key/key commitment, mapping and source configuration. Use the actual inclusion block timestamp. For V1 pass the actual enabled source mask explicitly; the helper's default is not a deployment recommendation. For V2 obtain `recordCount`, ordered `getRecord(index)`, `committedAt` and `configurationHash` from the independently pinned source contract; compare `snapshotConfigurationHash(records)` with both source and request/coordinator commitments. Never take the expected key or seed from the untrusted proof itself.
5. Replay source/query selection, signed API data validation, seed derivation, VRF verification, mapping and transcript hashing. Compare the replayed transcript to both the event and recorded storage, including other event commitments as applicable to the target ABI. Independently establish that receipt/state refer to the same accepted request.
6. State the result and trust boundary: local computation matched the supplied trusted chain context, subject to its RPC/finality assumptions. `replayCoordinator` does not authenticate RPC responses or prove receipt inclusion itself.

Do not substitute `mapRandomness` for proof verification. Do not turn a signature over an arbitrary word into a VRF proof. Browser verification must import public helpers only; no keeper or test-signing keys.

## V2 snapshot boundaries

`SnapshotRecord` has `source: number`, `airnode: string`, `canonicalRequest: string` and `attestation: {timestamp: bigint, data: string, signature: string}`. Preserve ordered unique stable IDs and exact signed bytes. `selectSnapshot` treats canonical query bytes as opaque; `snapshotApiRequest` is optional display conversion, and parsing failure must not invalidate otherwise valid cryptographic replay.

Require `requestedAt > committedAt` and signature timestamps at or before commitment. Original signatures may predate the request. Verify the exact committed timestamp, data and signature; no re-signature, new QRNG draw or API refresh can substitute. A changed source, signer, query or response requires a new catalog and coordinator, leaving old proofs reproducible against their original catalog.

V2 tests cover all twelve stable IDs with synthetic fixtures. Live collection on 2026-09-15 admitted six actual signed records: IDs 2, 3, 5, 6, 8 and 9. IDs 0, 1, 4, 7, 10 and 11 remain blocked because signed request hashes do not include the requested projection. Never crop signed data or equate fixture coverage with live admission. Consult canonical `docs/snapshot-catalogs.md` for current evidence and bounds.

An API signature proves wrapper provenance, not upstream truth or unbiased data. V2 precommitment removes per-request selection among different API replies; it does not eliminate operator withholding, initial catalog choice or block-producer influence. Public snapshots are not fresh secret entropy. Legacy Seed V2 response-selection concerns remain relevant to V1; do not confuse that seed name with snapshot recipe V2. Source admission, implementation-specific signature parity, external cryptographic review and deployment validation still govern release readiness.
