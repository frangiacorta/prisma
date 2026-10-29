importScripts('./vendor/mediapipe/vision_bundle.js?v=38e810dd65ce');
let hands,pose,convert,backend;
self.onmessage=async({data})=>{
 try{
  if(data.type==='init'){
   ({limbPoints:convert}=await import('./body-landmarks.js?v=38e810dd65ce'));
   const files=await Vision.FilesetResolver.forVisionTasks(new URL('./vendor/mediapipe/wasm/',self.location.href).href);
   const {createLimbDetectors}=await import('./vendor/mediapipe-td/limb-detectors.js?v=38e810dd65ce');
   ({hands,pose,backend}=await createLimbDetectors(Vision,files,name=>new URL('./vendor/mediapipe/models/'+name,self.location.href).href,{cpuOnly:data.cpuOnly===true}));
   self.postMessage({type:'ready',backend});
  }else if(data.type==='frame'){
   try{
    const start=performance.now(),h=hands.detectForVideo(data.bitmap,data.timestamp),p=pose.detectForVideo(data.bitmap,data.timestamp);
    self.postMessage({type:'result',backend,...convert(h,p),processingMs:performance.now()-start,timestamp:data.timestamp});
   }finally{data.bitmap.close();}
  }
 }catch(e){self.postMessage({type:'error',message:e.message});}
};
