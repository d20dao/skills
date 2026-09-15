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

Canonical sources are [keeper](https://github.com/d20dao/keeper) and [SDK](https://github.com/d20dao/d20-sdk). Match the target PROTOCOL-PROVENANCE.json reviewed commit and deployment configuration. Reviewed canonical keeper commit: `dcca615b3e07f273e45fa5596f80b63da241896a`. Reviewed SDK commit: `67d6b0113c92d860b3771ba9e496fa716d17d9ec`; its protocol snapshot is pinned to this canonical commit. No release is implied.

Four recipe slots cover three providers: Hyperliquid BTC volume, ANU, and TickerLayer BTCUSD/ETHUSD lastTrade with one shared TickerLayer signer. Each 200-block epoch commits the complete signed API3 response before starting. Requests pin epoch ID/hash in fixed-key VRF input and submit only the real proof. Missing commitment rejects requests without retaining fees. Installing instructions does not authorize deployment, spending, publishing or service launch.

Maintainers: read AGENTS.md, update from reviewed source and validate all five skills with skill-creator quick_validate.py. Keep secrets, user assets and copied cryptographic implementations out of skills.

Live API3/local-chain replay fixtures cover all four recipe slots in SDK validation. The four-recipe update is pinned to canonical keeper commit `dcca615b3e07f273e45fa5596f80b63da241896a`; the SDK packaging commit is `67d6b0113c92d860b3771ba9e496fa716d17d9ec`. A known healthy-with-missing-epoch gap remains open; these guides do not establish a public service guarantee.
