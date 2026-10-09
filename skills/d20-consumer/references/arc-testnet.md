# Arc Testnet deployment reference

Chain ID: **5042002** (development). Snapshot copied from the deployment manifest on **2026-10-02**.

Use the coordinator proxy for requests. Implementation addresses are reference identities, not consumer entry points. Both Arc chains run the same implementation code.

| Contract | Proxy | Implementation |
| --- | --- | --- |
| Coordinator | `0xd20DA0FF9087d053f0291524Eac12abA1ADBd945` | `0xD20da000125643B4db5A6A36A3b853c17745DF44` |
| Epoch registry | `0xD20Da00B47A7cD2211dC4683E306913b05903756` | `0xD20dA0853a6f894c0cdc9018fD4F8F67Eac15704` |
| Restricted cost client | `0xD20da026090B8472579a2B93030F1fC4c94807F1` | `0xD20DA00A872acfDe3e4721Fc1051BD23CC84B66b` |
| Beacon verifier | none: stateless, not behind a proxy | `0xd20dA01Aa16AeD6b77Cd8DDb869151802599100a` |

Proxy addresses did not change. The 2026-09-30 upgrade (block 64712965) replaced registry implementation `0xd20dA048C969e5aDcC703Dfdf8220cc9dCB2f865`: the registry gained beacon recipes (`registerBeacon`, `beaconOf`, `slotSigner`, `verifyBeacon`), and the beacon verifier checks each drand round's BLS signature on chain. The coordinator implementation has been unchanged since the 2026-09-22 upgrade, which replaced `0xd20da0DADa4352A1a9722be43a2D85923443458c`: `fulfillRandomnessBatch` budgets every served member's callback gas before revealing any result, and `setPricing` rejects a zero minimum fee with a zero multiplier. The 2026-09-17 upgrade replaced coordinator implementation `0xD20da0c375cEfCdA65703699A4090237057e9b68` and registry implementation `0xD20dA0311C56f92d841d5c74F15ec691e0cfB960`: the registry gained the owner-managed recipe registry and backup committers, and the coordinator pays each request's keeper share to the authorized wallet that submitted its proof. The consumer ABI is unchanged, so existing integrations need no code change.

Epoch sources: from epoch 11319 (2026-09-30) the catalog is the drand evmnet beacon alone (recipe 11): each epoch commits one drand round, with no fallback source. Earlier epochs came from signed API records, and SDK replay still verifies them. Replaying a beacon epoch needs `@d20dao/vrf-sdk` 0.5.0 or later.

Runtime hashes and machine-readable values are in [arc-testnet.json](arc-testnet.json); the [current public manifest](https://d20dao.org/deployments/arc-testnet.json) keeps upgrade receipts and previous implementation identities for old proofs.

Read `pricing()` and `keeperFeeBps()` at the coordinator; native test USDC uses 18 decimals. Any consumer contract can request service by paying its quoted fee (see [methods](methods.md)); no allowlist is required. Deployment and funding of your own application follow the user's instructions.

Contract source commits recorded by the manifest: coordinator `f38aaf81c9dc96f19768c7a99541258796c783b3`, registry `b69dbf3862c7114e76ba165e2c7dd306556d4690`. `@d20dao/vrf-sdk@0.6.2` copies protocol source `b733d8d144649bd92a16158fe0b5d48eb6b27b1f`, which holds the same coordinator and registry source. Match the installed SDK's `PROTOCOL-PROVENANCE.json` to the deployment in use. A stable proxy address does not establish unchanged implementation behavior.

Request replay URL: `https://d20dao.org/explorer/request/5042002/0xd20DA0FF9087d053f0291524Eac12abA1ADBd945/<requestId>`.
