import {MAX_COLORS} from './studio-model.js?v=01db4603d134';
import {cloudBody,grainMix,hasGrainLayer} from './body-layers.js?v=01db4603d134';

// Return only missing inputs, so applying a suggestion preserves an artist's
// existing strengths, lights and colour choices.
const yarn=new Set(['structWeaveBranching','structWeavePitch','structWeaveFinesse','structWeaveAlignment','structWeaveTension','structWeaveRelease','structWeaveSlope','structWeaveArch']);
const stems=new Set(['structWeaveSpread','structWeaveReach','structWeaveFront','structWeaveTipBend','structWeaveRearX','structWeaveRearY']);
const main=new Set(['structWeaveNodes','structWeaveCradle','structWeaveMembrane']);
export function parameterHasSignal(s,key){
 if(Math.abs(Number(s[key])||0)>1e-6)return true;
 const track=s.motions?.[key];
 if(!track?.enabled)return false;
 if(track.mode==='points')return !!(track.points?.length>1)&&track.points.some(point=>Math.abs(point.offset)>1e-6);
 return Math.abs(track.amplitude||0)>1e-6;
}
export function structureSupport(s,key){
 const veil=key.startsWith('pVeil')&&!['pVeilFromForm','pVeilSourceKind','pVeilMorph'].includes(key);
 const coat=['fiberPile','fiberLength','fiberGrowth','fiberTarget'].includes(key);
 const weave=key.startsWith('structWeave')&&key!=='structWeave'||key==='structThreadWidth'||key==='structDensity';
 const lamp=key==='structWeaveCupLight'||key==='lightWrap'||key==='pSelfShadow';
 if(!veil&&!coat&&!weave&&!lamp)return null;
 const on=k=>parameterHasSignal(s,k);
 const inputs=[],patch={};
 const require=(available,id,value,label)=>{
  if(available||Object.hasOwn(patch,id))return;
  patch[id]=value;inputs.push(label);
 };
 if(veil){
  require(on('veilAmount')||s.pLiving===4,'veilAmount',.65,'Trasformazione in veli');
  if(key==='pVeilCoreRadius')require(on('pVeilCoreDark'),'pVeilCoreDark',.7,'Oscurità del nucleo');
  if(key==='pVeilCoreDark')require(on('pVeilCoreRadius'),'pVeilCoreRadius',.24,'Dimensione del nucleo');
  if(key==='pVeilCrease'||key==='pVeilFolds')require(on('pVeilRipple'),'pVeilRipple',.16,'Ondulazione dei bordi');
  if(key==='pVeilLayerColor'&&new Set(s.palette||[]).size<2){
   const palette=s.palette?.length?s.palette:['#d9dce2'];
   require(false,'palette',[...palette.slice(0,MAX_COLORS-1),palette[0].toLowerCase()==='#387d9c'?'#d4b19d':'#387d9c'],'due colori nella palette');
  }
  if(key==='pVeilBreath')require(on('pVeilSpread'),'pVeilSpread',.65,'Apertura dei veli');
  if(['pVeilDelay','pVeilSpacing','pVeilLayerColor'].includes(key))require(s.pVeilLayers>1,'pVeilLayers',3,'almeno due strati');
  if(['pVeilDelay','pVeilRhythm','pVeilCycles'].includes(key))require(on('pVeilFlow')||on('pVeilRipple')||on('pVeilBreath')&&on('pVeilSpread'),'pVeilFlow',.4,'movimento dei veli');
 }
 if(coat||weave){
  const solid=!cloudBody(s)&&!(s.pLiving>0);
  const threads=solid&&on('structFibres'),woven=threads&&on('structWeft'),shellWeave=woven&&on('structShell');
  const integrated=shellWeave&&on('structWeaveBranching'),taut=integrated&&on('structWeaveTension');
  const net=on('structWeaveCradle')||on('structWeaveMembrane'),nodes=on('structWeaveNodes'),growth=on('structWeaveGrowth');
  const linkNodes=hasGrainLayer(s)&&s.pCount>0&&s.pLinkNodes>0&&on('pLinks')&&on('pOpacity');
  const any=net||nodes||threads;
  const needNet=()=>require(net||integrated,'structWeaveCradle',.65,'Ragnatela o Membrana');
  const needNodes=()=>require(nodes||integrated,'structWeaveNodes',.7,'Noduli');
  const needAny=()=>require(any,'structWeaveCradle',.65,'Ragnatela, Membrana o Noduli');
  const needGrowth=()=>require(growth,'structWeaveGrowth',.65,'Crescita degli steli');
  if(coat){
   if(key!=='fiberPile'&&key!=='fiberTarget')require(on('fiberPile'),'fiberPile',.65,'Peluria');
   if((key==='fiberGrowth'||s.fiberTarget==='nodes')&&!linkNodes)needNodes();
  }else if(!main.has(key)){
   if(key==='structWeaveBranching')require(net||shellWeave,'structWeaveCradle',.65,'Ragnatela o Membrana');
   else if(key==='structWeaveGrowth')require(net||nodes||shellWeave,'structWeaveNodes',.7,'Noduli o Ragnatela');
   else if(yarn.has(key)){
    const bendsStalks=nodes&&growth&&(key==='structWeaveSlope'||key==='structWeaveArch');
    if(!bendsStalks)needNet();
   }
   else if(key==='structWeaveRootBend'){if(!taut){needNodes();needGrowth();}}
   else if(key==='structWeaveCup'||key==='structWeaveFlare'){if(!shellWeave)needNodes();needGrowth();}
   else if(stems.has(key)){
    const shapedByTension=taut&&['structWeaveTipBend','structWeaveRearX','structWeaveRearY','structWeaveFront'].includes(key);
    if(!shapedByTension){if(!nodes&&!net&&!integrated)needNet();needGrowth();}
   }
   else if(['structWeaveCupSize','structWeaveCupLight','structWeaveHierarchy'].includes(key))needNodes();
   else if(key==='structWeaveFlex'){if(!net&&!taut&&!(nodes&&growth))require(false,'structWeaveCradle',.65,'Ragnatela o Membrana');}
   else if(key==='structThreadWidth'){if(!net&&!threads&&!(nodes&&growth))needNet();}
   else needAny();
   if(key==='structWeaveFlare')require(on('structWeaveCup'),'structWeaveCup',.65,'Apertura delle coppe');
   if(key==='structWeaveFront')require(on('structDelay'),'structDelay',.5,'Sfasamento fra zone');
  }
  if(!solid&&!(s.pLiving>0)&&!on('veilAmount')&&s.pCount===0&&(weave||s.fiberTarget==='nodes'||key==='fiberGrowth'))require(false,'pCount',2400,'granelli come punti di ancoraggio');
  if(key==='structWeaveCupLight'&&!integrated)require(on('pLighting'),'pLighting',.7,'Risposta alle luci');
 }
 if(lamp&&grainMix(s)===1&&!s.motions?.sceneGrains?.enabled)require(on('pLighting'),'pLighting',.7,'Risposta alle luci');
 if(lamp&&Array.isArray(s.lights)){
  const selected=key==='pSelfShadow'&&s.pShadowLight>=0?s.lights.filter(light=>light.id===s.pShadowLight):s.lights;
  if(!selected.some(light=>light.enabled!==false&&light.power>0)){
   const light=selected[0];
   if(!light)return {message:'Aggiungi o scegli una sorgente in Luci.',patch:null};
   if(light.enabled===false)require(false,'lights.'+light.id+'.enabled',true,'una sorgente accesa');
   if(!(light.power>0))require(false,'lights.'+light.id+'.power',1,'intensità della luce');
  }
 }
 return inputs.length?{message:'Richiede '+inputs.join(' e ')+'.',patch}:null;
}
