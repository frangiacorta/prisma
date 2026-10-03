importScripts('./vendor/h264-mp4-encoder.web.js');
let encoder;
self.onmessage=async ({data})=>{try{
 if(data.type==='init'){encoder=await HME.createH264MP4Encoder();encoder.width=data.width;encoder.height=data.height;encoder.frameRate=data.fps;encoder.speed=8;encoder.quantizationParameter=20;encoder.groupOfPictures=data.fps;encoder.initialize();self.postMessage({ready:true})}
 if(data.type==='frame'){encoder.addFrameRgba(data.pixels);self.postMessage({frame:true})}
 if(data.type==='finish'){encoder.finalize();const bytes=encoder.FS.readFile(encoder.outputFilename);const buffer=bytes.slice().buffer;encoder.delete();encoder=null;self.postMessage({buffer},[buffer])}
}catch(e){self.postMessage({error:e.message||String(e)})}};
