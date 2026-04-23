# Hermes Sprint 1 — Code Diff Artifact (Gate B step 7)

> **Created:** 2026-04-23
> **Status:** DRAFT — pending Codex pre-Gemini review. DO NOT APPLY on Pi without Codex APPROVE.
> **Parent plan:** `HERMES-DAEMON-SPRINT-1-PATCH-2026-04-22.md` (committed `0a59fa287` + `295279aef`)
> **Target:** Pi-side nous-research/hermes-agent checkout at `~/.hermes/hermes-agent/` (user `<HERMES_PI_USER>`, host `<HERMES_PI_HOST>`)
> **Architecture:** Option P — no direct PTB CommandHandler. `/refresh` rides existing `filters.COMMAND` pipeline, dispatches in `GatewayRunner._handle_message`, inherits canonical auth via `_is_user_authorized`.
> **Scope:** `/refresh` command + PC-3 bridge-readiness worker. `/help` is NOT a Sprint 1 deliverable (already exists at run.py:4558; auto-surfaces `/refresh` via `gateway_help_lines()` from COMMAND_REGISTRY).

---

## 0. Files changed (4) — summary

| File | Kind | Net LoC |
|---|---|---|
| `hermes_cli/commands.py` | +1 CommandDef entry | +4 |
| `gateway/run.py` | +1 dispatch case, +1 handler method, +1 marker-read helper, +1 atomic-write staticmethod | ~+120 |
| `gateway/platforms/base.py` | +1 token (add `"refresh"` to bypass tuple) | ±0 (in-place) |
| `gateway/platforms/telegram.py` | +1 `__init__` field, +1 startup-hook block, +1 bridge-worker method, +1 disconnect cancel block | ~+80 |
| **Total** | — | **~+205** |

No deletions. No PTB `CommandHandler` registration. No changes to `telegram.py:645–662` MessageHandler block.

---

## 1. `hermes_cli/commands.py` — add `CommandDef("refresh", ...)`

### Anchor
Insert in the `COMMAND_REGISTRY` list, immediately after the existing `restart` entry. Pre-read evidence: v6 §6.1m, commands.py:151–152.

### Diff

```diff
--- a/hermes_cli/commands.py
+++ b/hermes_cli/commands.py
@@ -149,6 +149,10 @@ COMMAND_REGISTRY: list[CommandDef] = [
     CommandDef("help", "Show available commands", "Info"),
     CommandDef("restart", "Gracefully restart the gateway after draining active runs", "Session",
                gateway_only=True),
+    CommandDef("refresh",
+               "Purge Telegram session cache and restart the gateway",
+               "Info",
+               gateway_only=True),
     CommandDef("usage", "Show token usage and rate limits for the current session", "Info"),
     CommandDef("insights", "Show usage insights and analytics", "Info",
                args_hint="[days]"),
```

### Consequences (automatic — no further edits)
- `GATEWAY_KNOWN_COMMANDS` (commands.py:249) picks up `/refresh`.
- `gateway_help_lines()` (referenced by the existing `_handle_help_command` at run.py:4563) picks up `/refresh`. Sean's existing `/help` therefore surfaces `/refresh` with zero handler edit.
- `telegram_menu_commands(max_commands=100)` (commands.py:522, invoked at telegram.py:748) picks up `/refresh` on next service restart.
- `COMMANDS` / `COMMANDS_BY_CATEGORY` module-level dicts skip `gateway_only=True` entries (commands.py:207), matching the existing `restart` convention.

---

## 2. `gateway/run.py` — dispatch case + handler + helpers

### 2.1 Dispatch case

#### Anchor
v6 §6.1l dumped the flat `if canonical == X:` chain at run.py:3021–3137. Inserted between `if canonical == "voice":` at :3137 and `if self._draining:` at :3139.

#### Diff

```diff
--- a/gateway/run.py
+++ b/gateway/run.py
@@ -3135,6 +3135,9 @@ class GatewayRunner:
         if canonical == "voice":
             return await self._handle_voice_command(event)

+        if canonical == "refresh":
+            return await self._handle_refresh_command(event)
+
         if self._draining:
             return f"⏳ Gateway is {self._status_action_gerund()} and is not accepting new work right now."
```

Rationale:
- Placed BEFORE the `_draining` check so `/refresh` succeeds during drain — drain is exactly when you want the cache bust + restart.
- Placed BEFORE the user-defined `quick_commands` (:3142+) and plugin-registered slash commands (:3185+) so a user `/refresh` cannot shadow ours.
- Placed at the END of the canonical chain so line numbers for :3021–:3137 existing cases remain unchanged.

### 2.2 Static helper `_atomic_json_write`

#### Anchor
New private `@staticmethod` on `GatewayRunner`. Placed immediately before `_handle_refresh_command` for readability. Located in the `_handle_*_command` cluster (around run.py:4519 after `_handle_restart_command` and before `_handle_help_command` at :4558).

#### Code

```python
    @staticmethod
    def _atomic_json_write(path: Path, data: Any, mode: int = 0o600) -> None:
        """Tempfile + fsync + os.replace — matches SessionStore pattern at session.py:555-566.

        Used by /refresh (PC-2 session purge, PC-6 notify-recipient, PC-7 refresh marker).
        Crash-safe on Linux: os.replace is atomic same-filesystem rename.
        """
        tmp_fd, tmp_path = tempfile.mkstemp(
            prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent)
        )
        try:
            with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
                json.dump(data, f)
                f.flush()
                os.fsync(f.fileno())
            os.chmod(tmp_path, mode)
            os.replace(tmp_path, str(path))
        except Exception:
            try:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
            except OSError:
                pass
            raise
```

Needs `tempfile` and `Path` imports. `tempfile` is already in run.py:24. `Path` is imported at :28. `json` and `os` are already imported. No new top-level imports required.

### 2.3 New method `_handle_refresh_command`

