import {newCreation,motionPreset} from './creative-model.js?v=5b48561291a2';
import {particleCreation} from './particle-model.js?v=5b48561291a2';
import {FLOW_PALETTES,flowTiming,flowChoice,normalizeFlow,flowPalette} from './flow-model.js?v=5b48561291a2';

const names={volume:'Volume',ring:'Anello',layers:'Strati',fibres:'Fili',branches:'Ramificazioni'};
export function flowScene(flow,ratio=16/9){
 const {family,engine}=flowChoice(flow),s=engine==='solid'?newCreation():particleCreation(newCreation(),3),i=flow.intensity;
 const noise=(offset)=>{const x=Math.sin((flow.seed+flow.step*73+offset)*12.9898)*43758.5453;return x-Math.floor(x);};
 Object.assign(s,{engine,seed:(flow.seed+flow.step*113)>>>0,duration:18,motionPeriod:18,speed:1,bgMode:'solid',background:'#000000',background2:'#000000',scale:engine==='solid'?.85:1.15,rotateX:12+noise(2)*20,rotateY:noise(3)*70,metal:flow.mood==='electric'?.65:.2,roughness:flow.mood==='calm'?.4:.28,gloss:.7,emission:engine==='particles'?.35:.04,glow:flow.mood==='electric'?.22:.06,transparency:0,environmentPower:.65,palette:[...(flowPalette(flow).length?flowPalette(flow):FLOW_PALETTES.pearl)]});
 if(engine==='solid'){
  Object.assign(s,{deform:.12+i*.22,twist:noise(5)*.4,filCount:2400,structShell:0});
  if(family==='ring')Object.assign(s,{loopAmount:.9,loopRadius:.75,loopTube:.22,loopKnot:.35+noise(4)*.3,deform:.08});
  if(family==='layers')Object.assign(s,{structLayers:.62,structLayerCount:4,structLayerWidth:.25,structRadial:.35,structPetalCount:9,structPetalWidth:.55,structCurl:.22});
  if(family==='fibres')Object.assign(s,{filLength:.22+i*.22,filWidth:.002,filWind:.08,filBend:.35,filCurl:.2,filClump:.35});
  if(family==='branches')Object.assign(s,{petalAmount:.6,petalCoverage:1,petalCount:9,petalRows:3,petalLength:.5,petalWidth:.08,petalCurl:.35,petalDisorder:.25});
 }else{
  Object.assign(s,{pCount:22000,pSize:1.1,pOpening:0,pFill:.55,pOrganic:.3,pLinks:0,pTrailCount:0,pLiving:0,pAttract:0,pRepel:0,pMagnet:0,pTravel:.25,pLife:.15,pRandom:.08,pMotionSoftness:.8,pSizeRatio:4,pLargeCount:0});
  if(family==='ring')Object.assign(s,{pOpening:.72,pFill:.2,pTravel:.5,pVortex:.45});
  if(family==='layers')Object.assign(s,{pOpening:.25,pFill:.1,pTrailCount:450,pTrailLength:.12,pTrailWidth:.6,pTrailOpacity:.4});
  if(family==='fibres')Object.assign(s,{pCount:8000,pLinks:.6,pLinkNodes:500,pLinkNeighbors:3,pLinkReach:.35,pLinkWidth:.7,pNodeRatio:2,pTravel:.2});
  if(family==='branches')Object.assign(s,{pTentacle:.65,pTentacleCount:6,pTentacleLength:1.4,pTentacleCurl:.5,pTentacleWave:.3,pTrailCount:300,pTrailOpacity:.3});
 }
 motionPreset(s,'turn');s.motions.rotateY.cycles=1;s.motions.rotateY.direction=flow.step%2?1:-1;
 if(engine==='solid'){const key={volume:'twist',ring:'loopPhase',layers:'structCurl',fibres:'filPhase',branches:'petalCurl'}[family];s.motions[key]={...s.motions[key],enabled:true,amplitude:['loopPhase','filPhase'].includes(key)?1:.08+i*.12,mode:['loopPhase','filPhase'].includes(key)?'cycle':'wave',curve:'sine',cycles:1,direction:1,phase:0};}
 return {name:'Flow · '+names[family],state:s,ratio,phase:noise(9)*Math.PI*2,playing:true};
}
const mixColor=(a,b,t)=>'#'+[1,3,5].map(k=>Math.round(parseInt(a.slice(k,k+2),16)*(1-t)+parseInt(b.slice(k,k+2),16)*t).toString(16).padStart(2,'0')).join('');

