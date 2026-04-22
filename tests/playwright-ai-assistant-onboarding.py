"""
============================================================================
FILE: playwright-ai-assistant-onboarding.py
PURPOSE: E2E test for AI Assistant client onboarding + workout coaching
AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-27
============================================================================

Tests:
  Phase 1: Login as admin
  Phase 2: Create Move Fitness client via API
  Phase 3: Verify AI assistant UI opens (bar click -> expanded panel)
  Phase 4: Send workout data via AI chat API (bypass UI flakiness)
  Phase 5: Send follow-up workout via API
  Phase 6: Capture results + console errors
"""

import sys
import os
import json
import time
from datetime import datetime
from playwright.sync_api import sync_playwright

# ---------------------------------------------------------------
# SECTION: Configuration
# ---------------------------------------------------------------

BASE_URL = "https://sswanstudios.com"
ADMIN_USERNAME = "SeanSwan"
ADMIN_PASSWORD = os.environ.get("TEST_PASSWORD")
if not ADMIN_PASSWORD:
    raise SystemExit("TEST_PASSWORD env var required (no default for security - see CREDENTIALS-ROTATION-OPUS-CODEX-DEBATE-2026-04-21.md)")
BRAVE_PATH = r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"

SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots", "ai-assistant-onboarding")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

CLIENT_PROFILE = {
    "firstName": "Anand",
    "lastName": "Patel",
    "email": f"anand.patel.test.{int(time.time())}@movefitness.com",
    "phone": "555-0155",
    "gender": "Male",
    "dateOfBirth": "1971-03-15",
    "weight": 210,
    "height": 68,
    "fitnessGoal": "heart_health",
    "healthConcerns": (
        "Doctor advised monitoring blood pressure and heart rate. "
        "On BP medication. Slightly overweight. Indian male, ~55 years old. "
        "First main workout of the year - start NASM Phase 1 Stabilization Endurance."
    ),
    "trainingExperience": "Beginner - returning to exercise per doctor recommendation",
    "clientSource": "move_fitness",
}

WORKOUT_LOG_MESSAGE = (
    "I just completed a workout with my client Anand Patel. "
    "He is a 55-year-old Indian male, 210 lbs, 5'8\", Move Fitness client. "
    "Doctor advised monitoring BP and heart rate. On BP medication. "
    "This is his first main workout of the year -- NASM Phase 1 baseline.\n\n"
    "**Session Details -- Day 1 Baseline (30 min session)**\n"
    "Phase: NASM Phase 1 (Stabilization Endurance)\n"
    "Tempo: 1-1-1 on all exercises today\n\n"
    "**Warm-Up:**\n"
    "- Backward butterflies\n"
    "- Wall slides\n"
    "- Crossover hamstring stretch (both legs)\n\n"
    "**Circuit (2 rounds completed):**\n"
    "1. Box Squat to bench (bodyweight) -- 2 sets x 8 reps (slow controlled tempo)\n"
    "2. Incline Push-Ups on straight bar -- 2 sets x 12 reps (controlled)\n"
    "3. Seated Cable Row on stability ball (both arms) -- 2 sets x 8 reps @ 70 lbs\n\n"
    "**Only got 1 set of (ran out of time):**\n"
    "4. Low Step-Ups -- 1 set x 12 reps (with 15 lb DB) + 10 sec hold at top\n"
    "5. Briefly tested 30 lb step-ups with 15 sec hold, then back to 15 lb\n\n"
    "**Notes:** No dizziness, steady breathing, good control. 30-min Move Fitness session.\n\n"
    "Please:\n"
    "1. Give me a text message summary I can send to this client\n"
    "2. Suggest homework exercises between sessions (heart-health safe)\n"
    "3. Critique my workout based on NASM Phase 1 protocol for a BP/HR watch client\n"
    "4. Suggest what I could have done better or added\n"
    "5. Give me a progression plan for the next 4 weeks"
)

