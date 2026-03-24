"""
Social Media UX Audit - Authenticated Session
Logs in as admin, navigates social pages, captures screenshots for UX review.
"""
import os, sys, time, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "https://sswanstudios.com")
SCREENSHOTS = os.path.join(os.path.dirname(__file__), "qa-screenshots", "social-auth")
os.makedirs(SCREENSHOTS, exist_ok=True)

def shot(page, name):
    path = os.path.join(SCREENSHOTS, f"{name}.png")
    page.screenshot(path=path, full_page=True)
    print(f"  📸 {name}.png")
    return path

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Desktop context
        ctx = browser.new_context(viewport={"width": 1280, "height": 900})
        page = ctx.new_page()

        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        # ── Phase 1: Login ──
        print("\n🔐 Phase 1: Admin Login")
        page.goto(f"{BASE}/login", wait_until="networkidle", timeout=30000)
        time.sleep(2)

        # Fill login
        try:
            page.fill('input[name="username"], input[placeholder*="Username"], input[placeholder*="username"]', "SeanSwan")
            page.fill('input[name="password"], input[type="password"]', "Qwerty@1")
            page.click('button[type="submit"], button:has-text("Sign In")')
            page.wait_for_timeout(5000)

            current = page.url
            print(f"  After login: {current}")
            shot(page, "01-post-login")

            if "/login" in current:
                print("  ❌ Login failed — still on login page")
                # Check for error messages
                error_el = page.query_selector('[class*="error"], [class*="Error"], [role="alert"]')
                if error_el:
                    print(f"  Error text: {error_el.text_content()}")
                shot(page, "01-login-failed")
            else:
                print("  ✅ Login successful")
        except Exception as e:
            print(f"  ❌ Login error: {e}")
            shot(page, "01-login-error")

        # ── Phase 2: Social Feed Page ──
        print("\n📱 Phase 2: Social Feed")
        social_routes = [
            "/social", "/social/feed", "/dashboard/social",
            "/swanstudios-social", "/community"
        ]
        for route in social_routes:
            try:
                page.goto(f"{BASE}{route}", wait_until="networkidle", timeout=15000)
                page.wait_for_timeout(2000)
                current = page.url
                if "/login" not in current:
                    name = route.replace("/", "-").strip("-") or "social-root"
                    shot(page, f"02-{name}")
                    print(f"  ✅ {route} → loaded ({current})")
                else:
                    print(f"  🔒 {route} → redirected to login")
            except Exception as e:
                print(f"  ⚠️  {route} → {e}")

        # ── Phase 3: Dashboard Social Sections ──
        print("\n📊 Phase 3: Dashboard Social Sections")
        dash_routes = [
            ("/dashboard/default", "03-admin-overview"),
            ("/dashboard/social", "03-admin-social"),
            ("/dashboard/community", "03-admin-community"),
            ("/dashboard/client-progress", "03-client-progress"),
        ]
        for route, name in dash_routes:
            try:
                page.goto(f"{BASE}{route}", wait_until="networkidle", timeout=15000)
                page.wait_for_timeout(2000)
                if "/login" not in page.url:
                    shot(page, name)
                    print(f"  ✅ {route}")
                else:
                    print(f"  🔒 {route} → login redirect")
            except Exception as e:
                print(f"  ⚠️  {route} → {e}")

        # ── Phase 4: User Profile Page ──
        print("\n👤 Phase 4: User Profile")
        profile_routes = [
            "/profile", "/user/profile", "/dashboard/profile",
            "/social/profile", "/settings/profile"
        ]
        for route in profile_routes:
            try:
                page.goto(f"{BASE}{route}", wait_until="networkidle", timeout=15000)
                page.wait_for_timeout(2000)
                if "/login" not in page.url:
                    name = route.replace("/", "-").strip("-")
                    shot(page, f"04-{name}")
                    print(f"  ✅ {route}")
                else:
                    print(f"  🔒 {route} → login redirect")
            except Exception as e:
                print(f"  ⚠️  {route} → {e}")

        # ── Phase 5: Mobile Social Views ──
        print("\n📱 Phase 5: Mobile Views (375px)")
        ctx.close()
        mobile_ctx = browser.new_context(viewport={"width": 375, "height": 812})
        mobile = mobile_ctx.new_page()

        # Login on mobile
        mobile.goto(f"{BASE}/login", wait_until="networkidle", timeout=30000)
        time.sleep(2)
        try:
            mobile.fill('input[name="username"], input[placeholder*="Username"], input[placeholder*="username"]', "SeanSwan")
            mobile.fill('input[name="password"], input[type="password"]', "Qwerty@1")
            mobile.click('button[type="submit"], button:has-text("Sign In")')
            mobile.wait_for_timeout(5000)

            if "/login" not in mobile.url:
                print("  ✅ Mobile login successful")

                # Mobile social pages
                mobile_routes = [
                    ("/social", "05-mobile-social"),
                    ("/dashboard/default", "05-mobile-dashboard"),
                    ("/dashboard/social", "05-mobile-dash-social"),
                    ("/community", "05-mobile-community"),
                ]
                for route, name in mobile_routes:
                    try:
                        mobile.goto(f"{BASE}{route}", wait_until="networkidle", timeout=15000)
                        mobile.wait_for_timeout(2000)
                        if "/login" not in mobile.url:
                            shot(mobile, name)
                            print(f"  ✅ Mobile {route}")
                        else:
                            print(f"  🔒 Mobile {route} → login")
                    except Exception as e:
                        print(f"  ⚠️  Mobile {route} → {e}")
            else:
                print("  ❌ Mobile login failed")
                shot(mobile, "05-mobile-login-failed")
        except Exception as e:
            print(f"  ❌ Mobile login error: {e}")

        # ── Phase 6: Console Errors ──
        print("\n🔍 Phase 6: Console Errors")
        critical = [e for e in errors if "error" in e.lower() or "500" in e or "failed" in e.lower()]
        if critical:
            print(f"  ⚠️  {len(critical)} console errors:")
            for e in critical[:10]:
                print(f"    - {e[:120]}")
        else:
            print("  ✅ No critical console errors")

        mobile_ctx.close()
        browser.close()
        print("\n✅ Social media authenticated audit complete!")
        print(f"📁 Screenshots: {SCREENSHOTS}")

if __name__ == "__main__":
    main()
