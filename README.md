> **Standalone source:** `krigsvolddesign/jekyll` is the authoritative Jekyll implementation. Its 50 recipes follow the shared workbench contract. Historical source attribution remains in `nightjar/PROVENANCE.json`.

# Krigsvold Jekyll

A genuine Jekyll template using the consolidated Krigsvold Astro shell.

- `bundle install`
- `bundle exec jekyll serve`
- `bundle exec jekyll build --destination dist`

Layouts: default, wide page with optional left index, and narrow post with inline contents. Date, author, summary, and tags live in the masthead. Header/footer are shared includes; navigation and site identity are configurable. Appearance is progressive enhancement; content and links remain available without JavaScript.

The exported CSS is vendored intact, with its SHA-256 in `_data/shell.json`. Fonts and marks are self-hosted. Jekyll adaptations are separate. Original source websites are untouched.

Static hosting settings: build `bundle exec jekyll build --destination dist`; output `dist`. Suggested domain `jekyll.krigsvolddesign.dev`. The same deterministic static output can be served by a private-source host without a runtime R2 binding.

## Complete example library

Browse `/examples/` for 50 matching content recipes. This standalone export contains its content in `_data/examples.json`, composition layouts in `_layouts/example-*.html`, and reusable section/class includes in `_includes/examples/`. The shared styles and browser enhancements live in `assets/css/examples.css` and `assets/js/examples.js`; the family's composition rules live in `assets/css/examples-family.css`.

Shared recipe definitions, representative fixture data and conformance schemas remain coordinated in [design-workbench](https://github.com/k3jph/design-workbench). This repository owns the Jekyll templates, styles, behaviors and standalone source releases. Port shared contract changes through conformance checks rather than overwriting the independent implementation. See `docs/archetypes/` for the shared contract and porting boundaries.

The source-download link is enabled only by the workbench archive build. Ordinary standalone Jekyll builds omit it unless an archive is explicitly provided with `source_archive: true`.

## Versioned source releases

The repository ships reproducible `source.zip` and `SHA256SUMS` assets from protected `v1.0.0`-style tags on main first-parent history. Build root and `/preview` with `python3 nightjar/build.py --destination /absolute/output [--baseurl /preview]`; both builds contain identical source ZIP bytes. Source releases retain the vendored historical theme CSS, fonts, licenses and registry integrity recorded in `scripts/source-shell-provenance.json`; they do not invent a Core package dependency.

The advanced remote R2 archive is explicitly disabled by `release-policy.json`. The normal static documentation and source-download path remains supported and verified. This release does not claim administrator-proof storage or independent anti-rollback protection.

## Approved polar panoramic hero

The homepage opts into `hero_image` with the original maintainer-approved Antarctic
panorama from design-workbench issues [#88](https://github.com/k3jph/design-workbench/issues/88)
and [#89](https://github.com/k3jph/design-workbench/issues/89). The supplied 1536 × 509
WebP and its 960 × 318 / 640 × 212 derivatives are committed unchanged under
`assets/images/hero/`; `provenance.json` records source-archive and per-file SHA-256,
byte sizes and the maintainer's supplied-artwork authorization. No external image
service or later 16:9 regeneration is used. The original is 82,654 bytes; the
mobile derivative is 14,446 bytes.

The optional `hero_image_640` / `hero_image_960` fields enable responsive `srcset`;
`hero_image_width` / `hero_image_height` reserve the intrinsic aspect ratio. The
picture is decorative, uses empty alternative text and is hidden from assistive
technology; the existing heading and supporting text carry the page meaning. It
is requested eagerly with high fetch priority, not loaded by JavaScript. Other
pages keep their image-free masthead. Forced colors and print suppress the image.

The original [krigsvold.org](https://krigsvold.org/) remains the visual authority.
Its source-derived Roboto / Roboto Slab roles, navy `#061325` / `#0a1d35`, ice and
paper colors, navigation and masthead geometry are unchanged. This host-owned
image and navy/ice scrim are an explicit illustration extension. In particular,
only the illustrated masthead retains white-on-image type in dark appearance;
plain mastheads retain the shell's existing paper/ink inverse composition.
Tablet/mobile use a stronger scrim; mobile crops toward the glacier at 65%.

From a repository checkout, `npm run test:hero` (optionally `BROWSER=firefox` or `BROWSER=webkit`) builds the
locked Jekyll toolchain at root and `/preview`, verifies all supplied image hashes,
loads the real responsive image at 320/768/1440px with JavaScript enabled and
disabled in both appearances, checks the scrim's conservative white-image
contrast bound and automated accessibility, then checks forced colors, print,
image-free fallback and opt-in boundaries. `HERO_EVIDENCE_DIR` retains screenshots
and a JSON report. Screenshot review and comparison with the canonical website
remain separate from these automated checks; no manual assistive-technology
certification is claimed.
