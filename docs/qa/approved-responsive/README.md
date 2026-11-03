# Approved responsive hero: local visual evidence

Reviewed frontend code commit: `c9179975461cdd8f3d1d0b0cdb77d2340caf6b87` in `krigsvolddesign/jekyll`.

These are **local candidate screenshots**, not a claim that this new artwork is deployed or automatically connected to Git. Later documentation/deployment-parser commits may retain identical UI; deployed source/asset identity must still be checked through its deployment manifest.

- [Desktop, 1440px, light appearance](desktop-1440-light.png)
- [Mobile, 320px, dark appearance](mobile-320-dark.png)

Independent review covered 320, 375, 640, 768, 1024, 1440, 1920 and 3440px, both appearances, no-JavaScript fallbacks, forced colors, and representative `/preview` cases. All 30 rendered cases passed geometry, supplied image-byte identity, single responsive WebP download and overflow/error checks. The approved 2172×724 masters were directly inspected; artwork pixels were not retinted.

Hero text: 84 conservative actual rendered-background contrast cases passed (minimum 7.342:1). Navigation: 78 actual text/background samples passed (minimum 13.526:1), including top, opened and scrolled states. The minimum requirement is evaluated by text size; normal supporting/navigation text retains 4.5:1.

The original polar tint and gradient declarations remain unchanged. Narrow layouts preserve the whole ice shelf above text; wide layouts retain the full panorama using containment and existing navy letterbox space.

The original source-derived fonts and compositional roles remain; this is a contextual reference masthead, not a pixel-identical canonical homepage. No physical/manual assistive-technology certification is claimed. Full recipe behavior verification belongs to the repository regression suite. Exact asset, screenshot, HTML/CSS hashes and limits are in [visual-review.json](visual-review.json).
