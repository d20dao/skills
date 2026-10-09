# Robinhood Chain deployment reference

Robinhood Chain (chain ID **4663**, live service) and Robinhood Chain Testnet (chain ID **46630**, development). Snapshot copied from the deployment manifests on **2026-10-09**: [robinhood-mainnet.json](https://github.com/d20dao/keeper/blob/main/deployments/robinhood-mainnet.json) and [robinhood-testnet.json](https://github.com/d20dao/keeper/blob/main/deployments/robinhood-testnet.json). Machine-readable identities: [robinhood-mainnet.json](robinhood-mainnet.json), [robinhood-testnet.json](robinhood-testnet.json). `D20_NETWORKS['robinhood-mainnet']` and `D20_NETWORKS['robinhood-testnet']` in `@d20dao/vrf-sdk` 0.6.0 carry the same values.

| Contract | Robinhood Chain | Robinhood Chain Testnet |
| --- | --- | --- |
| D20VRFCoordinatorRobinhood proxy (use this) | `0xEc8b95B168c87294c45727Bd2ac903d09316D132` | `0x2f26513DE4Ed388947f5d22FD395D5E06f472f05` |
| Coordinator implementation | `0xC8Cd79B9092AEA38f3434388F291eb861b148f45` | same |
| D20VRFProofVerifier (stateless) | `0x1EEBe8B8f7a6A18b966C3fBe3f644B8234f93709` | same |
| LinkedRandomnessMapping (library) | `0xA57093a645C1Aed12486da50AfA95F3284826849` | same |
| D20BeaconVerifier (stateless) | `0xd20dA01Aa16AeD6b77Cd8DDb869151802599100a` | same |

RPC: `https://rpc.mainnet.chain.robinhood.com` and `https://rpc.testnet.chain.robinhood.com`. Explorers: `https://robinhoodchain.blockscout.com` and `https://explorer.testnet.chain.robinhood.com`. Native currency: ETH, 18 decimals; `wallet_addEthereumChain` chain IDs `0x1237` (4663) and `0xb626` (46630). There is no epoch registry on Robinhood Chain and no x402 agent API.

## How a result is made

When a request is made, the contract binds it to a future round of drand's evmnet beacon: the first round scheduled at least 3 seconds after the request. Until that round is published, nobody can know or choose the result: not the requester, the operator, the sequencer or drand. The keeper then delivers the operator's VRF output over the request's fixed fields and the round's randomness. The contract verifies the round's BLS signature and the VRF proof before accepting it, and anyone can replay the result from public chain data.

**Assumptions.**
- **Shared with every Robinhood Chain application:** D20DAO relies on the chain's sequencer for ordering and confirmation.
- **Shared with other verifiable-randomness services:** results assume the operator's VRF key and the sequencer act independently.
- **drand:** evmnet is run by the League of Entropy, and its signatures rest on a threshold of independent operators.

**Finality.** Results are confirmed by the sequencer within seconds. Settlement on Ethereum follows in about 15–20 minutes.

**Delivery and refunds.** A typical delivery takes 5–8 seconds. If a request is not fulfilled within 60 seconds, its fee can be refunded to the request's refund address. As with any randomness service, design applications so that a party cannot cancel a request and retry for a better outcome.

**Upgrades.** The coordinator is upgradeable (UUPS). On mainnet the owner is currently the deployer account and is moving to a 2-of-2 Safe; the testnet stays with the deployer account. Beacon changes are scheduled on chain at least 10 minutes ahead.

## What is the same as Arc

The coordinator implements `ID20VRF` with the same selectors, so `D20VRFConsumer`, `D20VRFRequests`, the SDK examples and [RandomnessConsumer.sol](../assets/RandomnessConsumer.sol) work unchanged: `quoteFee` in the requesting transaction, `requestRandomness` and `requestMappedRandomness`, `getMappedResult`, `IncorrectFee`, overpayment credit and `withdrawRefundCredit`, the 30,000–1,000,000 callback gas range, the 60-second deadline, `refundRequest` at the snapshotted refund ratio (100% at deployment), `retryCallback`, `retryRefundCallback` and the `onRefund` notification.

## What differs

- **Fees in ETH.** `fee = max(minFee, feeMultiplier × baseFee × (fulfillGasOverhead + callbackGasLimit))`. Both deployments started with a 0.000025 ETH minimum fee, multiplier 2 and overhead 405,000 gas, with an 80% keeper share. At a 0.02 gwei base fee and 100,000 callback gas the dynamic part is 2 × 0.02 gwei × 505,000 = 0.0000202 ETH, so the minimum applies. Read `pricing()`; quote off-chain with `quoteRequestFee` (it calls `quoteFeeAt` with the latest header base fee plus a buffer). There is no `requestFee()` function.
- **Reading a request.** Use `getRoundRequest(requestId)` from `roundCoordinatorAbi`, not `getRequest`. Fields: `consumer`, `callbackGasLimit`, `requestBlock` (Robinhood Chain's own block number), `deadline`, `refundAddress`, `clientSeed`, `mappingHash`, `beaconId`, `round`, `roundRandomness` (zero until the round is verified on chain), `randomness`, `proofHash`, `transcriptHash`, `feePaid`, `fulfilled`, `delivered`, `refunded`. `readRequest(provider, D20_NETWORKS['robinhood-mainnet'], requestId)` reads it and returns `status` `pending`, `fulfilled`, `expired` or `refunded`.
- **Events.** A request also emits `RoundAssigned(requestId, beaconId, round)`; the first fulfilment of a round emits `RoundVerified(beaconId, round, randomness, signature)`.
- **Recovery gas.** The Arc gas figures for `refundRequest`, `retryCallback` and `retryRefundCallback` do not apply; use `eth_estimateGas` and add a margin.

Developer note: send requests as normal transactions through the sequencer. A request forced through Ethereum's delayed inbox takes an earlier timestamp and may bind a round that is already public.

Mainnet requests spend real ETH: test on Robinhood Chain Testnet first and follow the user's instructions for deployment and funding. A stable proxy address does not establish unchanged implementation behavior; compare the implementation behind the proxy with the manifest when you integrate and whenever the proxy emits `Upgraded`.
