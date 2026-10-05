import json
from pathlib import Path
from PIL import Image,ImageChops
p=Path('/workspace/prisma-root-export-fix')
out={}
for label in ['preview64','full64-cold','full64-warm','full128']:
 a=Image.open(p/(label+'.png')).convert('RGBA');b=Image.open(p/('candidate-'+label+'.png')).convert('RGBA')
 delta=ImageChops.difference(a,b);values=list(delta.getdata());out[label]={'differentChannels':sum(v>0 for pixel in values for v in pixel),'meanDifference':sum(sum(pixel) for pixel in values)/(a.width*a.height*4),'maxDifference':max(v for pixel in values for v in pixel)}
print(json.dumps(out,indent=2));(p/'pixel-comparison.json').write_text(json.dumps(out,indent=2))
