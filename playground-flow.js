import {newCreation,motionPreset} from './creative-model.js?v=35455dbed4a0';
import {particleCreation} from './particle-model.js?v=35455dbed4a0';
import {FLOW_PALETTES,flowTiming,flowChoice,normalizeFlow,flowPalette,flowProfile} from './flow-model.js?v=35455dbed4a0';

const names={volume:'Volume',ring:'Anello',layers:'Strati',fibres:'Fili',branches:'Ramificazioni'};
export function flowScene(flow,ratio=16/9){
 const {family,engine}=flowChoice(flow),s=engine==='solid'?newCreation():particleCreation(newCreation(),3),i=flow.intensity,seed=(flow.seed+flow.step*113)>>>0,score=flowProfile(seed,flow.mood,flow.variety);
 const noise=(offset)=>{const x=Math.sin((flow.seed+flow.step*73+offset)*12.9898)*43758.5453;return x-Math.floor(x);};
 Object.assign(s,{engine,seed:(flow.seed+flow.step*113)>>>0,duration:16+noise(40)*12,motionPeriod:16+noise(40)*12,speed:1,bgMode:'solid',background:'#000000',background2:'#000000',scale:engine==='solid'?.85:1.15,rotateX:12+noise(2)*20,rotateY:noise(3)*70,metal:flow.mood==='electric'?.65:.2,roughness:flow.mood==='calm'?.4:.28,gloss:.7,emission:engine==='particles'?.35:.04,glow:flow.mood==='electric'?.22:.06,transparency:0,environmentPower:.65,palette:[...(flowPalette(flow).length?flowPalette(flow):FLOW_PALETTES.pearl)]});
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
 // Choreography uses the same editable tracks as the editor. Geometry stays
 // fixed while a deck is visible; only shader values and tracks evolve live.
 motionPreset(s,'turn');for(const t of Object.values(s.motions))t.enabled=false;
 const move=(key,amplitude,mode='wave',cycles=score.cycles,phase=score.phase)=>{if(!s.motions[key])return;s.motions[key]={...s.motions[key],enabled:true,amplitude,mode,cycles,phase,direction:score.direction,curve:flow.mood==='electric'?'soft':'sine',pace:score.rhythm,pacePhase:score.phase,hold:0};};
 if(score.motion===0){move('rotateY',360,'cycle',1);move('rotateX',18);}
 if(score.motion===1){move('positionX',.07+i*.12);move('positionY',.06+i*.08,'wave',1,score.phase+90);move('rotateZ',20);}
 if(score.motion===2){move('rotateZ',360,'cycle',1);move('rotateX',45,'wave',1);}
 if(score.motion===3){move('scale',.025+i*.07);move('twist',.12+i*.24);move('rotateY',35);}
 if(score.motion===4){move('rotateX',130,'wave',1);move('rotateY',360,'cycle',2);move('positionY',.07);}
 if(score.motion===5){move('deform',.035+i*.08);move('rotateZ',25,'wave',2);move('scale',.04,'wave',1);}
 const materials=[{metal:.05,roughness:.48,coat:.65,thinFilm:0,iridescence:.08},{metal:.92,roughness:.13,coat:.25,thinFilm:0,iridescence:.2},{metal:.3,roughness:.22,coat:.7,thinFilm:.75,iridescence:.65},{metal:.05,roughness:.72,coat:.12,thinFilm:0,iridescence:0},{metal:.65,roughness:.3,coat:.45,thinFilm:.3,iridescence:.45}];
 Object.assign(s,materials[score.material],{gradientAngle:-120+noise(41)*240,gradientScale:.7+noise(42)*1.2,colorWaveAmount:.25+i*.55,colorWaveHeight:noise(43)*1.5,colorWaveRadius:.4+noise(44),colorWaveSwirl:(noise(45)-.5)*1.4,colorWaveBands:.5+noise(46)*1.7,colorSoftness:.65+noise(47)*.8,environmentRotate:true,filmFlow:score.material===2?.25+i*.6:0,filmSwirl:score.material===2?.3:0,filmThickness:220+noise(48)*430});
 move('colorWavePhase',1,'cycle',score.cycles);move('gradientOffset',.12+i*.2,'wave',1,score.phase+90);move('roughness',.04+i*.08,'wave',1);if(score.material===2||score.material===4)move('iridescence',.12+i*.18,'wave',2);
 if(engine==='particles')Object.assign(s,{pDirection:score.direction,pRhythm:score.rhythm,pCycles:score.cycles,pSpeedSpread:.12+noise(49)*.4,pMotionSeed:seed%10000,pOrbitTilt:noise(50)*60,pOrbitPrecession:.08+noise(51)*.3,pWander:score.motion===1?.15:0,pBreath:score.motion===3?.12:0,pTravel:s.pTravel*(.5+noise(52)),pColorScatter:.05+noise(53)*.15});
 if(s.lights[0]){const l=s.lights[0];l.enabled=true;l.power=.9+noise(64)*1.1;l.x=-1.8+noise(65)*3.6;l.y=1+noise(66);l.orbit={...l.orbit,enabled:true,amplitude:18+noise(67)*30,cycles:1,axis:score.motion%2?'z':'y',phase:score.phase,pace:score.rhythm};l.pulse={...l.pulse,enabled:score.motion===3||flow.mood==='electric',amplitude:.08+i*.12,cycles:score.cycles,phase:score.phase};}
 // Change dimensions within a family too, without increasing the live budget.
 if(engine==='solid'){s.twist*=.65+noise(54);if(family==='ring'){s.loopTube=.14+noise(55)*.2;s.loopKnot=.15+noise(56)*.6;}if(family==='layers'){s.structPetalCount=6+Math.floor(noise(57)*8);s.structCurl=.1+noise(58)*.45;}if(family==='fibres'){s.filLength*=.7+noise(59)*.8;s.filCurl=noise(60)*.5;}if(family==='branches'){s.petalLength=.3+noise(61)*.45;s.petalCurl=noise(62)*.7;}}

 if(engine==='solid'){const key={volume:'twist',ring:'loopPhase',layers:'structCurl',fibres:'filPhase',branches:'petalCurl'}[family];s.motions[key]={...s.motions[key],enabled:true,amplitude:['loopPhase','filPhase'].includes(key)?1:.08+i*.12,mode:['loopPhase','filPhase'].includes(key)?'cycle':'wave',curve:flow.mood==='electric'?'soft':'sine',pace:score.rhythm,pacePhase:score.phase,cycles:score.cycles,direction:score.direction,phase:score.phase};}
 return {name:'Flow · '+names[family],state:s,ratio,phase:noise(9)*Math.PI*2,playing:true};
}
const scenePlan=f=>JSON.stringify({...flowChoice(f),seed:f.seed,mood:f.mood,variety:f.variety});
const mixColor=(a,b,t)=>'#'+[1,3,5].map(k=>Math.round(parseInt(a.slice(k,k+2),16)*(1-t)+parseInt(b.slice(k,k+2),16)*t).toString(16).padStart(2,'0')).join('');

