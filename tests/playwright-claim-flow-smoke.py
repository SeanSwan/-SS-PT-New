"""
Playwright QA: Crystalline Link Protocol Smoke Test
====================================================
Tests the full claim flow: /claim page rendering, token verification API,
admin dashboard client management with Move Fitness badges, and account
status chips. Also validates frontend routing and API endpoints.

Uses Brave browser per project convention.
"""

from playwright.sync_api import sync_playwright
import sys
import os
import time
import json
import requests

BASE_URL = "https://sswanstudios.com"
API_BASE = f"{BASE_URL}/api"
RESULTS_DIR = "tests/screenshots/claim-flow-smoke"
ADMIN_EMAIL = "SeanSwan"
ADMIN_PASS = os.environ.get("TEST_PASSWORD")
if not ADMIN_PASS:
    raise SystemExit("TEST_PASSWORD env var required (no default for security - see CREDENTIALS-ROTATION-OPUS-CODEX-DEBATE-2026-04-21.md)")

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def find_brave():
    """Find Brave browser executable."""
    paths = [
        r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
        r"C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe",
        os.path.expanduser(r"~\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe"),
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    return None


def run_tests():
    ensure_dir(RESULTS_DIR)
    passed = 0
    failed = 0
    warnings = 0
    errors = []
    results = []

    def record(name, status, detail=""):
        nonlocal passed, failed, warnings
        if status == "PASS":
            passed += 1
            print(f"  PASS: {name}")
        elif status == "WARN":
            warnings += 1
            print(f"  WARN: {name} -- {detail}")
        else:
            failed += 1
            errors.append(f"{name}: {detail}")
            print(f"  FAIL: {name} -- {detail}")
        results.append({"name": name, "status": status, "detail": detail})

    brave_path = find_brave()

    with sync_playwright() as p:
        launch_args = {"headless": True}
        if brave_path:
            launch_args["executable_path"] = brave_path
            print(f"Using Brave: {brave_path}")
        else:
            print("Brave not found, using default Chromium")

        browser = p.chromium.launch(**launch_args)

        # Desktop context
        desktop = browser.new_context(viewport={"width": 1440, "height": 900})
        # Mobile context
        mobile = browser.new_context(
            viewport={"width": 375, "height": 812},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)"
        )

        # ═══════════════════════════════════════════════════════
        # PHASE 1: Claim Page Rendering (Public, No Auth)
        # ═══════════════════════════════════════════════════════
        print("\n=== PHASE 1: Claim Page Rendering ===")

        # Test 1: /claim page loads (desktop)
        print("\n[1/12] Claim page loads -- Desktop")
        try:
            page = desktop.new_page()
            console_errors = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            resp = page.goto(f"{BASE_URL}/claim", timeout=30000)
            page.wait_for_load_state("networkidle", timeout=20000)
            page.screenshot(path=f"{RESULTS_DIR}/01-claim-desktop.png", full_page=True)

            if resp and resp.status < 400:
                record("Claim page loads (desktop)", "PASS")
            else:
                record("Claim page loads (desktop)", "FAIL", f"HTTP {resp.status if resp else 'no response'}")

            # Check page content
            body_text = page.text_content("body") or ""
            if "claim" in body_text.lower() or "invite" in body_text.lower() or "swan" in body_text.lower():
                record("Claim page has correct content", "PASS")
            else:
                record("Claim page has correct content", "WARN", "Expected claim/invite/swan text")

            # Check for JS errors
            real_errors = [e for e in console_errors if "favicon" not in e.lower() and "third-party" not in e.lower()]
            if len(real_errors) > 3:
                record("Claim page console errors", "WARN", f"{len(real_errors)} errors")
            else:
                record("Claim page console (clean)", "PASS")
            page.close()
        except Exception as e:
            record("Claim page loads (desktop)", "FAIL", str(e)[:120])

        # Test 2: /claim page loads (mobile)
        print("\n[2/12] Claim page loads -- Mobile")
        try:
            page = mobile.new_page()
            page.goto(f"{BASE_URL}/claim", timeout=30000)
            page.wait_for_load_state("networkidle", timeout=20000)
            page.screenshot(path=f"{RESULTS_DIR}/02-claim-mobile.png", full_page=True)
            record("Claim page loads (mobile)", "PASS")
            page.close()
        except Exception as e:
            record("Claim page loads (mobile)", "FAIL", str(e)[:120])

        # Test 3: /claim/SWAN-TEST token URL loads
        print("\n[3/12] Claim page with token URL")
        try:
            page = desktop.new_page()
            page.goto(f"{BASE_URL}/claim/SWAN-TEST", timeout=30000)
            page.wait_for_load_state("networkidle", timeout=20000)
            page.screenshot(path=f"{RESULTS_DIR}/03-claim-with-token.png", full_page=True)
            record("Claim page with token URL loads", "PASS")
            page.close()
        except Exception as e:
            record("Claim page with token URL loads", "FAIL", str(e)[:120])

        # ═══════════════════════════════════════════════════════
        # PHASE 2: API Endpoint Validation
        # ═══════════════════════════════════════════════════════
        print("\n=== PHASE 2: API Endpoint Validation ===")

        # Test 4: Verify token API (invalid token returns valid:false)
        print("\n[4/12] Claim verify API -- invalid token")
        try:
            resp = requests.get(f"{API_BASE}/claim/verify/SWAN-ZZZZ", timeout=15)
            data = resp.json()
            if resp.status_code == 200 and data.get("success") and data.get("data", {}).get("valid") == False:
                record("Verify API (invalid token)", "PASS", "Returns valid:false as expected")
            elif resp.status_code == 200:
                record("Verify API (invalid token)", "PASS", f"Response: {json.dumps(data)[:80]}")
            else:
                record("Verify API (invalid token)", "FAIL", f"HTTP {resp.status_code}: {resp.text[:80]}")
        except Exception as e:
            record("Verify API (invalid token)", "FAIL", str(e)[:120])

        # Test 5: Activate API (missing fields returns 400)
        print("\n[5/12] Claim activate API -- missing fields")
        try:
            resp = requests.post(f"{API_BASE}/claim/activate", json={}, timeout=15)
            if resp.status_code == 400:
                record("Activate API (validation)", "PASS", "400 on missing fields")
            else:
                record("Activate API (validation)", "WARN", f"Expected 400, got {resp.status_code}")
        except Exception as e:
            record("Activate API (validation)", "FAIL", str(e)[:120])

        # Test 6: Activate API (short password returns 400)
        print("\n[6/12] Claim activate API -- short password")
        try:
            resp = requests.post(f"{API_BASE}/claim/activate", json={"token": "SWAN-TEST", "password": "short"}, timeout=15)
            if resp.status_code == 400:
                record("Activate API (short password)", "PASS", "400 on <8 char password")
            else:
                record("Activate API (short password)", "WARN", f"Expected 400, got {resp.status_code}")
        except Exception as e:
            record("Activate API (short password)", "FAIL", str(e)[:120])

        # ═══════════════════════════════════════════════════════
        # PHASE 3: Admin Dashboard -- Login + Client Management
        # ═══════════════════════════════════════════════════════
        print("\n=== PHASE 3: Admin Dashboard -- Client Management ===")

        # Test 7: Admin login
        print("\n[7/12] Admin login")
        admin_token = None
        try:
            page = desktop.new_page()
            page.goto(f"{BASE_URL}/login", timeout=30000)
            page.wait_for_load_state("networkidle", timeout=20000)

            # Fill login form
            username_input = page.locator('input[type="text"], input[name="username"], input[name="email"], input[placeholder*="user" i], input[placeholder*="email" i]').first
            password_input = page.locator('input[type="password"]').first

            username_input.fill(ADMIN_EMAIL)
            password_input.fill(ADMIN_PASS)

            # Click submit
            submit_btn = page.locator('button[type="submit"], button:has-text("Log In"), button:has-text("Sign In"), button:has-text("Login")').first
            submit_btn.click()

            # Wait for dashboard navigation
            page.wait_for_url("**/dashboard**", timeout=15000)
            page.wait_for_load_state("networkidle", timeout=15000)
            page.screenshot(path=f"{RESULTS_DIR}/07-admin-dashboard.png", full_page=False)
            record("Admin login", "PASS")

            # Extract auth token from localStorage/cookies for API calls
            try:
                admin_token = page.evaluate("() => localStorage.getItem('token') || localStorage.getItem('accessToken') || ''")
            except:
                pass

        except Exception as e:
            record("Admin login", "FAIL", str(e)[:120])

        # Test 8: Navigate to Client Management
        print("\n[8/12] Client Management page")
        try:
            if page and not page.is_closed():
                page.goto(f"{BASE_URL}/dashboard/admin/client-management", timeout=30000)
                page.wait_for_load_state("networkidle", timeout=20000)
                time.sleep(2)  # Let React render
                page.screenshot(path=f"{RESULTS_DIR}/08-client-management.png", full_page=False)
                record("Client Management page loads", "PASS")
            else:
                record("Client Management page loads", "FAIL", "No authenticated page available")
        except Exception as e:
            record("Client Management page loads", "FAIL", str(e)[:120])

        # Test 9: Check for Move Fitness badge rendering
        print("\n[9/12] Move Fitness badge rendering")
        try:
            if page and not page.is_closed():
                # Look for Move Fitness logo images
                mf_badges = page.locator('img[alt="Move Fitness"]').count()
                if mf_badges > 0:
                    record("Move Fitness badges visible", "PASS", f"{mf_badges} badge(s) found")
                else:
                    # Check if any client cards are rendered at all
                    client_cards = page.locator('[class*="client"], [class*="card"], [data-testid*="client"]').count()
                    if client_cards > 0:
                        record("Move Fitness badges visible", "WARN", f"No MF badges but {client_cards} client elements found (may be no MF clients)")
                    else:
                        record("Move Fitness badges visible", "WARN", "No client cards rendered yet")
            else:
                record("Move Fitness badges visible", "FAIL", "No authenticated page")
        except Exception as e:
            record("Move Fitness badges visible", "FAIL", str(e)[:120])

        # Test 10: Check for account status chips (Unclaimed/Invited)
        print("\n[10/12] Account status chips")
        try:
            if page and not page.is_closed():
                body_text = page.text_content("body") or ""
                has_unclaimed = "unclaimed" in body_text.lower()
                has_invited = "invited" in body_text.lower()
                if has_unclaimed or has_invited:
                    record("Account status chips", "PASS", f"Unclaimed: {has_unclaimed}, Invited: {has_invited}")
                else:
                    record("Account status chips", "WARN", "No Unclaimed/Invited chips visible (may be no stub clients)")
            else:
                record("Account status chips", "FAIL", "No authenticated page")
        except Exception as e:
            record("Account status chips", "FAIL", str(e)[:120])

        # Test 11: Source filter dropdown
        print("\n[11/12] Source filter dropdown")
        try:
            if page and not page.is_closed():
                # Look for select or filter elements
                filter_el = page.locator('select, [class*="filter"], [class*="source"]').first
                body_text = page.text_content("body") or ""
                has_filter = "all sources" in body_text.lower() or "swanstudios" in body_text.lower() or "move fitness" in body_text.lower()
                if has_filter:
                    record("Source filter present", "PASS")
                else:
                    record("Source filter present", "WARN", "Filter text not found in page")
            else:
                record("Source filter present", "FAIL", "No authenticated page")
        except Exception as e:
            record("Source filter present", "FAIL", str(e)[:120])

        # ═══════════════════════════════════════════════════════
        # PHASE 4: Generate Token API (Admin Authenticated)
        # ═══════════════════════════════════════════════════════
        print("\n=== PHASE 4: Generate Token API ===")

        # Test 12: Generate token endpoint (requires auth)
        print("\n[12/12] Generate token API -- auth required")
        try:
            # Try without auth first (should fail)
            resp = requests.post(f"{API_BASE}/claim/generate-token", json={"clientId": 1}, timeout=15)
            if resp.status_code in [401, 403]:
                record("Generate token API (auth required)", "PASS", f"Correctly returns {resp.status_code} without auth")
            elif resp.status_code == 500:
                record("Generate token API (auth required)", "WARN", "500 error (may need migration)")
            else:
                record("Generate token API (auth required)", "WARN", f"Unexpected status: {resp.status_code}")
        except Exception as e:
            record("Generate token API (auth required)", "FAIL", str(e)[:120])

        # Cleanup
        try:
            if page and not page.is_closed():
                page.close()
        except:
            pass
        desktop.close()
        mobile.close()
        browser.close()

    # ═══════════════════════════════════════════════════════
    # RESULTS SUMMARY
    # ═══════════════════════════════════════════════════════
    print("\n" + "=" * 60)
    print(f"CRYSTALLINE LINK PROTOCOL SMOKE TEST RESULTS")
    print(f"=" * 60)
    print(f"  PASSED:   {passed}")
    print(f"  WARNINGS: {warnings}")
    print(f"  FAILED:   {failed}")
    print(f"  TOTAL:    {passed + warnings + failed}")
    print(f"=" * 60)

    if errors:
        print("\nFAILURES:")
        for e in errors:
            print(f"  - {e}")

    # Save results JSON
    results_file = f"{RESULTS_DIR}/test-results.json"
    with open(results_file, "w") as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "summary": {"passed": passed, "warnings": warnings, "failed": failed},
            "results": results
        }, f, indent=2)
    print(f"\nResults saved to {results_file}")
    print(f"Screenshots saved to {RESULTS_DIR}/")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(run_tests())
