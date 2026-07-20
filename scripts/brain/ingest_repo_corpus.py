#!/usr/bin/env python3
"""
ingest_repo_corpus.py — mirror the repo's operational docs into the Hermes brain-vault as a
searchable `repo-docs` collection.

WHY
    The vault holds 3,658 books/PDFs but has never seen the project that built it: ~100 handoffs,
    a 228 KB review queue, 145 Hermes memos, months of brainstorms — all invisible to brain_search.
    This closes broken-thing #1 from the 2026-07-19 brain review: no cross-session recall.

HOW (zero vault-code changes)
    The vault's build_index walks `collections/*/<scan>/extracted/*_batches/extraction-ledger.csv`.
    This script EMITS that native format: it copies each .md as .txt into a batch dir and writes the
    ledger. The existing builder then indexes it like any other collection. Batch dir names become
    the `bucket` facet for free: handoff / reference / designbrain / brainstorm / ops / root.

TRUST LABEL (the self-reference trap, Pass D gap-6)
    `repo-docs` is agent-generated text. It is recall-tier ONLY: future corroboration logic must
    exclude it by collection label — an agent's own memos never raise a claim's confidence.

SAFETY
    - SECRET SCAN GATES EVERYTHING: every candidate file is scanned for secret shapes before any
      write; one hit → hard fail listing file + pattern NAME + count (never the matched value, Rule 59).
    - DRY RUN BY DEFAULT; --apply writes; --build additionally rebuilds the index (minutes).
    - The repo-docs collection is a DERIVED MIRROR: each apply deletes prior repo-docs scan dirs and
      rewrites — rerunnable, no duplicate docs, and deleting it loses nothing (the repo is the source).
    - Never touches other collections. clients-private exclusion is the builder's job and is
      re-verified by the caller after any rebuild.

USAGE (from WSL; repo via /mnt/c)
    python3 ingest_repo_corpus.py --repo /mnt/c/.../SS-PT --vault ~/hermes2/brain-vault            # dry
    python3 ingest_repo_corpus.py --repo ... --vault ... --apply                                    # write
    python3 ingest_repo_corpus.py --repo ... --vault ... --apply --build                            # + index
"""
import argparse
import csv
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

COLLECTION = "repo-docs"

# bucket name -> (repo-relative glob roots, recursive)
SOURCES = {
    "handoff": ["docs/ai-workflow/AI-HANDOFF"],
    "reference": ["docs/ai-workflow/references"],
    "designbrain": ["docs/ai-workflow/design-brain"],
    "brainstorm": ["docs/ai-workflow/brainstorms", "docs/ai-workflow/hermes-agentic-os"],
    "ops": [
        ".ai-workflow/coordination/review-queue.md",
        ".ai-workflow/continuity/rolling-last-done.md",
        ".ai-workflow/hermes-inbox/pending",
        ".ai-workflow/hermes-inbox/consumed",
    ],
    "root": ["CLAUDE.md", "AGENTS.md", "ACTIVE-INDEX.md"],
}

EXCLUDE_DIR_NAMES = {"_attic", "node_modules", ".git", "debate-archive"}

