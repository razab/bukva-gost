"""Resume-safe local page render cache; no OCR and no source PDF duplication."""
from pathlib import Path
import argparse,json,hashlib,subprocess
from PIL import Image,ImageOps,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'references/propisi-2019-content'
p=argparse.ArgumentParser();p.add_argument('--pages',default='all');args=p.parse_args()
data=json.loads((ROOT/'references/propisi-2019-content.json').read_text());source=Path(data['source']['path']);sha=hashlib.sha256(source.read_bytes()).hexdigest();assert sha==data['source']['sha256']
manifest=BASE/'render-cache.json';cache=json.loads(manifest.read_text()) if manifest.exists() else {'source_sha256':sha,'pages':{}}
assert cache['source_sha256']==sha,'Source changed; do not mix page images'
numbers=list(range(1,73)) if args.pages=='all' else [int(n) for n in args.pages.split(',')]
assert numbers and all(1<=n<=72 for n in numbers)
rendered=0
for n in numbers:
 target=BASE/'pages'/f'page-{n:02d}.jpg';key=str(n)
 if target.exists() and key in cache['pages']:assert hashlib.sha256(target.read_bytes()).hexdigest()==cache['pages'][key]['sha256'],'Cached image changed'
 elif not target.exists():
  prefix=ROOT/'tmp/pdfs/propisi-content'/f'source-{n:02d}';prefix.parent.mkdir(parents=True,exist_ok=True)
  subprocess.run(['pdftoppm','-f',str(n),'-l',str(n),'-singlefile','-scale-to','1200','-jpeg','-jpegopt','quality=76',str(source),str(prefix)],check=True,stdout=subprocess.DEVNULL)
  prefix.with_suffix('.jpg').replace(target);rendered+=1
 with Image.open(target) as im:assert im.height==1200;size=im.size;im.verify()
 cache['pages'][key]={'file':str(target.relative_to(ROOT)),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'size':size,'bytes':target.stat().st_size}
 tmp=manifest.with_suffix('.tmp');tmp.write_text(json.dumps(cache,ensure_ascii=False,indent=2)+'\n');tmp.replace(manifest)
print(json.dumps({'requested':len(numbers),'rendered':rendered,'cache_entries':len(cache['pages'])}))
if args.pages=='all':
 contact=ROOT/'tmp/pdfs/propisi-content';font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',20)
 for start in range(1,73,6):
  sheet=Image.new('RGB',(1530,1340),'#eceee9');draw=ImageDraw.Draw(sheet)
  for i,n in enumerate(range(start,min(start+6,73))):
   with Image.open(BASE/'pages'/f'page-{n:02d}.jpg') as im:
    im.thumbnail((500,630));x=(i%3)*510+(500-im.width)//2;y=(i//3)*670+32;sheet.paste(im,(x,y));draw.text(((i%3)*510+12,(i//3)*670+5),f'PDF {n}',font=font,fill='#183b2b')
  sheet.save(contact/f'contact-{start:02d}-{min(start+5,72):02d}.jpg',quality=90)