#### Anchor
New async method on `GatewayRunner`. Placed immediately after `_atomic_json_write`, before `_handle_help_command` at run.py:4558.

#### Code

```python
    async def _handle_refresh_command(self, event: "MessageEvent") -> Optional[str]:
        """Handle /refresh — purge Telegram session cache + restart gateway (Telegram-only).

        Sprint 1 ops command. PC-1 (detached restart dispatch),
        PC-2 (atomic sessions.json purge, telegram-prefix keys only),
        PC-5 (auth already run by caller at :2722 via _is_user_authorized),
        PC-6 (notify-recipient write),
        PC-7 (refresh-marker write).

        Reply ordering (smoke #1 contract from patch doc §7):
        - Immediate pre-dispatch send of "⏳ Refresh initiated" via the adapter's
          own send() path. Returns None on success to prevent the bypass-path
          response-send at base.py:1589-1596 from producing a second message.
        - On failure paths, returns an error string that the bypass-path writes.
        - On boot post-restart, the §6.5 startup hook sends "✅ Refresh complete"
          via read_and_confirm_refresh_marker. Three distinct messages total in
          the happy path: "⏳" (pre-dispatch), then restart, then "✅" (post-boot).

        On restart-dispatch non-zero exit, atomically flips the marker to
        status="failed" so the post-restart startup hook NEVER sends a
        false "refresh complete" push.

        See HERMES-DAEMON-SPRINT-1-PATCH-2026-04-22.md §4.1 for the full
        fail-closed invariants and the single-policy marker lifecycle.
        """
        # Codex Gate B MEDIUM #3: Telegram platform guard.
        # /refresh bounces the shared gateway service; other platforms must not
        # be able to trigger it via a registry-exposure accident.
        if event.source.platform is None or event.source.platform.value != "telegram":
            return "⚠️ /refresh is not available on this platform (Telegram only)."

        # -------------------------------------------------------------------
        # PRE-DISPATCH SEND — satisfies smoke #1 contract (patch doc §7).
        # Must happen BEFORE purge/marker/systemd-run so the user sees the
        # acknowledgement immediately, even though the service is about to bounce.
        # Non-fatal: if this send fails (e.g. Telegram transient), we still
        # proceed — the boot confirmation push is the canonical success signal.
        # -------------------------------------------------------------------
        _adapter = self.adapters.get(event.source.platform)
        if _adapter is not None:
            try:
                await _adapter.send(
                    chat_id=event.source.chat_id,
                    content="⏳ Refresh initiated",
                    reply_to=event.message_id,
                )
            except Exception as e:
                logger.warning("/refresh: pre-dispatch send failed (non-fatal): %s", e)

        # Resolve runtime paths from HERMES_HOME override (or default ~/.hermes).
        hermes_home_str = os.environ.get("HERMES_HOME", "").strip()
        hermes_home = Path(hermes_home_str) if hermes_home_str else Path.home() / ".hermes"
        runtime_dir = hermes_home / "runtime"
        sessions_file = hermes_home / "sessions" / "sessions.json"

        # Ensure runtime dir exists at mode 0700 (PC-6/PC-7 prerequisite).
        try:
            runtime_dir.mkdir(mode=0o700, exist_ok=True)
            # If the dir pre-existed with wrong perms, re-tighten defensively.
            try:
                os.chmod(str(runtime_dir), 0o700)
            except OSError:
                pass
        except OSError as e:
            logger.error("/refresh: failed to create/tighten runtime dir: %s", e)
            return "❌ Runtime directory not writable — /refresh aborted."

        # Prefer integer chat_id on disk; fall back to the string form if parse fails.
        try:
            chat_id_disk: Any = int(event.source.chat_id)
        except (TypeError, ValueError):
            chat_id_disk = str(event.source.chat_id)
            logger.warning("/refresh: non-integer chat_id, storing string form")

        now_utc_iso = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

        # -------------------------------------------------------------------
        # PC-2: atomic sessions.json purge, telegram-prefix keys only.
        # SessionStore at gateway/session.py:498 uses the same atomic-write
        # pattern (tempfile + fsync + os.replace at :555-566), so last-write-
        # wins but no corruption. Imminent systemd restart bounds any racer.
        # -------------------------------------------------------------------
        purged_count = 0
        if sessions_file.exists():
            bak_path: Optional[Path] = None
            try:
                import shutil
                bak_path = sessions_file.with_name(
                    f"sessions.json.bak-{now_utc_iso.replace(':', '').replace('-', '')}"
                )
                shutil.copy2(str(sessions_file), str(bak_path))
            except OSError as e:
                logger.error("/refresh: sessions.json backup failed: %s", e)
                return "❌ Session backup failed — /refresh aborted. Gateway NOT restarted."

            try:
                with open(sessions_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except (OSError, json.JSONDecodeError) as e:
                logger.error("/refresh: sessions.json read/parse failed: %s", e)
                return (
                    f"❌ Session store unreadable ({type(e).__name__}). "
                    f"Gateway NOT restarted. Backup kept at {bak_path.name if bak_path else '?'}."
                )

            if not isinstance(data, dict):
                logger.error("/refresh: sessions.json top-level is not a dict (got %s)", type(data).__name__)
                return "❌ Session store format unexpected — /refresh aborted. Gateway NOT restarted."

            keep = {k: v for k, v in data.items() if not str(k).startswith("agent:main:telegram:dm:")}
            purged_count = len(data) - len(keep)

            try:
                self._atomic_json_write(sessions_file, keep, mode=0o600)
            except OSError as e:
                logger.error("/refresh: atomic sessions.json write failed: %s", e)
                return (
                    f"❌ Session purge write failed ({type(e).__name__}). "
                    f"Gateway NOT restarted. Backup at {bak_path.name if bak_path else '?'}."
                )

            logger.info(
                "/refresh: purged %d keys of shape=agent:main:telegram:dm:<digits:10>; backup=%s",
                purged_count, bak_path.name if bak_path else "?",
            )

        # -------------------------------------------------------------------
        # PC-6: learn/store notification recipient (atomic write, mode 0600).
        # Non-fatal: if this fails, /refresh still proceeds.
        # -------------------------------------------------------------------
        try:
            recipient_payload = {
                "chat_id_disk": chat_id_disk,
                "platform": "telegram",
                "learned_at": now_utc_iso,
            }
            self._atomic_json_write(runtime_dir / "notify-recipient.json", recipient_payload, mode=0o600)
            logger.info("/refresh: notify-recipient.json written (chat_id=<CHAT_ID>)")
        except OSError as e:
            logger.warning("/refresh: notify-recipient.json write failed (non-fatal): %s", e)

        # -------------------------------------------------------------------
        # PC-7: write refresh marker. Written AFTER purge so purge failure
        # never yields a confirmable marker.
        # -------------------------------------------------------------------
        marker_path = runtime_dir / "refresh-request.json"
        marker = {
            "request_id": str(uuid.uuid4()),
            "created_at": now_utc_iso,
            "chat_id": chat_id_disk,
            "initiator_shape": "agent:main:telegram:dm:<digits:10>",
            "status": "pending",
        }
        try:
            self._atomic_json_write(marker_path, marker, mode=0o600)
        except OSError as e:
            logger.error("/refresh: refresh-request marker write failed: %s", e)
            return "❌ Marker write failed — Gateway NOT restarted. Session purge already applied."

        # -------------------------------------------------------------------
        # PC-1: detached restart via systemd-run. Dispatches + returns in ~1s
        # so systemd bounces the service while this handler's reply is in-flight.
        #
        # Smoke test hook (patch doc §7 #5 Codex-preferred path):
        # HERMES_REFRESH_FORCE_RESTART_FAIL=1 short-circuits to rc=1 without
        # actually dispatching, so restart-failure paths can be exercised
        # without touching /usr/bin/systemd-run or sudoers. Env check happens
        # AFTER auth + platform guard, so it cannot be triggered without owner
        # authorization.
        # -------------------------------------------------------------------
        _force_fail = os.environ.get("HERMES_REFRESH_FORCE_RESTART_FAIL", "").strip() == "1"
        if _force_fail:
            logger.info(
                "/refresh: HERMES_REFRESH_FORCE_RESTART_FAIL=1 set — forcing rc=1 "
                "(test hook; systemd-run NOT dispatched)"
            )
            rc = 1
        else:
            try:
                rc = subprocess.run(
                    [
                        "sudo", "-n", "systemd-run",
                        "--unit=hermes-refresh",
                        "--on-active=1s",
                        "systemctl", "restart", "hermes-gateway.service",
                    ],
                    timeout=5,
                    check=False,
                    capture_output=True,
                    text=True,
                ).returncode
            except (subprocess.TimeoutExpired, OSError) as e:
                logger.error("/refresh: systemd-run dispatch exception: %s", e)
                rc = 1

        if rc != 0:
            # PC-1 step 6b (single policy): atomically flip marker to
            # status="failed" so the boot hook NEVER sends a false
            # "refresh complete" push if someone manually restarts later.
            marker["status"] = "failed"
            marker_cleared = False
            try:
                self._atomic_json_write(marker_path, marker, mode=0o600)
                marker_cleared = True
                logger.error(
                    "/refresh: restart dispatch rc=%d — marker flipped to failed",
                    rc,
                )
            except OSError as e:
                # Atomic write of status=failed failed. A status=pending marker
                # may still be on disk and a manual restart within 5 minutes
                # would trigger a false "✅ Refresh complete" push. Fallback:
                # delete the marker outright so the boot hook no-ops on absent.
                logger.error(
                    "/refresh: flip marker to failed failed (%s) — attempting delete",
                    e,
                )
                try:
                    marker_path.unlink()
                    marker_cleared = True
                    logger.error("/refresh: marker deleted after failed flip")
                except FileNotFoundError:
                    marker_cleared = True
                except OSError as e2:
                    logger.error(
                        "/refresh: marker delete also failed: %s — MANUAL INTERVENTION REQUIRED",
                        e2,
                    )

            if not marker_cleared:
                # Hard-fail path: both flip AND delete failed. A subsequent
                # manual restart WILL fire a false confirmation push. Tell
                # Sean explicitly to remove the file before restarting.
                return (
                    "⚠️ Restart command failed AND the refresh marker could not "
                    f"be cleared at {marker_path}. "
                    "DO NOT manually restart hermes-gateway.service until you "
                    "`rm` that file — otherwise a false '✅ Refresh complete' "
                    "push will fire at boot. Session purge already applied."
                )

            return (
                "⚠️ Restart command failed — see journalctl. "
                "Session purge already applied."
            )

        # Success path: pre-dispatch "⏳ Refresh initiated" already sent. Return
        # None so the bypass path at base.py:1589-1596 does not produce a
        # second user-visible message. The "✅ Refresh complete" push comes
        # from the §6.5 startup hook after the service bounces.
        logger.info(
            "/refresh success: purged %d telegram-dm keys, systemd-run dispatched",
            purged_count,
        )
        return None
```

