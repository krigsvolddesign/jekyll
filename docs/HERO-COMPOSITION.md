# Host hero composition

The host selects artwork and content; the design language supplies typography,
spacing, tint, and responsive composition. No shared Core asset is replaced.

| `hero_variant` | Use | Image behavior |
|---|---|---|
| `signature` | Homepage only | Existing approved panorama and exact polar tint; palette ribbon follows |
| `section` | Language, Examples, Journal | Distinct local photograph; 320px conventional desktop masthead; complete image band above text below the navigation breakpoint |
| `compact` | Articles, docs, example details, setup | Restrained polar heading; no cinematic image |
| `plain` | Utility/support | Restrained paper heading with opaque polar navigation |

The default is compact. Existing homepage `hero_image` front matter still selects
signature. Legacy interior image front matter selects section. Signature requested
on an interior page resolves to compact. Unknown names resolve to compact.
Dashboards keep their existing application layout and do not receive a masthead.

Image-backed variants accept the existing `hero_image`, `hero_image_640`,
`hero_image_960`, `hero_image_1440`, `hero_image_1920`, `hero_image_width`, and
`hero_image_height` fields. A `hero_image_variants` array of `{url, width}` entries is also supported
for portable responsive metadata. `hero_focal_point` optionally supplies CSS object-position
(default center). Images are decorative: content titles and descriptions remain
ordinary HTML; missing JavaScript does not remove them. Forced colors suppresses
photography and tint in favor of system colors. The section asset provenance
records original source, license, dimensions, hashes, and derivative generation.

The homepage's existing overlays, canonical shell CSS, tokens, fonts, and frozen
archive snapshots remain unchanged. Compact interior composition is host CSS, not
a token replacement. Astro and React can adopt the same four semantic variants
and metadata fields under cross-framework issue #88; Jekyll completion does not
require publishing packages. Tracking and rendered review belong to workbench #90.

## Source review

The hosted Krigsvold MCP snapshot 0.3.0 at workbench commit
`39d664082bb0dbdb09bc182a6abffebef75518ff`, digest
`4ace73f9d74fd4ba9442a42117e56bbd0d4cd23e24bda211d5149f91b127074c`,
was consulted for grammar, builder method, and source decisions. Canonical origin
remains krigsvold.org. Roboto/Roboto Slab, polar roles, contained navy navbar,
and uppercase labels are retained source rules. The shorter section masthead,
compact/plain selectors, and locally licensed photographs are explicit host
composition extensions requested in #90, not new canonical token definitions.
