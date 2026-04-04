---
name: webapp-testing
description: Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs.
license: Complete terms in LICENSE.txt
---

# Web Application Testing

To test local web applications, write native Python Playwright scripts. 

## Mandatory Testing Standards
1. **End-to-End Flows**: Test complete user journeys (e.g., login → navigate → action → verify). Do not isolate single clicks.
2. **Outcome-Based Assertions**: Assert on visible state (e.g., `expect(page.get_by_text("Success")).to_be_visible()`). Never assert on implementation details like internal class names or DOM structure.
3. **Robust Wait Patterns**: Use `page.wait_for_selector()`, `page.wait_for_response()`, or `expect(locator).to_be_visible()` instead of arbitrary sleeps.
4. **Error Handling**: Explicitly test negative paths: invalid form inputs, unauthorized access, and simulated network failures.
5. **Responsive Design**: Set viewport size using `browser.new_page(viewport={'width': 375, 'height': 667})` to verify mobile layout behavior.
6. **State Hygiene**: Use `try...finally` blocks to ensure cleanup, logout, or session clearing occurs even if a test fails.

**Always run scripts with `--help` first** to see usage. DO NOT read the source until you try running the script first. These scripts are black-box utilities.

## Decision Tree: Choosing Your Approach

User task → Is it static HTML?
    ├─ Yes → Read HTML file directly to identify selectors
    │         ├─ Success → Write Playwright script using selectors
    │         └─ Fails/Incomplete → Treat as dynamic (below)
    │
    └─ No (dynamic webapp) → Is the server already running?
        ├─ No → Run: python scripts/with_server.py --help
        │        Then use the helper + write Playwright script
        │
        └─ Yes → Reconnaissance-then-action:
            1. Navigate and wait for networkidle
            2. Inspect DOM/Screenshot to confirm UI state
            3. Execute flow with proper assertions

## Example: Robust Test Structure
```python
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    # Test mobile view
    context = browser.new_context(viewport={'width': 375, 'height': 667})
    page = context.new_page()
    try:
        page.goto('http://localhost:5173')
        # Flow: Login
        page.get_by_label("Username").fill("user")
        page.get_by_role("button", name="Submit").click()
        # Verify outcome
        expect(page.get_by_text("Welcome")).to_be_visible()
    finally:
        # Cleanup
        page.request.post("http://localhost:5173/api/logout")
        browser.close()
```

## Best Practices
- **Use bundled scripts as black boxes**: Call `scripts/` directly via shell to manage server lifecycles.
- **Prefer Web-First Assertions**: Use `expect(locator).to_be_visible()` as it automatically retries until the condition is met.
- **Avoid `page.wait_for_timeout()`**: This is strictly forbidden; always use event-based waits.
- **Reconnaissance**: Use `page.screenshot(path='/tmp/debug.png')` to visualize failures during development.
- **Selectors**: Prioritize `get_by_role`, `get_by_label`, and `get_by_text` over CSS/XPath to ensure tests reflect user experience.

## Reference Files
- **examples/**:
  - `element_discovery.py`: Locating elements via accessible roles.
  - `flow_example.py`: Demonstrating multi-step user journeys.
  - `error_testing.py`: Patterns for handling invalid inputs and API failures.