"""Exercise actual Liquid variant resolution, not a second implementation."""
import json
import hashlib
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class HeroContractTests(unittest.TestCase):
    def test_local_section_assets_match_licensed_provenance_and_source_archive(self):
        index = json.loads((ROOT/'assets/images/sections/provenance-index.json').read_text())
        allowlist = json.loads((ROOT/'nightjar/source-files.json').read_text())
        self.assertEqual(len(index['assets']), 3)
        self.assertEqual(len({x['sourceSha256'] for x in index['assets']}), 3)
        for asset in index['assets']:
            self.assertIn(asset['license'], ['CC BY 4.0', 'CC BY 3.0', 'Public domain'])
            self.assertTrue(asset['author'])
            self.assertTrue(asset['sourcePage'].startswith('https://commons.wikimedia.org/'))
            original = ROOT/asset['originalFile']
            self.assertEqual(hashlib.sha256(original.read_bytes()).hexdigest(), asset['sourceSha256'])
            self.assertIn(asset['originalFile'], allowlist)
            self.assertEqual([d['width'] for d in asset['derivatives']], [640, 960, 1440, 1920])
            for derivative in asset['derivatives']:
                data = (ROOT/derivative['path']).read_bytes()
                self.assertEqual(hashlib.sha256(data).hexdigest(), derivative['sha256'])
                self.assertEqual(len(data), derivative['bytes'])
                self.assertIn(derivative['path'], allowlist)

    def test_actual_liquid_resolution_preserves_legacy_and_restrains_interiors(self):
        cases = [
            ({'url': '/', 'hero_image': '/local.webp'}, 'signature|true'),
            ({'url': '/article/', 'hero_image': '/local.webp'}, 'section|true'),
            ({'url': '/article/'}, 'compact|false'),
            ({'url': '/article/', 'hero_variant': 'plain', 'hero_image': '/local.webp'}, 'plain|false'),
            ({'url': '/article/', 'hero_variant': 'compact', 'hero_image': '/local.webp'}, 'compact|false'),
            ({'url': '/article/', 'hero_variant': 'signature', 'hero_image': '/local.webp'}, 'compact|false'),
            ({'url': '/article/', 'hero_variant': 'unknown', 'hero_image': '/local.webp'}, 'compact|false'),
            ({'url': '/section/', 'hero_variant': 'section', 'hero_image': '/local.webp'}, 'section|true'),
        ]
        ruby = "require 'liquid'; require 'json'; t=Liquid::Template.parse(File.read('_includes/hero-config.html')+'{{ hero_variant }}|{{ hero_has_image }}'); puts JSON.generate(JSON.parse(STDIN.read).map{|p| t.render!('page'=>p).strip})"
        result = subprocess.run(['bundle', 'exec', 'ruby', '-e', ruby], input=json.dumps([x[0] for x in cases]), text=True, capture_output=True, cwd=ROOT, timeout=30, check=True)
        self.assertEqual(json.loads(result.stdout), [x[1] for x in cases])


if __name__ == '__main__':
    unittest.main()
