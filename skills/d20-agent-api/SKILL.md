---
name: d20-agent-api
description: Buy d20dao verifiable randomness over HTTP with x402, 0.05 USDC per call through Circle Gateway; operations, the 402 handshake, pending results, errors, seeds and verification.
---

Public protocol reference: `de5f82eb9fc749c80e83270f57cde9908ddcf1f3`. Match the installed SDK provenance and the deployed implementation history before use; each deployment manifest records the source its implementations were deployed and upgraded from.

Use this when an agent or backend needs verifiable randomness and can pay over HTTP, instead of deploying a consumer contract. Each paid call opens one request on the D20DAO coordinator through the API's relay contract and returns the proven result. When the word must reach your own contract, use **d20-consumer**. Installing this skill authorizes no spending: follow the user's instructions for funding and for mainnet.

## Endpoints and price

| Network | Base URL | Requests opened on |
| --- | --- | --- |
| Arc Mainnet (live) | `https://api.d20dao.org` | chain 5042, coordinator `0xd20da057469C45928912d983F45790C41e290571` |
| Arc Testnet | `https://api-testnet.d20dao.org` | chain 5042002, coordinator `0xd20DA0FF9087d053f0291524Eac12abA1ADBd945` |

| Route | Price | Use |
| --- | --- | --- |
| `POST /v1/random` | 0.05 USDC | Draw. Without a `Payment-Signature` header it answers 402 with x402 v2 `accepts[]`. |
| `GET /v1/payments/{paymentId}` | free | Status and result of a paid call, following a replacement request. |
| `GET /v1/random/{requestId}` | free | A request this API opened, read from the chain. |
| `GET /openapi.json` | free | OpenAPI 3.1 with schemas, `x-payment-info` and `info.x-guidance`. |
| `GET /health` | free | Service status. |

The price is 50000 atomic USDC (6 decimals), paid with the x402 `exact` scheme through Circle Gateway (`extra.name` `GatewayWalletBatched`) from a Gateway balance on any of 12 networks: Ethereum, Base, Arbitrum, Optimism, Polygon, Avalanche, Unichain, Sonic, World Chain, Sei, HyperEVM and Arc, or their test networks for the testnet API. The payment network is independent of the chain the request is opened on. Free routes and unpaid calls are rate limited per IP.

## Pay with GatewayClient

Install `@circle-fin/x402-batching` and `viem` (ESM, Node 22.13+). Deposit USDC into Circle Gateway once, on the chain you pay from; each `pay()` then signs a gasless authorization, reads the 402 and resends with `Payment-Signature`.

```ts
import { GatewayClient } from '@circle-fin/x402-batching/client';

type Draw = {
  status: string; paymentId: string; message?: string; retryAfterSeconds?: number;
  requestId?: string; result?: (number | string)[]; fulfillmentTx?: string;
};

const api = 'https://api-testnet.d20dao.org';
const client = new GatewayClient({ chain: 'arcTestnet', privateKey: process.env.BUYER_KEY as `0x${string}` });
// Once, on the chain you pay from: await client.deposit('1');

let { data } = await client.pay<Draw>(`${api}/v1/random`, {
  method: 'POST',
  body: { operation: 'dice', sides: 20, count: 2, seed: 'game-42 round 3' },
});

// 202: paid, result not in yet. Poll the free status route; never pay again for the same draw.
const until = Date.now() + 300_000;
while (!['fulfilled', 'refund_due', 'rejected'].includes(data.status) && Date.now() < until) {
  await new Promise((resolve) => setTimeout(resolve, (data.retryAfterSeconds ?? 5) * 1000));
  const res = await fetch(`${api}/v1/payments/${data.paymentId}`);
  if (res.ok) data = (await res.json()) as Draw;
}
if (data.status !== 'fulfilled') throw new Error(`${data.status}: ${data.message ?? 'no result yet'}`);
console.log(data.result, data.requestId, data.fulfillmentTx);
```

`chain` selects both the Gateway balance and the `accepts[]` option: `arc`, `base`, `ethereum`, `arbitrum`, `optimism`, `polygon` and so on for mainnet, `arcTestnet`, `baseSepolia`, `sepolia` and so on for testnet. `pay()` returns 200 and 202 answers with `status` and `transaction`, the Gateway settlement id. It throws on any other status, and its message omits the API's `error.code`. Every `pay()` signs a new payment, so calling it again buys another draw.

## The 402 handshake

