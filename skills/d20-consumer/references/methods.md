# SDK methods and result semantics

Use `@d20dao/vrf-sdk` 0.4.0 or newer with Solidity 0.8.28. The examples below assume `using D20VRFRequests for ID20VRF;` and `o = D20VRFRequests.Options(clientSeed, callbackGasLimit, refundAddress)` inside the application contract. Every helper pays `rng.quoteFee(o.callbackGasLimit)` from the calling contract's balance, so check `msg.value >= rng.quoteFee(callbackGasLimit)` (or fund the contract) before calling one.

| Result | TypeScript mapping spec | Solidity request helper | Returned values |
| --- | --- | --- | --- |
| Raw word | `builtins.raw()` | `rng.requestRandomness{value: rng.quoteFee(gasLimit)}(seed, gasLimit, refundAddress)` | Raw callback `bytes32`; raw mapping returns one uint256 |
| Dice | `builtins.diceRoll(6n, 4)` | `rng.diceRoll(6, 4, o)` | Four values, each 1–6; repeats allowed |
| Built-in dice | `builtins.d20()`; also d12, d10, d8, d6, d4 | `rng.d20(o)`; same other names | One value, 1–sides |
| Custom die | `builtins.dN(100n)` | `rng.dN(100, o)` | One value, 1–100 |
| Coin | `builtins.coinFlip()` | `rng.coinFlip(o)` | 0 = tails, 1 = heads |
| Inclusive range | `builtins.numberRange(10n, 100n)` | `rng.numberRange(10, 100, o)` | One value, 10–100 inclusive |
| One index | `builtins.chooseOne(52)` | `rng.chooseOne(52, o)` | One zero-based index, 0–51 |
| Several indices | `builtins.chooseMany(52, 3)` | `rng.chooseMany(52, 3, o)` | Three distinct indices, without replacement |
| Permutation | `builtins.shuffle(52)` | `rng.shuffle(52, o)` | All 52 indices, each exactly once |

Dice sides must be at least 2; dice count is 1–128. Choice/shuffle population is 1–256. Choose-many count is 1–population. Number ranges use uint256 endpoints, permit equal endpoints, and support the complete `0..2^256-1` interval. TypeScript bounds use `bigint`; count/population use integer `number` values. Mapping results are `bigint[]`. `callbackGasLimit` is 30,000–1,000,000.

All callbacks receive `(requestId, rawWord)`, including mapped requests. Store the raw word in the callback. Read `rng.getMappedResult(id)` after proof acceptance, or run `mapRandomness(acceptedWord, originalSpec)` offchain. Large mappings cost more gas; avoid computing a full permutation inside a small callback budget.

One word is 256 bits, so one request covers an operation that needs several values: derive them with `keccak256(abi.encode(word, index))` rather than opening a request per value.

## Quote and pay the fee

`fee = max(minFee, feeMultiplier × baseFee × (fulfillGasOverhead + callbackGasLimit))`, in native USDC with 18 decimals. `pricing()` returns `(minFee, feeMultiplier, fulfillGasOverhead)`; the owner can change them within bounds (minFee at most 10 USDC, multiplier 0–20, overhead 100,000–2,000,000 gas) and each change emits `PricingChanged`. The transaction's own `block.basefee` prices the request, so `quoteFee(callbackGasLimit)` is exact only inside the requesting transaction.

Off-chain quoting example (ethers v6): read `baseFeePerGas` from the latest block, call `quoteFeeAt(callbackGasLimit, baseFeePerGas)`, then send the quote recomputed at a buffered base fee. The SDK's `quoteRequestFee(provider, coordinator, callbackGasLimit, { bufferBps })` returns both the exact quote for that header (`fee`) and the buffered amount to send (`value`). Do not call `quoteFee` through `eth_call`: it commonly reports a base fee of 0 and returns only `minFee`.

Labelled example with the initialization values of both Arc deployments (0.08 USDC minimum fee, multiplier 5, overhead 300,000 gas; `pricing()` returns the live values, which the owner may change within bounds) and `callbackGasLimit` 100,000:

