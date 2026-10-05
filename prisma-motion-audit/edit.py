from pathlib import Path
p=Path('/workspace/prisma-studio/dist/renderer.js');s=p.read_text()
s=s.replace('const TAU=Math.PI*2;','''const TAU=Math.PI*2;
const MOTION_LIMITS={volume:[.08,1.5],deform:[0,.75],twist:[-2.5,2.5],waves:[0,.4],hole:[0,.95],cut:[0,1.6],scale:[.35,1.7],positionX:[-1.5,1.5],positionY:[-1.5,1.5],iridescence:[0,1],roughness:[0,1],transparency:[0,1],petalOpen:[0,1],petalCurl:[-1,1],petalInflate:[0,1],petalSharp:[0,1],petalBlend:[0,1],petalRoot:[0,1],petalRandom:[0,1],stemBend:[-1,1]};''',1)
start=s.index(' const limits={');end=s.index('\n',start);s=s[:start]+s[end:];s=s.replace('if(limits[key])s[key]=Math.max(limits[key][0],Math.min(limits[key][1],s[key]));','if(MOTION_LIMITS[key])s[key]=Math.max(MOTION_LIMITS[key][0],Math.min(MOTION_LIMITS[key][1],s[key]));',1)
s=s.replace('uniform highp sampler2D uFieldTexture;','uniform highp sampler2D uFieldTexture;\nuniform vec2 uFieldWarp;',1)
s=s.replace('float n=uFieldAtlas.x;vec3 clamped=clamp(p,uFieldMin,uFieldMax)', '''// Cheap domain transformations stay live; they never rebuild the volume.
 p.xz=rot(uFieldWarp.x*p.y*.7+uFieldWarp.y)*p.xz;
 float n=uFieldAtlas.x;vec3 clamped=clamp(p,uFieldMin,uFieldMax)''',1)
pos=s.index('\nconst RESOLVE=')
s=s[:pos]+'''
function crownRotationReusable(s){
 return !['deform','asymmetry','waves','roundness','bendX','bendY','lobeAmount','hole','cut','stemAmount'].some(k=>Math.abs(s[k]||0)>.000001||s.motions?.[k]?.enabled&&(s.motions[k].amplitude||0)>0);
}
function motionInterval(s,key){
 const base=s[key]??0,t=s.motions?.[key],amplitude=t?.enabled?(t.amplitude||0)*(s.motion??.3)/.3:0,limits=MOTION_LIMITS[key]||[-Infinity,Infinity];
 return [Math.max(limits[0],base-amplitude),Math.min(limits[1],base+amplitude)];
}
function previewPlan(source){
 const rotateCrown=crownRotationReusable(source),keys=FIELD_KEYS.concat(GROWTH_KEYS).filter(k=>k!=='twist'&&!(rotateCrown&&k==='petalPhase'));
 const dynamic=keys.some(k=>source.motions?.[k]?.enabled&&(source.motions[k].amplitude||0)>0);
 const descriptor=keys.map(k=>[source[k]??0,source.motions?.[k]?.enabled?source.motions[k].amplitude||0:0].join(':')).join('|')+'|'+(source.motion??.3)+'|'+rotateCrown;
 const sharp=motionInterval(source,'petalSharp'),fine=(source.petalAmount||0)>.25&&(sharp[1]>.75||(source.petalWidth??.24)<.12);
 return {descriptor,dynamic,rotateCrown,fine,keys};
}
function animatedBounds(source){
 // Use one conservative coordinate grid for the whole loop. Resizing its
 // bounds every frame causes shimmer, even if the texture allocation is reused.
 const envelope={...source,twist:0};
 for(const k of FIELD_KEYS.concat(GROWTH_KEYS)){
  if(k==='twist'||k==='petalPhase')continue;
  const [lo,hi]=motionInterval(source,k);envelope[k]=Math.abs(lo)>Math.abs(hi)?lo:hi;
 }
 envelope.petalSharp=motionInterval(source,'petalSharp')[0];
 const bounds=atlasBounds(envelope,growthTable(envelope).radiusBound);
 const radius=bounds.radius*1.02;
 return {min:[-radius,-radius,-radius],max:[radius,radius,radius],radius,range:Math.max(2,radius*2)};
}
''' +s[pos:]
s=s.replace('export function growthTable(s){\n const data=new Float32Array(96*8*4),rowData=new Float32Array(16),rows=', 'export function growthTable(s,storage){\n const data=storage?.data||new Float32Array(96*8*4),rowData=storage?.rowData||new Float32Array(16);data.fill(0);rowData.fill(0);const rows=',1)
s=s.replace('function rendererVariant(s,options={}){','function rendererVariant(s,options={},source=s){',1)
s=s.replace("if(modern&&options.preview&&options.quality!=='full')return 8+4096+ATLAS_PREVIEW+(s.thinShell>=.999?16:0)+ +volume+((s.subsurface||0)>.0001?2:0)+(transmission>.0001?2048:0);",'''if(modern&&options.preview&&options.quality!=='full'){
  // An enabled transparency track can cross zero. Prepare its complete
  // optical path once, instead of switching programs at that crossing.
  const transmitting=motionInterval(source,'transparency')[1]>.0001;
  const scattering=(source.scattering||0)+(source.translucency||0)+(source.subsurface||0)>.0001&&transmitting&&source.thinShell<.999;
  return 8+4096+ATLAS_PREVIEW+(s.thinShell>=.999?16:0)+ +scattering+((s.subsurface||0)>.0001?2:0)+(transmitting?2048:0);
 }''',1)