```text
POST /v1/random                          Content-Type: application/json
{"operation":"coinFlip"}

402 Payment Required                     PAYMENT-REQUIRED: base64 of the body, without extensions
{"x402Version":2,"error":"Payment required: 0.05 USDC over x402. ...","resource":{"url":".../v1/random",...},
 "accepts":[{"scheme":"exact","network":"eip155:5042002","asset":"0x3600000000000000000000000000000000000000",
   "amount":"50000","payTo":"0x...","maxTimeoutSeconds":604900,
   "extra":{"name":"GatewayWalletBatched","version":"1","verifyingContract":"0x..."}}, ...one per network],
 "extensions":{"bazaar":{...}},"code":"payment_required"}

POST /v1/random                          Payment-Signature: base64 of
{"operation":"coinFlip"}                   {"x402Version":2,"payload":{"authorization":{...},"signature":"0x..."},
                                            "resource":{...},"accepted":{...the chosen option}}

200 OK                                   PAYMENT-RESPONSE: base64 of {"success":true,"transaction":"<Gateway id>",...}
{"status":"fulfilled","requestId":"...","result":[1],"outcome":"heads","randomness":"0x...",...}
```

Sign an EIP-3009 `TransferWithAuthorization(from, to, value, validAfter, validBefore, nonce)` over the EIP-712 domain `{ name: 'GatewayWalletBatched', version: '1', chainId, verifyingContract }` of the chosen option: `to` is `payTo`, `value` is `amount`, `nonce` is 32 random bytes, `validAfter` is in the past and `validBefore` covers at least `maxTimeoutSeconds`. The unpaid call answers 402 without validating the body, so an invalid body comes back as an uncharged 400 on the paid call.

## Choose the operation

| Need | Body | `result` |
| --- | --- | --- |
| A 256-bit word | `{"operation":"raw"}` | one decimal string |
| Heads or tails | `{"operation":"coinFlip"}` | `[0]` tails or `[1]` heads, plus `outcome` |
| Dice | `{"operation":"dice","sides":6,"count":4}` | `count` values from 1 to `sides` |
| A number in a range | `{"operation":"range","min":10,"max":100}` | one value, both ends inclusive |
| One winner | `{"operation":"chooseOne","population":52}` | one zero-based index |
| Several distinct winners | `{"operation":"chooseMany","items":["ana","bo","cy","dee"],"count":2}` | `count` distinct indices, plus `picked` |
| An order | `{"operation":"shuffle","population":10}` | every index once |

`sides` is at least 2 and dice `count` 1 to 128 (default 1). `range` takes `min` ≤ `max` up to 2^256−1, as decimal strings above 2^53. Choices and shuffles take exactly one of `population` (1 to 256) or `items` (1 to 256 strings of at most 200 bytes). Send only the fields the operation uses, plus `seed` and `network`; anything else is a 400. The rules match `RandomnessMapping` in `@d20dao/vrf-sdk`. One call maps one word to all its values, so ask for every value an operation needs in one call. Field detail: [operations](references/operations.md).

## Pending results, errors and retries

- **200** `status: fulfilled`: the result is final.
- **202**: paid, no result yet. The payment is being confirmed (`stage: settling`), the request is being opened or replaced, or its proof took longer than about 25 seconds. Read `GET /v1/payments/{paymentId}` (`statusUrl`) for free after `Retry-After` or `retryAfterSeconds` until `status` is `fulfilled`, `refund_due` or `rejected`. Never pay again for the same draw.
- **Expiry.** A request with no proof by its 60-second deadline is refunded on chain and replaced once at the API's cost; the status route follows the replacement (`replaces`, `replacedBy`), so `expired` and `refunded` are not final for a paid call. If the replacement also expires the call becomes `refund_due`, refunded manually if you were charged: quote the `paymentId`. `rejected` means the payment was not settled and nothing was charged.
- **Not charged:** 400 invalid body, 402 payment refused (for example an insufficient Gateway balance or a bad signature), 409, 413, 429 and 503. Honour `Retry-After`.
- **409 `payment_conflict`:** the payment was already used with a different signature, `seed`, `operation`, or `sides`, `count`, `min`, `max` or `population`. `items` are compared by length only, so a reordered or relabelled list of the same length is not a conflict. **409 `payment_pending`:** earlier payments from the same payer are still being confirmed with Gateway; retry after `Retry-After`.
- **503:** not selling right now: network cost above the price, relayer or settlement unavailable, or the chain unreachable. Retry later.
- **Resending** the same `Payment-Signature` with the same body returns the same request and result. The authorization stays valid for about seven days; keep it until the call is final.

