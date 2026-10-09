# d20dao integration guide for agents

These skills support readers and assistants using the public d20dao randomness service. They cover Arc and Robinhood Chain and grant no access to an operator, a wallet, a bot or a deployed contract. Choose the relevant self-contained skill and check the installed `@d20dao/vrf-sdk` declarations and public provenance.

The main task is adding randomness to an existing application contract. Begin with [d20-consumer](skills/d20-consumer/SKILL.md), its deployment references ([Arc Mainnet](skills/d20-consumer/references/arc-mainnet.md), [Robinhood Chain](skills/d20-consumer/references/robinhood.md)), [method table](skills/d20-consumer/references/methods.md) and [consumer example](skills/d20-consumer/assets/RandomnessConsumer.sol). Preserve the application's existing authorization, storage, initialization and payment rules; the constructor-based example is not a drop-in initializer for an upgradeable application.

- **d20-consumer** — D20VRFConsumer/ID20VRF integration, fee quoting, refund credit, callback authentication and deterministic mappings.
- **d20-agent-api** — buying results over HTTP with x402 (0.05 USDC per call through Circle Gateway) when the user needs randomness, not a contract integration. Arc only: Robinhood Chain has no x402 API.
- **d20-lifecycle** — pending publication, timely acceptance, batch fulfillment events, same-result callback retry and fixed-recipient refunds.
- **d20-verification** — trusted proxy, epoch and request evidence, per-epoch recipe catalogs and public replay on Arc; round replay on Robinhood Chain.
- **d20-sdk** — package exports, ABIs, Solidity imports and off-chain fee quoting.
- **d20-keeper** — protocol rules for an authorized keeper operator. Use it only when the user is actually operating a keeper.

**Fees.** `max(minFee, feeMultiplier × baseFee × (fulfillGasOverhead + callbackGasLimit))` in the native token (USDC on Arc, ETH on Robinhood Chain; 18 decimals), read live with `pricing()`. Requests must come from a contract, not a wallet. A contract pays `quoteFee(callbackGasLimit)` in the requesting transaction, which is exact; an off-chain sender quotes `quoteFeeAt(callbackGasLimit, latestBlock.baseFeePerGas)` plus a buffer, because `eth_call` commonly reports a zero base fee and `quoteFee` then collapses to `minFee`. Underpayment reverts with `IncorrectFee(expected, actual)`; excess is refund credit of the refund address, withdrawable with `withdrawRefundCredit`. Each request settles from the fee it escrowed (`requestFeePaid`), and an expiry refund pays `feePaid × refundBps / 10000` at the ratio snapshotted at request time (`requestRefundBps`, default 100%, never below 50% and changeable only for future requests).

**Results and recovery.** Take `requestId` from `RandomnessRequested`; poll the latest block, then `getRequest(requestId)` on Arc or `getRoundRequest(requestId)` on Robinhood Chain, or use the SDK's `readRequest`. `fulfilled` is final; not fulfilled after the 60-second deadline means expired and refundable, and nothing is ever fulfilled late. Never reroll — `retryCallback` redelivers the same word. `refundRequest`, `retryCallback` and `retryRefundCallback` revert with `InsufficientCallbackGas` rather than forward less gas: on Arc use transaction gas limits of 400,000, `gasLimit + 250,000` and `gasLimit + 150,000`; on Robinhood Chain use `eth_estimateGas` with a margin.

**Epochs and sources (Arc).** Epochs last 200 blocks. Each uses the catalog in force for it — 1 to 10 registered recipes with their signers — and accepts only a record its recipe's data template matches exactly. Since Arc Testnet epoch 11319 and Arc Mainnet epoch 12448 the catalog is one drand evmnet beacon, so each epoch commits one drand round, checked on chain by a stateless verifier, with no fallback source. Earlier epochs came from signed API records, and SDK replay still verifies them. Recipes are added by owner transaction to the on-chain, append-only registry, and a scheduled catalog applies only to epochs at least two ahead. Publication is on demand: randomness binds `max(requestBlock, commitBlock + 1)`, the committed record (a signed record, or a drand round at its scheduled time) may be at most 240 seconds old at publication, and a saved signed record is never refreshed. `fulfillRandomnessBatch` serves up to 16 requests per transaction with unchanged per-request events.

