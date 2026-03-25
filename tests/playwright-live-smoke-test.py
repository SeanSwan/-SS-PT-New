"""
Playwright QA: Live Site Smoke Test
====================================
Hits sswanstudios.com and validates key routes, console errors,
touch targets, visual rendering, and page load performance.
"""

from playwright.sync_api import sync_playwright
import sys
import os
import time

BASE_URL = "https://sswanstudios.com"
RESULTS_DIR = "frontend/test-results/live-smoke-test"

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

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
            print(f"  WARN: {name} — {detail}")
        else:
            failed += 1
            errors.append(f"{name}: {detail}")
            print(f"  FAIL: {name} — {detail}")
        results.append((name, status, detail))

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # ═══════════════════════════════════════════════════════
        # MOBILE CONTEXT (375x812 — iPhone 13 mini)
        # ═══════════════════════════════════════════════════════
        mobile = browser.new_context(
            viewport={"width": 375, "height": 812},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"
        )

        # ═══════════════════════════════════════════════════════
        # DESKTOP CONTEXT (1440x900)
        # ═══════════════════════════════════════════════════════
        desktop = browser.new_context(viewport={"width": 1440, "height": 900})

        # ─── Test 1: Homepage loads (desktop) ────────────────
        print("\n[1/12] Homepage — Desktop")
        try:
            page = desktop.new_page()
            console_errors = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            start = time.time()
            page.goto(BASE_URL, timeout=30000)
            page.wait_for_load_state("networkidle", timeout=20000)
            load_time = time.time() - start
            page.screenshot(path=f"{RESULTS_DIR}/01-homepage-desktop.png", full_page=False)
            record("Homepage loads (desktop)", "PASS")
            if load_time > 5:
                record("Homepage load time", "WARN", f"{load_time:.1f}s (target <5s)")
            else:
                record("Homepage load time", "PASS", f"{load_time:.1f}s")
            # Check console errors
            real_errors = [e for e in console_errors if "favicon" not in e.lower() and "404" not in e and "third-party" not in e.lower()]
            if real_errors:
                record("Homepage console errors", "WARN", f"{len(real_errors)} errors: {real_errors[0][:80]}")
            else:
                record("Homepage console errors (none)", "PASS")
            page.close()
        except Exception as e:
            record("Homepage loads (desktop)", "FAIL", str(e)[:120])

        # ─── Test 2: Homepage loads (mobile) ─────────────────
        print("\n[2/12] Homepage — Mobile")
        try:
            page = mobile.new_page()
            page.goto(BASE_URL, timeout=30000)
            page.wait_for_load_state("networkidle", timeout=20000)
            page.screenshot(path=f"{RESULTS_DIR}/02-homepage-mobile.png", full_page=False)
            record("Homepage loads (mobile 375px)", "PASS")
            page.close()
        except Exception as e:
            record("Homepage loads (mobile)", "FAIL", str(e)[:120])

        # ─── Test 3: Login page ──────────────────────────────
        print("\n[3/12] Login Page")
        try:
            page = desktop.new_page()
            page.goto(f"{BASE_URL}/login", timeout=15000)
            page.wait_for_load_state("networkidle", timeout=15000)
            page.screenshot(path=f"{RESULTS_DIR}/03-login-desktop.png")
            record("Login page accessible", "PASS")
            page.close()
        except Exception as e:
            record("Login page", "FAIL", str(e)[:120])

        # ─── Test 4: Store/Shop page ─────────────────────────
        print("\n[4/12] Store Page")
        try:
            page = desktop.new_page()
            page.goto(f"{BASE_URL}/store", timeout=15000)
            page.wait_for_load_state("networkidle", timeout=15000)
            page.screenshot(path=f"{RESULTS_DIR}/04-store-desktop.png", full_page=True)
            record("Store page accessible", "PASS")
            page.close()
        except Exception as e:
            record("Store page", "FAIL", str(e)[:120])

        # ─── Test 5: Social feed page ────────────────────────
        print("\n[5/12] Social Feed")
        try:
            page = desktop.new_page()
            page.goto(f"{BASE_URL}/social", timeout=15000)
            page.wait_for_load_state("networkidle", timeout=15000)
            page.screenshot(path=f"{RESULTS_DIR}/05-social-desktop.png", full_page=True)
            record("Social feed accessible", "PASS")
            page.close()
        except Exception as e:
            record("Social feed", "FAIL", str(e)[:120])

        # ─── Test 6: Gallery page ────────────────────────────
        print("\n[6/12] Gallery Page")
        try:
            page = desktop.new_page()
            page.goto(f"{BASE_URL}/gallery", timeout=15000)
            page.wait_for_load_state("networkidle", timeout=15000)
            page.screenshot(path=f"{RESULTS_DIR}/06-gallery-desktop.png")
            record("Gallery page accessible", "PASS")
            page.close()
        except Exception as e:
            record("Gallery page", "FAIL", str(e)[:120])

        # ─── Test 7: Touch targets (mobile) ──────────────────
        print("\n[7/12] Touch Targets — Mobile")
        try:
            page = mobile.new_page()
            page.goto(BASE_URL, timeout=30000)
            page.wait_for_load_state("networkidle", timeout=20000)
            small_buttons = page.evaluate("""
                () => {
                    const els = document.querySelectorAll('button, a, [role="button"], input[type="submit"]');
                    const small = [];
                    els.forEach(el => {
                        const rect = el.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0 &&
                            (rect.width < 44 || rect.height < 44)) {
                            small.push({
                                tag: el.tagName,
                                text: (el.textContent || '').trim().slice(0, 30),
                                w: Math.round(rect.width),
                                h: Math.round(rect.height)
                            });
                        }
                    });
                    return small;
                }
            """)
            if len(small_buttons) == 0:
                record("All touch targets >= 44px", "PASS")
            else:
                detail = f"{len(small_buttons)} under 44px"
                for btn in small_buttons[:3]:
                    detail += f" | {btn['tag']}:'{btn['text']}' {btn['w']}x{btn['h']}"
                record("Touch targets", "WARN", detail)
            page.close()
        except Exception as e:
            record("Touch targets", "FAIL", str(e)[:120])

        # ─── Test 8: No white flash / blank page ─────────────
        print("\n[8/12] No White Flash")
        try:
            page = desktop.new_page()
            page.goto(BASE_URL, timeout=30000)
            page.wait_for_load_state("domcontentloaded", timeout=10000)
            # Wait 1s for React to hydrate
            page.wait_for_timeout(1000)
            bg_color = page.evaluate("""
                () => {
                    const body = document.body;
                    const computed = getComputedStyle(body);
                    return computed.backgroundColor;
                }
            """)
            if "255, 255, 255" in bg_color or bg_color == "rgb(255, 255, 255)":
                record("No white flash", "WARN", f"Body bg is white: {bg_color}")
            else:
                record("No white flash", "PASS", f"Body bg: {bg_color}")
            page.close()
        except Exception as e:
            record("No white flash", "FAIL", str(e)[:120])

        # ─── Test 9: Key routes return 200 (not 404/500) ─────
        print("\n[9/12] Route Health Check")
        routes = ["/", "/login", "/store", "/social", "/gallery"]
        for route in routes:
            try:
                page = desktop.new_page()
                resp = page.goto(f"{BASE_URL}{route}", timeout=15000)
                status = resp.status if resp else 0
                if status == 200:
                    record(f"Route {route} → {status}", "PASS")
                else:
                    record(f"Route {route}", "WARN", f"Status {status}")
                page.close()
            except Exception as e:
                record(f"Route {route}", "FAIL", str(e)[:80])

        # ─── Test 10: JS bundle loads (no crash) ─────────────
        print("\n[10/12] JS Bundle Integrity")
        try:
            page = desktop.new_page()
            js_errors = []
            page.on("pageerror", lambda err: js_errors.append(str(err)))
            page.goto(BASE_URL, timeout=30000)
            page.wait_for_load_state("networkidle", timeout=20000)
            if js_errors:
                record("JS runtime errors", "WARN", f"{len(js_errors)}: {js_errors[0][:80]}")
            else:
                record("No JS runtime errors", "PASS")
            page.close()
        except Exception as e:
            record("JS bundle", "FAIL", str(e)[:120])

        # ─── Test 11: Responsive nav (mobile hamburger) ──────
        print("\n[11/12] Mobile Navigation")
        try:
            page = mobile.new_page()
            page.goto(BASE_URL, timeout=30000)
            page.wait_for_load_state("networkidle", timeout=20000)
            # Look for hamburger / menu button
            nav_btn = page.locator('button[aria-label*="menu" i], button[aria-label*="nav" i], button:has(svg), [data-testid="mobile-menu"]').first
            if nav_btn.is_visible():
                record("Mobile nav button visible", "PASS")
                page.screenshot(path=f"{RESULTS_DIR}/11-mobile-nav.png")
            else:
                record("Mobile nav button", "WARN", "Not found or not visible")
                page.screenshot(path=f"{RESULTS_DIR}/11-mobile-nav-missing.png")
            page.close()
        except Exception as e:
            record("Mobile nav", "FAIL", str(e)[:120])

        # ─── Test 12: Full-page screenshot (desktop) ─────────
        print("\n[12/12] Full Page Screenshot")
        try:
            page = desktop.new_page()
            page.goto(BASE_URL, timeout=30000)
            page.wait_for_load_state("networkidle", timeout=20000)
            page.screenshot(path=f"{RESULTS_DIR}/12-full-page-desktop.png", full_page=True)
            record("Full page screenshot captured", "PASS")
            page.close()
        except Exception as e:
            record("Full page screenshot", "FAIL", str(e)[:120])

        mobile.close()
        desktop.close()
        browser.close()

    # ─── Summary ──────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"LIVE SMOKE TEST: {BASE_URL}")
    print(f"{'='*60}")
    print(f"PASSED:   {passed}")
    print(f"WARNINGS: {warnings}")
    print(f"FAILED:   {failed}")
    print(f"TOTAL:    {passed + warnings + failed}")
    print(f"{'='*60}")
    if errors:
        print("\nFAILURES:")
        for e in errors:
            print(f"  - {e}")
    print(f"\nScreenshots saved to: {RESULTS_DIR}/")
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(run_tests())
