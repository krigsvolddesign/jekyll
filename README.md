> **Standalone source:** `krigsvolddesign/jekyll` is the authoritative Jekyll implementation. Its 50 recipes follow the shared workbench contract. Historical source attribution remains in `nightjar/PROVENANCE.json`.

# Krigsvold Jekyll

A genuine Jekyll template using the consolidated Krigsvold Astro shell.

- `bundle install`
- `bundle exec jekyll serve`
- `bundle exec jekyll build --destination dist`

Layouts provide the shared shell, documents, and narrow posts. Krigsvold does not add contents indexes by default. Authors may write section links by hand or explicitly opt into an inline contents block; no sidebar or index margin is reserved. Date, author, summary, and tags live in the masthead. Header/footer are shared includes; navigation and site identity are configurable. Appearance is progressive enhancement; content and links remain available without JavaScript.

The exported CSS is vendored intact, with its SHA-256 in `_data/shell.json`. Fonts and marks are self-hosted. Jekyll adaptations are separate. Original source websites are untouched.

Static hosting settings: build `bundle exec jekyll build --destination dist`; output `dist`. Suggested domain `jekyll.krigsvolddesign.dev`. The same deterministic static output can be served by a private-source host without a runtime R2 binding.

## Optional inline contents

Stock pages and all 50 examples begin with their content. To request a contents block for a specific document, set an explicit Boolean flag and supply the section destinations in front matter:

```yaml
show_toc: true
toc:
  - {id: relationships, title: Relationships}
  - {id: hierarchy, title: Hierarchy}
```

Use the exact rendered heading IDs in these destinations (for example, `## Relationships` produces `relationships`). The block appears inline above the article, using the existing `toc` style. Example layouts also accept `show_toc: true`; a manually supplied `toc` list takes precedence, otherwise that example's existing section IDs are used. Omit the flag to render no block. Handwritten `<nav aria-label="On this page">` links in page content remain a normal author choice.

## Complete example library

Browse `/examples/` for 50 matching content recipes. This standalone export contains its content in `_data/examples.json`, composition layouts in `_layouts/example-*.html`, and reusable section/class includes in `_includes/examples/`. The Core stylesheet is copied to `assets/css/krigsvold.css`; browser enhancements live in `assets/js/examples.js`.

Shared recipe definitions, representative fixture data and conformance schemas remain coordinated in [design-workbench](https://github.com/k3jph/design-workbench). This repository owns the Jekyll templates, behaviors and standalone source releases; Core owns stylesheet definitions. Port shared contract changes through conformance checks rather than overwriting the independent implementation. See `docs/archetypes/` for the shared contract and porting boundaries.

The source-download link is enabled only by the workbench archive build. Ordinary standalone Jekyll builds omit it unless an archive is explicitly provided with `source_archive: true`.

## Versioned source releases

The repository ships reproducible `source.zip` and `SHA256SUMS` assets from protected `v1.0.0`-style tags on main first-parent history. Build root and `/preview` with `python3 nightjar/build.py --destination /absolute/output [--baseurl /preview]`; both builds contain identical source ZIP bytes. Source archives include the generated Core CSS and its asset manifest, alongside the historical shell provenance, fonts and licenses. Building an archive with Jekyll does not require Node; Node verifies and refreshes the committed Core assets during development.

The advanced remote R2 archive is explicitly disabled by `release-policy.json`. The normal static documentation and source-download path remains supported and verified. This release does not claim administrator-proof storage or independent anti-rollback protection.

## Approved responsive polar panorama

The homepage uses the maintainer-approved 2172 × 724 Antarctic ice-shelf image
from `martlet-krigsvold-approved-responsive-heroes.zip`. This selection supersedes
the earlier 1536 × 509 candidate. The lossless master and supplied 640/960/1440/1920/
2172 WebP derivatives are committed byte-for-byte under `assets/images/hero/`;
`provenance.json` records supplied checksums, dimensions and authorization. The
optional 16:9 crop is not used. No tint is baked into an image and no image is
hotlinked. The archival PNG is never requested by the homepage; responsive WebP
requests range from 31,130 bytes at 640px to244,712 bytes at 2172px.

The existing Krigsvold overlay is **unchanged**: both gradient declarations keep
their original colors, opacity values and stops from develop commit `244d228`. Foundation
colors, fonts, navigation and image-free pages remain unchanged. Unlike Martlet's
new gold contextual treatment, this host keeps its current polar composition.

At the source navigation breakpoint (below 992px), navigation precedes a complete
3:1 image band, followed by the heading and supporting text on the existing navy
field. The image is never cropped to a portrait background or hidden underneath
the navigation. Desktop uses `object-fit: contain` and a 470–724px responsive
masthead, preserving the whole composition at standard and ultrawide sizes.

The optional `hero_image_640`, `hero_image_960`, `hero_image_1440` and `hero_image_1920` fields form a responsive
`srcset`; `hero_image_width`/`hero_image_height` reserve intrinsic geometry.
Decorative image semantics, eager high-priority loading, no-JavaScript support,
image-free fallback, forced-color image suppression and print fallback remain.
The forced-color mobile button retains the visible Menu/Close system-color cue,
native accessible name, keyboard activation and Escape focus restoration.

From a repository checkout, `npm run test:hero` (optionally `BROWSER=firefox` or
`BROWSER=webkit`) builds the locked toolchain at root and `/preview`; verifies all
supplied hashes and the unchanged gradient declarations; exercises 320, 375, 640,
768, 1024, 1440 and 1920px in light/dark with JavaScript on/off; checks full mobile
composition, navigation clearance, contrast, opt-in boundaries, print and forced
colors; and runs axe without claiming manual assistive-technology certification.
`HERO_EVIDENCE_DIR` retains screenshots and JSON. Rendered visual comparison
against [krigsvold.org](https://krigsvold.org/) remains independent evidence.

### Shared stylesheet ownership

All reference CSS is exported by `@krigsvold/core`. Astro and Jekyll use identical `krigsvold.css` and `fonts.css` files. Edit Core, update the exact dependency and lockfile, then run `npm run styles:sync`. Development previews may pin a full Core Git commit; this does not require an npm release. Publishing a new package is a separate release decision. `npm run styles:check` rejects edited or extra CSS assets. The generated asset manifest records the package version, dependency source and SHA-256 of each file.

Page templates and client code must not contain style elements, style attributes, CSS mutation calls, or local stylesheet definitions. Source and rendered-page checks enforce this. Use the Core markup classes and named data attributes instead.
