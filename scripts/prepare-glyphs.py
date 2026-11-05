"""Extract unmodified GOST outlines and build centre routes for the prototype.

Developer-only: fontTools, scikit-image, Pillow; RESVG_MODULE points at resvg-js.
Run --letters АУ for the end-to-end canary, then without it for the full set.
The previously approved A/a routes are retained exactly.
"""
import hashlib
import argparse
import json
import math
import os
import subprocess
import tempfile
from pathlib import Path
import numpy as np
from PIL import Image
from skimage.morphology import skeletonize
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

ROOT=Path(__file__).resolve().parents[1]
SCALE=6
parser=argparse.ArgumentParser()
parser.add_argument('--letters',default='АУОЭИЫМНЛРЕЁЯЮЬГКЗСДТВФБПЙЖШЧЩХЦЪ.,!?-')
args=parser.parse_args()
font=TTFont(ROOT/'references/isopromat-fonts/font-4.ttf')
glyphset=font.getGlyphSet()
approved=json.loads((ROOT/'references/isopromat-fonts/approved-a-models.json').read_text())
overrides=json.loads((ROOT/'references/isopromat-fonts/route-overrides.json').read_text())
demonstrations=json.loads((ROOT/'references/isopromat-fonts/demonstration-routes.json').read_text())
practice_segments=json.loads((ROOT/'references/isopromat-fonts/practice-segments.json').read_text())

def simplify(points,epsilon=.25):
    if len(points)<3:return points
    a,b=np.array(points[0]),np.array(points[-1]);v=b-a;den=float(v@v)
    distances=[]
    for p in points[1:-1]:
        p=np.array(p);t=max(0,min(1,float((p-a)@v)/den)) if den else 0
        distances.append(float(np.linalg.norm(p-a-t*v)))
    peak=max(distances,default=0)
    if peak<=epsilon:return [points[0],points[-1]]
    i=distances.index(peak)+1
    return simplify(points[:i+1],epsilon)[:-1]+simplify(points[i:],epsilon)

def route_length(line):return sum(math.dist(a,b) for a,b in zip(line,line[1:]))

def routes(mask,character):
    skeleton=skeletonize(mask)
    pixels={tuple(map(int,p)) for p in np.argwhere(skeleton)} # row, column
    neighbours={}
    for y,x in pixels:
        adjacent=[]
        for dy,dx in [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]:
            q=(y+dy,x+dx)
            if q not in pixels:continue
            if dy and dx and ((y,x+dx) in pixels or (y+dy,x) in pixels):continue
            adjacent.append(q)
        neighbours[(y,x)]=adjacent
    vertex_pixels={p for p,n in neighbours.items() if len(n)!=2}
    vertex_of={};centres={};isolated=[]
    for p in sorted(vertex_pixels):
        if p in vertex_of:continue
        key=len(centres);stack=[p];group=[];vertex_of[p]=key
        while stack:
            q=stack.pop();group.append(q)
            # Do not merge an endpoint into a neighbouring junction.
            if len(neighbours[q])<3:continue
            for n in neighbours[q]:
                if n in vertex_pixels and len(neighbours[n])>=3 and n not in vertex_of:
                    vertex_of[n]=key;stack.append(n)
        centres[key]=[(sum(q[1] for q in group)/len(group)+.5)/SCALE,(sum(q[0] for q in group)/len(group)+.5)/SCALE]
        if not neighbours[p]:isolated.append(centres[key])
    used=set();edges=[]
    def edge_key(a,b):return tuple(sorted((a,b)))
    for p in sorted(vertex_pixels):
        for q in neighbours[p]:
            if q in vertex_of and vertex_of[q]==vertex_of[p]:continue
            if edge_key(p,q) in used:continue
            used.add(edge_key(p,q));walk=[p,q];previous,current=p,q
            while current not in vertex_of:
                choices=[n for n in neighbours[current] if n!=previous]
                if not choices:break
                following=choices[0];used.add(edge_key(current,following));walk.append(following);previous,current=current,following
            if current in vertex_of:
                a,b=vertex_of[p],vertex_of[current]
                points=[centres[a]]+[[(x+.5)/SCALE,(y+.5)/SCALE] for y,x in walk[1:-1]]+[centres[b]]
                if route_length(points)>.05:edges.append({'a':a,'b':b,'points':points})
    # Smooth closed components have no graph vertices.
    for p in sorted(pixels):
        if p in vertex_of or not neighbours[p] or all(edge_key(p,q) in used for q in neighbours[p]):continue
        walk=[p];previous=None;current=p
        while True:
            choices=[n for n in neighbours[current] if n!=previous and edge_key(current,n) not in used]
            if not choices:break
            n=choices[0];used.add(edge_key(current,n));walk.append(n);previous,current=current,n
            if current==p:break
        if len(walk)>2:
            key=len(centres);centres[key]=[(p[1]+.5)/SCALE,(p[0]+.5)/SCALE]
            edges.append({'a':key,'b':key,'points':[[(x+.5)/SCALE,(y+.5)/SCALE] for y,x in walk]})
    def incidence():
        result={k:[] for k in centres}
        for i,e in enumerate(edges):
            for end in ('a','b'):result[e[end]].append((i,end))
        return result
    incident=incidence()
    # Raster junction spurs are not separate pedagogical strokes.
    edges=[e for e in edges if not (route_length(e['points'])<2 and (len(incident[e['a']])==1 and len(incident[e['b']])>=3 or len(incident[e['b']])==1 and len(incident[e['a']])>=3))]
    incident=incidence();pairs={}
    def vector(edge,end):
        pts=edges[edge]['points'] if end=='a' else edges[edge]['points'][::-1]
        q=next((p for p in pts[1:] if math.dist(p,pts[0])>=5),pts[-1]);v=[q[j]-pts[0][j] for j in (0,1)];d=math.hypot(*v) or 1
        return [x/d for x in v]
    for vertex,ends in incident.items():
        remaining=ends[:]
        while len(remaining)>=2:
            candidates=[]
            for i,a in enumerate(remaining):
                for j,b in enumerate(remaining[:i]):
                    u,v=vector(*a),vector(*b);candidates.append((sum(x*y for x,y in zip(u,v)),i,j))
            cosine,i,j=min(candidates)
            if len(remaining)>2 and cosine>-.6:break
            a,b=remaining[i],remaining[j];pairs[a]=b;pairs[b]=a
            remaining=[end for k,end in enumerate(remaining) if k not in (i,j)]
    taken=set();lines=[]
    starts=[(i,end) for i in range(len(edges)) for end in ('a','b') if (i,end) not in pairs]
    starts += [(i,'a') for i in range(len(edges))]
    for first in starts:
        i,end=first
        if i in taken:continue
        points=[]
        while i not in taken:
            taken.add(i);e=edges[i];piece=e['points'] if end=='a' else e['points'][::-1]
            points+=piece if not points else piece[1:]
            other='b' if end=='a' else 'a'
            if (i,other) not in pairs:break
            i,end=pairs[(i,other)]
        if route_length(points)>.05:lines.append(simplify(points))
    lines += [[[x,y-.3],[x,y+.3]] for x,y in isolated]
    normalized=[]
    for line in lines:
        if math.dist(line[0],line[-1])<.3 and route_length(line)>2:
            ring=line[:-1]
            area=sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(ring,ring[1:]+ring[:1]))
            if area>0:ring=ring[::-1]
            top=min(p[1] for p in ring);at=max((i for i,p in enumerate(ring) if p[1]<=top+.5),key=lambda i:ring[i][0])
            line=ring[at:]+ring[:at]+[ring[at]]
        else:
            a,b=line[0],line[-1]
            if (abs(b[1]-a[1])>abs(b[0]-a[0]) and b[1]<a[1]) or (abs(b[1]-a[1])<=abs(b[0]-a[0]) and b[0]<a[0]):line=line[::-1]
        normalized.append([[round(x,4),round(y,4)] for x,y in line])
    mark_limit=35 if character.isupper() else 65
    normalized.sort(key=lambda line:(character in 'ЁёЙй' and max(p[1] for p in line)<mark_limit,line[0][0],line[0][1]))
    if not normalized:raise ValueError('No routes for '+character)
    return normalized

