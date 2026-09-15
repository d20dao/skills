# d20dao agent skills

Self-contained instructions for the general randomness service, public @d20dao/vrf-sdk, and outbound d20dao-keeper. Current contracts use D20VRF names. Arc refers to the network, not the service brand.

| Skill | Use |
| --- | --- |
| d20-consumer | Integrate authenticated consumers and deterministic mappings |
| d20-lifecycle | Diagnose publication, acceptance, callbacks and refunds |
| d20-verification | Replay public epoch/VRF evidence with trusted context |
| d20-sdk | Build and use the private alpha SDK |
| d20-keeper | Configure, observe and recover the operator |

Copy the required folder into the agent skill directory. Each supports explicit invocation and normal automatic discovery. Canonical sources are [keeper](https://github.com/d20dao/keeper) and [SDK](https://github.com/d20dao/d20-sdk).

The keeper prepares 200-block epoch snapshots locally. Idle snapshots cause no publication transaction and can remain for 50 epochs. Live paid demand triggers publication, then randomness binds a canonical future block. Requests retain their original 60-second deadline and fixed recipient.

Both service contracts use initialized UUPS proxies with two-step ownership. Upgrade authority is trusted; verify both implementation histories and runtime pins. Telegram is opt-in and configured-chat-only, with read-only status/keeper commands. Docker install requires reviewed configuration and separately supplied keys.

Match the installed SDK provenance and deployed implementation history before use. Packaging remains private and guarded. Installing a skill does not authorize spending, deployment, bot access or publishing. Use only public interface information; signer, bot and operator data are outside these guides.

These guides follow public protocol commit `8fe545a56aa8beea294a96b3ef3fd17a3f514b6b`. Match the installed SDK PROTOCOL-PROVENANCE.json to the deployment and its implementation history. Operator backend changes do not by themselves alter this public protocol pin.
