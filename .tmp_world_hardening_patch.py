from pathlib import Path

QA = Path(r'C:\tmp\ss-world-engine-20260712\experiments\world-factory\2026-07-12\five-family-proof-v1\qa')


def write(name: str, value: str) -> None:
    (QA / name).write_text(value, encoding='utf-8')


write('browser_proof_validation.py', r'''"""Dependency-neutral validation for reusable browser proof artifacts."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from browser_artifact_evidence import (
    WORKER_VERSION, screenshot_receipts, validate_evidence_artifact,
    validate_screenshot_receipt,
)
from bundle_evidence import SITES, bundle_receipt, gallery_bundle_receipt
from performance_receipt import validate_performance_receipt
from receipt_validation import site_browser_errors
from request_inventory import validate_request_inventory

REPORT_SCHEMA = 'swan-world-factory.browser-qa.v3'
VIEWPORTS = (
    (320, 800), (375, 812), (414, 896), (768, 1024), (1024, 768),
    (1280, 800), (1440, 900), (1920, 1080), (2560, 1440),
    (3440, 1440), (3840, 2160),
)
SCREENSHOT_WIDTHS = {414, 1440, 3840}


def _read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding='utf-8-sig'))
    if not isinstance(value, dict):
        raise ValueError(f'JSON object required: {path}')
    return value


def validated_worker_assignments(run_root: Path) -> dict[str, str]:
    """Bind each browser worker to policy and canonical site authorship."""
    manifest = _read_json(run_root / 'run-manifest.json')
    assignments = manifest.get('reviewPolicy', {}).get('workerAssignments')
    if not isinstance(assignments, dict) or set(assignments) != set(SITES):
        raise ValueError('Canonical worker assignments must cover exactly five sites.')
    if not all(isinstance(value, str) and bool(value.strip()) for value in assignments.values()):
        raise ValueError('Every canonical worker assignment must be a nonempty identity.')
    for site in SITES:
        site_manifest = _read_json(run_root / 'sites' / site / 'site-manifest.json')
        identity = site_manifest.get('authorship', {}).get('workerIdentity')
        if identity != assignments[site]:
            raise ValueError(f'{site}: authorship worker does not match review policy.')
    return dict(assignments)


def worker_receipt(worker_id: str) -> dict[str, str]:
    return {'id': worker_id, 'version': WORKER_VERSION}


def expected_site_worker(run_root: Path, site: str) -> dict[str, str] | None:
    try:
        return worker_receipt(validated_worker_assignments(run_root)[site])
    except (KeyError, OSError, TypeError, ValueError):
        return None


def site_screenshot_receipts_valid(
    evidence: dict[str, Any], run_root: Path, site: str,
) -> bool:
    matrix = evidence.get('matrix')
    if not isinstance(matrix, list) or len(matrix) != len(VIEWPORTS):
        return False
    expected_matrix: set[str] = set()
    for item, (width, height) in zip(matrix, VIEWPORTS):
        if not isinstance(item, dict) or item.get('viewport') != f'{width}x{height}':
            return False
        screenshot = item.get('screenshot')
        if width in SCREENSHOT_WIDTHS:
            expected_path = f'qa/screenshots/{site}-{width}x{height}.png'
            if not isinstance(screenshot, dict) \
                    or screenshot.get('path') != expected_path \
                    or screenshot.get('width') != width:
                return False
            expected_matrix.add(expected_path)
        elif screenshot is not None:
            return False
    acts = evidence.get('flows', {}).get('captures', {}).get('acts')
    if not isinstance(acts, list) or len(acts) < 4:
        return False
    act_paths: set[str] = set()
    for index, act in enumerate(acts, 1):
        receipt = act.get('screenshot') if isinstance(act, dict) else None
        expected_path = f'qa/screenshots/acts/{site}-act-{index}.png'
        if act.get('act') != index or not isinstance(receipt, dict) \
                or receipt.get('path') != expected_path:
            return False
        act_paths.add(expected_path)
    receipts = list(screenshot_receipts(evidence))
    referenced = {item.get('path') for item in receipts}
    actual = {
        path.relative_to(run_root).as_posix()
        for pattern in (
            f'qa/screenshots/{site}-*.png',
            f'qa/screenshots/acts/{site}-*.png',
        )
        for path in run_root.glob(pattern)
    }
    return (
        referenced == expected_matrix | act_paths
        and referenced == actual
        and all(validate_screenshot_receipt(item, run_root) for item in receipts)
    )


def site_proof_errors(
    schema: Any, evidence: Any, run_root: Path, site: str,
) -> list[str]:
    if not isinstance(evidence, dict):
        return ['site browser evidence is missing']
    errors = list(site_browser_errors(schema, evidence))
    current = bundle_receipt(run_root / 'sites' / site)
    if evidence.get('verdict') != 'PASS':
        errors.append('site browser verdict is not PASS')
    if not current.get('complete') or evidence.get('testedBundle') != current:
        errors.append('tested site bundle is incomplete or stale')
    if not validate_request_inventory(evidence.get('requestInventory'), current):
        errors.append('request inventory is incomplete, stale, or forged')
    if not validate_performance_receipt(evidence.get('flows', {}).get('performance', {})):
        errors.append('calibrated performance receipt is invalid')
    if not validate_evidence_artifact(evidence, 'site'):
        errors.append('site evidence artifact hash or identity is invalid')
    if evidence.get('worker') != expected_site_worker(run_root, site):
        errors.append('site browser worker does not match policy and authorship')
    if not site_screenshot_receipts_valid(evidence, run_root, site):
        errors.append('site screenshot receipt set, bytes, or widths are invalid')
    return errors


def _gallery_navigation_valid(value: Any) -> bool:
    return (
        isinstance(value, dict) and value.get('ok') is True
        and value.get('status') == 200
        and isinstance(value.get('requestedUrl'), str)
        and value.get('state', {}).get('readyState') == 'complete'
    )


def _gallery_screenshot_valid(evidence: dict[str, Any], run_root: Path) -> bool:
    receipts = list(screenshot_receipts(evidence))
    expected = 'qa/screenshots/gallery-1440x900.png'
    actual = {
        path.relative_to(run_root).as_posix()
        for path in run_root.glob('qa/screenshots/gallery-*.png')
    }
    return (
        len(receipts) == 1 and receipts[0].get('path') == expected
        and receipts[0].get('width') == 1440 and actual == {expected}
        and validate_screenshot_receipt(receipts[0], run_root)
    )


def gallery_proof_errors(
    schema: Any, evidence: Any, run_root: Path, expected_pass: int,
    run_sites: list[dict[str, Any]] | None = None,
) -> list[str]:
    if not isinstance(evidence, dict):
        return ['gallery browser evidence is missing']
    errors: list[str] = []
    current = gallery_bundle_receipt(run_root, run_sites)
    if schema != REPORT_SCHEMA or evidence.get('verdict') != 'PASS':
        errors.append('gallery schema or verdict is invalid')
    if evidence.get('defaultVisibleCards') != expected_pass \
            or evidence.get('reviewStateCards') != len(SITES) \
            or not _gallery_navigation_valid(evidence.get('navigation')):
        errors.append('gallery behavior receipt is incomplete')
    if not current.get('complete') or evidence.get('testedBundle') != current:
        errors.append('tested gallery bundle is incomplete or stale')
    if not validate_request_inventory(evidence.get('requestInventory'), current):
        errors.append('gallery request inventory is incomplete, stale, or forged')
    if not validate_evidence_artifact(evidence, 'gallery'):
        errors.append('gallery evidence artifact hash or identity is invalid')
    try:
        workers = set(validated_worker_assignments(run_root).values())
    except (OSError, TypeError, ValueError):
        workers = set()
    expected_worker = worker_receipt(next(iter(workers))) if len(workers) == 1 else None
    if evidence.get('worker') != expected_worker:
        errors.append('gallery browser worker is not the canonical batch worker')
    if not _gallery_screenshot_valid(evidence, run_root):
        errors.append('gallery screenshot receipt, bytes, or width is invalid')
    return errors


def preserved_sites_valid(report: dict[str, Any], run_root: Path) -> bool:
    sites = report.get('sites')
    return (
        isinstance(sites, dict) and set(sites) == set(SITES)
        and all(not site_proof_errors(report.get('schema'), sites[site], run_root, site) for site in SITES)
    )


def preserved_gallery_valid(report: dict[str, Any], run_root: Path) -> bool:
    manifest = _read_json(run_root / 'run-manifest.json')
    run_sites = manifest.get('sites')
    if not isinstance(run_sites, list):
        return False
    expected = sum(item.get('finalVerdict') == 'PASS' for item in run_sites if isinstance(item, dict))
    return not gallery_proof_errors(
        report.get('schema'), report.get('gallery'), run_root, expected, run_sites,
    )
''')

