// Adapted from torinmb/mediapipe-touchdesigner src/poseTracking.js.
// Copyright Torin Blankensmith, MIT; see LICENSE and NOTICE.txt.
// Prisma adaptation: worker canvases, hand landmarks without gesture classifier,
// and CPU/Lite fallback when GPU creation is unavailable.
export async function createLimbDetectors(Vision,files,asset,{cpuOnly=false}={}){
 let hands,pose;
 async function create(gpu){
  const options=name=>({baseOptions:{modelAssetPath:asset(name),delegate:gpu?'GPU':'CPU'},runningMode:'VIDEO',...(gpu?{canvas:new OffscreenCanvas(1,1)}:{})});
  hands=await Vision.HandLandmarker.createFromOptions(files,{...options('hand_landmarker.task'),numHands:2,minHandDetectionConfidence:.6,minHandPresenceConfidence:.6,minTrackingConfidence:.6});
  pose=await Vision.PoseLandmarker.createFromOptions(files,{...options(gpu?'pose_landmarker_full.task':'pose_landmarker_lite.task'),numPoses:1,minPoseDetectionConfidence:.65,minPosePresenceConfidence:.65,minTrackingConfidence:.65,outputSegmentationMasks:false});
  return {hands,pose,backend:gpu?'GPU · Pose Full':'CPU · Pose Lite'};
 }
 if(!cpuOnly)try{return await create(true);}catch{hands?.close();pose?.close();hands=pose=null;}
 try{return await create(false);}catch(e){hands?.close();pose?.close();throw e;}
}
