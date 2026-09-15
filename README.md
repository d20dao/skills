# D20 agent skills

Self-contained instructions for the current epoch API3 plus fixed-key VRF prototype. Actual identifiers remain ArcDao/ArcVRF. These describe source behavior, not a production service.

| Skill | Use |
| --- | --- |
| d20-consumer | Integrate consumers and mappings |
| d20-lifecycle | Diagnose admission, acceptance, callbacks and refunds |
| d20-verification | Replay epoch/VRF evidence with trusted context |
| d20-sdk | Build and consume the local private SDK |
| d20-keeper | Configure and recover keeper and publisher |

Copy required folders into the agent skill directory. Each is self-contained and supports invocation by name or automatic discovery.

Canonical sources are [keeper](https://github.com/d20dao/keeper) and [SDK](https://github.com/d20dao/d20-sdk). Match the target PROTOCOL-PROVENANCE.json reviewed commit and deployment configuration. Reviewed canonical keeper commit: `db7101890b151f4539b3f6050d708bf7bfd381c7`. Reviewed SDK commit: `3a96f4c3c2878401fdf4c371bfe3e509b0992af4`; its protocol snapshot is pinned to this canonical commit. No release is implied.

Each 200-block epoch commits signed API3 data before starting. Requests pin epoch ID/hash in fixed-key VRF input and submit only the real proof. Missing commitment rejects requests without retaining fees. Installing instructions does not authorize deployment, spending, publishing or service launch.

Maintainers: read AGENTS.md, update from reviewed source and validate all five skills with skill-creator quick_validate.py. Keep secrets, user assets and copied cryptographic implementations out of skills.
