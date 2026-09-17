# D20DAO integration skills

Help coding agents add verifiable randomness to existing application contracts with `@d20dao/vrf-sdk`. Start with **d20-consumer** for authenticated callbacks, same-transaction fee quotes, refund credit and raw or mapped results. No keeper setup is required to integrate an application.

## Quick start

```sh
npm install @d20dao/vrf-sdk
```

Use `@d20dao/vrf-sdk` 0.4.0 or newer, Node 22.13+ and Solidity 0.8.28 (EVM version `cancun`). Copy the relevant skill folder into your agent's supported skill directory, keeping its references and assets together, or point the agent directly at its SKILL.md.

- [Primary consumer skill](skills/d20-consumer/SKILL.md)
- [Compile-ready consumer](skills/d20-consumer/assets/RandomnessConsumer.sol): raw, mapped and shuffle requests paying the same-transaction quote, authenticated delivery, refund notification and refund-credit withdrawal
- [Methods and result semantics](skills/d20-consumer/references/methods.md): fee quoting, dice, coin, range, choose-one/many and shuffle, reading results, recovery gas and front ends
- [JavaScript examples](skills/d20-consumer/assets/mappings.mjs): mapping specs and deterministic outputs
- [SDK API reference](https://github.com/d20dao/d20-sdk/blob/main/API.md): every coordinator and registry function, event and error, with what to do on each error
- [d20dao/randomizer-demo](https://github.com/d20dao/randomizer-demo): a complete dapp built from these guides, running at https://mainnet-demo.d20dao.org

## Arc Mainnet contracts

Chain ID **5042** (live service). Connect applications to the **coordinator proxy**.

| Contract | Proxy address |
| --- | --- |
| D20VRFCoordinator | `0xd20da057469C45928912d983F45790C41e290571` |
| EpochEntropy | `0xd20Da048C1A68fa3Bc0B5f5Bc454D1530062C82D` |
| Restricted cost client | `0xD20da0048aED2BBb9f0e7078Bc452815D626D29d` |

The [mainnet deployment reference](skills/d20-consumer/references/arc-mainnet.md) includes implementation addresses and runtime hashes.

## Arc Testnet contracts

Chain ID **5042002** (development). Connect applications to the **coordinator proxy**.

| Contract | Proxy address |
| --- | --- |
| D20VRFCoordinator | `0xd20DA0FF9087d053f0291524Eac12abA1ADBd945` |
| EpochEntropy | `0xD20Da00B47A7cD2211dC4683E306913b05903756` |
| Restricted cost client | `0xD20da026090B8472579a2B93030F1fC4c94807F1` |

The [deployment reference](skills/d20-consumer/references/arc-testnet.md) includes implementation addresses and runtime hashes. Snapshot: 16 September 2026. Use the [current public manifest](https://d20dao.org/deployments/arc-testnet.json) for the selected deployment. The cost client is restricted test tooling, not a shared endpoint for applications.

## Fees

Each request pays `fee = max(minFee, feeMultiplier × baseFee × (fulfillGasOverhead + callbackGasLimit))` in native USDC (18 decimals); `pricing()` returns the live `(minFee, feeMultiplier, fulfillGasOverhead)`, which the owner can change within fixed bounds (`PricingChanged`). Transaction gas is separate. No consumer registration or allowlisting is needed.

- A contract pays `quoteFee(callbackGasLimit)` in the requesting transaction; that quote is exact.
- An off-chain sender quotes `quoteFeeAt(callbackGasLimit, latestBlock.baseFeePerGas)` plus a buffer for base-fee movement, because `eth_call` commonly reports a base fee of 0 and `quoteFee` then returns only `minFee`. The SDK helper `quoteRequestFee(provider, coordinator, callbackGasLimit, { bufferBps })` does this.
- `msg.value` below the transaction's own quote reverts with `IncorrectFee(expected, actual)`. Any excess is credited to the refund address as refund credit (`FeeOverpaymentCredited`), withdrawable by that address with `withdrawRefundCredit(recipient)`; it is never revenue.

Both Arc deployments were initialized with a 0.08 USDC minimum fee, multiplier 5 and overhead 300,000 gas. These are initialization values: `pricing()` returns the live values, which the owner may change within bounds. Example with the initialization values and `callbackGasLimit` 100,000: at a 20 gwei base fee the dynamic part is 5 × 20 gwei × 400,000 = 0.04 USDC, so the request pays the 0.08 minimum; at 200 gwei it pays 0.4 USDC.

## Results, recovery and front ends

- Take `requestId` from the coordinator's `RandomnessRequested` log. Poll by reading the latest block and then `getRequest(requestId)`: `fulfilled` means the word is final (`getMappedResult`); not fulfilled with a block timestamp after `deadline`, 60 seconds after the request, means expired and refundable. Nothing is fulfilled late.
- `refundRequest`, `retryCallback` and `retryRefundCallback` revert with `InsufficientCallbackGas` rather than forward less gas. Use transaction gas limits of 400,000 for `refundRequest`, `gasLimit + 250,000` for `retryCallback(id, gasLimit)` and `gasLimit + 150,000` for `retryRefundCallback(id, gasLimit)`.
- Wallets add the network with `wallet_addEthereumChain`: chain ID `0x13b2` for Arc Mainnet or `0x4cef52` for Arc Testnet, native currency USDC with 18 decimals.
- Observed on 2026-09-17, not guaranteed: public Arc RPC endpoints (`*.arc.io`) are blocked by common browser ad-block lists, and some reject or rate-limit large JSON-RPC batches. Read through the connected wallet's provider or a same-origin read-only relay such as the [demo worker](https://github.com/d20dao/randomizer-demo/blob/main/worker/index.js), and lower ethers' `batchMaxCount`. Details: [methods](skills/d20-consumer/references/methods.md#front-ends).

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
| d20-keeper | Advanced: authorized operation of your own keeper |

Copy the required folder into the agent skill directory. Each supports explicit invocation and normal automatic discovery. Canonical public sources are the [SDK](https://github.com/d20dao/d20-sdk) and its [protocol/](https://github.com/d20dao/d20-sdk/tree/main/protocol) folder, which holds the protocol contracts and replay code copied from the commit named in its `PROTOCOL-PROVENANCE.json`.

The keeper prepares 200-block epoch snapshots locally. Idle snapshots cause no publication transaction and can remain for 50 epochs. Live paid demand triggers publication, then randomness binds a canonical future block. Requests retain their original 60-second deadline and fixed refund address. The coordinator fulfills up to 16 requests per transaction with unchanged per-request events.

Both service contracts use initialized UUPS proxies with two-step ownership; `renounceOwnership` is disabled. Upgrade authority is trusted; verify both implementation histories and runtime pins. Telegram is opt-in and configured-chat-only, with read-only status/keeper commands. Docker install requires reviewed configuration and separately supplied keys.

Match the installed SDK provenance and deployed implementation history before use. Install the SDK with `npm install @d20dao/vrf-sdk`. Installing a skill does not authorize spending, deployment, bot access or publishing. Use only public interface information; signer, bot and operator data are outside these guides.

These guides follow public protocol commit `80c6b4b3451dd497399a8d91e3035585965d9ab9`. Match the installed SDK PROTOCOL-PROVENANCE.json to the deployment and its implementation history; each manifest records the source its implementations were deployed and upgraded from. `npm run check` compares the deployment snapshots in `skills/d20-consumer/references/` with the installed package, so update them together with an SDK release. Operator backend changes do not by themselves alter this public protocol pin.

## Arc Testnet pilot

A public testnet service is deployed on chain 5042002. Obtain current proxy addresses and independently checked code hashes from the [Arc Testnet deployment manifest](https://d20dao.org/deployments/arc-testnet.json) (Arc Mainnet: [arc-mainnet.json](https://d20dao.org/deployments/arc-mainnet.json)). Any consumer contract can request service by paying its quoted fee; no allowlist is required. A request must be served within 60 seconds or it becomes refundable. A single request is normally fulfilled within a few seconds; in a stress test 200 simultaneous requests were delivered within 36 seconds (median 19 seconds), and an Arc Testnet run on 2026-09-16 served 68 paid requests within 2–4 chain seconds, 47 of them in batched fulfillments. Measured timings are not an SLA.

## Getting started with an agent

Start with the [Getting started](https://d20dao.org/docs/getting-started) guide on the d20dao.org website and its Copy prompt action. `https://d20dao.org/llms.txt` indexes the public guides; `https://d20dao.org/llms-full.txt` contains complete text; `https://d20dao.org/agents.md` and `https://d20dao.org/AGENTS.md` provide integration instructions. Each guide exposes `https://d20dao.org/prompts/<guide-slug>.txt`. Use `d20-consumer` for an application, then `d20-lifecycle` and `d20-verification` for settlement and evidence.

Public entry points: [Getting started](https://d20dao.org/docs/getting-started), [SDK on npm](https://www.npmjs.com/package/@d20dao/vrf-sdk), [agent guide](https://d20dao.org/agents.md), [full text docs](https://d20dao.org/llms-full.txt) and [Explorer](https://d20dao.org/explorer).

The included consumer is constructor-based. For upgradeable applications, retain the existing initializer and storage layout and adapt callback authentication deliberately. Choice/shuffle outputs are indices into the original committed list. Application eligibility, assets and settlement belong to the application.

## Validate the examples

```sh
npm ci
npm run check
```

This compiles the consumer against the installed SDK, checks that every coordinator function the template declares exists in `coordinatorAbi`, and validates the mapping examples and deployment provenance. It sends no chain transaction and needs no operator credentials.
