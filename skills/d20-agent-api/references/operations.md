# Agent API operations and fields

Snapshot of the live OpenAPI 3.1 documents (`info.version` 0.1.0) of `https://api.d20dao.org` and `https://api-testnet.d20dao.org`, taken on 2026-09-19. The two differ only in the server URL, the `network` they accept and the addresses in their examples. Read `/openapi.json` for the current contract.

## Request body

`POST /v1/random` takes a JSON object, at most 64 KiB.

| Field | Used by | Rule |
| --- | --- | --- |
| `operation` | all, required | `raw`, `coinFlip`, `dice`, `range`, `chooseOne`, `chooseMany` or `shuffle` |
| `sides` | `dice`, required | Faces per die, at least 2 |
| `count` | `dice`, `chooseMany` | `dice`: rolls, 1 to 128, default 1. `chooseMany`: distinct picks, 1 to population, required |
| `min`, `max` | `range`, required | `min` ≤ `max` ≤ 2^256−1, both inclusive |
| `population` | `chooseOne`, `chooseMany`, `shuffle` | Items to draw from, 1 to 256. Give this or `items` |
| `items` | `chooseOne`, `chooseMany`, `shuffle` | 1 to 256 labels of at most 200 bytes of UTF-8. Give this or `population` |
| `seed` | all, optional | At most 64 bytes of UTF-8, default empty. Bound with the payment into the on-chain `clientSeed` |
| `network` | all, optional | `arc-mainnet` on `api.d20dao.org`, `arc-testnet` on `api-testnet.d20dao.org`, and the default there |

`sides`, `min` and `max` are JSON numbers up to 2^53−1 or decimal strings up to 2^256−1. Any other field, or a field the operation does not use, is a 400 naming it in `error.field`.

## Operations

| `operation` | `mapping.operation` | SDK builtin | `result` |
| --- | --- | --- | --- |
| `raw` | 0 | `builtins.raw()` | One uint256 word |
| `dice` | 1 | `builtins.diceRoll(sides, count)` | `count` values from 1 to `sides`, repeats allowed |
| `coinFlip` | 2 | `builtins.coinFlip()` | `[0]` tails or `[1]` heads; `outcome` names it |
| `range` | 3 | `builtins.numberRange(min, max)` | One value from `min` to `max` |
| `chooseOne` | 4 | `builtins.chooseOne(population)` | One zero-based index |
| `chooseMany` | 5 | `builtins.chooseMany(population, count)` | `count` distinct indices |
| `shuffle` | 6 | `builtins.shuffle(population)` | Every index once |

Values below 2^53 are JSON numbers; raw words and larger values are decimal strings. `result` equals the coordinator's `getMappedResult(requestId)`. With `items`, the paid answer adds `picked`, the labels at the result indices; the labels are not stored or proven.

## Response

`RandomResult`, returned by all three result routes. The paid route adds `payment`; status reads return indices without `picked`.

| Field | Meaning |
| --- | --- |
| `status` | `fulfilled`, `pending`, `expired`, `refunded`, `rejected` or `refund_due` |
| `stage` | `pending` only: `settling`, `requesting`, `expiring` or `replacing` |
| `statusUrl` | Free status route of the paid call, in 202 answers; `links.status` elsewhere |
| `message` | What the status means for you |
| `requestId` | Coordinator request id, a decimal string |
| `operation`, `result`, `outcome`, `picked` | See Operations |
| `randomness` | The VRF word accepted on chain |
| `clientSeed` | The request's `clientSeed` |
| `paymentId` | `keccak256(abi.encode(uint256 chainId, address payer, bytes32 nonce))` of the x402 authorization |
| `ref` | `keccak256(abi.encode(bytes32 paymentId, string seed))`, the first request's `clientSeed` |
| `seed` | The seed sent, or empty |
| `replaces`, `replacedBy`, `replacementId` | Links between an expired request and its one replacement |
| `settlement` | Circle Gateway transfer id of the payment |
| `mapping` | The stored `RandomnessMapping.Spec`: `operation`, `lower` and `upper` as decimal strings, `count`, `population` |
| `network`, `chainId`, `coordinator`, `consumer` | Where the request lives; `consumer` is the API's relay contract |
| `requestTx`, `fulfillmentTx` | Transactions that opened and fulfilled the request |
| `deadline` | Unix time after which an unfulfilled request can only be refunded |
| `links` | `result`, `status`, `replacement`, `request` and `fulfillment` (block explorer), `proof` (D20DAO explorer replay) |
| `payment` | `network` (CAIP-2), `payer`, `amount` in atomic USDC (6 decimals), `settlement` |
| `verify` | How to check the result without trusting the API |
| `retryAfterSeconds` | `pending` only: wait before reading the status route |

| `status` | Meaning |
| --- | --- |
| `fulfilled` | Final |
| `pending` | In progress; `stage: settling` means the payment is still being confirmed |
| `expired`, `refunded` | That request got no proof in time; a paid call is served by one replacement (`replacedBy`) |
| `rejected` | The payment was not settled; nothing charged |
| `refund_due` | Not served; refunded manually if you were charged. Quote the `paymentId` |

## Status codes

Errors are `{"error":{"code","message","field"}}`, except 402, which returns the x402 payment requirements with the reason in `error` and the code in `code`.

| HTTP | `code` | Charged | Do |
| --- | --- | --- | --- |
| 200 | | Yes | Use the result |
| 202 | | Yes, or being confirmed | Read the status route after `Retry-After` |
| 400 | `invalid_request`, `invalid_payment_header` | No | Fix the body or header |
| 402 | `payment_required`, `payment_invalid`, `payment_rejected` | No | Sign an `accepts[]` option; check the Gateway balance and network |
| 404 | `not_found` | | Unknown route, request or payment |
| 409 | `payment_conflict` | No | The payment was used with a different signature, seed or parameters |
| 409 | `payment_pending` | No | Earlier payments of yours are still being confirmed; retry after `Retry-After` |
| 413 | `body_too_large` | No | Send at most 64 KiB |
| 429 | `rate_limited` | No | Retry after `Retry-After` |
| 503 | `cost_above_price`, `temporarily_unavailable`, `settlement_unavailable`, `payment_unavailable`, `chain_unavailable` | No | Not selling right now; retry later |

## Headers

- `Payment-Signature` (request): base64 of the x402 v2 payment payload for one `accepts[]` option.
- `PAYMENT-REQUIRED` (402): base64 of the payment requirements, without `extensions`.
- `PAYMENT-RESPONSE` (200, and 202 once settled): base64 of `{success, transaction, network, payer}`.
- `Retry-After`: on 202, 409 `payment_pending`, 429 and most 503 answers.
- CORS is open, and `PAYMENT-REQUIRED` and `PAYMENT-RESPONSE` are exposed to browsers.
