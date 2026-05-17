"""
Playwright QA: Gamification Security & Feature Verification
============================================================
Tests the sswanstudios.com production site for:
1. Security: IDOR protection on gamification endpoints
2. Security: Pagination caps on leaderboard
3. Feature: Gamification API endpoints respond correctly
4. Feature: New endpoints (activity-feed, weekly-recap, comeback-challenge)
5. UI: Basic page loads without errors

Run: python tests/playwright-qa-gamification-security.py
"""

import json
import sys
from datetime import datetime
from playwright.sync_api import sync_playwright

BASE_URL = "https://sswanstudios.com"
API_BASE = f"{BASE_URL}/api/v1/gamification"
RESULTS = []

def log_result(test_name, passed, details=""):
    status = "PASS" if passed else "FAIL"
    RESULTS.append({"test": test_name, "status": status, "details": details})
    print(f"  [{status}] {test_name}" + (f" — {details}" if details else ""))

def run_tests():
    print(f"\n{'='*60}")
    print(f"SwanStudios Production QA — Gamification Security")
    print(f"Target: {BASE_URL}")
    print(f"Date: {datetime.now().isoformat()}")
    print(f"{'='*60}\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 375, "height": 812},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) SwanStudiosQA/1.0"
        )
        page = context.new_page()
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        # ─────────────────────────────────────────────
        # TEST 1: Homepage loads
        # ─────────────────────────────────────────────
        print("--- Page Load Tests ---")
        try:
            response = page.goto(BASE_URL, wait_until="domcontentloaded", timeout=30000)
            log_result("Homepage loads", response and response.status < 400, f"Status: {response.status if response else 'None'}")
        except Exception as e:
            log_result("Homepage loads", False, str(e)[:100])

        # ─────────────────────────────────────────────
        # TEST 2: API health check
        # ─────────────────────────────────────────────
        print("\n--- API Health Tests ---")

        # Gamification settings (public endpoint)
        try:
            resp = page.goto(f"{API_BASE}/settings", wait_until="domcontentloaded", timeout=15000)
            body = page.text_content("body") or ""
            is_json = body.startswith("{") or body.startswith("[")
            log_result("GET /api/gamification/settings", resp and resp.status == 200 and is_json, f"Status: {resp.status if resp else 'None'}")
        except Exception as e:
            log_result("GET /api/gamification/settings", False, str(e)[:100])

        # Leaderboard (public endpoint)
        try:
            resp = page.goto(f"{API_BASE}/leaderboard?limit=5", wait_until="domcontentloaded", timeout=15000)
            body = page.text_content("body") or ""
            log_result("GET /api/gamification/leaderboard", resp and resp.status == 200, f"Status: {resp.status if resp else 'None'}")
        except Exception as e:
            log_result("GET /api/gamification/leaderboard", False, str(e)[:100])

        # Achievements (public endpoint)
        try:
            resp = page.goto(f"{API_BASE}/achievements", wait_until="domcontentloaded", timeout=15000)
            body = page.text_content("body") or ""
            log_result("GET /api/gamification/achievements", resp and resp.status == 200, f"Status: {resp.status if resp else 'None'}")
        except Exception as e:
            log_result("GET /api/gamification/achievements", False, str(e)[:100])

        # Rewards (public endpoint)
        try:
            resp = page.goto(f"{API_BASE}/rewards", wait_until="domcontentloaded", timeout=15000)
            body = page.text_content("body") or ""
            log_result("GET /api/gamification/rewards", resp and resp.status == 200, f"Status: {resp.status if resp else 'None'}")
        except Exception as e:
            log_result("GET /api/gamification/rewards", False, str(e)[:100])

        # Milestones (public endpoint)
        try:
            resp = page.goto(f"{API_BASE}/milestones", wait_until="domcontentloaded", timeout=15000)
            body = page.text_content("body") or ""
            log_result("GET /api/gamification/milestones", resp and resp.status == 200, f"Status: {resp.status if resp else 'None'}")
        except Exception as e:
            log_result("GET /api/gamification/milestones", False, str(e)[:100])

        # ─────────────────────────────────────────────
        # TEST 3: Security — IDOR protection (should return 401/403 without auth)
        # ─────────────────────────────────────────────
        print("\n--- Security: IDOR Protection Tests ---")

        idor_endpoints = [
            "/users/1/profile",
            "/users/1/transactions",
            "/users/1/weekly-recap",
            "/streak-freeze/1",
            "/comeback-challenge/1",
            "/activity-feed",
        ]

        for endpoint in idor_endpoints:
            try:
                resp = page.goto(f"{API_BASE}{endpoint}", wait_until="domcontentloaded", timeout=15000)
                # Should be 401 (unauthorized) or 403 (forbidden) without auth token
                is_blocked = resp and resp.status in [401, 403]
                log_result(f"IDOR: GET {endpoint}", is_blocked, f"Status: {resp.status if resp else 'None'} (expected 401/403)")
            except Exception as e:
                log_result(f"IDOR: GET {endpoint}", False, str(e)[:100])

        # ─────────────────────────────────────────────
        # TEST 4: Security — Pagination cap
        # ─────────────────────────────────────────────
        print("\n--- Security: Pagination Cap Tests ---")
        try:
            resp = page.goto(f"{API_BASE}/leaderboard?limit=9999", wait_until="domcontentloaded", timeout=15000)
            body = page.text_content("body") or ""
            if resp and resp.status == 200:
                try:
                    data = json.loads(body)
                    actual_limit = data.get("pagination", {}).get("limit", -1)
                    capped = actual_limit <= 100
                    log_result("Pagination cap on leaderboard", capped, f"Limit: {actual_limit} (max 100)")
                except json.JSONDecodeError:
                    log_result("Pagination cap on leaderboard", False, "Non-JSON response")
            else:
                log_result("Pagination cap on leaderboard", False, f"Status: {resp.status if resp else 'None'}")
        except Exception as e:
            log_result("Pagination cap on leaderboard", False, str(e)[:100])

        # ─────────────────────────────────────────────
        # TEST 5: Security — Error messages don't leak internal details
        # ─────────────────────────────────────────────
        print("\n--- Security: Error Message Sanitization ---")
        try:
            resp = page.goto(f"{API_BASE}/users/999999/profile", wait_until="domcontentloaded", timeout=15000)
            body = page.text_content("body") or ""
            # Check response doesn't contain stack traces or SQL details
            no_leak = "SequelizeDatabaseError" not in body and "at Object." not in body and "SELECT" not in body
            log_result("No info leak in error response", no_leak, f"Status: {resp.status if resp else 'None'}")
        except Exception as e:
            log_result("No info leak in error response", False, str(e)[:100])

        # ─────────────────────────────────────────────
        # TEST 6: Console errors check
        # ─────────────────────────────────────────────
        print("\n--- Console Error Summary ---")
        critical_errors = [e for e in console_errors if "Error" in e or "error" in e.lower()]
        log_result(f"No critical console errors", len(critical_errors) == 0, f"{len(critical_errors)} errors found")
        if critical_errors:
            for err in critical_errors[:5]:
                print(f"    ! {err[:120]}")

        # ─────────────────────────────────────────────
        # TEST 7: Screenshot for visual verification
        # ─────────────────────────────────────────────
        print("\n--- Visual Capture ---")
        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.screenshot(path="tests/screenshots/production-homepage-mobile.png", full_page=True)
            log_result("Homepage screenshot captured", True, "tests/screenshots/production-homepage-mobile.png")
        except Exception as e:
            log_result("Homepage screenshot captured", False, str(e)[:100])

        browser.close()

    # ─────────────────────────────────────────────
    # SUMMARY
    # ─────────────────────────────────────────────
    total = len(RESULTS)
    passed = sum(1 for r in RESULTS if r["status"] == "PASS")
    failed = sum(1 for r in RESULTS if r["status"] == "FAIL")

    print(f"\n{'='*60}")
    print(f"RESULTS: {passed}/{total} passed, {failed} failed")
    print(f"{'='*60}\n")

    if failed > 0:
        print("FAILED TESTS:")
        for r in RESULTS:
            if r["status"] == "FAIL":
                print(f"  - {r['test']}: {r['details']}")

    return failed == 0

if __name__ == "__main__":
    # Ensure screenshots directory exists
    import os
    os.makedirs("tests/screenshots", exist_ok=True)

    success = run_tests()
    sys.exit(0 if success else 1)