To recover from a lost `pay()` answer, register this hook before `pay()` so the `paymentId` is known before the paid request is sent, then read the status route instead of paying again. A 404 there means no payment with that id reached the API.

```ts
import { encodeAbiParameters, keccak256, type Hex } from 'viem';

let paymentId: Hex | undefined;
client.onAfterPaymentCreation(async ({ paymentPayload, selectedRequirements }) => {
  const { from, nonce } = (paymentPayload.payload as { authorization: { from: Hex; nonce: Hex } }).authorization;
  const chainId = BigInt(selectedRequirements.network.split(':')[1]);
  paymentId = keccak256(encodeAbiParameters([{ type: 'uint256' }, { type: 'address' }, { type: 'bytes32' }], [chainId, from, nonce]));
});
```

## Seed and committed lists

- `seed` is optional, at most 64 bytes of UTF-8, default empty. The request's on-chain `clientSeed` is `ref = keccak256(abi.encode(bytes32 paymentId, string seed))`, which binds the context you name (game, round, raffle) to your payment and the proof. It is fixed before the draw and cannot steer the result.
- `items` are display labels. Only their number goes on chain, as `population`, so the proof covers the indices, not the labels or their order. `picked` is `items[index]` from the list sent with that call; it is not stored, and status reads return indices only.
- To commit to the list itself, freeze its order and put its hash in `seed`, as 64 hex characters without `0x` or as base64. Publish the ordered list with the seed and apply the returned indices to that same list.

```ts
import { encodeAbiParameters, keccak256 } from 'viem';

const items = ['ana', 'bo', 'cy', 'dee'];
const seed = keccak256(encodeAbiParameters([{ type: 'string[]' }], [items])).slice(2); // 64 hex characters
const body = { operation: 'chooseMany', items, count: 2, seed };
```

## Verify a result

A fulfilled answer carries `requestId`, `result`, `randomness`, `clientSeed`, `paymentId`, `ref`, `seed`, `mapping`, `coordinator`, `consumer` (the API's relay contract), `requestTx`, `fulfillmentTx`, explorer `links` (`links.proof` replays the proof on the D20DAO explorer) and a `verify` summary. Check it without trusting the API:

1. Recompute `paymentId = keccak256(abi.encode(uint256 chainId, address payer, bytes32 nonce))` from the authorization you signed, with the payment network's chain id.
2. `clientSeed` is `keccak256(abi.encode(bytes32 paymentId, string seed))`; on a replacement request (`replaces` is set) it is `keccak256(abi.encode(bytes32 ref, uint256 1))`. It equals `getRequest(requestId).clientSeed` on the coordinator proxy, whose `consumer` is the relay and whose `randomness` is `randomness`.
3. `getMappedResult(requestId)` equals `result`. Offline, `mapRandomness(randomness, spec)` from `@d20dao/vrf-sdk` reproduces it, where `spec` is `mapping` with `lower` and `upper` as bigint; `hashMapping(spec)` equals `getRequest(requestId).mappingHash`.
4. Replay the proof with `replayCoordinator` as in **d20-verification**. Reading a word over RPC is not proof verification.

Read the coordinator with `coordinatorAbi` from `@d20dao/vrf-sdk/abi` through `https://rpc.mainnet.arc.io` or `https://rpc.testnet.arc.io`.

## Testnet and mainnet

- Develop against `https://api-testnet.d20dao.org` with a testnet Gateway balance (`arcTestnet`, `baseSepolia` and so on); testnet USDC comes from [Circle's faucet](https://faucet.circle.com). Its results are real proofs on Arc Testnet.
- `https://api.d20dao.org` opens requests on Arc Mainnet and spends real USDC from a mainnet Gateway balance. Switch only when the user asks, and keep testnet and mainnet keys and balances apart.
- Each deployment serves one chain. `network` in the body defaults to it (`arc-mainnet` or `arc-testnet`); any other value is a 400.

## References

- Live OpenAPI: `https://api.d20dao.org/openapi.json` and `https://api-testnet.d20dao.org/openapi.json`; `info.x-guidance` is a plain-text brief for agents.
- [Operations, fields and status codes](references/operations.md), from the live OpenAPI.
- **d20-consumer** when the word must reach your own contract, **d20-verification** for proof replay, **d20-lifecycle** for on-chain request states and **d20-sdk** for the package.
