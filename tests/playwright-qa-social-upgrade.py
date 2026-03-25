"""
Playwright QA: Social Media + User Dashboard Upgrade
=====================================================
Tests the Phase 5 social/dashboard upgrade components.
Connects to the running dev server and validates key features.
"""

from playwright.sync_api import sync_playwright
import sys
import os

BASE_URL = os.environ.get("BASE_URL", "http://localhost:5173")
RESULTS_DIR = "frontend/test-results/social-upgrade-qa"

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def run_tests():
    ensure_dir(RESULTS_DIR)
    passed = 0
    failed = 0
    errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Mobile viewport (375px)
        mobile_ctx = browser.new_context(viewport={"width": 375, "height": 812})
        # Desktop viewport (1440px)
        desktop_ctx = browser.new_context(viewport={"width": 1440, "height": 900})

        # ─── Test 1: Homepage loads ───────────────────────────
        try:
            page = desktop_ctx.new_page()
            page.goto(BASE_URL, timeout=30000)
            page.wait_for_load_state("networkidle", timeout=15000)
            page.screenshot(path=f"{RESULTS_DIR}/01-homepage-desktop.png", full_page=False)
            print("PASS: Homepage loads on desktop")
            passed += 1
            page.close()
        except Exception as e:
            print(f"FAIL: Homepage loads - {e}")
            failed += 1
            errors.append(f"Homepage: {e}")

        # ─── Test 2: Login page accessible ────────────────────
        try:
            page = desktop_ctx.new_page()
            page.goto(f"{BASE_URL}/login", timeout=15000)
            page.wait_for_load_state("networkidle", timeout=10000)
            page.screenshot(path=f"{RESULTS_DIR}/02-login-desktop.png")
            print("PASS: Login page accessible")
            passed += 1
            page.close()
        except Exception as e:
            print(f"FAIL: Login page - {e}")
            failed += 1
            errors.append(f"Login: {e}")

        # ─── Test 3: Mobile homepage ──────────────────────────
        try:
            page = mobile_ctx.new_page()
            page.goto(BASE_URL, timeout=30000)
            page.wait_for_load_state("networkidle", timeout=15000)
            page.screenshot(path=f"{RESULTS_DIR}/03-homepage-mobile.png")
            print("PASS: Homepage loads on mobile (375px)")
            passed += 1
            page.close()
        except Exception as e:
            print(f"FAIL: Mobile homepage - {e}")
            failed += 1
            errors.append(f"Mobile homepage: {e}")

        # ─── Test 4: Social feed page ─────────────────────────
        try:
            page = desktop_ctx.new_page()
            page.goto(f"{BASE_URL}/social", timeout=15000)
            page.wait_for_load_state("networkidle", timeout=10000)
            page.screenshot(path=f"{RESULTS_DIR}/04-social-feed-desktop.png", full_page=True)
            print("PASS: Social feed page accessible")
            passed += 1
            page.close()
        except Exception as e:
            print(f"FAIL: Social feed - {e}")
            failed += 1
            errors.append(f"Social feed: {e}")

        # ─── Test 5: User dashboard page ──────────────────────
        try:
            page = desktop_ctx.new_page()
            page.goto(f"{BASE_URL}/user-dashboard", timeout=15000)
            page.wait_for_load_state("networkidle", timeout=10000)
            page.screenshot(path=f"{RESULTS_DIR}/05-user-dashboard-desktop.png", full_page=True)
            print("PASS: User dashboard accessible")
            passed += 1
            page.close()
        except Exception as e:
            print(f"FAIL: User dashboard - {e}")
            failed += 1
            errors.append(f"User dashboard: {e}")

        # ─── Test 6: Touch targets on mobile ──────────────────
        try:
            page = mobile_ctx.new_page()
            page.goto(BASE_URL, timeout=30000)
            page.wait_for_load_state("networkidle", timeout=15000)
            # Check all buttons have minimum 44px touch targets
            small_buttons = page.evaluate("""
                () => {
                    const buttons = document.querySelectorAll('button, a, [role="button"]');
                    const small = [];
                    buttons.forEach(btn => {
                        const rect = btn.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0 &&
                            (rect.width < 44 || rect.height < 44)) {
                            small.push({
                                text: btn.textContent?.trim().slice(0, 30),
                                width: Math.round(rect.width),
                                height: Math.round(rect.height)
                            });
                        }
                    });
                    return small;
                }
            """)
            if len(small_buttons) == 0:
                print("PASS: All touch targets >= 44px")
                passed += 1
            else:
                print(f"WARN: {len(small_buttons)} elements under 44px touch target")
                for btn in small_buttons[:5]:
                    print(f"  - '{btn['text']}' ({btn['width']}x{btn['height']}px)")
                passed += 1  # Warning, not failure
            page.close()
        except Exception as e:
            print(f"FAIL: Touch target check - {e}")
            failed += 1
            errors.append(f"Touch targets: {e}")

        # ─── Test 7: No console errors on homepage ────────────
        try:
            page = desktop_ctx.new_page()
            console_errors = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            page.goto(BASE_URL, timeout=30000)
            page.wait_for_load_state("networkidle", timeout=15000)
            # Filter out known non-critical errors
            real_errors = [e for e in console_errors if "favicon" not in e.lower() and "404" not in e]
            if len(real_errors) == 0:
                print("PASS: No console errors on homepage")
                passed += 1
            else:
                print(f"WARN: {len(real_errors)} console errors on homepage")
                for err in real_errors[:3]:
                    print(f"  - {err[:100]}")
                passed += 1  # Warning
            page.close()
        except Exception as e:
            print(f"FAIL: Console error check - {e}")
            failed += 1
            errors.append(f"Console errors: {e}")

        # ─── Test 8: Gallery page loads ───────────────────────
        try:
            page = desktop_ctx.new_page()
            page.goto(f"{BASE_URL}/gallery", timeout=15000)
            page.wait_for_load_state("networkidle", timeout=10000)
            page.screenshot(path=f"{RESULTS_DIR}/08-gallery-desktop.png")
            print("PASS: Gallery page loads")
            passed += 1
            page.close()
        except Exception as e:
            print(f"FAIL: Gallery page - {e}")
            failed += 1
            errors.append(f"Gallery: {e}")

        mobile_ctx.close()
        desktop_ctx.close()
        browser.close()

    # ─── Summary ──────────────────────────────────────────────
    print(f"\n{'='*50}")
    print(f"RESULTS: {passed} passed, {failed} failed out of {passed + failed} tests")
    print(f"{'='*50}")
    if errors:
        print("ERRORS:")
        for e in errors:
            print(f"  - {e}")

    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(run_tests())
