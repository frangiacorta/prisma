import asyncio,json,pathlib,time,subprocess
from playwright.async_api import async_playwright
R=pathlib.Path('/workspace/prisma-user-export');P=json.loads(pathlib.Path('/workspace/attachments/4e93de70-cd4f-4a85-a8cb-2756bb8eb15a/Pasted text.txt').read_text());OUTPUT=R/'Prisma-Palloncino-metallizzato-1080p-60fps.mp4'
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox']);page=await b.new_page(viewport={'width':1920,'height':1080});await page.route('**/render-job',lambda r:r.fulfill(content_type='text/html',body='<style>body{margin:0;background:black}canvas{display:block}</style><canvas></canvas>'));await page.goto('http://127.0.0.1:4190/render-job')
  def report(x):
   print(json.dumps(x),flush=True);(R/'export-progress.json').write_text(json.dumps(x,indent=2))
  await page.expose_function('report',report)
  async with page.expect_download(timeout=1800000) as download_info:
   result=await page.evaluate('''async p=>{
    const {CachedRenderer}=await import('/cached-export.js?v=fullframe'),{VideoExportSession}=await import('/video-export.js');
    const r=new CachedRenderer(document.querySelector('canvas')),width=1920,height=1080,fps=60,totalFrames=1440;
    const checks=[];
    await report({stage:'preparing',gpu:r.hardwareInfo()});await r.bake(p.state,p.phase,width,height,2);
    for(const offset of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
     r.mode='baseline';await r.drawAccumulated(p.state,p.phase+offset,width,height,{samples:2});const baseline=r.pixels();
     r.mode='cached';const t=performance.now();await r.drawAccumulated(p.state,p.phase+offset,width,height,{samples:2});const pixels=r.pixels();let max=0,bad=0,sum=0;for(let i=0;i<pixels.length;i++){const d=Math.abs(pixels[i]-baseline[i]);max=Math.max(max,d);sum+=d;if(d>1)bad++;}const check={phase:p.phase+offset,ms:performance.now()-t,max,bad,mean:sum/pixels.length};checks.push(check);await report({stage:'verification',...check});if(max>1||bad)throw Error('Cached renderer differs from full export');
    }
    const encoder=new VideoExportSession(),ready=await encoder.init({width,height,fps,totalFrames});await report({stage:'encoding',encoder:ready.stats,totalFrames});
    const started=performance.now();let maxFrameMs=0;const sampleHashes=[];
    try{
     for(let n=0;n<totalFrames;n++){
      const t=performance.now(),phase=(p.phase+n/totalFrames*Math.PI*2)%(Math.PI*2);
      await r.drawAccumulated(p.state,phase,width,height,{samples:2});const pixels=r.pixels();
      if(n%120===0){let hash=2166136261;for(let i=0;i<pixels.length;i+=13)hash=Math.imul(hash^pixels[i],16777619);sampleHashes.push({frame:n,hash:hash>>>0});}
      await encoder.frame(pixels);maxFrameMs=Math.max(maxFrameMs,performance.now()-t);
      if(n%60===0||n===totalFrames-1)await report({stage:'rendering',frame:n+1,totalFrames,elapsedSec:(performance.now()-started)/1000,etaSec:(performance.now()-started)/(n+1)*(totalFrames-n-1)/1000});
     }
     await report({stage:'finalizing'});const result=await encoder.finish(),url=URL.createObjectURL(result.blob),a=document.createElement('a');a.href=url;a.download='Prisma-Palloncino-metallizzato-1080p-60fps.mp4';a.click();window.release=async()=>{URL.revokeObjectURL(url);await result.release();};return {checks,stats:result.stats,totalFrames,width,height,fps,duration:24,phase:p.phase,elapsedSec:(performance.now()-started)/1000,maxFrameMs,sampleHashes};
    }finally{encoder.dispose();}
   }''',P)
  download=await download_info.value;await download.save_as(OUTPUT);await page.evaluate('release()');await page.locator('canvas').screenshot(path=str(R/'last-frame.png'));await b.close()
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_entries','stream=codec_name,profile,width,height,r_frame_rate,avg_frame_rate,duration,nb_frames,nb_read_frames,pix_fmt','-show_entries','format=size,duration','-of','json',str(OUTPUT)]));result['probe']=probe;assert int(probe['streams'][0]['nb_read_frames'])==1440;assert float(probe['streams'][0]['duration'])==24;assert len(set(x['hash'] for x in result['sampleHashes']))>8
  (R/'export-result.json').write_text(json.dumps(result,indent=2));report({'stage':'complete','file':str(OUTPUT),'bytes':OUTPUT.stat().st_size,'result':result})
asyncio.run(main())