export class FlowDirector{
 constructor(engine){this.engine=engine;engine.config.flow=normalizeFlow(engine.config.flow);this.phase='idle';this.token=0;this.nextRequested=false;this.models=new WeakMap();this.progress=0;this.cycles=0;this.error='';}
 get settings(){return this.engine.config.flow;}
 start(){if(this.phase!=='idle')return;this.settings.enabled=true;this.phase='settle';this.error='';this.progress=0;const d=this.engine.decks[this.engine.config.mix<.5?'A':'B'];if(!this.settings.sourcePalette.length&&d){this.settings.sourcePalette=[...d.state.palette];if(!this.settings.palette.length)this.settings.palette=[...d.state.palette];}}
 stop(){this.settings.enabled=false;this.token++;if(this.loading){this.engine.generation[this.loading]++;this.engine.pending[this.loading]=false;}this.loading=null;this.phase='idle';this.engine.job=null;this.nextRequested=false;}
 next(){this.settings.paused=false;this.nextRequested=true;this.error='';if(this.phase==='error')this.phase='hold';}
 async prepare(id){
  const e=this.engine,token=++this.token;this.loading=id;this.phase='loading';this.destination=id;
  this.plan=scenePlan(this.settings);let ok=false;try{ok=await e.load(id,flowScene(this.settings,e.ratio));}catch{ok=false;}if(token!==this.token||!this.settings.enabled||e.closed)return;
  this.loading=null;if(!ok){this.phase='error';this.error='Scena non pronta. La scena attuale continua; premi Prossima per riprovare.';this.settings.paused=true;e.notify('flow');return;}
  this.phase='ready';e.notify('flow');
 }
 modulate(dt){
  const f=this.settings,e=this.engine,t=1-Math.exp(-dt/1.4);
  for(const d of Object.values(e.decks)){if(!d)continue;let base=this.models.get(d);if(!base){base={deform:d.state.deform||0,organic:d.state.pOrganic||0,glow:d.state.glow||0,intensity:f.intensity,amplitudes:Object.fromEntries(Object.entries(d.state.motions||{}).filter(([,v])=>v.enabled&&v.mode!=='cycle').map(([k,v])=>[k,v.amplitude]))};this.models.set(d,base);}
   const generated=d.name.startsWith('Flow ·'),score=flowProfile(d.state.seed,f.mood,f.variety),phase=d.phase||0;
   const motion=f.mood==='calm'?.45:f.mood==='electric'?1.25:.75;
   const envelope=1+score.rhythm*(.32*Math.sin(phase+score.phase*Math.PI/180)+.16*Math.sin(phase*2));
   const targets={speed:Math.max(.08,f.speed*motion*score.pace*envelope),glow:Math.max(0,base.glow+(f.intensity-base.intensity)*.15)};
   if(generated){const factor=(.25+f.intensity)/(.25+base.intensity);targets[d.state.engine==='particles'?'pOrganic':'deform']=(d.state.engine==='particles'?base.organic:base.deform)*factor;}
   let changed=false;if(generated)for(const [key,value]of Object.entries(base.amplitudes)){const tr=d.state.motions[key],target=value*(.3+f.intensity)/(.3+base.intensity);if(Math.abs(tr.amplitude-target)>.0001){tr.amplitude+=(target-tr.amplitude)*t;changed=true;}}for(const [key,value]of Object.entries(targets))if(Math.abs(d.state[key]-value)>.0001){d.state[key]+=(value-d.state[key])*t;changed=true;}
   const palette=flowPalette(f,d.state.seed);
   if(palette.length){const key=palette.join();if(base.colorKey!==key){base.colorKey=key;base.colorFrom=d.state.palette?.length?[...d.state.palette]:[...palette];base.colorTime=0;}base.colorTime+=dt;
    const colors=Array.from({length:Math.max(palette.length,base.colorFrom.length)},(_,i)=>mixColor(base.colorFrom[i%base.colorFrom.length],palette[i%palette.length],1-Math.exp(-base.colorTime/1.4)));
    if(colors.some((c,i)=>c!==d.state.palette[i])){d.state.palette=colors;changed=true;}}
   if(changed){d.dirty=true;d.revision++;}
  }
 }