Imports needed at top of run.py (already present; verified in v6 §6.1o except `uuid`):
- `import uuid` — **NEW import needed**. Add alongside `import tempfile` at line :24.
- `subprocess` — already imported.
- `json`, `os`, `tempfile` — already imported.
- `Path` from `pathlib` — already imported (:28).
- `datetime` from `datetime` — already imported (:29).
- `Any`, `Optional` — already imported (:30).
- `logger` — defined in module.

### 2.4 New public method `read_and_confirm_refresh_marker`

#### Anchor
New async method on `GatewayRunner`. Called by `telegram.py`'s startup hook (§6.5 inline, see §4 below). Placed immediately after `_handle_refresh_command` for cohesion.

#### Code

```python
    async def read_and_confirm_refresh_marker(self, send_callback) -> None:
        """Read ~/.hermes/runtime/refresh-request.json and handle per §4.1 invariants.

        Called by platform adapters during their startup hook (§6.5 Option B inline).
        `send_callback(chat_id, text) -> awaitable` is supplied by the adapter —
        only the adapter owns its bot/client. GatewayRunner owns marker semantics;
        adapter owns I/O.

        Policy (single source of truth, mirrored in patch-doc §4.1):
        - absent              -> no-op (cold boot, nothing to confirm).
        - status=failed       -> log "never confirming", delete, no push.
        - status=confirmed    -> log "already confirmed", delete, no re-send
                                 (from a prior boot where send succeeded but
                                  the final unlink failed).
        - status=confirming   -> log "uncertain prior attempt", delete, no push
                                 (a prior boot entered the two-phase send but
                                  did not reach a terminal flip; outcome is
                                  indeterminate so policy prefers silent
                                  no-send over a possible duplicate "✅").
        - stale >5m           -> log "stale, discarded", delete, no push.
        - status=pending AND fresh -> enter two-phase send:
            1. flip to status=confirming (atomic write) — if this write fails,
               abort WITHOUT sending (best-effort delete) to preserve at-most-
               once semantics.
            2. send confirmation callback.
            3. on send success: flip to status=confirmed (best effort), then
               unlink (best effort). Any remaining on-disk state is one of
               {confirming, confirmed} which future boots treat as no-send.
            4. on send failure: single log, flip to status=failed (best effort),
               then unlink (best effort). No retry.

        At-most-once-or-no-send guarantee (conditional):
          - Holds when EITHER the pre-send status=confirming write succeeds,
            OR the pending marker is successfully deleted in the pre-send
            failure fallback.
          - Does NOT hold if BOTH the pre-send confirming-write AND the
            fallback unlink fail. In that narrow case the code logs
            `CRITICAL` with a MANUAL INTERVENTION REQUIRED instruction,
            and a future unrelated boot MAY fire a duplicate "✅ Refresh
            complete" unless the pending marker is removed by hand.
          - Any crash/write-failure AFTER the pre-send flip to confirming
            is handled — the marker remains in {confirming, confirmed,
            failed}, all of which are no-send branches.
        Parse failure or truly unknown status -> defensive delete + no push.
        """
        hermes_home_str = os.environ.get("HERMES_HOME", "").strip()
        hermes_home = Path(hermes_home_str) if hermes_home_str else Path.home() / ".hermes"
        marker_path = hermes_home / "runtime" / "refresh-request.json"

        if not marker_path.exists():
            return

        def _delete_marker_quietly() -> None:
            try:
                marker_path.unlink()
            except OSError:
                pass

        try:
            with open(marker_path, "r", encoding="utf-8") as f:
                marker = json.load(f)
        except (OSError, json.JSONDecodeError) as e:
            logger.warning("refresh marker read/parse failed: %s — deleting", e)
            _delete_marker_quietly()
            return

        if not isinstance(marker, dict):
            logger.warning("refresh marker malformed (not a dict) — deleting")
            _delete_marker_quietly()
            return

        status = marker.get("status", "pending")
        created_at = marker.get("created_at")
        chat_id = marker.get("chat_id")

        if status == "failed":
            logger.info("refresh marker was failed, never confirming — deleting")
            _delete_marker_quietly()
            return

        if status == "confirmed":
            # Send already succeeded on a prior boot; this file is stale-post-send
            # because the unlink in that run's finally-branch failed. Delete now
            # so we don't re-send on the next boot either.
            logger.info("refresh marker already confirmed — deleting, no re-send")
            _delete_marker_quietly()
            return

        if status == "confirming":
            # A prior boot entered the two-phase send path but did not reach the
            # confirmed/failed flip (crash, kill, or write failure mid-flow).
            # Outcome of that send attempt is UNCERTAIN — do not re-send.
            # Policy prefers silent no-send over a possible duplicate "✅"
            # (confirmation is an informational ops signal, not a transaction).
            logger.info(
                "refresh marker in uncertain 'confirming' state from prior attempt — "
                "deleting, no re-send (outcome was indeterminate)"
            )
            _delete_marker_quietly()
            return

        # Stale >5m check
        if isinstance(created_at, str):
            try:
                created_dt = datetime.fromisoformat(created_at.rstrip("Z"))
                if datetime.utcnow() - created_dt > timedelta(minutes=5):
                    logger.info("refresh marker stale (>5m) — deleting, no push")
                    _delete_marker_quietly()
                    return
            except ValueError:
                logger.warning("refresh marker has unparseable created_at — deleting")
                _delete_marker_quietly()
                return
        else:
            logger.warning("refresh marker missing created_at — deleting")
            _delete_marker_quietly()
            return

        if status != "pending":
            logger.warning("refresh marker unknown status=%r — deleting", status)
            _delete_marker_quietly()
            return

        if chat_id is None:
            logger.warning("refresh marker missing chat_id — deleting")
            _delete_marker_quietly()
            return

        # Two-phase marker (at-most-once-or-no-send confirmation, round 4 fix 1+2):
        # set status="confirming" BEFORE send_callback so that any failure between
        # here and the terminal flip leaves a non-pending marker on disk — which
        # the boot hook treats as no-send. Policy prefers silent no-send over a
        # duplicate "✅ Refresh complete" push.
        marker["status"] = "confirming"
        try:
            self._atomic_json_write(marker_path, marker, mode=0o600)
        except OSError as e:
            # Pre-send flip failed. Cannot safely send — if send succeeded and
            # we crashed afterwards, the still-pending marker would re-send on
            # the next boot. Try to delete the pending marker instead.
            logger.warning(
                "refresh marker pre-send status=confirming write failed: %s — aborting send, attempting delete",
                e,
            )
            deleted = False
            try:
                marker_path.unlink()
                deleted = True
            except FileNotFoundError:
                deleted = True
            except OSError as e2:
                # Round 5 fix 1 (HIGH): both confirming-write AND unlink failed.
                # The original status=pending marker remains on disk; a future
                # unrelated service restart WILL fire a false "✅ Refresh
                # complete" push via the pending branch. This is manual-
                # intervention territory — the at-most-once guarantee no longer
                # holds in this branch.
                logger.critical(
                    "refresh marker pre-send confirming-write AND unlink both failed: "
                    "write_err=%r unlink_err=%r path=%s — MANUAL INTERVENTION REQUIRED: "
                    "delete %s before next service restart or a false '✅ Refresh complete' "
                    "push will fire on the next boot (at-most-once guarantee broken in this branch)",
                    e, e2, marker_path, marker_path,
                )
                # Cannot notify the user because send_callback never fired and
                # the recipient may not even exist yet. Log is the only channel.
            if deleted:
                logger.info(
                    "refresh marker pre-send flip failed but pending marker deleted — safe, no re-send"
                )
            return

        try:
            await send_callback(chat_id, "✅ Refresh complete")
        except Exception as e:
            # Send failed. Flip to status="failed" so the boot hook's failed-
            # branch cleans up. Delete best-effort afterward.
            logger.warning("refresh marker send failed: %s — flipping to failed, no retry", e)
            marker["status"] = "failed"
            try:
                self._atomic_json_write(marker_path, marker, mode=0o600)
            except OSError as e2:
                # Flip-to-failed also failed. Marker is now confirming on disk,
                # which the boot hook treats as no-send (per policy). Acceptable.
                logger.warning(
                    "refresh marker flip-to-failed post-send-fail also failed: %s "
                    "(confirming state on disk is still safe — boot hook will not re-send)",
                    e2,
                )
            _delete_marker_quietly()
            return

        # Send succeeded. Flip to confirmed and delete best-effort. Any failure
        # below leaves status=confirming or confirmed on disk — both are handled
        # as no-send by the boot hook, so duplicate confirmation is impossible.
        marker["status"] = "confirmed"
        try:
            self._atomic_json_write(marker_path, marker, mode=0o600)
        except OSError as e:
            logger.warning(
                "refresh marker status=confirmed write failed: %s "
                "(status=confirming on disk is still safe — boot hook will not re-send)",
                e,
            )
        logger.info("refresh marker confirmation sent to <CHAT_ID>")
        _delete_marker_quietly()
```

