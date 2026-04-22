"""
Playwright QA: WorkoutLogger 14-Phase Enterprise Redesign
=========================================================
Tests all 14 phases deployed to sswanstudios.com
"""

import sys
import os
import json
import time

os.environ["PYTHONIOENCODING"] = "utf-8"
sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

BASE_URL = "https://sswanstudios.com"
ADMIN_USERNAME = "ogpswan"
ADMIN_PASSWORD = os.environ.get("TEST_PASSWORD")
if not ADMIN_PASSWORD:
    raise SystemExit("TEST_PASSWORD env var required (no default for security - see CREDENTIALS-ROTATION-OPUS-CODEX-DEBATE-2026-04-21.md)")
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
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = context.new_page()

        # Capture console errors
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        # ─── TEST 0: Login ───
        print("\n=== Phase 0: Admin Login ===")
        logged_in = False
        try:
            page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(2000)
            page.screenshot(path=f"{SCREENSHOT_DIR}/00-login-page.png", full_page=True)

            # The form has placeholder "Username or Email" and "Password"
            # Get all text/email inputs
            all_inputs = page.locator('input').all()
            print(f"    Found {len(all_inputs)} inputs on login page")
            for i, inp in enumerate(all_inputs):
                inp_type = inp.get_attribute("type") or "text"
                inp_placeholder = inp.get_attribute("placeholder") or ""
                print(f"    Input {i}: type={inp_type}, placeholder={inp_placeholder}")

            # Fill username - it's the first visible text input
            username_input = page.locator('input[placeholder*="Username"], input[placeholder*="username"], input[placeholder*="Email"]').first
            password_input = page.locator('input[type="password"]').first

            if username_input.count() > 0 and password_input.count() > 0:
                username_input.fill(ADMIN_USERNAME)
                password_input.fill(ADMIN_PASSWORD)
                page.wait_for_timeout(500)

                login_btn = page.locator('button:has-text("Sign In"), button:has-text("Login"), button:has-text("Log In"), button[type="submit"]').first
                print(f"    Login button found: {login_btn.count() > 0}")
                if login_btn.count() > 0:
                    login_btn.click()

                    # Wait for navigation
                    page.wait_for_timeout(6000)
                    try:
                        page.wait_for_load_state("networkidle", timeout=10000)
                    except:
                        pass

                page.screenshot(path=f"{SCREENSHOT_DIR}/00-after-login.png", full_page=True)
                current_url = page.url
                logged_in = "dashboard" in current_url or "/admin" in current_url

                # Check for error messages
                error_msg = page.locator('[class*="error" i], [class*="alert" i]:has-text("Invalid")').first
                if error_msg.count() > 0:
                    err_text = error_msg.text_content()
                    print(f"    Login error: {err_text}")
                    # Try with email instead
                    print("    Retrying with email...")
                    username_input.fill("")
                    username_input.fill("ogpswan@yahoo.com")
                    password_input.fill("")
                    password_input.fill(ADMIN_PASSWORD)
                    page.wait_for_timeout(500)
                    login_btn.click()
                    page.wait_for_timeout(6000)
                    try:
                        page.wait_for_load_state("networkidle", timeout=10000)
                    except:
                        pass
                    page.screenshot(path=f"{SCREENSHOT_DIR}/00-after-login-retry.png", full_page=True)
                    current_url = page.url
                    logged_in = "dashboard" in current_url

                log_result("Admin Login", logged_in, f"URL: {current_url}")
            else:
                log_result("Admin Login", False, "Could not find username/password inputs")
        except Exception as e:
            log_result("Admin Login", False, str(e)[:200])
            page.screenshot(path=f"{SCREENSHOT_DIR}/00-login-error.png", full_page=True)

        if not logged_in:
            # Try direct API login to get token
            print("    Attempting API login to get JWT token...")
            try:
                token_result = page.evaluate("""
                    async (password) => {
                        try {
                            const res = await fetch('https://ss-pt-new.onrender.com/api/auth/login', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username: 'ogpswan', password: password })
                            });
                            const data = await res.json();
                            if (data.token) {
                                localStorage.setItem('token', data.token);
                                if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
                                return { success: true, token: data.token.substring(0, 20) + '...' };
                            }
                            return { success: false, status: res.status, message: data.message || 'No token' };
                        } catch (e) {
                            return { success: false, error: e.message };
                        }
                    }
                """, ADMIN_PASSWORD)
                print(f"    API login result: {json.dumps(token_result)}")
                if token_result.get("success"):
                    logged_in = True
                    log_result("Admin Login (API fallback)", True, f"Token: {token_result.get('token', 'obtained')}")
                    # Navigate to dashboard
                    page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle", timeout=20000)
                    page.wait_for_timeout(3000)
                    page.screenshot(path=f"{SCREENSHOT_DIR}/00-dashboard-api-login.png", full_page=True)
                else:
                    print(f"    API login also failed: {token_result}")
            except Exception as e:
                print(f"    API login error: {str(e)[:200]}")

        if not logged_in:
            print("\n  ** Cannot proceed without login. Most tests will fail. **")
            print("  ** Continuing anyway to check what's accessible... **\n")

        # ─── TEST 1: Navigate to Workout Logger ───
        print("\n=== Phase 1: Workout Logger Navigation ===")
        try:
            page.goto(f"{BASE_URL}/dashboard/admin-sessions", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(4000)
            page.screenshot(path=f"{SCREENSHOT_DIR}/01-workout-logger.png", full_page=True)

            current_url = page.url
            on_logger = "admin-sessions" in current_url or "workout" in current_url
            # If redirected to login, still stuck
            if "login" in current_url:
                on_logger = False

            page_text = page.text_content("body") or ""
            has_workout_text = any(w in page_text.lower() for w in ["workout", "exercise", "training session", "client"])

            log_result("Workout Logger Page Loads", on_logger and has_workout_text,
                       f"URL: {current_url}, has workout text: {has_workout_text}")
        except Exception as e:
            log_result("Workout Logger Navigation", False, str(e)[:200])

        # ─── TEST 2: Black Theme ───
        print("\n=== Phase 2: Black Theme (Obsidian) ===")
        try:
            bg_colors = page.evaluate("""
                () => {
                    const elements = document.querySelectorAll('div, section, main, aside, header, nav');
                    const colors = [];
                    for (const el of elements) {
                        const bg = getComputedStyle(el).backgroundColor;
                        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                            colors.push(bg);
                        }
                    }
                    // Deduplicate
                    return [...new Set(colors)].slice(0, 40);
                }
            """)

            black_count = 0
            blue_count = 0
            for color in bg_colors:
                if "rgb" in color:
                    parts = color.replace("rgba(", "").replace("rgb(", "").replace(")", "").split(",")
                    r, g, b = int(float(parts[0].strip())), int(float(parts[1].strip())), int(float(parts[2].strip()))
                    # Black theme: very low RGB
                    if r < 35 and g < 35 and b < 45 and max(r,g,b) < 50:
                        black_count += 1
                    # Blue heavy: blue >> red+green
                    if b > 80 and r < 15 and g < 50:
                        blue_count += 1

            log_result("Black Theme Present", black_count > 0,
                       f"{black_count} black bg elements, {blue_count} blue-heavy, {len(bg_colors)} total colors")
            log_result("Blue Dominance Reduced", blue_count <= black_count,
                       f"Black:{black_count} vs Blue:{blue_count}")
        except Exception as e:
            log_result("Black Theme", False, str(e)[:200])

        # ─── TEST 3: Workout Logger Components ───
        print("\n=== Phase 3: Workout Logger Components ===")
        try:
            # Full DOM text search for our components
            dom_audit = page.evaluate("""
                () => {
                    const html = document.documentElement.innerHTML.toLowerCase();
                    const body_text = document.body.innerText.toLowerCase();
                    return {
                        // Text content checks
                        hasWarmup: body_text.includes('warmup') || body_text.includes('warm-up') || body_text.includes('warm up'),
                        hasCooldown: body_text.includes('cooldown') || body_text.includes('cool-down') || body_text.includes('cool down'),
                        hasBalance: body_text.includes('balance') || body_text.includes('core'),
                        hasPhase: body_text.includes('phase') || body_text.includes('opt'),
                        hasExercise: body_text.includes('exercise'),
                        hasLearning: body_text.includes('learning'),
                        hasVoice: body_text.includes('voice') || body_text.includes('upload') || body_text.includes('memo'),

                        // Class/attribute checks (styled-components use hashed classes, so check data attrs and roles)
                        checkboxCount: document.querySelectorAll('input[type="checkbox"]').length,
                        buttonCount: document.querySelectorAll('button').length,
                        inputCount: document.querySelectorAll('input').length,
                        selectCount: document.querySelectorAll('select').length,
                        detailsCount: document.querySelectorAll('details').length,
                        svgCount: document.querySelectorAll('svg').length,

                        // Look for specific structural patterns
                        hasSlider: document.querySelectorAll('input[type="range"]').length > 0,
                        hasTable: document.querySelectorAll('table').length > 0,
                        hasDataLabels: document.querySelectorAll('[data-label]').length,
                        hasRole: {
                            buttons: document.querySelectorAll('[role="button"]').length,
                            dialogs: document.querySelectorAll('[role="dialog"]').length,
                            listboxes: document.querySelectorAll('[role="listbox"]').length,
                            tabs: document.querySelectorAll('[role="tab"]').length,
                            switches: document.querySelectorAll('[role="switch"]').length,
                        },

                        // Get visible text snippets
                        headings: Array.from(document.querySelectorAll('h1,h2,h3,h4')).map(h => h.textContent.trim()).filter(Boolean).slice(0, 15),
                    };
                }
            """)

            print(f"    Headings found: {dom_audit.get('headings', [])}")
            print(f"    Buttons: {dom_audit['buttonCount']}, Inputs: {dom_audit['inputCount']}, Selects: {dom_audit['selectCount']}")
            print(f"    Checkboxes: {dom_audit['checkboxCount']}, Details: {dom_audit['detailsCount']}, SVGs: {dom_audit['svgCount']}")
            print(f"    Data-labels: {dom_audit['hasDataLabels']}, Sliders: {dom_audit['hasSlider']}, Tables: {dom_audit['hasTable']}")
            print(f"    Roles: {dom_audit.get('hasRole', {})}")

            # Log individual component results
            log_result("Warmup Section in DOM", dom_audit.get("hasWarmup", False))
            log_result("Cooldown Section in DOM", dom_audit.get("hasCooldown", False))
            log_result("Balance/Core in DOM", dom_audit.get("hasBalance", False))
            log_result("Phase Selector in DOM", dom_audit.get("hasPhase", False))
            log_result("Exercise Content in DOM", dom_audit.get("hasExercise", False))
            log_result("Voice/Upload in DOM", dom_audit.get("hasVoice", False))
            log_result("Interactive Controls (>10 buttons)", dom_audit["buttonCount"] > 10,
                       f"{dom_audit['buttonCount']} buttons")
            log_result("Form Inputs Present (>5)", dom_audit["inputCount"] > 5,
                       f"{dom_audit['inputCount']} inputs")

        except Exception as e:
            log_result("Workout Logger Components", False, str(e)[:200])

        # ─── TEST 4: AI Terminal in Multiple Tabs ───
        print("\n=== Phase 4: AI Terminal in Admin Tabs ===")
        admin_routes = {
            "Dashboard": "/dashboard/default",
            "Schedule": "/dashboard/schedule",
            "Clients": "/dashboard/client-management",
            "Training": "/dashboard/admin-sessions",
        }

        ai_found_count = 0
        for tab_name, route in admin_routes.items():
            try:
                page.goto(f"{BASE_URL}{route}", wait_until="networkidle", timeout=20000)
                page.wait_for_timeout(2000)

                # Check for AI terminal by looking for textarea/input with AI-related placeholder,
                # or elements with ai/terminal/assistant in class/id
                ai_check = page.evaluate("""
                    () => {
                        const html = document.documentElement.innerHTML.toLowerCase();
                        const hasAITerminal = html.includes('ai') && (
                            html.includes('terminal') || html.includes('assistant') || html.includes('chat')
                        );
                        const aiInputs = document.querySelectorAll(
                            'textarea[placeholder*="ask" i], textarea[placeholder*="ai" i], ' +
                            'input[placeholder*="ask" i], input[placeholder*="ai" i]'
                        );
                        return {
                            hasAIInDOM: hasAITerminal,
                            aiInputCount: aiInputs.length,
                        };
                    }
                """)

                found = ai_check.get("hasAIInDOM", False) or ai_check.get("aiInputCount", 0) > 0
                if found:
                    ai_found_count += 1

                safe_name = tab_name.lower().replace(" ", "-")
                page.screenshot(path=f"{SCREENSHOT_DIR}/04-ai-{safe_name}.png", full_page=True)

            except Exception as e:
                print(f"    Error on {tab_name}: {str(e)[:100]}")

        log_result("AI Terminal Present in Tabs", ai_found_count > 0,
                   f"Found in {ai_found_count}/{len(admin_routes)} tabs")

        # ─── TEST 5: Bootcamp Builder ───
        print("\n=== Phase 5: Bootcamp Builder ===")
        try:
            page.goto(f"{BASE_URL}/dashboard/bootcamp", wait_until="networkidle", timeout=20000)
            page.wait_for_timeout(3000)
            page.screenshot(path=f"{SCREENSHOT_DIR}/05-bootcamp.png", full_page=True)

            bootcamp_check = page.evaluate("""
                () => {
                    const text = document.body.innerText.toLowerCase();
                    const html = document.documentElement.innerHTML.toLowerCase();
                    return {
                        hasBootcamp: text.includes('bootcamp') || text.includes('class format') || text.includes('station'),
                        hasGenerate: text.includes('generate'),
                        hasOPTPhase: text.includes('opt phase') || text.includes('opt phase') || html.includes('optphase'),
                        buttonCount: document.querySelectorAll('button').length,
                        selectCount: document.querySelectorAll('select').length,
                        url: window.location.href,
                    };
                }
            """)

            is_bootcamp = bootcamp_check.get("hasBootcamp", False) and "login" not in bootcamp_check.get("url", "")
            log_result("Bootcamp Builder Loads", is_bootcamp,
                       f"URL: {bootcamp_check.get('url')}, buttons: {bootcamp_check.get('buttonCount')}")
            log_result("Bootcamp OPT Phase Selector", bootcamp_check.get("hasOPTPhase", False))

        except Exception as e:
            log_result("Bootcamp Builder", False, str(e)[:200])

        # ─── TEST 6: Mobile Responsive ───
        print("\n=== Phase 6: Mobile Responsive (375px) ===")
        try:
            page.set_viewport_size({"width": 375, "height": 812})
            page.goto(f"{BASE_URL}/dashboard/admin-sessions", wait_until="networkidle", timeout=20000)
            page.wait_for_timeout(3000)
            page.screenshot(path=f"{SCREENSHOT_DIR}/06-mobile-375.png", full_page=True)

            mobile_check = page.evaluate("""
                () => {
                    const buttons = document.querySelectorAll('button, a[role="button"], [role="button"]');
                    let tooSmall = 0;
                    let total = 0;
                    for (const btn of buttons) {
                        const rect = btn.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            total++;
                            if (rect.height < 40 && rect.width < 40) tooSmall++;
                        }
                    }
                    return {
                        tooSmall,
                        total,
                        dataLabels: document.querySelectorAll('[data-label]').length,
                        viewportWidth: window.innerWidth,
                    };
                }
            """)

            log_result("Mobile Viewport Renders", mobile_check.get("viewportWidth") == 375,
                       f"Viewport: {mobile_check.get('viewportWidth')}px")
            log_result("Touch Targets OK", mobile_check.get("tooSmall", 0) < 3,
                       f"{mobile_check.get('tooSmall')}/{mobile_check.get('total')} buttons too small")
            log_result("Data Labels for Mobile Cards", mobile_check.get("dataLabels", 0) > 0,
                       f"{mobile_check.get('dataLabels')} data-label elements")

            # Reset viewport
            page.set_viewport_size({"width": 1440, "height": 900})
        except Exception as e:
            log_result("Mobile Responsive", False, str(e)[:200])
            page.set_viewport_size({"width": 1440, "height": 900})

        # ─── TEST 7: API Endpoints ───
        print("\n=== Phase 7: API Endpoint Health ===")
        try:
            api_results = page.evaluate("""
                async () => {
                    const token = localStorage.getItem('token');
                    const headers = token
                        ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
                        : { 'Content-Type': 'application/json' };

                    const checks = {};

                    // Health check
                    try {
                        const r = await fetch('https://ss-pt-new.onrender.com/api/health');
                        checks.health = { status: r.status, ok: r.ok };
                    } catch(e) { checks.health = { error: e.message }; }

                    // Exercise search
                    try {
                        const r = await fetch('https://ss-pt-new.onrender.com/api/exercises/search?q=bench&limit=5', { headers });
                        const d = await r.json();
                        checks.exerciseSearch = { status: r.status, success: d.success, count: d.exercises?.length || 0 };
                    } catch(e) { checks.exerciseSearch = { error: e.message }; }

                    // Bootcamp spaces
                    try {
                        const r = await fetch('https://ss-pt-new.onrender.com/api/bootcamp/spaces', { headers });
                        checks.bootcampSpaces = { status: r.status };
                    } catch(e) { checks.bootcampSpaces = { error: e.message }; }

                    // AI commands count
                    try {
                        const r = await fetch('https://ss-pt-new.onrender.com/api/ai/commands', { headers });
                        const d = await r.json();
                        checks.aiCommands = { status: r.status, count: d.totalCommands || d.commands?.length || 0 };
                    } catch(e) { checks.aiCommands = { error: e.message }; }

                    return checks;
                }
            """)

            for endpoint, result in api_results.items():
                status = result.get("status", 0)
                is_ok = status in [200, 201] or result.get("success", False)
                detail = f"Status: {status}"
                if "count" in result:
                    detail += f", count: {result['count']}"
                if "error" in result:
                    detail = f"Error: {result['error']}"
                log_result(f"API: {endpoint}", is_ok, detail)

        except Exception as e:
            log_result("API Health", False, str(e)[:200])

        # ─── TEST 8: Console Errors ───
        print("\n=== Phase 8: Console Error Audit ===")
        critical_errors = [e for e in console_errors if "chunk" in e.lower() or "undefined" in e.lower() or "cannot read" in e.lower()]
        log_result("No Critical Console Errors", len(critical_errors) == 0,
                   f"{len(critical_errors)} critical errors, {len(console_errors)} total errors")
        if critical_errors:
            for err in critical_errors[:5]:
                print(f"    ERROR: {err[:150]}")

        # Final screenshot
        page.screenshot(path=f"{SCREENSHOT_DIR}/99-final.png", full_page=True)
        browser.close()

    # ─── SUMMARY ───
    print("\n" + "=" * 60)
    print("  QA RESULTS SUMMARY")
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
    print("=" * 60)

    with open(f"{SCREENSHOT_DIR}/qa-report.json", "w") as f:
        json.dump({"total": total, "passed": passed, "failed": failed, "results": results}, f, indent=2)

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    exit_code = run_qa()
    sys.exit(exit_code)
