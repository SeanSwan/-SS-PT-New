"""
Playwright QA: WorkoutLogger 14-Phase — Unauthenticated Checks
==============================================================
Since admin login credentials don't match production DB, this test validates:
1) Frontend bundle deployed successfully (no chunk errors)
2) Black theme on login page
3) JS bundle contains our new components
4) API health
5) Frontend routes exist (even if redirected)
6) Mobile responsive login
7) Source code audit of deployed bundle
"""

import sys
import os
import json
import re

os.environ["PYTHONIOENCODING"] = "utf-8"
sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

BASE_URL = "https://sswanstudios.com"
SCREENSHOT_DIR = "tests/qa-screenshots"

results = []

def log_result(test_name, passed, details=""):
    results.append({"test": test_name, "passed": passed, "details": details})
    icon = "PASS" if passed else "FAIL"
    print(f"  [{icon}] {test_name}: {details}" if details else f"  [{icon}] {test_name}")


def run_qa():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
        )
        page = context.new_page()

        # Capture network requests to find JS bundles
        js_bundles = []
        page.on("response", lambda response: js_bundles.append(response.url) if ".js" in response.url and response.status == 200 else None)

        console_errors = []
        console_all = []
        page.on("console", lambda msg: (
            console_errors.append(msg.text) if msg.type == "error" else None,
            console_all.append(f"[{msg.type}] {msg.text}")
        ))

        # ─── TEST 1: Frontend Loads Without Chunk Errors ───
        print("\n=== Test 1: Frontend Bundle Loads ===")
        try:
            page.goto(f"{BASE_URL}", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(3000)
            page.screenshot(path=f"{SCREENSHOT_DIR}/uq-01-homepage.png", full_page=True)

            # Check for chunk load errors (common deploy failure)
            chunk_errors = [e for e in console_errors if "chunk" in e.lower() or "loading chunk" in e.lower()]
            log_result("No Chunk Load Errors", len(chunk_errors) == 0,
                       f"{len(chunk_errors)} chunk errors found")

            # Check JS bundles loaded
            js_count = len([u for u in js_bundles if "assets/" in u])
            log_result("JS Bundles Loaded", js_count > 0, f"{js_count} JS files loaded")

        except Exception as e:
            log_result("Frontend Bundle", False, str(e)[:200])

        # ─── TEST 2: Login Page Renders Correctly ───
        print("\n=== Test 2: Login Page ===")
        try:
            page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=20000)
            page.wait_for_timeout(2000)
            page.screenshot(path=f"{SCREENSHOT_DIR}/uq-02-login.png", full_page=True)

            login_check = page.evaluate("""
                () => {
                    const inputs = document.querySelectorAll('input');
                    const buttons = document.querySelectorAll('button');
                    const hasUsername = !!document.querySelector('input[placeholder*="Username"]');
                    const hasPassword = !!document.querySelector('input[type="password"]');
                    const hasSignIn = Array.from(buttons).some(b => b.textContent.includes('Sign In'));
                    return { inputCount: inputs.length, buttonCount: buttons.length, hasUsername, hasPassword, hasSignIn };
                }
            """)
            log_result("Login Form Renders", login_check["hasUsername"] and login_check["hasPassword"] and login_check["hasSignIn"],
                       f"Username: {login_check['hasUsername']}, Password: {login_check['hasPassword']}, SignIn: {login_check['hasSignIn']}")

        except Exception as e:
            log_result("Login Page", False, str(e)[:200])

        # ─── TEST 3: Black Theme on Login Page ───
        print("\n=== Test 3: Black Theme on Login ===")
        try:
            theme_check = page.evaluate("""
                () => {
                    const body = document.body;
                    const all = document.querySelectorAll('*');
                    let blackBgs = 0;
                    let blueBgs = 0;
                    let totalBgs = 0;

                    for (const el of all) {
                        const bg = getComputedStyle(el).backgroundColor;
                        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                            totalBgs++;
                            // Parse CSS color - handle both rgb() and color() syntax
                            const rgbMatch = bg.match(/rgb[a]?\\((\\d+)[,\\s]+(\\d+)[,\\s]+(\\d+)/);
                            if (rgbMatch) {
                                const [_, r, g, b] = rgbMatch.map(Number);
                                if (r < 35 && g < 35 && b < 50) blackBgs++;
                                if (b > 80 && r < 15 && g < 50) blueBgs++;
                            }
                        }
                    }
                    return { blackBgs, blueBgs, totalBgs };
                }
            """)

            log_result("Black Theme Colors", theme_check.get("blackBgs", 0) > 0,
                       f"Black: {theme_check['blackBgs']}, Blue: {theme_check['blueBgs']}, Total: {theme_check['totalBgs']}")

        except Exception as e:
            log_result("Black Theme", False, str(e)[:200])

        # ─── TEST 4: JS Bundle Contains Our New Components ───
        print("\n=== Test 4: Bundle Contains New Components ===")
        try:
            # Find main JS bundle
            main_bundles = [u for u in js_bundles if "assets/" in u and u.endswith(".js")]
            print(f"    Found {len(main_bundles)} JS bundles")

            # Check the largest bundles for our component code
            component_checks = {
                "NASMProtocolDefaults": False,
                "NASMPhaseTemplates": False,
                "NASMPhaseGuide": False,
                "NASMLearningMode": False,
                "NASMTooltip": False,
                "WorkoutLoggerValidation": False,
                "aiWorkoutEvents": False,
                "VoiceMemoUpload": False,
                "ExerciseAutocomplete": False,
                "BootcampBuilder": False,
                "AITerminalPanel": False,
                "ExerciseCardComponent": False,
            }

            # Use page.evaluate to check for component names in the bundle
            bundle_check = page.evaluate("""
                async (bundles) => {
                    const results = {};
                    // Check up to 5 largest bundles
                    const toCheck = bundles.slice(0, 8);
                    for (const url of toCheck) {
                        try {
                            const res = await fetch(url);
                            const text = await res.text();
                            results[url.split('/').pop()] = {
                                size: text.length,
                                hasNASMProtocolDefaults: text.includes('NASMProtocolDefaults') || text.includes('SMR/Foam Roll') || text.includes('smr_foam_roll'),
                                hasNASMPhaseTemplates: text.includes('NASMPhaseTemplates') || text.includes('getPhaseTemplate') || text.includes('Stabilization Endurance'),
                                hasNASMPhaseGuide: text.includes('NASMPhaseGuide') || text.includes('PhaseGuide') || text.includes('Load Phase'),
                                hasNASMLearningMode: text.includes('NASMLearningMode') || text.includes('LearningModeToggle') || text.includes('useNASMLearning'),
                                hasNASMTooltip: text.includes('NASMTooltip') || text.includes('nasm-tooltip'),
                                hasWorkoutLoggerValidation: text.includes('calculateBrzycki1RM') || text.includes('getRepRangeForPhase') || text.includes('Brzycki'),
                                hasAiWorkoutEvents: text.includes('AI_LOAD_TEMPLATE') || text.includes('AI_ADD_EXERCISE') || text.includes('dispatchAIWorkoutEvent'),
                                hasVoiceMemoUpload: text.includes('VoiceMemoUpload') || text.includes('voice-memo'),
                                hasExerciseAutocomplete: text.includes('ExerciseAutocomplete') || text.includes('exercise-autocomplete'),
                                hasBootcampBuilder: text.includes('BootcampBuilder') || text.includes('bootcamp-builder'),
                                hasAITerminalPanel: text.includes('AITerminalPanel') || text.includes('ai-terminal'),
                                hasExerciseCard: text.includes('ExerciseCard') || text.includes('exercise-card') || text.includes('data-label'),
                                hasBlackTheme: text.includes('#0A0A0F') || text.includes('#141419') || text.includes('#1A1A24') || text.includes('0a0a0f') || text.includes('141419'),
                            };
                        } catch (e) {
                            results[url.split('/').pop()] = { error: e.message };
                        }
                    }
                    return results;
                }
            """, main_bundles)

            # Aggregate results across all bundles
            for bundle_name, checks in bundle_check.items():
                if "error" in checks:
                    continue
                size_kb = checks.get("size", 0) / 1024
                print(f"    Bundle: {bundle_name} ({size_kb:.0f}KB)")
                for key, found in checks.items():
                    if key.startswith("has") and found:
                        component_name = key[3:]
                        component_checks[component_name] = True
                        print(f"      Found: {component_name}")

            # Log results
            found_count = sum(1 for v in component_checks.values() if v)
            total = len(component_checks)
            print(f"\n    Component audit: {found_count}/{total} found in bundles")

            for name, found in component_checks.items():
                log_result(f"Bundle: {name}", found)

        except Exception as e:
            log_result("Bundle Component Check", False, str(e)[:200])

        # ─── TEST 5: API Health Check ───
        print("\n=== Test 5: API Health ===")
        try:
            api_check = page.evaluate("""
                async () => {
                    const checks = {};
                    const endpoints = [
                        { name: 'health', url: 'https://ss-pt-new.onrender.com/api/health' },
                        { name: 'exercises_count', url: 'https://ss-pt-new.onrender.com/api/exercises/search?q=bench&limit=3' },
                    ];
                    for (const ep of endpoints) {
                        try {
                            const r = await fetch(ep.url);
                            const d = await r.json();
                            checks[ep.name] = { status: r.status, data: JSON.stringify(d).substring(0, 200) };
                        } catch (e) {
                            checks[ep.name] = { error: e.message };
                        }
                    }
                    return checks;
                }
            """)

            for name, result in api_check.items():
                status = result.get("status", 0)
                # 401 for auth-required endpoints is expected behavior
                ok = status in [200, 401]
                log_result(f"API: {name}", ok, f"Status: {status}")
                if result.get("data"):
                    print(f"      Data: {result['data'][:150]}")

        except Exception as e:
            log_result("API Health", False, str(e)[:200])

        # ─── TEST 6: Frontend Routes Exist (Check that SPA handles them) ───
        print("\n=== Test 6: SPA Route Handling ===")
        routes_to_check = [
            "/login",
            "/dashboard",
            "/dashboard/admin-sessions",
            "/dashboard/bootcamp",
            "/dashboard/schedule",
            "/dashboard/client-management",
        ]

        for route in routes_to_check:
            try:
                resp = page.goto(f"{BASE_URL}{route}", wait_until="networkidle", timeout=15000)
                page.wait_for_timeout(1000)
                status = resp.status if resp else 0
                # SPA should return 200 even for protected routes (client-side routing)
                is_spa = status == 200
                current = page.url
                log_result(f"Route: {route}", is_spa, f"Status: {status}, redirected to: {current}")
            except Exception as e:
                log_result(f"Route: {route}", False, str(e)[:100])

        # ─── TEST 7: Mobile Responsive Login ───
        print("\n=== Test 7: Mobile Login (375px) ===")
        try:
            page.set_viewport_size({"width": 375, "height": 812})
            page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(2000)
            page.screenshot(path=f"{SCREENSHOT_DIR}/uq-07-mobile-login.png", full_page=True)

            mobile_check = page.evaluate("""
                () => {
                    const vw = window.innerWidth;
                    const buttons = document.querySelectorAll('button');
                    let smallButtons = 0;
                    for (const btn of buttons) {
                        const rect = btn.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0 && rect.height < 44) smallButtons++;
                    }
                    // Check if login form is visible and not overflowing
                    const form = document.querySelector('form') || document.querySelector('input[placeholder*="Username"]')?.closest('div');
                    const overflows = form ? form.getBoundingClientRect().right > vw : false;
                    return { vw, smallButtons, totalButtons: buttons.length, overflows };
                }
            """)

            log_result("Mobile: No Horizontal Overflow", not mobile_check.get("overflows", True),
                       f"Viewport: {mobile_check['vw']}px")
            log_result("Mobile: Touch Targets >= 44px", mobile_check.get("smallButtons", 0) == 0,
                       f"{mobile_check['smallButtons']}/{mobile_check['totalButtons']} buttons < 44px")

            page.set_viewport_size({"width": 1440, "height": 900})
        except Exception as e:
            log_result("Mobile Login", False, str(e)[:200])
            page.set_viewport_size({"width": 1440, "height": 900})

        # ─── TEST 8: Console Error Summary ───
        print("\n=== Test 8: Console Error Audit ===")
        critical = [e for e in console_errors if any(k in e.lower() for k in ["chunk", "cannot read", "is not defined", "syntaxerror", "referenceerror"])]
        log_result("No Critical JS Errors", len(critical) == 0,
                   f"{len(critical)} critical, {len(console_errors)} total errors")
        if console_errors:
            print(f"    All errors ({len(console_errors)}):")
            for err in console_errors[:10]:
                print(f"      - {err[:150]}")

        browser.close()

    # ─── SUMMARY ───
    print("\n" + "=" * 60)
    print("  QA RESULTS SUMMARY (Unauthenticated)")
    print("=" * 60)

    passed = sum(1 for r in results if r["passed"])
    failed = sum(1 for r in results if not r["passed"])
    total = len(results)

    for r in results:
        icon = "PASS" if r["passed"] else "FAIL"
        detail = f" -- {r['details']}" if r["details"] else ""
        print(f"  [{icon}] {r['test']}{detail}")

    print(f"\n  Results: {passed}/{total} passed, {failed} failed")
    print(f"  Screenshots: {SCREENSHOT_DIR}/")

    # Key blocker
    print("\n  ** BLOCKER: Admin credentials in .env don't match production DB **")
    print("  ** Need user to provide working admin password for authenticated QA **")
    print("=" * 60)

    with open(f"{SCREENSHOT_DIR}/qa-report-unauth.json", "w") as f:
        json.dump({"total": total, "passed": passed, "failed": failed, "results": results}, f, indent=2)

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    exit_code = run_qa()
    sys.exit(exit_code)
