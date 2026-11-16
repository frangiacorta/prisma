const dependencies=[
 './vendor/xpbd/distance.js?v=a55ab48fe9e6','./dynamics.js?v=a55ab48fe9e6','./animation-clock.js?v=a55ab48fe9e6','./growth-material.js?v=a55ab48fe9e6',
 './particle-paths.js?v=a55ab48fe9e6','./solid-forces.js?v=a55ab48fe9e6','./base-forms.js?v=a55ab48fe9e6','./filament-model.js?v=a55ab48fe9e6',
 './cellular-form.js?v=a55ab48fe9e6','./fractal-form.js?v=a55ab48fe9e6','./structure-model.js?v=a55ab48fe9e6','./implicit-hit-pass.js?v=a55ab48fe9e6','./implicit-surface-pass.js?v=a55ab48fe9e6','./solid-renderer.js?v=a55ab48fe9e6',
 './finishing.js?v=a55ab48fe9e6','./finish-scanlines.js?v=a55ab48fe9e6','./particle-optics.js?v=a55ab48fe9e6','./particle-shading.js?v=a55ab48fe9e6',
 './filament-renderer.js?v=a55ab48fe9e6','./body-composite.js?v=a55ab48fe9e6','./body-layers.js?v=a55ab48fe9e6','./renderer.js?v=a55ab48fe9e6'
];
const withoutImports=source=>source.replace(/^import .*;$/gm,'');
const isolated=(names,source)=>`const {${names}}=(()=>{${source.replace(/^export /gm,'')}\nreturn {${names}};})();`;

export async function createWallpaper(snapshot){
 const parts=await Promise.all(dependencies.map(async url=>{
  const response=await fetch(new URL(url,import.meta.url));
  if(!response.ok)throw Error('Impossibile preparare il wallpaper.');
  return withoutImports(await response.text());
 }));
 const [distance,dynamics,clock,growth,paths,forces,forms,filaments,cellular,fractal,structure,implicitHit,implicitSurface,solid,
  finishing,scanlines,optics,shading,filamentPass,bodyComposite,bodyLayers,renderer]=parts;
 const source=[
  isolated('Dynamics,DYNAMICS_GLSL,bindDynamics,disposeDynamics',distance+'\n'+dynamics),clock,growth,
  isolated('samplePath',paths),forces,forms,filaments,
  isolated('CELLULAR_FIELD_KEYS,CELLULAR_GLSL,CELLULAR_META,CELLULAR_PHASES,cellularBounds,cellularField,cellularMayChange,uploadCellular',cellular),
  isolated('FRACTAL_GLSL,FRACTAL_KEYS,FRACTAL_META,fractalBounds,fractalField,uploadFractal',fractal),structure,
  implicitHit,implicitSurface,solid.replace('export class Renderer','export class SolidRenderer'),finishing,
  isolated('ScanlinePass',scanlines),isolated('opticalGLSL',optics),shading,isolated('FilamentPass',filamentPass),
  bodyComposite,bodyLayers,renderer.replace(/^export \{fieldAt,sampleFrame\}.*;$/gm,'')
 ].join('\n');
 const scene={...snapshot,finishCompare:false,bgMode:snapshot.bgMode==='transparent'?'solid':snapshot.bgMode};
 const data=JSON.stringify(scene).replace(/</g,'\\u003c');
 const html=`<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prisma Wallpaper</title>
 <style>html,body{margin:0;overflow:hidden;background:${scene.background};width:100%;height:100%}canvas{width:100%;height:100%;display:block}</style>
 <canvas id="art"></canvas><script type="module">${source}\nstartWallpaper(document.getElementById('art'),${data});<\/script></html>`;
 return new Blob([html],{type:'text/html'});
}
