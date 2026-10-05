from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import base64,io,json,numpy as np
out=Path('/workspace/prisma-audit')
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page();page.on('console',lambda m:print(m.text,flush=True) if m.type=='log' else None);page.goto('http://127.0.0.1:4173/renderer.js')
 data=page.evaluate('''async()=>{
 const {Renderer}=await import('./renderer.js'),{preset}=await import('./model.js'),{MATERIAL_STYLES,newLight}=await import('./studio-model.js');const canvas=document.createElement('canvas'),r=new Renderer(canvas),images=[],metrics={};
 const s=Object.assign(preset(0),MATERIAL_STYLES.find(m=>m.name==='Pelle sottile').values,{background:'#000000',grain:0,glow:0,edge:0});for(const t of Object.values(s.motions))t.enabled=false;
 function save(name,state=s,size=300,options={preview:true}){r.draw(state,0,size,size,options);const raw=r.pixels();images.push({name,url:canvas.toDataURL()});console.log(name);return raw;}
 for(const [name,values] of [['Pelle attuale',{}],['Senza SSS',{subsurface:0}],['Senza diffusione interna',{scattering:0,translucency:0,subsurface:0}],['Parete piena',{hollow:0}],['Senza microtexture',{surfaceTexture:0}],['Solo superficie con SSS',{transparency:0,translucency:0,scattering:0}],['SSS spento + opaca',{subsurface:0,transparency:0,translucency:0,scattering:0}],['SSS + luce davanti',{lights:[{...newLight(1),x:0,y:1.8,z:3,size:1.7,type:'bar',length:.35,visible:false}]}]])save(name,{...s,...values});
 const issues=save('Diagnostica raggi',s,300,{diagnostic:true});let types={};for(let j=0;j<issues.length;j+=4)if(issues[j])types[issues[j]]=(types[issues[j]]||0)+1;metrics.skinTrace=types;
 const q=Object.assign(preset(1),MATERIAL_STYLES[8].values,{rotateX:0,rotateY:0,grain:0,glow:0,edge:0,filmThickness:1200,background:'#000000',surfaceTexture:.4});
 for(const t of Object.values(q.motions))t.enabled=false;q.lights=[{...newLight(1),type:'grid',x:-1,y:1,z:2.8,size:1.2,length:1,softness:.03,grid:12,power:3,visible:false}];
 save('Bolla · 1 campione',q,192);save('Bolla · riferimento 4x',q,768);
 metrics.error=r.gl.getError();r.dispose();return{images,metrics};}''')
 images=data['images'];sheet=Image.new('RGB',(4*316+16,3*344+16),'#17191e');d=ImageDraw.Draw(sheet)
 for i,q in enumerate(images[:9]):
  im=Image.open(io.BytesIO(base64.b64decode(q['url'].split(',')[1]))).convert('RGB');(out/f'detail-{i:02d}.png').write_bytes(base64.b64decode(q['url'].split(',')[1]));x=16+(i%4)*316;y=16+(i//4)*344;sheet.paste(im,(x,y+26));d.text((x,y+3),q['name'],font=font,fill='white')
 sheet.save(out/'pelle-nero-diagnosi.png')
 a=Image.open(io.BytesIO(base64.b64decode(images[-2]['url'].split(',')[1]))).convert('RGB');bim=Image.open(io.BytesIO(base64.b64decode(images[-1]['url'].split(',')[1]))).convert('RGB').resize(a.size,Image.Resampling.LANCZOS)
 difference=np.abs(np.array(a,dtype=float)-np.array(bim,dtype=float));data['metrics']['aaDifference']={'mean':float(difference.mean()),'pixels_gt_20':int((difference.max(2)>20).sum())}
 sheet=Image.new('RGB',(800,450),'#17191e');d=ImageDraw.Draw(sheet)
 for i,(im,title) in enumerate([(a,'Attuale: 1 campione/pixel'),(bim,'Riferimento supersampled')]):sheet.paste(im.resize((384,384),Image.Resampling.NEAREST),(8+i*400,35));d.text((8+i*400,10),title,font=font,fill='white')
 sheet.save(out/'antialias-diagnosi.png');(out/'details.json').write_text(json.dumps(data['metrics'],indent=2));print(json.dumps(data['metrics']),flush=True);b.close()
