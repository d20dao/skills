# Arc Testnet deployment reference

Chain ID: **5042002**. Snapshot copied from the deployment manifest on **2026-09-16**.

Use the coordinator proxy for requests. Implementation addresses are reference identities, not consumer entry points.

| Contract | Proxy | Implementation |
| --- | --- | --- |
| Coordinator | `0xd20DA0FF9087d053f0291524Eac12abA1ADBd945` | `0xD20da0c375cEfCdA65703699A4090237057e9b68` |
| Epoch registry | `0xD20Da00B47A7cD2211dC4683E306913b05903756` | `0xD20Da0cf7Ddc6123f9A87c0C210F8ECB934CA7D5` |
| Restricted cost client | `0xD20da026090B8472579a2B93030F1fC4c94807F1` | `0xD20DA00A872acfDe3e4721Fc1051BD23CC84B66b` |

Runtime hashes and machine-readable values are in [arc-testnet.json](arc-testnet.json). The [current public manifest](https://d20dao.org/deployments/arc-testnet.json) retains upgrade receipts and previous implementation identities for old proofs.

Read `pricing()` and `keeperFeeBps()` at the selected coordinator; native test USDC uses 18 decimals. Any consumer contract can request service by paying its quoted fee (see [methods](methods.md)); no allowlist is required. Deployment and funding of your own application follow the user's instructions.

Contract source commit recorded by the manifest for this snapshot: `640b60cb992a7e3add1efe8e7b392341732ea004`. Match the installed SDK's `PROTOCOL-PROVENANCE.json` to the deployment in use. A stable proxy address does not establish unchanged implementation behavior.

Request replay URL: `https://d20dao.org/explorer/request/5042002/0xd20DA0FF9087d053f0291524Eac12abA1ADBd945/<requestId>`.
