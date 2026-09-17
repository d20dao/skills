# Arc Mainnet deployment reference

Chain ID: **5042** (live service). Snapshot copied from the deployment manifest on **2026-09-17**.

Use the coordinator proxy for requests. Implementation addresses are reference identities, not consumer entry points. Mainnet runs the same implementation code as Arc Testnet.

| Contract | Proxy | Implementation |
| --- | --- | --- |
| Coordinator | `0xd20da057469C45928912d983F45790C41e290571` | `0xD20da0c375cEfCdA65703699A4090237057e9b68` |
| Epoch registry | `0xd20Da048C1A68fa3Bc0B5f5Bc454D1530062C82D` | `0xD20Da0cf7Ddc6123f9A87c0C210F8ECB934CA7D5` |
| Restricted cost client | `0xD20da0048aED2BBb9f0e7078Bc452815D626D29d` | `0xD20DA00A872acfDe3e4721Fc1051BD23CC84B66b` |

Owner and fee recipient: the DAO treasury Safe `0xB57f656149749eff6b496dF090336491f977E744`. Runtime hashes and machine-readable values are in [arc-mainnet.json](arc-mainnet.json). The [current public manifest](https://d20dao.org/deployments/arc-mainnet.json) retains deployment receipts and future upgrade history.

Read `pricing()` and `keeperFeeBps()` at the coordinator; native USDC uses 18 decimals. Any consumer contract can request service by paying its quoted fee (see [methods](methods.md)); no allowlist is required. Mainnet requests spend real USDC: test on Arc Testnet first and follow the user's instructions for deployment and funding.

Contract source commit recorded by the manifest: `640b60cb992a7e3add1efe8e7b392341732ea004`. A stable proxy address does not establish unchanged implementation behavior.

Request replay URL: `https://d20dao.org/explorer/request/5042/0xd20da057469C45928912d983F45790C41e290571/<requestId>`.
