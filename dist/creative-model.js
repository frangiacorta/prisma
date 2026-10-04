import {preset,MOODS,META,GROUPS,random} from './model.js';
import {newLight,MATERIAL_STYLES,MODERN_BASE,EXTRA_BASE} from './studio-model.js';

export function setFullness(s,value){s.fullness=value;s.hollow=value<.999?1:0;s.wallThickness=Math.max(.003,value);s.thinShell=1-Math.min(1,value/.09);s.thickness=1;}
export function upgrade(s){if((s.renderVersion||1)<2){Object.assign(s,MODERN_BASE,{fullness:1-(s.hollow||0)*(1-(s.wallThickness??.08))});}return s;}
export function material(s,index){Object.assign(s,MATERIAL_STYLES[index].values);s.materialName=MATERIAL_STYLES[index].name;return s;}
export function newCreation(){const s=preset(1);material(s,0);Object.assign(s,{background:'#000000',background2:'#152535',palette:['#7ccfff','#d9aeff','#ffb8d2','#a9f1e5'],grain:0,glow:0,edge:0,rotateX:0,rotateY:0,scale:.92,duration:12});for(const t of Object.values(s.motions))t.enabled=false;s.lights.forEach(l=>l.visible=false);return s;}

export const MOTION_PRESETS=[['breathe','Bolla che respira'],['reflect','Riflessi che girano'],['film','Colori che colano e vorticano'],['orbit','Luce che orbita'],['wave','Forma che ondeggia']];
export function motionPreset(s,key){
 upgrade(s);for(const t of Object.values(s.motions))t.enabled=false;s.environmentRotate=false;s.filmFlow=0;s.filmSwirl=0;for(const l of s.lights){l.orbit.enabled=false;l.pulse.enabled=false;}
 s.duration=12;s.speed=1;s.motion=.3;
 if(key==='breathe'){s.motions.volume={...s.motions.volume,enabled:true,amplitude:.045,curve:'sine',phase:0,cycles:1};s.motions.scale={...s.motions.scale,enabled:true,amplitude:.018,phase:0,cycles:1};}
 if(key==='reflect')s.environmentRotate=true;
 if(key==='film'){s.thinFilm=Math.max(.7,s.thinFilm||0);s.filmFlow=.7;s.filmSwirl=.6;s.filmCycles=1;}
 if(key==='orbit'){let l=s.lights.find(l=>l.type==='orb')||s.lights[0];if(!l){l=newLight(1);s.lights.push(l);}Object.assign(l,{x:1.7,y:.4,z:1.7,visible:true,size:.13,type:'orb',power:2.4,orbit:{...l.orbit,enabled:true,mode:'cycle',axis:'y',cycles:1,phase:0,direction:1}});}
 if(key==='wave'){s.deform=Math.max(.09,s.deform);s.motions.deform={...s.motions.deform,enabled:true,amplitude:.065,phase:0,cycles:1,curve:'sine'};s.motions.twist={...s.motions.twist,enabled:true,amplitude:.14,phase:90,cycles:1,curve:'sine'};}
 return s;
}
export function hasMotion(s){return Object.values(s.motions||{}).some(t=>t.enabled)||s.lights.some(l=>l.orbit?.enabled||l.pulse?.enabled)||!!s.environmentRotate||(s.filmFlow||0)>0||(s.filmSwirl||0)>0;}
function hue(hex,angle){let [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=d?(max===r?(g-b)/d:max===g?(b-r)/d+2:(r-g)/d+4)/6:0;h=(h+angle/360+1)%1;const sat=max?d/max:0,x=h*6,j=Math.floor(x),f=x-j,p=max*(1-sat),q=max*(1-f*sat),t=max*(1-(1-f)*sat);const c=[[max,t,p],[q,max,p],[p,max,t],[p,q,max],[t,p,max],[max,p,q]][j%6];return '#'+c.map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');}
const clamp=(key,value)=>META[key]?Math.max(META[key][1],Math.min(META[key][2],value)):value;
export function similar(s,seed,count=8){const r=random(seed);return Array.from({length:count},(_,i)=>{const v=structuredClone(s),delta=()=>r()*2-1;for(const [k,a] of [['stretchX',.035],['stretchY',.035],['deform',.035],['asymmetry',.02],['twist',.045],['metal',.045],['transparency',.025],['roughness',.025],['iridescence',.045],['environmentAngle',12],['filmThickness',35]])v[k]=clamp(k,(v[k]||0)+delta()*a);const angle=delta()*12;v.palette=v.palette.map(c=>hue(c,angle));if(v.internalColor)v.internalColor=hue(v.internalColor,angle);v.lights=v.lights.map(l=>({...l,x:l.x+delta()*.1,y:l.y+delta()*.1,z:l.z+delta()*.08,power:Math.max(.1,l.power+delta()*.15)}));v.seed=(seed+i+1)>>>0;return v;});}
const compositions=[
 [0,'sky',4,'sphere'],[0,'aurora',0,'drop'],[1,'aquarium',1,'drop'],[2,'studio',12,'sphere'],[4,'sunset',10,'blob'],[5,'city',5,'sphere'],[6,'studio',12,'sphere'],[7,'sky',16,'blob'],[8,'neon',10,'blob'],[9,'sunset',4,'sphere'],[10,'aurora',4,'drop'],[11,'studio',5,'ring'],[12,'city',17,'blob'],[15,'neon',3,'crescent']
];
export function surprise(seed){const r=random(seed),[m,environment,mood,form]=compositions[Math.floor(r()*compositions.length)],s=newCreation();material(s,m);s.seed=seed;s.environment=environment;s.palette=[...MOODS[mood%MOODS.length].colors];s.environmentAngle=Math.round(r()*360-180);s.internalColor=s.palette[Math.floor(r()*s.palette.length)];s.sssColor=s.internalColor;s.grain=0;s.scale=.82+r()*.15;
 if(form==='drop')Object.assign(s,{taper:.32,asymmetry:.1,stretchY:1.12,stretchX:.88});
 if(form==='blob')Object.assign(s,{deform:.15+r()*.16,twist:.2,asymmetry:.12,stretchX:1.04,stretchY:.94});
 if(form==='ring')Object.assign(s,{hole:.5,volume:.48,rotateX:16,rotateY:-12,deform:.05});
 if(form==='crescent')Object.assign(s,{cut:.85,cutX:.46,cutY:.1,volume:.55,rotateY:0});
 s.lights.forEach((l,i)=>Object.assign(l,{visible:false,power:i?.6:1.2,color:i?s.palette[1]:'#ffffff'}));
 if(m===8){const l={...newLight(3),type:'orb',x:.15,y:.1,z:0,size:.13,length:.13,power:3,color:'#fff0db',visible:false};s.lights.push(l);}
 return s;
}
export function normalizeCreation(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Il file non contiene una creazione Prisma.');
 const s=preset(0);for(const [k,meta] of Object.entries(META)){if(Number.isFinite(raw[k]))s[k]=clamp(k,raw[k]);}
 for(const k of ['background','background2','internalColor','sssColor'])if(/^#[0-9a-f]{6}$/i.test(raw[k]||''))s[k]=raw[k];
 if(Array.isArray(raw.palette)&&raw.palette.length&&raw.palette.every(c=>/^#[0-9a-f]{6}$/i.test(c)))s.palette=raw.palette.slice(0,12);
 if(['solid','gradient','transparent','studio'].includes(raw.bgMode))s.bgMode=raw.bgMode;
 Object.assign(s,{...MODERN_BASE,renderVersion:raw.renderVersion>=2?2:1});
 for(const k of Object.keys(MODERN_BASE))if(typeof raw[k]===typeof MODERN_BASE[k]&&k!=='renderVersion')s[k]=typeof raw[k]==='number'&&META[k]?clamp(k,raw[k]):raw[k];
 if(!['studio','sunset','neon','sky','aquarium','aurora','city'].includes(s.environment))s.environment='studio';
 if(MATERIAL_STYLES.some(m=>m.name===raw.materialName))s.materialName=raw.materialName;
 s.renderVersion=raw.renderVersion>=2?2:1;s.thinShell=Math.max(0,Math.min(1,Number(raw.thinShell)||0));s.seed=Number(raw.seed)>>>0;
 if(Array.isArray(raw.lights))s.lights=raw.lights.slice(0,8).map((l,i)=>{const v=newLight(i+1);for(const k of ['x','y','z'])if(Number.isFinite(l[k]))v[k]=Math.max(-5,Math.min(5,l[k]));for(const k of ['power','size','length','roll','softness','cone','grid'])if(Number.isFinite(l[k]))v[k]=Math.max(k==='roll'?-180:0,Math.min(k==='power'?6:k==='roll'?180:k==='cone'?85:k==='grid'?12:3,l[k]));if(/^#[0-9a-f]{6}$/i.test(l.color))v.color=l.color;if(['circle','bar','spot','diffuser','grid','ring','orb'].includes(l.type))v.type=l.type;v.enabled=l.enabled!==false;v.visible=l.visible===true;for(const key of ['orbit','pulse'])if(l[key])v[key]=safeTrack(v[key],l[key]);return v;});
 for(const k of Object.keys(s.motions))if(raw.motions?.[k])s.motions[k]=safeTrack(s.motions[k],raw.motions[k]);
 for(const k of ['internalColor','sssColor'])if(!/^#[0-9a-f]{6}$/i.test(s[k]||''))s[k]=k==='internalColor'?'#e6f5ff':'#ffc49b';
 for(const k of ['photoAll','environmentRotate'])s[k]=raw[k]===true;
 s.animateRotation=['rotateX','rotateY','rotateZ'].some(k=>s.motions[k].enabled);
 s.animateShape=['volume','deform','twist','waves','hole','cut'].some(k=>s.motions[k].enabled);
 s.animateColor=s.motions.gradientOffset.enabled;s.animateLight=s.lights.some(l=>l.orbit.enabled);
 return s;
}
function safeTrack(base,raw){const t={...base,enabled:raw.enabled===true};for(const k of ['amplitude','cycles','phase'])if(Number.isFinite(raw[k]))t[k]=Math.max(0,Math.min(k==='amplitude'?360:k==='cycles'?8:360,raw[k]));t.cycles=Math.max(1,Math.round(t.cycles));t.direction=raw.direction===-1?-1:1;if(['sine','soft','triangle'].includes(raw.curve))t.curve=raw.curve;if(['wave','cycle'].includes(raw.mode))t.mode=raw.mode;if(['x','y','z'].includes(raw.axis))t.axis=raw.axis;return t;}