 tick(dt){
  const e=this.engine,f=this.settings;if(!f.enabled){if(this.phase!=='idle')this.stop();return;}if(this.phase==='idle')this.start();this.modulate(dt);
  if(f.paused){if(e.job)e.job.start+=dt;return;}
  if(['loading','ready'].includes(this.phase)&&this.plan!==scenePlan(f)){this.token++;if(this.loading){e.generation[this.loading]++;e.pending[this.loading]=false;}this.loading=null;this.phase='hold';}
  if(this.phase==='settle'){
   if(e.pending.A||e.pending.B||!e.decks.A||!e.decks.B||e.job)return;
   if(!f.sourcePalette.length){f.sourcePalette=[...e.decks[e.config.mix<.5?'A':'B'].state.palette];if(!f.palette.length)f.palette=[...f.sourcePalette];}
   if(e.config.mix>0&&e.config.mix<1){e.take(e.config.mix<.5?0:1);return;}
   this.phase='hold';this.progress=0;
  }
  if(['hold','loading','ready'].includes(this.phase))this.progress+=dt/flowTiming(f).hold;
  if(this.phase==='hold'){const id=e.config.mix<.5?'B':'A';this.prepare(id);return;}
  if(this.phase==='ready'&&(this.progress>=1||this.nextRequested)){
   const styles=f.mood==='calm'?['fade']:f.mood==='electric'?['fade','wipe','luma']:['fade','luma'];e.config.transition=styles[f.step%styles.length];e.config.direction=(f.step+f.seed)%4;e.config.curve=f.mood==='calm'?'smooth':['smooth','linear','in'][(f.step+f.seed)%3];e.config.unit='seconds';e.config.duration=flowTiming(f).transition;e.config.quantize=false;
   if(e.take(this.destination==='B'?1:0)){this.phase='transition';this.nextRequested=false;}
  }else if(this.phase==='transition'&&!e.job){f.step++;this.cycles++;this.progress=0;this.phase='hold';e.notify('flow');}
 }
 status(){return {phase:this.phase,cycles:this.cycles,progress:Math.min(1,this.progress),error:this.error,paused:this.settings.paused};}
}
