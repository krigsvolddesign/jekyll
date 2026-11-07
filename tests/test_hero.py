"""Keep the exact approved artwork and its standalone source distribution."""
import hashlib
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
APPROVED = {
    'assets/images/hero/krigsvold-hero-master.png': '11ab8f82242fc0d51232c9e7f1603f30d69a9234024b09effc3f579176bb81ef',
    'assets/images/hero/krigsvold-hero-2172.webp': 'e967893b399f8e13041b011a71cb55440b44340e140050e0408d6f7b0ad158e5',
    'assets/images/hero/krigsvold-hero-1920.webp': '639455d5bfa4fb482730a064926cb16064273ec7c6ddf81ab65a185d35588ea4',
    'assets/images/hero/krigsvold-hero-1440.webp': 'fe8a40b8a9e0fd00c6e71ccdb4b2d67ef1035eb85639f70035db55b61c082505',
    'assets/images/hero/krigsvold-hero-960.webp': '332e766837f33a5acf4d61df3ed800fdc78ff5acf628abbe8e81b978c6cb43fd',
    'assets/images/hero/krigsvold-hero-640.webp': 'ad25f988dbde7dc9b485a937cb678995088bc50e7fc727e75d7ad901be81e434',
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
        original = next(f for f in manifest['files'] if f['role'] == 'archival-master')
        self.assertEqual((original['width'], original['height']), (2172, 724))

    def test_standalone_source_archive_retains_assets_and_attribution(self):
        entries = json.loads((ROOT/'nightjar/source-files.json').read_text())
        for path in [*APPROVED, 'assets/images/hero/provenance.json', 'README.md']:
            self.assertIn(path, entries)


if __name__ == '__main__':
    unittest.main()
