(() => {
  const settings = {scale: 1, fps: null, userPropertyReceived: false, generalPropertyReceived: false};
  let running = false;
  function hostInfo() {
    document.querySelector('#host-info').textContent = `Proprietà host ricevute: ${settings.userPropertyReceived ? 'sì' : 'no'} · scala ${settings.scale} · limite FPS ${settings.fps ?? 'non comunicato'}`;
  }
  window.wallpaperPropertyListener = {
    applyUserProperties(p) {
      if (p.probe_scale && Number.isFinite(Number(p.probe_scale.value))) {
        settings.scale = Math.max(.5, Math.min(1, Number(p.probe_scale.value)));
        settings.userPropertyReceived = true;
      }
      hostInfo();
    },
    applyGeneralProperties(p) {
      if (Number.isFinite(p.fps)) {settings.fps = p.fps; settings.generalPropertyReceived = true;}
      hostInfo();
    }
  };
  window.runProbe = async ({prisma = false} = {}) => {
    if (running) throw new Error('Controllo già in corso');
    running = true;
    const result = {schemaVersion:1, at:new Date().toISOString(), userAgent:navigator.userAgent,
      viewport:{width:innerWidth,height:innerHeight,devicePixelRatio,screenWidth:screen.width,screenHeight:screen.height},
      hostProperties:{...settings}, webgl2:false, errors:[]};
    let renderer;
    try {
      document.querySelector('#status').textContent = 'Controllo in corso…';
      const canvas = document.querySelector('#basic');
      const gl = canvas.getContext('webgl2', {antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
      if (!gl) throw new Error('WebGL2 non disponibile in questo browser');
      result.webgl2 = true;
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      result.renderer = gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
      result.softwareRenderer = /swiftshader|llvmpipe|softpipe|software rasterizer|software adapter/i.test(result.renderer);
      result.extensions = Object.fromEntries(['EXT_color_buffer_float','KHR_parallel_shader_compile','EXT_disjoint_timer_query_webgl2'].map(k => [k, !!gl.getExtension(k)]));
      result.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      result.highFloatPrecision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision;
      const compile = (type, source) => {
        const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
        return shader;
      };
      const vertex = compile(gl.VERTEX_SHADER, '#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}');
      const fragment = compile(gl.FRAGMENT_SHADER, '#version 300 es\nprecision highp float;out vec4 color;void main(){color=vec4(.25,.5,.75,1.);}');
      const program = gl.createProgram(); gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program); gl.viewport(0,0,canvas.width,canvas.height); gl.drawArrays(gl.TRIANGLES,0,3);
      const pixel = new Uint8Array(4); gl.readPixels(64,36,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
      result.testPixel = [...pixel];
      result.pixelTestPassed = [64,128,191,255].every((v,i) => Math.abs(pixel[i]-v)<=1);
      if (!result.pixelTestPassed || gl.getError() !== gl.NO_ERROR) throw new Error('Il test di rendering WebGL2 non restituisce i pixel attesi');
      gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment);
      result.prisma = {tested:false};
      if (prisma) {
        const target = document.querySelector('#prisma'), width=Math.round(256*settings.scale), height=Math.round(144*settings.scale);
        const started=performance.now();
        renderer=new window.PrismaBaseline.Renderer(document.createElement('canvas'));
        const options={samples:1,preview:true,quality:'fast',cancelled:()=>performance.now()-started>120000};
        const ok=await renderer.drawAccumulated(structuredClone(window.prismaProbeState),0,width,height,options);
        if (!ok || renderer.gl.isContextLost()) throw new Error('Rendering Prisma interrotto');
        const pixels=renderer.pixels();
        let min=255,max=0; for(let i=0;i<pixels.length;i+=4){min=Math.min(min,pixels[i]);max=Math.max(max,pixels[i]);}
        if (max-min<5) throw new Error('Il fotogramma Prisma è uniforme');
        // Preserve a visible snapshot after releasing the renderer's GL context.
        target.width=width;target.height=height;
        const ctx=target.getContext('2d'),snapshot=ctx.createImageData(width,height);
        for(let y=0;y<height;y++)snapshot.data.set(pixels.subarray((height-1-y)*width*4,(height-y)*width*4),y*width*4);
        ctx.putImageData(snapshot,0,0);
        result.prisma={tested:true,passed:true,width,height,elapsedMs:Math.round(performance.now()-started),redChannelRange:max-min,hardware:renderer.hardwareInfo(),mode:'diagnostic opaque sphere, fast preview; not a performance or visual-fidelity certification'};
      }
      result.passed=true;
    } catch (error) {result.passed=false;result.errors.push(String(error.message || error));}
    finally {
      renderer?.dispose();running=false;window.prismaProbeResult=result;
      document.querySelector('#result').textContent=JSON.stringify(result,null,2);
      document.querySelector('#status').textContent=result.passed ? (result.softwareRenderer ? 'Test superato · rendering software rilevato' : 'Test superato') : 'Controllo da completare';
      hostInfo();
    }
    return result;
  };
  document.querySelector('#run').onclick=()=>window.runProbe({prisma:true});
  document.querySelector('#save').onclick=()=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify(window.prismaProbeResult,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='prisma-browser-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  window.runProbe();
})();
