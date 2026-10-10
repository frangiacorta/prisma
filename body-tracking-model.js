import {screenToForce} from './particle-forces.js?v=e948e90c6d73';
export const BODY_LABELS={head:'Testa','hand-a':'Mano A','hand-b':'Mano B'};
export const BODY_META={gainX:['Sensibilità orizzontale',.1,4,.01],gainY:['Sensibilità verticale',.1,4,.01],offsetX:['Sposta il campo X',-.75,.75,.01],offsetY:['Sposta il campo Y',-.75,.75,.01],rotation:['Correzione camera obliqua',-90,90,1],smoothing:['Morbidezza · secondi',0,1.5,.01],deadzone:['Filtro micro-movimenti',0,.05,.001],hold:['Attesa in perdita · secondi',0,3,.05],fade:['Dissolvenza · secondi',.1,3,.05],strength:['Forza',0,3,.01],radius:['Raggio',.1,5,.01],swirl:['Avvolgimento',-2,2,.01],z:['Profondità del campo',-4,4,.01]};
const defaults={gainX:1,gainY:1,offsetX:0,offsetY:0,rotation:0,smoothing:.18,deadzone:.003,hold:.6,fade:.9,mirrorX:false,mirrorY:false,loss:'fade',show:true,target:'fields'};
export function normalizeBodyTracking(raw={}){
 const s={...defaults,sources:{}};raw=raw&&typeof raw==='object'?raw:{};
 for(const k of Object.keys(defaults)){if(BODY_META[k]&&Number.isFinite(raw[k]))s[k]=Math.max(BODY_META[k][1],Math.min(BODY_META[k][2],raw[k]));else if(typeof defaults[k]==='boolean')s[k]=raw[k]===undefined?defaults[k]:raw[k]===true;}
 if(raw.loss==='hold')s.loss='hold';if(raw.target==='move')s.target='move';
 for(const id of Object.keys(BODY_LABELS)){const r=raw.sources?.[id]||{},p={enabled:r.enabled!==false,mode:r.mode==='repel'?'repel':'attract',strength:id==='head'?.75:1.2,radius:1.3,swirl:0,z:0};for(const k of ['strength','radius','swirl','z'])if(Number.isFinite(r[k]))p[k]=Math.max(BODY_META[k][1],Math.min(BODY_META[k][2],r[k]));s.sources[id]=p;}
 return s;
}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function mapBodyPoint(p,c){const a=c.rotation*Math.PI/180,x=(p.x-.5)*c.gainX*(c.mirrorX?-1:1),y=(p.y-.5)*c.gainY*(c.mirrorY?-1:1);return {x:clamp(.5+x*Math.cos(a)-y*Math.sin(a)+c.offsetX,0,1),y:clamp(.5+x*Math.sin(a)+y*Math.cos(a)+c.offsetY,0,1)};}
export class BodyTrackingState{
 constructor(){this.clear();}
 clear(){this.tracks=new Map();this.cameraActive=false;this.lastTick=null;}
 receive(packet,now){
  this.cameraActive=packet?.cameraActive===true;
  const seen=new Set();for(const p of packet?.points||[]){if(!Object.hasOwn(BODY_LABELS,p.id)||seen.has(p.id)||!this.cameraActive||!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.ageMs)||p.ageMs<0||p.ageMs>500)continue;seen.add(p.id);const old=this.tracks.get(p.id);this.tracks.set(p.id,{...old,raw:{x:clamp(p.x,-.5,1.5),y:clamp(p.y,-.5,1.5)},seen:now-p.ageMs,partial:p.partial===true});}
 }
 sample(settings,aspect,now){
  const c=normalizeBodyTracking(settings),dt=this.lastTick===null?1/60:clamp((now-this.lastTick)/1000,0,.1);this.lastTick=now;const fields=[];
  for(const [id,t] of this.tracks){const source=c.sources[id];if(!source.enabled)continue;const target=mapBodyPoint(t.raw,c),lost=now-t.seen>500||!this.cameraActive;
   const age=Math.max(0,(now-t.seen)/1000-.5),weight=c.loss==='hold'?1:1-clamp((age-c.hold)/c.fade,0,1);
   if(!t.smooth)t.smooth={...target};if(!lost){const distance=Math.hypot(target.x-t.smooth.x,target.y-t.smooth.y);if(distance>c.deadzone){const k=c.smoothing<=0?1:1-Math.exp(-dt/c.smoothing);t.smooth.x+=(target.x-t.smooth.x)*k;t.smooth.y+=(target.y-t.smooth.y)*k;}}
   t.opacity??=0;t.opacity+=((source.enabled?weight:0)-t.opacity)*(1-Math.exp(-dt/.12));if(t.opacity<.001&&weight===0){t.opacity=0;continue;}
   const pos=screenToForce(t.smooth.x,t.smooth.y,aspect,source.z);fields.push({id,label:BODY_LABELS[id],enabled:true,...pos,z:source.z,strength:source.strength*(source.mode==='repel'?-1:1)*t.opacity,radius:source.radius,swirl:source.swirl*t.opacity,screen:{...t.smooth},opacity:t.opacity,lost,partial:t.partial});
  }return fields;
 }
}
export function bodyPreviewState(state,fields){
 if(!fields.length)return state;const c=normalizeBodyTracking(state.bodyTracking);
 if(state.engine==='particles'&&c.target==='fields')return {...state,bodyForces:fields};
 let x=0,y=0,sum=0;for(const f of fields){const w=Math.abs(f.strength);x+=f.x*f.strength;y+=f.y*f.strength;sum+=w;}
 return {...state,positionX:clamp(state.positionX+x/Math.max(1,sum),-1.5,1.5),positionY:clamp(state.positionY+y/Math.max(1,sum),-1.5,1.5)};
}
