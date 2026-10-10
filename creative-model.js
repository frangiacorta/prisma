import {normalizeAudioClip} from './audio-recording.js?v=0d110cb2c465';
import {normalizeBodyTracking} from './body-tracking-model.js?v=0d110cb2c465';
import {normalizeAudio} from './audio-model.js?v=0d110cb2c465';
import {PARTICLE_META,PARTICLE_VERSION} from './particle-model.js?v=0d110cb2c465';
import {normalizeForcePaths} from './particle-paths.js?v=0d110cb2c465';
import {normalizeForcePoints} from './particle-forces.js?v=0d110cb2c465';
import {preset,MOODS,META,GROUPS,random} from './model.js?v=0d110cb2c465';
import {newLight,MATERIAL_STYLES,MODERN_BASE,EXTRA_BASE,SHAPE_TRACKS,LIGHT_RIGS,TEXTURE_STYLES} from './studio-model.js?v=0d110cb2c465';

export function setFullness(s,value){s.fullness=value;s.hollow=value<.999?1:0;s.wallThickness=Math.max(.003,value);s.thinShell=1-Math.min(1,value/.09);s.thickness=1;}
export function upgrade(s){if((s.renderVersion||1)<2){Object.assign(s,MODERN_BASE,{fullness:1-(s.hollow||0)*(1-(s.wallThickness??.08))});}return s;}
export function material(s,index){Object.assign(s,MATERIAL_STYLES[index].values);s.materialName=MATERIAL_STYLES[index].name;return s;}
export function textureStyle(s,index){if(!TEXTURE_STYLES[index])throw Error('Scegli una texture disponibile.');upgrade(s);Object.assign(s,TEXTURE_STYLES[index].values);return s;}
export function newCreation(){const s=preset(1);material(s,0);Object.assign(s,{background:'#000000',background2:'#152535',palette:['#7ccfff','#d9aeff','#ffb8d2','#a9f1e5'],grain:0,glow:0,edge:0,rotateX:0,rotateY:0,scale:.92,duration:12});for(const t of Object.values(s.motions))t.enabled=false;s.lights.forEach(l=>l.visible=false);return s;}

