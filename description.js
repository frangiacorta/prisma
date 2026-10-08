import {META,MOODS,GROUPS} from './model.js?v=16c153490221';
import {newLight,MAX_LIGHTS,MAX_COLORS,LIGHT_META,LIGHT_TYPES,MATERIAL_STYLES,SHAPE_TRACKS,TRACK_META,track,TEXTURE_STYLES} from './studio-model.js?v=16c153490221';
import {material,sculpt,motionPreset,upgrade,setFullness,SCULPT_EXAMPLES,MOTION_PRESETS,textureStyle} from './creative-model.js?v=16c153490221';

const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,' ').trim();
const isColor=c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c);
const namedColors={nero:'#000000',nera:'#000000',bianco:'#ffffff',bianca:'#ffffff',rosso:'#ff305e',rossa:'#ff305e',rosa:'#ff69b4',blu:'#365eff',azzurro:'#87cfff',azzurra:'#87cfff',ciano:'#4de5ef',cyan:'#4de5ef',viola:'#ad75ff',verde:'#75d9a5',giallo:'#ffe18b',gialla:'#ffe18b',arancione:'#ff985c',grigio:'#6c7280',grigia:'#6c7280',argento:'#c8d3e0',oro:'#e6bc64',lavanda:'#b7a3ea',salvia:'#a6bbaa',corallo:'#ff736d',turchese:'#49cec3',petrolio:'#145461',crema:'#eee1c9',avorio:'#f5eedc'};
for(const [forms,base] of [['neri nere','nero'],['bianchi bianche','bianco'],['rossi rosse','rosso'],['azzurri azzurre','azzurro'],['verdi','verde'],['gialli gialle','giallo'],['grigi grigie','grigio'],['arancioni','arancione']])for(const word of forms.split(' '))namedColors[word]=namedColors[base];
function colorsIn(text){const result=[];const re=new RegExp('#(?:[0-9a-f]{6}|[0-9a-f]{3})\\b|\\b(?:'+Object.keys(namedColors).join('|')+')\\b','gi');for(const m of text.matchAll(re)){let c=m[0][0]==='#'?m[0].toLowerCase():namedColors[m[0].toLowerCase()];if(c.length===4)c='#'+c.slice(1).split('').map(q=>q+q).join('');result.push(c);}return result;}
function scalar(key,value){const m=Object.hasOwn(META,key)?META[key]:null;if(!m||!Number.isFinite(value)||value<m[1]||value>m[2])throw Error('Valore non valido per '+(m?.[0]||key));return m[3]>=1?Math.round(value):value;}
const shapeNames=[...new Set(['sfera','goccia','blob','macchia','disco','anello','semiluna',...SCULPT_EXAMPLES.map(q=>normalize(q.name))])];
function shape(s,name){if(!shapeNames.includes(name))throw Error('Forma non disponibile');for(const k of ['deform','asymmetry','twist','waves','hole','cut','edge','roundness','taper','bendX','bendY','lobeAmount','pinch','rimRound','petalAmount','petalBlend','petalRoot','petalRandom','petalWander','petalCoil','petalReentry','petalKnots','petalRidges','petalDisorder','stemAmount'])s[k]=0;s.petalGrowth=1;for(const k of ['volume','stretchX','stretchY','stretchZ','holeAspect','cutAspect'])s[k]=1;for(const k of SHAPE_TRACKS)if(s.motions[k])s.motions[k].enabled=false;
 if(name==='goccia')Object.assign(s,{taper:.38,stretchY:1.18,stretchX:.9});if(name==='blob')Object.assign(s,{deform:.3,asymmetry:.13,twist:.3});if(name==='macchia')Object.assign(s,{volume:.08,stretchX:1.2,deform:.34,edge:.22});if(name==='disco')s.volume=.1;if(name==='anello')Object.assign(s,{hole:.55,volume:.45});if(name==='semiluna')Object.assign(s,{cut:.9,cutX:.4,cutY:.1,volume:.5});const i=SCULPT_EXAMPLES.findIndex(q=>normalize(q.name)===name);if(i>=0)sculpt(s,i);return s;}

