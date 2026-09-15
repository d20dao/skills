---
name: d20-consumer
description: Integrate d20dao randomness consumers, authenticated callbacks and deterministic mappings into an application.
---

Public protocol reference: `8fe545a56aa8beea294a96b3ef3fd17a3f514b6b`. Match installed SDK provenance and deployed implementation history before use.

Read the installed @d20dao/vrf-sdk README, AGENTS.md, declarations and provenance. Confirm canonical source, chain, effective coordinator/registry proxy addresses and both implementation histories. D20VRF is the current identifier; DiceConsumer.sol is one example. No public service or package release is implied.

After epoch activation, requests escrow exact fees even if publication is pending. The keeper publishes its first validated local snapshot for live allowlisted demand, then targetBlock=max(requestBlock,commitBlock+1). Keep original request block, epoch, mapping, recipient and 60-second deadline fixed. Multiple requests may share a snapshot; never create a replacement request to recover an accepted result.

- Use packaged D20VRFConsumer, ID20VRF, D20VRFRequests and RandomnessMapping with compiler 0.8.28. coordinatorAbi/epochEntropyAbi describe the effective proxy endpoints.
- For a dice example, rng.d20(D20VRFRequests.Options(clientSeed, callbackGasLimit, refundAddress)) forwards the quoted requestFee. Require exact payment and account separately for application payments.
- Fix caller/request association and application state so users cannot discard accepted outcomes. D20VRFConsumer authenticates the coordinator proxy; validate expected requests and store raw bytes32 with minimal work. Keep application actions/transfers separate.
- Mapped callbacks still return raw words. Read getMappedResult or use canonical mapping; d20 maps to 1 through 20.
- Valid onchain acceptance at or before original requestedAt+60 seconds is timely. Callback failure still earns service payment; retryCallback redelivers only the same result. Expired unfulfilled requests refund their fixed recipient or refund credit.

Both contracts support owner-authorized UUPS upgrades and two-step ownership. Upgrade authority is trusted. The registry committer, coordinator payout recipient and keeper share are administrable; the current implementation provides no request-input or VRF-key override. Verify deployed code, implementation pins and service onboarding rather than trusting code length or an address alone.

Use the application's existing validation/payment/result flow. SDK examples do not implement application refunds, PoW, claim locking or minting. Compile through the actual resolver and test changed authentication, fee and lifecycle paths. Local success does not establish service readiness.
