import json,subprocess,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
p=Path('/workspace/prisma-root-export-fix');movie=p/'user-roots-gentle-64-60fps.mp4'
meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=codec_name,width,height,r_frame_rate,avg_frame_rate,duration,nb_read_frames','-of','json',str(movie)]))['streams'][0]
assert meta['codec_name']=='h264' and meta['width']==64 and meta['height']==64 and meta['nb_read_frames']=='60' and meta['avg_frame_rate']=='60/1' and abs(float(meta['duration'])-1)<.00001,meta
raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(movie),'-f','rawvideo','-pix_fmt','rgb24','-']);frames=np.frombuffer(raw,dtype=np.uint8).reshape(60,64,64,3)
unique=len({hashlib.sha256(f.tobytes()).hexdigest() for f in frames});assert unique>10,unique
deltas=np.abs(np.diff(frames.astype(np.int16),axis=0)).mean(axis=(1,2,3));seam=np.abs(frames[0].astype(np.int16)-frames[-1].astype(np.int16)).mean()
report={'metadata':meta,'decodedFrames':len(frames),'uniqueDecodedFrames':unique,'meanAdjacentPixelDifference':float(deltas.mean()),'maxAdjacentPixelDifference':float(deltas.max()),'lastToFirstDifference':float(seam),'fileBytes':movie.stat().st_size}
(p/'video-verification.json').write_text(json.dumps(report,indent=2));Image.fromarray(np.concatenate([frames[i] for i in [0,15,30,45,59]],axis=1)).resize((960,192),Image.Resampling.NEAREST).save(p/'video-frames.png');print(json.dumps(report,indent=2))