// Atomic, allowlisted operations shared by text commands and browser agents.
// No generated code is evaluated and an invalid plan never changes the editor.
export function applyDescriptionPlan(current,plan){
 if(!plan||!Array.isArray(plan.operations)||plan.operations.length>100)throw Error('La richiesta non contiene modifiche valide.');const s=structuredClone(current);const notes=[];
 for(const o of plan.operations){if(!o||typeof o!=='object')throw Error('Comando non valido');
  if(o.type==='set'){const value=scalar(o.key,o.value);if(GROUPS.material.includes(o.key)||/^(environment|film|petal|stem|colorWave|ground)/.test(o.key))upgrade(s);s[o.key]=value;if(o.key==='fullness')setFullness(s,value);notes.push(META[o.key][0]);}
  else if(o.type==='shape'){upgrade(s);shape(s,o.name);notes.push('Forma: '+o.name);}
  else if(o.type==='material'){if(!Number.isInteger(o.index)||!MATERIAL_STYLES[o.index])throw Error('Materia non disponibile');material(s,o.index);notes.push('Materia: '+MATERIAL_STYLES[o.index].name);}
  else if(o.type==='textureStyle'){if(!Number.isInteger(o.index)||!TEXTURE_STYLES[o.index])throw Error('Texture non disponibile');textureStyle(s,o.index);notes.push('Texture: '+TEXTURE_STYLES[o.index].name);}
  else if(o.type==='palette'){if(!Array.isArray(o.colors)||!o.colors.length||o.colors.length>MAX_COLORS||!o.colors.every(isColor))throw Error('Palette non valida');s.palette=o.colors.map(c=>c.toLowerCase());notes.push('Palette');}
  else if(o.type==='addColor'){if(!isColor(o.color)||s.palette.length>=MAX_COLORS)throw Error('Puoi usare fino a 12 colori');s.palette.push(o.color.toLowerCase());notes.push('Colore aggiunto');}
  else if(o.type==='removeColor'){if(s.palette.length<=1)throw Error('Conserva almeno un colore');if(!Number.isInteger(o.index)||o.index<0||o.index>=s.palette.length)throw Error('Colore non trovato');s.palette.splice(o.index,1);notes.push('Colore rimosso');}
  else if(o.type==='color'){if(!['internalColor','sssColor'].includes(o.key)||!isColor(o.value))throw Error('Colore non valido');upgrade(s);s[o.key]=o.value;notes.push(o.key==='internalColor'?'Colore interno':'Colore sottopelle');}
  else if(o.type==='background'){if(!['solid','gradient','transparent','studio'].includes(o.mode))throw Error('Sfondo non valido');if(o.colors&&(!Array.isArray(o.colors)||!o.colors.length||!o.colors.every(isColor)))throw Error('Colori dello sfondo non validi');s.bgMode=o.mode;if(o.colors){s.background=o.colors[0];s.background2=o.colors[1]||o.colors[0];}notes.push('Sfondo');}
  else if(o.type==='environment'){if(!['studio','sky','sunset','neon','aurora','aquarium','city'].includes(o.name))throw Error('Ambiente non valido');upgrade(s);s.environment=o.name;notes.push('Ambiente riflesso');}
  else if(o.type==='light'){upgrade(s);if(o.action==='remove'){const i=s.lights.findIndex(l=>l.id===o.id);if(i<0)throw Error('Luce non trovata');s.lights.splice(i,1);notes.push('Luce rimossa');continue;}let l;if(o.action==='add'){if(s.lights.length>=MAX_LIGHTS)throw Error('Puoi usare fino a 8 luci');l=newLight(Math.max(0,...s.lights.map(q=>q.id))+1);}else if(o.action==='edit'){l=s.lights.find(q=>q.id===o.id);if(!l)throw Error('Luce non trovata');}else throw Error('Azione luce non valida');for(const [k,v] of Object.entries(o.values||{})){if(Object.hasOwn(LIGHT_META,k)){const m=LIGHT_META[k];if(!Number.isFinite(v)||v<m[1]||v>m[2])throw Error('Valore luce non valido');l[k]=m[3]>=1?Math.round(v):v;}else if(k==='color'&&isColor(v))l.color=v;else if(k==='type'&&LIGHT_TYPES.some(q=>q[0]===v))l.type=v;else if(['visible','enabled'].includes(k)&&typeof v==='boolean')l[k]=v;else throw Error('Proprietà luce non valida');}if(o.action==='add')s.lights.push(l);notes.push(o.action==='add'?'Luce aggiunta':'Luce spostata / modificata');}
  else if(o.type==='motionPreset'){if(!MOTION_PRESETS.some(q=>q[0]===o.name))throw Error('Movimento non disponibile');motionPreset(s,o.name);notes.push('Movimento');}
  else if(o.type==='loop'){if(typeof o.perfect!=='boolean')throw Error('Modalità loop non valida');s.perfectLoop=o.perfect;if(o.perfect){for(const t of Object.values(s.motions||{}))t.cycles=Math.max(1,Math.round(t.cycles||1));for(const l of s.lights||[])for(const t of [l.orbit,l.pulse])if(t)t.cycles=Math.max(1,Math.round(t.cycles||1));for(const key of ['environmentCycles','filmCycles'])if(Number.isFinite(s[key]))s[key]=Math.max(1,Math.round(s[key]));}notes.push(o.perfect?'Loop perfetto attivo':'Movimento libero');}
  else if(o.type==='motionTrack'){
   if(!Object.hasOwn(TRACK_META,o.key)||!o.values||typeof o.values!=='object'||Array.isArray(o.values))throw Error('Movimento non disponibile');
   const values={};for(const [key,value] of Object.entries(o.values)){
    if(key==='enabled'&&typeof value==='boolean')values[key]=value;
    else if(key==='amplitude'&&Number.isFinite(value)&&value>=TRACK_META[o.key][1]&&value<=TRACK_META[o.key][2])values[key]=value;
    else if(key==='cycles'&&Number.isFinite(value)&&value>=(s.perfectLoop===false?.1:1)&&value<=8&&(s.perfectLoop===false||Number.isInteger(value)))values[key]=value;
    else if(key==='phase'&&Number.isFinite(value)&&value>=0&&value<=360)values[key]=value;
    else if(key==='direction'&&(value===1||value===-1))values[key]=value;
    else if(key==='curve'&&['sine','soft','triangle'].includes(value))values[key]=value;
    else if(key==='mode'&&(['wave'].includes(value)||(value==='cycle'&&/^(rotate[XYZ]|gradientOffset|colorWavePhase|petalPhase)$/.test(o.key))))values[key]=value;
    else throw Error('Proprietà del movimento non valida');
   }upgrade(s);s.motions[o.key]={...(s.motions[o.key]||track()),...values};notes.push('Movimento: '+TRACK_META[o.key][0]);
  }
  else if(o.type==='motionStyle'){
   const scope=o.scope??'all';if(!['gentle','smooth','slower','faster'].includes(o.style)||!['all','rotation','lights'].includes(scope)||scope!=='all'&&['slower','faster'].includes(o.style))throw Error('Stile del movimento non valido');
   // Motion editing must not upgrade or replace a material, reset a phase, or
   // substitute a preset. Existing continuous rotations already have smooth speed.
   const quality=o.style==='gentle'||o.style==='smooth',factor=o.style==='gentle'?.65:.9;
   let waves=0;
   if(quality){
    for(const [key,t] of Object.entries(s.motions||{}))if(t.enabled&&scope!=='lights'&&(scope!=='rotation'||/^rotate[XYZ]$/.test(key))&&t.mode!=='cycle'){
     t.curve='sine';if(scope!=='all')t.amplitude=(t.amplitude||0)*factor;waves++;
    }
    if(scope!=='rotation')for(const l of s.lights||[])for(const key of ['orbit','pulse']){const t=l[key];if(t?.enabled&&(key==='pulse'||t.mode!=='cycle')){t.curve='sine';if(scope!=='all')t.amplitude=(t.amplitude||0)*factor;waves++;}}
    const active=Object.values(s.motions||{}).some(t=>t.enabled)||(s.lights||[]).some(l=>l.orbit?.enabled||l.pulse?.enabled)||s.environmentRotate||(s.filmFlow||0)>0||(s.filmSwirl||0)>0;
    if(!active&&scope!=='lights'){
     s.motions??={};s.motions.rotateY={...track(12,true),curve:'sine'};
     if(!(s.motion>0))s.motion=.3;
     notes.push('Rotazione delicata attivata');waves++;
    }
    if(scope==='all'){
     s.motion=Math.max(META.motion[1],Math.min(META.motion[2],(s.motion??.3)*factor));
     s.speed=Math.max(META.speed[1],Math.min(META.speed[2],(s.speed??1)*(o.style==='gentle'?.8:.9)));
    }
    if(waves)notes.push('Curve del movimento fluide');
    if(scope==='all')notes.push('Intensità delle oscillazioni');
   }else s.speed=Math.max(META.speed[1],Math.min(META.speed[2],(s.speed??1)*(o.style==='slower'?.75:1/.75)));
   if(scope==='all')notes.push('Velocità globale');
  }
  else if(o.type==='stopMotion'){for(const t of Object.values(s.motions))t.enabled=false;for(const l of s.lights){l.orbit.enabled=false;l.pulse.enabled=false;}s.environmentRotate=false;s.filmFlow=0;s.filmSwirl=0;notes.push('Animazione ferma');}
  else throw Error('Comando non disponibile');
 }
 const finalNotes=[...new Set(notes)].map(note=>plan.operations.some(o=>o.type==='motionStyle')?(note===META.speed[0]?note+': '+Number(s.speed.toFixed(2))+'×':note===META.motion[0]?note+': '+Math.round(s.motion*100)+'%':note):note);
 return {state:s,notes:finalNotes,changed:JSON.stringify(s)!==JSON.stringify(current)};
}

