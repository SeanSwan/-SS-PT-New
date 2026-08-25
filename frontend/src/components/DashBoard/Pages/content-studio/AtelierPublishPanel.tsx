/**
 * AtelierPublishPanel.tsx — the last rung: declare, publish, copy the permalink.
 *
 * Split from AtelierCompose when it crossed the 300-line cap. The declaration lives here
 * because it is the panel's own state: nothing in the pipeline can confirm consent or
 * intended use, so the operator does, and the server welds it onto the asset with who
 * and when. Publish stays dead until the box is ticked.
 */

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { nextPublishStep } from './AtelierCompose.words';
import type { useAtelierCompose } from './AtelierCompose.api';
import {
  Card, CardTitle, CardHint, PrimaryButton, QuietButton, Field, Caption, Notice,
  Select, Readout, FieldGroup, FieldLabel,
} from './AtelierCompose.styles';

type Compose = ReturnType<typeof useAtelierCompose>;

const AtelierPublishPanel: React.FC<{ c: Compose }> = ({ c }) => {
  const [copied, setCopied] = useState<'url' | 'snippet' | null>(null);
  const [consent, setConsent] = useState(false);
  const [intendedUse, setIntendedUse] = useState<'commercial' | 'personal'>('commercial');
  if (!c.reference) return null;
  const published = c.reference.status === 'published';
  const step = nextPublishStep(c.reference.status);

  const copy = async (what: 'url' | 'snippet', text: string | null) => {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1800); } catch { /* clipboard denied — the text is visible to select */ }
  };

  return (
            <Card $accent={published ? 'ice' : 'gold'} aria-label="Publish">
              <CardTitle>Publish · {c.reference.status}</CardTitle>
              <CardHint>{published
                ? 'Published. The link and snippet below are what a site consumes; the attribution travels with them.'
                : c.reference.status === 'approved' ? 'Approved. Publish to get a link a site can use.' : 'Draft. Approve it first — nothing goes on a site unlooked-at.'}</CardHint>
              {c.reference.blockers.length > 0 && (
                <Notice $tone="unproven" role="status">Publishing is blocked: {c.reference.blockers.map((b) => b.split(':')[0]).join(', ')}</Notice>
              )}
              {c.reference.status === 'approved' && (
                <FieldGroup>
                  <FieldLabel id="publish-decl-label">Before publishing, you declare</FieldLabel>
                  <Field style={{ marginBottom: 8 }}>Intended use
                    <Select value={intendedUse} onChange={(e) => setIntendedUse(e.target.value as 'commercial' | 'personal')}>
                      <option value="commercial">commercial — on a site that sells something</option>
                      <option value="personal">personal — not for commerce</option>
                    </Select>
                  </Field>
                  <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minHeight: 44, cursor: 'pointer' }}>
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: 22, height: 22, marginTop: 2 }} />
                    <span>I confirm this asset depicts no identifiable real person without their consent, and that I hold the rights to publish it for the use above. This is recorded on the asset with my user id and the time.</span>
                  </label>
                </FieldGroup>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {step && (
                  <PrimaryButton type="button"
                    disabled={step!.to === 'published' && (c.reference.blockers.length > 0 || !consent)}
                    onClick={() => c.setStatus(c.reference!.id, step!.to,
                      step!.to === 'published' ? { consentConfirmed: consent, intendedUse } : undefined)}>
                    {step!.label}
                  </PrimaryButton>
                )}
                {published && (
                  <QuietButton type="button" onClick={() => c.setStatus(c.reference!.id, 'approved')}>Unpublish</QuietButton>
                )}
                {published && (
                  <>
                    <QuietButton type="button" onClick={() => copy('url', c.reference!.permalink ?? null)} aria-label="Copy permalink">
                      {copied === 'url' ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} Copy link
                    </QuietButton>
                    <QuietButton type="button" onClick={() => copy('snippet', c.reference!.snippet)} aria-label="Copy embed snippet">
                      {copied === 'snippet' ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} Copy snippet
                    </QuietButton>
                  </>
                )}
              </div>
              {published && c.reference.permalink && (
                <Readout style={{ display: 'block', marginTop: 10, wordBreak: 'break-all' }}>{c.reference.permalink}</Readout>
              )}
              {published && (
                <Caption>The link above is permanent while published and stops resolving the moment you unpublish. The signed preview URL below it expires in hours and must not go on a site.</Caption>
              )}
              {c.reference.attribution && (
                <Caption>{c.reference.attributionRequired ? 'Required attribution: ' : 'Attribution: '}{c.reference.attribution}</Caption>
              )}
              <Caption>Object key <code>{c.reference.r2Key}</code> · content-addressed by sha256.</Caption>
            </Card>
  );
};

export default AtelierPublishPanel;
