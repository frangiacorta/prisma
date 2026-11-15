export const BODY_LAYER_META = {
 sceneGrains:['Superficie ↔ granelli',0,1,.001],
 grainDispersal:['Distacco dal corpo',0,1,.01]
};

export const grainMix = s => Math.max(0,Math.min(1,s.sceneGrains??(s.engine==='particles'||s.pLiving>0?1:0)));
export const cloudBody = s => (s.grainSource??(s.engine==='particles'?'cloud':'body'))==='cloud';
export const hasGrainLayer = s => grainMix(s)>0||!!s.motions?.sceneGrains?.enabled;

// Preserve the original analytic cloud in older saves. Its companion surface
// uses the same controls where the geometry has a meaningful correspondence.
export const CLOUD_BODY_CONTROLS = {
 loopAmount:['pOpening',1],
 lobeAmount:['pLobeDepth',.4],
 lobes:['pLobes',1],
 cellMorph:['pCellAmount',1],
 petalAmount:['pTentacle',1]
};

export function cloudToBody(s){
 const body={...s,engine:'solid',pLiving:0,renderVersion:2};
 for(const [key,[cloud,scale]] of Object.entries(CLOUD_BODY_CONTROLS))body[key]=(s[cloud]||0)*scale;
 // Match the apparent diameter of the legacy cloud at the camera plane.
 const ring=Math.max(0,Math.min(1,(s.pOpening||0)/.45));
 const open=ring*ring*(3-2*ring);
 body.scale=(s.scale??1)*((s.pThickness??.6)*2*(1-open)+open)*1.7*2.6/7.5;
 body.loopRadius=Math.max(.6,.36+(s.pOpening||0)*.8);
 body.loopTube=Math.max(.06,Math.min(.6,s.pThickness??.6));
 return body;
}

export function normalizeBodyLayers(s,raw){
 if(Number.isFinite(raw.sceneGrains))s.sceneGrains=grainMix(raw);
 else delete s.sceneGrains;
 if(raw.grainSource==='cloud'||raw.grainSource==='body')s.grainSource=raw.grainSource;
 return s;
}

export function changeGrainSource(s,source){
 if(source!==(cloudBody(s)?'cloud':'body')&&!s.grainSource){
  if(source==='cloud'){
   for(const [key,[cloud,scale]] of Object.entries(CLOUD_BODY_CONTROLS))s[cloud]=Math.min(key==='lobes'?16:1,(s[key]||0)/scale);
  }else{
   const body=cloudToBody(s);
   for(const key of Object.keys(CLOUD_BODY_CONTROLS))s[key]=body[key];
   s.loopRadius=body.loopRadius;s.loopTube=body.loopTube;
  }
 }
 s.grainSource=source;
}
