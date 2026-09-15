---
name: d20-sdk
description: Build, install and use the local D20 ArcDao VRF alpha SDK for public replay, mapping, ABI and Solidity consumer imports.
---

Start with the target SDK README, AGENTS.md, package.json and provenance manifests. Baseline inspected: SDK `29d38f8f0584bbd5e57503dcd118dfa9a2790a7e`. Current `@arcdao/vrf-sdk` `0.1.0-alpha.0` is provisional and private, with publishing blocked. Preserve current identifiers; do not suggest a published `npm install @arcdao/vrf-sdk` until registry ownership and release availability are established.

For library/tool-specific setup syntax use available current official documentation or Context7; canonical repository scripts remain authoritative for this package.

## Local package workflow

In the SDK checkout, current Node requirement is >=22.13. Run `npm ci`, `npm run build`, `npm pack --dry-run`, `npm pack`, and `npm test` as appropriate to the requested build/package validation. Install the produced local tarball into the consumer project. Derive its filename from actual pack output rather than guessing after a version change.

Public ESM/declaration exports currently include `builtins`, `hashMapping`, `mapRandomness`, `decodeEvidencePacket`, `replayCoordinator`, `snapshotConfigurationHash` and `selectSnapshot` at the package root, and `coordinatorAbi` plus `snapshotAbi` at `@arcdao/vrf-sdk/abi`. JSON ABIs are `@arcdao/vrf-sdk/abi/ArcVRFCoordinator.json` and `@arcdao/vrf-sdk/abi/EntropySnapshots.json`. Read the exported TypeScript declarations for exact parameters and confirm the installed snapshot includes these additions.

V2 replay passes `snapshotCatalog: {records, committedAt}` from the independently pinned original catalog. `sourceSigners` remains required by the shared input type but is unused in V2; pass `[]`. V1 omits the catalog and retains its signer/mask and freshness rules. Snapshot query bytes remain opaque for cryptographic replay; `snapshotApiRequest` is optional display conversion. Preserve recipe-version routing and old catalog access when integrating a new coordinator.

`builtins.d20()` supplies a mapping specification. `mapRandomness(word, mapping)` maps a word; it does not verify where that word came from. Only use independently verified accepted randomness for real outcomes. Public helpers do not supply RPC authenticity, transactions, source fetching, secret storage or an operating keeper.

Solidity consumer imports use `@arcdao/vrf-sdk/contracts/` and require compiler 0.8.28. Start from the shipped `examples/DiceConsumer.sol`. No deployment address is supplied. Check coordinator configuration and keeper consumer onboarding independently.

## Maintenance boundary

Builds read the repository's pinned `protocol/` snapshot without a sibling checkout. Update it from a reviewed canonical keeper revision, record import provenance, regenerate ABI/build output and rerun package tests. Never hand-edit generated `dist/`, ABI or silently fork cryptographic/replay behavior. Preserve licenses and third-party notices.

The smoke test packs and installs a real tarball in an OS-temp consumer, exercises exports, compiles TypeScript and Solidity, and bundles public browser exports. It requires npm registry access. Passing packaging tests does not establish production cryptographic safety or service readiness. Do not remove the private flag/publish guard as part of an ordinary SDK integration.
