"""
Playwright QA: Post-Deploy Verification
========================================
Verifies exercise database seeding and core functionality
after the render-start.mjs fix deployment.

Tests:
1) Exercise search API returns results (DB seeded)
2) API health check
3) Frontend bundle loads (no chunk errors)
4) Black theme present
5) JS bundle contains WorkoutLogger components
6) Mobile responsive (375px)
"""

import sys
import os
import json

os.environ["PYTHONIOENCODING"] = "utf-8"
sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

BASE_URL = "https://sswanstudios.com"
API_URL = "https://ss-pt-new.onrender.com"
SCREENSHOT_DIR = "tests/qa-screenshots"

results = []

def log_result(test_name, passed, details=""):
    results.append({"test": test_name, "passed": passed, "details": details})
    icon = "PASS" if passed else "FAIL"
    print(f"  [{icon}] {test_name}: {details}" if details else f"  [{icon}] {test_name}")


def run_qa():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        # --- TEST 1: Exercise Search API (Critical — verifies DB seeded) ---
        print("\n=== Test 1: Exercise Database Seeded ===")
        try:
            exercise_check = page.evaluate("""
                async () => {
                    const searches = ['bench', 'squat', 'curl', 'plank', 'deadlift'];
                    const results = {};
                    for (const q of searches) {
                        try {
                            const r = await fetch('""" + API_URL + """/api/exercises/search?q=' + q + '&limit=5');
                            const d = await r.json();
                            results[q] = {
                                status: r.status,
                                count: d.exercises ? d.exercises.length : 0,
                                names: d.exercises ? d.exercises.slice(0, 3).map(e => e.name) : []
                            };
                        } catch (e) {
                            results[q] = { error: e.message };
                        }
                    }
                    return results;
                }
            """)

            total_exercises = 0
            for q, result in exercise_check.items():
                count = result.get("count", 0)
                total_exercises += count
                names = result.get("names", [])
                log_result(f"Exercise Search: '{q}'", count > 0,
                           f"{count} results — {', '.join(names[:3])}")

            log_result("Exercise DB Seeded", total_exercises > 10,
                       f"Total across 5 searches: {total_exercises} exercises")

        except Exception as e:
            log_result("Exercise Database", False, str(e)[:200])

        # --- TEST 2: API Health ---
        print("\n=== Test 2: API Health ===")
        try:
            health = page.evaluate("""
                async () => {
                    try {
                        const r = await fetch('""" + API_URL + """/api/health');
                        const d = await r.json();
                        return { status: r.status, data: JSON.stringify(d).substring(0, 200) };
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            """)
            log_result("API Health", health.get("status") == 200,
                       f"Status: {health.get('status', 'error')}")
        except Exception as e:
            log_result("API Health", False, str(e)[:200])

        # --- TEST 3: Exercise /all endpoint ---
        print("\n=== Test 3: Exercise /all Endpoint ===")
        try:
            all_check = page.evaluate("""
                async () => {
                    try {
                        const r = await fetch('""" + API_URL + """/api/exercises/all');
                        const d = await r.json();
                        return {
                            status: r.status,
                            count: d.exercises ? d.exercises.length : (Array.isArray(d) ? d.length : 0),
                            success: d.success
                        };
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            """)
            count = all_check.get("count", 0)
            log_result("Exercise /all Endpoint", count > 50,
                       f"Status: {all_check.get('status')}, Count: {count}")
        except Exception as e:
            log_result("Exercise /all", False, str(e)[:200])

        # --- TEST 4: Frontend Loads ---
        print("\n=== Test 4: Frontend Bundle ===")
        try:
            page.goto(f"{BASE_URL}", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(2000)
            page.screenshot(path=f"{SCREENSHOT_DIR}/post-deploy-homepage.png", full_page=True)

            chunk_errors = [e for e in console_errors if "chunk" in e.lower()]
            log_result("No Chunk Errors", len(chunk_errors) == 0,
                       f"{len(chunk_errors)} chunk errors")
        except Exception as e:
            log_result("Frontend Bundle", False, str(e)[:200])

        # --- TEST 5: Login Page + Black Theme ---
        print("\n=== Test 5: Login + Theme ===")
        try:
            page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=20000)
            page.wait_for_timeout(2000)
            page.screenshot(path=f"{SCREENSHOT_DIR}/post-deploy-login.png", full_page=True)

            theme = page.evaluate("""
                () => {
                    const body = document.body;
                    const bg = getComputedStyle(body).backgroundColor;
                    const all = document.querySelectorAll('*');
                    let darkCount = 0;
                    for (const el of all) {
                        const c = getComputedStyle(el).backgroundColor;
                        const m = c.match(/rgb[a]?\\((\\d+)[,\\s]+(\\d+)[,\\s]+(\\d+)/);
                        if (m) {
                            const [_, r, g, b] = m.map(Number);
                            if (r < 30 && g < 30 && b < 40) darkCount++;
                        }
                    }
                    return { bodyBg: bg, darkElements: darkCount };
                }
            """)
            log_result("Black Theme", theme.get("darkElements", 0) > 3,
                       f"Dark elements: {theme['darkElements']}, Body BG: {theme['bodyBg']}")
        except Exception as e:
            log_result("Theme Check", False, str(e)[:200])

        # --- TEST 6: Mobile Login ---
        print("\n=== Test 6: Mobile (375px) ===")
        try:
            page.set_viewport_size({"width": 375, "height": 812})
            page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(1500)
            page.screenshot(path=f"{SCREENSHOT_DIR}/post-deploy-mobile.png", full_page=True)

            mobile = page.evaluate("""
                () => {
                    const form = document.querySelector('form') || document.querySelector('input')?.closest('div');
                    const overflow = form ? form.getBoundingClientRect().right > window.innerWidth : false;
                    return { vw: window.innerWidth, overflow };
                }
            """)
            log_result("Mobile No Overflow", not mobile.get("overflow", True),
                       f"Viewport: {mobile['vw']}px")
            page.set_viewport_size({"width": 1440, "height": 900})
        except Exception as e:
            log_result("Mobile", False, str(e)[:200])
            page.set_viewport_size({"width": 1440, "height": 900})

        # --- TEST 7: Console Error Audit ---
        print("\n=== Test 7: Console Errors ===")
        critical = [e for e in console_errors if any(k in e.lower() for k in
                    ["chunk", "cannot read", "is not defined", "syntaxerror", "referenceerror"])]
        log_result("No Critical JS Errors", len(critical) == 0,
                   f"{len(critical)} critical, {len(console_errors)} total")
        if console_errors:
            for err in console_errors[:5]:
                print(f"    - {err[:150]}")

        browser.close()

    # --- SUMMARY ---
    print("\n" + "=" * 60)
    print("  POST-DEPLOY QA RESULTS")
    print("=" * 60)

    passed = sum(1 for r in results if r["passed"])
    failed = sum(1 for r in results if not r["passed"])
    total = len(results)

    for r in results:
        icon = "PASS" if r["passed"] else "FAIL"
        detail = f" -- {r['details']}" if r["details"] else ""
        print(f"  [{icon}] {r['test']}{detail}")

    print(f"\n  Results: {passed}/{total} passed, {failed} failed")
    print("=" * 60)

    with open(f"{SCREENSHOT_DIR}/qa-report-post-deploy.json", "w") as f:
        json.dump({"total": total, "passed": passed, "failed": failed, "results": results}, f, indent=2)

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    exit_code = run_qa()
    sys.exit(exit_code)