data={}
for upper in args.letters:
    for character in ([upper,upper.lower()] if upper.lower()!=upper else [upper]):
        name=font.getBestCmap()[ord(character)]
        pen=SVGPathPen(glyphset);glyphset[name].draw(pen)
        bounds=BoundsPen(glyphset);glyphset[name].draw(bounds)
        lo,bottom,hi,top=bounds.bounds
        data[character]={'outline':pen.getCommands(),'advance':font['hmtx'][name][0]/14,'bounds':[30+lo/14,30+hi/14],'inkBounds':[30+lo/14,140-top/14,30+hi/14,140-bottom/14]}

with tempfile.TemporaryDirectory(prefix='gost-centres-') as folder:
    tmp=Path(folder);(tmp/'input.json').write_text(json.dumps(data))
    renderer="""const fs=require('fs'),path=require('path'),{Resvg}=require(process.env.RESVG_MODULE);const root=process.argv[1],data=JSON.parse(fs.readFileSync(path.join(root,'input.json')));for(const [c,g]of Object.entries(data)){const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1080" viewBox="0 0 150 180"><path d="${g.outline}" transform="translate(30 140) scale(${1/14} ${-1/14})"/></svg>`;fs.writeFileSync(path.join(root,c.codePointAt(0)+'.png'),new Resvg(svg).render().asPng())}"""
    subprocess.run(['node','-e',renderer,str(tmp)],check=True)
    for character,glyph in data.items():
        if character in approved:glyph['model']=approved[character]
        elif character in overrides:glyph['model']=[[[30+x/14,140-y/14] for x,y in line] for line in overrides[character]]
        else:
            mask=np.array(Image.open(tmp/(str(ord(character))+'.png')).getchannel('A'))>127
            glyph['model']=routes(mask,character)
        if character in demonstrations:glyph['demonstration']=[[[30+x/14,140-y/14] for x,y in line] for line in demonstrations[character]]
        if character in practice_segments:glyph['practiceSegments']=practice_segments[character]
        glyph['routeSource']='approved-manual' if character in approved else 'authored-from-outline-v1' if character in overrides else 'outline-skeleton-v1'
        glyph['revision']=hashlib.sha256(json.dumps(glyph['model'],separators=(',',':')).encode()).hexdigest()[:12]
        print(character,len(glyph['model']),'strokes',round(sum(map(route_length,glyph['model'])),1),flush=True)

target=ROOT/'concepts/components/glyphs.js'
target.write_text('// Exact source contours; generated centre routes are prototype teaching paths.\nconst DrawingGlyphs='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
print('Saved',len(data),'glyphs to',target)
