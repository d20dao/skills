---
name: d20-sdk
description: Build and consume the d20dao randomness SDK for on-demand epoch evidence, VRF replay, mapping, ABI and Solidity imports.
---

Public protocol reference: `c10699c490c0dd6c7b5ccba7e704cb01fa8c86fa`. Match installed SDK provenance and deployed implementation history before use.

Read README, AGENTS.md, exported declarations and PROTOCOL-PROVENANCE.json. Match the reviewed canonical commit and deployed proxy implementations. Current @d20dao/vrf-sdk is private and guarded; no registry publication or service availability is implied.

The keeper prepares local snapshots for 200-block epochs. Idle work causes no publication transaction; unused snapshots can remain for 50 epochs. Live allowlisted demand escrows the exact fee, triggers saved-packet publication and resolves targetBlock=max(requestBlock,commitBlock+1). The original 60-second deadline remains fixed.

Use Node >=22.13 and repository npm ci/test. Install the local tarball reported by npm pack. For library-specific syntax use current official docs or Context7. Publishing credentials are unnecessary for public dependency installation and must not be read or used by ordinary package checks.

Root exports include mapping, encodeEvidencePacket/decodeEvidencePacket, replayCoordinator and epoch helpers. /epoch exposes epoch operations. /abi exports coordinatorAbi and epochEntropyAbi; JSON names are D20VRFCoordinator.json and EpochEntropy.json. Registry initialize takes address[4]; implementation constructors are empty and locked. EpochSigners is a readonly four-address tuple for Hyperliquid, ANU and the two TickerLayer recipe slots.

RequestContext binds requestBlock and targetBlock. Replay configuration.feeRecipient is the initialized initialFeeRecipient, not the mutable payout address. Use effective proxy addresses and independently trusted implementation history. Proof evidence remains 416 bytes and fulfillment calldata 452 bytes; epoch evidence carries the full signed packet. Decoding/mapping are not proof verification.

Consumer imports use @d20dao/vrf-sdk/contracts/D20VRFConsumer.sol, interfaces/ID20VRF.sol and libraries/D20VRFRequests.sol with compiler 0.8.28. DiceConsumer.sol is one example, not the product scope. Obtain service onboarding before live requests.

Build from exact reviewed protocol Git blobs, preserving vendor/licenses and hashes. The UUPS ABI build uses OpenZeppelin contracts and contracts-upgradeable 5.6.1. Do not hand-edit generated output or add operators, keys, fixtures or provers to the tarball. Distinguish explicit CI fixtures from actual API3 signatures; a Node-executed browser-target bundle is not a live browser test. Successful packaging does not approve release, upgrades or deployment.
