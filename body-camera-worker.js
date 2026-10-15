importScripts('./vendor/mediapipe/vision_bundle.js?v=70b6470e0c8d');
let hands,pose,convert;
self.onmessage=async({data})=>{
 try{
  if(data.type==='init'){
   ({limbPoints:convert}=await import('./body-landmarks.js?v=70b6470e0c8d'));
   const files=await Vision.FilesetResolver.forVisionTasks(new URL('./vendor/mediapipe/wasm/',self.location.href).href);
   const model=name=>({modelAssetPath:new URL('./vendor/mediapipe/models/'+name,self.location.href).href,delegate:'CPU'});
   hands=await Vision.HandLandmarker.createFromOptions(files,{baseOptions:model('hand_landmarker.task'),runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.35,minHandPresenceConfidence:.35,minTrackingConfidence:.4});
   pose=await Vision.PoseLandmarker.createFromOptions(files,{baseOptions:model('pose_landmarker_lite.task'),runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.5,minPosePresenceConfidence:.5,minTrackingConfidence:.5,outputSegmentationMasks:false});
   self.postMessage({type:'ready'});
  }else if(data.type==='frame'){
   try{
    const start=performance.now(),h=hands.detectForVideo(data.bitmap,data.timestamp),p=pose.detectForVideo(data.bitmap,data.timestamp);
    self.postMessage({type:'result',...convert(h,p),processingMs:performance.now()-start,timestamp:data.timestamp});
   }finally{data.bitmap.close();}
  }
 }catch(e){self.postMessage({type:'error',message:e.message});}
};
