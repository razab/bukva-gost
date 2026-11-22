const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const draw = require('./helpers/worksheet-pen.cjs');

const fixture = fs.readFileSync(path.join(__dirname, 'worksheet.test.cjs'), 'utf8').split('let app=boot();')[0];
const app = new Function('require', '__dirname', fixture + 'return boot({}, "learner");')(require, __dirname);
const run = source => app.run(source);
const extent = (line, origin) => Math.max(...line.map(([x, y]) => Math.hypot(x - origin[0], y - origin[1])));

function readDemo(markup) {
 const lines = [...markup.matchAll(/<path data-line="\d+" d="([^"]+)"/g)].map(([, d]) => {
  const points = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(([, x, y]) => [Number(x), Number(y)]);
  assert(points.length >= 2, 'Incomplete stroke in the rendered example');
  return points;
 });
 assert(lines.length, 'Rendered example has no strokes');
 return lines;
}

function check(parts, route, expected, context, minimum = 0, seeded = []) {
 if(seeded.length){
  const {width,height}=JSON.parse(parts.canvas.attrs['data-domain']);
  const key=JSON.stringify(parts.canvas.attrs['data-surface-id']);
  const previous=seeded.map(line=>line.map(([x,y])=>[x/width,y/height]));
  run(`data[${key}]=${JSON.stringify(previous)}`);
 }
 draw(parts.canvas, route);
 const {output} = parts, reverse = expected === 'backward';
 try {
  assert.equal(output.dataset.direction, expected, context);
  assert.equal(output.attrs['aria-label'].includes('против стрелки'), reverse, context + ' accessible direction');
  const score = Number.parseInt(output.textContent, 10);
  assert(Number.isInteger(score) && (reverse ? score < 90 : score >= minimum), context + ' score ' + score);
  if (reverse || minimum >= 95) assert.equal(output.dataset.band, reverse ? 'red' : 'green', context + ' color');
 } finally {
  output.onclick();
  parts.button.onclick();
 }
 assert.equal(output.textContent, '—', context + ' reset');
}

function textRoute(row, cell, glyphs) {
 const characters = [...row.attrs['aria-label']].filter(c => c !== ' ');
 const positions = [...cell.html.matchAll(/<g transform="translate\((-?[\d.]+) (-?[\d.]+)\)">/g)];
 assert.equal(positions.length, characters.length, 'One rendered placement per character');
 return positions.flatMap(([, dx, dy], index) => {
  const glyph = glyphs[characters[index]];
  assert(glyph?.model, 'Missing example for ' + characters[index]);
  return (glyph.demonstration || glyph.model).map(line => line.map(([x, y]) => [x + Number(dx), y + Number(dy)]));
 });
}

function substantialStrokes(parts, route) {
 const scale = Number(parts.canvas.attrs['data-scale']);
 return route.map((line, i) => [i, extent(line, line.at(-1)) * scale]).filter(([, reach]) => reach >= 10);
}

function firstHalf(stroke) {
 const segments = stroke.slice(1).map(([x, y], i) => Math.hypot(x - stroke[i][0], y - stroke[i][1]));
 let remaining = segments.reduce((total, length) => total + length, 0) / 2;
 for (const [i, length] of segments.entries()) {
  if (remaining > length || length === 0) { remaining -= length; continue; }
  const fraction = remaining / length;
  return [...stroke.slice(0, i + 1), stroke[i].map((coordinate, axis) =>
   coordinate + fraction * (stroke[i + 1][axis] - coordinate))];
 }
 return stroke;
}

function verifyDetector(parts, route) {
 const [[index]] = substantialStrokes(parts, route);
 const reversed = [[...route[index]].reverse(), ...route.filter((_, j) => index !== j)];
 // Deliberately disagree with the displayed example, keeping the shape exact.
 run(`var originalCourseDirections=StrokeDirection.route(models); StrokeDirection.routes.set(models,originalCourseDirections.map((line,i)=>i===${index}?[...line].reverse():line))`);
 try {
  assert.throws(() => check(parts, route, 'correct', 'example disagrees with grader'),
   {actual: 'backward', expected: 'correct'});
 } finally {
  run("StrokeDirection.routes.set(models,originalCourseDirections)");
 }
 // Lose the direction verdict on the way to the UI, leaving the score in place.
 run("var originalCourseAssessment=assessWriting; assessWriting=(...args)=>{const result=originalCourseAssessment(...args); if(result.direction)result.direction={...result.direction,backwards:false}; return result}");
 try {
  assert.throws(() => check(parts, reversed, 'backward', 'field hides a reversed stroke'),
   {actual: 'correct', expected: 'backward'});
 } finally {
  run("assessWriting=originalCourseAssessment");
 }
}

