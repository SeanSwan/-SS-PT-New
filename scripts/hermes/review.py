#!/usr/bin/env python3
"""
Hermes review channel — every piece of Hermes work gets hostile review before it stands.

WHY THIS EXISTS
    Hermes is the agent that makes the most consequential mistakes, because it acts on a
    real filesystem with less oversight than a terminal session. 2026-08-05: its plan
    ranked "re-init this repo" as the #1 blocker on a repo that was healthy. Caught by a
    human asking for a review — not by any system. This makes the review structural.

WHAT IT REPLACES
    `outbox/pending/*.md` — flat memos with no lifecycle. Nothing recorded whether a memo
    was ever read, reviewed, or answered, so a dropped review was invisible. Here every
    item has a STATUS that must reach `approved` or `closed`, and `status` lists anything
    stalled.

THE LOOP
    Hermes            open  → writes WORK.md, gets PROMPT.txt, tells Sean to paste it
    Claude/Codex      review→ writes REVIEW-<agent>.md with a verdict
    Hermes            respond→ writes RESPONSE.md, fixes, flips status
    Sean/agent        close → archives to closed/<YYYY-MM>/

USAGE
    review.py open --title "..." --repo <path> [--checkpoint <id>] [--agents claude,codex]
    review.py status                     # what is waiting on whom
    review.py prompt <id>                # reprint the paste-ready terminal prompt
    review.py close <id>                 # archive a finished item
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
ROOT = REPO_ROOT / ".ai-workflow/hermes-inbox/review"
OPEN = ROOT / "open"
CLOSED = ROOT / "closed"

STATUSES = ("awaiting-review", "changes-requested", "approved", "closed")

# A path is "assertion-bearing" if editing it can change what the suite proves.
# Deliberately wide: a missed fixture is exactly the edit that hides a bug.
TEST_PATH_RE = re.compile(
    r"(\.test\.|\.spec\.|_test\.|(^|/)test_|(^|/)conftest\.|(^|/)tests?/|__tests__/"
    r"|fixture|factories?/|\.snap$|__snapshots__/)",
    re.IGNORECASE,
)


def slug(s: str, n: int = 48) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s[:n] or "item"


def stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def read_status(d: Path) -> str:
    f = d / "STATUS"
    return f.read_text(encoding="utf-8").strip() if f.exists() else "unknown"


WSL_MOUNT_RE = re.compile(r"^/mnt/([a-zA-Z])/(.*)$")


def _git_status_any_vantage(repo: str) -> tuple[str | None, str]:
    """`git status --porcelain` from whichever environment can actually read the repo.

    This is `cross-env-verify` implemented rather than merely documented. Hermes runs in
    WSL while these repos live on Windows and carry `.git` files holding Windows paths,
    so WSL's git reports `fatal: not a git repository` for a perfectly healthy tree —
    the exact false negative that produced the 2026-08-05 "re-init the repo" near-miss.
    Verified 2026-08-06: WSL git fails on SwanGuard; `git.exe` on the same path succeeds.

    Reporting "unreachable" after ONE tool fails would make this gate decorative in the
    single environment it matters most, so try the second vantage before giving up.
    Returns (stdout, note) on success, or (None, reason) when every vantage failed.
    """
    args = ["status", "--porcelain", "--untracked-files=all"]
    m = WSL_MOUNT_RE.match(repo)
    win_path = f"{m.group(1)}:/{m.group(2)}" if m else repo

    # (executable, path, label) — native first, then the other side of the mount.
    vantages = [("git", repo, "git")]
    if m or repo != win_path:
        vantages.append(("git.exe", win_path, "git.exe (Windows vantage)"))
    else:
        vantages.append(("git.exe", repo, "git.exe (Windows vantage)"))

    failures = []
    for exe, path, label in vantages:
        try:
            proc = subprocess.run(
                [exe, "-C", path, *args],
                capture_output=True, text=True, timeout=20,
            )
        except (OSError, subprocess.SubprocessError) as exc:
            failures.append(f"{label}: {exc.__class__.__name__}")
            continue
        if proc.returncode == 0:
            return proc.stdout, label
        failures.append(
            f"{label}: " + (proc.stderr.strip().splitlines() or ["exited non-zero"])[0]
        )
    return None, "; ".join(failures)


def detect_test_changes(repo: str) -> tuple[list[str], list[str], str | None]:
    """Assertion-bearing files touched in the working tree.

    Returns (tracked_modified, untracked, unreachable_reason).

    A reason means we could NOT determine the answer — which is not the same as
    "nothing changed" and must never be rendered as such. Hermes runs in WSL while the
    repos live on Windows, so git failing here is routine (see cross-env-verify); an
    empty list from a failed git call is precisely the false "all clear" this gate
    exists to prevent.

    The two buckets are separate because git cannot distinguish them by itself: an
    untracked test file may be brand-new (no disclosure owed) or may have existed
    uncommitted for weeks and just been edited (disclosure very much owed). Only the
    author knows, so the author is asked rather than guessed at.
    """
    out, reason = _git_status_any_vantage(repo)
    if out is None:
        return [], [], reason

    tracked, untracked = [], []
    for line in out.splitlines():
        if len(line) < 4:
            continue
        code, path = line[:2], line[3:].strip()
        if " -> " in path:            # rename: score the destination
            path = path.split(" -> ", 1)[1]
        path = path.strip('"')
        if not TEST_PATH_RE.search(path):
            continue
        (untracked if code.strip() == "??" else tracked).append(path)
    return sorted(set(tracked)), sorted(set(untracked)), None


def render_test_delta_block(repo: str) -> str:
    """The Test-delta section of WORK.md, pre-seeded with what git actually found."""
    tracked, untracked, unreachable = detect_test_changes(repo)
    if unreachable:
        return (
            f"<!-- detector could not read this repo: {unreachable} -->\n"
            "**[UNVERIFIED — every vantage failed to read this repo's git.]** Both the native\n"
            "git and the Windows `git.exe` fallback were tried. This is not a clean bill of\n"
            "health. List every existing test you edited by hand, or state plainly that you\n"
            "edited none. Reviewer: check it yourself before believing it.\n"
        )

    out = []
    if tracked:
        rows = "\n".join(f"| `{h}` |  |  |  |  |" for h in tracked)
        out.append(
            f"**{len(tracked)} tracked assertion-bearing file(s) were modified.** Fill in a\n"
            "row per changed assertion — not per file. Class is `RE-ANCHOR` (the contract\n"
            "really changed) or `SILENCE` (the assertion was moved to match a break). **Any\n"
            "SILENCE row is a STOP — escalate instead of shipping it.** The *why* must stand\n"
            "alone, without the diff, in one sentence.\n\n"
            "| File:line | Before | After | Class | Why the new assertion is the correct one |\n"
            "|---|---|---|---|---|\n"
            f"{rows}\n"
        )
    if untracked:
        listed = "\n".join(f"- `{h}`" for h in untracked)
        out.append(
            f"**{len(untracked)} untracked assertion-bearing file(s) — you must classify these.**\n"
            "Git cannot tell a file you *created* this turn from one that sat uncommitted and\n"
            "you *edited*. The first owes no disclosure; the second owes a full row above.\n"
            "Mark each `NEW` or move it into the table:\n\n"
            f"{listed}\n"
        )
    if not out:
        return (
            "<!-- detector found no modified assertion-bearing files -->\n"
            "None — no existing test, fixture, or snapshot was modified this turn.\n"
        )
    out.append(
        "Then split the pass count, e.g. `52 passed — 49 unchanged, 3 re-anchored above.`\n"
        "A number that silently includes assertions you rewrote is not evidence.\n"
    )
    return "\n".join(out)


WORK_TEMPLATE = """# {title}

