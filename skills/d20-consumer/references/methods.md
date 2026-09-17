# SDK methods and result semantics

Use `@d20dao/vrf-sdk` 0.3.3 or newer with Solidity 0.8.28. The examples below assume `using D20VRFRequests for ID20VRF;` and `o = D20VRFRequests.Options(clientSeed, callbackGasLimit, refundAddress)` inside the application contract. Every helper pays `rng.quoteFee(o.callbackGasLimit)` from the calling contract's balance, so check `msg.value >= rng.quoteFee(callbackGasLimit)` (or fund the contract) before calling one.

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

`refundRequest`, `retryCallback`, `retryRefundCallback`, `withdrawRefundCredit`, `requestFeePaid`, `requestRefundBps` and `pricing` are in the full `coordinatorAbi`, not the minimal `ID20VRF` interface; declare a local interface for the ones a contract calls, as the example does. A failed delivery after accepted proof is paid service: retry the same stored word. An unfulfilled request can be refunded strictly after 60 seconds for `feePaid × refundBps / 10000` (default 100%; the owner may lower the ratio to no less than 50% for future requests); the remainder is retained by the service. The refund is pushed to the fixed refund address with 30,000 gas or recorded as its refund credit. The optional `_onRefund` hook then receives only the request ID; `retryRefundCallback` repeats the notice only. No coordinator reentry from either callback.
