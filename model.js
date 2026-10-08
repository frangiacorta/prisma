import {REFERENCE_PALETTES} from './reference-palettes.js?v=e3a7e09f7af0';
import {EXTRA_BASE,EXTRA_META,MORE_MOODS,legacyLights,newLight,MATERIAL_STYLES} from './studio-model.js?v=e3a7e09f7af0';
import {PARTICLE_META,PARTICLE_DEFAULTS,PARTICLE_GROUPS} from './particle-model.js?v=e3a7e09f7af0';
export const BASE = {
 ...PARTICLE_DEFAULTS,engine:'solid',
  volume:1, stretchX:1, stretchY:1, stretchZ:1, deform:.22, asymmetry:.08, twist:.3, waves:.12, waveScale:3.5,
  hole:0, holeX:0, holeY:0, holeShape:0, cut:0, cutX:.7, cutY:.1, edge:.015,
  transparency:.58, refraction:1.38, thickness:.7, metal:.38, roughness:.12, gloss:.9, iridescence:.7, emission:.02,
  palette:['#7157ff','#42deeb','#fb6fd4','#ffc889'], gradientAngle:35, gradientScale:1, gradientOffset:.1, colorSoftness:.85, glow:.14, grain:.015,
  lightAngle:-35, lightHeight:40, lightPower:1.8, lightSize:.55, lightColor:'#dff5ff', light2:true, light2Angle:130, light2Height:-25, light2Power:1.1, light2Size:.45, light2Color:'#b9a1ff',
  background:'#080a12', background2:'#26204a', bgMode:'solid', bgAngle:35,
  scale:1, positionX:0, positionY:0, rotateX:-8, rotateY:15,
  animateRotation:false, animateShape:true, animateColor:false, animateLight:false, motion:.3, duration:8, speed:1, perfectLoop:true,
  seed:2408
};
const compositionBase={
 volume:1,stretchX:1,stretchY:1,stretchZ:1,deform:0,asymmetry:0,twist:0,waves:0,waveScale:3.5,hole:0,holeX:0,holeY:0,holeShape:0,cut:0,cutX:.7,cutY:.1,edge:0,
 scale:.88,positionX:0,positionY:0,rotateX:15,rotateY:-15,rotateZ:0,background:'#000000',background2:'#000000',bgMode:'solid',glow:0,grain:0,grounding:0,
 animateRotation:false,animateShape:false,animateColor:false,animateLight:false,motions:Object.fromEntries(Object.entries(EXTRA_BASE.motions).map(([k,t])=>[k,{...t,enabled:false}])),duration:12,speed:1,perfectLoop:true
};
function compositionLights(warm='#ffe0bf',cool='#b4ccff'){return [
 {...newLight(1),visible:false,type:'diffuser',x:-2,y:2.1,z:2.6,size:1.7,length:1.9,softness:.75,power:1.6,color:warm},
 {...newLight(2),visible:false,type:'bar',x:1.8,y:.3,z:1.6,size:.45,length:1.7,softness:.5,power:.85,color:cool}
];}
export const PRESETS = [
 {name:'Aurora liquida',label:'Vetro · iridescenza', values:{}},
 {name:'Vetro orbitale',label:'Acqua · trasparenza',values:{deform:0,asymmetry:0,twist:0,waves:0,metal:0,transparency:.94,iridescence:.22,palette:['#417cff','#92e6ff','#ccd6ff','#8c9fff'],refraction:1.33,background:'#070c18',lightPower:1.8,emission:0}},
 {name:'Mercurio',label:'Metallo · fluidità',values:{deform:.48,twist:1.1,asymmetry:.22,stretchY:.9,metal:1,transparency:0,iridescence:.28,roughness:.11,palette:['#7c95bd','#dae8fb','#8a75bd','#eabccb'],background:'#0b0d12',lightPower:2.1}},
 {name:'Radici di rame',label:'Radici intrecciate · rame vissuto',values:{
  ...MATERIAL_STYLES[11].values,...compositionBase,materialName:'Metallo liquido',roughness:.24,gloss:.95,coat:.18,iridescence:.035,environment:'studio',environmentPower:.9,
  petalAmount:1,petalCoverage:1,petalCount:8,petalRows:3,petalLength:1.2,petalWidth:.13,petalSharp:.28,petalBlend:.8,petalRoot:.22,petalRandom:.3,petalWander:.52,petalCoil:.6,petalReentry:.78,petalKnots:.28,petalDisorder:.7,petalGrowth:1,scale:.78,rotateX:28,rotateY:-22,
  palette:['#3d180e','#985233','#dc9868','#ffe0ad'],internalColor:'#a65c37',gradientAngle:28,gradientScale:.8,colorSoftness:.95,
  textureDepth:.3,textureScale:1.5,textureOrganic:.85,textureAngle:20,textureWear:.32,textureWrinkles:.12,surfaceTexture:.035,lights:compositionLights('#ffe1bc','#b9d4e5')
 }},
 {name:'Corallo perlaceo',label:'Rigonfiamenti · perla e grinze',values:{
  ...MATERIAL_STYLES[9].values,...compositionBase,materialName:'Perla',roughness:.28,coat:.42,subsurface:.25,sssColor:'#ffb9ae',environment:'sunset',environmentPower:.8,
  petalAmount:1,petalCoverage:1,petalCount:8,petalRows:3,petalLength:.32,petalWidth:.23,petalSharp:0,petalInflate:1,petalBlend:.84,petalRoot:.4,petalRandom:.32,petalGrowth:.75,petalWander:.08,petalKnots:.18,petalDisorder:.75,deform:.025,asymmetry:.025,scale:.97,rotateX:20,rotateY:-12,
  palette:['#d68480','#f6c2bd','#ffe7d9','#b8dfd6'],internalColor:'#ffe0d5',gradientAngle:45,gradientScale:.7,colorSoftness:1,
  textureDepth:.27,textureScale:1.15,textureOrganic:.82,textureAngle:25,textureWrinkles:.5,textureFolds:.06,lights:compositionLights('#ffe5d6','#d3edf0')
 }},
 {name:'Vela increspata',label:'Vela satinata · pieghe e onde',values:{
  ...MATERIAL_STYLES[12].values,...compositionBase,materialName:'Satinato',metal:.48,roughness:.33,coat:.25,coatRoughness:.18,gloss:.9,iridescence:.16,anisotropy:.55,surfaceTexture:0,environment:'aurora',environmentPower:.85,
  volume:.32,stretchX:1.22,stretchY:.96,stretchZ:1,deform:.16,asymmetry:.12,twist:.6,waves:.025,waveScale:2.5,taper:.12,bendY:.25,lobeAmount:.06,lobes:3,pinch:.08,scale:1,rotateX:20,rotateY:-22,rotateZ:-18,
  palette:['#26395b','#79afb7','#d0e9df','#b7a9df'],internalColor:'#bddeda',gradientAngle:-25,gradientScale:.85,colorSoftness:.95,
  textureDepth:.43,textureScale:.7,textureOrganic:.58,textureAngle:35,textureFolds:.64,textureRipples:.36,textureWrinkles:.06,lights:compositionLights('#e5f1ff','#cebeeb')
 }}
];
export const MOODS = [
 {name:'Aurora',colors:['#7157ff','#42deeb','#fb6fd4','#ffc889']},
 {name:'Oceano',colors:['#043c81','#00b9cc','#92f2e9','#236ced']},
 {name:'Tramonto',colors:['#703bb1','#fb658b','#ffb17b','#ffdfb6']},
 {name:'Neon',colors:['#7026ff','#f02dd7','#26e9ed','#9afa4b']},
 {name:'Perla',colors:['#ddd9ff','#b4e8ed','#f4bdd7','#fff1d8']},
 {name:'Cromo',colors:['#415061','#b0c7df','#e9f2ff','#738ca9']},
 {name:'Lava',colors:['#5a1542','#e62e51','#ff8b2b','#ffe298']},
 {name:'Notte',colors:['#171134','#3b258e','#5779de','#a792ef']}
];
MOODS.push(...MORE_MOODS,...REFERENCE_PALETTES);
// label, minimum, maximum, step. All controls drive the same continuous field.
export const META = {
 ...PARTICLE_META,
 ...EXTRA_META,
 volume:['Volume',.08,1.5,.01],stretchX:['Larghezza',.45,1.7,.01],stretchY:['Altezza',.45,1.7,.01],stretchZ:['Profondità',.45,1.7,.01],deform:['Deformazione',0,.75,.01],asymmetry:['Asimmetria',-.6,.6,.01],twist:['Torsione',-2.5,2.5,.01],waves:['Increspature',0,.4,.01],waveScale:['Frequenza onde',1,9,.1],hole:['Apertura del vuoto',0,.95,.01],holeX:['Vuoto · orizzontale',-.8,.8,.01],holeY:['Vuoto · verticale',-.8,.8,.01],holeShape:['Vuoto · rotondo / quadrato',0,1,.01],cut:['Dimensione del ritaglio',0,1.6,.01],cutX:['Ritaglio · orizzontale',-1.4,1.4,.01],cutY:['Ritaglio · verticale',-1.4,1.4,.01],edge:['Contorno sfumato',0,.45,.005],
 transparency:['Trasparenza',0,1,.01],refraction:['Rifrazione',1,2.4,.01],thickness:['Spessore ottico',0,2,.01],metal:['Metallicità',0,1,.01],roughness:['Rugosità',0,1,.01],gloss:['Lucentezza',0,1,.01],iridescence:['Iridescenza',0,1,.01],emission:['Luce propria',0,1,.01],gradientAngle:['Direzione gradiente',-180,180,1],gradientScale:['Distribuzione colori',.2,3,.01],gradientOffset:['Posizione colori',0,1,.01],colorSoftness:['Transizioni sfumate',0,1,.01],glow:['Diffusione alone',0,1,.01],grain:['Grana',0,.2,.005],
 lightAngle:['Angolo orizzontale',-180,180,1],lightHeight:['Altezza della luce',-85,85,1],lightPower:['Intensità',0,4,.01],lightSize:['Ampiezza riflesso',.05,1,.01],light2Angle:['Angolo orizzontale',-180,180,1],light2Height:['Altezza della luce',-85,85,1],light2Power:['Intensità',0,4,.01],light2Size:['Ampiezza riflesso',.05,1,.01],
 bgAngle:['Direzione sfondo',-180,180,1],scale:['Dimensione figura',.35,1.7,.01],positionX:['Posizione orizzontale',-1.5,1.5,.01],positionY:['Posizione verticale',-1.5,1.5,.01],rotateX:['Rotazione verticale',-180,180,1],rotateY:['Rotazione orizzontale',-180,180,1],motion:['Intensità delle oscillazioni',0,1,.01],duration:['Durata di base (secondi)',2,300,.5],speed:['Velocità globale',.25,2,.05]
};
export const GROUPS={
 shape:['volume','stretchX','stretchY','stretchZ','deform','asymmetry','twist','waves','waveScale','hole','holeX','holeY','holeShape','cut','cutX','cutY','edge','roundness','taper','bendX','bendY','lobeAmount','lobes','pinch','rimRound','holeAspect','cutAspect'],
 material:['transparency','refraction','thickness','metal','roughness','gloss','iridescence','emission','coat','coatRoughness','fresnel','iridShift','iridScale','dispersion','absorption','tintStrength','anisotropy','anisotropyAngle','surfaceTexture','textureDepth','textureScale','textureOrganic','textureAngle','textureWrinkles','textureFolds','textureWear','textureRipples','hollow','wallThickness','translucency','scattering','scatterDirection','thinFilm','filmThickness','subsurface','sssRadius','sssColor','fullness','internalColor','thinShell','renderVersion'],
 color:['palette','gradientAngle','gradientScale','gradientOffset','colorSoftness','glow'],
 light:['lights','environment','environmentAngle','environmentPower','environmentRefraction','environmentRotate','environmentCycles'],
 background:['background','background2','bgAngle','bgMode','bgHeight','bgSoftness','bgWash','bgShade'],
 photo:['exposure','brightness','contrast','saturation','temperature','photoTint','gamma','blacks','highlights','vignette','lensDistortion','grainSize','grain']
};
GROUPS.shape.push('petalAmount','petalCount','petalOpen','petalCurl','petalLength','petalWidth','petalInflate','petalSharp','petalCoverage','petalRows','petalPhase','petalBlend','petalRoot','petalRandom','petalGrowth','petalWander','petalCoil','petalReentry','petalKnots','petalRidges','petalDisorder','stemAmount','stemRadius','stemBend');
GROUPS.shape.push('rotateX','rotateY','rotateZ');
GROUPS.color.push('colorWaveAmount','colorWaveHeight','colorWaveRadius','colorWaveSwirl','colorWaveBands','colorWaveWarp','colorWavePhase');
GROUPS.background.push('grounding','groundShadow','groundCaustic');
for(const [g,keys]of Object.entries(PARTICLE_GROUPS)){GROUPS[g]??=[];GROUPS[g].push(...keys);}
export function preset(i){const s={...structuredClone(BASE),...structuredClone(EXTRA_BASE),...structuredClone(PRESETS[i].values)};s.lights=PRESETS[i].values.lights?structuredClone(PRESETS[i].values.lights):legacyLights(s);if(i===1){s.animateShape=false;s.motions.volume.enabled=false;s.motions.deform.enabled=false;}return s}
export function random(seed){let t=seed>>>0;return()=>{t+=0x6D2B79F5;let a=Math.imul(t^t>>>15,1|t);a^=a+Math.imul(a^a>>>7,61|a);return((a^a>>>14)>>>0)/4294967296}}
function mixColor(a,b,t){return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('')}
export function randomize(state,seed,amount,scope,locks){const r=random(seed),out=structuredClone(state);for(const [group,keys] of Object.entries(GROUPS)){if(locks[group]||(scope!=='all'&&scope!==group))continue;for(const k of keys){if(k==='lights'){out.lights=out.lights.map(l=>({...l,x:l.x+(r()*8-4-l.x)*amount,y:l.y+(r()*8-4-l.y)*amount,z:l.z+(r()*8-4-l.z)*amount,power:l.power+(r()*3+.5-l.power)*amount,color:mixColor(l.color,MOODS[Math.floor(r()*MOODS.length)].colors[0],amount)}));continue}if(k==='palette'){const palette=MOODS[Math.floor(r()*MOODS.length)].colors;out.palette=out.palette.map((c,i)=>mixColor(c,palette[i%palette.length],amount));continue}if(typeof out[k]==='string'){if(!/^#[0-9a-f]{6}$/i.test(out[k]))continue;const color=k.startsWith('background')?MOODS[Math.floor(r()*MOODS.length)].colors[0]:MOODS[Math.floor(r()*MOODS.length)].colors[2];out[k]=mixColor(out[k],color,amount);continue}const m=META[k];if(!m)continue;let target=m[1]+r()*(m[2]-m[1]);if(k==='hole'||k==='cut')target=r()<.65?0:target*.65;if(k==='edge')target*=.5;if(k==='lightPower'||k==='light2Power')target=Math.max(.4,target);out[k]=Math.max(m[1],Math.min(m[2],out[k]+(target-out[k])*amount))}}out.seed=seed;return out}
