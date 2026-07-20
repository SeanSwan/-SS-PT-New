#!/usr/bin/env python3
"""
exportMessages.py — READ-ONLY export of workout-looking messages from Hermes state.db.

WHY THIS EXISTS
    Hermes' state.db lives in WSL; Windows Node cannot open it directly, and WSL's Node (v20) predates
    node:sqlite. Python3 stdlib sqlite3 is present everywhere Hermes runs, so this is the portable bridge.

WHY AN EXPLICIT EXPORT STEP IS GOOD, NOT A WORKAROUND
    This is the moment client data leaves the database. Making it an explicit, inspectable JSONL file means
    Sean can read exactly what was extracted BEFORE any record is written. A silent end-to-end pipeline would
    move the same data with less visibility.

SAFETY
    - Opens the database strictly read-only (`file:...?mode=ro`). It cannot modify Hermes state.
    - Pre-filters to messages that actually look like a workout, so unrelated conversation is never exported.
    - Writes only to the path you name. Refuses to write inside a git repo.

USAGE
    python3 exportMessages.py --db ~/hermes2/.hermes/state.db --out /tmp/workout-candidates.jsonl
    python3 exportMessages.py --db ... --out ... --since 2026-07-01
"""
import argparse
import json
import os
import re
import sqlite3
import sys
from datetime import datetime, timezone


def has_git_ancestor(path: str) -> bool:
    """True when any ancestor directory contains `.git`. Hostile review 2026-07-20: the old check
    looked only at the out-file's immediate parent, so writing client data into a repo SUBDIRECTORY
    was not refused. Client data must never be commitable."""
    cur = os.path.dirname(os.path.abspath(path))
    while True:
        if os.path.isdir(os.path.join(cur, ".git")):
            return True
        parent = os.path.dirname(cur)
        if parent == cur:
            return False
        cur = parent


def ts_to_iso(ts):
    """Hermes `messages.timestamp` is a UNIX EPOCH (observed: 1784228678). Normalise epoch
    seconds/millis or ISO-ish strings to ISO-8601 UTC; return None when unusable."""
    try:
        s = str(ts).strip()
        if re.fullmatch(r"\d{9,13}(\.\d+)?", s):
            n = float(s)
            if n >= 1e12:
                n /= 1000.0
            return datetime.fromtimestamp(n, tz=timezone.utc).isoformat()
        # Already a date-ish string — validate it parses, then pass through.
        datetime.fromisoformat(s.replace("Z", "+00:00"))
        return s
    except Exception:
        return None


def ts_epoch(ts):
    """Epoch seconds for comparison, or None."""
    try:
        s = str(ts).strip()
        if re.fullmatch(r"\d{9,13}(\.\d+)?", s):
            n = float(s)
            return n / 1000.0 if n >= 1e12 else n
        return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
    except Exception:
        return None

# Mirrors looksLikeWorkout() in parseWorkout.mjs — keep the two in sync.
SETS_REPS = re.compile(r"\b\d{1,3}\s*(?:x|×)\s*\d{1,4}\b", re.I)
SETS_OF = re.compile(r"\b\d{1,3}\s*sets?\s+of\s+\d{1,4}\b", re.I)


# An explicit client marker is REQUIRED, not optional.
# Verified 2026-07-19 against 277 real messages: sets-x-reps alone matched 5, and ALL FIVE were software
# conversation ("client dashboard needs a 3x12 grid", JSDoc @returns/@deprecated, a class named
# ...ApiClient). Engineering chatter never says "client 84:", so requiring the marker drops false
# positives to zero on that corpus. Mirrors looksLikeWorkout() in parseWorkout.mjs — keep in sync.
CLIENT_ID = re.compile(r"\b(?:for\s+)?client\s*#?\s*:?\s*(\d{1,6})\b", re.I)
CLIENT_NAME = re.compile(r"\bclient\s*:\s*([A-Z][A-Za-z'’-]*)")
LEADING_ID = re.compile(r"^\s*#?(\d{1,6})\s*[:\-–—]\s*")
STOPLIST = {
    "dashboard", "progress", "intervention", "grid", "view", "page", "list", "table", "data",
    "record", "management", "manager", "card", "panel", "detail", "profile", "onboarding",
    "workflow", "app", "ui", "ux", "api", "route", "model", "schema", "component", "and", "or",
    "the", "notes", "session", "workout", "chart", "tab", "feed", "form",
}


