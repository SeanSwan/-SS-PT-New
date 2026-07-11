import React from 'react';
import styled from 'styled-components';
import { ArrowUpRight, Plus, Sparkles } from 'lucide-react';
import { ConceptProps, PrototypeNote, workoutRows } from './conceptShared';

const Studio=styled.div`min-height:calc(100vh - 96px);padding:clamp(20px,4vw,64px);background:var(--bento-cream,#f7f1e8);color:var(--bento-ink,#16131b);font-family:'Plus Jakarta Sans',sans-serif;`;
const Header=styled.header`display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;h2{font-size:clamp(34px,5vw,72px);margin:0;letter-spacing:-.06em}`;
const Bento=styled.div`display:grid;grid-template-columns:1.1fr .8fr 1.1fr;grid-template-rows:auto auto;gap:14px;max-width:1500px;margin:auto;@media(max-width:900px){grid-template-columns:1fr}`;
const tileTones = { lime: 'var(--bento-lime, #d8ff56)', pink: 'var(--bento-pink, #ff8bc8)', white: 'var(--bento-white, #ffffff)', navy: 'var(--bento-navy, #17213b)' } as const;
const Tile=styled.section<{ $tone:keyof typeof tileTones }>`min-height:220px;padding:24px;border-radius:30px;background:${({$tone})=>tileTones[$tone]};color:${({$tone})=>$tone==='navy'?'var(--bento-white,#ffffff)':'var(--bento-ink,#16131b)'};display:flex;flex-direction:column;justify-content:space-between;h3{font-size:clamp(26px,3vw,46px);line-height:.95;margin:0}p{margin:8px 0}`;
const Big=styled(Tile)`grid-column:span 2;min-height:360px;@media(max-width:900px){grid-column:auto}`;
const Score=styled.strong`font-size:clamp(92px,11vw,170px);line-height:.7;letter-spacing:-.09em;`;
const Row=styled.div`display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid color-mix(in srgb,var(--bento-ink,#16131b) 16%,transparent);`;
const Create=styled.button`min-height:56px;border:0;border-radius:999px;background:var(--bento-ink,#16131b);color:var(--bento-white,#ffffff);font-weight:800;cursor:pointer;&:focus-visible{outline:3px solid var(--wing-purple,#8b5cf6);outline-offset:3px}`;
export const BentoMotion:React.FC<ConceptProps>=({onAction})=><Studio aria-label="Bento Motion workout interface"><Header><div><small>WORKOUT CREATOR / CONCEPT 09</small><h2>Build with rhythm.</h2></div><PrototypeNote/></Header><Bento><Tile $tone="lime"><span><Sparkles/> client energy</span><Score>82</Score><p>Ready for controlled strength.</p></Tile><Tile $tone="pink"><span>Coach note</span><h3>Protect the knee.<br/>Keep the intent.</h3><ArrowUpRight/></Tile><Big $tone="white"><span>Today’s stack</span><div>{workoutRows.map(row=><Row key={row.name}><span><strong>{row.name}</strong><br/><small>{row.meta}</small></span><b>{row.dose}</b></Row>)}</div><Create onClick={()=>onAction('Bento opened the movement block library')}><Plus size={18}/> Add a movement block</Create></Big><Tile $tone="navy"><span>Plan horizon</span><h3>Week 3<br/>Strength endurance</h3><p>1 missing day queued for review.</p></Tile></Bento></Studio>;
