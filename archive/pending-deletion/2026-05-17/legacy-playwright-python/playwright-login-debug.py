"""Debug the login flow step by step"""
from playwright.sync_api import sync_playwright
import sys, os, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_URL = "https://sswanstudios.com"
RESULTS_DIR = "frontend/test-results/login-debug"
os.makedirs(RESULTS_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    # Capture network requests
    api_responses = []
    def on_response(response):
        if "/api/" in response.url:
            try:
                body = response.text()
            except:
                body = "<binary>"
            api_responses.append({
                "url": response.url,
                "status": response.status,
                "body": body[:300]
            })
    page.on("response", on_response)

    # Go to login
    page.goto(f"{BASE_URL}/login", timeout=30000)
    page.wait_for_load_state("networkidle", timeout=20000)

    # Find all inputs
    inputs = page.locator("input").all()
    print(f"Found {len(inputs)} inputs:")
    for i, inp in enumerate(inputs):
        attrs = page.evaluate("""(el) => ({
            type: el.type,
            name: el.name,
            placeholder: el.placeholder,
            id: el.id,
            visible: el.offsetParent !== null
        })""", inp.element_handle())
        print(f"  [{i}] type={attrs['type']} name={attrs['name']} placeholder='{attrs['placeholder']}' id={attrs['id']} visible={attrs['visible']}")

    # Fill with SeanSwan
    print("\nFilling credentials: SeanSwan / admin123")
    user_input = page.locator('input').nth(0)
    pass_input = page.locator('input[type="password"]').first
    user_input.fill("SeanSwan")
    pass_input.fill("admin123")
    page.screenshot(path=f"{RESULTS_DIR}/01-filled.png")

    # Find submit button
    buttons = page.locator("button").all()
    print(f"\nFound {len(buttons)} buttons:")
    for i, btn in enumerate(buttons):
        text = btn.text_content().strip()
        visible = btn.is_visible()
        print(f"  [{i}] '{text}' visible={visible}")

    # Click Sign In
    submit = page.locator('button:has-text("Sign In")').first
    print(f"\nClicking: '{submit.text_content().strip()}'")

    # Listen for any error messages
    submit.click()
    page.wait_for_timeout(5000)
    page.screenshot(path=f"{RESULTS_DIR}/02-after-click.png")

    print(f"\nAfter login attempt:")
    print(f"  URL: {page.url}")

    # Check for error messages on page
    error_msgs = page.evaluate("""() => {
        const els = document.querySelectorAll('[class*="error" i], [class*="alert" i], [role="alert"], .toast, [class*="toast" i]');
        return Array.from(els).map(e => e.textContent?.trim().slice(0, 100)).filter(Boolean);
    }""")
    if error_msgs:
        print(f"  Error messages: {error_msgs}")
    else:
        print("  No visible error messages")

    # Check body text for clues
    body = page.evaluate("() => document.body.innerText.slice(0, 500)")
    print(f"  Body: {body[:200]}")

    # Show API responses
    print(f"\nAPI calls captured ({len(api_responses)}):")
    for r in api_responses:
        print(f"  {r['status']} {r['url']}")
        if r['status'] >= 400:
            print(f"    Body: {r['body'][:200]}")

    page.close()
    ctx.close()
    browser.close()
