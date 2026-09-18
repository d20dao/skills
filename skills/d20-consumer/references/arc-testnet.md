# Arc Testnet deployment reference

Chain ID: **5042002** (development). Snapshot copied from the deployment manifest on **2026-09-18**.

Use the coordinator proxy for requests. Implementation addresses are reference identities, not consumer entry points. Both Arc chains run the same implementation code.

| Contract | Proxy | Implementation |
| --- | --- | --- |
| Coordinator | `0xd20DA0FF9087d053f0291524Eac12abA1ADBd945` | `0xd20da0DADa4352A1a9722be43a2D85923443458c` |
| Epoch registry | `0xD20Da00B47A7cD2211dC4683E306913b05903756` | `0xd20dA048C969e5aDcC703Dfdf8220cc9dCB2f865` |
| Restricted cost client | `0xD20da026090B8472579a2B93030F1fC4c94807F1` | `0xD20DA00A872acfDe3e4721Fc1051BD23CC84B66b` |

Proxy addresses did not change. The upgrade replaced coordinator implementation `0xD20da0c375cEfCdA65703699A4090237057e9b68` and registry implementation `0xD20dA0311C56f92d841d5c74F15ec691e0cfB960`: the registry gained the owner-managed recipe registry and backup committers, and the coordinator pays each request's keeper share to the authorized wallet that submitted its proof. The consumer ABI is unchanged, so existing integrations need no code change.

Epoch sources: the five-source catalog (Hyperliquid BTC day volume, dRPC Ethereum block hash, TickerLayer BTCUSD, Nodary ETH/USD, dRPC Base block hash) is already in force. Earlier epochs replay with the catalog they committed under.

Runtime hashes and machine-readable values are in [arc-testnet.json](arc-testnet.json); the [current public manifest](https://d20dao.org/deployments/arc-testnet.json) keeps upgrade receipts and previous implementation identities for old proofs.

Read `pricing()` and `keeperFeeBps()` at the coordinator; native test USDC uses 18 decimals. Any consumer contract can request service by paying its quoted fee (see [methods](methods.md)); no allowlist is required. Deployment and funding of your own application follow the user's instructions.

Contract source commit recorded by the manifest: `de5f82eb9fc749c80e83270f57cde9908ddcf1f3`. Match the installed SDK's `PROTOCOL-PROVENANCE.json` to the deployment in use. A stable proxy address does not establish unchanged implementation behavior.

Request replay URL: `https://d20dao.org/explorer/request/5042002/0xd20DA0FF9087d053f0291524Eac12abA1ADBd945/<requestId>`.
