from pathlib import Path

QA = Path(r'C:\tmp\ss-world-engine-20260712\experiments\world-factory\2026-07-12\five-family-proof-v1\qa')

path = QA / 'test_browser_artifact_integrity.py'
text = path.read_text(encoding='utf-8')
text = text.replace(
    "'worker': {'id': 'browser-worker', 'version': 'v4'},\n",
    "'worker': {\n                'id': 'browser-worker',\n                'version': module.WORKER_VERSION,\n            },\n            'harness': deepcopy(module.HARNESS),\n",
)
path.write_text(text, encoding='utf-8')

path = QA / 'test_request_inventory_attacks.py'
text = path.read_text(encoding='utf-8')
needle = """            self.assertFalse(
                validate_request_inventory(attack, bundle), field,
            )


if __name__ == '__main__':
"""
replacement = """            self.assertFalse(
                validate_request_inventory(attack, bundle), field,
            )

        attacks = []
        missing = deepcopy(receipt)
        missing['controlledFaultInjections'] = []
        resign(missing)
        attacks.append(missing)
        duplicate = deepcopy(receipt)
        duplicate['controlledFaultInjections'][0]['expectedCount'] = 2
        duplicate['controlledFaultInjections'][0]['occurrences'] = 2
        duplicate['requestCount'] += 1
        resign(duplicate)
        attacks.append(duplicate)
        wrong_file = deepcopy(receipt)
        fault = wrong_file['controlledFaultInjections'][0]
        css = next(item for item in bundle['files'] if item['path'].endswith('.css'))
        fault.update(
            path=css['path'], expectedBundleSha256=css['sha256'],
            resourceType='stylesheet',
        )
        resign(wrong_file)
        attacks.append(wrong_file)
        redirect = deepcopy(receipt)
        redirect['controlledFaultInjections'][0]['status'] = 204
        resign(redirect)
        attacks.append(redirect)
        self.assertTrue(all(
            not validate_request_inventory(attack, bundle)
            for attack in attacks
        ))

    def test_png_bundle_without_exact_controlled_fault_is_blocked(self) -> None:
        base = 'http://127.0.0.1:45123'
        image = b'real-image'
        bundle = _site_bundle()
        bundle['files'].append({
            'path': 'assets/hero.png',
            'sha256': hashlib.sha256(image).hexdigest(),
            'bytes': len(image),
        })
        inventory, page = RequestInventory(base, 'site:demo'), _FakePage()
        inventory.attach(page)
        _emit_success(page, _FakeRequest(f'{base}/sites/demo/index.html'))
        _emit_success(
            page, _FakeRequest(f'{base}/sites/demo/styles.css', 'stylesheet'),
            body=b'css',
        )
        _emit_success(
            page, _FakeRequest(f'{base}/assets/hero.png', 'image'), body=image,
        )

        receipt = inventory.receipt(bundle)

        self.assertEqual(receipt['verdict'], 'BLOCKED')
        self.assertEqual(receipt['missingControlRequests'], ['assets/hero.png'])
        forged = deepcopy(receipt)
        forged['verdict'] = 'PASS'
        resign(forged)
        self.assertFalse(validate_request_inventory(forged, bundle))


if __name__ == '__main__':
"""
if needle not in text:
    raise SystemExit('request attack insertion point missing')
path.write_text(text.replace(needle, replacement), encoding='utf-8')

