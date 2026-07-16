/**
 * VideoOptimizerPanel
 * ===================
 * Content Studio tab: drop a master clip, pick a quality preset, and produce a
 * web-optimized .mp4 backup copy entirely in the browser (ffmpeg.wasm).
 *
 * - Masters are NEVER modified — output is a brand-new downloadable Blob.
 * - Explicit quality presets (Sean: "no fuzzy video, I want quality control").
 * - Shows before→after size, % saved, and ≈ R2 $/mo saved so the cost/quality
 *   tradeoff is visible. Pairs with the storage meter (same R2 cost model).
 *
 * The transcode itself lives in videoCompressor.ts (mocked in tests). All maths
 * live in videoCompression.logic.ts. This file owns only UI state.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { UploadCloud, Film, Download, RotateCcw, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  PRESETS, DEFAULT_PRESET_ID, getPreset, estimateOutputBytes, savingsSummary,
  validateInputFile, type PresetId,
} from './videoCompression.logic';
import { formatBytes } from './storageMeter.logic';
import { compressVideo, isLikelySupported, type CompressResult } from './videoCompressor';
import * as S from './VideoOptimizerPanel.styles';
import { StyledBox } from '@/components/ui/StyledBox';

type PanelState = 'idle' | 'selected' | 'compressing' | 'done' | 'error';

const VideoOptimizerPanel: React.FC = () => {
  const supported = isLikelySupported();
  const [file, setFile] = useState<File | null>(null);
  const [presetId, setPresetId] = useState<PresetId>(DEFAULT_PRESET_ID);
  const [state, setState] = useState<PanelState>('idle');
  const [progress, setProgress] = useState(0);
  const [warn, setWarn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompressResult | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const aliveRef = useRef(true);

  const revokeResult = useCallback(() => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => { aliveRef.current = false; revokeResult(); }, [revokeResult]);

  const acceptFile = useCallback((f: File | undefined | null) => {
    if (!f) return;
    const check = validateInputFile(f);
    if (!check.ok) { setError(check.error); setFile(null); setState('error'); return; }
    revokeResult();
    setError(null);
    setWarn(check.warn);
    setResult(null);
    setResultUrl(null);
    setProgress(0);
    setFile(f);
    setState('selected');
  }, [revokeResult]);

  const handleCompress = useCallback(async () => {
    if (!file) return;
    setState('compressing');
    setProgress(0);
    setError(null);
    try {
      const res = await compressVideo(file, presetId, {
        onProgress: (r) => { if (aliveRef.current) setProgress(r); },
      });
      if (!aliveRef.current) return;
      const url = URL.createObjectURL(res.blob);
      resultUrlRef.current = url;
      setResult(res);
      setResultUrl(url);
      setState('done');
    } catch (e: unknown) {
      if (!aliveRef.current) return;
      setError(e instanceof Error ? e.message : 'Compression failed. Try a smaller clip or a different preset.');
      setState('error');
    }
  }, [file, presetId]);

  const reset = useCallback(() => {
    revokeResult();
    setFile(null); setResult(null); setResultUrl(null);
    setProgress(0); setWarn(null); setError(null);
    setState('idle');
    if (inputRef.current) inputRef.current.value = '';
  }, [revokeResult]);

  if (!supported) {
    return (
      <S.Wrap>
        <S.Notice role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          This browser can&apos;t run the in-browser optimizer (no WebAssembly). Try a current Chrome, Edge, or Firefox.
        </S.Notice>
      </S.Wrap>
    );
  }

  const busy = state === 'compressing';
  const preset = getPreset(presetId);

  return (
    <S.Wrap>
      <S.Intro>
        <S.IntroIcon><Film size={18} aria-hidden="true" /></S.IntroIcon>
        <div>
          <S.Title>Video Optimizer</S.Title>
          <S.Sub>Shrink a master clip into a web-ready backup copy — right here, no upload to a third party.</S.Sub>
        </div>
      </S.Intro>

      <S.SafeNote><ShieldCheck size={14} aria-hidden="true" /> Your original file is never changed — this creates a new optimized copy you download.</S.SafeNote>

      <S.Dropzone
        as="label"
        $active={!!file}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => { e.preventDefault(); if (!busy) acceptFile(e.dataTransfer?.files?.[0]); }}
      >
        <UploadCloud size={22} aria-hidden="true" />
        {file
          ? <S.FileName>{file.name} <S.Muted>({formatBytes(file.size)})</S.Muted></S.FileName>
          : <S.DropHint>Drop a video here, or click to choose (mp4, mov, webm…)</S.DropHint>}
        <S.HiddenInput
          ref={inputRef}
          type="file"
          accept="video/*"
          aria-label="Choose a video to optimize"
          disabled={busy}
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />
      </S.Dropzone>

      {warn && <S.WarnLine role="status"><AlertTriangle size={13} aria-hidden="true" /> {warn}</S.WarnLine>}

      <S.PresetGroup role="radiogroup" aria-label="Quality preset">
        {PRESETS.map((p) => (
          <S.PresetButton
            key={p.id}
            type="button"
            role="radio"
            aria-checked={presetId === p.id}
            $active={presetId === p.id}
            disabled={busy}
            onClick={() => setPresetId(p.id)}
          >
            <S.PresetLabel>{p.label}{p.id === DEFAULT_PRESET_ID && <S.Rec> · recommended</S.Rec>}</S.PresetLabel>
            <S.PresetBlurb>{p.blurb}</S.PresetBlurb>
          </S.PresetButton>
        ))}
      </S.PresetGroup>

      {file && state !== 'done' && (
        <S.Estimate>
          Estimated output ≈ <strong>{formatBytes(estimateOutputBytes(file.size, preset))}</strong> <S.Muted>(rough — actual size depends on the clip)</S.Muted>
        </S.Estimate>
      )}

      {state !== 'done' && (
        <S.PrimaryButton type="button" onClick={handleCompress} disabled={!file || busy}>
          {busy ? `Optimizing… ${Math.round(progress * 100)}%` : 'Optimize for web'}
        </S.PrimaryButton>
      )}

      {busy && (
        <S.ProgressTrack aria-hidden="true"><StyledBox as={S.ProgressFill} $style={{ width: `${Math.round(progress * 100)}%` }} /></S.ProgressTrack>
      )}

      {state === 'error' && error && <S.ErrorLine role="alert"><AlertTriangle size={14} aria-hidden="true" /> {error}</S.ErrorLine>}

      {state === 'done' && result && resultUrl && file && (
        <S.Result>
          <S.ResultSummary role="status">{savingsSummary(file.size, result.outputBytes)}</S.ResultSummary>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- exercise demo preview, no spoken content */}
          <S.Preview src={resultUrl} controls playsInline preload="metadata" />
          <S.ResultActions>
            <S.DownloadLink href={resultUrl} download={result.outputName}>
              <Download size={16} aria-hidden="true" /> Download optimized copy
            </S.DownloadLink>
            <S.GhostButton type="button" onClick={reset}>
              <RotateCcw size={15} aria-hidden="true" /> Optimize another
            </S.GhostButton>
          </S.ResultActions>
          <S.Muted>Next: keep this web copy ready for the upcoming R2 backup upload workflow.</S.Muted>
        </S.Result>
      )}
    </S.Wrap>
  );
};

export default VideoOptimizerPanel;
