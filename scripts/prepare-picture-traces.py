"""Build offline pictures from whole strokes with one connected ready part.

Input is retained independently of generated JS. Requires fontTools.
Run with --canary to inspect the first two pictures before generating all 40.
"""
import json
import math
import sys
from pathlib import Path
from fontTools.pens.basePen import BasePen
from fontTools.svgLib.path import parse_path

ROOT = Path(__file__).resolve().parents[1]

class StrokePen(BasePen):
    """Keep original command endpoints; curve samples never become cut points."""
    def __init__(self):
        super().__init__(None)
        self.paths = []
        self.start = None

    def _moveTo(self, point):
        self.paths.append([])
        self.start = point

    def _lineTo(self, point):
        line = [self._getCurrentPoint(), point]
        if math.dist(*line) > .001:
            self.paths[-1].append(line)

    def _curveToOne(self, a, b, c):
        start = self._getCurrentPoint()
        n = max(8, math.ceil(sum(math.dist(x, y) for x, y in zip([start, a, b], [a, b, c])) / 1.5))
        line = [start]
        for i in range(1, n + 1):
            t = i / n
            u = 1 - t
            line.append(tuple(u**3*start[j]+3*u*u*t*a[j]+3*u*t*t*b[j]+t**3*c[j] for j in (0, 1)))
        self.paths[-1].append(line)

    def _qCurveToOne(self, a, b):
        start = self._getCurrentPoint()
        self._curveToOne(tuple(start[j]+2/3*(a[j]-start[j]) for j in (0, 1)), tuple(b[j]+2/3*(a[j]-b[j]) for j in (0, 1)), b)

    def _closePath(self):
        self._lineTo(self.start)

    def _endPath(self):
        pass


def length(line):
    return sum(math.dist(a, b) for a, b in zip(line, line[1:]))


def smooth(a, b):
    u = (a[-1][0]-a[-2][0], a[-1][1]-a[-2][1])
    v = (b[1][0]-b[0][0], b[1][1]-b[0][1])
    return math.dist(a[-1], b[0]) < .01 and sum(x*y for x, y in zip(u, v)) / (math.hypot(*u)*math.hypot(*v)) > math.cos(math.radians(25))


def whole_strokes(paths):
    result, signatures = [], set()
    for segments in paths:
        merged = []
        for line in segments:
            if merged and smooth(merged[-1], line):
                merged[-1] += line[1:]
            else:
                merged.append(line[:])
        if len(merged) > 1 and smooth(merged[-1], merged[0]):
            merged = [merged[-1]+merged[0][1:]] + merged[1:-1]
        for line in merged:
            signature = tuple((round(x, 3), round(y, 3)) for x, y in line)
            signature = min(signature, signature[::-1])
            if signature not in signatures:
                signatures.add(signature)
                result.append(line)
    return result


def point_distance(p, a, b):
    dx, dy = b[0]-a[0], b[1]-a[1]
    t = max(0, min(1, ((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy or 1)))
    return math.dist(p, (a[0]+t*dx, a[1]+t*dy))


def segments_touch(a, b, c, d):
    u, v, w = (b[0]-a[0], b[1]-a[1]), (d[0]-c[0], d[1]-c[1]), (c[0]-a[0], c[1]-a[1])
    cross = lambda x, y: x[0]*y[1]-x[1]*y[0]
    den = cross(u, v)
    if den and 0 <= cross(w, v)/den <= 1 and 0 <= cross(w, u)/den <= 1:
        return True
    return min(point_distance(a, c, d), point_distance(b, c, d), point_distance(c, a, b), point_distance(d, a, b)) <= 1.5


def connected(a, b):
    for p, q in zip(a, a[1:]):
        for r, s in zip(b, b[1:]):
            if max(min(p[0], q[0]), min(r[0], s[0])) > min(max(p[0], q[0]), max(r[0], s[0]))+1.5:
                continue
            if max(min(p[1], q[1]), min(r[1], s[1])) > min(max(p[1], q[1]), max(r[1], s[1]))+1.5:
                continue
            if segments_touch(p, q, r, s):
                return True
    return False


def choose_ready(lines):
    lengths = list(map(length, lines))
    budget = sum(lengths)*.25
    neighbours = {i: set() for i in range(len(lines))}
    for i in range(len(lines)):
        for j in range(i):
            if connected(lines[i], lines[j]):
                neighbours[i].add(j)
                neighbours[j].add(i)
    candidates = []
    for seed, size in enumerate(lengths):
        if size > budget:
            continue
        ready, total = {seed}, size
        while True:
            choices = {j for i in ready for j in neighbours[i] if j not in ready and total+lengths[j] <= budget}
            if not choices:
                break
            take = max(choices, key=lambda i: (lengths[i], -i))
            ready.add(take)
            total += lengths[take]
        points = [p for i in ready for p in lines[i]]
        span = (max(p[0] for p in points)-min(p[0] for p in points))*(max(p[1] for p in points)-min(p[1] for p in points))
        candidates.append((total, -span, -seed, ready))
    if not candidates:
        raise ValueError('No whole stroke fits the ready-part budget; author the picture explicitly')
    return sorted(max(candidates, key=lambda c: c[:3])[3])


def svg(lines):
    return ' '.join(' '.join(('M' if i == 0 else 'L')+f'{p[0]:.3f} {p[1]:.3f}' for i, p in enumerate(line)) for line in lines)

source = json.loads((ROOT/'references/picture-catalog-source.json').read_text())
prepared, plans = [], []
for item in source[:2] if '--canary' in sys.argv else source:
    pen = StrokePen()
    parse_path(item['fixed']+' '+item['trace'], pen)
    lines = whole_strokes(pen.paths)
    ready = choose_ready(lines)
    fixed = [line for i, line in enumerate(lines) if i in ready]
    trace = [line for i, line in enumerate(lines) if i not in ready]
    ratio = sum(map(length, trace)) / sum(map(length, lines))
    assert ratio >= .749999
    prepared.append(dict(id=item['id'], name=item['name'], fixed=svg(fixed), trace=svg(trace), decor='', completionFraction=round(ratio, 6)))
    plans.append(dict(id=item['id'], units=[svg([line]) for line in lines], ready=ready))

if '--canary' in sys.argv:
    Path('/tmp/letter-picture-canary.json').write_text(json.dumps(prepared))
    Path('/tmp/letter-picture-canary-plan.json').write_text(json.dumps(plans))
    print('Canary: 2 pictures; whole strokes, one connected ready part; /tmp/letter-picture-canary.json')
else:
    catalog = ROOT/'concepts/components/catalog.js'
    text = catalog.read_text()
    start, end = text.index('const pictures='), text.index('// Only parts belonging')
    (ROOT/'references/picture-stroke-plan.json').write_text(json.dumps(plans, ensure_ascii=False, indent=2)+'\n')
    catalog.write_text(text[:start]+'const pictures='+json.dumps(prepared, ensure_ascii=False, separators=(',', ':'))+';\n'+text[end:])
    print(f'Prepared {len(prepared)} offline pictures; whole strokes, connected ready parts, at least 75% to complete by path length')
