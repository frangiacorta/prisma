import asyncio,json,pathlib,subprocess
from playwright.async_api import async_playwright
OUT=pathlib.Path('/workspace/prisma-roots-audit')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
  page=await browser.new_page()
  await page.route('**/encoder-test',lambda r:r.fulfill(content_type='text/html',body='Encoder streaming test'))
  await page.goto('http://127.0.0.1:4186/encoder-test')
  results=[]
  for case in [dict(name='noise-disk',memoryOnly=False),dict(name='noise-memory',memoryOnly=True)]:
   async with page.expect_download(timeout=120000) as dl:
    result=await page.evaluate('''async options=>{
     const {VideoExportSession}=await import('/video-export.js?v=test2'),s=new VideoExportSession();
     const ready=await s.init({width:256,height:256,fps:60,totalFrames:360,forceSoftware:true,memoryOnly:options.memoryOnly});
     let seed=1024;
     for(let n=0;n<360;n++){const pixels=new Uint8Array(256*256*4);for(let i=0;i<pixels.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;pixels[i]=seed>>>24;pixels[i+1]=seed>>>16;pixels[i+2]=seed>>>8;pixels[i+3]=255;}await s.frame(pixels);}
     const result=await s.finish();s.dispose();
     const url=URL.createObjectURL(result.blob),a=document.createElement('a');a.href=url;a.download=options.name+'.mp4';a.click();
     const video=document.createElement('video');video.muted=true;video.src=url;await new Promise((r,j)=>{video.onloadedmetadata=r;video.onerror=()=>j(new Error('Decode MP4 metadata failed'))});
     video.currentTime=5.9;await new Promise((r,j)=>{video.onseeked=r;video.onerror=()=>j(new Error('Seek MP4 failed'))});
     const playback={duration:video.duration,currentTime:video.currentTime,readyState:video.readyState,width:video.videoWidth,height:video.videoHeight};
     window.release=async()=>{video.removeAttribute('src');video.load();URL.revokeObjectURL(url);await result.release();const d=await(await navigator.storage.getDirectory()).getDirectoryHandle('prisma-video-exports');const names=[];for await(const [name] of d.entries())names.push(name);return names;};
     return {stats:result.stats,playback,storageName:result.storageName};
    }''',case)
   download=await dl.value;path=OUT/(case['name']+'.mp4');await download.save_as(path);remaining=await page.evaluate('release()');result['remainingTemp']=remaining
   assert result['stats']['bytes']>1024*1024
   assert result['storageName'] not in remaining
   subprocess.check_call(['ffmpeg','-v','error','-i',str(path),'-f','null','-'])
   result['name']=case['name'];results.append(result);print(json.dumps(result),flush=True)
  (OUT/'export-stream-results.json').write_text(json.dumps(results,indent=2));await browser.close()
asyncio.run(main())
