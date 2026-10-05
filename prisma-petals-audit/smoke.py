from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw,ImageFont
import json,base64,io
out=Path('/workspace/prisma-petals-audit')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox']);page=b.new_page();page.on('console',lambda m:print(m.text,flush=True) if m.type=='log' else None);page.goto('http://127.0.0.1:4173/renderer.js')
 data=page.evaluate('''async()=>{
 const {Renderer,fieldAt}=await import('./renderer.js'),{newCreation}=await import('./creative-model.js'),{MATERIAL_STYLES}=await import('./studio-model.js');const r=new Renderer(document.createElement('canvas')),images=[];
 const q=Object.assign(newCreation(),MATERIAL_STYLES[14].values,{palette:['#408cef'],roughness:.55,gloss:.4,petalAmount:1,rotateX:35,scale:.85});
 for(const [name,values] of [['Rosetta',{}],['Petali appuntiti',{petalSharp:1}],['Riccio',{petalCoverage:1,petalWidth:.13,petalLength:.65,petalCount:18,petalRows:7}],['Borchie',{petalLength:.3,petalWidth:.2}],['Aghi',{petalWidth:.055,petalLength:.9}],['Fiore',{petalCoverage:0,petalSharp:0,petalWidth:.24,petalLength:1.05,stemAmount:.65,scale:.65,positionY:.3,rotateX:35}]]){Object.assign(q,values);r.draw(q,0,192,192,{preview:true});const a=r.pixels();if(r.gl.getError())throw Error(name+' GL');let visible=0;for(let i=0;i<a.length;i+=4)if(a[i]+a[i+1]+a[i+2]>30)visible++;images.push({name,visible,url:r.canvas.toDataURL(),state:structuredClone(q)});console.log(name+' '+visible+' pixels');}
 r.dispose();return images;}''')
 font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14);sheet=Image.new('RGB',(640,460),'#181a20');d=ImageDraw.Draw(sheet)
 for i,q in enumerate(data):x=16+i%3*208;y=16+i//3*220;d.text((x,y),q['name'],font=font,fill='white');sheet.paste(Image.open(io.BytesIO(base64.b64decode(q['url'].split(',')[1]))).convert('RGB'),(x,y+22))
 sheet.save(out/'smoke-shapes.png');(out/'smoke-states.json').write_text(json.dumps([{k:v for k,v in q.items() if k!='url'} for q in data],indent=2));assert all(q['visible']>300 for q in data),[(q['name'],q['visible']) for q in data];b.close();print('SMOKE: PASS',flush=True)
