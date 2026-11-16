import {CooperativePreview} from './cooperative-preview.js?v=f9c4c37d093c';
import {PaletteFinishPass} from './finish-palette.js?v=f9c4c37d093c';
import {Dynamics,disposeDynamics} from './dynamics.js?v=f9c4c37d093c';
import {motionPeriod} from './animation-clock.js?v=f9c4c37d093c';
import {animationPhase} from './animation-clock.js?v=f9c4c37d093c';
import {ScanlinePass} from './finish-scanlines.js?v=f9c4c37d093c';
import {FilamentPass} from './filament-renderer.js?v=f9c4c37d093c';
import {VeilTransition} from './veil-transition.js?v=f9c4c37d093c';
import {BodySamples} from './body-samples.js?v=f9c4c37d093c';
import {BodyComposite} from './body-composite.js?v=f9c4c37d093c';
import {cloudBody,grainMix} from './body-layers.js?v=f9c4c37d093c';
import {sampleFrame,independentFanMode,Renderer as SolidRenderer} from './solid-renderer.js?v=f9c4c37d093c';
import {ParticleRenderer} from './particle-renderer.js?v=f9c4c37d093c';
import {FinishingPass,GlyphPass,DetailPass,OpticalPass,FeedbackPass,FocusPass,FINISH_DEFAULTS,luminousPrintEnabled,normalizeFinishOrder,finishingOff,finishingSource} from './finishing.js?v=f9c4c37d093c';
export {fieldAt,sampleFrame} from './solid-renderer.js?v=f9c4c37d093c';
function printPreviewOptions(s,o){
 return o.preview&&s.bgMode==='transparent'&&!finishingOff(s,o)&&s.finishFeedback&&s.finishFeedbackMix>0&&luminousPrintEnabled(s)?{...o,alphaPreview:true}:o;
}
const solidBody=s=>({...s,engine:'solid',pLiving:0});
const focusOptions={layers:true,focusDepthOnly:true,preview:true,quality:'fast',trackTiming:false,deferCompletion:true,keepCanvas:true};
// A scene owns a clock, a simulation and a shared graphics context.
export class Renderer{
 constructor(canvas){this.dynamics=new Dynamics(sampleFrame);this.liveDynamics=new Dynamics(sampleFrame,true);this.canvas=canvas;this.context=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!this.context)throw Error('WebGL 2 non disponibile.');this.frameTimer=this.context.getExtension('EXT_disjoint_timer_query_webgl2');this.frameQueries=[];this.frameGpuSample=0;this.frameGpuMs=null;}
 needsCooperative(s,p,o={}){
  if(o.cooperative===false)return false;const phase=animationPhase(s,p||0),plan=this.layerPlan(s,phase),surface=plan?.surface||(!plan?this.endpoint(s,phase):null);
  return !!surface&&surface.engine!=='particles'&&!(surface.pLiving>0)&&independentFanMode(surface)&&this.select(surface).canUseImplicit(surface,o);
 }
 cooperative(){return this.cooperativePreview??=new CooperativePreview(this,canvas=>new Renderer(canvas));}
 cancelCooperative(){this.cooperativePreview?.cancel();}
 async stopCooperative(){await this.cooperativePreview?.stop();}
 resetLiveDynamics(){this.cancelCooperative();this.cooperativePreview?.worker.resetLiveDynamics();this.feedbackFinishing?.release();this.liveDynamics.reset();this.lastPreviewDynamicsFrame=null;}
 get dynamicsFrame(){return this.lastPreviewDynamicsFrame;}
 physicalState(s,seconds,o={},async=false){if(o.dynamicsFrame)return async?Promise.resolve({...s,_dynamics:o.dynamicsFrame}):{...s,_dynamics:o.dynamicsFrame};const simulation=o.liveDynamics?this.liveDynamics:this.dynamics;return async?simulation.stateAsync(s,seconds,o):simulation.state(s,seconds);}
 sourceState(s){return {...s,pLiving:s.pVeilSourceKind===4?0:s.pVeilSourceKind||0,engine:s.pVeilSourceKind>0?'particles':'solid'};}
 endpoint(s,p=0){return s.pLiving===4&&s.pVeilFromForm&&sampleFrame(s,p).pVeilMorph<=0?this.sourceState(s):s;}
 select(s){const kind=(s?.engine==='particles'||s?.pLiving>0)?'particles':'solid';if(this.kind!==kind){this.implementations??={};if(this.impl)this.implementations[this.kind]=this.impl;this.context.bindVertexArray(null);this.context.bindFramebuffer(this.context.FRAMEBUFFER,null);this.context.disable(this.context.BLEND);this.impl=this.implementations[kind]||(kind==='particles'?new ParticleRenderer(this.canvas):new SolidRenderer(this.canvas));this.kind=kind;}if(kind==='solid'){const g=this.context;g.bindVertexArray(null);g.bindBuffer(g.ARRAY_BUFFER,this.impl.buffer);g.enableVertexAttribArray(0);g.vertexAttribPointer(0,2,g.FLOAT,false,0,0);g.disableVertexAttribArray(1);g.disableVertexAttribArray(2);g.disableVertexAttribArray(3);g.disable(g.DEPTH_TEST);g.disable(g.BLEND);}return this.impl;}
 get gl(){return this.context;}get maxSize(){return Math.min(4096,this.context.getParameter(this.context.MAX_TEXTURE_SIZE));}
 get recoveryExtension(){return this.context.getExtension('WEBGL_lose_context');}
 get completionSync(){return this.cooperativePreview?.busy||this.impl?.completionSync;}get completedFrames(){return this.impl?.completedFrames||0;}
 get gpuSample(){return this.frameGpuSample;}get gpuMilliseconds(){return this.frameGpuMs;}get timerExtension(){return this.frameTimer;}get bakeUploads(){return this.impl?.bakeUploads||0;}
 layerPlan(s,p){
  if(s.sceneGrains===undefined&&!s.motions?.sceneGrains?.enabled)return null;
  const frame=sampleFrame(s,p),mix=grainMix(frame),cloud=cloudBody(s);
  if(mix>=1&&cloud&&s.engine==='particles'&&!s.motions?.sceneGrains?.enabled)return null;
  if(cloud)return {grains:{...s,engine:'particles',grainSource:'cloud',_cloudSurfaceMix:1-mix,_cloudSurfaceActive:true},mix};
  const surface=solidBody(s);
  if(mix<=0)return {surface,mix};
  const grains={...s,engine:'particles',pLiving:cloud?s.pLiving:0};
  if(!cloud)grains.pFilm=s.thinFilm;
  if(mix>=1&&cloud)return {grains,mix};
  // Scale layer strengths after sampling the animation and before drawing.
  for(const k of ['pOpacity','pTrailOpacity','pLinks','pSkin','pThreadOpacity','pShadow','pCaustic'])
   grains[k]=frame[k]*mix;
  if(mix>=1&&!this.needsFilaments(surface,p)&&!s.motions?.sceneGrains?.enabled)return {body:surface,grains,attach:true,mix,frame};
  return {surface,grains,attach:!cloud,mix,frame};
 }
 layerOptions(plan,o){
  return plan.grains&&plan.surface?{...o,layers:true,bodyField:plan.attach}:o;
 }
 prepareLayers(plan,p,o){
  const so=this.layerOptions(plan,o);
  let surfaceReady=true;
  if(plan.surface){
   surfaceReady=this.select(plan.surface).prepare(plan.surface,p,so);
   surfaceReady=this.prepareFilaments(plan.surface,p)&&surfaceReady;
  }else if(plan.body)surfaceReady=this.select(plan.body).prepareBodyField(plan.body,p);
  if(plan.attach){this.bodySamples??=new BodySamples(this.gl);surfaceReady=this.bodySamples.ready()&&surfaceReady;}
  const grainsReady=!plan.grains||this.select(plan.grains).prepare(plan.grains,p,o);
  return surfaceReady&&grainsReady;
 }
 async prepareLayersAsync(plan,p,o){
  const so=this.layerOptions(plan,o);
  if(plan.surface){
   if(!await this.select(plan.surface).prepareAsync(plan.surface,p,so))return false;
   this.prepareFilaments(plan.surface,p);
   if(this.needsFilaments(plan.surface,p)&&!await this.filamentPass.prepareAsync(o))return false;
  }
  if(plan.attach){
   this.bodySamples??=new BodySamples(this.gl);
   while(!this.bodySamples.ready()||(plan.body&&!this.select(plan.body).prepareBodyField(plan.body,p))){
    if(o.cancelled?.()||this.gl.isContextLost())return false;
    await new Promise(resolve=>setTimeout(resolve,12));
   }
  }
  return !plan.grains||this.select(plan.grains).prepareAsync(plan.grains,p,o);
 }
 grainOptions(plan,p,o){
  if(!plan.body)return o;
  const field=this.select(plan.body).bodyField(plan.body,p,o);
  return {...o,studioLayer:{field,attachment:this.bodySamples.update(field,plan.frame,o)}};
 }
 compositeFrame(plan,p,w,h,o){
  const surface=finishingSource(plan.surface,o),solid=this.select(surface);
  const field=plan.attach?solid.bodyField(surface,p,o):null;
  const attachment=field?this.bodySamples.update(field,plan.frame,o):null;
  this.select(surface);
  this.bodyComposite??=new BodyComposite(this.gl);
  const layers=this.bodyComposite.target(w,h);
  return {surface,solid,layers,studioLayer:{color:layers.color,depth:layers.depth,field,attachment,grainMix:plan.mix}};
 }
 drawGrains(plan,frame,p,w,h,o,async=false){
  const {surface,solid,studioLayer}=frame;
  if(surface.focusBlur>0){
   const g=this.gl;g.bindFramebuffer(g.READ_FRAMEBUFFER,frame.layers.framebuffer);g.readBuffer(g.COLOR_ATTACHMENT0);g.bindFramebuffer(g.DRAW_FRAMEBUFFER,null);g.blitFramebuffer(0,0,w,h,0,0,w,h,g.COLOR_BUFFER_BIT,g.NEAREST);g.bindFramebuffer(g.FRAMEBUFFER,null);
   this.applyFocus(surface,p,w,h,null,{...o,beforeFilaments:true});frame.layers.captureColor();
  }
  const ok=this.select(plan.grains).draw(finishingSource(plan.grains,o),p,w,h,{...o,studioLayer});
  if(ok&&this.needsFilaments(surface,p)){
   return this.filamentPass[async?'drawAsync':'draw']({...sampleFrame(surface,p),filCore:(surface.filCore??1)*(1-plan.mix)},p,w,h,solid,o);
  }
  return ok;
 }
 drawLayers(plan,p,w,h,o){
  if(!plan.surface){
   const options=this.grainOptions(plan,p,o);
   return this.select(plan.grains).draw(finishingSource(plan.grains,o),p,w,h,options);
  }
  if(!plan.grains){
   const surface=finishingSource(plan.surface,o),ok=this.select(surface).draw(surface,p,w,h,o);
   if(ok)this.filaments(surface,p,w,h,o);
   return ok;
  }
  const frame=this.compositeFrame(plan,p,w,h,o);
  return frame.solid.draw(frame.surface,p,w,h,{...o,layers:frame.layers,layerOpacity:1-plan.mix})&&this.drawGrains(plan,frame,p,w,h,o);
 }
 async drawLayerExport(plan,method,p,w,h,o){
  if(!(plan.surface&&plan.grains)){
   const frame=finishingSource(plan.surface||plan.grains,o);
   const options=this.grainOptions(plan,p,o);
   const ok=await this.select(frame)[method](frame,p,w,h,options);
   return ok&&(!plan.surface||await this.filaments(frame,p,w,h,o,true));
  }
  const inner={...o,trackTiming:false,deferCompletion:true};
  const samples=method==='drawAccumulated'?o.samples||16:1;
  const frame=this.compositeFrame(plan,p,w,h,inner),layerOpacity=1-plan.mix;
  if(samples===1||plan.mix>=1||plan.surface.renderVersion<2)
   return await frame.solid.drawTiled(frame.surface,p,w,h,{...inner,layers:frame.layers,layerOpacity})&&await this.drawGrains(plan,frame,p,w,h,inner,true);
  if(!await frame.solid.drawTiled(frame.surface,p,w,h,{...inner,layers:frame.layers,layerOpacity,deferCompletion:false}))return false;
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null);
  if(!await frame.solid.drawAccumulated(frame.surface,p,w,h,{...o,layerOpacity,samples,progress:f=>o.progress?.(f*.92)}))return false;
  frame.layers.captureColor();
  return this.drawGrains(plan,frame,p,w,h,inner,true);
 }
 focusBody(s,p,plan=this.layerPlan(s,p)){
  if(!(s.focusBlur>0))return null;
  const source=plan?plan.surface:this.endpoint(s,p);
  if(!source||source.engine==='particles'||source.pLiving>0)return null;
  return {...source,renderVersion:2};
 }
 prepareFocus(s,p,o,async=false){
  const source=this.focusBody(s,p);
  if(!source)return true;
  this.focusPass??=new FocusPass(this.gl);
  if(this.select(source).canUseImplicit(source,o))return true;
  return this.select(source)[async?'prepareAsync':'prepare'](source,p,{...focusOptions,cancelled:o?.cancelled});
 }
 applyFocus(s,p,w,h,plan,o={}){
  const source=this.focusBody(s,p,plan);if(!source)return;
  if(!o.beforeFilaments&&(plan?.grains||this.needsFilaments(source,p)))return;
  const renderer=this.select(source),exact=renderer.exactDepth;
  if(renderer.canUseImplicit(source,o)&&exact?.width===w&&exact?.height===h){this.focusPass.draw(s,w,h,exact.texture,true);return true;}
  const solid=this.select(source),scale=Math.min(.6,800/Math.max(w,h)),width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale));
  this.focusDepthTarget??=new BodyComposite(this.gl);const layers=this.focusDepthTarget.target(width,height);
  solid.draw(source,p,width,height,{...focusOptions,layers});
  this.focusPass.draw(s,w,h,layers.depth);
  return true;
 }
 prepare(s,p,o){if(this.needsCooperative(s,p,o))return this.cooperative().prepare(s,p,o);p=animationPhase(s,p||0);s=this.physicalState(s,p*motionPeriod(s)/(Math.PI*2),o);if(!s)return false;const focusReady=this.prepareFocus(s,p,o);const plan=this.layerPlan(s,p);if(plan)return this.prepareLayers(plan,p,o||{})&&focusReady;s=this.endpoint(s,p);const ready=this.select(s).prepare(s,p,o),fil=this.prepareFilaments(s,p);return ready&&fil&&focusReady;}async prepareAsync(s,p,o){if(o?.preview&&this.needsCooperative(s,p,o))return this.cooperative().worker.prepareAsync(s,p,{...o,cooperative:false});p=animationPhase(s,p||0);s=await this.physicalState(s,p*motionPeriod(s)/(Math.PI*2),o,true);if(!s||!await this.prepareFocus(s,p,o,true))return false;const plan=this.layerPlan(s,p);if(plan)return this.prepareLayersAsync(plan,p,o||{});s=this.endpoint(s,p);const ready=await this.select(s).prepareAsync(s,p,o);if(!ready)return false;this.prepareFilaments(s,p);return this.needsFilaments(s,p)?this.filamentPass.prepareAsync(o):true;}
 needsFilaments(s,p){s=this.endpoint(s,p);return !(s.engine==='particles'||s.pLiving>0)&&sampleFrame(s,p).filLength>0;}
 prepareFilaments(s,p){if(!this.needsFilaments(s,p))return true;this.filamentPass??=new FilamentPass(this.gl);return this.filamentPass.prepare(!!(s.filWrap||s.motions?.filWrap?.enabled));}
 filaments(s,p,w,h,o,async=false){
  if(this.kind!=='solid'||sampleFrame(s,p).filLength<=0)return true;
  this.applyFocus(s,p,w,h,null,{...o,beforeFilaments:true});
  this.filamentPass??=new FilamentPass(this.gl);
  return this.filamentPass[async?'drawAsync':'draw'](sampleFrame(finishingSource(s,o),p),p,w,h,this.impl,o);
 }
 prepareFilter(kind){
  const constructors={palette:['paletteFinishing',PaletteFinishPass],mosaic:['finishing',FinishingPass],rgb:['finishing',FinishingPass],warp:['opticalFinishing',OpticalPass],glass:['opticalFinishing',OpticalPass],feedback:['feedbackFinishing',FeedbackPass],scan:['scanFinishing',ScanlinePass],glyph:['glyphFinishing',GlyphPass],edge:['detailFinishing',DetailPass],glitch:['detailFinishing',DetailPass]};
  const descriptor=constructors[kind];
  if(descriptor){const [key,Pass]=descriptor;this[key]??=new Pass(this.gl);}
 }
 finish(s,o={},phase=0,timeline=phase){
  if(finishingOff(s,o)){this.feedbackFinishing?.release();this.paletteFinishing?.release();return false;}
  const values={...FINISH_DEFAULTS,...s},order=normalizeFinishOrder(s.finishOrder),w=this.canvas.width,h=this.canvas.height;
  for(const key of ['finishPrintNegative','finishPaletteMap','finishPaletteScale','finishPaletteOffset','finishPaletteBlur'])if(s.motions?.[key]?.enabled)values[key]=sampleFrame(s,phase)[key];
  const active={palette:values.finishPalette&&values.finishPaletteMap>0,feedback:values.finishFeedback&&values.finishFeedbackMix>0,scan:values.finishScan&&values.finishScanMix>0,warp:values.finishWarp&&values.finishWarpMix>0,glass:values.finishGlass&&values.finishGlassMix>0,mosaic:values.finishMosaic&&values.finishMosaicMix>0,rgb:values.finishRgb&&values.finishRgbMix>0,edge:values.finishEdge&&values.finishEdgeMix>0,glyph:values.finishGlyph&&values.finishGlyphMix>0,glitch:values.finishGlitch&&values.finishGlitchMix>0&&values.finishGlitchCoverage>0&&(values.finishGlitchAmount>0||values.finishGlitchSplit>0)};
  if(!active.feedback)this.feedbackFinishing?.release();
  if(!active.palette)this.paletteFinishing?.release();
  let applied=false;
  for(let i=0;i<order.length;i++){
   const kind=order[i];if(!active[kind])continue;applied=true;this.prepareFilter(kind);
   if(kind==='palette'){this.paletteFinishing.draw(values,w,h);}
   else if(kind==='mosaic'||kind==='rgb'){
    // Preserve the legacy fused pass when the two active filters remain adjacent.
    const fused=kind==='mosaic'&&order[i+1]==='rgb'&&active.rgb;
    this.finishing.draw({...values,finishMosaic:kind==='mosaic',finishRgb:kind==='rgb'||fused},w,h);if(fused)i++;
   }else if(kind==='warp'||kind==='glass'){this.opticalFinishing.draw(values,w,h,phase,kind==='glass'?1:0);}
   else if(kind==='feedback'){this.feedbackFinishing.draw(values,w,h,luminousPrintEnabled(values)?timeline:phase,!o.preview||o.liveDynamics,o.feedbackDeltaSeconds);}
   else if(kind==='scan'){this.scanFinishing.draw(values,w,h,phase);}
   else if(kind==='glyph'){this.glyphFinishing.draw(values,w,h,phase);}
   else{this.detailFinishing.draw(values,w,h,phase,kind==='edge'?0:1,o.frameInterval);}
  }
  return applied;
 }

 transitionAmount(s,p){if(s.pLiving!==4||!s.pVeilFromForm)return 1;const m=sampleFrame(s,p).pVeilMorph/.12;return m<=0?0:m>=1?1:m*m*(3-2*m);}
 draw(s,p,w,h,o={}){
  if(this.needsCooperative(s,p,o))return this.cooperative().submit(s,p,w,h,o);
  const timeline=p;p=animationPhase(s,p);s=this.physicalState(s,p*motionPeriod(s)/(Math.PI*2),o);if(!s)return false;
  // Measure the complete composed frame, including filters and transitions.
  // Inner timers must be disabled: WebGL forbids nested elapsed-time queries.
  this.pollGpuTime();const g=this.gl,q=o.preview&&o.trackTiming!==false&&this.frameTimer&&this.frameQueries.length<3?g.createQuery():null;
  if(q)g.beginQuery(this.frameTimer.TIME_ELAPSED_EXT,q);
  const inner={...printPreviewOptions(s,o),trackTiming:false,deferCompletion:true};let completed=false;
  try{const plan=this.layerPlan(s,p);if(!this.prepareFocus(s,p,o))return false;if(plan){if(!this.prepareLayers(plan,p,inner)||!this.drawLayers(plan,p,w,h,inner))return false;this.applyFocus(s,p,w,h,plan,o);this.finish(s,o,p,timeline);if(o.liveDynamics)this.lastPreviewDynamicsFrame=s._dynamics||null;completed=true;return true;}const mix=this.transitionAmount(s,p);if(mix>0&&mix<1){const base=this.sourceState(s);if(!this.select(base).draw(finishingSource(base,o),p,w,h,inner))return false;this.veilTransition??=new VeilTransition(this.gl);this.veilTransition.capture(0,w,h);}s=this.endpoint(s,p);const ok=this.select(s).draw(finishingSource(s,o),p,w,h,inner);if(ok){if(mix>0&&mix<1)this.veilTransition.draw(w,h,mix);this.filaments(s,p,w,h,o);this.applyFocus(s,p,w,h,null,o);this.finish(s,o,p,timeline);if(o.liveDynamics)this.lastPreviewDynamicsFrame=s._dynamics||null;completed=true;}return ok;}
  finally{if(q){g.endQuery(this.frameTimer.TIME_ELAPSED_EXT);this.frameQueries.push(q);}if(completed)this.fence();else if(q)g.flush();}
 }
 async drawWithTransition(method,s,p,w,h,o){
  const timeline=p;p=animationPhase(s,p);
  s=await this.physicalState(s,p*motionPeriod(s)/(Math.PI*2),o,true);if(!s)return false;
  o=printPreviewOptions(s,o);if(!await this.prepareFocus(s,p,o,true))return false;
  const plan=this.layerPlan(s,p);
  let drawsAfterBase=false;
  if(plan){
   if(!await this.prepareLayersAsync(plan,p,o)||o.cancelled?.())return false;
   if(!await this.drawLayerExport(plan,method,p,w,h,o)||o.cancelled?.())return false;
   drawsAfterBase=!!(plan.surface&&(plan.grains||this.needsFilaments(plan.surface,p)));
  }else{
   this.prepareFilaments(s,p);
   const filaments=this.needsFilaments(s,p),mix=this.transitionAmount(s,p),transition=mix>0&&mix<1;
   if(filaments&&!await this.filamentPass.prepareAsync(o))return false;
   if(transition){
    const source=this.sourceState(s);
    if(!await this.select(source)[method](finishingSource(source,o),p,w,h,o)||o.cancelled?.())return false;
    this.veilTransition??=new VeilTransition(this.gl);this.veilTransition.capture(0,w,h);
   }
   s=this.endpoint(s,p);
   if(!await this.select(s)[method](finishingSource(s,o),p,w,h,o)||o.cancelled?.())return false;
   if(transition)this.veilTransition.draw(w,h,mix);
   if(filaments&&!await this.filaments(s,p,w,h,o,true))return false;
   drawsAfterBase=filaments||transition;
  }
  const focus=this.applyFocus(s,p,w,h,plan,o),filters=this.finish(s,o,p,timeline);
  // Base passes already wait for their frame. A second fence is necessary
  // only when a later pass modified the canvas.
  if(drawsAfterBase||focus||filters){this.fence();if(!await this.waitForGpu(o))return false;}
  if(o.liveDynamics&&!o.cancelled?.())this.lastPreviewDynamicsFrame=s._dynamics||null;
  o.progress?.(1);return !o.cancelled?.();
 }
 async drawAccumulated(s,p,w,h,o={}){return this.drawWithTransition('drawAccumulated',s,p,w,h,o);}
 async drawTiled(s,p,w,h,o={}){return this.drawWithTransition('drawTiled',s,p,w,h,o);}
 fence(){if(this.impl?.completionSync)this.gl.deleteSync(this.impl.completionSync);this.impl.completionSync=this.gl.fenceSync(this.gl.SYNC_GPU_COMMANDS_COMPLETE,0);this.gl.flush();}
 pollGpuTime(){this.impl?.pollGpuTime();const g=this.gl,e=this.frameTimer;if(!e||g.isContextLost())return;const disjoint=g.getParameter(e.GPU_DISJOINT_EXT);while(this.frameQueries.length&&(disjoint||g.getQueryParameter(this.frameQueries[0],g.QUERY_RESULT_AVAILABLE))){const q=this.frameQueries.shift();if(!disjoint){const ms=g.getQueryParameter(q,g.QUERY_RESULT)/1e6;if(Number.isFinite(ms)&&ms>0){this.frameGpuMs=ms;this.frameGpuSample++;}}g.deleteQuery(q);}if(disjoint)this.frameGpuMs=null;}pollCompletion(){this.cooperativePreview?.checkError();return this.impl?.pollCompletion();}async waitForGpu(o){if(this.cooperativePreview?.job)await this.cooperativePreview.job.promise;this.cooperativePreview?.checkError();return this.impl?this.impl.waitForGpu(o):true;}
 hardwareInfo(){if(this.impl)return this.impl.hardwareInfo();const gl=this.gl,e=gl.getExtension('WEBGL_debug_renderer_info'),name=gl.getParameter(e?e.UNMASKED_RENDERER_WEBGL:gl.RENDERER);return {name,software:/swiftshader|llvmpipe/i.test(name)};}
 pixels(){return this.impl.pixels();}releaseSurface(){if(this.cooperativePreview?.busy)return false;this.cooperativePreview?.worker.releaseSurface();const ok=this.impl?.releaseSurface()??true;if(ok){this.focusPass?.release();this.focusDepthTarget?.release();this.bodyComposite?.release();this.filamentPass?.release();this.feedbackFinishing?.release();this.finishing?.release();this.glyphFinishing?.release();this.detailFinishing?.release();this.opticalFinishing?.release();this.scanFinishing?.release();this.paletteFinishing?.release();}return ok;}
 dispose(o){this.cooperativePreview?.dispose();this.cooperativePreview=null;disposeDynamics(this.gl);if(!this.gl.isContextLost())for(const q of this.frameQueries)this.gl.deleteQuery(q);this.frameQueries=[];this.focusPass?.dispose();this.focusDepthTarget?.release();this.bodyComposite?.release();this.bodySamples?.dispose();this.bodySamples=null;this.filamentPass?.dispose();this.filamentPass=null;this.veilTransition?.dispose();this.veilTransition=null;this.scanFinishing?.dispose();this.scanFinishing=null;this.paletteFinishing?.dispose();this.paletteFinishing=null;this.opticalFinishing?.dispose();this.opticalFinishing=null;this.detailFinishing?.dispose();this.detailFinishing=null;this.feedbackFinishing?.dispose();this.feedbackFinishing=null;this.finishing?.dispose();this.finishing=null;this.glyphFinishing?.dispose();this.glyphFinishing=null;const implementations=new Set([...Object.values(this.implementations||{}),this.impl].filter(Boolean));for(const renderer of implementations)renderer.dispose({loseContext:false});if(o?.loseContext!==false)this.recoveryExtension?.loseContext();this.implementations={};this.impl=null;this.kind=null;}
}
