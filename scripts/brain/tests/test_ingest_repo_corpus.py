"""
test_ingest_repo_corpus.py — regression suite for the repo→vault ingester.
Run (WSL): cd scripts/brain && python3 -m unittest tests.test_ingest_repo_corpus -v

Pins: the secret-scan gate (hard fail, names-not-values), the delete-and-rewrite mirror contract,
directory excludes, and — when the real vault tools are present — that the emitted ledger format is
ACTUALLY indexable by the vault's own builder (the whole point of emitting the native format).
"""
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import ingest_repo_corpus as ing  # noqa: E402

REAL_TOOLS = Path.home() / "hermes2" / "brain-vault" / "tools"


def make_repo(base: Path) -> Path:
    repo = base / "repo"
    (repo / "docs/ai-workflow/AI-HANDOFF").mkdir(parents=True)
    (repo / "docs/ai-workflow/AI-HANDOFF/debate-archive").mkdir()
    (repo / "docs/_attic/old").mkdir(parents=True)
    (repo / ".ai-workflow/hermes-inbox/pending").mkdir(parents=True)
    (repo / "CLAUDE.md").write_text("# CLAUDE\nrules here", encoding="utf-8")
    (repo / "docs/ai-workflow/AI-HANDOFF/PLAN.md").write_text("# The Plan\nCanonical Surface Receipt", encoding="utf-8")
    (repo / "docs/ai-workflow/AI-HANDOFF/debate-archive/OLD.md").write_text("# archived debate", encoding="utf-8")
    (repo / "docs/_attic/old/DEAD.md").write_text("# dead doc", encoding="utf-8")
    (repo / ".ai-workflow/hermes-inbox/pending/memo.md").write_text("# memo\nids only", encoding="utf-8")
    return repo


def make_vault(base: Path) -> Path:
    vault = base / "vault"
    (vault / "collections").mkdir(parents=True)
    (vault / "indexes").mkdir()
    return vault


class IngestTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="swan-ingest-"))
        self.repo = make_repo(self.tmp)
        self.vault = make_vault(self.tmp)

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_collect_excludes_attic_and_debate_archive(self):
        buckets = ing.collect_files(self.repo)
        all_rel = {str(f.relative_to(self.repo)).replace("\\", "/") for fs in buckets.values() for f in fs}
        self.assertIn("docs/ai-workflow/AI-HANDOFF/PLAN.md", all_rel)
        self.assertIn("CLAUDE.md", all_rel)
        self.assertIn(".ai-workflow/hermes-inbox/pending/memo.md", all_rel)
        self.assertFalse(any("debate-archive" in p for p in all_rel), "archives stay cold")
        self.assertFalse(any("_attic" in p for p in all_rel))

    def test_secret_scan_reports_pattern_name_never_value(self):
        bad = self.repo / "docs/ai-workflow/AI-HANDOFF/LEAK.md"
        fake = "sk_live_" + "a1b2c3d4e5" * 2
        bad.write_text(f"# oops\nkey={fake}\n", encoding="utf-8")
        hits = ing.scan_secrets([bad])
        self.assertEqual(len(hits), 1)
        self.assertEqual(hits[0]["pattern"], "stripe live key")
        self.assertNotIn(fake, str(hits), "the matched VALUE must never appear in scan output")

    def test_write_collection_emits_native_format_and_rewrites_cleanly(self):
        buckets = ing.collect_files(self.repo)
        r1 = ing.write_collection(self.repo, self.vault, buckets)
        self.assertEqual(r1["documents_written"], 3)
        scans = list((self.vault / "collections" / "repo-docs").iterdir())
        self.assertEqual(len(scans), 1)
        ledgers = list((self.vault / "collections" / "repo-docs").rglob("extraction-ledger.csv"))
        self.assertGreaterEqual(len(ledgers), 2, "one ledger per non-empty bucket")
        # Second apply: delete-and-rewrite → still exactly one scan dir (no duplicate docs at index time).
        r2 = ing.write_collection(self.repo, self.vault, buckets)
        self.assertEqual(r2["documents_written"], 3)
        scans = list((self.vault / "collections" / "repo-docs").iterdir())
        self.assertEqual(len(scans), 1, "prior scans must be replaced, not accumulated")

    @unittest.skipUnless((REAL_TOOLS / "hermes2_brain_search.py").is_file(), "real vault tools not present")
    def test_emitted_format_is_indexable_by_the_real_builder(self):
        sys.path.insert(0, str(REAL_TOOLS))
        import hermes2_brain_search as brain
        ing.write_collection(self.repo, self.vault, ing.collect_files(self.repo))
        db = self.vault / "indexes" / "t.sqlite"
        summary = brain.build_index(self.vault, db, include_private=False)
        self.assertEqual(summary["indexed_documents"], 3, f"builder must index all emitted docs: {summary}")
        results = brain.search_index(db, "Canonical Surface Receipt", limit=3)
        self.assertTrue(results, "emitted content must be searchable")
        self.assertEqual(results[0]["collection"], "repo-docs")

    def test_secret_scan_word_boundary_and_allowlist(self):
        """REGRESSION (found live 2026-07-20): (a) prose 'risk-disposition-per-hit-table' matched the
        sk- pattern — needs a word boundary; (b) the allowlist waives ONLY the named (file, pattern)
        pair — other patterns in the same file still fail."""
        prose = self.repo / "docs/ai-workflow/AI-HANDOFF/PROSE.md"
        prose.write_text("# receipt\nrisk-disposition-per-hit-table statement added\n", encoding="utf-8")
        self.assertEqual(ing.scan_secrets([prose], repo=self.repo), [], "'risk-…' prose must not hit")

        # Fixture secret assembled from parts so THIS file never contains a contiguous secret shape
        # at rest — the repo's own pre-commit scanner blocked the first version of this test for
        # containing its own fixture. Scanners scanning scanner-tests is the ecosystem working.
        fake_pg_url = "postgres://" + "u:" + "p@" + "host"
        allow = self.repo / "docs/ai-workflow/AI-HANDOFF/3-BRAIN-PIPELINE-v3-PATCH-LIST-2026-04-19.md"
        allow.parent.mkdir(parents=True, exist_ok=True)
        allow.write_text(f"# patch list\nDATABASE_URL={fake_pg_url}\n", encoding="utf-8")
        self.assertEqual(ing.scan_secrets([allow], repo=self.repo), [], "documented example is waived")

        allow.write_text(f"# patch list\nDATABASE_URL={fake_pg_url}\ntok=" + "eyJ" + "a" * 25 + "." + "b" * 15 + "." + "c" * 15 + "\n", encoding="utf-8")
        hits = ing.scan_secrets([allow], repo=self.repo)
        self.assertEqual([h["pattern"] for h in hits], ["jwt"], "allowlist must not waive OTHER patterns in the file")

    def test_title_extraction(self):
        self.assertEqual(ing.title_of(self.repo / "docs/ai-workflow/AI-HANDOFF/PLAN.md"), "The Plan")


if __name__ == "__main__":
    unittest.main()