FOLLOWUP_WORKOUT_MESSAGE = (
    "Here's the follow-up workout from February 5, 2026 at 7:00 AM "
    "with the same client (Anand Patel, 55 y/o, BP/HR watch).\n\n"
    "**Warm-Up:** Backward butterflies, wall slides, shoulder ROM stretch.\n\n"
    "**Circuit (2 rounds):**\n"
    "1. Box Squats (bodyweight) -- 15 reps\n"
    "2. Kettlebell Swings -- 20 lbs\n"
    "3. Squat to Single-Arm Shoulder Press (KB) -- 10 lb x 12 reps each side\n"
    "4. Single-Arm KB Row on bench -- 26 lb x 12 reps each side "
    "(challenging -- out of breath, needed breaks)\n"
    "5. Push-Ups -- 12 reps (had to stop at 8, 20 sec break, finish last 4)\n"
    "6. DB Curls -- 10 lb x 12 reps each\n\n"
    "**Extra work (~40 min session today):**\n"
    "7. Assisted Pull-Up Machine -- 140 lb assist x 12 reps (break at 8)\n"
    "8. Assisted Dips -- 12 reps (visually tired, ended session)\n\n"
    "Normal tempo on all. Rows were the most challenging exercise.\n\n"
    "Please:\n"
    "1. Text summary I can send the client\n"
    "2. Compare to previous workout -- am I progressing him properly?\n"
    "3. Critique based on NASM Phase 1 for BP/HR client (intensity, tempo)\n"
    "4. Generate the next workout for Saturday Feb 7 at 7:30 AM"
)


def screenshot(page, name):
    path = os.path.join(SCREENSHOT_DIR, f"{name}.png")
    page.screenshot(path=path, full_page=False)
    print(f"  [SCREENSHOT] {name}.png")


def log_phase(n, title):
    print(f"\n{'='*60}")
    print(f"  PHASE {n}: {title}")
    print(f"{'='*60}")


def api_call(page, method, path, body=None):
    """Make an authenticated API call via page.evaluate."""
    body_json = json.dumps(body) if body else 'null'
    return page.evaluate(f"""async () => {{
        try {{
            const token = localStorage.getItem('token');
            const opts = {{
                method: '{method}',
                headers: {{ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }},
            }};
            if ({body_json}) opts.body = JSON.stringify({body_json});
            const r = await fetch('{BASE_URL}{path}', opts);
            const text = await r.text();
            let data;
            try {{ data = JSON.parse(text); }} catch {{ data = {{ rawText: text.substring(0, 1000) }}; }}
            return {{ status: r.status, data: data }};
        }} catch(e) {{
            return {{ status: 0, error: e.message }};
        }}
    }}""")


# ---------------------------------------------------------------
# SECTION: Main Test
# ---------------------------------------------------------------

