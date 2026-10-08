import {PathfinderRenderer} from './renderer.js';
import {validateExportSettings,exportBitrate} from './model.js';
import {createExportTarget} from './export-target.js';

export async function exportLoop(parameters, {settings, signal, onProgress}) {
  if (!globalThis.VideoEncoder) throw new Error('Questo browser non supporta la codifica MP4. Usa un browser aggiornato con WebCodecs, oppure Chrome/Edge sul PC.');
  settings=validateExportSettings(settings);
  const {fps}=settings,[width,height]=settings.size.split('x').map(Number),frames=parameters.duration*fps;
  const library=await import('./vendor/mediabunny-1.61.3.mjs');
  const {Output,Mp4OutputFormat,CanvasSource,canEncodeVideo,Quality}=library;
  const bitrate=exportBitrate(settings),quality=new Quality({bitrate});
  if(!await canEncodeVideo('avc',{width,height,quality,frameRate:fps}))throw new Error('MP4 non disponibile con questo formato. Prova HD a 30 fps in Chrome o Edge.');
  const canvas=document.createElement('canvas');
  let renderer,output,first,last,destination;
  try {
    destination=await createExportTarget(library,parameters,settings,signal);
    renderer=new PathfinderRenderer(canvas);renderer.resize(width,height);
    // Regular, seekable MP4: reserve the small metadata area and stream media to disk.
    output=new Output({format:new Mp4OutputFormat({fastStart:'reserve'}),target:destination.target});
    const source=new CanvasSource(canvas,{codec:'avc',quality,keyFrameInterval:1,latencyMode:'quality'});
    output.addVideoTrack(source,{frameRate:fps,maximumPacketCount:frames});
    await output.start();
    for(let i=0;i<frames;i++){
      signal.throwIfAborted();
      renderer.render(parameters,i/fps,width,height);
      if(i===0)first=renderer.pixels();
      if(i===frames-1)last=renderer.pixels();
      await source.add(i/fps,1/fps);
      onProgress((i+1)/frames,i+1,frames);
      if(i%3===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
    source.close();await output.finalize();signal.throwIfAborted();
    renderer.render(parameters,parameters.duration,width,height);
    const closure=renderer.pixels();let maxError=0,seam=0;
    for(let i=0;i<first.length;i+=4)for(let c=0;c<3;c++){
      maxError=Math.max(maxError,Math.abs(first[i+c]-closure[i+c]));seam+=Math.abs(first[i+c]-last[i+c]);
    }
    const report={version:2,width,height,fps,frames,duration:frames/fps,quality:settings.quality,bitrate,closureMaxChannelError:maxError,lastToFirstMeanDifference:seam/(width*height*3),device:renderer.device,streamed:destination.streamed};
    if(maxError>1)throw new Error('Il controllo del raccordo non è passato. Esportazione interrotta.');
    const saved=await destination.finish(report);
    return {...saved,report};
  }catch(error){
    if(output&&output.state!=='finalized'&&output.state!=='canceled')await output.cancel().catch(()=>{});
    await destination?.discard();
    throw error;
  }finally{renderer?.dispose();canvas.width=canvas.height=1;}
}