const attributes=[
 ['trasparen(?:za|te|ti)','transparency',.2],['metall(?:o|ico|ica|ici|izzata|izzato)','metal',.2],['iridescen(?:za|te|ti)','iridescence',.2],['lucen(?:tezza|te|ti)|lucid(?:o|a|e|i)','gloss',.2],['rugos(?:ita|o|a|e|i)|ruvid(?:o|a|e|i)','roughness',.2],['spessore|pien(?:ezza|o|a)','fullness',.2],['vuot(?:ezza|o|a)','hollow',.2],['scattering|diffusione interna','scattering',.2],['subsurface|sss|sottopelle','subsurface',.2],['organic(?:a|o|he|i|ita)','deform',.08],['allungat(?:a|o)|alta|alto','stretchY',.2],['schiacciat(?:a|o)|appiattit(?:a|o)|piatta|piatto','volume',-.2],['grand(?:e|i)','scale',.15],['piccol(?:a|o|e|i)','scale',-.15],['contrasto','contrast',.2],['luminosita|luminos(?:a|o)','brightness',.1],['scur(?:a|o)','brightness',-.1],['esposizione','exposure',.35],['saturazione|saturat(?:a|o)','saturation',.2],['grana','grain',.025],['distorsione(?: lente)?','lensDistortion',.1],['alone|bagliore','glow',.1],['caustica','groundCaustic',.2],['ombra(?: sul fondale)?','groundShadow',.2],['sfumat(?:a|o|e|i)|morbidezza del contorno','edge',.08]
];
const growthAttributes=[
 ['curv\\w*|arricci\\w*|piegat\\w*','petalCurl',.22],['cort\\w*','petalLength',-.2],['lung\\w*','petalLength',.2],['appuntit\\w*|acut\\w*|affilat\\w*','petalSharp',.2],['arrotondat\\w*|spuntat\\w*','petalSharp',-.2],['larg\\w*|grass\\w*|spess\\w*','petalWidth',.05],['sottil\\w*|fin[ei]','petalWidth',-.045],['gonfi\\w*|bombat\\w*','petalInflate',.2],['sinuos\\w*|tortuos\\w*|ondulat\\w*|serpeggi\\w*|stort\\w*|distor\\w*','petalWander',.25],['nod\\w*|bitorzol\\w*|nervos\\w*|nerborut\\w*|irruvid\\w*|rovina\\w*|rugos\\w*|ruvid\\w*','petalKnots',.3],['nervatur\\w*|costolat\\w*|striat\\w*|rigat\\w*','petalRidges',.3],['irregolar\\w*|disordinat\\w*|casual\\w*|sfalsat\\w*|sfasat\\w*|asimmetric\\w*|spars[ei]|distribuzione','petalDisorder',.3],['geometric\\w*|ordinat\\w*|regolar\\w*|simmetric\\w*','petalDisorder',-.3],['avvol\\w*|attorcigl\\w*|intrecc\\w*','petalCoil',.3],['radicat\\w*|rientr\\w*','petalReentry',.25]
];
const growthWords='spine|spina|punte|punta|aghi|ago|borchie|borchia|petali|petalo|radici|radice|corde|corda|rigonfiamenti|rigonfiamento|protuberanze|bozzi';
const growthRe=new RegExp('\\b(?:'+growthWords+')\\b');
const textureAttributes=[['grinz\\w*|rugh[ae]|rughette','textureWrinkles',.3],['piegh[ae]|pieghett\\w*','textureFolds',.3],['abras\\w*|usur\\w*|graffi\\w*|logor\\w*|consumat\\w*|rovinat\\w*','textureWear',.3],['increspat\\w*','textureRipples',.3]];
const textureKeys=['textureWrinkles','textureFolds','textureWear','textureRipples'];
const textureAliases=[['grinze','textureWrinkles'],['rughe','textureWrinkles'],['pieghe','textureFolds'],['abrasioni','textureWear'],['usura','textureWear'],['graffi','textureWear'],['increspature della superficie','textureRipples'],['increspature superficie','textureRipples'],['increspature della texture','textureRipples'],['rilievo della superficie','textureDepth'],['rilievo superficie','textureDepth'],['rilievo texture','textureDepth'],['profondita texture','textureDepth'],['scala della texture','textureScale'],['scala texture','textureScale'],['scala della trama','textureScale'],['scala trama','textureScale'],['densita texture','textureScale'],['organicita texture','textureOrganic'],['irregolarita della texture','textureOrganic'],['irregolarita della superficie','textureOrganic'],['irregolarita texture','textureOrganic'],['regolarita della texture','textureOrganic',true],['regolarita della superficie','textureOrganic',true],['regolarita texture','textureOrganic',true],['direzione texture','textureAngle']];
const typoWords={nerborute:'nerborute',nervorute:'nerborute',nerborutee:'nerborute',raidi:'radici',radic:'radici',spie:'spine',spnie:'spine',petaali:'petali',petli:'petali',attorcigliarsdi:'attorcigliarsi',gradualemnte:'gradualmente',comuqne:'comunque',sfodo:'sfondo',rabdomizzazione:'randomizzazione',traspareza:'trasparenza',trasparenxa:'trasparenza',metalllo:'metallo',nerveose:'nervose',nerboruti:'nerborute',irregikarita:'irregolarita',amniera:'maniera'};
const commandText=text=>normalize(text).replace(/\b[a-z]+\b/g,w=>typoWords[w]||w).replace(/\bsfondo di base\b/g,'sfondo').replace(/\b(dallas|dellas)\b/g,'dalla');
function escapeRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
const setting=(key,value)=>({type:'set',key,value:Math.max(META[key][1],Math.min(META[key][2],value))});
const aliases=[...textureAliases,['metallo','metal'],['trasparente','transparency'],['iridescente','iridescence'],['lucido','gloss'],['rugosita','roughness'],['spessore','fullness'],['vuotezza','hollow'],['scattering','scattering'],['sss','subsurface'],['sfumatura','edge'],['alone','glow'],['caustica','groundCaustic'],['ombra','groundShadow'],['dimensione','scale'],['lunghezza spine','petalLength'],['acutezza','petalSharp'],['curvatura spine','petalCurl'],['fusione','petalBlend'],['radici','petalRoot'],['irregolarita','petalRandom'],['crescita','petalGrowth'],['sinuosita','petalWander'],['avvolgimento','petalCoil'],['rientro','petalReentry'],['nodi','petalKnots'],['nervature','petalRidges'],['disordine','petalDisorder'],['durata','duration'],['durata del loop','duration'],['durata del ciclo','duration'],['loop di','duration'],['loop da','duration'],['velocita del movimento','speed'],['velocita animazione','speed'],['velocita','speed'],['intensita del movimento','motion'],['intensita moto','motion'],...Object.entries(META).flatMap(([key,m])=>[[normalize(key),key],[normalize(m[0]).replace(/\s*·.*$/,''),key]])].sort((a,b)=>b[0].length-a[0].length);

