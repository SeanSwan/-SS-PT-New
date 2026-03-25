"""
Playwright QA: User Dashboard Visual Check
=============================================
Navigates to /user-dashboard on the live site to capture what renders.
Since auth is required, also checks redirect behavior.
"""

from playwright.sync_api import sync_playwright
import sys
import os
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_URL = "https://sswanstudios.com"
RESULTS_DIR = "frontend/test-results/userdashboard-check"

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def run_tests():
    ensure_dir(RESULTS_DIR)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Desktop
        desktop = browser.new_context(viewport={"width": 1440, "height": 900})
        # Mobile
        mobile = browser.new_context(viewport={"width": 375, "height": 812})

        # ─── Check 1: /user-dashboard without auth ────────
        print("[1] /user-dashboard without auth (desktop)")
        page = desktop.new_page()
        js_errors = []
        page.on("pageerror", lambda err: js_errors.append(str(err)[:100]))
        console_msgs = []
        page.on("console", lambda msg: console_msgs.append(f"[{msg.type}] {msg.text[:100]}") if msg.type in ["error", "warning"] else None)

        resp = page.goto(f"{BASE_URL}/user-dashboard", timeout=30000)
        page.wait_for_load_state("networkidle", timeout=20000)
        final_url = page.url
        print(f"   Final URL: {final_url}")
        print(f"   Status: {resp.status if resp else 'N/A'}")
        page.screenshot(path=f"{RESULTS_DIR}/01-userdashboard-no-auth-desktop.png", full_page=True)

        # Check what rendered
        body_text = page.evaluate("() => document.body.innerText.slice(0, 500)")
        print(f"   Body text preview: {body_text[:200]}")

        if js_errors:
            print(f"   JS Errors: {len(js_errors)}")
            for e in js_errors[:3]:
                print(f"     - {e}")
        if console_msgs:
            print(f"   Console warnings/errors: {len(console_msgs)}")
            for m in console_msgs[:3]:
                print(f"     - {m}")
        page.close()

        # ─── Check 2: /user-dashboard mobile ────────────
        print("\n[2] /user-dashboard without auth (mobile)")
        page = mobile.new_page()
        page.goto(f"{BASE_URL}/user-dashboard", timeout=30000)
        page.wait_for_load_state("networkidle", timeout=20000)
        page.screenshot(path=f"{RESULTS_DIR}/02-userdashboard-no-auth-mobile.png", full_page=True)
        print(f"   Final URL: {page.url}")
        page.close()

        # ─── Check 3: All dashboard-adjacent routes ──────
        routes = ["/social", "/gallery", "/user-dashboard", "/dashboard"]
        for route in routes:
            print(f"\n[Route] {route}")
            page = desktop.new_page()
            resp = page.goto(f"{BASE_URL}{route}", timeout=15000)
            page.wait_for_load_state("networkidle", timeout=15000)
            slug = route.strip("/").replace("/", "-") or "root"
            page.screenshot(path=f"{RESULTS_DIR}/route-{slug}.png", full_page=True)
            print(f"   Final URL: {page.url}")
            print(f"   Status: {resp.status if resp else 'N/A'}")
            page.close()

        # ─── Check 4: Check what components load ─────────
        print("\n[4] Component check on /user-dashboard")
        page = desktop.new_page()
        page.goto(f"{BASE_URL}/user-dashboard", timeout=30000)
        page.wait_for_load_state("networkidle", timeout=20000)

        component_check = page.evaluate("""
            () => {
                const checks = {};
                // Check for profile elements
                checks.hasProfileImage = !!document.querySelector('img[alt*="profile" i], img[alt*="avatar" i], [class*="ProfileImage"]');
                checks.hasTabs = !!document.querySelector('[role="tablist"], [class*="TabNav"], [class*="tab"]');
                checks.hasNoiseOverlay = !!document.querySelector('[class*="NoiseOverlay"], [class*="noise"]');
                checks.hasStats = !!document.querySelector('[class*="Stats"], [class*="stat"]');
                checks.hasButtons = document.querySelectorAll('button').length;
                checks.hasLinks = document.querySelectorAll('a').length;
                checks.bodyClasses = document.body.className;
                checks.rootChildren = document.getElementById('root')?.children.length || 0;
                // Check for login redirect
                checks.hasLoginForm = !!document.querySelector('input[type="password"], form[action*="login"]');
                checks.pageTitle = document.title;
                return checks;
            }
        """)
        print(f"   Components found: {component_check}")
        page.close()

        desktop.close()
        mobile.close()
        browser.close()

    print("\n" + "="*60)
    print(f"Screenshots saved to: {RESULTS_DIR}/")
    print("="*60)
    return 0

if __name__ == "__main__":
    sys.exit(run_tests())