| Header base fee | 5 × baseFee × 400,000 | Fee paid |
| --- | --- | --- |
| 20 gwei | 0.04 USDC | 0.08 USDC (minimum applies) |
| 200 gwei | 0.40 USDC | 0.40 USDC |
| 200 gwei quoted with a 30% buffer (260 gwei) | 0.52 USDC sent | 0.40 USDC paid; 0.12 USDC credited to the refund address |

Payment below the transaction's quote reverts with `IncorrectFee(expected, actual)` and creates no request. Excess is credited to the refund address (`FeeOverpaymentCredited(requestId, refundAddress, amount)`) and withdrawn by that address with `withdrawRefundCredit(recipient)`; the coordinator never keeps it. `RandomnessRequested` carries `feePaid`; `requestFeePaid(id)` and `requestRefundBps(id)` return the escrowed fee and the refund ratio snapshotted for that request.

## Bind the application input

Choose/shuffle return indices, not application objects. Freeze the ordered list, its length and mapping parameters before requesting. For example, compute `itemsHash = keccak256(abi.encode(orderedItems))`, save the commitment and include it in the fixed client seed. Apply the returned indices to that same list. The coordinator knows population/count but does not store or authenticate arbitrary application items for you.

The [consumer example](../assets/RandomnessConsumer.sol) records a context hash and prevents reuse of a caller's operation ID. Replace its public entry point with the existing application's eligibility/authorization checks as needed; accepting a caller-supplied hash alone does not establish a canonical list. Do not let users discard an accepted outcome by requesting the same application operation under another ID.

## Adapt an existing contract

Preserve its existing storage, roles, fee model and finalization flow. The example uses a constructor and an immutable coordinator. An upgradeable application needs its own reviewed initializer/storage or an adapter design; do not replace its initializer with the example's constructor or shift its storage layout. Authenticate callbacks, correlate known request IDs, reject duplicate settlement and keep transfers/mints in a separate application step.