path = QA / 'browser_artifact_evidence.py'
text = path.read_text(encoding='utf-8')
text = text.replace(
    "HARNESS = {'id': 'swan-world-factory-browser-qa', 'version': 'v4'}\n",
    "HARNESS = {'id': 'swan-world-factory-browser-qa', 'version': 'v4'}\nWORKER_VERSION = 'world-factory-browser-worker.v1'\n",
)
old = """    worker = evidence.get('worker')
    return (
        isinstance(worker, dict)
        and isinstance(worker.get('id'), str) and bool(worker['id'])
        and _valid_utc(evidence.get('startedAt'))
"""
new = """    worker = evidence.get('worker')
    return (
        isinstance(worker, dict) and set(worker) == {'id', 'version'}
        and isinstance(worker.get('id'), str) and bool(worker['id'])
        and worker.get('version') == WORKER_VERSION
        and evidence.get('harness') == HARNESS
        and _valid_utc(evidence.get('startedAt'))
"""
if old not in text:
    raise SystemExit('browser artifact worker block not found')
text = text.replace(old, new)
text = text.replace(
    "if not isinstance(value, str) or not value.endswith('Z'):",
    "if not isinstance(value, str) or value != value.strip() or not value.endswith('Z'):",
)
path.write_text(text, encoding='utf-8')

