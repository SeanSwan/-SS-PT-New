"""Measured browser acceptance gate for the ignored World Engine proof."""
from __future__ import annotations

import argparse
from copy import deepcopy
import importlib.metadata
import json
import platform
import sys
from pathlib import Path
from typing import Any

from playwright.sync_api import sync_playwright

from browser_artifact_evidence import (
    HARNESS, canonical_report_output, utc_now,
)
from browser_proof_validation import (
    VIEWPORTS, preserved_gallery_valid, preserved_sites_valid,
    validated_review_policy, worker_receipt,
)
from browser_qa_evidence import gallery_evidence, site_evidence
from bundle_evidence import SITES
from performance_receipt import performance_requirements
from proof_server import serve_run_root
from receipt_sync import atomic_json, sync_receipts

REQUIRED_SITE_FILES = (
    'index.html', 'styles.css', 'experience.js',
    'site-manifest.json', 'qa-report.json',
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        '--base-url', default=None,
        help='Forbidden for acceptance; the harness owns an ephemeral server.',
    )
    parser.add_argument(
        '--output', type=Path,
        default=Path(__file__).with_name('browser-qa-report.json'),
    )
    parser.add_argument('--worker-id', default=None)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--sync-existing', action='store_true')
    modes.add_argument('--gallery-only', action='store_true')
    return parser.parse_args()


def require_complete_batch(run_root: Path) -> None:
    missing = [
        (run_root / 'sites' / site / name).relative_to(run_root).as_posix()
        for site in SITES for name in REQUIRED_SITE_FILES
        if not (run_root / 'sites' / site / name).is_file()
    ]
    if missing:
        raise SystemExit(
            'BLOCKED: all five sites must exist before browser QA. Missing: '
            + ', '.join(missing)
        )


def tool_versions() -> dict[str, Any]:
    def version(package: str) -> str:
        try:
            return importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            return 'NOT_EXPOSED'
    return {
        'python': sys.version.split()[0], 'platform': platform.platform(),
        'playwright': version('playwright'), 'pillow': version('Pillow'),
        'browserEngine': 'chromium', 'browserVersion': 'PENDING_LAUNCH',
    }


def provisional_report(
    base_url: str, report_output: dict[str, Any], worker_id: str,
    assignments: dict[str, str], mode: str = 'full',
) -> dict[str, Any]:
    return {
        'schema': 'swan-world-factory.browser-qa.v3',
        'baseUrl': base_url,
        'reportOutput': report_output,
        'harness': {
            **deepcopy(HARNESS), 'server': 'owned-ephemeral-loopback',
            'root': '.',
        },
        'run': {
            'mode': mode, 'worker': worker_receipt(worker_id),
            'workerAssignments': deepcopy(assignments),
            'startedAt': utc_now(), 'completedAt': None,
        },
        'toolVersions': tool_versions(),
        'requirements': {
            'matrix': [f'{w}x{h}' for w, h in VIEWPORTS],
            'fieldProxyBudgets': {'lcpMs': 2500, 'inpMs': 200, 'cls': .1},
            'labBudgets': performance_requirements(),
            'renderBudget': {
                'b1DecodedPixels': 'MEASURED', 'canvasCount': 0,
                'webglWebgpuContexts': 0,
            },
            'screenshotPolicy': {
                'canonicalPatterns': [
                    'qa/screenshots/<site>-<viewport>.png',
                    'qa/screenshots/acts/<site>-act-<n>.png',
                    'qa/screenshots/gallery-1440x900.png',
                ],
                'excludedNamespaces': [{
                    'path': 'qa/screenshots/targeted/',
                    'classification': 'NONCANONICAL_MANUAL_EXCLUDED',
                }],
            },
            'additional': [
                'forced colors', 'accessibility role path', '200% zoom',
                'act and brightest-frame screenshots', 'disabled spatial loss',
                'corrupt image loss', 'navigation teardown', 'Full/Lean/Still',
                'Pause persistence', 'reduced motion', 'keyboard', 'no-JS B0',
                'response-byte request inventory', 'screenshot byte receipts',
            ],
        },
        'sites': {},
        'gallery': {'verdict': 'BLOCKED', 'reason': 'Gallery not tested yet.'},
        'verdict': 'BLOCKED', 'productionPromotion': False,
    }


def _set_final_verdict(report: dict[str, Any]) -> None:
    sites_pass = set(report.get('sites', {})) == set(SITES) and all(
        item.get('verdict') == 'PASS' for item in report['sites'].values()
    )
    report['verdict'] = (
        'PASS' if sites_pass and report.get('gallery', {}).get('verdict') == 'PASS'
        else 'BLOCKED'
    )


