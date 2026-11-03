"""Keep the exact approved artwork and its standalone source distribution."""
import hashlib
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
APPROVED = {
    'assets/images/hero/hero-original.webp': '17b91b3f19262990862648fec1f9dc8df1b6784401b7bf93bbc3821f6020d1dd',
    'assets/images/hero/hero-960.webp': '451bbf708dbd48a2a79252891aae542b5b7694050dd0dc403cea9e36218b7630',
    'assets/images/hero/hero-640.webp': 'cba6e2a3011668ba83e6bc85c04a9ba960edb3bf1d334240655638a84166d874',
}


class ApprovedHeroTests(unittest.TestCase):
    def test_exact_approved_files_and_provenance(self):
        manifest = json.loads((ROOT/'assets/images/hero/provenance.json').read_text())
        self.assertEqual(manifest['family'], 'krigsvold')
        self.assertFalse(manifest['runtimeExternalImageRequests'])
        self.assertEqual({f['path']: f['sha256'] for f in manifest['files']}, APPROVED)
        for entry in manifest['files']:
            data = (ROOT/entry['path']).read_bytes()
            self.assertEqual(hashlib.sha256(data).hexdigest(), APPROVED[entry['path']])
            self.assertEqual(len(data), entry['bytes'])
        original = manifest['files'][0]
        self.assertEqual((original['width'], original['height']), (1536, 509))

    def test_standalone_source_archive_retains_assets_and_attribution(self):
        entries = json.loads((ROOT/'nightjar/source-files.json').read_text())
        for path in [*APPROVED, 'assets/images/hero/provenance.json', 'README.md']:
            self.assertIn(path, entries)


if __name__ == '__main__':
    unittest.main()
