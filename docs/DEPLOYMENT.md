# Native Cloudflare Jekyll delivery

Jekyll builds the site. Cloudflare Workers serves the generated static HTML, CSS, fonts and locally hosted images; it does not execute Ruby at request time.

The build command is `bash scripts/deployment/build-cloudflare.sh`. That script runs locked Bundler/Jekyll directly for root and `/preview`. Python only stages the source allowlist, verifies provenance, creates the deterministic source ZIP, retains frozen documentation, and hashes the already-built output. It does not invoke Ruby. Committed `.ruby-version` and `.node-version` files pin Ruby 3.2.11 and Node 24.19.0; no dashboard runtime or build variables are required. Bundler remains 2.4.19 and the existing Gemfile.lock pins Jekyll 4.3.2. Cloudflare may perform its normal dependency installation before the command; the script still explicitly verifies and installs the locked dependencies. `SKIP_DEPENDENCY_INSTALL=true` is an optional build-only optimization, never a runtime binding or a prerequisite. The integrity-locked local Wrangler is 4.156.2.

## Native Git build command fields

Replace each entire command field; do not append these commands to a generated `npm run build` or another existing value. Both repositories use the same three fields. No dashboard variables are mandatory.

Build command:

```sh
bash scripts/deployment/build-cloudflare.sh
```

Nonproduction / Preview command:

```sh
bash scripts/deployment/preview-cloudflare.sh
```

Production deploy command:

```sh
bash scripts/deployment/deploy-cloudflare.sh
```

These are the intended saved Cloudflare settings, not proof of the current dashboard configuration. During an explicitly requested validation pause, `exit 1` can replace the production deploy command; restore the main-only production script when production promotion is authorized. A manual nonproduction upload is identified as manual evidence; it does not establish that the native Git-triggered build deployed successfully.

## GitFlow and one native deployment authority

