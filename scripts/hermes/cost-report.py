#!/usr/bin/env python3
"""
Hermes spend reporter — what a build actually cost.

WHY THIS EXISTS
    Hermes records real per-(session, model) spend in state.db but surfaces none of it
    in chat. The `display.show_cost` config key is declared and never read by any Python
    consumer, so flipping it does nothing. This reads the same tables the web analytics
    endpoint reads, so the numbers agree with the dashboard.

GRANULARITY (honest limits)
    Cost is stored per (session, model), NOT per individual API call. Each row carries
    `api_call_count`, so per-call is reported as an average, never as a real per-call
    figure. `actual_cost_usd` is only populated when a provider returns it; OpenRouter
    rows are `estimated` from the models API. Treat totals as close, not invoiced.

USAGE
    python3 cost-report.py mark              # stamp "a build starts here"
    python3 cost-report.py                   # spend since the mark (the build total)
    python3 cost-report.py --today           # spend today
    python3 cost-report.py --hours 3         # spend in the last 3 hours
    python3 cost-report.py --days 30         # spend over 30 days
    python3 cost-report.py --json            # machine-readable (for Hermes to read)

SAFETY
    Opens state.db read-only (`mode=ro`). Never writes to it. The only file written is
    the marker, under the Hermes home.
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import time
from datetime import datetime, timedelta, timezone

HERMES_HOME = os.environ.get(
    "HERMES_HOME", os.path.expanduser("~/hermes2/.hermes")
)
DB_PATH = os.path.join(HERMES_HOME, "state.db")
MARKER = os.path.join(HERMES_HOME, ".cost-build-marker")

# Models billed through a flat-rate subscription or running locally cost $0 even
# when the tables record token counts. Anything else is treated as real money.
FREE_PREFIXES = ("hermes-", "qwen", "laguna", "gemma", "ollama/")


def is_free(model: str) -> bool:
    m = (model or "").lower()
    return any(m.startswith(p) for p in FREE_PREFIXES) or ":" in m.split("/")[-1]


def connect() -> sqlite3.Connection:
    if not os.path.exists(DB_PATH):
        sys.exit(f"state.db not found at {DB_PATH} — is HERMES_HOME set correctly?")
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def resolve_since(args: argparse.Namespace) -> tuple[float, str]:
    """Return (epoch_seconds, human_label) for the reporting window."""
    if args.days:
        return time.time() - args.days * 86400, f"last {args.days}d"
    if args.hours:
        return time.time() - args.hours * 3600, f"last {args.hours}h"
    if args.today:
        midnight = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        return midnight.timestamp(), "today"
    if os.path.exists(MARKER):
        ts = float(open(MARKER).read().strip())
        stamped = datetime.fromtimestamp(ts).strftime("%H:%M")
        return ts, f"since build marker ({stamped})"
    # No marker and no flag — default to today rather than the whole history.
    midnight = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    return midnight.timestamp(), "today (no build marker set — run `mark` to start one)"


def collect(conn: sqlite3.Connection, since: float) -> list[dict]:
    """Per-model spend for sessions that were active in the window."""
    rows = conn.execute(
        """
        SELECT u.model                                  AS model,
               SUM(COALESCE(u.api_call_count, 0))       AS calls,
               SUM(COALESCE(u.input_tokens, 0))         AS input_tokens,
               SUM(COALESCE(u.output_tokens, 0))        AS output_tokens,
               SUM(COALESCE(u.reasoning_tokens, 0))     AS reasoning_tokens,
               SUM(COALESCE(u.estimated_cost_usd, 0))   AS est_usd,
               SUM(COALESCE(u.actual_cost_usd, 0))      AS act_usd,
               MAX(COALESCE(u.cost_status, ''))         AS cost_status
        FROM session_model_usage u
        WHERE COALESCE(u.last_seen, 0) >= ?
        GROUP BY u.model
        ORDER BY SUM(COALESCE(u.estimated_cost_usd, 0)) DESC
        """,
        (since,),
    ).fetchall()
    return [dict(r) for r in rows]


def money(v: float) -> str:
    if v == 0:
        return "$0"
    if v < 0.01:
        return f"${v:.4f}"
    return f"${v:.2f}"


def render(rows: list[dict], label: str) -> str:
    paid = [r for r in rows if not is_free(r["model"])]
    free = [r for r in rows if is_free(r["model"])]

    total = sum(r["act_usd"] or r["est_usd"] for r in paid)
    calls = sum(r["calls"] for r in paid)

    out = [f"HERMES SPEND — {label}", "=" * 58]

    if not paid:
        out.append("No paid model calls in this window.")
    else:
        out.append(f"{'model':<32}{'calls':>6}{'avg/call':>11}{'cost':>9}")
        out.append("-" * 58)
        for r in paid:
            cost = r["act_usd"] or r["est_usd"]
            avg = cost / r["calls"] if r["calls"] else 0
            name = r["model"] if len(r["model"]) <= 31 else r["model"][:28] + "..."
            out.append(f"{name:<32}{r['calls']:>6}{money(avg):>11}{money(cost):>9}")
        out.append("-" * 58)
        out.append(f"{'TOTAL':<32}{calls:>6}{'':>11}{money(total):>9}")

    if free:
        fc = sum(r["calls"] for r in free)
        names = ", ".join(sorted({r["model"].split(":")[0] for r in free}))
        out.append("")
        out.append(f"free/local: {fc} calls ({names}) — $0")

    if paid and all((r["act_usd"] or 0) == 0 for r in paid):
        out.append("")
        out.append("note: estimated from provider pricing, not an invoiced amount.")

    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser(add_help=True, description="Hermes spend reporter")
    ap.add_argument("command", nargs="?", default="report", choices=["report", "mark"])
    ap.add_argument("--today", action="store_true", help="spend since midnight")
    ap.add_argument("--hours", type=float, help="spend in the last N hours")
    ap.add_argument("--days", type=float, help="spend over the last N days")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    args = ap.parse_args()

    if args.command == "mark":
        os.makedirs(HERMES_HOME, exist_ok=True)
        now = time.time()
        with open(MARKER, "w") as fh:
            fh.write(str(now))
        stamped = datetime.fromtimestamp(now).strftime("%Y-%m-%d %H:%M:%S")
        print(f"build marker set at {stamped}")
        print("run this script with no arguments when the build is done for the total.")
        return 0

    since, label = resolve_since(args)
    with connect() as conn:
        rows = collect(conn, since)

    if args.json:
        paid = [r for r in rows if not is_free(r["model"])]
        print(json.dumps({
            "window": label,
            "since_epoch": since,
            "total_usd": round(sum(r["act_usd"] or r["est_usd"] for r in paid), 6),
            "paid_calls": sum(r["calls"] for r in paid),
            "by_model": paid,
        }, indent=2))
    else:
        print(render(rows, label))
    return 0


if __name__ == "__main__":
    sys.exit(main())
