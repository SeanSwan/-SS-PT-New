"""Fail-first guards for reusable browser-report execution modes."""
from __future__ import annotations

import argparse
from contextlib import nullcontext
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

import browser_qa


def _args(output: Path, mode: str) -> argparse.Namespace:
    return argparse.Namespace(
        base_url=None,
        output=output,
        worker_id='codex:gpt-5:/browser-qa',
        sync_existing=mode == 'sync-existing',
        gallery_only=mode == 'gallery-only',
    )


class BrowserReuseModeTests(unittest.TestCase):
    def test_reuse_modes_reject_production_promotion_true(self) -> None:
        for mode in ('sync-existing', 'gallery-only'):
            with self.subTest(mode=mode), TemporaryDirectory() as folder:
                run_root = Path(folder)
                qa_root = run_root / 'qa'
                qa_root.mkdir()
                output = qa_root / 'browser-qa-report.json'
                output.write_text(json.dumps({
                    'reportOutput': {
                        'path': 'qa/browser-qa-report.json',
                        'canonical': True,
                    },
                    'productionPromotion': True,
                    'sites': {},
                }), encoding='utf-8')
                with (
                    patch.object(browser_qa, '__file__', str(qa_root / 'browser_qa.py')),
                    patch('browser_qa.parse_args', return_value=_args(output, mode)),
                    patch('browser_qa.require_complete_batch'),
                    patch('browser_qa.preserved_sites_valid', return_value=True),
                    patch('browser_qa.preserved_gallery_valid', return_value=True),
                    patch('browser_qa._validated_worker', return_value=(
                        'codex:gpt-5:/browser-qa', {},
                    )),
                    patch('browser_qa.serve_run_root', return_value=nullcontext(
                        'http://127.0.0.1:45123'
                    )),
                    patch('browser_qa.sync_playwright', side_effect=AssertionError(
                        'reusable report must be rejected before browser launch'
                    )),
                    patch('browser_qa.sync_receipts', return_value={
                        'finalVerdict': 'PASS',
                    }),
                ):
                    with self.assertRaisesRegex(
                        SystemExit, 'productionPromotion must be false'
                    ):
                        browser_qa.main()


if __name__ == '__main__':
    unittest.main()
