# d20dao agent skills

Self-contained instructions for the general randomness service, public @d20dao/vrf-sdk, and outbound d20dao-keeper. Current contracts use D20VRF names. Arc refers to the network, not the service brand.

| Skill | Use |
| --- | --- |
| d20-consumer | Integrate authenticated consumers and deterministic mappings |
| d20-lifecycle | Diagnose publication, acceptance, callbacks and refunds |
| d20-verification | Replay public epoch/VRF evidence with trusted context |
| d20-sdk | Install and use the published SDK |
| d20-keeper | Configure, observe and recover the operator |

Copy the required folder into the agent skill directory. Each supports explicit invocation and normal automatic discovery. Canonical sources are [keeper](https://github.com/d20dao/keeper) and [SDK](https://github.com/d20dao/d20-sdk).

The keeper prepares 200-block epoch snapshots locally. Idle snapshots cause no publication transaction and can remain for 50 epochs. Live paid demand triggers publication, then randomness binds a canonical future block. Requests retain their original 60-second deadline and fixed recipient.

Both service contracts use initialized UUPS proxies with two-step ownership. Upgrade authority is trusted; verify both implementation histories and runtime pins. Telegram is opt-in and configured-chat-only, with read-only status/keeper commands. Docker install requires reviewed configuration and separately supplied keys.

Match the installed SDK provenance and deployed implementation history before use. Install the SDK with `npm install @d20dao/vrf-sdk`. Installing a skill does not authorize spending, deployment, bot access or publishing. Use only public interface information; signer, bot and operator data are outside these guides.

These guides follow public protocol commit `d7e785dda57499220bd37d73bc6fad9226872dcc`. Match the installed SDK PROTOCOL-PROVENANCE.json to the deployment and its implementation history. Operator backend changes do not by themselves alter this public protocol pin.

## Arc Testnet pilot

A restricted pilot is deployed on chain 5042002. Obtain current proxy addresses and independently checked code hashes from the [keeper deployment manifest](https://github.com/d20dao/keeper/blob/main/deployments/arc-testnet.json). Consumer allowlisting is required. The [small-sample measurements](https://github.com/d20dao/keeper/blob/main/docs/benchmarks/arc-testnet-pilot-2026-09-15.json) cover proof acceptance, same-result callback repair and expired-request refunds; they are not an SLA. The SDK is available on npm; the manifest records the activated refund-notification upgrade.

## Getting started with an agent

Start with the website Getting started guide and its Copy prompt action. `/llms.txt` indexes the public guides; `/llms-full.txt` contains complete text; `/agents.md` and `/AGENTS.md` provide integration instructions. Each guide exposes `/prompts/<guide-slug>.txt`. Use `d20-consumer` for an application, then `d20-lifecycle` and `d20-verification` for settlement and evidence.
