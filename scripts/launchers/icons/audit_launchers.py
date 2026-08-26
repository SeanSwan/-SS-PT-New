r"""
audit_launchers.py - is a Desktop .cmd launcher still alive, or is it pointing at nothing?

WHY
---
Before giving 13 launchers icons, the question "is this launcher still used" has to be answered
with something better than a hunch. A launcher is DEAD when the thing it starts no longer exists:
the repo moved, the tool was renamed, the drive is gone. Putting a nice icon on that is worse
than leaving it ugly, because a pretty dead launcher gets clicked.

HOW
---
Batch files declare their dependencies remarkably clearly - `set "X=C:\path"`, `if not exist`,
`cd /d`. This walks those, expands %VARS% against the file's own SET assignments plus a few
environment defaults, and checks each resulting path.

WHAT IT IS NOT
--------------
This is EVIDENCE, not a verdict. A launcher can pass every path check and still be abandoned,
and a launcher can reference a path that only exists after something else runs. It reports; a
human decides. Nothing is deleted, moved, or modified - read-only by construction (Rule 47).
"""

from __future__ import annotations

import datetime
import glob
import os
import re
import sys

DESKTOP = os.path.join(os.path.expanduser("~"), "Desktop")

RE_SET = re.compile(r'^\s*set\s+"([A-Za-z_][A-Za-z0-9_]*)=([^"]*)"', re.I | re.M)
RE_NOTEXIST = re.compile(r'if\s+not\s+exist\s+"([^"]+)"', re.I)
RE_CD = re.compile(r'cd\s+/d\s+"([^"]+)"', re.I)
# The drive letter must NOT be preceded by a word character. Without this lookbehind the
# pattern matched the "U:" inside the registry path HKCU:\Software\... and reported a
# perfectly healthy launcher dead. Validate the instrument before believing what it says.
RE_ABS = re.compile(r'(?<![A-Za-z0-9])([A-Za-z]:' + re.escape(os.sep) + r'[^"\r\n<>|]+)')

# Batch comments. A path quoted inside prose ("videos save to Z:\... - never C:") is
# documentation, not a dependency, and treating it as one produces false BROKEN verdicts.
RE_COMMENT = re.compile(r'^\s*(?:rem\b|::).*$', re.I | re.M)

# A real path ends at a caret continuation, a quote, a semicolon, a paren, or a run of two or
# more spaces - which in a batch file almost always means "and now I am writing English again".
RE_TAIL = re.compile(r'\s{2,}|\s*\^|[\'";)]')
RE_VAR = re.compile(r'%([A-Za-z_][A-Za-z0-9_]*)%')
DRIVE = re.compile(r'^[A-Za-z]:' + re.escape(os.sep))

# Paths under these are OS-provided; their absence would mean a broken Windows, not a dead launcher.
IGNORE_PREFIXES = ("c:\\windows", "c:\\program files")


def expand(value: str, env: dict) -> str:
    """Expand %VARS% against the launcher's own SET assignments, then the real environment."""
    for _ in range(5):
        def repl(m):
            key = m.group(1)
            return env.get(key.upper(), os.environ.get(key, m.group(0)))
        new = RE_VAR.sub(repl, value)
        if new == value:
            break
        value = new
    return value


def dependencies(text: str) -> tuple[set[str], dict]:
    text = RE_COMMENT.sub("", text)
    env = {
        "USERPROFILE": os.path.expanduser("~"),
        "SYSTEMROOT": os.environ.get("SystemRoot", r"C:\Windows"),
    }
    for m in RE_SET.finditer(text):
        env[m.group(1).upper()] = expand(m.group(2), env)

    deps: set[str] = set()
    for rx in (RE_NOTEXIST, RE_CD):
        for m in rx.finditer(text):
            deps.add(expand(m.group(1), env))
    for value in env.values():
        if DRIVE.match(value):
            deps.add(value)
    for m in RE_ABS.finditer(text):
        deps.add(RE_TAIL.split(expand(m.group(1), env))[0].rstrip('" \t' + os.sep))

    clean = set()
    for d in deps:
        if not DRIVE.match(d) or len(d) <= 3:
            continue
        if "%" in d:
            continue                      # unresolved - cannot judge, so do not
        if d.lower().startswith(IGNORE_PREFIXES):
            continue
        if d.lower().startswith(("hkcu:", "hklm:", "hkey")):
            continue                      # registry path, not a filesystem path
        clean.add(d.rstrip(os.sep) if d.count(os.sep) > 1 else d)
    return clean, env


def main() -> int:
    files = sorted(glob.glob(os.path.join(DESKTOP, "*.cmd")))
    if not files:
        print("no .cmd launchers on the Desktop")
        return 0

    live, dead, unknown = [], [], []
    print()
    print(f"  {'launcher':<44} {'modified':<12} {'deps':>5}  verdict")
    print("  " + "-" * 96)

    for path in files:
        text = open(path, encoding="utf-8", errors="replace").read()
        deps, _ = dependencies(text)
        missing = sorted(d for d in deps if not os.path.exists(d))
        mtime = datetime.date.fromtimestamp(os.path.getmtime(path))
        name = os.path.basename(path)

        if not deps:
            verdict, bucket = "no checkable paths - inspect by hand", unknown
        elif not missing:
            verdict, bucket = "LIVE - every referenced path exists", live
        else:
            verdict, bucket = f"BROKEN - {len(missing)}/{len(deps)} paths missing", dead
        bucket.append(name)

        print(f"  {name:<44} {str(mtime):<12} {len(deps):>5}  {verdict}")
        for m in missing[:4]:
            print(f"  {'':<63}x {m}")

    print()
    print(f"  LIVE {len(live)}   BROKEN {len(dead)}   UNKNOWN {len(unknown)}")
    if dead:
        print("  broken: " + ", ".join(dead))
    if unknown:
        print("  needs a human: " + ", ".join(unknown))
    print()
    print("  Reminder: a passing path check is evidence of liveness, not proof of use.")
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
