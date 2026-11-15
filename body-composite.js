// The surface writes shaded color and its first visible intersection. Particle
// fragments read the latter while drawing into their own light buffer.
export class BodyComposite{
 constructor(gl){this.gl=gl;}
 target(width,height){
  if(this.framebuffer&&this.width===width&&this.height===height)return this;
  this.release();this.width=width;this.height=height;
  const g=this.gl;this.framebuffer=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,this.framebuffer);
  this.textures=[g.createTexture(),g.createTexture()];
  this.textures.forEach((texture,i)=>{
   g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,texture);
   g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,width,height,0,g.RGBA,g.UNSIGNED_BYTE,null);
   g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);
   g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);
   g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0+i,g.TEXTURE_2D,texture,0);
  });
  g.drawBuffers([g.COLOR_ATTACHMENT0,g.COLOR_ATTACHMENT1]);
  if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Composizione dei livelli non disponibile.');
  g.bindFramebuffer(g.FRAMEBUFFER,null);
  return this;
 }
 get color(){return this.textures[0];}
 get depth(){return this.textures[1];}
 captureColor(){
  const g=this.gl;
  g.bindFramebuffer(g.READ_FRAMEBUFFER,null);
  g.activeTexture(g.TEXTURE0);
  g.bindTexture(g.TEXTURE_2D,this.color);
  g.copyTexSubImage2D(g.TEXTURE_2D,0,0,0,0,0,this.width,this.height);
 }
 release(){
  if(!this.framebuffer)return;
  const g=this.gl;for(const texture of this.textures)g.deleteTexture(texture);g.deleteFramebuffer(this.framebuffer);
  this.framebuffer=null;this.textures=null;
 }
}