// Each recognized phrase is claimed separately. Residual requests remain visible
// in the UI, including when another part of the same sentence was understood.
export function interpretDescription(text,current){
 if(typeof text!=='string'||text.trim().length<2||text.length>1600)throw Error('Scrivi una descrizione tra 2 e 1600 caratteri.');
 const clauses=commandText(text).split(/[,;\n](?!\d)|\s+(?:ma|pero)\s+|\s+e\s+(?=(?:sfondo|fondale|palette|luce|luci|texture|trama|superficie|movimento|moto|animazione|rotazione|aggiung\w*|tog\w*|rimuov\w*|rend\w*|fai|metti|sposta\w*|senza|non|meno|piu|con\s+(?:sfondo|palette|luce|texture|trama|superficie)|spine|petali|radici|corde)\b)|\s+(?:con|su)\s+(?=(?:sfondo|fondale|palette|luce|luci)\b)/).map(q=>q.trim()).filter(Boolean);
 const operations=[],unrecognized=[];let working=structuredClone(current),scope=current.petalAmount>0?'growth':'shape';
 const push=(...ops)=>{operations.push(...ops);working=applyDescriptionPlan(working,{operations:ops}).state;};
 for(const clause of clauses){
  const start=operations.length,mask=Array(clause.length).fill(false);
  const consume=(index,length)=>{for(let i=index;i<index+length;i++)mask[i]=true;};
  const remaining=()=>[...clause].map((c,i)=>mask[i]?' ':c).join('');
  const claim=(pattern,callback)=>{const re=new RegExp(pattern.source||pattern,'g');let any=false;for(const m of remaining().matchAll(re)){any=true;consume(m.index,m[0].length);callback?.(m);}return any;};
  const values=()=>colorsIn(remaining());
  const flags=index=>{const prefix=clause.slice(0,index),last=prefix.split(/\b(?:con|di colore)\b/).at(-1);return {negative:/\b(?:senza|togli\w*|rimuov\w*|elimina\w*|spegni|zero|nessun\w*|no|non)\b/.test(last),less:/\bmeno\b/.test(last),factor:/\b(?:molto|tant\w*|massim\w*|completamente)\b/.test(last)?1.7:/\b(?:poco|leggermente|appena)\b/.test(last)?.5:1,max:/\b(?:massim\w*|completamente)\b/.test(last)};};
  const adjust=(key,delta,m)=>{const f=flags(m.index);push(setting(key,f.negative?(delta<0?META[key][2]:Math.max(0,META[key][1])):f.max?META[key][delta<0?1:2]:(working[key]??0)+delta*(f.less?-1:1)*f.factor));};
  if(/\b(?:non (?:cambiare|toccare|modificare)|mantieni|conserva|lascia invariat)/.test(clause))continue;
  const lightTarget=/\b(?:luce|luci|neon|faro|softbox|alogeno)\b/.test(clause)&&!/\b(?:luce propria|luce centrale|alte luci|luce interna della materia)\b/.test(clause);
  const backgroundTarget=/\b(?:sfondo|background|fondale)\b/.test(clause)&&!/\b(?:ombra|caustica)\b/.test(clause);
  const explicitGrowth=growthRe.test(clause),colorTarget=/\b(?:palette|colore|colori|mood)\b/.test(clause);
  const textureTarget=/\b(?:texture|trama|superficie|materia|materiale|grinz\w*|rugh[ae]|rughette|piegh[ae]|pieghett\w*|abras\w*|usur\w*|graffi\w*)\b/.test(clause);
  if(backgroundTarget)scope='background';else if(lightTarget)scope='light';else if(textureTarget)scope='texture';else if(explicitGrowth)scope='growth';else if(colorTarget)scope='color';else if(/\b(?:sfera|figura|oggetto|volume|trasparen\w*|metallo|contrasto|grana|caustica|alone)\b/.test(clause))scope='shape';
  const texture=scope==='texture',growth=!texture&&(explicitGrowth||scope==='growth');
  let motionAdjusted=false,motionQualityAdjusted=false;
  claim(/\b(?:(disattiv\w*|spegni|senza|non)\s+(?:il\s+)?|(?:attiv\w*|metti|voglio)\s+(?:il\s+)?)?loop perfetto\b/,m=>push({type:'loop',perfect:!m[1]}));
  claim(/\b(?:movimento libero|loop libero)\b/,()=>push({type:'loop',perfect:false}));
  // All independent numeric assignments in one sentence are applied, not just the first.
  const motionNumbers=[];
  const scopedAliases=texture?[['irregolarita','textureOrganic'],['regolarita','textureOrganic',true],['scala','textureScale'],['densita','textureScale'],['rilievo','textureDepth'],['direzione','textureAngle']]:[];
  if(!lightTarget&&!backgroundTarget){for(const [label,key,inverse] of [...scopedAliases,...aliases]){if(!META[key]||label==='increspature'&&(key==='textureRipples'&&!texture||key==='waves'&&texture))continue;claim(new RegExp('(?:^|\\b)'+escapeRe(label)+'\\s*(?:[:=]|(?:a|al|di|del|circa)\\s+)?\\s*(-?\\d+(?:[.,]\\d+)?)\\s*(%|percento|per cento)?(?:\\s*(?:secondi|secondo|sec|gradi|nm|px|x)\\b)?(?=\\s|$|[.!?])'),m=>{let value=Number(m[1].replace(',','.'));if(m[2])value=META[key][1]+(META[key][2]-META[key][1])*value/100;if(inverse)value=META[key][1]+META[key][2]-value;const op=setting(key,value);if(key==='speed'||key==='motion')motionNumbers.push(op);else push(op);});}}

  if(current.engine==='particles'){
   // Particle clauses are consumed before the solid-shape vocabulary.
   for(const [label,key] of [['diametro particelle','pSize'],['dimensione particelle','pSize'],['densita','pCount'],['scie','pTrailCount'],['rientro','pReentry'],['magnetismo','pMagnet'],['repulsione','pRepel'],['attrazione','pAttract'],['vitalita','pLife'],['connettivita','pConnect'],['neuronale','pNeural']]){
    claim(new RegExp('\\b'+label+'\\s*(?:[:=]|a|al)?\\s*(-?\\d+(?:[.,]\\d+)?)\\s*(%|percento)?(?:\\s*px)?(?=\\s|$|[.!?])'),m=>{const n=Number(m[1].replace(',','.'));push(setting(key,m[2]?META[key][1]+n/100*(META[key][2]-META[key][1]):n));});
   }
   claim(/\bparticelle\s+(finissime|microscopiche|piccolissime|piccole|grandi)\b/,m=>push(setting('pSize',m[1]==='grandi'?4:m[1]==='piccole'?.7:.25)));
   claim(/\b(?:piu|meno)\s+(vivo|viva|vivente|neuronale|neurale|organico|organica|denso|densa|compatto|compatta|frattale)\b/,m=>{const less=m[0].startsWith('meno'),word=m[1];let key=/neuron|neural/.test(word)?'pNeural':/viv/.test(word)?'pLife':/organic/.test(word)?'pOrganic':/dens/.test(word)?'pCount':/compatt/.test(word)?'pCohesion':'pDetail';const delta=key==='pCount'?30000:key==='pDetail'?1:.25;push(setting(key,working[key]+(less?-1:1)*delta));});
   for(const [word,key,delta]of [['repulsione','pRepel',.4],['attrazione','pAttract',.4],['magnetismo','pMagnet',.5],['rientro','pReentry',.25],['segnali','pSignal',.25],['connettivita','pConnect',.25],['organicita','pOrganic',.3],['coesione','pCohesion',.25],['casualita','pRandom',.25],['scie','pTrailCount',500]])claim(new RegExp('\\b(piu|meno)\\s+'+word+'\\b'),m=>push(setting(key,working[key]+(m[1]==='meno'?-1:1)*delta)));
   claim(/\b(?:senza|togli|elimina)\s+(?:le\s+|i\s+)?(scie|fasci esterni|particelle)\b/,m=>push(setting(m[1]==='scie'?'pTrailCount':m[1]==='particelle'?'pCount':'pOuter',0)));
   claim(/\bscie\s+(sottili|finissime|spesse|lunghe|corte)\b/,m=>push(setting(/lunghe|corte/.test(m[1])?'pTrailLength':'pTrailWidth',m[1]==='lunghe'?.22:m[1]==='corte'?.03:m[1]==='spesse'?3:.2)));
   claim(/\b(?:rete neuronale|rete neurale|sinapsi|neuronale|neurale)\b/,()=>push(setting('pNeural',Math.min(1,working.pNeural+.3)),setting('pSignal',Math.max(.4,working.pSignal))));
   claim(/\b(?:colore|colori|gradiente)\s+(?:solidale|solidali|sulle particelle|alle particelle)\b/,()=>push(setting('pColorMode',0)));
  }

  // Interpret how a motion should feel before interpreting isolated words such
  // as 'rotazione' or 'morbido' as a new rotation or a surface edit.
  const explicitMotion=/\b(?:movimento|movimenti|moto|animazione|animazioni|rotazione|rotazioni|ruot\w*|anima\w*)\b/.test(clause);
  const qualityContext=explicitMotion||scope==='motion';
  const qualityScope=lightTarget?'lights':/\b(?:rotazione|rotazioni|ruot\w*)\b/.test(clause)?'rotation':'all';
  const scopedSpeed=lightTarget||/\b(?:solo|soltanto)\b/.test(clause);
  if(!/\bsenza\s+(?:il\s+)?(?:movimento|animazione)\b/.test(clause)){
   const motionPhrase=(pattern,style,context=true)=>{
    if(!context)return;
    claim(pattern,m=>{
     const before=clause.slice(0,m.index),negative=/\bnon\b/.test(before)||/^non\b/.test(m[0])||['gentle','smooth'].includes(style)&&/\bmeno\s*$/.test(before);
     if(!negative)push({type:'motionStyle',style,scope:['slower','faster'].includes(style)?'all':qualityScope});
     motionAdjusted=true;if(['gentle','smooth'].includes(style)||negative)motionQualityAdjusted=true;
    });
   };
   motionPhrase(/\b(?:meno\s+brusc\w*|(?:piu\s+)?(?:morbid\w*|delicat\w*|dolc\w*|rilassant\w*))\b/,'gentle',qualityContext);
   motionPhrase(/\b(?:senza\s+scatti|senza\s+strappi|meno\s+scattos\w*|(?:piu\s+)?fluid\w*|smooth)\b/,'smooth',qualityContext);
   motionPhrase(/\bmeno\s+lent\w*\b/,'faster',!scopedSpeed);
   motionPhrase(/\bmeno\s+veloc[ei]\b/,'slower',!scopedSpeed);
   motionPhrase(/\b(?:(?:piu\s+)?veloc[ei]|acceler\w*)\b/,'faster',!scopedSpeed);
   motionPhrase(/\b(?:(?:piu\s+)?lent\w*|rallent\w*)\b/,'slower',!scopedSpeed);
   if(motionAdjusted){
    claim(/\b(?:movimento|movimenti|moto|animazione|animazioni|luci|luce|fluida|fluido)\b/);
    if(motionQualityAdjusted)claim(/\b(?:rotazione|rotazioni|ruot\w*|anima\w*)\b/);
    if(!lightTarget&&!textureTarget&&!explicitGrowth&&!colorTarget&&!backgroundTarget)scope='motion';
   }
  }
  if(motionNumbers.length)push(...motionNumbers);
  if(backgroundTarget){
   const colors=values(),transparent=/\btrasparen\w*/.test(clause),mode=transparent?'transparent':/gradient|sfumat/.test(clause)?'gradient':'solid';
   if(colors.length||transparent){push({type:'background',mode,colors:colors.length?colors:undefined});claim(/\b(?:sfondo|fondale|background|trasparen\w*|gradient\w*|sfumat\w*|uniforme|pieno|piena|puro|pura)\b/);claimColors();}
  }else if(lightTarget&&!motionAdjusted){
   const target=clause.match(/\blu(?:ce|ci)\s*(\d+)/),id=target?+target[1]:working.lights.find(l=>l.enabled)?.id;
   const remove=/\b(?:senza|togli\w*|rimuov\w*|elimina\w*|spegni)\b/.test(clause);
   if(remove){const ids=/\b(?:tutte|luci)\b/.test(clause)&&!target?working.lights.map(l=>l.id):id?[id]:[];for(const lightId of ids)push({type:'light',action:'remove',id:lightId});claim(/\b(?:tutte|luce|luci|neon|faro|softbox|alogeno)\b(?:\s*\d+)?/);}
   else{
    const type=/\b(?:barra|neon)\b/.test(clause)?'bar':/\b(?:anello|alogeno)\b/.test(clause)?'ring':/\bfaro\b/.test(clause)?'spot':/\bgriglia\b/.test(clause)?'grid':/\b(?:softbox|diffusore)\b/.test(clause)?'diffuser':'circle';
    const add=/\b(?:aggiung\w*|nuov\w*|inserisc\w*|metti)\b/.test(clause)||!id,light=working.lights.find(l=>l.id===id),v={};
    if(add){Object.assign(v,{type,visible:true,power:1.8});if(type==='bar')Object.assign(v,{size:.06,length:1.2,softness:.06});}else if(/\b(?:barra|anello|faro|griglia|softbox|diffusore|neon)\b/.test(clause))v.type=type;
    const colors=values();if(colors.length){v.color=colors[0];claimColors();}
    claim(/\bdietro\b/,()=>v.z=-2);claim(/\bdavanti\b/,()=>v.z=2);claim(/\b(?:dentro|intern\w*)\b/,()=>Object.assign(v,{x:0,y:0,z:0,type:'orb',size:.12,length:.12}));claim(/\bsinistra\b/,()=>v.x=-1.7);claim(/\bdestra\b/,()=>v.x=1.7);claim(/\b(?:alto|sopra)\b/,()=>v.y=1.6);claim(/\b(?:basso|sotto)\b/,()=>v.y=-1.6);
    claim(/\b(?:x|y|z|intensita|potenza|dimensione)\s*(?:[:=]|a)?\s*(-?\d+(?:[.,]\d+)?)/,m=>{const key=m[0].match(/^\w+/)[0],k={intensita:'power',potenza:'power',dimensione:'size'}[key]||key;v[k]=Math.max(LIGHT_META[k][1],Math.min(LIGHT_META[k][2],Number(m[1].replace(',','.'))));});
    claim(/\b(?:forte|intens\w*|debole)\b/,m=>{const f=flags(m.index),negative=f.less||m[0]==='debole';v.power=Math.max(0,Math.min(6,(light?.power??1.8)+(negative?-.5:.5)*f.factor));});
    if(add||Object.keys(v).length)push({type:'light',action:add?'add':'edit',id,values:v});
    claim(/\b(?:luce|luci|neon|faro|softbox|alogeno|barra|anello|circolare|griglia|diffusore)\b(?:\s*\d+)?/);
   }
  }else{
   const shapeText=remaining();
   const form=shapeNames.filter(name=>!(name==='sfera'&&explicitGrowth)).sort((a,b)=>b.length-a.length).find(name=>new RegExp('\\b'+escapeRe(name)+'\\b').test(shapeText));
   const relational=/\b(?:attorno|intorno|dalla|della|nella|sulla|sotto|dentro|avvol\w*|attorcigl\w*|rientr\w*|entr\w*|usc\w*)\b/.test(clause);
   const descriptive=/\b(?:piu|meno|senza|non|curv\w*|cort\w*|lung\w*|appuntit\w*|organic\w*|nod\w*|sinuos\w*|nerborut\w*)\b/.test(clause);
   if(!motionQualityAdjusted&&form&&(!texture||/\b(?:crea|trasforma|diventa|diventino)\b/.test(clause))&&!flags(clause.indexOf(form)).negative&&!(form==='sfera'&&(relational||growth))&&(!descriptive||/\b(?:crea|trasforma|diventa|diventino|tipo|come)\b/.test(clause))){
    const sculptIndex=SCULPT_EXAMPLES.findIndex(q=>normalize(q.name)===form);
    if(sculptIndex>=0&&working.petalAmount>0){for(const [key,value] of Object.entries(SCULPT_EXAMPLES[sculptIndex].values))push(setting(key,value));}
    else push({type:'shape',name:form});claim(new RegExp('\\b'+escapeRe(form)+'\\b'));if(form==='sfera')claim(/\bperfett[ao]\b/);
   }
   if(growth){
    if(claim(new RegExp('\\b(?:senza|togli\\w*|rimuov\\w*|elimina\\w*)\\s+(?:(?:le|i|gli|tutte|tutti)\\s+)*(?:'+growthWords+')\\b')))push(setting('petalAmount',0));
    const growthRequest=remaining();
    const attributesRequested=growthAttributes.some(([p])=>new RegExp('\\b(?:'+p+')\\b').test(growthRequest))||/organic|integrat|fuse|fusi|raccordat|naturali|entrano|escono/.test(growthRequest);
    if(working.petalAmount===0&&attributesRequested)push({type:'shape',name:/\b(?:radici|corde)\b/.test(clause)?(/corde/.test(clause)?'corde':'radici'):'riccio'});
    claim(/\b(?:organic\w*|integrat\w*|fus[aei]|raccordat\w*|naturali)\b/,m=>{adjust('petalBlend',.25,m);adjust('petalRoot',.2,m);adjust('petalRandom',.12,m);});
    let reentryClaimed=false;claim(/\b(?:entr\w*|usc\w*|escono|esca\w*)\b/g,m=>{if(!reentryClaimed){adjust('petalReentry',.45,m);reentryClaimed=true;}});
    for(const [pattern,key,delta] of growthAttributes)claim(new RegExp('\\b(?:'+pattern+')\\b'),m=>adjust(key,delta,m));
    if(/\b(?:rigonfiament\w*|protuberanze|bozzi)\b/.test(clause)&&/\b(?:piccol\w*|lievi|appena)\b/.test(clause)){push(setting('petalLength',.15),setting('petalGrowth',.45));claim(/\b(?:piccol\w*|lievi)\b/);}
   }
   const materialAliases=[...MATERIAL_STYLES.map((q,i)=>[normalize(q.name),i]),['vetro',MATERIAL_STYLES.findIndex(q=>q.name==='Biglia di vetro')],['acqua',1],['bolla',0],['cromo',11],['metallo',11],['silicone',18],...['opaca','opache','opachi'].map(w=>[w,14]),...['satinata','satinate','satinati'].map(w=>[w,12])].sort((a,b)=>b[0].length-a[0].length);
   if(texture)for(const [word] of materialAliases)claim(new RegExp('\\b(?:del|della|sul|sulla|dal|dalla)\\s+'+escapeRe(word)+'\\b'));
   if(!motionQualityAdjusted&&!/\b(?:piu|meno|senza|non)\b/.test(clause)&&!colorTarget){for(const [word,index] of materialAliases){if(claim(new RegExp('\\b'+escapeRe(word)+'\\b'),()=>push({type:'material',index})))break;}}
   if(texture){
    const removeTexture=claim(/\b(?:togli\w*|rimuov\w*|elimina\w*|senza|spegni)\s+(?:(?:la|le|tutte|ogni)\s+)*(?:texture|trama)\b/);
    if(removeTexture)for(const key of [...textureKeys,'surfaceTexture'])push(setting(key,0));
    else{
     for(const [pattern,key,delta] of textureAttributes)claim(new RegExp('\\b(?:'+pattern+')\\b'),m=>adjust(key,delta,m));
     claim(/\b(?:organic\w*|irregolar\w*|casual\w*|naturali)\b/,m=>adjust('textureOrganic',.2,m));
     claim(/\b(?:regolar\w*|ordinat\w*|geometric\w*)\b/,m=>adjust('textureOrganic',-.2,m));
     claim(/\b(?:fini|fine|fitta|fitte|fitto|fitti|dens[aoei]|piccol\w*)\b/,m=>adjust('textureScale',.6,m));
     claim(/\b(?:gross\w*|larg\w*|ampi\w*|grand\w*|radi|rada|rade)\b/,m=>adjust('textureScale',-.35,m));
     claim(/\b(?:rilievo|profond\w*|marcat\w*|evident\w*|forte|forti)\b/,m=>adjust('textureDepth',.2,m));
     claim(/\b(?:legger\w*|delicat\w*|tenu\w*|superficial\w*|morbid\w*)\b/,m=>adjust('textureDepth',-.15,m));
    }
    if(operations.slice(start).some(o=>o.type==='textureStyle'||o.type==='set'&&/^(texture|surfaceTexture)/.test(o.key)))claim(/\b(?:texture|trama|superficie|materia|materiale|maniera)\b/);
   }
   const colors=values();
   if(/\b(?:rimuov\w*|togli\w*|elimina\w*)\b/.test(clause)&&/\b(?:colore\s*(?:\d+|ultimo|finale)|ultimo colore)\b/.test(clause)){const m=clause.match(/colore\s*(\d+)/);push({type:'removeColor',index:m?Number(m[1])-1:working.palette.length-1});claim(/\b(?:colore\s*(?:\d+|ultimo|finale)|ultimo colore)\b/);}
   else if(colors.length){
    if(/\b(?:sottopelle|sss)\b/.test(clause)){push({type:'color',key:'sssColor',value:colors[0]});claim(/\b(?:sottopelle|sss)\b/);}
    else if(/\b(?:interno|interna)\b/.test(clause)){push({type:'color',key:'internalColor',value:colors[0]});claim(/\b(?:interno|interna)\b/);}
    else if(/\baggiung\w*\b/.test(clause))for(const color of colors)push({type:'addColor',color});
    else if(/\b(?:rimuov\w*|togli\w*|elimina\w*|senza)\b/.test(clause)){for(const color of colors){const index=working.palette.indexOf(color);if(index>=0)push({type:'removeColor',index});}}
    else push({type:'palette',colors});claimColors();
   }
   const mood=MOODS.find(q=>new RegExp('\\b'+escapeRe(normalize(q.name))+'\\b').test(clause));if(mood&&/\b(?:palette|mood)\b/.test(clause)){push({type:'palette',colors:mood.colors});claim(new RegExp('\\b'+escapeRe(normalize(mood.name))+'\\b'));}
   for(const [pattern,key,delta] of attributes){if(growth&&['deform','scale','roughness'].includes(key)||texture&&['deform','scale'].includes(key))continue;claim(new RegExp('\\b(?:'+pattern+')\\b'),m=>adjust(key,delta,m));}
  }
  if(claim(/\b(?:ferma(?:re)?|stop|senza movimento|senza animazione)\b/))push({type:'stopMotion'});
  else if(!motionQualityAdjusted){
   const animated=/\b(?:anima\w*|movimento|muov\w*|loop|continu\w*|lentamente)\b/.test(clause),r=remaining();
   let movement=/riflessi.*gir|rotazione.*riflessi/.test(clause)?'reflect':/luce.*orbit/.test(clause)?'orbit':/colori.*(?:col|vortic)/.test(clause)?'film':/respir/.test(clause)?'breathe':/ondegg/.test(clause)?'wave':/petali.*(?:aprono|apertura)/.test(clause)?'bloom':null;
   if(/\b(?:compar\w*|scompar\w*|sparir\w*|spunt\w*|emerg\w*|crescan\w*)\b/.test(clause))movement='emerge';
   if(animated&&growth&&/\b(?:attorcigl\w*|avvol\w*|intrecc\w*)\b/.test(clause))movement='wrap';
   if(animated&&/\bradici\b/.test(clause)&&/\b(?:entr\w*|escono|usc\w*|rientr\w*)\b/.test(clause))movement='roots';
   const stopSpecificMotion=/\b(?:non\s+(?:anima\w*|muov\w*|farle|farli|farla|farlo|falle|falli|devono|deve|compar\w*|sparir\w*|attorcigl\w*)|senza\s+(?:anima\w*|movimento))\b/.test(clause);
   if(movement){
    if(stopSpecificMotion){const keys=movement==='emerge'?['petalGrowth']:movement==='wrap'?['petalCoil']:movement==='roots'?['petalGrowth','petalCoil','petalWander','petalReentry']:[];if(keys.length)for(const key of keys)push({type:'motionTrack',key,values:{enabled:false}});else push({type:'stopMotion'});}
    else push({type:'motionPreset',name:movement});claim(/\b(?:riflessi|gir\w*|rotazione|orbit\w*|colori|colano|vortic\w*|respir\w*|ondegg\w*|aprono|apertura|compar\w*|scompar\w*|sparir\w*|spunt\w*|emerg\w*|crescan\w*|movimento|anima\w*|muov\w*|loop|ciclo|continu\w*|gradualmente|lentamente)\b/);
   }
   const rotation=remaining().match(/\b(?:ruota|ruotare|ruoti|ruotano|ruotando|gira|girare|giri|girano|girando|rotazione)\b/);
   if(!movement&&rotation&&!lightTarget){const key=/\b(?:verticale|asse x)\b/.test(clause)?'rotateX':/\b(?:sul piano|asse z)\b/.test(clause)?'rotateZ':'rotateY';push({type:'motionTrack',key,values:{enabled:true,mode:'cycle',cycles:1,direction:/\b(?:inverso|contrario)\b/.test(clause)?-1:1}});claim(/\b(?:ruota|ruotare|ruoti|ruotano|ruotando|gira|girare|giri|girano|girando|rotazione|verticale|orizzontale|inverso|contrario|movimento|anima\w*|continu\w*|lentamente)\b/);claim(/\b(?:asse [xyz]|sul piano)\b/);}
   if(animated&&growth&&!movement&&!rotation){const key=/\bcurv\w*|arricci\w*/.test(clause)?'petalCurl':/\b(?:nod\w*|nervos\w*|nerborut\w*)/.test(clause)?'petalKnots':/sinuos|serpeggi|ondulat/.test(clause)?'petalWander':null;if(key){push({type:'motionTrack',key,values:{enabled:true,mode:'wave',amplitude:Math.min(.18,TRACK_META[key][2]),cycles:1,phase:0,curve:'sine'}});claim(/\b(?:movimento|anima\w*|muov\w*|continu\w*|lentamente|loop)\b/);}}
  }
  function claimColors(){claim(/#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/);claim(new RegExp('\\b(?:'+Object.keys(namedColors).join('|')+')\\b'));}
  // Target nouns and grammatical glue are not unsupported requests. Adjectives,
  // effects and object names that were not matched above remain in the feedback.
  let residue=remaining().replace(new RegExp('\\b(?:'+growthWords+'|sfondo|fondale|background|palette|mood|colore|colori|figura|oggetto|superficie|sfera|geometricamente)\\b','g'),' ')
   .replace(/\b(?:a|al|alla|alle|allo|agli|ai|all|anche|con|che|come|da|dal|dalla|dalle|dallo|della|delle|dello|del|dei|degli|di|dentro|attorno|intorno|e|ed|o|oppure|gli|i|il|la|le|lo|un|una|uno|l|in|nel|nella|nelle|nello|nei|non|si|su|sul|sulla|sulle|sullo|per|poi|piu|meno|molto|tanto|tante|tanti|poco|po|leggermente|appena|completamente|massimo|massima|senza|togli\w*|rimuov\w*|elimina\w*|aggiung\w*|metti|mettile|mettili|mettila|mettilo|fai|falle|falli|fallo|falla|farle|farli|farlo|farla|rend\w*|crea|creare|vorrei|voglio|puoi|potresti|possano|possono|deve|devono|tipo|sembrare|sembri|sembra|diventa|diventino|trasforma\w*|comunque|per favore|quasi|pure)\b/g,' ').replace(/[.!?:=()%]/g,' ').replace(/\s+/g,' ').trim();
  if(residue)unrecognized.push(residue);else if(operations.length===start&&!mask.some(Boolean))unrecognized.push(clause);
 }
 return {operations,unrecognized:[...new Set(unrecognized)]};
}

export function descriptionCatalog(){return {parameters:Object.fromEntries(Object.entries(META).map(([k,m])=>[k,{label:m[0],min:m[1],max:m[2],step:m[3]}])),materials:MATERIAL_STYLES.map((m,index)=>({index,name:m.name})),textureStyles:TEXTURE_STYLES.map((m,index)=>({index,name:m.name})),textureStyleOperation:{type:'textureStyle',index:0},shapes:shapeNames,lightTypes:LIGHT_TYPES,lightParameters:LIGHT_META,maxLights:MAX_LIGHTS,maxColors:MAX_COLORS,motionPresets:MOTION_PRESETS.map(([id,name])=>({id,name})),motionTracks:Object.fromEntries(Object.entries(TRACK_META).map(([key,m])=>[key,{label:m[0],minAmplitude:m[1],maxAmplitude:m[2],step:m[3]}])),motionTrackOperation:{type:'motionTrack',key:'petalGrowth',values:{enabled:true,amplitude:.5,cycles:1,phase:270,direction:1,curve:'sine',mode:'wave'}},loopOperation:{type:'loop',perfect:true},motionStyleOperation:{type:'motionStyle',style:'gentle',scope:'all'},motionStyles:['gentle','smooth','slower','faster']};}
