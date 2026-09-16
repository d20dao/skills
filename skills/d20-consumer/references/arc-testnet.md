# Arc Testnet deployment reference

Chain ID: **5042002**. Snapshot copied from the deployment manifest on **2026-09-16**. SDK: `@d20dao/vrf-sdk@0.1.2`.

Use the coordinator proxy for requests. Implementation addresses are reference identities, not consumer entry points.

| Contract | Proxy | Implementation |
| --- | --- | --- |
| Coordinator | `0xd20dA0fDa41f84FCfA3423ae9F96B15910587B4E` | `0xd20Da05E6bb360edA09a6a360291AB6AD7AA0c58` |
| Epoch registry | `0xd20Da04e4D6d97a762A5b56993d723AA7663F204` | `0xd20Da0028F2B65d8c8C8512C7029EE02F94E8BF2` |
| Restricted pilot consumer | `0xD20Da0Ab4F5c258d579D18dC5a6e652266BB9a20` | `0xd20dA0Ec8d33fB04184CbC13942657bDC1f5Bbc0` |

Runtime hashes and machine-readable values are in [arc-testnet.json](arc-testnet.json). The [current public manifest](https://d20dao.org/deployments/arc-testnet.json) retains upgrade receipts and previous implementation identities for old proofs.

The coordinator refund-notification implementation was activated at block 62310349. Read the actual fee at the selected coordinator; the current pilot fee is 0.05 native test USDC, using 18 decimals. Any consumer contract can request service by paying the current exact fee; no allowlist is required. Deployment and funding of your own application follow the user's instructions.

Public protocol source: `d7e785dda57499220bd37d73bc6fad9226872dcc`. Match the installed SDK's `PROTOCOL-PROVENANCE.json`. A stable proxy address does not establish unchanged implementation behavior.

Request replay URL: `https://d20dao.org/explorer/request/5042002/0xd20dA0fDa41f84FCfA3423ae9F96B15910587B4E/<requestId>`.