export class FlowDirector{
 constructor(engine){this.engine=engine;engine.config.flow=normalizeFlow(engine.config.flow);this.phase='idle';this.token=0;this.nextRequested=false;this.models=new WeakMap();this.progress=0;this.cycles=0;this.error='';}
 get settings(){return this.engine.config.flow;}
 start(){if(this.phase!=='idle')return;this.settings.enabled=true;this.phase='settle';this.error='';this.progress=0;const d=this.engine.decks[this.engine.config.mix<.5?'A':'B'];if(!this.settings.sourcePalette.length&&d){this.settings.sourcePalette=[...d.state.palette];if(!this.settings.palette.length)this.settings.palette=[...d.state.palette];}}
 stop(){this.settings.enabled=false;this.token++;if(this.loading){this.engine.generation[this.loading]++;this.engine.pending[this.loading]=false;}this.loading=null;this.phase='idle';this.engine.job=null;this.nextRequested=false;}
 next(){this.settings.paused=false;this.nextRequested=true;this.error='';if(this.phase==='error')this.phase='hold';}
 async prepare(id){
  const e=this.engine,token=++this.token;this.loading=id;this.phase='loading';this.destination=id;
  this.plan=JSON.stringify(flowChoice(this.settings));let ok=false;try{ok=await e.load(id,flowScene(this.settings,e.ratio));}catch{ok=false;}if(token!==this.token||!this.settings.enabled||e.closed)return;
  this.loading=null;if(!ok){this.phase='error';this.error='Scena non pronta. La scena attuale continua; premi Prossima per riprovare.';this.settings.paused=true;e.notify('flow');return;}
  this.phase='ready';e.notify('flow');
 }
 modulate(dt){
  const f=this.settings,e=this.engine,t=1-Math.exp(-dt/1.4),palette=flowPalette(f);
  for(const d of Object.values(e.decks)){if(!d)continue;let base=this.models.get(d);if(!base){base={speed:d.state.speed||1,deform:d.state.deform||0,organic:d.state.pOrganic||0,glow:d.state.glow||0};this.models.set(d,base);}
   const motion=f.mood==='calm'?.45:f.mood==='electric'?1.25:.75;
   const targets={speed:Math.max(.08,f.speed*motion),glow:.04+f.intensity*(f.mood==='electric'?.24:.08)};
   if(d.name.startsWith('Flow ·'))targets[d.state.engine==='particles'?'pOrganic':'deform']=d.state.engine==='particles'?.1+f.intensity*.5:.06+f.intensity*.3;
   let changed=false;for(const [key,value]of Object.entries(targets))if(Math.abs(d.state[key]-value)>.0001){d.state[key]+=(value-d.state[key])*t;changed=true;}
   if(palette.length){const key=palette.join();if(base.colorKey!==key){base.colorKey=key;base.colorFrom=[...d.state.palette];base.colorTime=0;}base.colorTime+=dt;const colors=Array.from({length:Math.max(palette.length,base.colorFrom.length)},(_,i)=>mixColor(base.colorFrom[i%base.colorFrom.length],palette[i%palette.length],1-Math.exp(-base.colorTime/1.4)));if(colors.some((c,i)=>c!==d.state.palette[i])){d.state.palette=colors;changed=true;}}
   if(changed){d.dirty=true;d.revision++;}
  }
 }
 tick(dt){
  const e=this.engine,f=this.settings;if(!f.enabled){if(this.phase!=='idle')this.stop();return;}if(this.phase==='idle')this.start();this.modulate(dt);
  if(f.paused){if(e.job)e.job.start+=dt;return;}
  if(['loading','ready'].includes(this.phase)&&this.plan!==JSON.stringify(flowChoice(f))){this.token++;if(this.loading){e.generation[this.loading]++;e.pending[this.loading]=false;}this.loading=null;this.phase='hold';}
  if(this.phase==='settle'){
   if(e.pending.A||e.pending.B||!e.decks.A||!e.decks.B||e.job)return;
   if(!f.sourcePalette.length){f.sourcePalette=[...e.decks[e.config.mix<.5?'A':'B'].state.palette];if(!f.palette.length)f.palette=[...f.sourcePalette];}
   if(e.config.mix>0&&e.config.mix<1){e.take(e.config.mix<.5?0:1);return;}
   this.phase='hold';this.progress=0;
  }
  if(['hold','loading','ready'].includes(this.phase))this.progress+=dt/flowTiming(f).hold;
  if(this.phase==='hold'){const id=e.config.mix<.5?'B':'A';this.prepare(id);return;}
  if(this.phase==='ready'&&(this.progress>=1||this.nextRequested)){
   const styles=f.mood==='calm'?['fade']:f.mood==='electric'?['fade','wipe','luma']:['fade','luma'];e.config.transition=styles[f.step%styles.length];e.config.direction=f.step%4;e.config.curve='smooth';e.config.unit='seconds';e.config.duration=flowTiming(f).transition;e.config.quantize=false;
   if(e.take(this.destination==='B'?1:0)){this.phase='transition';this.nextRequested=false;}
  }else if(this.phase==='transition'&&!e.job){f.step++;this.cycles++;this.progress=0;this.phase='hold';e.notify('flow');}
 }
 status(){return {phase:this.phase,cycles:this.cycles,progress:Math.min(1,this.progress),error:this.error,paused:this.settings.paused};}
}
