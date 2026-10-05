"""Verify cached geometry invalidation, shader reuse, and preview geometry quality.
Runs actual WebGL. GPU slot must be granted by parent before execution.
"""
import argparse,base64,io,json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4185');args=parser.parse_args()
out=Path('/workspace/prisma-fast-audit');out.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page();page.on('console',lambda m:print(m.text,flush=True));errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/__audit__',lambda route:route.fulfill(body='<html></html>',content_type='text/html'));page.goto(args.url+'/__audit__')
 result=page.evaluate(r'''async()=>{
 const {Renderer}=await import('/renderer.js'),{newCreation,material,sculpt}=await import('/creative-model.js');
 const r=new Renderer(document.createElement('canvas')),metrics={hardware:r.hardwareInfo(),cache:[],programs:[],geometry:[],animation:[],materials:[]},images=[];
 const draw=async(s,opts={preview:true,quality:'fast'},size=96,phase=0)=>{const start=performance.now();await r.prepareAsync(s,phase,opts);for(let j=0;!r.draw(s,phase,size,size,opts);j++){if(j>10000)throw Error('No rendered result');await new Promise(f=>setTimeout(f,8));}await r.waitForGpu(opts);if(r.gl.isContextLost()||r.gl.getError())throw Error('WebGL failure');return performance.now()-start;};
 const uploads=()=>r.bakeUploads??r.fieldUploads;
 const image=name=>images.push({name,url:r.canvas.toDataURL()});
 const s=newCreation();await draw(s);let count=r.programs.size;metrics.programs.push({amount:0,count});for(const amount of [.05,.15,.35,.7,1]){s.petalAmount=amount;const ms=await draw(s);metrics.programs.push({amount,count:r.programs.size,ms});}console.log('PROGRAM REUSE '+JSON.stringify(metrics.programs));
 const changes=[['rotateX',12],['rotateY',18],['rotateZ',20],['scale',.82],['positionX',.1],['positionY',.1],['stretchX',1.1],['stretchY',.9],['stretchZ',1.2],['volume',.8],['roughness',.3],['metal',.3],['gloss',.6],['background','#ffffff'],['bgMode','gradient']];
 if(!Number.isFinite(uploads()))throw Error('Renderer missing bakeUploads/fieldUploads counter');
 for(const [key,value] of changes){const before=uploads();s[key]=value;await draw(s);metrics.cache.push({kind:'reuse',key,before,after:uploads()});}
 for(const key of ['light-position','light-color','palette','material']){const before=uploads();if(key==='light-position')s.lights[0].x+=.3;if(key==='light-color')s.lights[0].color='#ffeedd';if(key==='palette')s.palette=['#ff6655','#aa66ff'];if(key==='material')material(s,1);await draw(s);metrics.cache.push({kind:'reuse',key,before,after:uploads()});}
 for(const [key,value] of [['petalAmount',.7],['petalOpen',.4],['petalCurl',.22],['petalWidth',.31],['petalCount',19],['deform',.1],['twist',.2],['hole',.15]]){const before=uploads();s[key]=value;await draw(s);metrics.cache.push({kind:'rebuild',key,before,after:uploads()});}console.log('CACHE '+JSON.stringify(metrics.cache));
 const animate=sculpt(newCreation(),1);material(animate,14);animate.motions.petalCurl={...animate.motions.petalCurl,enabled:true,amplitude:.2,cycles:1,phase:0};
 for(let i=0;i<8;i++){const before=uploads(),ms=await draw(animate,{preview:true,quality:'fast'},96,i/8*Math.PI*2);metrics.animation.push({frame:i,ms,before,after:uploads()});}console.log('ANIMATION CACHE '+JSON.stringify(metrics.animation));
 // Surface geometry comparisons use an opaque diagnostic so optics cannot obscure the silhouette.
 // Full remains the analytic reference; preview intentionally approximates the cached SDF.
 for(const [name,shape] of [['partial petals',0],['organic needles',3]]){
  const state=sculpt(newCreation(),shape);material(state,14);if(shape===0)state.petalAmount=.35;
  const normalOpts={normalDiagnostic:true};const references={};
  for(const size of [96,256]){const ms=await draw(state,{...normalOpts,quality:'full'},size);references[size]=r.pixels();image(`${name} · exact ${size}`);console.log('REFERENCE '+name+' '+size+' '+ms.toFixed(1)+'ms');}
  for(const quality of ['fast','balanced'])for(const size of [96,256]){const ms=await draw(state,{...normalOpts,preview:true,quality},size);const got=r.pixels(),ref=references[size];let intersection=0,union=0,mismatch=0,normalDifference=0,normalChannels=0;for(let i=0;i<ref.length;i+=4){const a=ref[i+3]>127,c=got[i+3]>127;if(a||c)union++;if(a&&c){intersection++;for(let j=0;j<3;j++){normalDifference+=Math.abs(ref[i+j]-got[i+j]);normalChannels++;}}if(a!==c)mismatch++;}metrics.geometry.push({name,size,quality,ms,iou:intersection/Math.max(1,union),silhouetteMismatches:mismatch,meanNormalChannelDifference:normalDifference/Math.max(1,normalChannels)});image(`${name} · ${quality} ${size}`);console.log('GEOMETRY '+JSON.stringify(metrics.geometry.at(-1)));}
 }
 for(const [name,index] of [['bubble',0],['water',1],['metal',14],['sss',18]]){const state=sculpt(newCreation(),1);material(state,index);state.lights.push({...state.lights[0],id:4,type:'orb',x:0,y:0,z:0,size:.12,power:2,color:'#ffcc99',visible:true});const ms=await draw(state,{preview:true,quality:'fast'},256);image('material · '+name);metrics.materials.push({name,ms});console.log('MATERIAL '+name+' '+ms.toFixed(1)+'ms');}
 r.dispose();return {metrics,images};
 }''')
 (out/'atlas-results.json').write_text(json.dumps(result['metrics'],indent=2))
 font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
 cols=3;rows=(len(result['images'])+cols-1)//cols;sheet=Image.new('RGB',(cols*290,rows*290),'#181a20');d=ImageDraw.Draw(sheet)
 for i,item in enumerate(result['images']):
  x=(i%cols)*290+8;y=(i//cols)*290+8;d.text((x,y),item['name'],font=font,fill='white');pic=Image.open(io.BytesIO(base64.b64decode(item['url'].split(',')[1]))).convert('RGBA');background=Image.new('RGBA',pic.size,'#343740');background.alpha_composite(pic);sheet.paste(background.convert('RGB').resize((256,256)),(x,y+20))
 sheet.save(out/'atlas-surface-comparison.png')
 m=result['metrics'];assert all(x['before']==x['after'] for x in m['cache'] if x['kind']=='reuse'),m['cache'];assert all(x['after']>x['before'] for x in m['cache'] if x['kind']=='rebuild'),m['cache'];assert len(set(x['count'] for x in m['programs']))==1,m['programs'];assert all(x['iou']>.94 for x in m['geometry']),m['geometry'];assert not errors,errors
 b.close();print('CACHE, SHADER REUSE, GEOMETRY AND MATERIAL CHECKS PASS',flush=True)