Imports needed: `timedelta` from `datetime` — add to the existing `from datetime import datetime` at run.py:29 → `from datetime import datetime, timedelta`.

---

## 3. `gateway/platforms/base.py` — add `"refresh"` to bypass tuple

### Anchor
v5 §6.1j: base.py:1582 active-session bypass set inside `PlatformAdapter.handle_message`. Adding `"refresh"` lets the command run even when the LLM session is hung — which is exactly when operators need it.

### Diff

```diff
--- a/gateway/platforms/base.py
+++ b/gateway/platforms/base.py
@@ -1579,7 +1579,7 @@ class PlatformAdapter:
             # session lifecycle and its cleanup races with the running task
             # (see PR #4926).
             cmd = event.get_command()
-            if cmd in ("approve", "deny", "status", "stop", "new", "reset", "background", "restart", "queue", "q"):
+            if cmd in ("approve", "deny", "status", "stop", "new", "reset", "background", "restart", "queue", "q", "refresh"):
                 logger.debug(
                     "[%s] Command '/%s' bypassing active-session guard for %s",
                     self.name, cmd, session_key,
```

Nothing else in base.py changes. The bypass path at :1589 calls `self._message_handler(event)` which is `GatewayRunner._handle_message` (per run.py:1874) — `_is_user_authorized` still runs first at :2722.

