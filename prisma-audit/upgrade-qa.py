from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw,ImageFont
import base64,io,json
out=Path('/workspace/prisma-audit');font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page();page.on('console',lambda m:print(m.text,flush=True) if m.type=='log' else None);page.goto('http://127.0.0.1:4173/renderer.js')
 data=page.evaluate('''async()=>{
 const {Renderer,fieldAt}=await import('./renderer.js'),{preset,PRESETS}=await import('./model.js'),{MATERIAL_STYLES,LEGACY_MATERIAL_STYLES,newLight}=await import('./studio-model.js'),{newCreation,motionPreset}=await import('./creative-model.js');
 const c=document.createElement('canvas'),r=new Renderer(c),images=[],states=[],timings=[];
 function save(name,s,size=240,group='material'){let t=performance.now();r.draw(s,0,size,size,{preview:true});const a=r.pixels();if(r.gl.getError())throw Error('GL error '+name);images.push({name,url:c.toDataURL(),group});states.push({name,state:structuredClone(s)});const ms=performance.now()-t;timings.push({name,ms:Math.round(ms)});console.log(name+' '+Math.round(ms)+' ms');return a;}
 for(let i=0;i<PRESETS.length;i++){const s=preset(i);r.draw(s,0,160,94);images.push({name:String(i),group:'thumb',url:c.toDataURL('image/webp',.94)});save(PRESETS[i].name,s,240,'legacy');}
 for(const m of MATERIAL_STYLES){const s=Object.assign(newCreation(),m.values);save(m.name,s);}
 const gel=Object.assign(newCreation(),MATERIAL_STYLES[8].values,{palette:['#ff96b5','#e15f93','#ffcadd']});gel.lights=[];save('Gelatina senza luce',gel,240,'internal');gel.lights=[{...newLight(1),type:'orb',size:.12,length:.12,power:5,x:.2,y:.12,z:.15,color:'#ffcf81',visible:false}];save('Gelatina · luce interna',gel,240,'internal');gel.lights[0].x=-.55;gel.lights[0].color='#80ddff';save('Luce interna spostata',gel,240,'internal');
 const skin=Object.assign(newCreation(),MATERIAL_STYLES[17].values,{palette:['#ffcbb7','#e39d87']});save('Pelle nuova',skin,240,'skin');skin.lights=[{...newLight(1),type:'orb',x:.3,y:.2,z:0,size:.12,length:.12,power:3,visible:false}];save('Pelle · luce interna',skin,240,'skin');
 const bubble=newCreation();const t=performance.now();await r.drawAccumulated(bubble,0,192,192,{samples:4});let gl=r.gl.getError();images.push({name:'Bolla · 4 campioni',group:'quality',url:c.toDataURL()});console.log('Accumulo '+gl+' '+Math.round(performance.now()-t)+' ms');
 const loops=[];for(const [k] of [['breathe'],['reflect'],['film'],['orbit'],['wave']]){const s=motionPreset(newCreation(),k);r.draw(s,0,64,64);const a=r.pixels();r.draw(s,Math.PI*2,64,64);const z=r.pixels();loops.push({k,diff:a.reduce((n,v,i)=>n+Math.abs(v-z[i]),0)});}r.dispose();return{images,states,timings,loops,gl};}''')
 (out/'upgrade-qa.json').write_text(json.dumps({k:v for k,v in data.items() if k!='images'},ensure_ascii=False,indent=2))
 assets=Path('/workspace/prisma-studio/dist/presets');assets.mkdir(exist_ok=True)
 for im in data['images']:
  if im['group']=='thumb':(assets/(im['name']+'.webp')).write_bytes(base64.b64decode(im['url'].split(',')[1]))
 for group in ['material','internal','skin','quality']:
  ims=[q for q in data['images'] if q['group']==group];cols=4 if group=='material' else len(ims);rows=(len(ims)+cols-1)//cols
  sheet=Image.new('RGB',(cols*256+16,rows*284+16),'#17191e');d=ImageDraw.Draw(sheet)
  for i,q in enumerate(ims):im=Image.open(io.BytesIO(base64.b64decode(q['url'].split(',')[1]))).convert('RGB').resize((240,240));x=16+(i%cols)*256;y=16+(i//cols)*284;sheet.paste(im,(x,y+27));d.text((x,y+3),q['name'],font=font,fill='white')
  sheet.save(out/('nuovo-'+group+'.png'))
 print(json.dumps({'loops':data['loops'],'gpuError':data['gl']}),flush=True);b.close()