CODE_SUFFIX = re.compile(r"(Client|Service|Api|Controller|Provider|Manager|Handler|Repo|Store|Config)$")


def looks_like_code_identifier(token: str) -> bool:
    """People are not CamelCase. Found 2026-07-19: 'client: OperatorObservabilityApiClient'
    legitimately matched the colon rule and created a client named after a class."""
    if len(token) > 24:
        return True
    if sum(1 for c in token if c.isupper()) >= 3:
        return True
    if "_" in token or "$" in token:
        return True
    return bool(CODE_SUFFIX.search(token))


def has_client_marker(text: str) -> bool:
    if CLIENT_ID.search(text) or LEADING_ID.search(text):
        return True
    m = CLIENT_NAME.search(text)
    if not m:
        return False
    name = m.group(1)
    return name.lower() not in STOPLIST and not looks_like_code_identifier(name)


def looks_like_workout(text: str) -> bool:
    if not text or not any(ch.isdigit() for ch in text):
        return False
    if not (SETS_REPS.search(text) or SETS_OF.search(text)):
        return False
    return has_client_marker(text)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", required=True, help="path to Hermes state.db (opened READ-ONLY)")
    ap.add_argument("--out", required=True, help="destination .jsonl for candidate messages")
    ap.add_argument("--since", default=None, help="ISO date lower bound, e.g. 2026-07-01")
    ap.add_argument("--source", default=None, help="restrict to a session source, e.g. telegram")
    args = ap.parse_args()

    db_path = os.path.abspath(os.path.expanduser(args.db))
    out_path = os.path.abspath(os.path.expanduser(args.out))

    if not os.path.isfile(db_path):
        print(f"error: no database at {db_path}", file=sys.stderr)
        return 2
    if has_git_ancestor(out_path):
        print("error: refusing to write client data anywhere under a git repository", file=sys.stderr)
        return 2

    # --since: SQL-side comparison of an epoch INTEGER column to a TEXT date param is ALWAYS FALSE
    # under SQLite type ordering (integer < text). Filter python-side instead, handling both shapes.
    since_epoch = None
    if args.since:
        since_epoch = ts_epoch(args.since)
        if since_epoch is None:
            print(f"error: --since {args.since!r} is not a parsable date", file=sys.stderr)
            return 2

    con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row

    sql = [
        "SELECT m.id, m.session_id, m.role, m.content, m.timestamp, s.source",
        "FROM messages m JOIN sessions s ON m.session_id = s.id",
        "WHERE m.role = 'user'",
    ]
    params: list = []
    if args.source:
        sql.append("AND s.source = ?")
        params.append(args.source)
    sql.append("ORDER BY m.timestamp ASC")

    scanned = kept = 0
    with open(out_path, "w", encoding="utf-8") as fh:
        for row in con.execute(" ".join(sql), params):
            scanned += 1
            content = row["content"] or ""
            if since_epoch is not None:
                row_epoch = ts_epoch(row["timestamp"])
                if row_epoch is not None and row_epoch < since_epoch:
                    continue
            if not looks_like_workout(content):
                continue
            kept += 1
            fh.write(json.dumps({
                "messageId": row["id"],
                "sessionId": row["session_id"],
                "source": row["source"],
                "timestamp": row["timestamp"],
                "timestampIso": ts_to_iso(row["timestamp"]),
                "text": content,
            }, ensure_ascii=False) + "\n")
    con.close()

    print(f"scanned {scanned} user messages -> kept {kept} workout candidates")
    print(f"wrote {out_path}")
    print("REVIEW THIS FILE before running the ingest step — it contains client data.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
