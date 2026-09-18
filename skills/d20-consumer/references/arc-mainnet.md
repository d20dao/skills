# Arc Mainnet deployment reference

Chain ID: **5042** (live service). Snapshot copied from the deployment manifest on **2026-09-18**.

Use the coordinator proxy for requests. Implementation addresses are reference identities, not consumer entry points. Both Arc chains run the same implementation code.

| Contract | Proxy | Implementation |
| --- | --- | --- |
| Coordinator | `0xd20da057469C45928912d983F45790C41e290571` | `0xd20da0DADa4352A1a9722be43a2D85923443458c` |
| Epoch registry | `0xd20Da048C1A68fa3Bc0B5f5Bc454D1530062C82D` | `0xd20dA048C969e5aDcC703Dfdf8220cc9dCB2f865` |
| Restricted cost client | `0xD20da0048aED2BBb9f0e7078Bc452815D626D29d` | `0xD20DA00A872acfDe3e4721Fc1051BD23CC84B66b` |

Proxy addresses did not change. The upgrade replaced coordinator implementation `0xD20da0c375cEfCdA65703699A4090237057e9b68` and registry implementation `0xD20Da0cf7Ddc6123f9A87c0C210F8ECB934CA7D5`: the registry gained the owner-managed recipe registry and backup committers, and the coordinator pays each request's keeper share to the authorized wallet that submitted its proof. The consumer ABI is unchanged, so existing integrations need no code change.

Epoch sources: the five-source catalog (Hyperliquid BTC day volume, dRPC Ethereum block hash, TickerLayer BTCUSD, Nodary ETH/USD, dRPC Base block hash) takes effect at epoch 848 on 2026-09-18. Earlier epochs replay with the initial four-source catalog they committed under.

Owner and fee recipient: the DAO treasury Safe `0xB57f656149749eff6b496dF090336491f977E744`. Runtime hashes and machine-readable values are in [arc-mainnet.json](arc-mainnet.json); the [current public manifest](https://d20dao.org/deployments/arc-mainnet.json) keeps deployment receipts and the full upgrade history.

Read `pricing()` and `keeperFeeBps()` at the coordinator; native USDC uses 18 decimals. Any consumer contract can request service by paying its quoted fee (see [methods](methods.md)); no allowlist is required. Mainnet requests spend real USDC: test on Arc Testnet first and follow the user's instructions for deployment and funding.

Contract source commit recorded by the manifest: `de5f82eb9fc749c80e83270f57cde9908ddcf1f3`. A stable proxy address does not establish unchanged implementation behavior.

Request replay URL: `https://d20dao.org/explorer/request/5042/0xd20da057469C45928912d983F45790C41e290571/<requestId>`.
