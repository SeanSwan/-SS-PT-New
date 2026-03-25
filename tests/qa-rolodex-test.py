"""
Quick QA test: Verify exercise rolodex doesn't crash after react-window v2 fix.
Tests: Login as SeanSwan, navigate to Session Logger, select client, click Search & Add Exercise.
"""
import sys, os
os.environ["PYTHONIOENCODING"] = "utf-8"
sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

BASE_URL = "https://sswanstudios.com"

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        # 1) Login
        print("=== Step 1: Login ===")
        page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(3000)

        # Fill login form
        username_input = page.locator('input[placeholder*="Username"], input[type="text"]').first
        password_input = page.locator('input[type="password"]').first
        username_input.fill("SeanSwan")
        password_input.fill("KlackKlack806780!")
        page.locator('button:has-text("Sign In")').click()
        page.wait_for_timeout(3000)

        current_url = page.url
        print(f"  After login URL: {current_url}")
        logged_in = "dashboard" in current_url
        print(f"  [{'PASS' if logged_in else 'FAIL'}] Login: {'Success' if logged_in else 'Failed'}")

        if not logged_in:
            print("  Login failed, aborting")
            browser.close()
            return 1

        # 2) Navigate to Workouts > Session Logger
        print("\n=== Step 2: Navigate to Session Logger ===")
        page.goto(f"{BASE_URL}/dashboard/workouts/logger", wait_until="networkidle", timeout=20000)
        page.wait_for_timeout(2000)

        # Check bundle version
        bundle_check = page.evaluate("""
            () => {
                const scripts = Array.from(document.querySelectorAll('script[src]'));
                const indexScript = scripts.find(s => s.src.includes('index.'));
                return indexScript ? indexScript.src.split('/').pop() : 'unknown';
            }
        """)
        print(f"  Bundle: {bundle_check}")

        # 3) Select client (Jackie)
        print("\n=== Step 3: Select Client ===")
        client_btn = page.locator('button:has-text("Select a client"), button:has-text("Open Client Drawer")').first
        if client_btn.is_visible():
            client_btn.click()
            page.wait_for_timeout(1000)
            jackie_btn = page.locator('button:has-text("Jackie")')
            if jackie_btn.is_visible():
                jackie_btn.click()
                page.wait_for_timeout(2000)
                print("  [PASS] Selected Jackie Client")
            else:
                print("  [FAIL] Jackie client not found in drawer")
                browser.close()
                return 1
        else:
            print("  [SKIP] Client already selected or button not found")

        # 4) Click Search & Add Exercise (THE CRITICAL TEST)
        print("\n=== Step 4: Search & Add Exercise (Rolodex Test) ===")
        errors_before = len(console_errors)

        search_btn = page.locator('button:has-text("Search & Add Exercise"), button:has-text("Search and add")')
        if search_btn.is_visible():
            search_btn.click()
            page.wait_for_timeout(3000)

            errors_after = len(console_errors)
            new_errors = console_errors[errors_before:]
            crash_errors = [e for e in new_errors if "Cannot convert" in e or "Application Error" in e]

            if crash_errors:
                print(f"  [FAIL] Rolodex CRASHED: {crash_errors[0][:150]}")
            else:
                # Check if rolodex is visible (search input should appear)
                search_input = page.locator('input[placeholder*="Search exercises"]')
                rolodex_visible = search_input.is_visible()

                if rolodex_visible:
                    print("  [PASS] Rolodex opened without crash!")

                    # Check if exercises loaded
                    page.wait_for_timeout(2000)
                    exercise_count = page.evaluate("""
                        () => {
                            const items = document.querySelectorAll('[role="option"], [role="listitem"]');
                            return items.length;
                        }
                    """)
                    print(f"  [{'PASS' if exercise_count > 0 else 'WARN'}] Exercise count in rolodex: {exercise_count}")

                    # Try searching
                    search_input.fill("bench")
                    page.wait_for_timeout(1000)
                    search_results = page.evaluate("""
                        () => {
                            const items = document.querySelectorAll('[role="option"], [role="listitem"]');
                            return items.length;
                        }
                    """)
                    print(f"  [{'PASS' if search_results > 0 else 'WARN'}] Search results for 'bench': {search_results}")
                else:
                    # Check if we're on error page
                    error_heading = page.locator('h2:has-text("Application Error")')
                    if error_heading.is_visible():
                        print("  [FAIL] Application Error page shown (crash)")
                    else:
                        print("  [WARN] Rolodex search input not visible")
        else:
            print("  [FAIL] Search & Add Exercise button not found")

        # 5) Check for console errors
        print(f"\n=== Console Errors ({len(console_errors)} total) ===")
        for err in console_errors[:5]:
            print(f"  - {err[:200]}")

        page.screenshot(path="tests/qa-screenshots/rolodex-test.png", full_page=True)
        print("\n  Screenshot saved to tests/qa-screenshots/rolodex-test.png")

        browser.close()

        critical = [e for e in console_errors if "Cannot convert" in e or "Application Error" in e]
        if critical:
            print(f"\n  RESULT: FAIL — {len(critical)} crash errors")
            return 1
        else:
            print(f"\n  RESULT: PASS — No crash errors")
            return 0

if __name__ == "__main__":
    os.makedirs("tests/qa-screenshots", exist_ok=True)
    sys.exit(run())
