import asyncio,json,pathlib,subprocess,time
from playwright.async_api import async_playwright
OUT=pathlib.Path('/workspace/prisma-roots-audit')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
  page=await browser.new_page()
  await page.route('**/encoder-test',lambda route:route.fulfill(status=200,content_type='text/html',body='<html>Encoder CPU test</html>'))
  await page.goto('http://127.0.0.1:4186/encoder-test')
  await page.expose_function('recordProgress',lambda x:print(json.dumps(x),flush=True))
  results=[]
  for case in [dict(name='native-122sec',frames=7320,forceSoftware=False,memoryOnly=False),dict(name='software-8000frames',frames=8000,forceSoftware=True,memoryOnly=False),dict(name='software-memory',frames=121,forceSoftware=True,memoryOnly=True)]:
   start=time.time()
   async with page.expect_download(timeout=300000) as dl:
    result=await page.evaluate('''async options=>{
     const {VideoExportSession}=await import('/video-export.js?v=test1'),session=new VideoExportSession();
     const ready=await session.init({width:128,height:128,fps:60,totalFrames:options.frames,forceSoftware:options.forceSoftware,memoryOnly:options.memoryOnly});
     const started=performance.now();
     try{
      for(let n=0;n<options.frames;n++){
       const pixels=new Uint8Array(128*128*4),phase=n/options.frames*Math.PI*2;
       for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4;pixels[i]=Math.round(127+126*Math.sin(x/18+phase));pixels[i+1]=Math.round(127+126*Math.cos(y/16+phase));pixels[i+2]=x^y;pixels[i+3]=255;}
       await session.frame(pixels);
       if(n%1000===0)await recordProgress({name:options.name,frame:n,ms:performance.now()-started});
      }
      const result=await session.finish(),url=URL.createObjectURL(result.blob),a=document.createElement('a');a.href=url;a.download=options.name+'.mp4';a.click();
      window.releaseExport=async()=>{URL.revokeObjectURL(url);await result.release();};
      return {ready:ready.stats,final:result.stats,elapsedMs:performance.now()-started,size:result.blob.size,storageName:result.storageName};
     }finally{session.dispose();}
    }''',case)
   download=await dl.value;path=OUT/(case['name']+'.mp4');await download.save_as(path);await page.evaluate('releaseExport()')
   probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_entries','stream=codec_name,nb_read_frames,nb_frames,duration,r_frame_rate,width,height','-of','json',str(path)]))
   result['probe']=probe;result['name']=case['name'];results.append(result);print(json.dumps(result),flush=True)
   assert int(probe['streams'][0]['nb_read_frames'])==case['frames']
   assert abs(float(probe['streams'][0]['duration'])-case['frames']/60)<.0001
   assert result['final']['maxPendingFrames']<=(60 if case['forceSoftware'] or result['ready']['backend']=='software' else 8)
  # Cancellation while init is pending must reject immediately and permit retry.
  cancel=await page.evaluate('''async()=>{const {VideoExportSession}=await import('/video-export.js?v=test1');const s=new VideoExportSession(),start=performance.now(),promise=s.init({width:128,height:128,fps:60,totalFrames:1000});s.abort();let error;try{await promise}catch(e){error=e.name}return {error,elapsedMs:performance.now()-start,pending:s.pending.size};}''')
  assert cancel['error']=='AbortError' and cancel['pending']==0
  results.append({'cancel':cancel});(OUT/'long-export-results.json').write_text(json.dumps(results,indent=2));await browser.close()
asyncio.run(main())
