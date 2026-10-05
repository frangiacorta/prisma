from pathlib import Path
p=Path('/workspace/prisma-studio/dist/renderer.js')
s=p.read_text();Path('/workspace/prisma-audit/renderer-legacy.js').write_text(s)
modern=Path('/workspace/prisma-audit/modern-optics.glsl').read_text()
def func(text,name):
 import re
 m=re.search(r'(?:vec[234]|float|bool|void)\s+'+name+r'\s*\(',text)
 assert m,name
 a=text.index('{',m.start());level=1;b=a+1
 while level:
  level+=(text[b]=='{')-(text[b]=='}');b+=1
 return text[m.start():b]
sections={name:func(modern,name) for name in ['environment','fresnel','absorptionCoefficient','sceneEmitters','subsurfaceLight','terminalScene','shade','photo']}
sections['fresnel']+='\n'+'\n'.join(func(modern,n) for n in ['gaussian','cie','xyzRGB','soapFilm'])
sections['photo']=func(modern,'filmic')+'\n'+sections['photo']
insertion='''
// Keep the previous shader intact for older creations. Both paths are self-contained.
function shaderFunction(source,name,replacement){
 const start=source.search(new RegExp('(?:vec[234]|float|bool|void)\\\\s+'+name+'\\\\s*\\\\('));
 let end=source.indexOf('{',start)+1,depth=1;
 while(depth){depth+=(source[end]==='{')-(source[end]==='}');end++;}
 return source.slice(0,start)+replacement+source.slice(end);
}
let MODERN_FRAG=FRAG.replace('uniform vec2 uResolution;','uniform vec2 uResolution;\\nuniform vec4 uEnvironment,uFilmMotion,uSampling,uModern;\\nuniform vec3 uInternalColor;');
'''
for name,f in sections.items():insertion+=f'MODERN_FRAG=shaderFunction(MODERN_FRAG,{name!r},`{f}`);\n'
# Always keep internal specular untinted; the exterior film has its own spectral calculation.
insertion+="""
MODERN_FRAG=MODERN_FRAG.replace('vec3 reflectTint=mix(vec3(1.),max(vec3(.15),irid),uSurface.x*.5);','vec3 reflectTint=vec3(1.);');
MODERN_FRAG=MODERN_FRAG.replace('coverage=endScene.a;radiance+=beta*endScene.rgb;}','coverage=endScene.a;radiance+=beta*environment(direction,origin,uMat.w);}') ;
MODERN_FRAG=MODERN_FRAG.replace('(gl_FragCoord.xy-.5*uResolution)','(gl_FragCoord.xy+uSampling.xy-.5*uResolution)');
MODERN_FRAG=MODERN_FRAG.replace('float unused;vec4 back=sceneRay',`float pixel=3.4/min(uResolution.x,uResolution.y),silhouette=hit?-pow(max(0.,dot(normal,-direction)),2.)*min(min(uShape.y,uShape.z),uShape.x*uShape.w)*uFrame.x*.25:closest;
 float aa=1.-smoothstep(-pixel*.6,pixel*.6,silhouette);coverage=uCut.w<.002?aa:max(aa,coverage);float unused;vec4 back=sceneRay`);
MODERN_FRAG=MODERN_FRAG.replace('vec3 target=clamp(photo(mix(back.rgb,surface.rgb,coverage),originalUV),0.,1.);', 'vec3 target=mix(back.rgb,surface.rgb,coverage);');
MODERN_FRAG=MODERN_FRAG.replace('bodyAlpha=max(bodyAlpha,1.-min(min(target.r,target.g),target.b));','');
MODERN_FRAG=MODERN_FRAG.replace('fragColor=vec4(clamp(premultiplied/max(alpha,.000001)+grain,0.,1.),alpha);','fragColor=vec4(clamp(photo(premultiplied/max(alpha,.000001),originalUV)+grain,0.,1.),alpha);');
MODERN_FRAG=MODERN_FRAG.replace('\\n}\\n', '\\n}\\n');
// Accumulate premultiplied samples in float precision, so transparent edges have no colored fringe.
MODERN_FRAG=MODERN_FRAG.replace(/\\n}\\n$/, '\\n if(uSampling.z>.5){fragColor.rgb*=fragColor.a;fragColor*=uSampling.w;}\\n}\\n');
const RESOLVE=`#version 300 es
precision highp float;uniform sampler2D uImage;uniform vec2 uSize;out vec4 fragColor;
void main(){vec4 a=texelFetch(uImage,ivec2(gl_FragCoord.xy),0);fragColor=vec4(a.rgb/max(.000001,a.a),clamp(a.a,0.,1.));}`;
function jitterSample(index){let n=index+1,x=0,y=0,f=.5;while(n){x+=(n%2)*f;n=Math.floor(n/2);f/=2;}n=index+1;f=1/3;while(n){y+=(n%3)*f;n=Math.floor(n/3);f/=3;}return[x-.5,y-.5]}
"""
s=s.replace('function rgb(hex)',insertion+'\nfunction rgb(hex)')
s=s.replace("const source=FRAG.replace('#version 300 es'", "const source=(key&8?MODERN_FRAG:FRAG).replace('#version 300 es'")
s=s.replace("this.useVariant(+volume+", "this.useVariant((s.renderVersion>=2?8:0)+ +volume+")
target="const u=(name,v)=>g['uniform'+v.length+'fv'](this.locations[name],v),f=(name,v)=>g.uniform1f(this.locations[name],v),rad=Math.PI/180;"
assert target in s
s=s.replace(target,target+"\n if(s.renderVersion>=2){u('uEnvironment',[{studio:0,sunset:1,neon:2,sky:3,aquarium:4,aurora:5,city:6}[s.environment]??0,(s.environmentAngle||0)*rad,s.environmentPower??1,s.environmentRefraction??.12]);u('uFilmMotion',[phase*Math.round(s.filmCycles||1),s.filmFlow||0,s.filmSwirl||0,0]);u('uModern',[s.thinShell||0,0,0,0]);u('uSampling',[...(options.jitter||[0,0]),+!!options.accumulate,options.weight??1]);u('uInternalColor',rgb(s.internalColor||'#e6f5ff'));}\n")
s=s.replace('ring:5}', 'ring:5,orb:6}')
s=s.replace(" dispose(){",''' async drawAccumulated(source,phase,width,height,options={}){
  const samples=Math.max(1,Math.min(64,options.samples||16)),g=this.gl;
  if((source.renderVersion||1)<2||samples===1){this.draw(source,phase,width,height);return true;}
  const ext=g.getExtension('EXT_color_buffer_float');
  if(!ext){this.draw(source,phase,width,height);return true;}
  if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
  const texture=g.createTexture(),framebuffer=g.createFramebuffer();
  g.bindTexture(g.TEXTURE_2D,texture);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.texImage2D(g.TEXTURE_2D,0,g.RGBA16F,width,height,0,g.RGBA,g.HALF_FLOAT,null);
  g.bindFramebuffer(g.FRAMEBUFFER,framebuffer);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,texture,0);
  try{
   if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE){g.bindFramebuffer(g.FRAMEBUFFER,null);this.draw(source,phase,width,height);return true;}
   g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.enable(g.BLEND);g.blendFunc(g.ONE,g.ONE);
   const stable={...source,grain:0};
   for(let n=0;n<samples;n++){
    if(options.cancelled?.())return false;
    this.draw(stable,phase,width,height,{jitter:jitterSample(n),accumulate:true,weight:1/samples,preview:options.preview});
    options.progress?.((n+1)/samples);await new Promise(resolve=>setTimeout(resolve,0));
   }
   g.disable(g.BLEND);g.bindFramebuffer(g.FRAMEBUFFER,null);
   if(!this.resolveProgram){const f=this.compileShader(g.FRAGMENT_SHADER,RESOLVE),program=g.createProgram();g.attachShader(program,this.vertexShader);g.attachShader(program,f);g.linkProgram(program);g.deleteShader(f);if(!g.getProgramParameter(program,g.LINK_STATUS))throw Error(g.getProgramInfoLog(program));this.resolveProgram=program;}
   g.useProgram(this.resolveProgram);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,texture);g.uniform1i(g.getUniformLocation(this.resolveProgram,'uImage'),0);g.drawArrays(g.TRIANGLES,0,3);return true;
  }finally{g.disable(g.BLEND);g.bindFramebuffer(g.FRAMEBUFFER,null);g.deleteTexture(texture);g.deleteFramebuffer(framebuffer);}
 }
 dispose(){''')
s=s.replace('this.gl.deleteBuffer(this.buffer);','if(this.resolveProgram)this.gl.deleteProgram(this.resolveProgram);this.gl.deleteBuffer(this.buffer);')
# A looped environment is independent of object and light rotation.
s=s.replace(' return s;',' if(source.environmentRotate)s.environmentAngle=(source.environmentAngle||0)+phase*180/Math.PI*Math.round(source.environmentCycles||1);\n return s;',1)
p.write_text(s)
print('Renderer integrated; legacy shader kept unchanged.')