(QA / 'test_browser_proof_validation.py').write_text(r'''"""Fail-first tests for the dependency-neutral browser proof validator."""
from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from PIL import Image

from browser_artifact_evidence import screenshot_receipt
from browser_proof_validation import (
    VIEWPORTS, site_proof_errors, site_screenshot_receipts_valid,
    validated_worker_assignments,
)
from bundle_evidence import SITES


def _write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value), encoding='utf-8')


class BrowserProofValidationTests(unittest.TestCase):
    def test_worker_assignments_are_bound_to_every_site_authorship(self) -> None:
        with TemporaryDirectory() as folder:
            run_root = Path(folder)
            assignments = {site: 'codex:gpt-5:/root' for site in SITES}
            _write_json(run_root / 'run-manifest.json', {
                'reviewPolicy': {'workerAssignments': assignments},
            })
            for site in SITES:
                _write_json(run_root / 'sites' / site / 'site-manifest.json', {
                    'authorship': {'workerIdentity': assignments[site]},
                })

            self.assertEqual(
                validated_worker_assignments(run_root), assignments,
            )
            _write_json(
                run_root / 'sites' / SITES[0] / 'site-manifest.json',
                {'authorship': {'workerIdentity': 'forged:worker'}},
            )
            with self.assertRaises(ValueError):
                validated_worker_assignments(run_root)

    def test_site_screenshot_set_binds_paths_widths_and_excludes_targeted(self) -> None:
        with TemporaryDirectory() as folder:
            run_root = Path(folder)
            site = 'demo'
            matrix = []
            for width, height in VIEWPORTS:
                item = {'viewport': f'{width}x{height}', 'screenshot': None}
                if width in {414, 1440, 3840}:
                    path = run_root / 'qa' / 'screenshots' / f'{site}-{width}x{height}.png'
                    path.parent.mkdir(parents=True, exist_ok=True)
                    Image.new('RGB', (width, 8), '#123456').save(path)
                    item['screenshot'] = screenshot_receipt(path, run_root)
                matrix.append(item)
            acts = []
            for index in range(1, 5):
                path = run_root / 'qa' / 'screenshots' / 'acts' / f'{site}-act-{index}.png'
                path.parent.mkdir(parents=True, exist_ok=True)
                Image.new('RGB', (120, 40), '#654321').save(path)
                acts.append({
                    'act': index, 'screenshot': screenshot_receipt(path, run_root),
                })
            targeted = run_root / 'qa' / 'screenshots' / 'targeted' / 'manual.png'
            targeted.parent.mkdir(parents=True)
            Image.new('RGB', (10, 10), '#abcdef').save(targeted)
            evidence = {
                'matrix': matrix,
                'flows': {'captures': {'acts': acts}},
            }

            self.assertTrue(
                site_screenshot_receipts_valid(evidence, run_root, site)
            )
            forged = deepcopy(evidence)
            forged['matrix'][2]['screenshot']['width'] = 413
            self.assertFalse(
                site_screenshot_receipts_valid(forged, run_root, site)
            )
            stale = run_root / 'qa' / 'screenshots' / 'acts' / f'{site}-act-5.png'
            Image.new('RGB', (120, 40), '#000000').save(stale)
            self.assertFalse(
                site_screenshot_receipts_valid(evidence, run_root, site)
            )

    def test_site_proof_rejects_invalid_performance_even_if_other_gates_pass(self) -> None:
        bundle = {'complete': True, 'files': [], 'contentSha256': 'a' * 64}
        evidence = {
            'verdict': 'PASS', 'testedBundle': bundle,
            'requestInventory': {}, 'flows': {'performance': {}},
        }
        with patch('browser_proof_validation.bundle_receipt', return_value=bundle), \
                patch('browser_proof_validation.site_browser_errors', return_value=[]), \
                patch('browser_proof_validation.validate_request_inventory', return_value=True), \
                patch('browser_proof_validation.validate_evidence_artifact', return_value=True), \
                patch('browser_proof_validation.expected_site_worker', return_value=None), \
                patch('browser_proof_validation.site_screenshot_receipts_valid', return_value=True), \
                patch('browser_proof_validation.validate_performance_receipt', return_value=False):
            errors = site_proof_errors('schema', evidence, Path('.'), 'demo')

        self.assertIn('calibrated performance receipt is invalid', errors)


if __name__ == '__main__':
    unittest.main()
''', encoding='utf-8')
