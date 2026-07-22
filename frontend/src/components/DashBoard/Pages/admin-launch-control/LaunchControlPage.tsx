/**
 * Launch Control: admin-only operations board for approved feature switches.
 * Each toggle writes a force override; Default clears it back to the feature's environment baseline.
 * Health is advisory. Verify purges the public response cache; it does not change server enforcement.
 */
import { useCallback, useEffect, useState } from 'react';
import { PREVIEW_OK_KEY } from '../../../../config/previewFlags';
import {
  clearOverride,
  getBoard,
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
  feature: 'Feature flags',
  experiment: 'Experiments',
};
const GROUP_ORDER = ['feature', 'experiment'];

export default function LaunchControlPage() {
  const [rows, setRows] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [strip, setStrip] = useState('Audited overrides update the public flag response. Verify feature-specific server enforcement before relying on a toggle.');

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

  // Mark this admin browser so an explicitly requested approved-feature preview can resolve locally.
  useEffect(() => {
    try {
      localStorage.setItem(PREVIEW_OK_KEY, '1');
    } catch {
      /* Private mode: browser-only feature preview remains unavailable. */
    }
  }, []);

  const toggle = useCallback(
    async (row: FlagRow) => {
      setBusy(row.flag);
      try {
        await setFlag(row.flag, !row.resolved);
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
          <Sub>Manage the three approved feature controls and audited overrides.</Sub>
        </TitleWrap>
        <Actions>
          <Btn type="button" onClick={doVerify} disabled={busy === '__verify__'}>
            {busy === '__verify__' ? 'Verifying…' : '↻ Verify live'}
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
                ) : r.resolved ? (
                  <Chip $tone="ok">❤ healthy</Chip>
                ) : (
                  <Chip $tone="muted">— no signal</Chip>
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