**Submission and the keeper share.** Proof submission is permissionless. The keeper share is paid to the submitting wallet when the registry authorizes it (`isAuthorizedCommitter`: the committer or an allowed backup committer) and to `committer()` otherwise, so a backup keeper can take over automatically with no consumer-visible change.

**Trust.** Both service endpoints are initialized UUPS proxies with two-step owners; `renounceOwnership` is disabled and upgrade authority is a trust assumption. Stable addresses do not identify implementation code, so verify both implementation histories. Upgrades keep the consumer ABI compatible and keep requests that were open at upgrade time serviceable. Administrable without an upgrade: the committer and backup committers, registered recipes and beacons, epoch catalogs, the payout recipient, keeper share, bounded pricing and the refund ratio. There is no request-input or VRF-key setter.

Deployment manifests are `https://d20dao.org/deployments/arc-mainnet.json` (chain 5042, live) and `https://d20dao.org/deployments/arc-testnet.json` (chain 5042002, development); configure the chain id explicitly, since there is no assumed default network. Robinhood Chain manifests: `https://github.com/d20dao/keeper/blob/main/deployments/robinhood-mainnet.json` (chain 4663, live) and `.../robinhood-testnet.json` (chain 46630). Install `@d20dao/vrf-sdk` 0.6.0 or newer; 0.4.0 cannot replay a drand epoch. Every coordinator and registry function, event and error, with the response to each error, is in the [SDK API reference](https://github.com/d20dao/d20-sdk/blob/main/API.md).

## Robinhood Chain

When a request is made, the contract binds it to a future round of drand's evmnet beacon: the first round scheduled at least 3 seconds after the request. Until that round is published, nobody can know or choose the result: not the requester, the operator, the sequencer or drand. The keeper then delivers the operator's VRF output over the request's fixed fields and the round's randomness. The contract verifies the round's BLS signature and the VRF proof before accepting it, and anyone can replay the result from public chain data.

**Assumptions.**
- **Shared with every Robinhood Chain application:** D20DAO relies on the chain's sequencer for ordering and confirmation.
- **Shared with other verifiable-randomness services:** results assume the operator's VRF key and the sequencer act independently.
- **drand:** evmnet is run by the League of Entropy, and its signatures rest on a threshold of independent operators.

**Finality.** Results are confirmed by the sequencer within seconds. Settlement on Ethereum follows in about 15–20 minutes.

**Delivery and refunds.** A typical delivery takes 5–8 seconds. If a request is not fulfilled within 60 seconds, its fee can be refunded to the request's refund address. As with any randomness service, design applications so that a party cannot cancel a request and retry for a better outcome.

**Upgrades.** The coordinator is upgradeable (UUPS). On mainnet the owner is currently the deployer account and is moving to a 2-of-2 Safe; the testnet stays with the deployer account. Beacon changes are scheduled on chain at least 10 minutes ahead.

The coordinator `D20VRFCoordinatorRobinhood` implements `ID20VRF` like Arc's; addresses, fees, reading and recovery differences are in [the deployment reference](skills/d20-consumer/references/robinhood.md). Replay with `@d20dao/vrf-sdk/round`: `readRoundRequestEvidence`, `readRoundBeaconLogs`, `roundScheduleFromEvents` and `replayRoundRequest`.

Developer note: send requests as normal transactions through the sequencer. A request forced through Ethereum's delayed inbox takes an earlier timestamp and may bind a round that is already public.

Consumer integration authorizes no upgrade, key access, funding or publishing. Respect the user's requested task rather than treating an integration prompt as operator authorization.
