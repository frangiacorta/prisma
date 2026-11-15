const dependencies=[
 './vendor/xpbd/distance.js?v=0049c9863913','./dynamics.js?v=0049c9863913','./animation-clock.js?v=0049c9863913','./growth-material.js?v=0049c9863913',
 './particle-paths.js?v=0049c9863913','./solid-forces.js?v=0049c9863913','./base-forms.js?v=0049c9863913','./filament-model.js?v=0049c9863913',
 './cellular-form.js?v=0049c9863913','./fractal-form.js?v=0049c9863913','./structure-model.js?v=0049c9863913','./solid-renderer.js?v=0049c9863913',
 './finishing.js?v=0049c9863913','./finish-scanlines.js?v=0049c9863913','./particle-optics.js?v=0049c9863913','./particle-shading.js?v=0049c9863913',
 './filament-renderer.js?v=0049c9863913','./body-composite.js?v=0049c9863913','./body-layers.js?v=0049c9863913','./renderer.js?v=0049c9863913'
];
const withoutImports=source=>source.replace(/^import .*;$/gm,'');
const isolated=(names,source)=>`const {${names}}=(()=>{${source.replace(/^export /gm,'')}\nreturn {${names}};})();`;

export async function createWallpaper(snapshot){
 const parts=await Promise.all(dependencies.map(async url=>{
  const response=await fetch(new URL(url,import.meta.url));
  if(!response.ok)throw Error('Impossibile preparare il wallpaper.');
  return withoutImports(await response.text());
 }));
 const [distance,dynamics,clock,growth,paths,forces,forms,filaments,cellular,fractal,structure,solid,
  finishing,scanlines,optics,shading,filamentPass,bodyComposite,bodyLayers,renderer]=parts;
 const source=[
  isolated('Dynamics,DYNAMICS_GLSL,bindDynamics,disposeDynamics',distance+'\n'+dynamics),clock,growth,
  isolated('samplePath',paths),forces,forms,filaments,
  isolated('CELLULAR_FIELD_KEYS,CELLULAR_GLSL,CELLULAR_META,CELLULAR_PHASES,cellularBounds,cellularField,cellularMayChange,uploadCellular',cellular),
  isolated('FRACTAL_GLSL,FRACTAL_KEYS,FRACTAL_META,fractalBounds,fractalField,uploadFractal',fractal),structure,
  solid.replace('export class Renderer','export class SolidRenderer'),finishing,
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
