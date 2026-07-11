import React from 'react';
import styled from 'styled-components';
import { ArrowUpRight, CheckCircle, Plus } from 'lucide-react';
import { ConceptProps, PrototypeNote, clientSignals, workoutRows } from './conceptShared';

const Canvas = styled.div`
  min-height: calc(100vh - 96px); padding: clamp(28px, 5vw, 88px); background: var(--alpine-paper, #f3f5f7); color: var(--alpine-ink, #101114);
  font-family: 'Plus Jakarta Sans', sans-serif;
`;
const Top = styled.div`display:flex;justify-content:space-between;align-items:center;gap:24px;p{margin:0;color:var(--alpine-muted,#5b616a)}@media(max-width:650px){align-items:flex-start;flex-direction:column}`;
const Hero = styled.div`
  display:grid;grid-template-columns:minmax(0,1.2fr) minmax(260px,.8fr);gap:clamp(32px,6vw,110px);align-items:center;max-width:1500px;margin:clamp(46px,8vh,120px) auto;
  h2{margin:0;font-size:clamp(52px,8vw,132px);line-height:.84;letter-spacing:-.075em;font-weight:650} @media(max-width:800px){grid-template-columns:1fr}
`;
const Ring = styled.div`
  aspect-ratio:1;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--alpine-blue,#2563eb) 0 82%,var(--alpine-track,#d9dee5) 82%);position:relative;
  &:after{content:'';position:absolute;inset:14px;border-radius:50%;background:var(--alpine-paper,#f3f5f7)} div{z-index:1;text-align:center}strong{display:block;font-size:clamp(54px,6vw,88px);letter-spacing:-.06em}
`;
const Dock = styled.div`display:grid;grid-template-columns:minmax(200px,.7fr) minmax(0,1.7fr) auto;gap:12px;align-items:center;padding:16px;border-radius:24px;background:var(--alpine-white,#ffffff);box-shadow:0 24px 70px color-mix(in srgb,var(--alpine-ink,#101114) 12%,transparent);@media(max-width:880px){grid-template-columns:1fr}`;
const Signal = styled.div`display:flex;gap:8px;flex-wrap:wrap;span{padding:8px 12px;border-radius:999px;background:var(--alpine-paper,#f3f5f7);font-size:12px}`;
const Add = styled.button`min-height:52px;padding:0 22px;border:0;border-radius:16px;background:var(--alpine-ink,#101114);color:var(--alpine-white,#ffffff);font-weight:750;cursor:pointer;&:focus-visible{outline:3px solid var(--alpine-blue,#2563eb);outline-offset:3px}`;
export const AlpinePrecision: React.FC<ConceptProps> = ({ onAction }) => <Canvas aria-label="Alpine Precision workout interface"><Top><strong>SWAN / SESSION 042</strong><PrototypeNote/></Top><Hero><div><p>Demo Client · coached today</p><h2>Move with precision.</h2><p>Three exercises shaped by readiness, pain, and the active plan.</p></div><Ring><div><strong>82</strong><span>ready</span></div></Ring></Hero><Dock><Signal>{clientSignals.map(signal=><span key={signal}>{signal}</span>)}</Signal><div>{workoutRows.map(row=><p key={row.name}><CheckCircle size={15}/> <strong>{row.name}</strong> · {row.dose}</p>)}</div><Add onClick={()=>onAction('Alpine opened the clean Rolodex sheet')}><Plus size={18}/> Add movement <ArrowUpRight size={16}/></Add></Dock></Canvas>;
