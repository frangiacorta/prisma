import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

// A file can contain every frame and still pause for hours if the opening
// and tail were concatenated with different MP4 timescales.
function boxes(bytes,start=0,end=bytes.length){
 const result=[];
 for(let i=start;i+8<=end;){
  const size=bytes.readUInt32BE(i);
  assert(size>=8&&i+size<=end,'Invalid MP4 box size');
  result.push({type:bytes.toString('ascii',i+4,i+8),start:i+8,end:i+size});
  i+=size;
 }
 return result;
}

export async function checkPreviewTiming(file,seconds){
 const bytes=await readFile(file);
 const child=(parent,type)=>{
  const box=boxes(bytes,parent?.start,parent?.end).find(b=>b.type===type);
  assert(box,`Missing ${type} in ${file}`);
  return box;
 };
 const movie=child(null,'moov'),track=child(movie,'trak'),media=child(track,'mdia');
 const header=child(media,'mdhd').start;
 const timescale=bytes.readUInt32BE(header+(bytes[header]===1?20:12));
 const table=child(child(child(media,'minf'),'stbl'),'stts');
 const runs=bytes.readUInt32BE(table.start+4);
 let frames=0,ticks=0;
 for(let i=0;i<runs;i++){
  const offset=table.start+8+i*8;
  const count=bytes.readUInt32BE(offset),step=bytes.readUInt32BE(offset+4);
  assert(Math.abs(step-timescale/30)<=1,`Unexpected frame duration in ${file}`);
  frames+=count;ticks+=count*step;
 }
 assert.equal(frames,seconds*30,`Unexpected frame count in ${file}`);
 assert(Math.abs(ticks/timescale-seconds)<.002,`Unexpected duration in ${file}`);
}

export async function checkTissuePreviews(directory){
 for(const [name,seconds] of [['reticolo-apertura',12],['reticolo-giunzioni',30],['reticolo-giunzioni-confronto',10]]){
  await checkPreviewTiming(path.join(directory,name+'.mp4'),seconds);
 }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 await checkTissuePreviews(process.argv[2]||'previews');
}