The canonical policy is [GitFlow acceptance and deployment authority](https://github.com/k3jph/design-workbench/blob/develop/docs/GITFLOW-ACCEPTANCE.md). Feature PRs target `develop`; release promotions target `main`. Integration into either protected branch is the acceptance event. This repository requires exactly one fast GitHub Actions check, `verify`, and zero human reviewers. Browser, compatibility, visual, archive and other extended suites remain enabled as advisory quality measurements. Candidate branches may fail while work continues.

Cloudflare builds the exact current accepted branch through its native Git connection: `develop` authorizes development delivery and `main` authorizes production delivery. Its guard checks the local checkout, native builder-reported branch/SHA and current public Git ref, then validates the deterministic artifact. It does not query pull requests, reviews, check-runs or historical CI results, and does not reconstruct GitHub's acceptance decision. Missing source identity or artifact integrity still fails safely.

Cloudflare's documented Preview Builds switch triggers a preview build on every nonproduction branch push; it is not a develop-only filter. Candidate branches can build isolated, noindex previews on a best-effort basis without a PR, review or successful advisory suite. A candidate preview is not acceptance or production authority. Only the current accepted `develop` commit may update the stable develop Preview. See [Cloudflare build branches](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/).

Cloudflare supplies `WORKERS_CI_BRANCH`; the build selects that Git branch automatically. `JEKYLL_DEPLOY_BRANCH` is only an explicit local override when Cloudflare CI does not supply a branch; conflicting values are rejected before any build or deployment command. For the develop Preview, use the native nonproduction deploy command `bash scripts/deployment/preview-cloudflare.sh`. This invokes only `wrangler preview --name develop --ignore-base-config`, never production `wrangler deploy`. The exact parent Worker and supported native Preview URL are pinned in `infra/deployment/site.json`. The actual addresses are `develop-martletdesign-jekyll-reference.k3jph.workers.dev` and `develop-krigsvolddesign-jekyll-reference.k3jph.workers.dev`; the shorter proposed names would require different parent Workers. Preview runtime variables, secrets and bindings must be empty. Preview responses send `X-Robots-Tag: noindex, nofollow, noarchive` and a disallow-all robots.txt.

After GitFlow integration accepts the production changes into `main`, the production native command is `bash scripts/deployment/deploy-cloudflare.sh`. It requires Cloudflare’s main branch, the exact current accepted main SHA and a matching verified artifact; it cannot accept develop or a candidate branch. GitHub owns PR integration and its required check, so Cloudflare requires no additional human approval, PR-history query or CI-history gate. Verify the actual production URL and source SHA after delivery; a successful merge or build alone is not deployment proof. Existing production Worker names, custom domains and routes remain unchanged; generated Wrangler configuration does not publish or replace routes.

Native Builds configuration requires a **user-scoped** token, which differs from a build deployment token. Account-owned tokens returning Invalid token do not establish a native Git connection. Do not claim a connection is active until Cloudflare settings/readback and an automatic Git-triggered build prove it. Do not enable a competing Actions deployment workflow. Connecting an existing production Worker may start an initial build; use a fail-closed paused production command during setup, never assume connection creation is nondeploying. Preview auto-build switches and Git connections must be read back from actual Cloudflare state.

## Authority and artifact boundaries

Use narrowly scoped build credentials and separate preview/production build settings. Native preview runtime isolation is distinct from build-token permissions: a parent-Worker Editor token may authorize production writes as well as previews. Do not claim that a preview-only deploy command makes that token preview-only. The supplied preview command cannot call production deploy, ignores dashboard Preview base bindings, and checks the generated configuration has empty runtime variables and bindings. It also rejects any nonempty runtime environment reported by the CLI. The CLI may omit that optional field: the receipt then retains `deploymentEnvFieldPresent=false` and `completeBindingReadbackClaimed=false`; omission is not a complete runtime-binding readback. Any unresolved build-credential permission boundary must remain explicitly documented rather than silently accepting a broad account-wide token. Individual Worker Editor credentials can still configure bindings; the empty generated configuration and readback are therefore required checks.

`infra/deployment/history.json` pins an archive of the existing `/docs/` and `/preview/docs/` history. Complete original file inventories and live manifests/source ZIPs were verified before capture. Extraction accepts only exact pinned regular files under those prefixes, rejects traversal/overwrites and never rebuilds v1.0.0 using new hero source. Original licenses, attribution and published ZIP bytes remain intact.

Current root and `/preview` source ZIPs are deterministic snapshots of the checked source allowlist. Frozen v1.0.0 history and existing published release assets remain intact. Deployment does not create a version tag or GitHub Release: source publication separately requires a unique protected tag on eligible main history, the matching `VERSION`, deterministic `source.zip` and verified `SHA256SUMS`. No npm publication is performed. Advanced R2 remains disabled.

Native `_headers` adds `Cache-Control: public, no-transform`, preventing automatic edge beacon injection or HTML changes without altering other sites' zone analytics. Deployment extras are outside frozen snapshots.

## Provenance, verification and rollback

`/.well-known/deployment.json` identifies repository, branch, full source SHA/tree, build timestamp, source ZIP hash, frozen-history digest, artifact inventory hash, target Worker and URL. `deployment-inventory.json` identifies all payload files; only those two self-referential manifests are excluded from the payload hash, and both are separately checked by exact live bytes.

The native Preview receipt logs actual preview and deployment IDs, URLs, source SHA, time, artifact hash, configured empty runtime variables/bindings, the CLI runtime-environment field-presence evidence, and verified live file count. When the optional CLI environment field is omitted, it explicitly records `completeBindingReadbackClaimed=false` rather than inferring an empty runtime readback. Full HTTPS byte comparison covers the public payload, local images, root, `/preview` and frozen documentation. HTML must retain no-transform, and development must retain noindex. It does not assert external website availability, manual accessibility certification or visual fidelity.

The main-only production helper records the prior single-version deployment, publishes exactly the checked artifact, reads actual version/deployment IDs, checks bindings and compares live bytes. Failed verification remains a failure. It restores the previous version only when the failed current version bears this job's exact source annotation and no newer actor replaced it; it will not overwrite another deployment. Rollback failures are reported explicitly. Preserve native build logs/receipts and the last-good revision.

Visual review still compares actual desktop/tablet/mobile, light/dark, imagery, source typography, navigation and cropping against jameshoward.us and krigsvold.org. Automated checks alone do not certify visual fidelity.

Live payload verification has a 300-second overall deadline, at most four in-flight requests, and a 25-second whole-request deadline. A 404 or a 200 response containing stale bytes may retry with capped exponential backoff for at most 30 seconds per file, within the same overall deadline. Matching bytes must still pass every header assertion; transport failures and other HTTP errors remain failures without retry. Permanent mismatch diagnostics include the path, attempt count, status, byte counts and expected/actual SHA-256. Cancellation stops further retries and unwinds within at most 30 additional seconds. The Preview upload command has its own 300-second limit. Failed checks and timeouts remain failures.

When Cloudflare supplies its documented native build UUID, commit and branch, `.well-known/deployment.json` records those three validated, whitelisted fields in `cloudflareBuild`. Builds outside native Cloudflare CI record `null`. These are environment-reported identifiers, not independent attestation; preserve the corresponding native build log/link to prove the trigger. No credentials or other environment values are copied.
