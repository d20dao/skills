# Maintaining D20 skills

- Keep changes scoped to agent instructions; protocol code belongs in d20dao/keeper and SDK packaging in d20dao/d20-sdk.
- Verify behavior against source and tests, not marketing descriptions. ArcDao and ArcVRF remain actual code identifiers; do not rename imports to D20 without a corresponding package release.
- Each `skills/<name>/SKILL.md` needs YAML `name` and `description`, with a matching lowercase hyphenated folder name. Keep every installed folder self-contained.
- Before changing version-sensitive guidance, read the source repository's AGENTS.md and compare the target revision, ABI, SDK provenance and deployment configuration. Record reviewed revisions in the compatibility notes; uncommitted source is not a release.
- Never infer production readiness, service availability, npm publication or source activation from catalog membership or successful local tests.
- Preserve exact-fee requests, fixed refund recipients, 60-second onchain proof acceptance, immutable mapping/key/input, authenticated callbacks and same-result retries. No reroll or source fallback.
- Keep keeper keys and test prover code out of consumer/browser examples. Never include actual credentials, journals or user assets.
- Validate frontmatter and linked references. For executable examples, use the canonical build/test workflow and record what ran. Do not imply text validation proves protocol security.
- Ordinary documentation work does not authorize deployment, paid API calls, real transactions or package release.
