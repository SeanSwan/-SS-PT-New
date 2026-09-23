/** Static documentation renderer. All values synthetic; no application imports or network. */
const rows = [
  ['Jun 15',1],['Jun 22',2],['Jun 29',1],['Jul 6',2],['Jul 13',2],['Jul 20',2],
  ['Jul 27',3],['Aug 3',3],['Aug 10',3],['Aug 17',3],['Aug 24',3],['Aug 31',2],
];
const svg = document.getElementById('rhythm');
function render() {
  const mobile = window.innerWidth < 768;
  const width = mobile ? 340 : 800;
  const height = 275;
  const left = mobile ? 27 : 40;
  const right = width - 12;
  const bottom = 226;
  const top = 26;
  const step = (right-left)/12;
  const bw = step * (mobile ? 0.58 : 0.62);
  const ticks = mobile ? [0,5,11] : [0,3,6,9,11];
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  let markup = '<defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="var(--data)" stroke-width="2"/></pattern></defs>';
  for (let v=0;v<=4;v++) {
    const y=bottom-v*(bottom-top)/4;
    markup += `<path class="plot-grid" d="M${left} ${y}H${right}"/><text class="axis-label" x="${left-10}" y="${y+4}" text-anchor="end">${v}</text>`;
  }
  rows.forEach(([label,value],i)=>{
    const x=left+i*step+(step-bw)/2;
    const y=bottom-value*(bottom-top)/4;
    if(i===10) markup += `<rect class="selection-column" x="${x-5}" y="${top-4}" width="${bw+10}" height="${bottom-top+8}" rx="5"/>`;
    markup += `<rect class="${i===11?'bar-current':i<7?'bar-muted':'bar'}" x="${x}" y="${y}" width="${bw}" height="${bottom-y}" rx="3"/>`;
    if(i===10) markup += `<text class="selection-label" x="${x+bw/2}" y="${y-12}" text-anchor="middle">3</text>`;
    if(ticks.includes(i)) markup += `<text class="axis-label" x="${x+bw/2}" y="253" text-anchor="${i===0?'start':i===11?'end':'middle'}">${label}${i===11?'*':''}</text>`;
  });
  svg.innerHTML=markup; // only literals above, never user/source content
}
render();
window.addEventListener('resize',render);
