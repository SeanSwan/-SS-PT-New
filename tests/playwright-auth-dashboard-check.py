"""
Playwright QA: Authenticated User Dashboard Check
===================================================
Logs in via the login form, then navigates to /user-dashboard
to capture the actual dashboard with enhancements.
"""

from playwright.sync_api import sync_playwright
import sys
import os
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_URL = "https://sswanstudios.com"
RESULTS_DIR = "frontend/test-results/auth-dashboard-check"

# Admin credentials from environment or defaults
USERNAME = os.environ.get("TEST_USERNAME", "ogpswan")
PASSWORD = os.environ.get("TEST_PASSWORD", "admin123")

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def run_tests():
    ensure_dir(RESULTS_DIR)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Desktop context
        desktop = browser.new_context(viewport={"width": 1440, "height": 900})
        # Mobile context
        mobile = browser.new_context(viewport={"width": 375, "height": 812})

        # ─── Step 1: Login (desktop) ─────────────────────
        print("[1] Logging in...")
        page = desktop.new_page()
        page.goto(f"{BASE_URL}/login", timeout=30000)
        page.wait_for_load_state("networkidle", timeout=20000)
        page.screenshot(path=f"{RESULTS_DIR}/01-login-page.png")

        # Fill login form
        username_input = page.locator('input[type="text"], input[type="email"], input[placeholder*="mail" i], input[placeholder*="user" i]').first
        password_input = page.locator('input[type="password"]').first

        if username_input.is_visible() and password_input.is_visible():
            username_input.fill(USERNAME)
            password_input.fill(PASSWORD)
            page.screenshot(path=f"{RESULTS_DIR}/02-login-filled.png")

            # Click sign in
            submit_btn = page.locator('button:has-text("Sign In"), button[type="submit"]').first
            submit_btn.click()

            # Wait for navigation after login
            try:
                page.wait_for_url("**/dashboard**", timeout=15000)
                print(f"   Logged in! Redirected to: {page.url}")
            except:
                # Maybe it redirects elsewhere
                page.wait_for_timeout(5000)
                print(f"   After login, URL: {page.url}")

            page.screenshot(path=f"{RESULTS_DIR}/03-after-login.png", full_page=True)
        else:
            print("   Could not find login form inputs")
            page.close()
            browser.close()
            return 1

        # ─── Step 2: Navigate to user dashboard ──────────
        print("\n[2] Navigating to /user-dashboard...")
        page.goto(f"{BASE_URL}/user-dashboard", timeout=30000)
        page.wait_for_load_state("networkidle", timeout=20000)
        page.wait_for_timeout(2000)  # Extra time for React to render
        print(f"   URL: {page.url}")
        page.screenshot(path=f"{RESULTS_DIR}/04-user-dashboard-desktop.png", full_page=True)

        # Viewport screenshot (above the fold)
        page.screenshot(path=f"{RESULTS_DIR}/05-user-dashboard-viewport.png", full_page=False)

        # ─── Step 3: Check dashboard components ──────────
        print("\n[3] Checking dashboard components...")
        components = page.evaluate("""
            () => {
                const results = {};
                results.url = window.location.href;
                results.title = document.title;

                // Profile elements
                results.profileImage = !!document.querySelector('img[class*="Profile"], img[alt*="profile" i], img[alt*="avatar" i]');
                results.coverPhoto = !!document.querySelector('[class*="Background"], [class*="Banner"], [class*="Cover"]');
                results.displayName = !!document.querySelector('[class*="DisplayName"], [class*="Name"], h1, h2');
                results.stats = document.querySelectorAll('[class*="Stat"]').length;

                // Tabs
                const tabs = document.querySelectorAll('[class*="Tab"], [role="tab"]');
                results.tabCount = tabs.length;
                results.tabLabels = Array.from(tabs).map(t => t.textContent?.trim()).filter(Boolean).slice(0, 10);

                // Buttons
                results.buttonCount = document.querySelectorAll('button').length;

                // Noise overlay (V3 enhancement)
                results.noiseOverlay = !!document.querySelector('[class*="Noise"], [class*="noise"]');

                // Error state
                results.hasError = !!document.querySelector('[class*="Error"], [class*="error"]');
                results.errorText = document.querySelector('[class*="Error"], [class*="error"]')?.textContent?.slice(0, 100) || '';

                // Loading state
                results.isLoading = !!document.querySelector('[class*="Loading"], [class*="Spinner"], [class*="Skeleton"]');

                // Body text sample
                results.bodyPreview = document.body.innerText.slice(0, 300);

                return results;
            }
        """)

        for key, val in components.items():
            if key != 'bodyPreview':
                print(f"   {key}: {val}")
        print(f"   bodyPreview: {str(components.get('bodyPreview', ''))[:150]}...")

        # ─── Step 4: Check tabs if they exist ────────────
        if components.get('tabCount', 0) > 0:
            print(f"\n[4] Found {components['tabCount']} tabs: {components.get('tabLabels', [])}")
            # Click each tab and screenshot
            tabs = page.locator('[class*="Tab"], [role="tab"]').all()
            for i, tab in enumerate(tabs[:7]):
                try:
                    label = tab.text_content().strip()
                    if label and len(label) < 30:
                        tab.click()
                        page.wait_for_timeout(1500)
                        page.screenshot(path=f"{RESULTS_DIR}/tab-{i:02d}-{label.lower().replace(' ', '-')}.png", full_page=False)
                        print(f"   Tab '{label}' - screenshot captured")
                except Exception as e:
                    print(f"   Tab {i} click failed: {str(e)[:60]}")
        else:
            print("\n[4] No tabs found on dashboard")

        page.close()

        # ─── Step 5: Mobile dashboard ────────────────────
        print("\n[5] Mobile user dashboard...")
        # Login on mobile context
        mpage = mobile.new_page()
        mpage.goto(f"{BASE_URL}/login", timeout=30000)
        mpage.wait_for_load_state("networkidle", timeout=20000)

        m_user = mpage.locator('input[type="text"], input[type="email"], input[placeholder*="mail" i], input[placeholder*="user" i]').first
        m_pass = mpage.locator('input[type="password"]').first
        if m_user.is_visible() and m_pass.is_visible():
            m_user.fill(USERNAME)
            m_pass.fill(PASSWORD)
            mpage.locator('button:has-text("Sign In"), button[type="submit"]').first.click()
            try:
                mpage.wait_for_url("**/dashboard**", timeout=15000)
            except:
                mpage.wait_for_timeout(5000)
            print(f"   Mobile logged in: {mpage.url}")

        mpage.goto(f"{BASE_URL}/user-dashboard", timeout=30000)
        mpage.wait_for_load_state("networkidle", timeout=20000)
        mpage.wait_for_timeout(2000)
        mpage.screenshot(path=f"{RESULTS_DIR}/06-user-dashboard-mobile.png", full_page=True)
        mpage.screenshot(path=f"{RESULTS_DIR}/07-user-dashboard-mobile-viewport.png", full_page=False)
        print(f"   Mobile URL: {mpage.url}")

        # Touch target check on dashboard
        small_targets = mpage.evaluate("""
            () => {
                const els = document.querySelectorAll('button, a[href], [role="button"], [role="tab"]');
                const small = [];
                els.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0 &&
                        (rect.width < 44 || rect.height < 44)) {
                        small.push({
                            tag: el.tagName,
                            text: (el.textContent || '').trim().slice(0, 25),
                            w: Math.round(rect.width),
                            h: Math.round(rect.height)
                        });
                    }
                });
                return small;
            }
        """)
        if small_targets:
            print(f"   Touch targets under 44px: {len(small_targets)}")
            for t in small_targets[:5]:
                print(f"     - {t['tag']}:'{t['text']}' {t['w']}x{t['h']}")
        else:
            print("   All touch targets >= 44px")

        mpage.close()
        mobile.close()
        desktop.close()
        browser.close()

    print("\n" + "="*60)
    print("USER DASHBOARD QA COMPLETE")
    print(f"Screenshots saved to: {RESULTS_DIR}/")
    print("="*60)
    return 0

if __name__ == "__main__":
    sys.exit(run_tests())
