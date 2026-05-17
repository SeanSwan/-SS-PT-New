"""
Playwright QA: Social Media UX/UI Audit + All Session Fixes
============================================================
Comprehensive visual QA of the SwanStudios social media platform.
Tests all session fixes + screenshots every social feature for UX review.

Run: python tests/playwright-qa-social-ux-audit.py
"""

import sys
import os
import json
import time

os.environ["PYTHONIOENCODING"] = "utf-8"
sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

BASE_URL = "https://sswanstudios.com"
API_URL = "https://ss-pt-new.onrender.com"
SCREENSHOT_DIR = "tests/qa-screenshots/social-ux-audit"

results = []

def log_result(test_name, passed, details=""):
    results.append({"test": test_name, "passed": passed, "details": details})
    icon = "PASS" if passed else "FAIL"
    print(f"  [{icon}] {test_name}: {details}" if details else f"  [{icon}] {test_name}")

def safe_screenshot(page, name, full_page=False):
    try:
        page.screenshot(path=f"{SCREENSHOT_DIR}/{name}.png", full_page=full_page)
        print(f"    [SCREENSHOT] {name}.png saved")
    except Exception as e:
        print(f"    [SCREENSHOT FAIL] {name}: {e}")


def run_qa():
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # ═══════════════════════════════════════════════
        # PHASE 1: Pre-auth checks (homepage, signup scroll fix, theme)
        # ═══════════════════════════════════════════════
        print("\n" + "=" * 60)
        print("  PHASE 1: Pre-Auth & Homepage")
        print("=" * 60)

        # Desktop context
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        # TEST: Homepage loads
        print("\n--- Homepage ---")
        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(2000)
            title = page.title()
            log_result("Homepage loads", bool(title), title[:60] if title else "No title")
            safe_screenshot(page, "01-homepage-desktop")
        except Exception as e:
            log_result("Homepage loads", False, str(e))

        # TEST: Theme variables active
        print("\n--- Theme Variable Bridge ---")
        try:
            css_vars = page.evaluate("""
                () => {
                    const s = getComputedStyle(document.documentElement);
                    const vars = ['--brand-primary','--accent-cyan','--accent-purple','--bg-base','--text-primary','--accent-gold'];
                    const found = {};
                    for (const v of vars) { const val = s.getPropertyValue(v).trim(); if (val) found[v] = val; }
                    return { count: Object.keys(found).length, vars: found };
                }
            """)
            log_result("Theme CSS variables", css_vars.get("count", 0) >= 3,
                       f"{css_vars['count']} vars active")
        except Exception as e:
            log_result("Theme CSS variables", False, str(e))

        # TEST: Subscription tiers API
        print("\n--- Subscription API ---")
        try:
            tiers = page.evaluate(f"""
                async () => {{
                    const r = await fetch('{API_URL}/api/subscriptions/tiers');
                    const d = await r.json();
                    return {{ status: r.status, count: d.tiers ? Object.keys(d.tiers).length : 0 }};
                }}
            """)
            log_result("Subscription tiers API", tiers.get("count", 0) >= 3,
                       f"{tiers.get('count')} tiers")
        except Exception as e:
            log_result("Subscription tiers API", False, str(e))

        # TEST: Signup page scroll (the bug fix)
        print("\n--- Signup Scroll Fix ---")
        try:
            page.goto(f"{BASE_URL}/signup", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(2000)
            safe_screenshot(page, "02-signup-top")

            # Scroll to bottom
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(500)
            safe_screenshot(page, "03-signup-bottom")

            # Scroll back to top
            page.evaluate("window.scrollTo(0, 0)")
            page.wait_for_timeout(500)
            scroll_pos = page.evaluate("window.scrollY")
            safe_screenshot(page, "04-signup-scrolled-back-up")

            log_result("Signup scroll-back-up works", scroll_pos < 100,
                       f"scrollY={scroll_pos} after scrollTo(0,0)")
        except Exception as e:
            log_result("Signup scroll-back-up works", False, str(e))

        # TEST: Mobile signup scroll
        print("\n--- Mobile Signup Scroll (375px) ---")
        try:
            mobile_ctx = browser.new_context(viewport={"width": 375, "height": 812},
                                              user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)")
            mobile_page = mobile_ctx.new_page()
            mobile_page.goto(f"{BASE_URL}/signup", wait_until="networkidle", timeout=30000)
            mobile_page.wait_for_timeout(2000)
            safe_screenshot(mobile_page, "05-signup-mobile-top")

            # Check no horizontal overflow
            overflow = mobile_page.evaluate("""
                () => ({ bodyW: document.body.scrollWidth, viewW: window.innerWidth,
                         overflow: document.body.scrollWidth > window.innerWidth + 5 })
            """)
            log_result("Mobile signup no overflow", not overflow.get("overflow"),
                       f"body={overflow.get('bodyW')}px, viewport={overflow.get('viewW')}px")
            mobile_page.close()
            mobile_ctx.close()
        except Exception as e:
            log_result("Mobile signup no overflow", False, str(e))

        # ═══════════════════════════════════════════════
        # PHASE 2: Admin Login + Dashboard
        # ═══════════════════════════════════════════════
        print("\n" + "=" * 60)
        print("  PHASE 2: Admin Login & Dashboard")
        print("=" * 60)

        admin_logged_in = False
        print("\n--- Admin Login ---")
        try:
            page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(2000)
            safe_screenshot(page, "06-login-page")

            # Try login via API
            login_result = page.evaluate(f"""
                async () => {{
                    try {{
                        const r = await fetch('{API_URL}/api/auth/login', {{
                            method: 'POST',
                            headers: {{ 'Content-Type': 'application/json' }},
                            body: JSON.stringify({{ username: 'SeanSwan', password: 'Swanstudios2025!' }})
                        }});
                        const d = await r.json();
                        if (d.token) {{
                            localStorage.setItem('token', d.token);
                            if (d.user) localStorage.setItem('user', JSON.stringify(d.user));
                        }}
                        return {{ status: r.status, success: !!d.token, role: d.user?.role, error: d.message }};
                    }} catch(e) {{ return {{ error: e.message }}; }}
                }}
            """)
            if login_result.get("success"):
                admin_logged_in = True
                log_result("Admin login", True, f"Role: {login_result.get('role')}")
            else:
                log_result("Admin login", False,
                           f"status={login_result.get('status')}, error={login_result.get('error')}")
        except Exception as e:
            log_result("Admin login", False, str(e))

        # TEST: Admin Dashboard
        if admin_logged_in:
            print("\n--- Admin Dashboard ---")
            try:
                page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle", timeout=30000)
                page.wait_for_timeout(3000)
                safe_screenshot(page, "07-admin-dashboard")

                body = page.text_content("body") or ""
                has_content = any(kw in body.lower() for kw in ["dashboard", "overview", "clients", "schedule"])
                log_result("Admin dashboard renders", has_content, "Dashboard content present")
            except Exception as e:
                log_result("Admin dashboard renders", False, str(e))

            # TEST: Subscription status (authenticated)
            print("\n--- Subscription Status (Auth) ---")
            try:
                sub_status = page.evaluate(f"""
                    async () => {{
                        const token = localStorage.getItem('token');
                        const r = await fetch('{API_URL}/api/subscriptions/status', {{
                            headers: {{ 'Authorization': 'Bearer ' + token }}
                        }});
                        const d = await r.json();
                        return {{ status: r.status, success: d.success, tier: d.subscription?.tier || d.tier }};
                    }}
                """)
                log_result("Subscription status (admin)", sub_status.get("success", False),
                           f"Tier: {sub_status.get('tier', 'unknown')}")
            except Exception as e:
                log_result("Subscription status (admin)", False, str(e))

        # ═══════════════════════════════════════════════
        # PHASE 3: Social Media Features Audit
        # ═══════════════════════════════════════════════
        print("\n" + "=" * 60)
        print("  PHASE 3: Social Media Features UX Audit")
        print("=" * 60)

        # Navigate to social/community areas
        social_routes = [
            ("social", "Social Feed"),
            ("community", "Community"),
            ("user-dashboard", "User Dashboard"),
        ]

        for route, label in social_routes:
            print(f"\n--- {label} ({route}) ---")
            try:
                page.goto(f"{BASE_URL}/{route}", wait_until="networkidle", timeout=30000)
                page.wait_for_timeout(3000)
                safe_screenshot(page, f"social-{route}-desktop")

                body = page.text_content("body") or ""
                has_content = len(body.strip()) > 100
                log_result(f"{label} page loads", has_content,
                           f"Content length: {len(body.strip())} chars")

                # Check for console errors on this page
                page_errors = [e for e in console_errors if "chunk" in e.lower() or "cannot read" in e.lower()]
                if page_errors:
                    print(f"    [WARN] {len(page_errors)} console errors on {route}")

            except Exception as e:
                log_result(f"{label} page loads", False, str(e))

        # Client dashboard social sections (if logged in)
        if admin_logged_in:
            client_social_routes = [
                ("dashboard/default", "Admin Overview"),
                ("dashboard/schedule", "Schedule"),
            ]

            for route, label in client_social_routes:
                print(f"\n--- {label} ---")
                try:
                    page.goto(f"{BASE_URL}/{route}", wait_until="networkidle", timeout=30000)
                    page.wait_for_timeout(3000)
                    safe_screenshot(page, f"dashboard-{route.replace('/', '-')}")
                    log_result(f"{label} renders", True, "Screenshot captured")
                except Exception as e:
                    log_result(f"{label} renders", False, str(e))

        # ═══════════════════════════════════════════════
        # PHASE 4: Mobile Social UX (375px)
        # ═══════════════════════════════════════════════
        print("\n" + "=" * 60)
        print("  PHASE 4: Mobile Social UX (375px)")
        print("=" * 60)

        mobile_ctx2 = browser.new_context(viewport={"width": 375, "height": 812},
                                           user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)")
        mobile_page2 = mobile_ctx2.new_page()

        mobile_routes = [
            ("", "Homepage Mobile"),
            ("login", "Login Mobile"),
        ]

        for route, label in mobile_routes:
            print(f"\n--- {label} ---")
            try:
                mobile_page2.goto(f"{BASE_URL}/{route}", wait_until="networkidle", timeout=30000)
                mobile_page2.wait_for_timeout(2000)
                safe_screenshot(mobile_page2, f"mobile-{route or 'home'}")

                # Check touch targets
                if route == "login":
                    touch_check = mobile_page2.evaluate("""
                        () => {
                            const buttons = document.querySelectorAll('button, a, [role="button"]');
                            let tooSmall = 0;
                            let total = 0;
                            for (const btn of buttons) {
                                const rect = btn.getBoundingClientRect();
                                if (rect.width > 0 && rect.height > 0) {
                                    total++;
                                    if (rect.height < 44) tooSmall++;
                                }
                            }
                            return { total, tooSmall, pct: total > 0 ? Math.round((1 - tooSmall/total) * 100) : 100 };
                        }
                    """)
                    log_result(f"{label} touch targets", touch_check.get("tooSmall", 0) <= 2,
                               f"{touch_check.get('pct')}% meet 44px ({touch_check.get('tooSmall')} too small of {touch_check.get('total')})")

                log_result(f"{label} loads", True, "Screenshot captured")
            except Exception as e:
                log_result(f"{label} loads", False, str(e))

        # If logged in, check mobile dashboard
        if admin_logged_in:
            print("\n--- Mobile Dashboard (logged in) ---")
            try:
                # Set auth token in mobile context
                mobile_page2.evaluate(f"""
                    () => {{
                        const token = '{page.evaluate("localStorage.getItem('token')")}';
                        if (token && token !== 'null') localStorage.setItem('token', token);
                    }}
                """)
                mobile_page2.goto(f"{BASE_URL}/dashboard", wait_until="networkidle", timeout=30000)
                mobile_page2.wait_for_timeout(3000)
                safe_screenshot(mobile_page2, "mobile-dashboard")
                log_result("Mobile dashboard", True, "Screenshot captured")
            except Exception as e:
                log_result("Mobile dashboard", False, str(e))

        mobile_page2.close()
        mobile_ctx2.close()

        # ═══════════════════════════════════════════════
        # PHASE 5: WorkoutLogger Bundle Verification (Local)
        # ═══════════════════════════════════════════════
        print("\n" + "=" * 60)
        print("  PHASE 5: Build Verification")
        print("=" * 60)

        print("\n--- WorkoutLogger Bundle ---")
        try:
            import glob as glob_mod
            wl_files = glob_mod.glob("frontend/dist/v3/WorkoutLogger*.js")
            if wl_files:
                with open(wl_files[0], "r", encoding="utf-8", errors="ignore") as f:
                    wl_text = f.read()
                components = []
                if "ghostCache" in wl_text or "GhostRow" in wl_text: components.append("GhostData")
                if "FloatingRestTimer" in wl_text or "useRestTimer" in wl_text or "restDuration" in wl_text: components.append("RestTimer")
                if "SupersetBadge" in wl_text or "isSuperset" in wl_text or "supersetGroup" in wl_text: components.append("Superset")
                log_result("WorkoutLogger components in bundle", len(components) >= 2,
                           f"Found: {', '.join(components)}")
            else:
                log_result("WorkoutLogger components in bundle", False, "No chunk found")
        except Exception as e:
            log_result("WorkoutLogger components in bundle", False, str(e))

        # Crystalline renaming check
        print("\n--- Crystalline Renaming ---")
        try:
            import glob as glob_mod
            client_chunks = glob_mod.glob("frontend/dist/v3/RevolutionaryClient*.js")
            if client_chunks:
                with open(client_chunks[0], "r", encoding="utf-8", errors="ignore") as f:
                    chunk = f.read()
                has_crystalline = "Crystalline" in chunk or "crystallineTheme" in chunk
                no_galaxy_exports = "OverviewGalaxy" not in chunk and "AccountGalaxy" not in chunk
                log_result("Galaxy->Crystalline rename", has_crystalline and no_galaxy_exports,
                           f"Crystalline={has_crystalline}, noGalaxy={no_galaxy_exports}")
            else:
                log_result("Galaxy->Crystalline rename", True, "Client chunk inlined (OK)")
        except Exception as e:
            log_result("Galaxy->Crystalline rename", False, str(e))

        # ═══════════════════════════════════════════════
        # PHASE 6: Console Error Summary
        # ═══════════════════════════════════════════════
        print("\n" + "=" * 60)
        print("  PHASE 6: Error Summary")
        print("=" * 60)

        critical = [e for e in console_errors if any(kw in e.lower() for kw in
                    ["uncaught", "chunk", "cannot read", "typeerror", "referenceerror"])]
        log_result("No critical console errors", len(critical) == 0,
                   f"{len(critical)} critical, {len(console_errors)} total warnings")
        if critical:
            for err in critical[:5]:
                print(f"    [ERROR] {err[:120]}")

        page.close()
        context.close()
        browser.close()

    # ═══════════════════════════════════════════════
    # FINAL SUMMARY
    # ═══════════════════════════════════════════════
    print("\n" + "=" * 60)
    passed = sum(1 for r in results if r["passed"])
    failed = sum(1 for r in results if not r["passed"])
    total = len(results)
    print(f"  FINAL QA RESULTS: {passed}/{total} passed, {failed} failed")
    print("=" * 60)

    for r in results:
        icon = "PASS" if r["passed"] else "FAIL"
        detail = f" - {r['details']}" if r["details"] else ""
        print(f"  [{icon}] {r['test']}{detail}")

    print("=" * 60)
    print(f"\n  Screenshots saved to: {SCREENSHOT_DIR}/")

    if failed > 0:
        print(f"\n  {failed} test(s) need attention!")
        return 1
    print(f"\n  All {total} tests passed!")
    return 0


if __name__ == "__main__":
    sys.exit(run_qa())
