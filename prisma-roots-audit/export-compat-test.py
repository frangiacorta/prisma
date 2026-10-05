import asyncio,json,pathlib,subprocess
from playwright.async_api import async_playwright
OUT=pathlib.Path('/workspace/prisma-roots-audit')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
  page=await browser.new_page()
  await page.route('**/encoder-test',lambda r:r.fulfill(content_type='text/html',body='Encoder backwards compatibility'))
  await page.goto('http://127.0.0.1:4186/encoder-test')
  results=[]
  for case in [dict(name='legacy-25sec-native',legacy=True,forceSoftware=False),dict(name='legacy-25sec-software',legacy=True,forceSoftware=True),dict(name='modern-25sec-native',legacy=False,forceSoftware=False)]:
   async with page.expect_download(timeout=120000) as dl:
    result=await page.evaluate('''async options=>{
     let worker,session,request;
     const {VideoExportSession,removeVideoTemporaryFile}=await import('/video-export.js?v=compat-test');
     if(options.legacy){
      worker=new Worker('/encoder-worker.js');
      // Exact v14 request/response protocol, no request id, no totalFrames.
      request=(message,transfer=[])=>new Promise((resolve,reject)=>{const receive=e=>{worker.removeEventListener('message',receive);worker.removeEventListener('error',fail);if(e.data.error)reject(new Error(e.data.error));else resolve(e.data)};const fail=e=>{worker.removeEventListener('message',receive);reject(new Error(e.message))};worker.addEventListener('message',receive);worker.addEventListener('error',fail);worker.postMessage(message,transfer)});
     }else session=new VideoExportSession();
     const init={width:128,height:128,fps:60,forceSoftware:options.forceSoftware};
     const ready=options.legacy?await request({type:'init',...init}):await session.init({...init,totalFrames:1500});
     try{
      for(let n=0;n<1500;n++){const pixels=new Uint8Array(128*128*4);for(let i=0;i<pixels.length;i+=4){pixels[i]=(n+i/4)%256;pixels[i+1]=(n*2+i/512)%256;pixels[i+2]=120;pixels[i+3]=255;}if(options.legacy)await request({type:'frame',pixels},[pixels.buffer]);else await session.frame(pixels);}
      const result=options.legacy?await request({type:'finish'}):await session.finish();
      // Exact v14 finish consumer: Blob([result.buffer]), then worker terminate.
      const blob=options.legacy?new Blob([result.buffer],{type:'video/mp4'}):result.blob;
      worker?.terminate();session?.dispose();
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=options.name+'.mp4';a.click();
      const video=document.createElement('video');video.src=url;await new Promise((r,j)=>{video.onloadedmetadata=r;video.onerror=()=>j(new Error('Metadata error'))});video.currentTime=24.8;await new Promise((r,j)=>{video.onseeked=r;video.onerror=()=>j(new Error('Seek error'))});
      const playback={duration:video.duration,currentTime:video.currentTime,readyState:video.readyState};
      window.release=async()=>{video.removeAttribute('src');video.load();URL.revokeObjectURL(url);await removeVideoTemporaryFile(result.storageName)};
      return {ready:ready.stats,stats:result.stats,playback,bytes:blob.size,bufferIsBlob:result.buffer instanceof Blob};
     }finally{worker?.terminate();session?.dispose();}
    }''',case)
   download=await dl.value;path=OUT/(case['name']+'.mp4');await download.save_as(path);await page.evaluate('release()')
   probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_entries','stream=codec_name,nb_read_frames,nb_frames,duration,r_frame_rate','-of','json',str(path)]));result['probe']=probe;result['name']=case['name'];results.append(result);print(json.dumps(result),flush=True)
   assert int(probe['streams'][0]['nb_read_frames'])==1500 and float(probe['streams'][0]['duration'])==25
   assert result['bufferIsBlob']==case['legacy']
  invalid=await page.evaluate('''async()=>{
   const cases=[{name:'missing-modern',protocol:2},{name:'null',totalFrames:null},{name:'nan',totalFrames:NaN},{name:'infinity',totalFrames:Infinity},{name:'zero',totalFrames:0},{name:'fraction',totalFrames:1.5},{name:'long-30fps',fps:30,totalFrames:108001},{name:'long-60fps',totalFrames:216001}];const results=[];
   for(const c of cases){const w=new Worker('/encoder-worker.js'),result=await new Promise((r,j)=>{w.onmessage=e=>r(e.data);w.onerror=e=>j(e);w.postMessage({type:'init',width:128,height:128,fps:60,...c})});w.terminate();results.push({name:c.name,error:result.error});}
   return results;
  }''')
  assert all(x['error'] for x in invalid)
  assert all(('un’ora' in x['error'])==x['name'].startswith('long') for x in invalid)
  results.append({'invalid':invalid});print(json.dumps(invalid),flush=True)
  (OUT/'export-compat-results.json').write_text(json.dumps(results,indent=2));await browser.close()
asyncio.run(main())
