// Only the first 12% bridges the two optical materials. Vertex positions still
// follow the geometric morph. The zero endpoint retains the exact solid shader.
export class VeilTransition{
 constructor(gl){this.gl=gl;const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};const v=shader(gl.VERTEX_SHADER,`#version 300 es
 void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}`),f=shader(gl.FRAGMENT_SHADER,`#version 300 es
 precision highp float;uniform sampler2D uSource,uVeil;uniform vec2 uSize;uniform float uMix;out vec4 color;
 void main(){vec2 uv=gl_FragCoord.xy/uSize;vec4 a=texture(uSource,uv),b=texture(uVeil,uv);float alpha=mix(a.a,b.a,uMix);color=vec4(mix(a.rgb*a.a,b.rgb*b.a,uMix)/max(alpha,.00001),alpha);}`);
 this.program=gl.createProgram();gl.attachShader(this.program,v);gl.attachShader(this.program,f);gl.linkProgram(this.program);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));this.vao=gl.createVertexArray();this.textures=[gl.createTexture(),gl.createTexture()];
 }
 capture(index,w,h){const g=this.gl;g.bindFramebuffer(g.FRAMEBUFFER,null);g.activeTexture(g.TEXTURE0+index);g.bindTexture(g.TEXTURE_2D,this.textures[index]);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.copyTexImage2D(g.TEXTURE_2D,0,g.RGBA,0,0,w,h,0);}
 draw(w,h,mix){const g=this.gl;this.capture(1,w,h);g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,w,h);g.disable(g.BLEND);g.disable(g.DEPTH_TEST);g.disable(g.SCISSOR_TEST);g.useProgram(this.program);g.bindVertexArray(this.vao);for(let i=0;i<2;i++){g.activeTexture(g.TEXTURE0+i);g.bindTexture(g.TEXTURE_2D,this.textures[i]);g.uniform1i(g.getUniformLocation(this.program,i?'uVeil':'uSource'),i);}g.uniform2f(g.getUniformLocation(this.program,'uSize'),w,h);g.uniform1f(g.getUniformLocation(this.program,'uMix'),mix);g.drawArrays(g.TRIANGLES,0,3);g.bindVertexArray(null);}
 dispose(){const g=this.gl;for(const t of this.textures)g.deleteTexture(t);g.deleteVertexArray(this.vao);g.deleteProgram(this.program);}
}
