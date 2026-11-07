# Jekyll source-release recovery

The source-release workflow is enabled under Issue #81 standing authorization. A versioned release follows GitFlow and requires a protected immutable tag identifying the exact `VERSION` on main first-parent history. The guard rechecks remote main and tag identity. No npm publication is involved.

If a run stops before GitHub Release creation, preserve the run and its source archive and investigate the failing check. Never replace a tag. If creation might have succeeded, inspect the existing release and download both `source.zip` and `SHA256SUMS` from GitHub; verify the checksum against the source archive retained by the original run, confirm the exact repository, tag, commit, version and approved build. If any result differs or cannot be established, stop and investigate; never overwrite assets or retry publication automatically. If the release and assets are present and exactly match, record the run and recovery evidence. If a release exists with missing assets, coordinate manual recovery only after comparing the retained build, immutable tag and existing assets. Re-running the release job is intentionally rejected whenever a release already exists.

The ordinary static documentation/source path is verified explicitly; advanced remote archive serving is disabled in `release-policy.json`. No administrator-immutable archive or independent anti-rollback guarantee is asserted. Protected tag rules remain mandatory for source release execution.

The release guard compares fetched `origin/main` with the live remote main tip before trusting first-parent ancestry. Missing or stale production refs fail closed; review remote changes, fetch approved main, and retry verification. This does not replace administrator-enforced protection or prove later concurrent branch updates cannot occur.

## GitHub acceptance and production delivery

Follow the ratified [GitFlow acceptance and deployment authority](https://github.com/k3jph/design-workbench/blob/develop/docs/GITFLOW-ACCEPTANCE.md). Integration into protected `develop` or `main` is the acceptance event. This repository has one fast required check, `verify`, and zero required human reviewers; extended browser, archive and visual suites are advisory. Candidate branches may fail without becoming accepted branches.

Cloudflare delivers the exact current accepted branch. It verifies the local checkout, builder-reported branch/SHA, public Git ref, deterministic artifact and live bytes. It does not query PRs, reviewer approvals, commit check-runs or historical CI results. A failed source-identity or artifact-integrity check remains a failure, and the controlled rollback behavior is retained.

Source publication remains separate from deployment. The protected tag, matching `VERSION`, eligible main first-parent history, deterministic archives, checksums and existing-release rejection above remain mandatory. Never overwrite a tag, release or asset, and never publish npm packages through this Jekyll workflow.