- **Item:** `{item_id}`
- **When (UTC):** {when}
- **Repo:** `{repo}`
- **Checkpoint:** {checkpoint}
- **Reviewers requested:** {agents}

## What I did
<2-8 bullets. Concrete: files touched, decisions made, what changed in behavior.>

## Evidence
<Commands run and their real output. A claim without output is a hypothesis.>

## Test delta — existing assertions I changed
{test_delta}
## What I am least sure about
<Name your weakest link. Reviewers should start here — this is the highest-value
section in the file, so do not leave it thin or write "nothing".>

## How to verify
<Exact commands a reviewer can run, with expected output.>

## Known gaps / not done
<Anything deliberately skipped, and why.>
"""

PROMPT_TEMPLATE = """\
Hostile review request — Hermes work item {item_id}

Read this folder and review the work hostilely:
  {folder}

Start with WORK.md, especially its "What I am least sure about" section.

Your job is to try to BREAK this, not to bless it. Specifically:
  - Verify every factual claim yourself. A claim with no command output is a
    hypothesis — check it. Hermes runs in WSL; if a claim depends on a tool
    failing, re-check it from Windows before accepting "it is broken."
  - Any instruction that DELETES, re-clones, re-inits, resets, or overwrites is a
    P0 until proven safe. Confirm the thing it claims is broken really is broken.
  - Check the work against the repo it names — {repo} — and no other.
  - Run the "How to verify" commands. Report what actually happened.
  - NEVER accept a bare pass count from a turn that edited tests. A suite whose
    assertions were rewritten this turn proves nothing on its own. Get ground truth:
      git -C {repo} diff -- '*test*' '*spec*' '*fixture*' '*conftest*'
    For each changed assertion decide yourself whether it is a RE-ANCHOR (the contract
    really changed) or a SILENCE (moved to match a break) BEFORE reading the author's
    reason, then compare. Disagreement on the class is a BLOCKER. Watch the quiet ones
    that never turn a suite red: added .skip/.only, a deleted assertion, a regenerated
    snapshot, a widened tolerance. An empty or missing "Test delta" section that the
    diff contradicts is itself a blocker.
  - Say what is MISSING, not only what is wrong.
{checkpoint_line}
Write your verdict to:
  {folder}/REVIEW-<your-name>.md

