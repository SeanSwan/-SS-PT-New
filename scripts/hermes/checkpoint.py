#!/usr/bin/env python3
"""
Hermes checkpoint — a restore point taken BEFORE work, so any mistake is one command away
from undone.

WHY THIS EXISTS
    2026-08-05: a planner ranked "git is broken, re-clone or re-init this repo" as its #1
    blocker. The repo was healthy — git only failed from WSL because .git holds a Windows
    path. Executing that slice would have destroyed a branch, its history, and five files
    of uncommitted work. It was caught by review, not by any safeguard. This is the
    safeguard.

WHY NOT `backup-repo.mjs`
    That bundles COMMITTED history and says so in its own header. The work Hermes destroys
    is uncommitted: edits in flight, untracked new files, a half-finished slice. Committed
    history is the one thing already protected. This covers the rest.

WHY THE SNAPSHOT LIVES OUTSIDE THE REPO
    A checkpoint stored inside the tree dies to the same `rm -rf`, `git clean -fdx`, or
    re-init it exists to survive. Snapshots go under HERMES_HOME/checkpoints/<repo>/.
    (Still the same physical disk — this protects against agent error, NOT disk failure.
    Disk failure is backup-repo.mjs's job, on Z:.)

WHY IT DOES NOT DEPEND ON GIT
    The repo that triggered this is one where git is unusable from the environment Hermes
    runs in. A safety net that only works on healthy repos is not a safety net. Git state
    is RECORDED when available and never REQUIRED.

USAGE
    checkpoint.py create <repo> --label <slug>   # before work. prints the restore command.
    checkpoint.py list <repo>                    # what restore points exist
    checkpoint.py restore <repo> <id>            # undo. checkpoints the CURRENT state first.
    checkpoint.py prune <repo> [--keep N]        # default keeps 20

SAFETY
    restore takes its own checkpoint before overwriting anything, so a restore is itself
    reversible. Nothing is ever deleted outside the checkpoint store.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tarfile
import time
from datetime import datetime, timezone
from pathlib import Path

HERMES_HOME = Path(os.environ.get("HERMES_HOME", Path.home() / "hermes2/.hermes"))
STORE = HERMES_HOME / "checkpoints"

# Never snapshot these — they are large, regenerable, or secret-bearing.
EXCLUDE_DIRS = {
    "node_modules", ".git", "dist", "build", ".next", ".turbo", ".cache",
    "coverage", "__pycache__", ".venv", "venv", ".pytest_cache", ".vite",
}
EXCLUDE_SUFFIX = {".log", ".tmp", ".pyc"}
# Secrets are excluded on purpose: a checkpoint is read by agents and must never become a
# second copy of .env sitting in a less-guarded directory.
EXCLUDE_NAMES = {".env", ".env.local", ".env.production", ".env.development"}

MAX_BYTES = 512 * 1024 * 1024  # refuse rather than silently fill the disk


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def git(repo: Path, *args: str) -> str | None:
    """Run git; return stripped stdout, or None if git is unusable here."""
    try:
        r = subprocess.run(
            ["git", *args], cwd=repo, capture_output=True, text=True, timeout=20
        )
        return r.stdout.strip() if r.returncode == 0 else None
    except Exception:
        return None


def git_state(repo: Path) -> dict:
    """Record git context when reachable. Absence is normal, not an error."""
    head = git(repo, "rev-parse", "HEAD")
    if head is None:
        return {"available": False, "note": "git unreachable from this environment"}
    return {
        "available": True,
        "head": head,
        "branch": git(repo, "rev-parse", "--abbrev-ref", "HEAD"),
        "dirty_files": [
            l[3:] for l in (git(repo, "status", "--porcelain") or "").splitlines()
        ],
    }


def should_skip(path: Path, repo: Path) -> bool:
    rel = path.relative_to(repo)
    if any(part in EXCLUDE_DIRS for part in rel.parts):
        return True
    if path.name in EXCLUDE_NAMES or path.suffix in EXCLUDE_SUFFIX:
        return True
    return False


def collect(repo: Path) -> tuple[list[Path], int]:
    files, total = [], 0
    for p in repo.rglob("*"):
        # Symlinks are INCLUDED so this path matches what `tar` captures — the two
        # must agree or a checkpoint's contents depend on which path happened to run.
        # Escaping link targets are refused at restore time, not silently dropped here.
        if p.is_symlink():
            if should_skip(p, repo):
                continue
            files.append(p)
            continue
        if not p.is_file() or should_skip(p, repo):
            continue
        try:
            total += p.stat().st_size
        except OSError:
            continue
        files.append(p)
        if total > MAX_BYTES:
            break
    return files, total


def human(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.0f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


def archive_with_tar(repo: Path, archive: Path) -> tuple[bool, int]:
    """
    Snapshot via the tar binary — one process instead of one Python call per file.
    Measured on a 999-file tree under /mnt/c: 75s walking in Python, ~3s here. The
    difference is Windows-filesystem syscall overhead from WSL, so it matters most on
    exactly the repos this protects. Returns (ok, file_count); caller falls back on False.
    """
    excludes = []
    for d in sorted(EXCLUDE_DIRS):
        excludes += ["--exclude", d]
    for n in sorted(EXCLUDE_NAMES):
        excludes += ["--exclude", n]
    for s in sorted(EXCLUDE_SUFFIX):
        excludes += ["--exclude", f"*{s}"]
    try:
        r = subprocess.run(
            ["tar", "-czf", str(archive), *excludes, "-C", str(repo), "."],
            capture_output=True, text=True, timeout=600,
        )
        # tar exits 1 on "file changed as we read it" — the archive is still usable.
        if r.returncode not in (0, 1) or not archive.exists():
            return False, 0
        listing = subprocess.run(
            ["tar", "-tzf", str(archive)], capture_output=True, text=True, timeout=300
        )
        count = sum(1 for l in listing.stdout.splitlines() if not l.endswith("/"))
        return True, count
    except Exception:
        return False, 0


def cmd_create(repo: Path, label: str, quiet: bool = False) -> str:
    cid = f"{utc_stamp()}-{label}"
    dest = STORE / repo.name / cid
    dest.mkdir(parents=True, exist_ok=True)
    archive = dest / "tree.tar.gz"

    ok, count = archive_with_tar(repo, archive)
    if not ok:
        # Fallback: pure Python. Slower, but works where no tar binary exists.
        files, total = collect(repo)
        if total > MAX_BYTES:
            sys.exit(
                f"REFUSED: tree exceeds {human(MAX_BYTES)} after exclusions. "
                "Narrow the repo or raise MAX_BYTES deliberately — not silently."
            )
        with tarfile.open(archive, "w:gz") as tar:
            for f in files:
                tar.add(f, arcname=str(f.relative_to(repo)))
        count = len(files)

    size = archive.stat().st_size
    if size > MAX_BYTES:
        archive.unlink(missing_ok=True)
        sys.exit(f"REFUSED: snapshot {human(size)} exceeds cap {human(MAX_BYTES)}.")

    manifest = {
        "id": cid,
        "label": label,
        "repo": str(repo),
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "created_epoch": time.time(),
        "file_count": count,
        "bytes": size,
        "git": git_state(repo),
        "excluded": sorted(EXCLUDE_DIRS | EXCLUDE_NAMES),
    }
    (dest / "manifest.json").write_text(json.dumps(manifest, indent=2))

    if not quiet:
        g = manifest["git"]
        where = f"{g.get('branch')} @ {(g.get('head') or '')[:8]}" if g["available"] else "git unreachable"
        print(f"checkpoint created: {cid}")
        print(f"  {count} files, {human(size)}  ({where})")
        if g["available"] and g["dirty_files"]:
            print(f"  captured {len(g['dirty_files'])} uncommitted change(s)")
        print(f"\n  UNDO WITH:\n  python3 {Path(__file__).resolve()} restore {repo} {cid}")
    return cid


def load_all(repo: Path) -> list[dict]:
    root = STORE / repo.name
    if not root.exists():
        return []
    out = []
    for d in sorted(root.iterdir()):
        m = d / "manifest.json"
        if m.exists():
            try:
                out.append(json.loads(m.read_text()))
            except json.JSONDecodeError:
                continue
    return out


def cmd_list(repo: Path) -> None:
    cps = load_all(repo)
    if not cps:
        print(f"no checkpoints for {repo.name}")
        return
    print(f"checkpoints for {repo.name} ({len(cps)}):")
    for c in reversed(cps):
        g = c.get("git", {})
        where = f"{g.get('branch')}@{(g.get('head') or '')[:8]}" if g.get("available") else "no-git"
        dirty = len(g.get("dirty_files") or [])
        flag = f" +{dirty} dirty" if dirty else ""
        print(f"  {c['id']:<44} {c['file_count']:>5}f {human(c['bytes']):>7}  {where}{flag}")


def cmd_restore(repo: Path, cid: str, force: bool) -> None:
    src = STORE / repo.name / cid / "tree.tar.gz"
    if not src.exists():
        sys.exit(f"no such checkpoint: {cid}\nrun `list` to see what exists.")

    if not force:
        print(f"About to restore {repo.name} to {cid}.")
        print("Files in the checkpoint OVERWRITE the current ones.")
        print("Your current state is checkpointed first, so this is reversible.")
        if input("type RESTORE to proceed: ").strip() != "RESTORE":
            sys.exit("aborted — nothing changed.")

    safety = cmd_create(repo, "pre-restore", quiet=True)
    print(f"current state saved as: {safety}")

    root = repo.resolve()
    with tarfile.open(src, "r:gz") as tar:
        for m in tar.getmembers():
            # 1. The member itself must land inside the repo.
            target = (repo / m.name).resolve()
            if not str(target).startswith(str(root)):
                sys.exit(f"REFUSED: checkpoint contains an escaping path: {m.name}")
            # 2. A link member resolves INSIDE the repo while its TARGET points out —
            #    check 1 passes and the link is still created. Restoring a symlink to
            #    /etc/passwd would turn a later write into a write outside the repo.
            #    Found by an edge-case round, not by review of the original code.
            if m.issym() or m.islnk():
                lt = Path(m.linkname)
                resolved = (lt if lt.is_absolute() else target.parent / lt).resolve()
                if not str(resolved).startswith(str(root)):
                    sys.exit(
                        f"REFUSED: link '{m.name}' points outside the repo "
                        f"→ {m.linkname}. Restore aborted; nothing was written."
                    )
        tar.extractall(repo)

    print(f"restored {repo.name} → {cid}")
    print(f"undo this restore: python3 {Path(__file__).resolve()} restore {repo} {safety}")


def cmd_prune(repo: Path, keep: int) -> None:
    import shutil

    cps = load_all(repo)
    doomed = cps[:-keep] if len(cps) > keep else []
    for c in doomed:
        shutil.rmtree(STORE / repo.name / c["id"], ignore_errors=True)
    print(f"pruned {len(doomed)}, kept {min(len(cps), keep)}")


def main() -> int:
    ap = argparse.ArgumentParser(description="Hermes pre-work checkpoints")
    sub = ap.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("create"); c.add_argument("repo"); c.add_argument("--label", required=True)
    l = sub.add_parser("list"); l.add_argument("repo")
    r = sub.add_parser("restore"); r.add_argument("repo"); r.add_argument("id"); r.add_argument("--force", action="store_true")
    p = sub.add_parser("prune"); p.add_argument("repo"); p.add_argument("--keep", type=int, default=20)

    a = ap.parse_args()
    repo = Path(a.repo).expanduser().resolve()
    if not repo.is_dir():
        sys.exit(f"not a directory: {repo}")

    if a.cmd == "create":
        cmd_create(repo, "".join(ch if ch.isalnum() or ch == "-" else "-" for ch in a.label))
    elif a.cmd == "list":
        cmd_list(repo)
    elif a.cmd == "restore":
        cmd_restore(repo, a.id, a.force)
    elif a.cmd == "prune":
        cmd_prune(repo, a.keep)
    return 0


if __name__ == "__main__":
    sys.exit(main())
