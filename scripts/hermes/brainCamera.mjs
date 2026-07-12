/**
 * brainCamera.mjs — Slice 2 (v2 plan): the interactivity layer, inlined into the
 * one generated file as VIEW-ONLY client JS. Zoom / pan / pinch / semantic-zoom /
 * focus-drill / keyboard nav / aria-live. Uses the graphGeometry.mjs contract
 * (Slice 0, proven): the camera is ONE converted transform applied to BOTH the
 * SVG `<g class="camera">` (user units) AND the `.label-layer` container (px),
 * so labels stay glued to nodes at every zoom (transform-origin 0 0 on both).
 *
 * SECURITY (v2 B1/B2): ZERO network (no fetch/XHR/WebSocket/sendBeacon), ZERO
 * action surface (nothing approves/flips/executes — view manipulation only). All
 * data-derived DOM is built with textContent/createElement, NEVER innerHTML.
 * The embedded snapshot is escaped with escapeForEmbed (breakout-proof).
 * reduced-motion: the rAF fly-to is gated at init (matchMedia); focus is instant.
 *
 * The client JS is authored as string concatenation (no nested template literals
 * / no inner backticks) so it embeds cleanly and stays greppable for the audit.
 */
import { VB_W, VB_H, svgCameraTransform, labelCameraTransform, svgScreenPos, labelScreenPos } from './graphGeometry.mjs';

/** Pure: the two transform strings the client applies. Tested for screen-pos
 *  parity against graphGeometry so the client can't silently drift the layers. */
export function computeTransforms(tx, ty, s, renderedWidth) {
  return { svg: svgCameraTransform(tx, ty, s), label: labelCameraTransform(tx, ty, s, renderedWidth) };
}

/** Node (x,y) screen px via each layer — re-exported so the parity test lives with the camera. */
export const nodeScreen = { svg: svgScreenPos, label: labelScreenPos };

/** The inlined, view-only client script. `nodesJson` is an already-escaped
 *  (escapeForEmbed) array of {id,x,y}. No network, no innerHTML, no eval. */
export function cameraClientJs(nodesJson) {
  return `(function(){
  "use strict";
  var VB_W=${VB_W},VB_H=${VB_H};
  var reduce=matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pane=document.querySelector('.graph-stage');
  var g=document.querySelector('svg.brain .camera');
  var layer=document.querySelector('.label-layer');
  var live=document.getElementById('ann');
  if(!pane||!g||!layer){return;}
  var NODES=${nodesJson};
  var cam={tx:0,ty:0,s:1},HOME={tx:0,ty:0,s:1};
  var MINS=0.5,MAXS=4;
  function ppu(){return pane.clientWidth/VB_W;}
  function clamp(v,a,b){return v<a?a:v>b?b:v;}
  function apply(){
    var p=ppu();
    g.setAttribute('transform','translate('+cam.tx+' '+cam.ty+') scale('+cam.s+')');
    layer.style.transformOrigin='0 0';
    layer.style.transform='translate('+(cam.tx*p)+'px,'+(cam.ty*p)+'px) scale('+cam.s+')';
    var z=cam.s<=0.75?'galaxy':(cam.s<1.4?'cluster':(cam.s<2.4?'macro':'detail'));
    document.documentElement.setAttribute('data-zoom',z);
  }
  function say(t){if(live){live.textContent=t;}}
  // zoom toward a client point (keeps the world point under the cursor fixed)
  function zoomAt(cx,cy,factor){
    var p=ppu(),rect=pane.getBoundingClientRect();
    var lx=(cx-rect.left)/p,ly=(cy-rect.top)/p;
    var s2=clamp(cam.s*factor,MINS,MAXS);
    var wx=(lx-cam.tx)/cam.s,wy=(ly-cam.ty)/cam.s;
    cam.tx=lx-wx*s2;cam.ty=ly-wy*s2;cam.s=s2;apply();
  }
  function tween(to){
    if(reduce){cam.tx=to.tx;cam.ty=to.ty;cam.s=to.s;apply();return;}
    var f={tx:cam.tx,ty:cam.ty,s:cam.s},t0=null;
    function step(ts){
      if(t0===null){t0=ts;}
      var k=Math.min(1,(ts-t0)/560),e=1-Math.pow(1-k,3);
      cam.tx=f.tx+(to.tx-f.tx)*e;cam.ty=f.ty+(to.ty-f.ty)*e;cam.s=f.s+(to.s-f.s)*e;apply();
      if(k<1){requestAnimationFrame(step);}
    }
    requestAnimationFrame(step);
  }
  function focusNode(id){
    var n=null;for(var i=0;i<NODES.length;i++){if(NODES[i].id===id){n=NODES[i];break;}}
    if(!n){return;}
    document.documentElement.setAttribute('data-focus',id);
    var s2=2.4,p=1; // center node n at scale s2 (translate in user units)
    tween({tx:VB_W/2-n.x*s2,ty:VB_H/2-n.y*s2,s:s2});void p;
    say('Focused '+id);
  }
  function reset(){document.documentElement.removeAttribute('data-focus');tween(HOME);say('View reset');}
  // wheel zoom
  pane.addEventListener('wheel',function(e){e.preventDefault();zoomAt(e.clientX,e.clientY,e.deltaY<0?1.12:1/1.12);},{passive:false});
  // drag pan (a drag that ENDS on a node must not also fire focus — track movement)
  var drag=null,moved=false;
  pane.addEventListener('pointerdown',function(e){if(e.target.closest('[data-node]')){return;}moved=false;drag={x:e.clientX,y:e.clientY,tx:cam.tx,ty:cam.ty};pane.setPointerCapture(e.pointerId);});
  pane.addEventListener('pointermove',function(e){if(!drag){return;}var p=ppu(),dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(Math.abs(dx)>4||Math.abs(dy)>4){moved=true;}
    cam.tx=drag.tx+dx/p;cam.ty=drag.ty+dy/p;apply();});
  pane.addEventListener('pointerup',function(){drag=null;});
  // click/keyboard focus on a node (suppressed right after a pan)
  pane.addEventListener('click',function(e){if(moved){moved=false;return;}var el=e.target.closest('[data-node]');if(el){focusNode(el.getAttribute('data-node'));}});
  pane.addEventListener('keydown',function(e){var el=e.target.closest&&e.target.closest('[data-node]');if(el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();focusNode(el.getAttribute('data-node'));}});
  // global keys
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){reset();}
    else if(e.key==='0'){reset();}
    else if(e.key==='+'||e.key==='='){zoomAt(pane.getBoundingClientRect().left+pane.clientWidth/2,pane.getBoundingClientRect().top+pane.clientHeight/2,1.2);}
    else if(e.key==='-'){zoomAt(pane.getBoundingClientRect().left+pane.clientWidth/2,pane.getBoundingClientRect().top+pane.clientHeight/2,1/1.2);}
    else{return;}
  });
  // view-control buttons (wired here, not inline — no on* attributes)
  var zi=document.getElementById('zin'),zo=document.getElementById('zout'),zr=document.getElementById('zreset');
  function ctr(f){var r=pane.getBoundingClientRect();zoomAt(r.left+pane.clientWidth/2,r.top+pane.clientHeight/2,f);}
  if(zi){zi.addEventListener('click',function(){ctr(1.25);});}
  if(zo){zo.addEventListener('click',function(){ctr(1/1.25);});}
  if(zr){zr.addEventListener('click',reset);}
  window.addEventListener('resize',apply,{passive:true});
  apply();say('Command center ready. Scroll to zoom, drag to pan, click a node to focus.');
})();`;
}