def _run_gallery(
    report: dict[str, Any], browser, base_url: str,
    screenshots: Path, run_root: Path, worker_id: str,
) -> None:
    manifest = sync_receipts(run_root, report)
    final_pass_count = sum(
        item.get('finalVerdict') == 'PASS' for item in manifest['sites']
    )
    report['gallery'] = gallery_evidence(
        browser, base_url, final_pass_count, screenshots, run_root, worker_id,
    )
    _set_final_verdict(report)


def _validated_worker(run_root: Path, supplied: str | None) -> tuple[str, dict[str, str]]:
    try:
        policy = validated_review_policy(run_root)
    except (OSError, TypeError, ValueError) as error:
        raise SystemExit(f'BLOCKED: {error}') from error
    expected = policy['browserQaWorker']
    if supplied != expected:
        raise SystemExit(
            'BLOCKED: --worker-id must match the predeclared browserQaWorker.'
        )
    return expected, dict(policy['workerAssignments'])


def main() -> int:
    args = parse_args()
    qa_root = Path(__file__).resolve().parent
    run_root = qa_root.parent
    require_complete_batch(run_root)
    if args.base_url:
        raise SystemExit('BLOCKED: external --base-url is forbidden for acceptance.')
    output = args.output.resolve()
    try:
        report_output = canonical_report_output(run_root, output)
    except ValueError as error:
        raise SystemExit(f'BLOCKED: {error}') from error
    if args.sync_existing:
        report = json.loads(output.read_text(encoding='utf-8'))
        if report.get('reportOutput') != report_output \
                or not preserved_sites_valid(report, run_root) \
                or not preserved_gallery_valid(report, run_root):
            raise SystemExit('BLOCKED: reusable browser evidence is invalid.')
        manifest = sync_receipts(run_root, report)
        print({'syncExisting': True, 'finalVerdict': manifest['finalVerdict']})
        return 0 if manifest['finalVerdict'] == 'PASS' else 1
    worker_id, assignments = _validated_worker(run_root, args.worker_id)
    screenshots = qa_root / 'screenshots'
    screenshots.mkdir(parents=True, exist_ok=True)
    mode = 'gallery-only' if args.gallery_only else 'full'
    with serve_run_root(run_root) as base_url:
        if args.gallery_only:
            report = json.loads(output.read_text(encoding='utf-8'))
            if report.get('reportOutput') != report_output \
                    or not preserved_sites_valid(report, run_root):
                raise SystemExit('BLOCKED: gallery-only requires valid site evidence.')
            preserved = deepcopy(report['sites'])
            report['baseUrl'] = base_url
            report['run'] = {
                'mode': mode, 'worker': worker_receipt(worker_id),
                'workerAssignments': deepcopy(assignments),
                'startedAt': utc_now(), 'completedAt': None,
            }
        else:
            report = provisional_report(
                base_url, report_output, worker_id, assignments, mode,
            )
            atomic_json(output, report)
            preserved = None
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            report['toolVersions']['browserVersion'] = browser.version
            try:
                if not args.gallery_only:
                    for site in SITES:
                        report['sites'][site] = site_evidence(
                            browser, base_url, site, screenshots,
                            run_root / 'sites' / site, worker_id,
                        )
                        atomic_json(output, report)
                _run_gallery(
                    report, browser, base_url, screenshots,
                    run_root, worker_id,
                )
            finally:
                browser.close()
        if preserved is not None and report['sites'] != preserved:
            raise SystemExit('BLOCKED: gallery-only mutated preserved site evidence.')
    report['run']['completedAt'] = utc_now()
    atomic_json(output, report)
    manifest = sync_receipts(run_root, report)
    report['run']['synchronizedFinalVerdict'] = manifest['finalVerdict']
    atomic_json(output, report)
    print({
        'mode': mode, 'verdict': report['verdict'],
        'synchronizedFinalVerdict': manifest['finalVerdict'],
        'sitesPassed': sum(
            item.get('verdict') == 'PASS' for item in report['sites'].values()
        ),
        'sitesRequired': len(SITES), 'matrixPerSite': len(VIEWPORTS),
        'report': str(output),
    })
    passed = report['verdict'] == 'PASS'
    if args.gallery_only:
        passed = passed and manifest['finalVerdict'] == 'PASS'
    return 0 if passed else 1


if __name__ == '__main__':
    raise SystemExit(main())
