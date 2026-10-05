import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-texture-audit');source=Path('/workspace/prisma-studio/dist/renderer.js').read_text()
# Test-only normal visualization of the exact production relief functions.
old='fragColor=vec4(normal*.5+.5,hit?1.:0.);'
new='vec3 detail=reliefNormal(normal,normal,direction,materialRelief(transform(point),normal,direction).xyz);fragColor=vec4(detail*.5+.5,hit?1.:0.);'
source+='\nMODERN_FRAG=MODERN_FRAG.replace('+json.dumps(old)+','+json.dumps(new)+');PREVIEW_FRAG=PREVIEW_FRAG.replace('+json.dumps(old)+','+json.dumps(new)+');\n'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox']);page=b.new_page()
 page.route('**/__anchor__',lambda r:r.fulfill(body='<html></html>',content_type='text/html'));page.route('**/__texture_diag.js',lambda r:r.fulfill(body=source,content_type='text/javascript'));page.goto('http://127.0.0.1:4186/__anchor__')
 result=page.evaluate(r'''async()=>{
 const {Renderer}=await import('/__texture_diag.js'),{newCreation,material,textureStyle}=await import('/creative-model.js');const r=new Renderer(document.createElement('canvas')),s=newCreation();material(s,14);textureStyle(s,0);s.textureFolds=.7;s.textureRipples=.5;const N=128,opts={quality:'full',normalDiagnostic:true};
 const draw=async state=>{await r.prepareAsync(state,0,opts);r.draw(state,0,N,N,opts);await r.waitForGpu();if(r.gl.getError()||r.gl.isContextLost())throw Error('GL failure');return r.pixels();};
 const a=await draw(s),rot=await draw({...s,rotateZ:90}),smooth=await draw({...s,textureWrinkles:0,textureFolds:0,textureWear:0,textureRipples:0});let total=0,count=0,max=0,detail=0;
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const q=(y*N+x)*4,src=(x*N+(N-1-y))*4;if(rot[q+3]<128||a[src+3]<128)continue;const expected=[255-a[src+1],a[src],a[src+2]];for(let j=0;j<3;j++){const d=Math.abs(expected[j]-rot[q+j]);total+=d;count++;max=Math.max(max,d);detail+=Math.abs(a[q+j]-smooth[q+j]);}}
 r.dispose();return {rotationMeanError:total/count,maxError:max,samples:count,textureMeanChange:detail/count};}''')
 b.close();(out/'texture-anchor-results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));assert result['rotationMeanError']<.6,result;assert result['textureMeanChange']>.5,result
