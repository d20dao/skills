# D20DAO integration skills

Help coding agents add verifiable randomness to existing application contracts with `@d20dao/vrf-sdk`. Start with **d20-consumer** for authenticated callbacks, same-transaction fee quotes, refund credit and raw or mapped results. No keeper setup is required to integrate an application.

## Quick start

```sh
npm install @d20dao/vrf-sdk
```

Use `@d20dao/vrf-sdk` 0.2.0 or newer, Node 22.13+ and Solidity 0.8.28. Copy the relevant skill folder into your agent's supported skill directory, keeping its references and assets together, or point the agent directly at its SKILL.md.

- [Primary consumer skill](skills/d20-consumer/SKILL.md)
- [Compile-ready consumer](skills/d20-consumer/assets/RandomnessConsumer.sol): raw, mapped and shuffle requests paying the same-transaction quote, authenticated delivery, refund notification and refund-credit withdrawal
- [Methods and result semantics](skills/d20-consumer/references/methods.md): fee quoting, dice, coin, range, choose-one/many and shuffle
- [JavaScript examples](skills/d20-consumer/assets/mappings.mjs): mapping specs and deterministic outputs

## Arc Testnet contracts

Chain ID **5042002**. Connect applications to the **coordinator proxy**.

| Contract | Proxy address |
| --- | --- |
| D20VRFCoordinator | `0xd20dA0fDa41f84FCfA3423ae9F96B15910587B4E` |
| EpochEntropy | `0xd20Da04e4D6d97a762A5b56993d723AA7663F204` |
| Restricted pilot consumer | `0xD20Da0Ab4F5c258d579D18dC5a6e652266BB9a20` |

The [deployment reference](skills/d20-consumer/references/arc-testnet.md) includes implementation addresses and runtime hashes. Snapshot: 16 September 2026. Use the [current public manifest](https://d20dao.org/deployments/arc-testnet.json) for the selected deployment. The pilot consumer is restricted test tooling, not a shared endpoint for applications.

## Fees

Each request pays `fee = max(minFee, feeMultiplier × baseFee × (fulfillGasOverhead + callbackGasLimit))` in native USDC (18 decimals); `pricing()` returns the live `(minFee, feeMultiplier, fulfillGasOverhead)`, which the owner can change within fixed bounds (`PricingChanged`). Transaction gas is separate. No consumer registration or allowlisting is needed.

- A contract pays `quoteFee(callbackGasLimit)` in the requesting transaction; that quote is exact.
- An off-chain sender quotes `quoteFeeAt(callbackGasLimit, latestBlock.baseFeePerGas)` plus a buffer for base-fee movement, because `eth_call` commonly reports a base fee of 0 and `quoteFee` then returns only `minFee`. The SDK helper `quoteRequestFee(provider, coordinator, callbackGasLimit, { bufferBps })` does this.
- `msg.value` below the transaction's own quote reverts with `IncorrectFee(expected, actual)`. Any excess is credited to the refund address as refund credit (`FeeOverpaymentCredited`), withdrawable by that address with `withdrawRefundCredit(recipient)`; it is never revenue.

Example with the mainnet initialization defaults (minFee 0.08 USDC, multiplier 5, overhead 300,000 gas) and `callbackGasLimit` 100,000: at a 20 gwei base fee the dynamic part is 5 × 20 gwei × 400,000 = 0.04 USDC, so the request pays the 0.08 minimum; at 200 gwei it pays 0.4 USDC.

## Give this task to your agent

```text
Use the d20-consumer skill from https://github.com/d20dao/skills to add
D20DAO randomness to my existing contract. Inspect its architecture and
preserve authorization, storage, initialization and application payments.
Install @d20dao/vrf-sdk 0.2.0 or newer, read its AGENTS.md and provenance,
and select the deployment for my chain. Pay quoteFee(callbackGasLimit) in
the requesting transaction, quote off-chain with quoteFeeAt plus a buffer,
handle refund credit, and implement request-to-operation association,
small authenticated callbacks, same-word retries and refunds. For choice
or shuffle, commit to the ordered item list before requesting. Compile and
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

Copy the required folder into the agent skill directory. Each supports explicit invocation and normal automatic discovery. Canonical sources are [keeper](https://github.com/d20dao/keeper) and [SDK](https://github.com/d20dao/d20-sdk).

The keeper prepares 200-block epoch snapshots locally. Idle snapshots cause no publication transaction and can remain for 50 epochs. Live paid demand triggers publication, then randomness binds a canonical future block. Requests retain their original 60-second deadline and fixed refund address. The coordinator fulfills up to 16 requests per transaction with unchanged per-request events.

Both service contracts use initialized UUPS proxies with two-step ownership; `renounceOwnership` is disabled. Upgrade authority is trusted; verify both implementation histories and runtime pins. Telegram is opt-in and configured-chat-only, with read-only status/keeper commands. Docker install requires reviewed configuration and separately supplied keys.

Match the installed SDK provenance and deployed implementation history before use. Install the SDK with `npm install @d20dao/vrf-sdk`. Installing a skill does not authorize spending, deployment, bot access or publishing. Use only public interface information; signer, bot and operator data are outside these guides.

These guides follow public protocol commit `200c5ad4976f487db60561171d7ed5dd63eaa94c`. Match the installed SDK PROTOCOL-PROVENANCE.json to the deployment and its implementation history. Operator backend changes do not by themselves alter this public protocol pin.

## Arc Testnet pilot

A public testnet service is deployed on chain 5042002. Obtain current proxy addresses and independently checked code hashes from the [keeper deployment manifest](https://github.com/d20dao/keeper/blob/main/deployments/arc-testnet.json). Any consumer contract can request service by paying its quoted fee; no allowlist is required. The [small-sample measurements](https://github.com/d20dao/keeper/blob/main/docs/benchmarks/arc-testnet-pilot-2026-09-15.json) cover proof acceptance, same-result callback repair and expired-request refunds; they are not an SLA.

## Getting started with an agent

Start with the website Getting started guide and its Copy prompt action. `/llms.txt` indexes the public guides; `/llms-full.txt` contains complete text; `/agents.md` and `/AGENTS.md` provide integration instructions. Each guide exposes `/prompts/<guide-slug>.txt`. Use `d20-consumer` for an application, then `d20-lifecycle` and `d20-verification` for settlement and evidence.

Public entry points: [Getting started](https://d20dao.org/docs/getting-started), [SDK on npm](https://www.npmjs.com/package/@d20dao/vrf-sdk), [agent guide](https://d20dao.org/agents.md), [full text docs](https://d20dao.org/llms-full.txt) and [Explorer](https://d20dao.org/explorer).

The included consumer is constructor-based. For upgradeable applications, retain the existing initializer and storage layout and adapt callback authentication deliberately. Choice/shuffle outputs are indices into the original committed list. Application eligibility, assets and settlement belong to the application.

## Validate the examples

```sh
npm ci
npm run check
```

This compiles the consumer against the installed SDK, checks that every coordinator function the template declares exists in `coordinatorAbi`, and validates the mapping examples and deployment provenance. It sends no chain transaction and needs no operator credentials. To verify against protocol sources that are not published yet, point `D20_SDK_DIR` at a directory containing the protocol `contracts/` tree (a keeper checkout or the SDK repository's `protocol/` folder); the provenance comparison is skipped when that directory has no `PROTOCOL-PROVENANCE.json`.