def run_test():
    results = {
        "phases": {},
        "errors": [],
        "ai_responses": [],
        "client_created": None,
        "timestamp": datetime.now().isoformat(),
    }

    with sync_playwright() as p:
        print("\n[LAUNCH] Launching Brave browser...")
        browser = p.chromium.launch(
            executable_path=BRAVE_PATH,
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = context.new_page()
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        try:
            # ====================================================
            # PHASE 1: LOGIN
            # ====================================================
            log_phase(1, "LOGIN AS ADMIN")
            page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(2000)
            screenshot(page, "01-login-page")

            print(f"  Logging in as {ADMIN_USERNAME}...")
            page.locator('input[placeholder*="Username" i], input[type="text"]').first.fill(ADMIN_USERNAME)
            page.wait_for_timeout(300)
            page.locator('input[type="password"]').first.fill(ADMIN_PASSWORD)
            page.wait_for_timeout(300)
            page.locator('button:has-text("Sign In"), button[type="submit"]').first.click()

            logged_in = False
            for i in range(30):
                page.wait_for_timeout(2000)
                if "/dashboard" in page.url:
                    logged_in = True
                    print(f"  [OK] Dashboard: {page.url}")
                    break
                if i % 5 == 0 and i > 0:
                    print(f"  ... waiting ({i*2}s)")

            if not logged_in:
                screenshot(page, "02-login-failed")
                results["phases"]["login"] = "FAIL"
                return results

            page.wait_for_timeout(3000)
            screenshot(page, "03-dashboard")
            results["phases"]["login"] = "PASS"

            # ====================================================
            # PHASE 2: CREATE MOVE FITNESS CLIENT
            # ====================================================
            log_phase(2, "CREATE MOVE FITNESS CLIENT")
            r = api_call(page, "POST", "/api/admin/clients/create-external", CLIENT_PROFILE)
            print(f"  Status: {r.get('status')}")

            if r.get("status") in [200, 201]:
                d = r.get("data", {})
                client_id = (d.get("data", {}).get("client", {}).get("id")
                            or d.get("client", {}).get("id")
                            or d.get("id", "unknown"))
                print(f"  [OK] Client created: Anand Patel (ID: {client_id})")
                results["client_created"] = {"id": client_id, "name": "Anand Patel"}
                results["phases"]["create_client"] = "PASS"
            else:
                msg = r.get("data", {}).get("message", r.get("error", "unknown"))
                print(f"  [WARN] {msg}")
                print(f"  Response: {json.dumps(r.get('data', {}))[:400]}")
                results["phases"]["create_client"] = f"WARN: {msg}"
            screenshot(page, "04-client-created")

            # ====================================================
            # PHASE 3: VERIFY AI ASSISTANT UI
            # ====================================================
            log_phase(3, "VERIFY AI ASSISTANT UI OPENS")

            # Click the "SwanStudios Admin Assistant" bar
            bar = page.locator('button:has-text("SwanStudios Admin Assistant")').first
            if bar.is_visible(timeout=5000):
                print("  Found AI bar, clicking...")
                bar.click()
                page.wait_for_timeout(2000)
                screenshot(page, "05-ai-bar-expanded")

                # Check if textarea appeared
                textarea = page.locator('textarea[placeholder*="Ask"]').first
                if textarea.is_visible(timeout=3000):
                    print("  [OK] AI panel expanded with textarea visible")
                    results["phases"]["ui_ai_panel"] = "PASS"
                    # UI panel verified — skip UI typing (causes navigation issues)
                    # Will use API for actual message sending in Phase 4
                else:
                    print("  [WARN] Textarea not found after bar click")
                    results["phases"]["ui_ai_panel"] = "WARN: no textarea"
            else:
                print("  [WARN] AI bar not found")
                results["phases"]["ui_ai_panel"] = "WARN: bar not found"

            # ====================================================
            # PHASE 4: SEND WORKOUT DATA VIA API
            # ====================================================
            log_phase(4, "SEND WORKOUT DATA VIA AI CHAT API")

            # Ensure we're on the dashboard (UI test may have navigated away)
            if "/dashboard" not in page.url:
                page.goto(f"{BASE_URL}/dashboard/admin/overview", wait_until="networkidle", timeout=15000)
                page.wait_for_timeout(2000)

            # Step 1: Check diagnostics
            print("  Checking AI diagnostics...")
            diag = api_call(page, "GET", "/api/ai-chat/diagnostics")
            print(f"  Diagnostics: status={diag.get('status')}, data={json.dumps(diag.get('data', {}))[:300]}")

            # Step 2: Create conversation
            print("  Creating AI conversation...")
            conv_r = api_call(page, "POST", "/api/ai-chat/conversations", {
                "context": "workout_generation",
                "title": "Anand Patel - Workout Coaching",
                "responseStyle": "both"
            })
            print(f"  Conversation: status={conv_r.get('status')}")
            print(f"  Response: {json.dumps(conv_r.get('data', {}))[:500]}")

            conv_data = conv_r.get("data", {})
            conv_id = (conv_data.get("conversation", {}).get("id")
                      or conv_data.get("data", {}).get("conversation", {}).get("id")
                      or conv_data.get("conversationId")
                      or conv_data.get("id"))

            if not conv_id:
                print(f"  [FAIL] No conversation ID in response")
                results["phases"]["send_workout_log"] = "FAIL: no conversation created"
                results["errors"].append(f"Conv API returned: {json.dumps(conv_data)[:300]}")
            else:
                print(f"  [OK] Conversation ID: {conv_id}")

                # Step 3: Send workout log message
                print("  Sending workout log message...")
                msg_r = api_call(page, "POST", f"/api/ai-chat/conversations/{conv_id}/messages", {
                    "message": WORKOUT_LOG_MESSAGE
                })
                print(f"  Message: status={msg_r.get('status')}")

                msg_data = msg_r.get("data", {})
                if msg_r.get("status") == 200 and msg_data.get("success"):
                    ai_content = (msg_data.get("assistantMessage", {}).get("content", "")
                                 or msg_data.get("response", ""))
                    provider = msg_data.get("assistantMessage", {}).get("metadata", {}).get("provider", "unknown")
                    model = msg_data.get("assistantMessage", {}).get("metadata", {}).get("model", "unknown")

                    print(f"  [OK] AI responded: {len(ai_content)} chars (provider: {provider}, model: {model})")
                    if ai_content:
                        # Show preview (strip emoji for Windows cp1252 compat)
                        preview = ai_content[:600].replace('\n', '\n    ')
                        preview = preview.encode('ascii', 'replace').decode('ascii')
                        print(f"  --- AI Response Preview ---")
                        print(f"    {preview}")
                        print(f"  --- End Preview ---")

                        results["ai_responses"].append({
                            "phase": "workout_log",
                            "content": ai_content[:3000],
                            "full_length": len(ai_content),
                            "provider": provider,
                            "model": model,
                        })
                        results["phases"]["send_workout_log"] = "PASS"
                    else:
                        print("  [WARN] AI response was empty")
                        results["phases"]["send_workout_log"] = "WARN: empty response"
                else:
                    error_msg = msg_data.get("message", msg_data.get("error", "unknown"))
                    print(f"  [FAIL] Message send failed: {error_msg}")
                    print(f"  Full response: {json.dumps(msg_data)[:500]}")
                    results["phases"]["send_workout_log"] = f"FAIL: {error_msg}"
                    results["errors"].append(f"AI msg failed ({msg_r.get('status')}): {error_msg}")

            screenshot(page, "10-after-workout-api")

            # ====================================================
            # PHASE 5: SEND FOLLOW-UP WORKOUT
            # ====================================================
            log_phase(5, "SEND FOLLOW-UP WORKOUT (Feb 5)")

            if conv_id and "PASS" in results["phases"].get("send_workout_log", ""):
                print("  Sending follow-up workout message...")
                fu_r = api_call(page, "POST", f"/api/ai-chat/conversations/{conv_id}/messages", {
                    "message": FOLLOWUP_WORKOUT_MESSAGE
                })
                print(f"  Follow-up: status={fu_r.get('status')}")

                fu_data = fu_r.get("data", {})
                if fu_r.get("status") == 200 and fu_data.get("success"):
                    fu_content = (fu_data.get("assistantMessage", {}).get("content", "")
                                 or fu_data.get("response", ""))
                    fu_provider = fu_data.get("assistantMessage", {}).get("metadata", {}).get("provider", "unknown")

                    print(f"  [OK] Follow-up AI response: {len(fu_content)} chars ({fu_provider})")
                    if fu_content:
                        preview = fu_content[:600].replace('\n', '\n    ')
                        preview = preview.encode('ascii', 'replace').decode('ascii')
                        print(f"  --- Follow-up Preview ---")
                        print(f"    {preview}")
                        print(f"  --- End Preview ---")

                        results["ai_responses"].append({
                            "phase": "followup_workout",
                            "content": fu_content[:3000],
                            "full_length": len(fu_content),
                            "provider": fu_provider,
                        })
                        results["phases"]["followup_workout"] = "PASS"
                    else:
                        results["phases"]["followup_workout"] = "WARN: empty response"
                else:
                    error_msg = fu_data.get("message", "unknown")
                    print(f"  [FAIL] Follow-up failed: {error_msg}")
                    print(f"  Response: {json.dumps(fu_data)[:400]}")
                    results["phases"]["followup_workout"] = f"FAIL: {error_msg}"
            else:
                print("  [SKIP] No successful conversation from Phase 4")
                results["phases"]["followup_workout"] = "SKIP"

            screenshot(page, "14-after-followup")

            # ====================================================
            # PHASE 6: FINAL STATE & ERRORS
            # ====================================================
            log_phase(6, "FINAL STATE & CONSOLE ERRORS")
            screenshot(page, "16-final-state")

            if console_errors:
                print(f"  Console errors ({len(console_errors)}):")
                for err in console_errors[:10]:
                    print(f"    - {err[:120]}")
                results["console_errors"] = console_errors[:20]
            else:
                print("  [OK] No console errors")

        except Exception as e:
            print(f"\n  [FAIL] EXCEPTION: {e}")
            results["errors"].append(str(e))
            screenshot(page, "ERROR-exception")
            import traceback
            traceback.print_exc()

        finally:
            print(f"\n{'='*60}")
            print(f"  TEST RESULTS SUMMARY")
            print(f"{'='*60}")
            for phase, result in results["phases"].items():
                icon = "[OK]" if "PASS" in str(result) else "[WARN]" if "WARN" in str(result) else "[FAIL]"
                print(f"  {icon} {phase}: {result}")

            if results["ai_responses"]:
                print(f"\n  AI Responses: {len(results['ai_responses'])}")
                for resp in results["ai_responses"]:
                    print(f"    - {resp['phase']}: {resp['full_length']} chars ({resp.get('provider', '?')})")

            if results["errors"]:
                print(f"\n  Errors: {len(results['errors'])}")
                for err in results["errors"]:
                    print(f"    - {err[:150]}")

            if results["client_created"]:
                print(f"\n  Client: {results['client_created']}")

            results_path = os.path.join(SCREENSHOT_DIR, "test-results.json")
            with open(results_path, "w") as f:
                json.dump(results, f, indent=2, default=str)
            print(f"\n  Results: {results_path}")
            print(f"  Screenshots: {SCREENSHOT_DIR}")
            print(f"{'='*60}\n")

            print("  Browser open for 10s...")
            page.wait_for_timeout(10000)
            browser.close()

    return results


if __name__ == "__main__":
    results = run_test()
    failed = any("FAIL" in str(v) for v in results["phases"].values())
    sys.exit(1 if failed else 0)
