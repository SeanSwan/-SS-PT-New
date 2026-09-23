# 05 — Wireframes (headless DX)

**Graphical UI: N/A** — this is a headless MCP server with a CLI; there is no
DOM, no viewport, no accessibility surface. Per protocol this is the explicit
N/A-with-reason record. What follows are the **developer/operator "wireframes":
the exact rendered surfaces a seat or Sean sees**, covering every required
state (success, denied, empty, validation-error, failure, recovery).

## 5.1 `node scripts/swan-coordination/status.mjs` — operator wall (success state)

```
Swan Coordination · v1.0 · 127.0.0.1:8377 · uptime 3h12m
seats   codex(gpt-6-astra) · glm(glm-5.3) · claude(fable-5) · grok(grok-4.6)
        stale: deepseek(last heartbeat 14m ago)
claims  backend/routes/pay.mjs            codex   41s
        docs/…/PROVIDER-ROUTING.md        glm     6m
activity (last 3)
  14:02 glm     blocked  waiting on pay.mjs held by codex
  14:01 codex    progress slice S2 reaper tests RED->GREEN 4/9
  13:58 claude   review   rr RR-20260911-provider-routing reviewed REVISE
consults today  glm 3 ok · grok 0 (gated) · deepseek 0/5.00USD month
rejects  DENIED_LOCK_HELD x2 · DENIED_SPEND_GATE x1
```

## 5.2 Empty state (fresh install, no seats)

```
Swan Coordination · v1.0 · 127.0.0.1:8377 · uptime 0h00m
seats   none registered
claims  none
activity none — seats appear here when harnesses connect via MCP
```

## 5.3 Denied-claim (the tool result an agent actually sees)

```json
{ "ok": false,
  "error": { "code": "DENIED_LOCK_HELD",
             "message": "backend/routes/pay.mjs is claimed",
             "holder": { "agent_id": "codex", "model": "gpt-6-astra",
                          "age_s": 41 },
             "hint": "work another file, or re-check coord_get_activity;
                      if the holder blue-screened, the next claim reaps it." } }
```

## 5.4 Validation error

```json
{ "ok": false,
  "error": { "code": "ERR_VALIDATION",
             "message": "fields invalid: paths[0] must be workspace-relative
                         (got C:\\… absolute); reason exceeds 200 chars" } }
```

## 5.5 Failure + recovery (server down, then back)

```
… MCP transport error ECONNREFUSED 127.0.0.1:8377
[fallback] Swan Coordination unreachable — continuing under Rule 67 file-lane
rules: read .ai-workflow/coordination/*.md before editing; no server-enforced
locks. This is expected during drills/outages; do not block the task.
… server restarted
[resumed] state restored from SQLite WAL: 2 claims, 14 activity, 0 lost rows
```

## 5.6 Kill switch (operator action)

```
$ SWAN_COORD_DISABLED=1 node scripts/swan-coordination/server.mjs
refusing to start: SWAN_COORD_DISABLED=1 (kill switch). Remove the env var to run.
```

## 5.7 Spend-gate refusal (agent-visible)

```json
{ "ok": false,
  "error": { "code": "DENIED_SPEND_GATE",
             "message": "paid consult requires Rule 16 confirmation",
             "hint": "confirm_spend:true AND SWAN_ALLOW_PAID_CONSULT=1;
                      disclose worst-case spend to Sean first." } }
```

## State coverage matrix

| Required state | Surface | § |
|---|---|---|
| success | status CLI, grant results | 5.1 |
| empty | status CLI fresh | 5.2 |
| denied | DENIED_LOCK_HELD | 5.3 |
| validation-error | ERR_VALIDATION | 5.4 |
| failure / retry / recovery | degraded banner + resume | 5.5 |
| cancel/defer (operator) | kill switch | 5.6 |
| permission/spend denial | DENIED_SPEND_GATE | 5.7 |