---

## 4. `gateway/platforms/telegram.py` — PC-3 worker + §6.5 startup hook + §6.6 cancel

### 4.1 `__init__` field

#### Anchor
v2 §3c + v4 §6.1e evidence shows `__init__` at `telegram.py:140`. Add `self._bridge_worker_task: Optional[asyncio.Task] = None` alongside the other `Optional[asyncio.Task]` fields.

#### Diff

```diff
--- a/gateway/platforms/telegram.py
+++ b/gateway/platforms/telegram.py
@@ -161,6 +161,8 @@ class TelegramAdapter(PlatformAdapter):
         self._polling_error_task: Optional[asyncio.Task] = None
         self._polling_conflict_count: int = 0
         self._polling_network_error_count: int = 0
+        # Sprint 1: PC-3 bridge-readiness polling worker task handle
+        self._bridge_worker_task: Optional[asyncio.Task] = None
         self._polling_error_callback_ref = None
         # DM Topics: map of topic_name -> message_thread_id (populated at startup)
         self._dm_topics: Dict[str, int] = {}
```

### 4.2 §6.5 inline startup hook (post `_mark_connected()`)

#### Anchor
v2 §19 + v5 §6.1j evidence shows `self._mark_connected()` at telegram.py:769 followed by `logger.info(...Connected...)` at :771, then the DM-topics try-block at :776. Insert between :771 and :773.

#### Diff

