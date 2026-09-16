# Arc Testnet deployment reference

Chain ID: **5042002**. Snapshot copied from the deployment manifest on **2026-09-16**.

Use the coordinator proxy for requests. Implementation addresses are reference identities, not consumer entry points.

| Contract | Proxy | Implementation |
| --- | --- | --- |
| Coordinator | `0xd20Da07c98F6A64CA20084fD5905abF19F5D84ac` | `0xD20da02c34489c8eC68ca1D4FC8fe5ea79ADD223` |
| Epoch registry | `0xd20Da08e4E903cBD2F99fD5F4Be021FC1a9fA496` | `0xD20da079ccEf2CE273b8f2356abccE8c97c73F17` |
| Restricted pilot consumer | `0xd20dA0e6d4405B40040d458F8010191712E2Cb42` | `0xD20DA00A872acfDe3e4721Fc1051BD23CC84B66b` |

Runtime hashes and machine-readable values are in [arc-testnet.json](arc-testnet.json). The [current public manifest](https://d20dao.org/deployments/arc-testnet.json) retains upgrade receipts and previous implementation identities for old proofs.

Read `pricing()` and `keeperFeeBps()` at the selected coordinator; native test USDC uses 18 decimals. Any consumer contract can request service by paying its quoted fee (see [methods](methods.md)); no allowlist is required. Deployment and funding of your own application follow the user's instructions.

Contract source commit recorded by the manifest for this snapshot: `200c5ad4976f487db60561171d7ed5dd63eaa94c`. Match the installed SDK's `PROTOCOL-PROVENANCE.json` to the deployment in use. A stable proxy address does not establish unchanged implementation behavior.

Request replay URL: `https://d20dao.org/explorer/request/5042002/0xd20Da07c98F6A64CA20084fD5905abF19F5D84ac/<requestId>`.
