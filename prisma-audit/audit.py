from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import base64, io, json

out = Path('/workspace/prisma-audit')
fontpath = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font = ImageFont.truetype(fontpath, 15)
small = ImageFont.truetype(fontpath, 12)

def sheet(images, filename, cols=4, size=240):
    rows = (len(images)+cols-1)//cols
    result = Image.new('RGB', (cols*(size+16)+16, rows*(size+44)+16), '#17191e')
    d = ImageDraw.Draw(result)
    for i, q in enumerate(images):
        im = Image.open(io.BytesIO(base64.b64decode(q['url'].split(',')[1]))).convert('RGBA')
        back = Image.new('RGBA', im.size, '#ffffff');back.alpha_composite(im)
        back = back.convert('RGB').resize((size,size), Image.Resampling.LANCZOS)
        x=16+(i%cols)*(size+16);y=16+(i//cols)*(size+44)
        result.paste(back,(x,y+27));d.text((x,y+3),q['name'],font=font,fill='white')
    result.save(out/filename)

with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
        args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
    page=b.new_page(); errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: print(m.text,flush=True) if m.type=='log' else None)
    page.goto('http://127.0.0.1:4173/renderer.js')
    data=page.evaluate('''async()=>{
      const {Renderer}=await import('./renderer.js'),{preset,PRESETS}=await import('./model.js'),{MATERIAL_STYLES,newLight}=await import('./studio-model.js');
      const canvas=document.createElement('canvas'),r=new Renderer(canvas),images=[],states=[];
      const metrics={},N=240;
      function save(name,s,group='material',options={preview:true},size=N){
        const t=performance.now();r.draw(s,0,size,size,options);const a=r.pixels();
        if(r.gl.getError())throw Error('WebGL error '+name);
        const url=canvas.toDataURL();images.push({name,group,url});states.push({name,group,state:structuredClone(s),phase:0,size,options});
        console.log(name+' · '+Math.round(performance.now()-t)+' ms');return a;
      }
      const clean=s=>{for(const t of Object.values(s.motions||{}))t.enabled=false;return s;};
      for(let i=0;i<PRESETS.length;i++)save(PRESETS[i].name,preset(i),'preset');
      for(const m of MATERIAL_STYLES)save(m.name,Object.assign(clean(preset(0)),m.values),'material');
      const skin=Object.assign(clean(preset(0)),MATERIAL_STYLES.find(m=>m.name==='Pelle sottile').values,{background:'#ffffff',bgMode:'solid',grain:0,glow:0});
      for(const [name,change] of [['Pelle · attuale',{}],['Pelle · senza SSS',{subsurface:0}],['Pelle · piena',{hollow:0}],['Pelle · senza texture',{surfaceTexture:0}],['Pelle · solo superficie',{translucency:0,scattering:0,subsurface:0}],['Pelle · senza vernice',{coat:0}]])save(name,Object.assign(structuredClone(skin),change),'skin');
      const sphere=Object.assign(clean(preset(1)),{rotateX:0,rotateY:0,rotateZ:0,grain:0,glow:0,edge:0,surfaceTexture:0,emission:0,palette:['#c87538'],bgMode:'solid',background:'#000000',absorption:0,tintStrength:0,iridescence:0,coat:0,roughness:0,metal:1});
      for(const t of [0,.5,1])save('Metallo · T '+t,Object.assign(structuredClone(sphere),{transparency:t}),'mix');
      const flat=Object.assign(structuredClone(sphere),{lights:[],transparency:0,bgMode:'transparent',palette:['#ffffff']});
      const a=save('Ambiente trasparente',flat,'diagnostic');
      const sample=(a,x,y)=>Array.from(a.slice((y*N+x)*4,(y*N+x)*4+4));
      metrics.emptyEnvironmentSamples=[sample(a,120,120),sample(a,100,100),sample(a,145,130)];
      const film=Object.assign(structuredClone(sphere),{metal:0,transparency:0,coat:1,iridescence:0,thinFilm:0,background:'#080808'});
      const f0=save('Vernice · film spento',film,'film');film.thinFilm=1;const f1=save('Vernice · film acceso',film,'film');
      metrics.filmOnOpaqueCoatDiff=f0.reduce((n,v,i)=>n+Math.abs(v-f1[i]),0);
      const bright=Object.assign(structuredClone(sphere),{transparency:0,palette:['#ffffff'],lights:[{...newLight(1),x:0,y:1,z:2,power:6,size:.9,visible:false}],background:'#000000'});
      const clipped=save('Alte luci · potenza 6',bright,'diagnostic');let pixels=0,full=0;for(let i=0;i<clipped.length;i+=4){if(clipped[i]||clipped[i+1]||clipped[i+2])pixels++;if(clipped[i]===255&&clipped[i+1]===255&&clipped[i+2]===255)full++;}metrics.clippedHighlights={nonblack:pixels,white:full};
      const shell=Object.assign(structuredClone(skin),{grain:0,glow:0,edge:0});save('Pelle · traccia raggi',shell,'trace',{diagnostic:true});
      metrics.glAttributes=r.gl.getContextAttributes();metrics.programs=Array.from(r.programs.keys());r.dispose();return {images,states,metrics};
    }''')
    (out/'baseline.json').write_text(json.dumps({'states':data['states'],'metrics':data['metrics'],'errors':errors},ensure_ascii=False,indent=2))
    for i,im in enumerate(data['images']):
        (out/f'before-{i:02d}.png').write_bytes(base64.b64decode(im['url'].split(',')[1]))
    sheet([q for q in data['images'] if q['group']=='preset'],'prima-presets.png',3)
    sheet([q for q in data['images'] if q['group']=='material'],'prima-materiali.png',4)
    sheet([q for q in data['images'] if q['group']=='skin'],'pelle-diagnosi.png',3)
    sheet([q for q in data['images'] if q['group'] in ['mix','film','diagnostic']],'ottica-diagnosi.png',4)
    print(json.dumps(data['metrics']),flush=True)
    assert not errors,errors
    b.close()
