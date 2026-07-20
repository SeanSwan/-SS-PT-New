/**
 * Launch Control — admin board (Phase 0). Flip any surface flag from inside the app, no Render, no redeploy.
 * Each toggle writes a force override (affects everyone); "Default" clears it back to the env baseline.
 * Health chip surfaces fail-closed events; a live surface erroring shows a red chip and locks the toggle
 * (open with the ⚠ confirm to override). Verify purges the Cloudflare edge so a flip shows immediately.
 *
 * P0 scope. Deferred (P1/P2, per the blueprint): preview-as (needs an admin-wins client-precedence change),
 * per-role/%/schedule rollout drawer, one-click retirement.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  clearOverride,
  getBoard,
  killAll,
  setFlag,
  verify,
  type FlagRow,
} from './launchControlApi';
import {
  Actions,
  Btn,
  Chip,
  Dot,
  Group,
  GroupTitle,
  Header,
  Page,
  ResetBtn,
  Row,
  RowMain,
  RowMeta,
  RowName,
  State,
  StateTag,
  Strip,
  Sub,
  Title,
  TitleWrap,
  Toggle,
} from './LaunchControl.styles';

const GROUP_LABELS: Record<string, string> = {
  redesign: 'Redesign surfaces',
  feature: 'Feature flags',
  experiment: 'Experiments',
};
const GROUP_ORDER = ['redesign', 'feature', 'experiment'];

export default function LaunchControlPage() {
  const [rows, setRows] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [strip, setStrip] = useState('Flips are instant on the server; hard-refresh (or Verify) to beat the CDN cache.');

  const load = useCallback(async () => {
    try {
      setRows(await getBoard());
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = useCallback(
    async (row: FlagRow) => {
      const next = !row.resolved;
      setBusy(row.flag);
      try {
        const res = await setFlag(row.flag, next);
        if (res.unhealthy) {
          const ok = window.confirm(
            `"${row.flag}" has ${res.fail24h} fail-closed error(s) in 24h. Turn it ON anyway?`,
          );
          if (ok) await setFlag(row.flag, next, true);
          else return;
        }
        await load();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  const reset = useCallback(
    async (flag: string) => {
      setBusy(flag);
      try {
        await clearOverride(flag);
        await load();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  const doKillAll = useCallback(async () => {
    if (!window.confirm('Force ALL redesign surfaces OFF (revert to the old pages)?')) return;
    setBusy('__kill__');
    try {
      const n = await killAll();
      setStrip(`Killed ${n} redesign flags → old pages. Verify to propagate.`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, [load]);

  const doVerify = useCallback(async () => {
    setBusy('__verify__');
    try {
      const v = await verify();
      setStrip(v.purged ? `Edge cache purged ✓ (${v.purgedAt?.slice(11, 19)} UTC)` : `Verify: ${v.reason} — ${v.hint || 'hard-refresh in ~30s'}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, []);

  // Known groups in intended order, then any unknown grp (so a future flag can never silently vanish).
  const known = GROUP_ORDER.map((g) => ({ g, items: rows.filter((r) => r.grp === g) }));
  const extra = [...new Set(rows.map((r) => r.grp))]
    .filter((g) => !GROUP_ORDER.includes(g))
    .map((g) => ({ g, items: rows.filter((r) => r.grp === g) }));
  const groups = [...known, ...extra].filter((x) => x.items.length);

  return (
    <Page>
      <Header>
        <TitleWrap>
          <Title>◆ Launch Control</Title>
          <Sub>Flip redesigned surfaces on/off — instant, no redeploy.</Sub>
        </TitleWrap>
        <Actions>
          <Btn type="button" onClick={doVerify} disabled={busy === '__verify__'}>
            {busy === '__verify__' ? 'Verifying…' : '↻ Verify live'}
          </Btn>
          <Btn type="button" $danger onClick={doKillAll} disabled={busy === '__kill__'}>
            ⚠ Kill all redesigns
          </Btn>
        </Actions>
      </Header>

      {error && <State role="alert">{error} — <Btn type="button" onClick={() => void load()}>Retry</Btn></State>}
      {loading && <State>Loading flags…</State>}

      {!loading &&
        groups.map(({ g, items }) => (
          <Group key={g}>
            <GroupTitle>
              {GROUP_LABELS[g] || g} · {items.length}
            </GroupTitle>
            {items.map((r) => (
              <Row key={r.flag} $child={Boolean(r.parent_flag)}>
                <Dot $live={r.resolved} aria-hidden="true" />
                <RowMain>
                  <RowName>{r.label}</RowName>
                  <RowMeta>
                    <code>{r.flag}</code> · <StateTag $live={r.resolved}>{r.resolved ? 'LIVE' : 'DARK'}</StateTag>
                    {r.hasOverride ? ' · override' : ' · env default'}
                    {r.updated_by ? ` · by ${r.updated_by}` : ''}
                  </RowMeta>
                </RowMain>
                {r.fail24h > 0 ? (
                  <Chip $tone="warn">✖ {r.fail24h} err/24h</Chip>
                ) : (
                  <Chip $tone="muted">❤ healthy</Chip>
                )}
                {r.hasOverride && (
                  <ResetBtn type="button" onClick={() => void reset(r.flag)} disabled={busy === r.flag}>
                    Default
                  </ResetBtn>
                )}
                <Toggle
                  type="button"
                  role="switch"
                  aria-checked={r.resolved}
                  aria-label={`${r.label} ${r.resolved ? 'on' : 'off'}`}
                  $on={r.resolved}
                  disabled={busy === r.flag}
                  onClick={() => void toggle(r)}
                />
              </Row>
            ))}
          </Group>
        ))}

      {!loading && <Strip>{strip}</Strip>}
    </Page>
  );
}