`refundRequest`, `retryCallback`, `retryRefundCallback`, `withdrawRefundCredit`, `getRequest`, `requestFeePaid`, `requestRefundBps` and `pricing` are in the full `coordinatorAbi`, not the minimal `ID20VRF` interface; declare a local interface for the ones a contract calls, as the example does. The [SDK API reference](https://github.com/d20dao/d20-sdk/blob/main/API.md) documents every coordinator function, event and error. A failed delivery after accepted proof is paid service: retry the same stored word. An unfulfilled request can be refunded strictly after 60 seconds for `feePaid × refundBps / 10000` (default 100%; the owner may lower the ratio to no less than 50% for future requests); the remainder is retained by the service. The refund is pushed to the fixed refund address with 30,000 gas or recorded as its refund credit. The optional `_onRefund` hook then receives only the request ID; `retryRefundCallback` repeats the notice only. No coordinator reentry from either callback.

## Names that are easy to confuse

- `refundBps()` is the coordinator's current refund ratio, copied into each new request. `requestRefundBps(id)` is the ratio one request copied at creation and is refunded at. Likewise `pricing()` and `quoteFee` price future requests, while `requestFeePaid(id)` is what one request escrowed. `keeperFeeBps()` has no per-request copy; it splits the escrowed fee at acceptance.
- `RandomnessMapping.Spec` is the Solidity struct `(operation, lower, upper, count, population)`. The TypeScript mapping spec (`MappingSpec`) returned by `builtins` has the same fields as an object, with `lower` and `upper` as `bigint`; ethers encodes it for the struct unchanged, and `hashMapping(spec)` equals the request's `mappingHash`.

## Read the result

A single request is normally fulfilled within a few seconds; wait up to its deadline (request block time plus 60 seconds) and handle expiry. With ethers v6 and the [consumer example](../assets/RandomnessConsumer.sol):

```js
import { Contract } from 'ethers';
import { builtins, quoteRequestFee } from '@d20dao/vrf-sdk';
import { coordinatorAbi } from '@d20dao/vrf-sdk/abi';

const coordinator = new Contract(coordinatorAddress, coordinatorAbi, provider);
const { value } = await quoteRequestFee(provider, coordinatorAddress, 100_000); // CALLBACK_GAS of the example
const receipt = await (await consumer.requestMapped(operationId, contextHash, builtins.d20(), { value })).wait();
const requestId = receipt.logs
  .filter((log) => log.address.toLowerCase() === coordinatorAddress.toLowerCase())
  .map((log) => coordinator.interface.parseLog(log))
  .find((event) => event?.name === 'RandomnessRequested').args.requestId;

for (;;) {
  // Read the block first, so a proof included up to that block is visible in getRequest.
  const { timestamp } = await provider.getBlock('latest');
  const request = await coordinator.getRequest(requestId);
  if (request.fulfilled) { console.log(await coordinator.getMappedResult(requestId)); break; }
  if (BigInt(timestamp) > request.deadline) break; // expired: refundRequest(requestId) is available
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
```

`fulfilled` means the word is final. `delivered` only reports the callback: a fulfilled request with `delivered` false keeps its word, and `retryCallback` delivers it again. If the keeper publishes no epoch packet or proof before the deadline, for any reason, the request expires and is never fulfilled late. Reading a word over RPC is not proof verification. Events carry the same information: `RandomnessFulfilled(requestId, randomness, submitter)`, `CallbackAttempted(requestId, success, gasLimit)` and `RequestRefundedTo(requestId, refundAddress, amount, paid)`.

## Recovery gas limits

`refundRequest`, `retryCallback` and `retryRefundCallback` need no value or role, but revert with `InsufficientCallbackGas` rather than forward less gas to the consumer. Measured minimum transaction gas limits and suggested values (SDK README, "Gas for refund and retry calls"):

| Call | Measured minimum | Suggested gas limit |
| --- | --- | --- |
| `refundRequest(id)` | 302,558 to 357,517 | 400,000 |
| `retryCallback(id, gasLimit)`, `gasLimit` 30,000–1,000,000 and at least the request's `callbackGasLimit` | about 1.032 × gasLimit + 184,300 | gasLimit + 250,000 |
| `retryRefundCallback(id, gasLimit)`, `gasLimit` 100,000–1,000,000 | about 1.032 × gasLimit + 89,800 | gasLimit + 150,000 |

`eth_estimateGas` finds these minimums because a lower limit reverts; add a margin in case state changes before inclusion.

## Front ends

- Bundle the ESM-only SDK (Vite, webpack, esbuild) or import only `@d20dao/vrf-sdk/abi` when you need just the ABIs.
- Add the network with `wallet_addEthereumChain`, native currency `{ name: 'USDC', symbol: 'USDC', decimals: 18 }`: Arc Mainnet chain ID `0x13b2`, RPC `https://rpc.mainnet.arc.io`, explorer `https://explorer.arc.io`; Arc Testnet chain ID `0x4cef52`, RPC `https://rpc.testnet.arc.io`, explorer `https://testnet.arcscan.app`.
- Coordinator custom errors pass through the consumer's call. Decode revert data with `coordinator.interface.parseError(data)` or add the coordinator's error entries to the consumer ABI; `OnlyCoordinator` is in the consumer ABI only. The [SDK API reference](https://github.com/d20dao/d20-sdk/blob/main/API.md) lists each error's selector and response.
- ethers v6 returns structs as `Result` arrays. A field named like an `Array` or `Result` member (`values`, `length`, `map`, `keys`) is shadowed; read it with `result.getValue(name)`, by position or from `result.toObject()`.
- Public Arc RPC endpoints are on `*.arc.io`, which common browser ad-block filter lists block, so direct read-only calls fail with `net::ERR_BLOCKED_BY_CLIENT` for many users. Read through the connected wallet's EIP-1193 provider after checking its chain ID, or through a same-origin read-only JSON-RPC relay that forwards only read methods, such as the demo's [worker/index.js](https://github.com/d20dao/randomizer-demo/blob/main/worker/index.js).
- Some public endpoints also reject or rate-limit large JSON-RPC batches. ethers `JsonRpcProvider` batches up to 100 calls by default; set `batchMaxCount`, for example `new JsonRpcProvider(url, 5042, { staticNetwork: true, batchMaxCount: 1 })`. Cache final values: once `fulfilled` is true, the word and mapped result never change.
