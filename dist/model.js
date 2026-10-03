export const BASE = {
  volume:1, stretchX:1, stretchY:1, stretchZ:1, deform:.22, asymmetry:.08, twist:.3, waves:.12, waveScale:3.5,
  hole:0, holeX:0, holeY:0, holeShape:0, cut:0, cutX:.7, cutY:.1, edge:.015,
  transparency:.58, refraction:1.38, thickness:.7, metal:.38, roughness:.12, gloss:.9, iridescence:.7, emission:.02,
  palette:['#7157ff','#42deeb','#fb6fd4','#ffc889'], gradientAngle:35, gradientScale:1, gradientOffset:.1, colorSoftness:.85, glow:.14, grain:.015,
  lightAngle:-35, lightHeight:40, lightPower:1.8, lightSize:.55, lightColor:'#dff5ff', light2:true, light2Angle:130, light2Height:-25, light2Power:1.1, light2Size:.45, light2Color:'#b9a1ff',
  background:'#080a12', background2:'#26204a', bgMode:'solid', bgAngle:35,
  scale:1, positionX:0, positionY:0, rotateX:-8, rotateY:15,
  animateRotation:false, animateShape:true, animateColor:false, animateLight:false, motion:.3, duration:8, speed:1,
  seed:2408
};
export const PRESETS = [
 {name:'Aurora liquida',label:'Vetro · iridescenza', values:{}},
 {name:'Vetro orbitale',label:'Acqua · trasparenza',values:{deform:0,asymmetry:0,twist:0,waves:0,metal:0,transparency:.94,iridescence:.22,palette:['#417cff','#92e6ff','#ccd6ff','#8c9fff'],refraction:1.33,background:'#070c18',lightPower:1.8,emission:0}},
 {name:'Mercurio',label:'Metallo · fluidità',values:{deform:.48,twist:1.1,asymmetry:.22,stretchY:.9,metal:1,transparency:0,iridescence:.28,roughness:.11,palette:['#7c95bd','#dae8fb','#8a75bd','#eabccb'],background:'#0b0d12',lightPower:2.1}},
 {name:'Eclisse rosa',label:'Semiluna · luce',values:{deform:0,asymmetry:0,twist:0,waves:0,volume:.45,cut:.9,cutX:.4,cutY:.16,metal:.3,transparency:.08,iridescence:.3,emission:.8,glow:.7,palette:['#ed4eaf','#9c44f4','#ff91ca','#e858fb'],background:'#07060c',rotateX:0,rotateY:0}},
 {name:'Anello aurora',label:'Vuoto · riflessi',values:{hole:.57,holeShape:0,volume:.36,deform:.08,asymmetry:0,twist:.15,metal:.75,transparency:.1,iridescence:.9,rotateX:24,rotateY:-16,palette:['#3c79ff','#e267fb','#6dffe0','#ffb084']}},
 {name:'Nebbia pastello',label:'Macchia · gradiente',values:{volume:.12,deform:.45,asymmetry:.18,twist:.2,stretchX:1.18,stretchY:.87,edge:.38,metal:0,transparency:0,roughness:1,gloss:0,iridescence:0,emission:.12,lightPower:.2,light2Power:0,glow:.2,palette:['#b2e5df','#b4a8ee','#f3a8ca','#a9d5f2'],background:'#eff0f6',gradientScale:1.4,rotateX:0,rotateY:0,grain:.05}}
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
// label, minimum, maximum, step. All controls drive the same continuous field.
export const META = {
 volume:['Volume',.08,1.5,.01],stretchX:['Larghezza',.45,1.7,.01],stretchY:['Altezza',.45,1.7,.01],stretchZ:['Profondità',.45,1.7,.01],deform:['Deformazione',0,.75,.01],asymmetry:['Asimmetria',-.6,.6,.01],twist:['Torsione',-2.5,2.5,.01],waves:['Increspature',0,.4,.01],waveScale:['Frequenza onde',1,9,.1],hole:['Apertura del vuoto',0,.95,.01],holeX:['Vuoto · orizzontale',-.8,.8,.01],holeY:['Vuoto · verticale',-.8,.8,.01],holeShape:['Vuoto · rotondo / quadrato',0,1,.01],cut:['Dimensione del ritaglio',0,1.6,.01],cutX:['Ritaglio · orizzontale',-1.4,1.4,.01],cutY:['Ritaglio · verticale',-1.4,1.4,.01],edge:['Contorno sfumato',0,.45,.005],
 transparency:['Trasparenza',0,1,.01],refraction:['Rifrazione',1,2.4,.01],thickness:['Spessore ottico',0,2,.01],metal:['Metallicità',0,1,.01],roughness:['Rugosità',0,1,.01],gloss:['Lucentezza',0,1,.01],iridescence:['Iridescenza',0,1,.01],emission:['Luce propria',0,1,.01],gradientAngle:['Direzione gradiente',-180,180,1],gradientScale:['Distribuzione colori',.2,3,.01],gradientOffset:['Posizione colori',0,1,.01],colorSoftness:['Transizioni sfumate',0,1,.01],glow:['Diffusione alone',0,1,.01],grain:['Grana',0,.2,.005],
 lightAngle:['Angolo orizzontale',-180,180,1],lightHeight:['Altezza della luce',-85,85,1],lightPower:['Intensità',0,4,.01],lightSize:['Ampiezza riflesso',.05,1,.01],light2Angle:['Angolo orizzontale',-180,180,1],light2Height:['Altezza della luce',-85,85,1],light2Power:['Intensità',0,4,.01],light2Size:['Ampiezza riflesso',.05,1,.01],
 bgAngle:['Direzione sfondo',-180,180,1],scale:['Dimensione figura',.35,1.7,.01],positionX:['Posizione orizzontale',-1.5,1.5,.01],positionY:['Posizione verticale',-1.5,1.5,.01],rotateX:['Rotazione verticale',-180,180,1],rotateY:['Rotazione orizzontale',-180,180,1],motion:['Ampiezza del movimento',0,1,.01],duration:['Durata ciclo (secondi)',2,20,.5],speed:['Velocità',.25,2,.25]
};
export const GROUPS={
 shape:['volume','stretchX','stretchY','stretchZ','deform','asymmetry','twist','waves','waveScale','hole','holeX','holeY','holeShape','cut','cutX','cutY','edge'],
 material:['transparency','refraction','thickness','metal','roughness','gloss','iridescence','emission'],
 color:['palette','gradientAngle','gradientScale','gradientOffset','colorSoftness','glow','grain'],
 light:['lightAngle','lightHeight','lightPower','lightSize','lightColor','light2Angle','light2Height','light2Power','light2Size','light2Color'],
 background:['background','background2','bgAngle']
};
export function preset(i){return {...structuredClone(BASE),...structuredClone(PRESETS[i].values)}}
export function random(seed){let t=seed>>>0;return()=>{t+=0x6D2B79F5;let a=Math.imul(t^t>>>15,1|t);a^=a+Math.imul(a^a>>>7,61|a);return((a^a>>>14)>>>0)/4294967296}}
function mixColor(a,b,t){return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('')}
export function randomize(state,seed,amount,scope,locks){const r=random(seed),out=structuredClone(state);for(const [group,keys] of Object.entries(GROUPS)){if(locks[group]||(scope!=='all'&&scope!==group))continue;for(const k of keys){if(k==='palette'){const palette=MOODS[Math.floor(r()*MOODS.length)].colors;out.palette=out.palette.map((c,i)=>mixColor(c,palette[i],amount));continue}if(typeof out[k]==='string'){const color=k.startsWith('background')?MOODS[Math.floor(r()*MOODS.length)].colors[0]:MOODS[Math.floor(r()*MOODS.length)].colors[2];out[k]=mixColor(out[k],color,amount);continue}const m=META[k];if(!m)continue;let target=m[1]+r()*(m[2]-m[1]);if(k==='hole'||k==='cut')target=r()<.65?0:target*.65;if(k==='edge')target*=.5;if(k==='lightPower'||k==='light2Power')target=Math.max(.4,target);out[k]=Math.max(m[1],Math.min(m[2],out[k]+(target-out[k])*amount))}}out.seed=seed;return out}