s=s.replace('rendererVariant(sampleFrame(source,phase),options)', 'rendererVariant(sampleFrame(source,phase),options,source)')
s=s.replace('key=rendererVariant(s,options),c=this.canvas','key=rendererVariant(s,options,source),c=this.canvas',1)
s=s.replace('const table=growthTable(s);this.growthRows=', 'const table=growthTable(s,this.growthStorage);this.growthStorage=table;this.growthRows=',1)
s=s.replace('ensurePreviewField(s,options){\n  const g=this.gl;', '''ensurePreviewField(frame,options,source=frame){
  const g=this.gl,plan=previewPlan(source);
  if(plan.descriptor!==this.fieldPlanKey){this.fieldPlanKey=plan.descriptor;this.fieldPlan=plan;this.motionBounds=plan.dynamic?animatedBounds(source):null;}
  const s={...frame,twist:0,petalPhase:plan.rotateCrown?0:frame.petalPhase};
  this.fieldWarp=[frame.twist||0,plan.rotateCrown?(frame.petalPhase||0)*Math.PI/180:0];''',1)
s=s.replace("const key=FIELD_KEYS.concat(GROWTH_KEYS).map(k=>s[k]??0).join('|'),fine=(s.petalAmount||0)>.25&&((s.petalSharp||0)>.75||(s.petalWidth??.24)<.12),resolution=warmup?48:options.quality==='fast'?(fine?112:48):(fine?144:96);", "const key=FIELD_KEYS.concat(GROWTH_KEYS).map(k=>s[k]??0).join('|'),fine=plan.fine,resolution=warmup?48:options.quality==='fast'?(fine?112:48):(fine?144:96);",1)
s=s.replace('const bounds=atlasBounds(s,this.growthRadius),tiles=', 'const bounds=this.motionBounds||atlasBounds(s,this.growthRadius),tiles=',1)
s=s.replace('if(this.fieldSize!==size){g.activeTexture', 'if(this.fieldSize!==size){this.fieldAllocations=(this.fieldAllocations||0)+1;g.activeTexture',1)
s=s.replace("g.uniform1i(this.locations.uFieldTexture,2);g.uniform3fv", "g.uniform1i(this.locations.uFieldTexture,2);g.uniform2fv(this.locations.uFieldWarp,this.fieldWarp||[0,0]);g.uniform3fv",1)
s=s.replace('this.ensurePreviewField(s,options);','this.ensurePreviewField(s,options,source);',1)
p.write_text(s)
p=Path('/workspace/prisma-studio/dist/studio-model.js');s=p.read_text().replace("'petalSharp','petalPhase','stemBend'];","'petalSharp','petalPhase','petalBlend','petalRoot','petalRandom','stemBend'];",1);p.write_text(s)
for name in ['app.js','index.html']:
 p=Path('/workspace/prisma-studio/dist')/name;s=p.read_text().replace('geometry-cache-1','motion-cache-1');p.write_text(s)
p=Path('/workspace/prisma-studio/dist/render-session.js');p.write_text(p.read_text().replace('cached-geometry-1','motion-cache-1'))
p=Path('/workspace/prisma-motion-audit/source-sync.py');p.write_text(p.read_text().replace('Cache procedural geometry for a responsive petal and organic preview','Keep motion geometry and optical pipelines stable across animation loops'))