function checkField(parts, route, context, text) {
 const candidates = substantialStrokes(parts, route);
 assert(candidates.length, context + ' has no substantial stroke to reverse');
 if (text) {
  // Persisted correct strokes are already present when a student adds another.
  // Seed those in the test fixture and dispatch real pen events for one stroke.
  const [i] = candidates.reduce((best, next) => next[1] > best[1] ? next : best);
  const seed = route.filter((_, j) => j !== i);
  check(parts, [route[i]], 'correct', context + ' follows the example', 95, seed);
  check(parts, [[...route[i]].reverse()], 'backward', context + ' reverse stroke ' + (i + 1), 0, seed);
  return;
 }
 check(parts, route, 'correct', context + ' follows the example', 95);
 const scale = Number(parts.canvas.attrs['data-scale']);
 const unsteady = route.map(stroke => stroke.map(([x,y], i) => [
  x + Math.sin(i) * .75 / scale, y + Math.cos(i) * .75 / scale
 ]));
 check(parts, unsteady, 'correct', context + ' tolerates a small wobble');
 const [first] = candidates[0];
 check(parts, [firstHalf(route[first])], 'correct', context + ' a correctly directed start');
 for (const [i] of candidates) {
  const reversed = [[...route[i]].reverse(), ...route.filter((_, j) => j !== i)];
  check(parts, reversed, 'backward', context + ' reverse stroke ' + (i + 1));
 }
}

const glyphs = run('DrawingGlyphs');
const letters = run('LetterCurriculum.order');
const counts = {};
run("LearnerExperience.setOption('additional',true); LearnerExperience.setOption('independent',true); configure({practiceRepeats:1}); save=()=>{}; writingTimes.append=()=>{}");

for (const [level, width] of [['standard', 540], ['precise', 360]]) {
 run(`LearnerExperience.setLevel('${level}')`);
 app.nodes.practice.clientWidth = width;
 const tally = counts[level] = {guided: 0, independent: 0, text: 0, wrapped: 0};
 for (const [index, letter] of letters.entries()) {
  run(`LearnerExperience.extraOpen.add(${JSON.stringify(letter)}); build(0,${JSON.stringify(letter)}); LearnerExperience.independent=true; reflowPage()`);
  const rendered = {
   upper: readDemo(app.nodes.demo.html),
   lower: readDemo(app.nodes['demo-lower'].html)
  };
  const root = app.nodes.practice;
  const rows = root.children.flatMap(row =>
   row.id === 'additional-practice' || row.id === 'independent-practice' ? row.children.flatMap(child =>
    child.className === 'additional-practice-rows' ? child.children : [child]) : [row]);
  const expectedText = run('composition.get(variant).textRows.filter(row=>row.enabled&&!row.deferred).map(row=>row.id)');
  const textRows = [];
  let testedForms = 0, independentForms = 0;
  for (const row of rows) {
   const cell = row.children.find(child => child.parts), stage = row.dataset.lessonStage;
   if (!cell || !stage || stage.endsWith('-elements')) continue;
   const context = `${level} ${letter} / ${row.attrs['aria-label'] || stage}`;
   let route;
   if (row.dataset.component === 'letter-sequence') {
    textRows.push(row.dataset.textRowId);
    if (level !== 'standard') continue;
    route = textRoute(row, cell, glyphs);
    if (cell.parts.canvas.attrs['data-surface-id'].includes('-wrap')) tally.wrapped++;
    tally.text++;
   } else if (stage === 'independent') {
    route = rendered[row.attrs['aria-label'].endsWith(letter) ? 'upper' : 'lower'];
    independentForms++;
    tally.independent++;
   } else {
    route = rendered[stage === 'upper-letter' ? 'upper' : 'lower'];
    testedForms++;
    tally.guided++;
   }
   if (index === 0 && level === 'standard' && stage === 'upper-letter') verifyDetector(cell.parts, route);
   checkField(cell.parts, route, context, row.dataset.component === 'letter-sequence');
  }
  assert.equal(testedForms, 2, letter + ' guided forms');
  assert.equal(independentForms, 2, letter + ' independent forms');
  assert.deepEqual(textRows.sort(), [...expectedText].sort(), letter + ' mounted text rows');
 }
 assert.equal(tally.guided, 66);
 assert.equal(tally.independent, 66);
}
assert(counts.standard.text >= letters.length && counts.standard.wrapped > 0);

console.log('PASS detector controls: inverted grading route and hidden reverse feedback are rejected');
console.log('PASS course writing through mounted worksheet fields:', JSON.stringify(counts));