```diff
--- a/gateway/platforms/telegram.py
+++ b/gateway/platforms/telegram.py
@@ -769,6 +769,42 @@ class TelegramAdapter(PlatformAdapter):
             self._mark_connected()
             mode = "webhook" if self._webhook_mode else "polling"
             logger.info("[%s] Connected to Telegram (%s mode)", self.name, mode)

+            # -----------------------------------------------------------------
+            # Sprint 1 §6.5 inline startup hook (Option B — PTB post_init does
+            # NOT fire for this adapter's manual initialize/start sequence;
+            # confirmed via telegram/ext/_application.py:479 docstring).
+            # Two actions: (1) boot-refresh-confirmation read+push,
+            # (2) bridge-readiness worker creation.
+            # -----------------------------------------------------------------
+
+            # 1. Boot-refresh-confirmation: runner owns marker semantics
+            #    (two-phase: pending -> confirming -> {confirmed | failed}),
+            #    adapter owns Telegram I/O via the send_callback closure.
+            #    The callback MUST NOT swallow send failures — the runner's
+            #    read_and_confirm_refresh_marker distinguishes the two-phase
+            #    outcomes (status=confirmed on success, status=failed on send
+            #    exception) and its log lines must accurately reflect which
+            #    terminal state was reached. Exceptions propagate up; the
+            #    runner's send-failure branch logs "send failed: %s — flipping
+            #    to failed, no retry" and cleans up via best-effort flip + unlink.
+            try:
+                async def _refresh_send_callback(chat_id, text):
+                    if self._bot is None:
+                        raise RuntimeError("_bot unavailable during boot-confirm send")
+                    # Let send_message exceptions propagate — runner's two-phase
+                    # flow catches them, flips status to "failed", and deletes
+                    # the marker best-effort (no retry).
+                    await self._bot.send_message(chat_id=chat_id, text=text)
+
+                _runner = getattr(self._message_handler, "__self__", None) if self._message_handler else None
+                if _runner is not None and hasattr(_runner, "read_and_confirm_refresh_marker"):
+                    await _runner.read_and_confirm_refresh_marker(_refresh_send_callback)
+            except Exception as e:
+                logger.warning(
+                    "[%s] refresh-marker boot-confirmation hook failed: %s",
+                    self.name, e, exc_info=True,
+                )
+
+            # 2. Bridge-readiness polling worker (PC-3).
+            #    Guard against double-start if the adapter's connect path runs
+            #    twice without a clean disconnect in between (e.g. network
+            #    reconnect flow or reconnect watcher re-invoking start).
+            if self._bridge_worker_task is None or self._bridge_worker_task.done():
+                self._bridge_worker_task = asyncio.create_task(
+                    self._run_bridge_worker(),
+                    name=f"{self.name}:bridge-readiness",
+                )
+            else:
+                logger.info(
+                    "[%s] bridge-readiness worker already running — skipping re-create",
+                    self.name,
+                )
+
             # Set up DM topics (Bot API 9.4 — Private Chat Topics)
             # Runs after connection is established so the bot can call createForumTopic.
             # Failures here are non-fatal — the bot works fine without topics.
```

Rationale:
- Step 1 MUST complete before step 2 because if the marker says "refresh complete," step 2's first state transition alert could race the confirmation push.
- Both are inside the connected branch so `self._bot` is guaranteed usable.
- `_runner` is obtained via `__self__` on the bound `_message_handler` — set at `gateway/run.py:1874` by `adapter.set_message_handler(self._handle_message)`.

### 4.3 New method `_run_bridge_worker`

#### Anchor
New async method on `TelegramAdapter`. Placed alongside `_handle_polling_network_error` / `_handle_polling_conflict` around `telegram.py:256+` for lifecycle-method cohesion.

#### Code

