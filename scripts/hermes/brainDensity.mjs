/**
 * brainDensity.mjs - V2 digest analytics rendered as deterministic graph layers.
 * Pure builders only: no wall-clock reads, network, random state, or writes.
 */
import { readReceipts } from './hermesRunsLib.mjs';

const CX=640,CY=350;
const esc=(s)=>String(s).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const priorDate=(day,n)=>new Date(Date.parse(`${day}T12:00:00Z`)-n*86400000).toISOString().slice(0,10);

export function buildHealthHistory(vaultRoot,isoDate){
  return Array.from({length:30},(_,i)=>{
    const date=priorDate(isoDate,29-i); const receipts=readReceipts(vaultRoot,date);
    let state='no-data';
    if(receipts.length){
      const outcomes=receipts.map((r)=>String(r.outcome||''));
      state=receipts.some((r)=>r.__unparseable)||outcomes.some((x)=>/^failed/.test(x))?'red':outcomes.some((x)=>/^(partial|refused)/.test(x))?'amber':'green';
    }
    return {date,state,count:receipts.length};
  });
}

const tierRings=(counts)=>['T0','T1','T2','T3','T4'].map((tier,i)=>{
  const n=counts?.[tier]||0; const rx=68+i*26,ry=48+i*26; const width=(1+Math.log2(1+n)).toFixed(2);
  const dash=tier==='T4'&&n===0?' stroke-dasharray="5 7"':''; const pulse=tier==='T4'&&n>0?' hot':'';
  const x=(CX+rx*.707).toFixed(1),y=(CY-ry*.707).toFixed(1);
  return `<ellipse class="tier-ring${pulse}" data-tier="${tier}" cx="${CX}" cy="${CY}" rx="${rx}" ry="${ry}" fill="none" stroke="var(--c-${tier==='T4'?'fault':'app'})" stroke-width="${width}"${dash}/><text class="tier-label" x="${x}" y="${y}" font-size="17">${tier} ${n}</text>`;
}).join('');

const refusalThorns=(clusters=[],floodHit=[])=>clusters.map(([who,n],i)=>{
  const a=(i/Math.max(1,clusters.length))*Math.PI*2-Math.PI/2; const x=CX+Math.cos(a)*50,y=CY+Math.sin(a)*50; const tipX=CX+Math.cos(a)*(64+Math.min(6,n)),tipY=CY+Math.sin(a)*(64+Math.min(6,n));
  return `<path class="refusal-thorn${floodHit.length?' flood':''}" d="M ${x-4} ${y-4} L ${tipX} ${tipY} L ${x+4} ${y+4} Z"><title>${esc(who)}: ${n} refusals</title></path>`;
}).join('');

const integrityCrack=(d)=>{
  const n=(d.unparseable?.length||0)+(d.tierless?.length||0)+(d.chainBroken?.length||0);
  return n?`<path class="integrity-crack" d="M 630 318 l 11 14 -8 10 15 13 -10 15 12 14" fill="none" stroke="var(--c-fault)" stroke-width="3"><title>${n} integrity issue(s)</title></path>`:'';
};

const countdowns=(entries=[],when)=>entries.map((e,i)=>{
  const remain=Math.max(0,Date.parse(e.expiresAt||e.expires||when)-Date.parse(when)); const ratio=Math.min(1,remain/86400000); const circ=175.93; const color=remain<1800000?'var(--c-fault)':remain<7200000?'var(--c-routine)':'var(--c-app)'; const a=(i/Math.max(1,entries.length))*Math.PI*2; const x=CX+Math.cos(a)*350,y=CY+Math.sin(a)*245;
  return `<circle class="approval-countdown" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="28" fill="none" stroke="${color}" stroke-width="5" stroke-dasharray="${(circ*ratio).toFixed(1)} ${circ.toFixed(1)}"><title>${esc(e.action||e.command||e.id)} - ${Math.round(remain/60000)}m remaining</title></circle>`;
}).join('');

const actors=(rows=[])=>rows.slice(0,6).map(([who,count],i)=>{
  const a=(i/Math.max(1,Math.min(6,rows.length)))*Math.PI*2; const r=10+2*Math.log2(1+count),x=CX+Math.cos(a)*188,y=CY+Math.sin(a)*132;
  const right=x>=CX; return `<circle class="actor-satellite" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="var(--c-memory)" opacity=".72"><title>${esc(who)} ${count}</title></circle><text class="actor-label" x="${(x+(right?r+6:-r-6)).toFixed(1)}" y="${(y+5).toFixed(1)}" text-anchor="${right?'start':'end'}" font-size="17">${esc(who)} ${count}</text>`;
}).join('');

const productSatellite=(p)=>p?`<circle class="product-satellite ${p.state}" cx="1020" cy="600" r="18" fill="var(--bg-card)" stroke="var(--c-${p.state==='red'?'fault':p.state==='amber'?'routine':'app'})" stroke-width="3"><title>SwanStudios product health: ${esc(p.outcome)}</title></circle><text class="product-label" x="1044" y="605" font-size="17">SwanStudios ${esc(p.state)}</text>`:'';

export function renderDensitySvg(d){
  return `${tierRings(d.counts)}${refusalThorns(d.clusters,d.floodHit)}${integrityCrack(d)}${countdowns(d.queueEntries,d.when)}${actors(d.actorRows)}${productSatellite(d.productHealth)}`;
}