# Secret shapes (presence-only reporting — values are NEVER printed).
# The sk- pattern carries a lookbehind: without it, prose like "risk-disposition-per-hit" matches —
# found live against the real corpus 2026-07-20 (a receipt doc's own wording tripped the scan).
SECRET_PATTERNS = {
    "openai/openrouter key": re.compile(r"(?<![A-Za-z0-9])sk-[a-zA-Z0-9_-]{20,}"),
    "stripe live key": re.compile(r"(sk|rk)_live_[a-zA-Z0-9]{10,}"),
    "stripe test key": re.compile(r"sk_test_[a-zA-Z0-9]{10,}"),
    "stripe webhook secret": re.compile(r"whsec_[a-zA-Z0-9]{10,}"),
    "slack token": re.compile(r"xox[baprs]-[a-zA-Z0-9-]{10,}"),
    "google api key": re.compile(r"AIza[0-9A-Za-z_-]{30,}"),
    "jwt": re.compile(r"eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
    "postgres url with password": re.compile(r"postgres(ql)?://[^\s:]+:[^\s@]+@"),
    "private key block": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    "sendgrid key": re.compile(r"SG\.[a-zA-Z0-9_-]{16,}\.[a-zA-Z0-9_-]{16,}"),
    "telegram bot token": re.compile(r"\b\d{8,10}:AA[a-zA-Z0-9_-]{30,}\b"),
}


def _now_scan_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%SZ")


def collect_files(repo: Path) -> dict[str, list[Path]]:
    """Resolve SOURCES into concrete .md files per bucket, applying directory excludes."""
    out: dict[str, list[Path]] = {}
    for bucket, roots in SOURCES.items():
        files: list[Path] = []
        for rel in roots:
            p = repo / rel
            if p.is_file() and p.suffix == ".md":
                files.append(p)
            elif p.is_dir():
                for f in sorted(p.rglob("*.md")):
                    if any(part in EXCLUDE_DIR_NAMES for part in f.parts):
                        continue
                    files.append(f)
        out[bucket] = files
    return out


# Audited waivers for KNOWN, human-classified, non-credential matches. Scope is (file, pattern) —
# any OTHER pattern in the same file still hard-fails, and any new file hit still hard-fails.
# Each entry must cite the masked-inspection that justified it.
SCAN_ALLOWLIST: dict[str, set[str]] = {
    # Verified 2026-07-20 by masked inspection: line 48 is `DATABASE_URL=<19 chars>` — a 19-char
    # user:pass-at-host-style documentation example inside the patch list that SPECIFIED the secret
    # scanner. Too short to be a real URL; not a credential. (Shape deliberately not written out
    # here — the repo's own pre-commit scanner would flag this file for describing it.)
    "docs/ai-workflow/AI-HANDOFF/3-BRAIN-PIPELINE-v3-PATCH-LIST-2026-04-19.md": {"postgres url with password"},
}


def scan_secrets(files: list[Path], repo: Path | None = None) -> list[dict]:
    """Presence-only secret scan. Returns [{file, pattern, count}] — never matched text."""
    hits = []
    for f in files:
        try:
            text = f.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        rel = str(f.relative_to(repo)).replace("\\", "/") if repo else str(f)
        waived = SCAN_ALLOWLIST.get(rel, set())
        for name, rx in SECRET_PATTERNS.items():
            n = len(rx.findall(text))
            if n and name not in waived:
                hits.append({"file": str(f), "pattern": name, "count": n})
    return hits


def title_of(f: Path) -> str:
    try:
        for line in f.read_text(encoding="utf-8", errors="ignore").splitlines()[:10]:
            if line.startswith("# "):
                return line[2:].strip()[:120]
    except OSError:
        pass
    return f.stem


def write_collection(repo: Path, vault: Path, buckets: dict[str, list[Path]]) -> dict:
    """Delete prior repo-docs scans, write a fresh one in the vault's native ledger format."""
    coll_root = vault / "collections" / COLLECTION
    if coll_root.exists():
        shutil.rmtree(coll_root)  # derived mirror: delete-and-rewrite is the contract
    scan = coll_root / _now_scan_id() / "extracted"
    written = 0
    for bucket, files in buckets.items():
        if not files:
            continue
        batch = scan / f"{bucket}_batches"
        texts = batch / "texts"
        texts.mkdir(parents=True)
        rows = []
        for f in files:
            rel = f.relative_to(repo)
            safe = str(rel).replace("/", "__").replace("\\", "__")
            txt = texts / (safe + ".txt")
            body = f.read_text(encoding="utf-8", errors="ignore")
            txt.write_text(body, encoding="utf-8")
            rows.append({
                "status": "extracted",
                "output_text_path": str(txt),
                "source_relative_path": str(rel),
                "source_absolute_path": str(f),
                "title": title_of(f),
                "author": "SwanStudios repo (agent-generated; recall-tier, excluded from corroboration)",
                "char_count": len(body),
                "page_count": 1,
                "truncated": "no",
            })
            written += 1
        with (batch / "extraction-ledger.csv").open("w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
    return {"collection_root": str(coll_root), "documents_written": written}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--vault", required=True)
    ap.add_argument("--apply", action="store_true", help="write the collection (default: dry run)")
    ap.add_argument("--build", action="store_true", help="after --apply, rebuild the main index")
    args = ap.parse_args()

    repo = Path(os.path.expanduser(args.repo)).resolve()
    vault = Path(os.path.expanduser(args.vault)).resolve()
    if not (repo / "CLAUDE.md").is_file():
        print(f"error: {repo} does not look like the repo root", file=sys.stderr)
        return 2
    if not (vault / "collections").is_dir():
        print(f"error: {vault} does not look like the brain vault", file=sys.stderr)
        return 2

    buckets = collect_files(repo)
    all_files = [f for fs in buckets.values() for f in fs]
    total_bytes = sum(f.stat().st_size for f in all_files)

    print(f"repo   : {repo}")
    print(f"vault  : {vault}")
    for bucket, files in buckets.items():
        print(f"  {bucket:<12} {len(files):>4} files")
    print(f"total  : {len(all_files)} files, {total_bytes/1024:.0f} KB")

    # ── THE GATE: secret scan before anything ────────────────────────────────
    hits = scan_secrets(all_files, repo=repo)
    if hits:
        print(f"\n*** SECRET SCAN FAILED — {len(hits)} hit(s). NOTHING WRITTEN. ***")
        for h in hits[:20]:
            print(f"  {h['pattern']}  x{h['count']}  {h['file']}")
        print("Resolve (rotate + scrub) before ingesting. Indexing makes a leak searchable forever.")
        return 3
    print("secret scan: CLEAN (0 hits)")

    if not args.apply:
        print("\nDRY RUN — nothing written. Re-run with --apply to write the collection.")
        return 0

    result = write_collection(repo, vault, buckets)
    print(f"\nwrote {result['documents_written']} docs into {result['collection_root']}")

    if args.build:
        tool = vault / "tools" / "hermes2_brain_search.py"
        print("rebuilding main index (this re-reads every collection; may take minutes)…")
        r = subprocess.run([sys.executable, str(tool), "build"], capture_output=True, text=True)
        if r.returncode != 0:
            print(f"BUILD FAILED rc={r.returncode}: {r.stderr[:400]}", file=sys.stderr)
            return 4
        summary = json.loads(r.stdout)
        print(json.dumps({k: summary[k] for k in (
            "indexed_documents", "skipped_private_documents", "ledgers")}, indent=2))
    else:
        print("run the vault's `build` (or re-run with --build) to make it searchable.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
