from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw,ImageFont
import base64,io,json,numpy as np
out=Path('/workspace/prisma-audit');font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
baseline=json.loads((out/'baseline.json').read_text())['states']
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:print(m.text,flush=True) if m.type=='log' else None);page.goto('http://127.0.0.1:4173/renderer.js')
 data=page.evaluate('''async baseline=>{
 const {Renderer,fieldAt}=await import('./renderer.js'),{preset}=await import('./model.js'),{MATERIAL_STYLES,newLight,ENVIRONMENTS}=await import('./studio-model.js'),{newCreation,upgrade,setFullness,motionPreset,surprise}=await import('./creative-model.js');const c=document.createElement('canvas'),r=new Renderer(c),images=[],metrics={};
 const difference=(a,b)=>a.reduce((n,v,i)=>n+Math.abs(v-b[i]),0);
 const draw=(s,size=96,options={preview:true},phase=0)=>{r.draw(s,phase,size,size,options);const a=r.pixels();if(r.gl.getError())throw Error('GL draw failed');return a;};
 const save=(name,group)=>images.push({name,group,url:c.toDataURL()});
 for(let i=0;i<19;i++){const q=baseline[i];draw(q.state,240,q.options);save(q.name,'compat');console.log('Compat '+q.name);}
 const equivalent=[1,2,11,12,9,13,14,15,0,4,10,16,17];
 for(let i=0;i<19;i++){const q=baseline[i],s=structuredClone(q.state);if(i<6)upgrade(s);else Object.assign(s,MATERIAL_STYLES[equivalent[i-6]].values);draw(s,240,q.options);save(q.name,'upgraded');console.log('Nouvelle '+q.name);}
 const s=Object.assign(newCreation(),{thinFilm:0,iridescence:0,thinShell:0,hollow:0,wallThickness:1,refraction:1,absorption:0,tintStrength:0,dispersion:0,coat:0,metal:0,emission:0,environmentRefraction:0});s.lights=[];s.bgMode='transparent';let a=draw(s,96,{});metrics.indexMatchedAlpha=Math.max(...a.filter((v,i)=>i%4===3));s.bgMode='solid';s.background='#ffffff';a=draw(s);metrics.whiteBackgroundMin=Math.min(...a.filter((v,i)=>i%4!==3));
 const glass=Object.assign(newCreation(),MATERIAL_STYLES[2].values,{bgMode:'transparent',dispersion:0,absorption:0,tintStrength:0,grounding:0});glass.lights=[{...newLight(1),type:'grid',size:.65,length:.5,grid:8,x:.12,y:.1,z:-2.5,power:2,color:'#ffd978'}];draw(glass,240);save('Vetro · luce dietro','physics');
 const bubble=Object.assign(newCreation(),{bgMode:'transparent'});bubble.lights=[];draw(bubble,240);save('Bolla · nessuna distorsione','physics');
 const env=newCreation();env.lights=[];env.thinFilm=.8;for(const [key,name] of ENVIRONMENTS){env.environment=key;draw(env,240);save(name,'environment');}
 const gel=Object.assign(newCreation(),MATERIAL_STYLES[8].values,{palette:['#ff96b5','#e15f93','#ffcadd']});gel.lights=[];const unlit=draw(gel);gel.lights=[{...newLight(1),type:'orb',size:.12,length:.12,power:4,x:.15,y:.1,z:0,color:'#ffeaa0',visible:false}];const lit=draw(gel);metrics.internalSSSDifference=difference(unlit,lit);gel.lights[0].x=-.5;gel.lights[0].color='#66ccff';metrics.movedInternalDifference=difference(lit,draw(gel));
 const metal=Object.assign(newCreation(),MATERIAL_STYLES[11].values,{transparency:1,bgMode:'transparent',dispersion:0});metal.lights=[];let metalOn=draw(metal);metal.metal=0;metrics.transparentMetalDifference=difference(metalOn,draw(metal));
 const coat=Object.assign(newCreation(),MATERIAL_STYLES[13].values,{iridescence:0,thinFilm:0,palette:['#8755ba']});draw(coat,240);save('Vernice senza pellicola','physics');coat.thinFilm=.8;draw(coat,240);save('Pellicola sotto la vernice','physics');
 const bright=Object.assign(newCreation(),MATERIAL_STYLES[11].values,{palette:['#ffffff'],environmentPower:0,iridescence:0});bright.lights=[{...newLight(1),x:0,y:1,z:2,power:6,size:.9,visible:false}];a=draw(bright,240);save('Alte luci · ACES','physics');let nonblack=0,white=0;for(let i=0;i<a.length;i+=4){if(a[i]||a[i+1]||a[i+2])nonblack++;if(a[i]===255&&a[i+1]===255&&a[i+2]===255)white++;}metrics.highlights={nonblack,white};
 const grid=Object.assign(newCreation(),{filmThickness:1200,surfaceTexture:.4});grid.lights=[{...newLight(1),type:'grid',x:-1,y:1,z:2.8,size:1.2,length:1,softness:.03,grid:12,power:3,visible:false}];draw(grid,192);save('Un campione','aa');draw(grid,768);save('Riferimento 4x','aa');await r.drawAccumulated(grid,0,192,192,{samples:16});save('16 campioni accumulati','aa');metrics.accumulationGL=r.gl.getError();
 const loops=[];for(const k of ['breathe','reflect','film','orbit','wave']){const q=motionPreset(newCreation(),k),start=draw(q,64,{preview:true},0),end=draw(q,64,{preview:true},Math.PI*2);loops.push({k,difference:difference(start,end)});}metrics.loops=loops;
 const thickness=[];for(const value of [0,.01,.04,.06,.08,.09,.1,.4,1]){const q=newCreation();setFullness(q,value);let a=draw(q,64),mean=a.filter((v,i)=>i%4<3).reduce((n,v)=>n+v,0)/(64*64*3);thickness.push({value,mean});}metrics.thickness=thickness;
 const benchmark=[];for(const [name,q] of [['Bolla',newCreation()],['Goccia',Object.assign(newCreation(),MATERIAL_STYLES[1].values)],['Gelatina',gel]]){const times=[];for(let i=0;i<6;i++){const t=performance.now();draw(q,320,{preview:true},i*.1);times.push(Math.round(performance.now()-t));}benchmark.push({name,times});}metrics.benchmarkSoftware=benchmark;
 const random=[];for(let i=0;i<20;i++){const q=surprise(731+i);draw(q,64);random.push({seed:q.seed,material:q.materialName,visible:Math.max(...r.pixels().filter((v,j)=>j%4!==3))});}metrics.surprises=random;r.dispose();return{images,metrics};}''',baseline)
 compat=[q for q in data['images'] if q['group']=='compat'];upgraded=[q for q in data['images'] if q['group']=='upgraded'];diffs=[]
 def decode(q):return Image.open(io.BytesIO(base64.b64decode(q['url'].split(',')[1]))).convert('RGBA')
 for i,q in enumerate(compat):a=np.array(decode(q)).astype(int);old=np.array(Image.open(out/f'before-{i:02d}.png')).astype(int);diffs.append({'name':q['name'],'max':int(np.abs(a-old).max()),'sum':int(np.abs(a-old).sum())})
 data['metrics']['compatibility']=diffs
 for group in ['preset','material']:
  indices=range(6) if group=='preset' else range(6,19);sheet=Image.new('RGB',(980,len(indices)*280+36),'#17191e');d=ImageDraw.Draw(sheet);d.text((20,10),'PRIMA',font=font,fill='white');d.text((270,10),'DOPO · compatibilità',font=font,fill='white');d.text((570,10),'NUOVA RESA',font=font,fill='white')
  for row,i in enumerate(indices):y=36+row*280;d.text((20,y),compat[i]['name'],font=font,fill='white');sheet.paste(Image.open(out/f'before-{i:02d}.png').convert('RGB'),(20,y+25));sheet.paste(decode(compat[i]).convert('RGB'),(270,y+25));sheet.paste(decode(upgraded[i]).convert('RGB'),(570,y+25))
  sheet.save(out/f'confronto-{group}.png')
 for group in ['environment','physics','aa']:
  ims=[q for q in data['images'] if q['group']==group];cols=4 if group!='aa' else 3;rows=(len(ims)+cols-1)//cols;sheet=Image.new('RGB',(cols*256+16,rows*284+16),'#17191e');d=ImageDraw.Draw(sheet)
  for i,q in enumerate(ims):im=decode(q).convert('RGB').resize((240,240),Image.Resampling.LANCZOS);x=16+(i%cols)*256;y=16+(i//cols)*284;sheet.paste(im,(x,y+27));d.text((x,y+3),q['name'],font=font,fill='white')
  sheet.save(out/f'final-{group}.png')
 (out/'validate-optics.json').write_text(json.dumps(data['metrics'],ensure_ascii=False,indent=2));print(json.dumps(data['metrics'],ensure_ascii=False),flush=True)
 assert not errors and all(q['max']==0 for q in diffs),errors or diffs
 assert data['metrics']['indexMatchedAlpha']==0 and data['metrics']['whiteBackgroundMin']==255,data['metrics']
 assert data['metrics']['internalSSSDifference']>20000 and data['metrics']['movedInternalDifference']>10000 and data['metrics']['transparentMetalDifference']>1000,data['metrics']
 assert data['metrics']['accumulationGL']==0 and all(q['difference']<100 for q in data['metrics']['loops']),data['metrics']
 assert data['metrics']['highlights']['white']<100,data['metrics']['highlights']
 assert all(q['visible']>70 for q in data['metrics']['surprises']),data['metrics']['surprises'];b.close();print('OPTICS, COMPATIBILITY, LOOPS: PASS',flush=True)
