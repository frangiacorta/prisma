import {forceToScreen} from './particle-forces.js?v=faae5dff344a';
// Editor-only volumes, projected through the same camera as their force centres.
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),norm=a=>{const d=Math.hypot(...a);return a.map(v=>v/d);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const number=v=>Number(v.toFixed(2)),fmt=v=>(v>0?'+':'')+number(v);
function hull(points){points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);const half=ps=>{const h=[];for(const p of ps){while(h.length>1&&turn(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p);}return h;};const a=half(points),b=half([...points].reverse());return [...a.slice(0,-1),...b.slice(0,-1)];}
const path=ps=>ps.map((p,i)=>(i?'L':'M')+p.map(number).join(' ')).join('');
export function sphereOverlay(state,selected,width,height){
 const solid=state.engine!=='particles'&&!(state.pLiving>0),aspect=width/height;
 const project=p=>{const q=forceToScreen({x:p[0],y:p[1],z:p[2],radius:0},aspect,state);return[q.x*width,q.y*height];};
 const points=[...(state.forcePoints||[])].sort((a,b)=>a.z-b.z),groups=[];
 for(const p of points){
  const center=[p.x,p.y,p.z],samples=[],r=p.radius,color=!p.enabled?'#98a0a8':p.strength<0?'#efa2c7':'#bcf3a6',id='force-sphere-'+p.id;
  const world=n=>n.map((v,i)=>center[i]+r*v);
  for(let i=0;i<=24;i++){const lat=Math.PI*i/24;for(let j=0;j<64;j++){const t=j*Math.PI/32;samples.push(project(world([Math.sin(lat)*Math.cos(t),Math.sin(lat)*Math.sin(t),Math.cos(lat)])));}}
  const boundary=hull(samples),outline=path(boundary)+'Z';
  let back='',front='';
  // Tilted great circles make front and rear hemispheres readable without rotating the field itself.
  for(const normal of [[1,.25,.35],[.1,1,.45],[.2,-.45,1]]){const n=norm(normal),u=norm(cross(n,[0,1,0])),v=cross(n,u);for(let i=0;i<96;i++){const at=t=>u.map((x,k)=>x*Math.cos(t)+v[k]*Math.sin(t));const a=at(i*Math.PI/48),b=at((i+1)*Math.PI/48),mid=world(at((i+.5)*Math.PI/48)),view=solid?[0,0,1]:[-mid[0],-mid[1],7.5-mid[2]],segment=path([project(world(a)),project(world(b))]);if(dot(at((i+.5)*Math.PI/48),view)>=0)front+=segment;else back+=segment;}}
  const q=project(center),anchor=project([p.x,p.y,0]),label=p.id===selected?`<text class="force-volume-label" x="${number(q[0]+23)}" y="${number(q[1]-18)}">R ${number(r)} · Z ${fmt(p.z)}</text>`:'';
  groups.push(`<g class="force-sphere ${p.id===selected?'selected':''} ${p.enabled?'':'disabled'}" data-sphere-id="${p.id}" data-depth="${p.z}" style="color:${color}"><defs><radialGradient id="${id}" cx="31%" cy="25%" r="77%"><stop offset="0" stop-color="white" stop-opacity=".23"/><stop offset=".22" stop-color="${color}" stop-opacity=".13"/><stop offset=".65" stop-color="${color}" stop-opacity=".025"/><stop offset=".88" stop-color="${color}" stop-opacity=".10"/><stop offset="1" stop-color="${color}" stop-opacity=".28"/></radialGradient></defs><path class="force-volume-shell" d="${outline}" fill="url(#${id})"/><path class="force-volume-back" d="${back}"/><path class="force-volume-front" d="${front}"/>${!solid&&Math.hypot(q[0]-anchor[0],q[1]-anchor[1])>8?`<path class="force-depth-tether" d="${path([anchor,q])}"/><path class="force-depth-zero" d="M${number(anchor[0]-4)} ${number(anchor[1])}h8m-4 -4v8"/>`:''}${label}</g>`);
 }
 const selectedPoint=points.find(p=>p.id===selected);
 let depth='';if(selectedPoint){const p=selectedPoint,w=Math.min(274,width-24),x=12,y=Math.max(8,height-74),scale=(w-28)/18,at=z=>x+w/2+z*scale;depth=`<g class="force-depth-scale" aria-hidden="true"><rect x="${x}" y="${y}" width="${w}" height="62" rx="8"/><text x="${x+10}" y="${y+16}">Dietro</text><text x="${x+w-10}" y="${y+16}" text-anchor="end">Davanti · verso di te</text><path d="M${x+14} ${y+34}H${x+w-14}M${at(0)} ${y+23}V${y+45}"/><line class="force-depth-span" x1="${at(p.z-p.radius)}" x2="${at(p.z+p.radius)}" y1="${y+34}" y2="${y+34}"/><circle cx="${at(p.z)}" cy="${y+34}" r="5"/><text x="${x+10}" y="${y+55}">Campo ${p.id} · Z ${fmt(p.z)} · raggio ${number(p.radius)}</text><text x="${at(0)}" y="${y+28}" text-anchor="middle">0</text></g>`;}
 return groups.join('')+depth;
}
