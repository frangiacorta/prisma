import asyncio,json,pathlib,time
from playwright.async_api import async_playwright
ROOT=pathlib.Path('/workspace/prisma-user-export');PRESET=json.loads(pathlib.Path('/workspace/attachments/4e93de70-cd4f-4a85-a8cb-2756bb8eb15a/Pasted text.txt').read_text())
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
  page=await b.new_page();await page.route('**/bench',lambda r:r.fulfill(content_type='text/html',body='<canvas id="c"></canvas>'));await page.goto('http://127.0.0.1:4190/bench');await page.expose_function('report',lambda x:print(json.dumps(x),flush=True))
  results=await page.evaluate('''async preset=>{const {Renderer}=await import('/renderer.js');window.r=new Renderer(document.querySelector('canvas'));window.preset=preset;const out=[];await report(r.hardwareInfo());for(const [w,h] of [[256,144],[1920,1080]]){const t=performance.now();await r.drawAccumulated(preset.state,preset.phase,w,h,{samples:2,progress:f=>report({w,progress:f,ms:performance.now()-t})});await r.waitForGpu();const ms=performance.now()-t;out.push({w,h,ms});await report({w,h,ms});}return out;}''',PRESET)
  (ROOT/'benchmark.json').write_text(json.dumps(results,indent=2));await page.locator('canvas').screenshot(path=str(ROOT/'reference1080.png'));await b.close()
asyncio.run(main())