```python
    async def _run_bridge_worker(self) -> None:
        """PC-3 bridge-readiness polling worker.

        Every 30s: Tailscale health + explicit SSH + tmux probes (4-step chain
        per §6.7 Answer). State transitions trigger a Telegram push to the
        notify-recipient, with rate limit, flap collapse, and Q4 quiet-hours gate.
        """
        # Local imports to keep the adapter module top-level imports unchanged.
        import json as _json
        import subprocess as _sub
        from datetime import datetime as _dt, time as _time
        from pathlib import Path as _Path
        import os as _os

        POLL_INTERVAL = 30.0
        QUIET_HOURS_START = _time(0, 0)   # 00:00 local
        QUIET_HOURS_END = _time(6, 0)     # 06:00 local
        RATE_LIMIT_SECONDS = 60.0
        FLAP_WINDOW_SECONDS = 60.0
        FLAP_THRESHOLD = 3

        hermes_home_str = _os.environ.get("HERMES_HOME", "").strip()
        hermes_home = _Path(hermes_home_str) if hermes_home_str else _Path.home() / ".hermes"
        recipient_path = hermes_home / "runtime" / "notify-recipient.json"

        last_state = "unknown"
        transition_history: list[float] = []  # timestamps
        last_alert_ts: Dict[tuple, float] = {}  # (old, new) -> epoch
        flap_suppression_until: float = 0.0
        wake_digest: list[dict] = []

        def _quiet_now() -> bool:
            now = _dt.now().time()
            if QUIET_HOURS_START <= QUIET_HOURS_END:
                return QUIET_HOURS_START <= now < QUIET_HOURS_END
            return now >= QUIET_HOURS_START or now < QUIET_HOURS_END

        def _load_recipient() -> Optional[Any]:
            try:
                if not recipient_path.exists():
                    return None
                with open(recipient_path, "r", encoding="utf-8") as f:
                    p = _json.load(f)
                return p.get("chat_id_disk") if isinstance(p, dict) else None
            except (OSError, _json.JSONDecodeError):
                return None

        async def _push(chat_id, text: str) -> None:
            if self._bot is None or chat_id is None:
                return
            try:
                await self._bot.send_message(chat_id=chat_id, text=text)
            except Exception as e:
                logger.warning(
                    "[%s] bridge-worker push failed: %s",
                    self.name, e,
                )

        def _probe_state() -> str:
            # Step 1: Tailscale
            try:
                r = _sub.run(
                    ["tailscale", "status", "--json"],
                    capture_output=True, text=True, timeout=10,
                )
                if r.returncode == 0 and r.stdout.strip():
                    d = _json.loads(r.stdout)
                    if d.get("BackendState") != "Running":
                        return "pi-tailscale-down"
                    if not (d.get("Self") or {}).get("Online"):
                        return "pi-tailscale-down"
                    peers = d.get("Peer", {}) or {}
                    windows_online = False
                    for p in peers.values():
                        os_val = (p.get("OS") or "").lower()
                        hn = (p.get("HostName") or "").lower()
                        is_windows = os_val == "windows" or "win" in hn or "desktop" in hn or "pc" in hn
                        if is_windows and p.get("Online"):
                            windows_online = True
                            break
                    if not windows_online:
                        return "desktop-peer-unreachable"
                else:
                    return "pi-tailscale-down"
            except (FileNotFoundError, _sub.TimeoutExpired, OSError, _json.JSONDecodeError) as e:
                logger.debug("[%s] bridge-worker tailscale probe failed: %s", self.name, e)
                return "pi-tailscale-down"

            # Step 2: explicit bare-SSH probe
            try:
                from tools.remote_ai_bridge_tool import _run_ssh  # type: ignore
                rc_ssh, _, _ = _run_ssh("true", timeout=10)
                if rc_ssh != 0:
                    return "ssh-bridge-unreachable"
            except Exception as e:
                logger.debug("[%s] bridge-worker ssh-true probe failed: %s", self.name, e)
                return "ssh-bridge-unreachable"

            # Step 3: explicit tmux-layer probe
            try:
                from tools.remote_ai_bridge_tool import _run_ssh, _wsl_tmux  # type: ignore
                rc_tmux, out_tmux, _ = _run_ssh(_wsl_tmux("ls"), timeout=10)
                if rc_tmux != 0:
                    return "tmux-missing"
            except Exception as e:
                logger.debug("[%s] bridge-worker tmux-ls probe failed: %s", self.name, e)
                return "tmux-missing"

            # Step 4: _action_status() session-presence check
            try:
                from tools.remote_ai_bridge_tool import _action_status  # type: ignore
                result = _action_status()
                if isinstance(result, dict) and "error" in result:
                    return "tmux-missing"
                if not isinstance(result, dict):
                    return "tmux-missing"
                if result.get("claude_alive") and result.get("codex_alive"):
                    return "healthy"
                return "tmux-missing"
            except Exception as e:
                logger.debug("[%s] bridge-worker action_status failed: %s", self.name, e)
                return "tmux-missing"

        def _format_transition(old: str, new: str) -> str:
            # Neutral internal-tool copy (per Gate A Codex REJECT of Gemini
            # Crystalline-Swan branding — context-bleed for an internal surface).
            if new == "healthy":
                return f"✅ Bridge online (was `{old}`)."
            if old == "healthy":
                return f"⚠️ Bridge offline (`{new}`)."
            return f"⚠️ Bridge state `{old}` → `{new}`."

        import time as _time_mod

        try:
            while True:
                try:
                    # Probe uses blocking subprocess.run + _run_ssh + _action_status;
                    # offload to a worker thread so it never blocks the asyncio
                    # event loop (which is shared with all Telegram I/O).
                    current = await asyncio.to_thread(_probe_state)
                except Exception as e:
                    logger.warning(
                        "[%s] bridge-worker probe unexpected exception: %s",
                        self.name, e, exc_info=True,
                    )
                    current = "pi-tailscale-down"

                now_epoch = _time_mod.time()
                if last_state != "unknown" and current != last_state:
                    # record transition for flap tracking
                    transition_history.append(now_epoch)
                    transition_history[:] = [
                        t for t in transition_history if now_epoch - t <= FLAP_WINDOW_SECONDS
                    ]

                    if now_epoch < flap_suppression_until:
                        logger.debug("[%s] bridge-worker transition suppressed (flap)", self.name)
                    elif len(transition_history) > FLAP_THRESHOLD:
                        _n_trans = len(transition_history)
                        if _quiet_now():
                            # Quiet hours — queue/coalesce a flap summary for the
                            # wake-time digest per Sprint 1 Q4 policy (no push now).
                            # Repeated flap windows during a single quiet period
                            # would otherwise append unbounded flap entries. Keep
                            # at most ONE flap entry: update the existing one with
                            # the latest timestamp + a running total count.
                            _existing_flap = next(
                                (item for item in wake_digest if item.get("new") == "flapping"),
                                None,
                            )
                            if _existing_flap is None:
                                wake_digest.append({
                                    "old": "multiple",
                                    "new": "flapping",
                                    "at": _dt.utcnow().isoformat() + "Z",
                                    "note": f"{_n_trans} transitions in last 60s",
                                    "windows": 1,
                                    "total_transitions": _n_trans,
                                })
                            else:
                                _existing_flap["at"] = _dt.utcnow().isoformat() + "Z"
                                _existing_flap["windows"] = _existing_flap.get("windows", 1) + 1
                                _existing_flap["total_transitions"] = (
                                    _existing_flap.get("total_transitions", 0) + _n_trans
                                )
                                _existing_flap["note"] = (
                                    f"{_existing_flap['windows']} flap windows, "
                                    f"{_existing_flap['total_transitions']} total transitions"
                                )
                            logger.debug(
                                "[%s] bridge flapping queued/coalesced for wake digest "
                                "(%d transitions this window)",
                                self.name, _n_trans,
                            )
                        else:
                            chat_id = _load_recipient()
                            if chat_id is not None:
                                await _push(
                                    chat_id,
                                    f"⚡ Bridge flapping — {_n_trans} transitions in 60s, alerts suppressed for 60s.",
                                )
                        flap_suppression_until = now_epoch + FLAP_WINDOW_SECONDS
                    else:
                        key = (last_state, current)
                        if now_epoch - last_alert_ts.get(key, 0.0) >= RATE_LIMIT_SECONDS:
                            if _quiet_now():
                                if current == "healthy" or last_state == "healthy":
                                    wake_digest.append({
                                        "old": last_state,
                                        "new": current,
                                        "at": _dt.utcnow().isoformat() + "Z",
                                    })
                                    logger.debug(
                                        "[%s] bridge transition queued for wake digest: %s -> %s",
                                        self.name, last_state, current,
                                    )
                                # else: drop entirely per §4.3 Sprint-1 policy
                            else:
                                chat_id = _load_recipient()
                                if chat_id is not None:
                                    await _push(chat_id, _format_transition(last_state, current))
                                    last_alert_ts[key] = now_epoch
                                else:
                                    logger.debug(
                                        "[%s] bridge transition %s->%s no recipient — logged only",
                                        self.name, last_state, current,
                                    )

                last_state = current

                # Deliver wake-time digest at first poll after 06:00 if any queued
                # (simple check: if not quiet and digest is non-empty, flush)
                if wake_digest and not _quiet_now():
                    chat_id = _load_recipient()
                    if chat_id is not None:
                        lines = ["📋 Overnight bridge transitions:"]
                        for item in wake_digest:
                            line = f"  {item['at']}: {item['old']} → {item['new']}"
                            note = item.get("note")
                            if note:
                                line += f" ({note})"
                            lines.append(line)
                        await _push(chat_id, "\n".join(lines))
                    wake_digest.clear()

                await asyncio.sleep(POLL_INTERVAL)
        except asyncio.CancelledError:
            logger.info("[%s] bridge-worker cancelled", self.name)
            raise
```