export const MOTION_PRESETS=[['emerge','Spuntano e rientrano'],['wrap','Si avvolgono alla sfera'],['roots','Radici in movimento'],['bloom','Petali che si aprono'],['chromatic','Onde cromatiche'],['breathe','Bolla che respira'],['reflect','Riflessi che girano'],['film','Colori che colano e vorticano'],['orbit','Luce che orbita'],['wave','Forma che ondeggia']];
export function motionPreset(s,key){
 upgrade(s);if(key!=='bloom'&&key!=='chromatic'){for(const t of Object.values(s.motions))t.enabled=false;s.environmentRotate=false;s.filmFlow=0;s.filmSwirl=0;for(const l of s.lights){l.orbit.enabled=false;l.pulse.enabled=false;}}
 if(!Number.isFinite(s.duration))s.duration=12;if(!Number.isFinite(s.speed))s.speed=1;if(!Number.isFinite(s.motion))s.motion=.3;
 if(['emerge','wrap','roots'].includes(key)){
  if(!(s.petalAmount>0))Object.assign(s,{petalAmount:1,petalCoverage:1,petalCount:8,petalRows:3,petalLength:1.05,petalWidth:.14,petalSharp:.45,petalBlend:.75,petalRoot:.25,petalWander:.35,petalDisorder:.55});
  const move=(k,amplitude,phase=0)=>s.motions[k]={...s.motions[k],enabled:true,amplitude,phase,cycles:1,direction:1,curve:'sine',mode:'wave'};
  if(key==='emerge'||key==='roots'){s.petalGrowth=.5;move('petalGrowth',.5,270);}
  if(key==='wrap'){s.petalGrowth=1;s.petalCoil=.45;move('petalCoil',.45,270);}
  if(key==='roots'){s.petalCoil=.35;s.petalWander=Math.max(.35,Math.min(.75,s.petalWander||0));s.petalReentry=.4;move('petalCoil',.25);move('petalWander',.12,90);move('petalReentry',.2,90);}
 }

 if(key==='breathe'){s.motions.volume={...s.motions.volume,enabled:true,amplitude:.045,curve:'sine',phase:0,cycles:1};s.motions.scale={...s.motions.scale,enabled:true,amplitude:.018,phase:0,cycles:1};}
 if(key==='reflect')s.environmentRotate=true;
 if(key==='film'){s.thinFilm=Math.max(.7,s.thinFilm||0);s.filmFlow=.7;s.filmSwirl=.6;s.filmCycles=1;}
 if(key==='orbit'){let l=s.lights.find(l=>l.type==='orb')||s.lights[0];if(!l){l=newLight(1);s.lights.push(l);}Object.assign(l,{x:1.7,y:.4,z:1.7,visible:true,size:.13,type:'orb',power:2.4,orbit:{...l.orbit,enabled:true,mode:'cycle',axis:'y',cycles:1,phase:0,direction:1}});}
 if(key==='wave'){s.deform=Math.max(.09,s.deform);s.motions.deform={...s.motions.deform,enabled:true,amplitude:.065,phase:0,cycles:1,curve:'sine'};s.motions.twist={...s.motions.twist,enabled:true,amplitude:.14,phase:90,cycles:1,curve:'sine'};}
 if(key==='bloom'){s.petalAmount=Math.max(.8,s.petalAmount||0);s.motions.petalOpen={...s.motions.petalOpen,enabled:true,amplitude:.2,phase:0,cycles:1,curve:'sine'};s.motions.petalCurl={...s.motions.petalCurl,enabled:true,amplitude:.2,phase:90,cycles:1,curve:'sine'};s.motions.stemBend={...s.motions.stemBend,enabled:true,amplitude:.12,phase:0,cycles:1,curve:'sine'};}
 if(key==='chromatic'){s.colorWaveAmount=1;s.motions.colorWavePhase={...s.motions.colorWavePhase,enabled:true,mode:'cycle',cycles:1,phase:0,direction:1};}
 return s;
}
export function hasMotion(s){return s.engine==='particles'|| Object.values(s.motions||{}).some(t=>t.enabled)||s.lights.some(l=>l.orbit?.enabled||l.pulse?.enabled)||!!s.environmentRotate||(s.filmFlow||0)>0||(s.filmSwirl||0)>0;}
function hue(hex,angle){let [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=d?(max===r?(g-b)/d:max===g?(b-r)/d+2:(r-g)/d+4)/6:0;h=(h+angle/360+1)%1;const sat=max?d/max:0,x=h*6,j=Math.floor(x),f=x-j,p=max*(1-sat),q=max*(1-f*sat),t=max*(1-(1-f)*sat);const c=[[max,t,p],[q,max,p],[p,max,t],[p,q,max],[t,p,max],[max,p,q]][j%6];return '#'+c.map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');}
const clamp=(key,value)=>META[key]?Math.max(META[key][1],Math.min(META[key][2],value)):value;
export function similar(s,seed,count=8,strength=.7){const r=random(seed),profiles=[[1,.4,.45],[.45,1,.45],[.5,.45,1],[.9,.9,.5],[.6,.9,.9],[1,.5,.9],[.7,1,.6],[1,1,1]],amount=Math.max(0,Math.min(1,strength));return Array.from({length:count},(_,i)=>{
 const v=structuredClone(s),delta=()=>r()*2-1,[shape,color,light]=profiles[i%profiles.length];
 if(amount===0)return v;
 for(const [k,a] of [['stretchX',.2],['stretchY',.2],['deform',.15],['asymmetry',.13],['twist',.5],['rotateX',25],['rotateY',25]])v[k]=clamp(k,(v[k]||0)+delta()*a*shape*amount);
 for(const [k,a] of [['metal',.22],['transparency',.16],['roughness',.2],['iridescence',.28],['coat',.16],['filmThickness',170],['gradientAngle',35],['gradientScale',.35],['gradientOffset',.18],['colorWavePhase',.2]])v[k]=clamp(k,(v[k]??EXTRA_BASE[k]??0)+delta()*a*color*amount);
 if(v.petalAmount>0){for(const [k,a] of [['petalOpen',.28],['petalCurl',.35],['petalLength',.3],['petalWidth',.065],['petalInflate',.25],['petalSharp',.22],['petalCoverage',.18],['petalBlend',.15],['petalRoot',.15],['petalRandom',.12],['petalGrowth',.14],['petalWander',.2],['petalCoil',.23],['petalReentry',.2],['petalKnots',.18],['petalRidges',.18],['petalDisorder',.18]])v[k]=clamp(k,(v[k]??EXTRA_BASE[k]??0)+delta()*a*shape*amount);v.petalCount=clamp('petalCount',Math.round(v.petalCount+delta()*4*shape*amount));}
 if(['textureWrinkles','textureFolds','textureWear','textureRipples'].some(k=>(v[k]||0)>0)){for(const [k,a] of [['textureDepth',.1],['textureScale',.25],['textureOrganic',.12],['textureAngle',25],['textureWrinkles',.12],['textureFolds',.12],['textureWear',.12],['textureRipples',.12]])v[k]=clamp(k,(v[k]??EXTRA_BASE[k])+delta()*a*color*amount);}
 v.environmentAngle=clamp('environmentAngle',(v.environmentAngle||0)+delta()*95*light*amount);
 const angle=(i%2?-1:1)*(25+r()*45)*color*amount;v.palette=v.palette.map(c=>hue(c,angle));for(const k of ['internalColor','sssColor'])if(v[k])v[k]=hue(v[k],angle);
 v.lights=v.lights.map(l=>({...l,x:Math.max(-5,Math.min(5,l.x+delta()*.5*light*amount)),y:Math.max(-5,Math.min(5,l.y+delta()*.5*light*amount)),z:Math.max(-5,Math.min(5,l.z+delta()*.4*light*amount)),power:Math.max(.1,Math.min(6,l.power*(1+delta()*.4*light*amount)))}));v.seed=(s.seed+Math.round(delta()*70*amount))>>>0;return v;
});}
export const SCULPT_EXAMPLES=[
 {name:'Rosetta',values:{petalOpen:.66,petalWidth:.3,petalLength:.8,petalInflate:.95,petalCurl:.05}},
 {name:'Riccio',values:{petalCoverage:1,petalSharp:.86,petalWidth:.13,petalLength:.72,petalCount:18,petalRows:7,petalBlend:.78,petalRoot:.55,petalRandom:.22,petalCurl:.18}},
 {name:'Borchie',values:{petalCoverage:1,petalSharp:.9,petalWidth:.22,petalLength:.32,petalCount:14,petalRows:6,petalBlend:.85,petalRoot:.65,petalRandom:.16,petalCurl:.08}},
 {name:'Aghi',values:{petalCoverage:1,petalSharp:1,petalWidth:.05,petalLength:.95,petalCount:18,petalRows:7,petalBlend:.72,petalRoot:.45,petalRandom:.25,petalCurl:.22}},
 {name:'Radici',values:{petalCoverage:1,petalCount:8,petalRows:3,petalLength:1.15,petalWidth:.14,petalSharp:.6,petalBlend:.75,petalRoot:.25,petalRandom:.45,petalWander:.55,petalCoil:.18,petalReentry:.35,petalKnots:.5,petalRidges:.4,petalDisorder:.7}},
 {name:'Corde',values:{petalCoverage:1,petalCount:8,petalRows:3,petalLength:1.4,petalWidth:.105,petalSharp:.12,petalBlend:.6,petalRoot:.12,petalRandom:.2,petalWander:.35,petalCoil:.7,petalReentry:.25,petalKnots:.1,petalRidges:.3,petalDisorder:.6}},
 {name:'Rigonfiamenti',values:{petalCoverage:1,petalCount:10,petalRows:4,petalLength:.3,petalWidth:.24,petalSharp:0,petalBlend:.8,petalRoot:.3,petalGrowth:.45,petalWander:.1,petalKnots:.25,petalDisorder:.65}},
 {name:'Radici intrecciate',values:{petalCoverage:1,petalCount:8,petalRows:3,petalLength:1.3,petalWidth:.12,petalSharp:.22,petalBlend:.75,petalRoot:.15,petalWander:.55,petalCoil:.55,petalReentry:.95,petalKnots:.25,petalDisorder:.8}}
];
export function sculpt(s,index){upgrade(s);const base=preset(1);for(const k of GROUPS.shape)s[k]=base[k];Object.assign(s,{petalAmount:1,rotateX:35,rotateY:0,rotateZ:0,...SCULPT_EXAMPLES[index].values});for(const k of SHAPE_TRACKS)s.motions[k].enabled=false;return s;}
export function bloomExample(){const s=newCreation();material(s,18);sculpt(s,0);Object.assign(s,{stemAmount:.68,stemBend:.18,scale:.85,positionY:.55,sssColor:'#ffffff',subsurface:.12,petalOpen:.62,petalCurl:.08,petalWidth:.32,petalInflate:1,rotateX:38,palette:['#173bd2','#fb3266','#82aa4d','#ede5be','#0a1226'],colorWaveAmount:1,colorWaveHeight:.7,colorWaveRadius:.75,colorWaveSwirl:.3,colorWaveBands:1.15,colorWaveWarp:.35,bgMode:'studio',background:'#d0dbea',background2:'#929ba7',grounding:0});motionPreset(s,'bloom');s.motions.colorWavePhase={...s.motions.colorWavePhase,enabled:true,mode:'cycle',cycles:1,direction:1,phase:0};s.environmentPower=.7;s.lights.forEach((l,i)=>Object.assign(l,{visible:false,color:i?'#cadbff':'#ffffff',power:i?.7:1.7}));return s;}
export function lightRig(s,index){upgrade(s);s.lights=LIGHT_RIGS[index].lights.map((v,i)=>({...newLight(i+1),x:0,y:0,z:2,length:v.size||.9,...v}));return s;}
// Generate independent, compatible ingredients rather than cycling complete presets.
// Family recipes constrain silhouette and optical cost; every recipe has continuous
// geometry, material, colour and lighting variation, all driven by this seed.
function surpriseColor(h,s,v){const sector=((h%360)+360)%360/60,i=Math.floor(sector),f=sector-i,p=v*(1-s),q=v*(1-s*f),t=v*(1-s*(1-f));return '#'+[[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i%6].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('');}
function surprisePalette(r){
 const n=2+Math.floor(r()*5),offset=r()*360;
 if(r()<.45){const source=MOODS[Math.floor(r()*MOODS.length)].colors,shift=r()*100-50;return Array.from({length:n},(_,i)=>hue(source[Math.floor(i*source.length/n)%source.length],shift+(i-(n-1)/2)*5));}
 const spread=[28,65,155,210][Math.floor(r()*4)],sat=.42+r()*.45;
 return Array.from({length:n},(_,i)=>surpriseColor(offset+spread*(i/Math.max(1,n-1)-.5),i===n-1?sat*.36:sat,.64+r()*.34));
}
export function surprise(seed){
 const r=random(seed),range=(a,b)=>a+r()*(b-a),integer=(a,b)=>Math.floor(range(a,b+1)),pick=items=>items[integer(0,items.length-1)],signed=a=>range(-a,a),s=newCreation();
 const form=integer(0,13),complex=form>=8;
 // Keep refractive multi-interface roots less frequent; all surfaces remain editable.
 const materials=complex?[4,5,8,9,10,11,12,13,14,15,17,18]:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
 const m=pick(materials);material(s,m);s.seed=seed>>>0;
 Object.assign(s,{background:'#000000',bgMode:'solid',grain:0,glow:0,edge:0,grounding:0,scale:range(.79,.95),rotateX:signed(24),rotateY:signed(30),rotateZ:signed(25)});
 if(form===0)Object.assign(s,{stretchX:range(.82,1.16),stretchY:range(.88,1.21),volume:range(.82,1.12),taper:signed(.1)});
 if(form===1)Object.assign(s,{taper:range(.24,.61),stretchY:range(1.12,1.46),stretchX:range(.72,.94),bendX:signed(.19),asymmetry:signed(.12),scale:range(.72,.85)});
 if(form===2)Object.assign(s,{deform:range(.18,.46),twist:signed(1.15),asymmetry:signed(.22),stretchX:range(.86,1.2),stretchY:range(.78,1.12),waves:range(.015,.085),waveScale:range(2,5)});
 if(form===3)Object.assign(s,{roundness:range(.4,.96),volume:range(.47,.85),stretchX:range(1.02,1.34),stretchY:range(.76,1.12),deform:range(.015,.11),rotateX:range(-30,35),rotateY:range(-40,40)});
 if(form===4)Object.assign(s,{hole:range(.35,.62),holeAspect:range(.77,1.35),holeX:signed(.12),holeY:signed(.12),volume:range(.3,.65),deform:range(.01,.09),stretchX:range(.87,1.18),rotateX:range(10,35),rotateY:signed(23)});
 if(form===5)Object.assign(s,{cut:range(.76,1.02),cutX:range(.42,.66),cutY:signed(.19),cutAspect:range(.82,1.2),volume:range(.34,.67),rotateX:signed(14),rotateY:signed(16),rotateZ:signed(100),rimRound:range(.015,.075)});
 if(form===6)Object.assign(s,{lobeAmount:range(.13,.32),lobes:integer(3,8),volume:range(.48,.92),twist:signed(.8),pinch:range(0,.14),deform:range(.015,.12),rotateX:range(-25,25)});
 if(form===7)Object.assign(s,{volume:range(.17,.36),stretchX:range(1.05,1.44),stretchY:range(.74,1.12),deform:range(.22,.47),twist:signed(.7),asymmetry:signed(.21),bendX:signed(.22),rotateX:signed(18),rotateY:signed(18)});
 if(form>=8){
  Object.assign(s,{petalAmount:1,petalBlend:range(.58,.86),petalRoot:range(.13,.38),petalRandom:range(.15,.48),petalPhase:range(0,360),rotateX:range(15,45),scale:range(.65,.8)});
  if(form===8)Object.assign(s,{petalCount:integer(6,15),petalCoverage:range(0,.2),petalOpen:range(.35,.88),petalCurl:signed(.38),petalLength:range(.58,1.08),petalWidth:range(.18,.34),petalInflate:range(.4,.95),petalSharp:range(0,.35)});
  if(form===9)Object.assign(s,{petalCount:integer(8,13),petalRows:integer(3,5),petalCoverage:1,petalLength:range(.36,.76),petalWidth:range(.08,.19),petalSharp:range(.68,.96),petalCurl:signed(.25),petalInflate:range(.2,.6)});
  if(form>=10)Object.assign(s,{petalCoverage:1,petalCount:integer(5,9),petalRows:integer(2,3),petalDisorder:range(.36,.85),petalWander:range(.15,.6),petalRidges:range(.05,.45)});
  if(form===10)Object.assign(s,{petalLength:range(.64,1.28),petalWidth:range(.11,.19),petalSharp:range(.22,.65),petalCoil:signed(.4),petalReentry:range(.05,.65),petalKnots:range(.23,.67)});
  if(form===11)Object.assign(s,{petalLength:range(.92,1.5),petalWidth:range(.09,.15),petalSharp:range(.02,.3),petalCoil:range(.43,.86)*(r()<.5?-1:1),petalReentry:range(.1,.7),petalKnots:range(0,.22)});
  if(form===12)Object.assign(s,{petalGrowth:range(.45,.8),petalLength:range(.2,.4),petalWidth:range(.2,.33),petalSharp:range(0,.22),petalBlend:range(.72,.94),petalWander:range(0,.2),petalKnots:range(.05,.4),scale:range(.86,1.05)});
  if(form===13)Object.assign(s,{petalLength:range(.83,1.39),petalWidth:range(.1,.18),petalSharp:range(.12,.4),petalCoil:range(.25,.65)*(r()<.5?-1:1),petalReentry:range(.72,1),petalKnots:range(.15,.48)});
 }
 s.palette=surprisePalette(r);Object.assign(s,{gradientAngle:range(-180,180),gradientOffset:r(),gradientScale:range(.58,1.8),colorSoftness:range(.48,.99)});
 if(r()<.4)Object.assign(s,{colorWaveAmount:range(.3,.85),colorWaveHeight:signed(1.4),colorWaveRadius:signed(1.1),colorWaveSwirl:signed(.7),colorWaveBands:range(.55,1.9),colorWaveWarp:range(.1,.55),colorWavePhase:r()});
 s.internalColor=pick(s.palette);s.sssColor=hue(s.internalColor,signed(18));
 for(const [k,a] of [['roughness',.07],['coat',.17],['iridescence',.18],['subsurface',.12]])s[k]=clamp(k,s[k]+signed(a));
 s.coatRoughness=range(.025,.2);s.iridShift=r();s.filmThickness=range(170,820);s.iridScale=range(.7,2.4);
 if(s.metal>.7){s.metal=range(.78,1);s.anisotropy=r()<.4?range(.18,.78):0;s.anisotropyAngle=range(-180,180);}
 if(m===0){s.roughness=range(0,.025);s.subsurface=0;s.coat=0;s.transparency=1;}
 if(m===1||m===2||m===3||m===6){s.roughness=range(0,.065);s.transparency=range(.91,1);s.tintStrength=range(.01,.12);s.subsurface=0;}
 if(m===13||m===14||m===18){s.transparency=0;s.coat=m===14?0:range(.14,.88);}
 if(m===7||m===8||m===10||m===17||m===18)s.sssRadius=range(.36,1.05);
 // Generating new geometry does not silently enable animations or bright floor rings.
 s.environment=pick(['studio','sunset','neon','sky','aquarium','aurora','city']);s.environmentAngle=range(-180,180);s.environmentPower=range(.78,1.35);
 s.lights=Array.from({length:r()<.32?3:2},(_,i)=>{
  const l=newLight(i+1),angle=range(.55,1.3)*(i%2?-1:1),radius=range(2.5,3.8);
  return {...l,visible:false,type:pick(i===0?['diffuser','circle','bar','ring']:['bar','circle','ring','spot','grid']),x:Math.sin(angle)*radius,y:i===0?range(.8,2.6):range(-.7,1.5),z:i===0?range(1.8,3.2):range(-2.2,2.8),size:range(.38,1.25),length:range(.55,1.6),roll:range(-100,100),softness:range(.12,.55),power:i===0?range(1.15,2.15):range(.6,1.35),color:i===0?'#f4f6ff':pick(s.palette),cone:range(28,65),grid:integer(3,7)};
 });
 if(s.subsurface>.4&&r()<.3)s.lights.push({...newLight(s.lights.length+1),type:'orb',x:signed(.22),y:signed(.25),z:0,size:.1,length:.1,power:range(.8,1.8),color:s.sssColor,visible:false});
 return s;
}
export function normalizeCreation(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Il file non contiene una creazione Prisma.');
 const s=preset(0);s.audioClip=normalizeAudioClip(raw.audioClip);s.audioReactive=normalizeAudio(raw.audioReactive,raw.engine);s.bodyTracking=normalizeBodyTracking(raw.bodyTracking);s.forcePoints=normalizeForcePoints(raw.forcePoints);s.forcePaths=normalizeForcePaths(raw.forcePaths);s.perfectLoop=raw.perfectLoop!==false;for(const [k,meta] of Object.entries(META)){if(Number.isFinite(raw[k]))s[k]=clamp(k,raw[k]);}
 for(const k of ['background','background2','internalColor','sssColor'])if(/^#[0-9a-f]{6}$/i.test(raw[k]||''))s[k]=raw[k];
 if(Array.isArray(raw.palette)&&raw.palette.length&&raw.palette.every(c=>/^#[0-9a-f]{6}$/i.test(c)))s.palette=raw.palette.slice(0,12);
 if(['solid','gradient','transparent','studio'].includes(raw.bgMode))s.bgMode=raw.bgMode;
 Object.assign(s,{...MODERN_BASE,renderVersion:raw.renderVersion>=2?2:1});
 for(const k of Object.keys(MODERN_BASE))if(typeof raw[k]===typeof MODERN_BASE[k]&&k!=='renderVersion')s[k]=typeof raw[k]==='number'&&META[k]?clamp(k,raw[k]):raw[k];
 if(!['studio','sunset','neon','sky','aquarium','aurora','city'].includes(s.environment))s.environment='studio';
 if(MATERIAL_STYLES.some(m=>m.name===raw.materialName))s.materialName=raw.materialName;
 s.renderVersion=raw.renderVersion>=2?2:1;s.thinShell=Math.max(0,Math.min(1,Number(raw.thinShell)||0));s.seed=Number(raw.seed)>>>0;s.engine=raw.engine==='particles'?'particles':'solid';s.particleVersion=PARTICLE_VERSION;for(const [key,meta]of Object.entries(PARTICLE_META))if(meta[3]>=1)s[key]=Math.round(s[key]);if(s.pDirection!==-1)s.pDirection=1;
 if(Array.isArray(raw.lights))s.lights=raw.lights.slice(0,8).map((l,i)=>{const v=newLight(i+1);for(const k of ['x','y','z'])if(Number.isFinite(l[k]))v[k]=Math.max(-5,Math.min(5,l[k]));for(const k of ['power','size','length','roll','softness','cone','grid'])if(Number.isFinite(l[k]))v[k]=Math.max(k==='roll'?-180:0,Math.min(k==='power'?6:k==='roll'?180:k==='cone'?85:k==='grid'?12:3,l[k]));if(/^#[0-9a-f]{6}$/i.test(l.color))v.color=l.color;if(['circle','bar','spot','diffuser','grid','ring','orb'].includes(l.type))v.type=l.type;v.enabled=l.enabled!==false;v.visible=l.visible===true;for(const key of ['orbit','pulse'])if(l[key])v[key]=safeTrack(v[key],l[key],s.perfectLoop);return v;});
 for(const k of Object.keys(s.motions))if(raw.motions?.[k])s.motions[k]=safeTrack(s.motions[k],raw.motions[k],s.perfectLoop);
 for(const k of ['internalColor','sssColor'])if(!/^#[0-9a-f]{6}$/i.test(s[k]||''))s[k]=k==='internalColor'?'#e6f5ff':'#ffc49b';
 for(const k of ['photoAll','environmentRotate'])s[k]=raw[k]===true;
 if(s.perfectLoop)for(const k of ['environmentCycles','filmCycles'])s[k]=Math.max(1,Math.round(s[k]||1));
 s.animateRotation=['rotateX','rotateY','rotateZ'].some(k=>s.motions[k].enabled);
 s.animateShape=SHAPE_TRACKS.some(k=>s.motions[k].enabled);
 s.animateColor=s.motions.gradientOffset.enabled||s.motions.colorWavePhase.enabled;s.animateLight=s.lights.some(l=>l.orbit.enabled);
 return s;
}
function safeTrack(base,raw,perfectLoop=true){const t={...base,enabled:raw.enabled===true};for(const k of ['amplitude','cycles','phase'])if(Number.isFinite(raw[k]))t[k]=Math.max(0,Math.min(k==='amplitude'?360:k==='cycles'?8:360,raw[k]));t.cycles=perfectLoop?Math.max(1,Math.round(t.cycles)):Math.max(.1,t.cycles);t.direction=raw.direction===-1?-1:1;if(['sine','soft','triangle'].includes(raw.curve))t.curve=raw.curve;if(['wave','cycle'].includes(raw.mode))t.mode=raw.mode;if(['x','y','z'].includes(raw.axis))t.axis=raw.axis;return t;}
