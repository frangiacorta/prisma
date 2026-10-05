import {Renderer,variantSource,RESOLVE,jitterSample} from './renderer-frozen.js';
// Export-only acceleration for an explicitly validated immutable geometry.
// Every pixel's exact float32 hit/normal is retained separately for each of the
// two original jitter samples. All material/light/color shading runs each frame.
export class CachedRenderer extends Renderer {
 constructor(canvas){super(canvas);this.mode='baseline';this.caches=[];this.cacheIndex=0;}
 variant(key){
  const k=this.mode+':'+key;let v=this.programs.get(k);const g=this.gl;
  if(!v){let source=variantSource(key);const start=source.indexOf('void main(){'),end=source.indexOf(' float coverage=',start);if(start<0||end<0)throw Error('Shader main changed');
   if(this.mode==='bake'){
    source=source.replace('out vec4 fragColor;','layout(location=0) out vec4 fragColor;\nlayout(location=1) out vec4 primaryNormal;');
    const prefix=source.slice(0,source.indexOf(' float coverage=',source.indexOf('void main(){')));
    source=prefix+'\nfragColor=vec4(point,hit?distance:-1.);primaryNormal=vec4(normal,closest);\n}\n';
   }else if(this.mode==='cached'){
    const head=source.slice(start,end),rays=head.slice(0,head.indexOf('vec3 origin='));
    const replacement=rays+`vec3 origin=vec3(uv,4.8),direction=vec3(0,0,-1);vec4 cachedPoint=texelFetch(uPrimaryPoint,ivec2(gl_FragCoord.xy),0),cachedNormal=texelFetch(uPrimaryNormal,ivec2(gl_FragCoord.xy),0);vec3 point=cachedPoint.xyz,normal=cachedNormal.xyz;float distance=cachedPoint.w,closest=cachedNormal.w,soft=uCut.w*.44;bool hit=distance>=0.;
 if(!hit&&uCut.w==0.&&uOther.w==0.&&uBgMode==0.&&all(equal(uBg,vec3(0.)))&&closest>=3.4/min(uResolution.x,uResolution.y)*.6){fragColor=vec4(0.,0.,0.,uSampling.z>.5?0.:1.);return;}
`;
    source=source.slice(0,start)+replacement+source.slice(end);source=source.replace('out vec4 fragColor;','out vec4 fragColor;\nuniform highp sampler2D uPrimaryPoint,uPrimaryNormal;');
   }
   const fragment=g.createShader(g.FRAGMENT_SHADER),program=g.createProgram();g.shaderSource(fragment,source);g.compileShader(fragment);g.attachShader(program,this.vertexShader);g.attachShader(program,fragment);g.linkProgram(program);v={program,fragment,ready:false,used:0};this.programs.set(k,v);
  }
  v.used=++this.programClock;return v;
 }
 useVariant(key){super.useVariant(key);if(this.mode==='cached'){const g=this.gl,c=this.caches[this.cacheIndex];g.activeTexture(g.TEXTURE6);g.bindTexture(g.TEXTURE_2D,c.point);g.uniform1i(this.locations.uPrimaryPoint,6);g.activeTexture(g.TEXTURE7);g.bindTexture(g.TEXTURE_2D,c.normal);g.uniform1i(this.locations.uPrimaryNormal,7);g.activeTexture(g.TEXTURE0);}}
 async bake(source,phase,width,height,samples=2){
  if(Object.entries(source.motions||{}).some(([k,t])=>t.enabled&&!['iridescence','transparency','gradientOffset','colorWavePhase','roughness'].includes(k)))throw Error('Geometry is animated: cannot cache');
  const g=this.gl;if(!g.getExtension('EXT_color_buffer_float'))throw Error('Float32 render targets required');this.canvas.width=width;this.canvas.height=height;this.mode='bake';
  const make=()=>{const t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.texImage2D(g.TEXTURE_2D,0,g.RGBA32F,width,height,0,g.RGBA,g.FLOAT,null);return t;};
  for(let n=0;n<samples;n++){const point=make(),normal=make(),framebuffer=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,framebuffer);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,point,0);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT1,g.TEXTURE_2D,normal,0);g.drawBuffers([g.COLOR_ATTACHMENT0,g.COLOR_ATTACHMENT1]);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Geometry buffer incomplete');this.caches.push({point,normal,framebuffer});await this.drawTiled(source,phase,width,height,{jitter:jitterSample(n)});}
  g.bindFramebuffer(g.FRAMEBUFFER,null);this.mode='cached';
 }
 async drawTiled(source,phase,width,height,options={}){if(this.mode!=='cached')return super.drawTiled(source,phase,width,height,options);this.draw(source,phase,width,height,options);return this.waitForGpu(options);}
 draw(source,phase,width,height,options={}){if(this.mode==='cached'){const jitter=options.jitter||[0,0];this.cacheIndex=this.caches.findIndex((_,i)=>{const a=jitterSample(i);return Math.abs(jitter[0]-a[0])<1e-8&&Math.abs(jitter[1]-a[1])<1e-8});if(this.cacheIndex<0)throw Error('Unknown jitter sample');}return super.draw(source,phase,width,height,options);}
}