### 4.4 §6.6 disconnect cancellation

#### Anchor
v3 §6.6b dumped `disconnect()` at telegram.py:793–824. Insert cancel BETWEEN `self._media_group_events.clear()` at :801 and `if self._app:` at :803 — before the `_app` shutdown so the worker's in-flight `send_message` doesn't race `app.shutdown()`.

#### Diff

```diff
--- a/gateway/platforms/telegram.py
+++ b/gateway/platforms/telegram.py
@@ -798,6 +798,17 @@ class TelegramAdapter(PlatformAdapter):
         self._media_group_tasks.clear()
         self._media_group_events.clear()

+        # Sprint 1: cancel PC-3 bridge-readiness worker BEFORE shutting down
+        # _app so the worker's in-flight send_message does not race
+        # app.shutdown() and raise RuntimeError("Application is no longer
+        # running"). Mirrors the cancel-then-gather pattern at :795-799.
+        if self._bridge_worker_task is not None and not self._bridge_worker_task.done():
+            self._bridge_worker_task.cancel()
+            try:
+                await asyncio.wait_for(self._bridge_worker_task, timeout=2.0)
+            except (asyncio.CancelledError, asyncio.TimeoutError):
+                pass
+        self._bridge_worker_task = None
+
         if self._app:
             try:
                 # Only stop the updater if it's running
```

---

## 5. Application order (Pi-side, ONLY after Codex APPROVE on this artifact)

All four file edits go in the SAME commit on the Pi-side `~/.hermes/hermes-agent` checkout. Order of file edits does NOT matter (all are independent sites); order of the full apply is:

1. `cd ~/.hermes/hermes-agent && git status` — confirm clean working tree (no upstream drift since pre-reads)
2. Apply 4-file diff
3. `python -m py_compile gateway/run.py gateway/platforms/base.py gateway/platforms/telegram.py hermes_cli/commands.py` — syntax sanity
4. `git diff --stat` — confirm ~205 line net addition, 4 files
5. `sudo systemctl restart hermes-gateway.service` — first post-apply restart (NO `/refresh` involved yet)
6. `systemctl status hermes-gateway.service` — confirm active/running + no crash in journal
7. Run the 8 smoke tests from patch doc §7 in order
8. On all-green smoke: closeout commit per patch doc §9

Do NOT commit the Pi-side edits before smoke passes.

---

## 6. Pre-apply verifications to re-run on Pi before edit (rule 30 subagent skepticism)

Line numbers in the diffs above are based on v2–v6 pre-read receipts. Before applying, verify each anchor still holds by grepping for the context line on the Pi:

```bash
cd ~/.hermes/hermes-agent

# 1. hermes_cli/commands.py — restart entry still at :151-152
grep -n 'CommandDef("restart"' hermes_cli/commands.py

# 2. gateway/run.py — voice dispatch still at ~:3137 and _draining still at ~:3139
grep -n 'canonical == "voice"' gateway/run.py
grep -n 'if self._draining' gateway/run.py

# 3. gateway/platforms/base.py — bypass tuple still at ~:1582
grep -n '"approve", "deny", "status", "stop", "new", "reset"' gateway/platforms/base.py

# 4. gateway/platforms/telegram.py — _mark_connected still at ~:769
grep -n 'self._mark_connected()' gateway/platforms/telegram.py
# 4b. telegram.py — disconnect's self._media_group_events.clear() still at ~:801
grep -n 'self._media_group_events.clear()' gateway/platforms/telegram.py
```

All six greps must return exactly one hit each at line numbers within ±5 of the pre-read values. If any anchor drifted significantly, pause and reconcile.

---

## 7. What this artifact does NOT do

- Does NOT push to the Pi.
- Does NOT apply the diff.
- Does NOT invoke Gemini.
- Does NOT commit to the SwanStudios repo (this markdown doc CAN be committed as a trace, but the code itself stays uncommitted until Codex APPROVE + apply).
- Does NOT modify the patch plan doc (`HERMES-DAEMON-SPRINT-1-PATCH-2026-04-22.md`) — that remains the source of truth for WHY; this doc is the source of truth for HOW.

---

## 8. Review chain (rule 46, for this artifact)

1. ✅ Claude writes this artifact.
2. ⏳ Codex pre-Gemini review against CLAUDE.md rules 17/26/28/29/31/44 + patch-doc §4/§5/§6 invariants.
3. ⏳ Codex REVISE/APPROVE ruling.
4. If APPROVE: optional Gemini review of the code diff (Sean decides).
5. If APPROVE (with or without Gemini): commit this artifact to the SwanStudios repo for history, THEN apply on Pi per §5 order + smoke + closeout.

No Pi writes until step 3 APPROVE.
