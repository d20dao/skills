---
name: d20-sdk
description: Build and consume the local D20 SDK for epoch commitments, VRF replay, mapping, ABI and Solidity imports.
---

Reviewed canonical keeper commit: `db7101890b151f4539b3f6050d708bf7bfd381c7`. Reviewed SDK commit: `3a96f4c3c2878401fdf4c371bfe3e509b0992af4`; confirm its PROTOCOL-PROVENANCE.json matches this source pin.

Read the SDK README, AGENTS.md, package.json and PROTOCOL-PROVENANCE.json. Match the reviewed canonical commit and deployed configuration. The provisional @arcdao/vrf-sdk 0.1.0-alpha.0 is private and release-blocked. Do not invent registry availability, deployment addresses or service readiness.

The current protocol commits signed API3 data before each 200-block epoch, then fixes the epoch ID/hash in every request's VRF input. Per-game fulfillment submits only the real proof. Missing current commitment rejects requests without retaining their fee.

Use Node >=22.13 and repository npm ci/test. The smoke builds, packs and installs an actual tarball; use its reported filename for local consumer installation. For library-specific setup use current official docs or Context7.

Public root exports include mapping, encodeEvidencePacket/decodeEvidencePacket, replayCoordinator and epoch helpers. The /epoch subpath exposes epoch operations. The /abi subpath exports coordinatorAbi and epochEntropyAbi, also available as ArcVRFCoordinator.json and EpochEntropy.json. Read installed declarations for exact inputs.

Proof evidence is 416 bytes. Epoch evidence encodes canonical query and attestation. Neither has a version prefix; trusted emitter/event determines the decoder. Complete replay requires original epoch evidence and independently trusted registry/request context. Mapping alone does not verify origin.

Solidity imports use @arcdao/vrf-sdk/contracts/ with compiler 0.8.28. Start from DiceConsumer.sol, pin configuration and obtain keeper allowlist onboarding before live use.

Build from the reviewed protocol snapshot. Update source and provenance together; do not hand-edit generated dist/ABI or fork cryptography. Preserve notices/licenses and exclude all fixtures, proof generation, keeper code and secrets from the tarball.

The real-tarball smoke checks JS, strict TypeScript, ABI parity, public fixture replay, a browser-target bundle executed under Node and Solidity compilation. It requires registry access. Passing does not establish live browser behavior, crypto safety, real source admission or service readiness. Preserve private/publish guards absent concrete release authorization.
