# D20DAO integration skills

Help coding agents add verifiable randomness to existing application contracts with `@d20dao/vrf-sdk`. Start with **d20-consumer** for authenticated callbacks, same-transaction fee quotes, refund credit and raw or mapped results. No keeper setup is required to integrate an application, and no registration or allowlist is required to request service.

## Quick start

```sh
npm install @d20dao/vrf-sdk
```

Use `@d20dao/vrf-sdk` 0.4.0 or newer, Node 22.13+ and Solidity 0.8.28 (EVM version `cancun`). Copy the relevant skill folder into your agent's skill directory, keeping its references and assets together, or point the agent directly at its SKILL.md.

- [Primary consumer skill](skills/d20-consumer/SKILL.md)
- [Compile-ready consumer](skills/d20-consumer/assets/RandomnessConsumer.sol): raw, mapped and shuffle requests paying the same-transaction quote, authenticated delivery, refund notification and refund-credit withdrawal
- [Methods and result semantics](skills/d20-consumer/references/methods.md): fee quoting, dice, coin, range, choose-one/many and shuffle, reading results, recovery gas and front ends
- [JavaScript examples](skills/d20-consumer/assets/mappings.mjs): mapping specs and deterministic outputs
- [SDK API reference](https://github.com/d20dao/d20-sdk/blob/main/API.md): every coordinator and registry function, event and error, with what to do on each error
- [d20dao/randomizer-demo](https://github.com/d20dao/randomizer-demo): a complete dapp built from these guides

## Contracts

Connect applications to the **coordinator proxy**. Proxy addresses are stable across upgrades; implementation addresses and runtime hashes are in the deployment references.

| Contract | Arc Mainnet — chain 5042 (live) | Arc Testnet — chain 5042002 (development) |
| --- | --- | --- |
| D20VRFCoordinator | `0xd20da057469C45928912d983F45790C41e290571` | `0xd20DA0FF9087d053f0291524Eac12abA1ADBd945` |
| EpochEntropy | `0xd20Da048C1A68fa3Bc0B5f5Bc454D1530062C82D` | `0xD20Da00B47A7cD2211dC4683E306913b05903756` |
| Restricted cost client | `0xD20da0048aED2BBb9f0e7078Bc452815D626D29d` | `0xD20da026090B8472579a2B93030F1fC4c94807F1` |

Deployment references, snapshot 18 September 2026: [Arc Mainnet](skills/d20-consumer/references/arc-mainnet.md), [Arc Testnet](skills/d20-consumer/references/arc-testnet.md). Both chains run the same upgraded implementations, which added the on-chain recipe registry and pay each request's keeper share to the authorized wallet that submitted its proof; the consumer ABI did not change. The current public manifests are [arc-mainnet.json](https://d20dao.org/deployments/arc-mainnet.json) and [arc-testnet.json](https://d20dao.org/deployments/arc-testnet.json). The cost client is restricted test tooling, not a shared endpoint for applications.

## Fees

Each request pays `fee = max(minFee, feeMultiplier × baseFee × (fulfillGasOverhead + callbackGasLimit))` in native USDC (18 decimals); `pricing()` returns the live `(minFee, feeMultiplier, fulfillGasOverhead)`, which the owner can change within fixed bounds (`PricingChanged`). Transaction gas is separate.

- A contract pays `quoteFee(callbackGasLimit)` in the requesting transaction; that quote is exact. Requests must come from a contract, not a wallet.
- An off-chain sender quotes `quoteFeeAt(callbackGasLimit, latestBlock.baseFeePerGas)` plus a buffer for base-fee movement, because `eth_call` commonly reports a base fee of 0 and `quoteFee` then returns only `minFee`. The SDK helper `quoteRequestFee(provider, coordinator, callbackGasLimit, { bufferBps })` does this.
- `msg.value` below the transaction's own quote reverts with `IncorrectFee(expected, actual)`. Any excess is credited to the refund address (`FeeOverpaymentCredited`) and is withdrawable by that address with `withdrawRefundCredit(recipient)`; it is never revenue, and nobody sweeps it for you.

Both Arc deployments were initialized with a 0.08 USDC minimum fee, multiplier 5 and overhead 300,000 gas. Those are initialization values; `pricing()` returns the live ones. With them and `callbackGasLimit` 100,000: at a 20 gwei base fee the dynamic part is 5 × 20 gwei × 400,000 = 0.04 USDC, so the request pays the 0.08 minimum; at 200 gwei it pays 0.4 USDC.

## Results and recovery

- Take `requestId` from the coordinator's `RandomnessRequested` log. Poll by reading the latest block and then `getRequest(requestId)`: `fulfilled` means the word is final (`getMappedResult`); not fulfilled with a block timestamp after `deadline`, 60 seconds after the request, means expired and refundable. Nothing is fulfilled late, and a served request is never rerolled — `retryCallback` redelivers the same word.
- A single request is normally fulfilled within a few seconds. Measured timings are not an SLA: wait up to the deadline and handle expiry.
- `refundRequest`, `retryCallback` and `retryRefundCallback` revert with `InsufficientCallbackGas` rather than forward less gas. Use transaction gas limits of 400,000 for `refundRequest`, `gasLimit + 250,000` for `retryCallback(id, gasLimit)` and `gasLimit + 150,000` for `retryRefundCallback(id, gasLimit)`.
- Front ends add the network with `wallet_addEthereumChain`: chain ID `0x13b2` for Arc Mainnet or `0x4cef52` for Arc Testnet, native currency USDC with 18 decimals. Public Arc RPC endpoints are blocked by common browser ad-block lists, and some reject large JSON-RPC batches: read through the connected wallet's provider or a same-origin read-only relay, and lower ethers' `batchMaxCount`. Details: [methods](skills/d20-consumer/references/methods.md#front-ends).

## Epoch sources

The epoch source catalog is an on-chain, owner-managed recipe registry. Five sources are active on both chains — Hyperliquid BTC day volume, dRPC Ethereum block hash, TickerLayer BTCUSD, Nodary ETH/USD and dRPC Base block hash — in force on Arc Testnet and from epoch 848 on Arc Mainnet. Recipes are append-only and never edited, so an older epoch always replays with the recipe it used. Adding a source is an owner transaction, not a contract upgrade, and applications see no API change.

## Give this task to your agent

```text
Use the d20-consumer skill from https://github.com/d20dao/skills to add
D20DAO randomness to my existing contract. Inspect its architecture and
preserve authorization, storage, initialization and application payments.
Install @d20dao/vrf-sdk 0.4.0 or newer, read its AGENTS.md and provenance,
and select the deployment for my chain. Pay quoteFee(callbackGasLimit) in
the requesting transaction, quote off-chain with quoteFeeAt plus a buffer,
handle refund credit, and implement request-to-operation association,
small authenticated callbacks, same-word retries and refunds. Wait for
fulfillment up to the request deadline, treat an unfulfilled request as
expired, and give refund and retry calls enough gas. For choice or
shuffle, commit to the ordered item list before requesting. Compile and
test the integration; report changes and results. Follow my instructions
for deployment and funded transactions.
```

## Choose a skill

| Skill | Use |
| --- | --- |
| d20-consumer | Integrate authenticated consumers, fee quoting and deterministic mappings |
| d20-lifecycle | Diagnose publication, acceptance, callbacks, refunds and refund credit |
| d20-verification | Replay public epoch/VRF evidence with trusted context |
| d20-sdk | Install and use the published SDK |
| d20-keeper | Advanced: protocol rules for operating your own keeper |

Each skill supports explicit invocation and normal automatic discovery. Canonical public sources are the [SDK](https://github.com/d20dao/d20-sdk) and its [protocol/](https://github.com/d20dao/d20-sdk/tree/main/protocol) folder, which holds the protocol contracts and replay code copied from the commit named in its `PROTOCOL-PROVENANCE.json`. Installing a skill authorizes no spending, deployment or publishing; signer and operator data are outside these guides.

Both service contracts use initialized UUPS proxies with two-step ownership; `renounceOwnership` is disabled and upgrade authority is a trust assumption. Verify both implementation histories and runtime pins when you integrate, and again whenever a manifest records an upgrade. Upgrades keep the consumer ABI compatible and keep open requests serviceable.

These guides follow public protocol commit `de5f82eb9fc749c80e83270f57cde9908ddcf1f3`, the source the live implementations were deployed from. `npm run check` compares the deployment snapshots in `skills/d20-consumer/references/` with the installed package, so update them together with an SDK release.

## Getting started with an agent

Start with the [Getting started](https://d20dao.org/docs/getting-started) guide and its Copy prompt action. `https://d20dao.org/llms.txt` indexes the public guides, `https://d20dao.org/llms-full.txt` holds the complete text, `https://d20dao.org/agents.md` gives integration instructions, and each guide exposes `https://d20dao.org/prompts/<guide-slug>.txt`. Use `d20-consumer` for an application, then `d20-lifecycle` and `d20-verification` for settlement and evidence. Other public entry points: [SDK on npm](https://www.npmjs.com/package/@d20dao/vrf-sdk) and the [Explorer](https://d20dao.org/explorer).

The included consumer is constructor-based. For upgradeable applications, retain the existing initializer and storage layout and adapt callback authentication deliberately. Choice and shuffle outputs are indices into the original committed list. Application eligibility, assets and settlement belong to the application.

## Validate the examples

```sh
npm ci
npm run check
```

This compiles the consumer against the installed SDK, checks that every coordinator function the template declares exists in `coordinatorAbi`, and validates the mapping examples and both deployment snapshots. It sends no chain transaction and needs no operator credentials.
