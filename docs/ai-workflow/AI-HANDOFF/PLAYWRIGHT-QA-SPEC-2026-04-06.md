# Playwright QA Spec

Date: 2026-04-06
Purpose: Define the automated QA coverage needed so the current issues do not regress and new fixes are validated properly.
Parent brief: `docs/ai-workflow/AI-HANDOFF/COMPREHENSIVE-SITE-REFRACTOR-BRIEF-2026-04-06.md`

## Goal

Create a Playwright suite that covers the critical operational workflows, mobile regressions, and console/API failures described in the refactor brief.

## Important Environment Rule

If local development still points at the production database, destructive flows must not be run against live data.

Required before full automation:

- dedicated staging environment, or
- dedicated test tenant and cleanup strategy, or
- seeded local test database

## Test Matrix

## Viewports

- iPhone XR baseline
- one modern mobile viewport
- one desktop viewport

## Shared Assertions

Every major flow should validate:

- no uncaught console errors
- no clipped or horizontally overflowing primary content
- visible actionable buttons
- stable back/close behavior
- expected API status codes
- correct success/failure messaging

## Global Monitoring

The suite should include utilities for:

- console error capture
- failed network request capture
- screenshot on failure
- route transition tracking
- overflow/clipping checks for key containers

## Smoke Suite

Run on every major release:

1. login and role-based dashboard entry
2. coach assistant open/close
3. workout planner open
4. content studio open
5. marketing open
6. security workspace open
7. store tier open and back out
8. schedule open

## Core Regression Suites

## A. Workout planner

- add exercise with explicit control
- verify name remains visible after add
- save plan
- reopen saved plans
- load plan into builder
- duplicate plan to another client
- mobile rolodex shows contained scroll instead of full-page overflow

## B. Boot Camp Creator

- add exercises
- verify compact exercise list behavior
- save as template
- reopen template library
- confirm joint-friendly alternatives differ from the main chart when expected

## C. Coach Assistant

- open and close from dashboard
- ensure sidebar dismisses correctly after navigation
- send prompt
- verify copy works
- verify read-aloud control responds
- verify dropdown controls work
- verify no raw HTML tags appear in rendered output
- verify overlay/z-index does not trap prior content

## D. Claim/login/account activation

- invalid claim token path
- verified claim path
- new password setup path
- forced password change path
- normal post-activation login path

Important: only run destructive claim/account tests in a safe non-production environment.

## E. Equipment profiles

- create location
- navigate back out cleanly
- upload image manually
- scan image with AI
- edit equipment
- delete equipment
- verify persistence

## F. Scheduling

- open schedule
- show whose schedule is being viewed
- book 30-minute session
- book 45-minute session
- book 60-minute session
- verify entry appears correctly

## G. Storefront

- load real package data
- select tier
- confirm user can exit/go back
- verify no fallback-only behavior when API is healthy

## H. Assessments and movement analysis

- submit valid assessment
- catch validation errors cleanly
- verify recent assessments list updates
- verify no `500` on successful flow

## I. Content Studio

- coverage tracker loads
- motion templates do not crash
- tabs are horizontally reachable on mobile
- badge creator loads
- blog writer loads
- social composer loads
- settings load
- back behavior returns to prior context

## J. Marketing

- tabs horizontally scroll on mobile
- SEO audit loads
- keyword research loads
- email digest loads
- competitor analysis loads

## K. Security

- alerts feed loads
- clear indication of real vs mock data
- Teach Me or explanatory affordances exist where expected

## L. Messaging

- open compose flow
- search recipients
- verify clients/trainers/admin are searchable
- verify admin is always reachable

## Layout and Visual Checks

Add focused checks for:

- iPhone XR clipping on hero Find a Trainer flow
- enhanced client progress mobile layout
- builder columns clipping rightward
- tab bars inaccessible due to overflow
- contrast-sensitive cards/screenshots on default theme

## Suggested Suite Structure

1. `smoke`
2. `mobile-critical`
3. `planner-and-bootcamp`
4. `ai-terminal-regression`
5. `content-and-marketing`
6. `equipment-and-assessments`
7. `scheduling-and-store`
8. `messaging-and-social`

## Exit Criteria

The Playwright spec is complete when:

- every P0 blocker has at least one automated regression
- every major mobile pain point has a viewport-based test
- console and network failures are surfaced automatically
- destructive flows are isolated from production-backed data