Use this shape:
  VERDICT: APPROVE | REVISE | REJECT
  BLOCKERS: numbered, each with file:line evidence and why it breaks
  MINOR: smaller issues
  VERIFIED-GOOD: what you checked and found genuinely correct
  MISSING: what should exist and does not

Then set the status so Hermes picks it up:
  echo "changes-requested" > {folder}/STATUS     # or: approved

Do not edit WORK.md. Hermes owns that file; you own your REVIEW file.
"""


def cmd_open(args: argparse.Namespace) -> None:
    item_id = f"{stamp()}-{slug(args.title)}"
    d = OPEN / item_id
    d.mkdir(parents=True, exist_ok=True)

    ck = args.checkpoint or "NONE — no restore point was taken"
    (d / "WORK.md").write_text(
        WORK_TEMPLATE.format(
            title=args.title, item_id=item_id,
            when=datetime.now(timezone.utc).isoformat(),
            repo=args.repo, checkpoint=ck, agents=args.agents,
            test_delta=render_test_delta_block(args.repo),
        ),
        encoding="utf-8",
    )
    (d / "STATUS").write_text("awaiting-review\n", encoding="utf-8")
    (d / "meta.json").write_text(json.dumps({
        "id": item_id, "title": args.title, "repo": args.repo,
        "checkpoint": args.checkpoint, "agents": args.agents.split(","),
        "opened_utc": datetime.now(timezone.utc).isoformat(),
    }, indent=2), encoding="utf-8")

    prompt = build_prompt(d)
    (d / "PROMPT.txt").write_text(prompt, encoding="utf-8")

    print(f"review item opened: {item_id}")
    print(f"  folder: {d}")

    tracked, untracked, unreachable = detect_test_changes(args.repo)
    if unreachable:
        print(f"  ⚠ test-delta detector could not read git ({unreachable}).")
        print( "    That is 'unknown', NOT 'nothing changed' — list edited tests by hand.")
    else:
        if tracked:
            print(f"  ⚠ {len(tracked)} modified assertion-bearing file(s) — WORK.md needs a")
            print( "    test-delta row per changed assertion, and a SPLIT pass count:")
            for h in tracked[:8]:
                print(f"      · {h}")
            if len(tracked) > 8:
                print(f"      · … and {len(tracked) - 8} more")
        if untracked:
            print(f"  ⚠ {len(untracked)} untracked test file(s) — mark each NEW, or disclose")
            print( "    it as an edit. Git cannot tell 'created' from 'edited' here.")

    print(f"  → fill in WORK.md, then give Sean the prompt below.\n")
    print("=" * 72)
    print(prompt)
    print("=" * 72)


def build_prompt(d: Path) -> str:
    meta = json.loads((d / "meta.json").read_text(encoding="utf-8"))
    ck = meta.get("checkpoint")
    ck_line = (
        f"  - A checkpoint exists ({ck}). If the work is unsafe, say so — it can be\n"
        f"    reverted with scripts/hermes/checkpoint.py restore.\n"
        if ck else
        "  - NO checkpoint was taken for this work. Treat any destructive step as\n"
        "    unrecoverable and weight your review accordingly.\n"
    )
    return PROMPT_TEMPLATE.format(
        item_id=meta["id"], folder=d, repo=meta["repo"], checkpoint_line=ck_line
    )


def cmd_prompt(args: argparse.Namespace) -> None:
    d = OPEN / args.id
    if not d.exists():
        sys.exit(f"no open item: {args.id}")
    print(build_prompt(d))


def cmd_status(args: argparse.Namespace) -> None:
    if not OPEN.exists() or not any(OPEN.iterdir()):
        print("no open review items.")
        return
    rows = []
    for d in sorted(OPEN.iterdir()):
        if not d.is_dir():
            continue
        st = read_status(d)
        reviews = sorted(p.name.replace("REVIEW-", "").replace(".md", "")
                         for p in d.glob("REVIEW-*.md"))
        responded = (d / "RESPONSE.md").exists()
        if st == "awaiting-review":
            waiting = "REVIEWERS" if not reviews else "reviewers (partial)"
        elif st == "changes-requested":
            waiting = "HERMES (fix + respond)" if not responded else "HERMES (re-review)"
        elif st == "approved":
            waiting = "close it"
        else:
            waiting = "?"
        rows.append((d.name, st, ",".join(reviews) or "-", waiting))

    w = max(len(r[0]) for r in rows)
    print(f"{'item':<{w}}  {'status':<18}  {'reviews':<16}  waiting on")
    print("-" * (w + 56))
    for r in rows:
        print(f"{r[0]:<{w}}  {r[1]:<18}  {r[2]:<16}  {r[3]}")


def cmd_close(args: argparse.Namespace) -> None:
    d = OPEN / args.id
    if not d.exists():
        sys.exit(f"no open item: {args.id}")
    st = read_status(d)
    if st != "approved" and not args.force:
        sys.exit(
            f"status is '{st}', not 'approved'. Closing an unreviewed item defeats the "
            f"point of the channel. Use --force only if Sean says so."
        )
    dest = CLOSED / datetime.now(timezone.utc).strftime("%Y-%m")
    dest.mkdir(parents=True, exist_ok=True)
    (d / "STATUS").write_text("closed\n", encoding="utf-8")
    shutil.move(str(d), str(dest / d.name))
    print(f"closed → {dest / d.name}")


def main() -> int:
    ap = argparse.ArgumentParser(description="Hermes hostile-review channel")
    sub = ap.add_subparsers(dest="cmd", required=True)

    o = sub.add_parser("open")
    o.add_argument("--title", required=True)
    o.add_argument("--repo", required=True)
    o.add_argument("--checkpoint", default=None)
    o.add_argument("--agents", default="claude,codex")
    o.set_defaults(fn=cmd_open)

    s = sub.add_parser("status"); s.set_defaults(fn=cmd_status)

    p = sub.add_parser("prompt"); p.add_argument("id"); p.set_defaults(fn=cmd_prompt)

    c = sub.add_parser("close")
    c.add_argument("id"); c.add_argument("--force", action="store_true")
    c.set_defaults(fn=cmd_close)

    # Hermes runs this from WSL (UTF-8) but Sean and reviewers run it from a Windows
    # console (cp1252), where a single arrow or warning glyph raises UnicodeEncodeError
    # and kills the command *after* it has already created the item on disk. Same
    # cross-environment class as everything else in this channel: make it work from
    # both vantages rather than assuming one.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass

    args = ap.parse_args()
    OPEN.mkdir(parents=True, exist_ok=True)
    args.fn(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