path = QA / 'request_inventory_validation.py'
text = path.read_text(encoding='utf-8')
text = text.replace(
    "and 200 <= item['status'] < 400",
    "and item['status'] == 200",
)
text = text.replace(
    "    observed: set[str] = set()\n    observed_control = False\n",
    "    observed: set[str] = set()\n    observed_control = False\n    expected_faults = {\n        path for path in files\n        if isinstance(path, str) and path.lower().endswith('.png')\n    } if receipt.get('scope', '').startswith('site:') else set()\n    controlled_paths = {\n        item.get('path') for item in controlled if isinstance(item, dict)\n    }\n    if receipt.get('scope') == 'gallery':\n        if controlled:\n            return False\n    elif len(controlled) != len(expected_faults) \\\n            or controlled_paths != expected_faults:\n        return False\n",
)
text = text.replace(
    "or item.get('expectedCount') != item.get('occurrences'):",
    "or item.get('expectedCount') != 1 \\\n+                or item.get('occurrences') != 1:\n",
)
path.write_text(text, encoding='utf-8')

path = QA / 'request_inventory.py'
text = path.read_text(encoding='utf-8')
text = text.replace(
    "                    groups['controlled'].append({\n",
    "                    groups['controlled'].append({\n",
)
needle = """                        'expectedBundleSha256': expected.get('sha256'),
                    })
                else:
"""
replacement = """                        'expectedBundleSha256': expected.get('sha256'),
                    })
                    observed_controls.add(path)
                else:
"""
if needle not in text:
    raise SystemExit('controlled observation insertion point missing')
text = text.replace(needle, replacement)
text = text.replace(
    "            and fault.get('expectedCount') == 1\n",
    "            and fault.get('expectedCount') == 1\n            and record.get('status') == 200\n            and record.get('resourceType') == 'image'\n",
)
old = """            'missingControlRequests': (
                ['run-manifest.json'] if self.scope == 'gallery'
                and 'run-manifest.json' not in observed_controls else []
            ),
"""
new = """            'missingControlRequests': sorted(
                ({'run-manifest.json'} if self.scope == 'gallery' else {
                    path for path in files
                    if isinstance(path, str) and path.lower().endswith('.png')
                }) - observed_controls
            ),
"""
if old not in text:
    raise SystemExit('missing control block not found')
text = text.replace(old, new)
path.write_text(text, encoding='utf-8')
