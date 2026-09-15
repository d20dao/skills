# D20 agent skills

Installable instructions for integrating and operating the D20 VRF prototype, whose current contract and package identifiers use ArcDao/ArcVRF names. These guides describe source behavior, not an available production service.

| Skill | Use |
| --- | --- |
| `d20-consumer` | Integrate authenticated Solidity consumers and deterministic mappings |
| `d20-lifecycle` | Diagnose request acceptance, callback delivery and refunds |
| `d20-verification` | Replay public evidence against independently trusted chain context |
| `d20-sdk` | Build and consume the local alpha SDK |
| `d20-keeper` | Configure, inspect and recover the outbound keeper |

Copy the required folder from `skills/` into your agent's skill directory. For Codex, use `~/.codex/skills/` (or `$CODEX_HOME/skills/`). Each folder is self-contained. Invoke by name, for example `$d20-consumer`, or let the agent select it from its description. Private repository access is required; no npm publication or public availability is implied.

Example tasks:

- “Use d20-consumer to add a d20 roll to this contract, preserving our existing claim flow.”
- “Use d20-lifecycle to explain why this accepted request has no delivered callback.”
- “Use d20-verification to replay this receipt without trusting the submitted proof's key.”
- “Use d20-sdk to validate a local package installation.”
- “Use d20-keeper to diagnose a retained nonce using read-only evidence first.”

Canonical sources are [keeper](https://github.com/d20dao/keeper) and [SDK](https://github.com/d20dao/d20-sdk). Read each skill's compatibility boundary before following commands. Installing instructions does not authorize spending funds, deploying contracts, publishing packages or launching a service.

The guides cover legacy `EntropySources` V1 and immutable precommitted `EntropySnapshots` V2. V2 requires a new catalog and a separately bound coordinator; old proofs keep their original version and configuration. Inspect the target SDK's exported snapshot types and provenance before using V2. Reviewed development revisions: keeper `7656c3eca6d4b5889254d337c650543e8793af90`, SDK `29d38f8f0584bbd5e57503dcd118dfa9a2790a7e`. These are source baselines, not production releases.

Maintainers: inspect `AGENTS.md`; update guides from reviewed source changes and validate all skills with the skill-creator `quick_validate.py` when available. The instructions intentionally contain no deployment address, secret, API credential or copied cryptographic implementation.
