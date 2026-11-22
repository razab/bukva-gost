import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readBundle} from './internal-package.mjs';
import {Resvg} from '@resvg/resvg-js';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundle = await readBundle(path.join(root, 'dist', 'web'));
const output = path.join(root, 'dist', 'ipad-pilot');
const web = path.join(output, 'Web');
const assets = new Map(bundle.files);
const nativeBuild = (await fs.readFile(path.join(root, 'ipad-pilot.yml'), 'utf8')).match(/CURRENT_PROJECT_VERSION: '(\d+)'/)?.[1];
if (!nativeBuild) throw Error('Missing native build number');

const pilotHead = `<meta http-equiv="Content-Security-Policy" content="connect-src 'none'">\n</head>`;
const original = assets.get('index.html').toString();
const pilotHTML = original
  .replace(/<meta name="offline-bundle"[^>]*>/, '')
  .replace(/<link rel="manifest"[^>]*>/, '')
  .replace(/<script src="components\/offline-client\.js\?v=\d+"><\/script>/, '')
  // Installed resources update with the app, rather than through a PWA cache.
  .replace(/<section class="backup-panel"><h2>Приложение<\/h2>[\s\S]*?<\/section>/, '')
  .replace('</head>', `<link rel="stylesheet" href="native.css?v=${nativeBuild}">` + pilotHead)
  .replace('class="learner"', 'class="learner native-ipad"')
  .replace('</body>', `<script src="native-bridge.js?v=${nativeBuild}"></script></body>`);
if (pilotHTML.includes('offline-client.js') || !pilotHTML.includes(pilotHead)) {
  throw Error('The iPad lesson must use installed resources');
}
for (const id of ['choose-letter', 'show-progress', 'next-letter', 'result-next', 'export-backup', 'import-backup', 'open-developer']) {
  if (!pilotHTML.includes(`id="${id}"`)) throw Error('Missing installed app action: ' + id);
}
if (pilotHTML.includes('install-update')) throw Error('Installed app cannot offer a PWA update');
assets.set('index.html', Buffer.from(pilotHTML));
for (const name of ['native.css', 'native-bridge.js']) assets.set(name, await fs.readFile(path.join(root, 'LetterDrawingPilot/Web', name)));

// Reuse the exact worksheet animation implementation for the read-only native sheet.
const runtime = assets.get('components/worksheet-runtime.js').toString();
const animationStart = runtime.indexOf('function stopDemo()');
const animationEnd = runtime.indexOf('// Geometric tracing similarity');
const fontFunction = runtime.match(/^function fontOutline\([^\n]+/m)?.[0];
if (animationStart < 0 || animationEnd < animationStart || !fontFunction) throw Error('Cannot reuse worksheet demo');
const sample = `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>:root{--accent:#347356}body{margin:0;background:#fffefa;user-select:none;-webkit-user-select:none}html:not([data-show-schemes=true]) .sample-scheme{display:none}section{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);padding:24px;gap:16px;max-width:680px;margin:auto}svg{width:100%;height:260px;min-width:0}@media(max-height:600px){svg{height:180px}section{padding:12px}}</style>
<section><svg id="demo" viewBox="0 0 150 180"></svg><svg id="instruction-upper" class="sample-scheme"></svg></section><section><svg id="demo-lower" viewBox="0 0 150 180"></svg><svg id="instruction-lower" class="sample-scheme"></svg></section>
<script src="components/glyphs.js"></script><script src="components/writing-scheme.js"></script><script>
const activeLetter=decodeURIComponent(location.hash.slice(1))||'А';
try{document.documentElement.dataset.showSchemes=String(JSON.parse(localStorage.getItem('gost-learner-ui-preferences-v1')||'null')?.options?.schemes===true)}catch{}

const models=DrawingGlyphs[activeLetter].model,lowercase=DrawingGlyphs[activeLetter.toLowerCase()].model;
const learnerMode=false,fontScale=100/1400;let animation=null;
const preferences={bold:100};try{const saved=JSON.parse(localStorage.getItem('gost-developer-preferences-v1')||'{}');if(Number.isFinite(saved.bold))preferences.bold=Math.max(100,Math.min(150,saved.bold))}catch{}
const modelGlyph=new WeakMap(Object.values(DrawingGlyphs).flatMap(g=>[[g.model,g],...(g.demonstration?[[g.demonstration,g]]:[])]));
const demonstrationFor=model=>modelGlyph.get(model)?.demonstration||model;
const path=line=>line.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join(' ');
function boldExpansion(){return (preferences.bold/100-1)*10}
${fontFunction}
${runtime.slice(animationStart, animationEnd)}
for(const [suffix,character] of [['upper',activeLetter],['lower',activeLetter.toLowerCase()]]){
 const glyph=DrawingGlyphs[character],model=demonstrationFor(glyph.model),svg=document.querySelector('#instruction-'+suffix);
 svg.setAttribute('viewBox',WritingScheme.frame([model],[glyph.inkBounds],boldExpansion()/2).join(' '));
 svg.innerHTML=WritingScheme.markup(model,fontOutline(model,'fill="#809e8a"'));
 svg.setAttribute('aria-label',character+': '+glyph.instruction.steps.map((s,i)=>(i+1)+'. '+s).join('; '));
}playDemo();
</script></html>`;
assets.set('sample.html', Buffer.from(sample));
for (const file of ['sw.js', 'precache-manifest.js', 'manifest.webmanifest', 'components/offline-client.js']) {
  assets.delete(file);
}
await fs.rm(web, {recursive: true, force: true});
const resources = [];
for (const [name, contents] of assets) {
  const file = path.join(web, name);
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, contents);
  resources.push({path: name, sha256: createHash('sha256').update(contents).digest('hex')});
}
const manifest = {sourceBuild: bundle.build, sourceVersion: bundle.version, nativeBuild, distribution: 'INTERNAL REVIEW ONLY', resources};
const glyphs = vm.runInNewContext(assets.get('components/glyphs.js').toString() + ';DrawingGlyphs');
manifest.letterImages = [];
for (const letter of Object.keys(glyphs).filter(c => /^[А-ЯЁ]$/.test(c))) {
  const code = letter.codePointAt(0).toString(16);
  const glyph = c => `<path d="${glyphs[c].outline}" transform="translate(30 140) scale(${100/1400} ${-100/1400})" fill="#347356"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="25 25 230 130">${glyph(letter)}<g transform="translate(110 0)">${glyph(letter.toLowerCase())}</g></svg>`;
  const png = new Resvg(svg, {fitTo: {mode: 'width', value: 460}}).render().asPng();
  const directory = path.join(output, 'Assets.xcassets', `Letter-${code}.imageset`);
  await fs.mkdir(directory, {recursive: true});
  await fs.writeFile(path.join(directory, 'Letter.png'), png);
  await fs.writeFile(path.join(directory, 'Contents.json'), JSON.stringify({images: [{filename: 'Letter.png', idiom: 'universal', scale: '2x'}], info: {author: 'xcode', version: 1}}));
  manifest.letterImages.push({letter, sha256: createHash('sha256').update(png).digest('hex')});
}
if (manifest.letterImages.length !== 33) throw Error('Native course needs 33 GOST letter images');
const digits = vm.runInNewContext(assets.get('components/number-glyphs.js').toString() + ';NumberGlyphs');
const digitPaths = [...'123'].map((digit, i) =>
  `<path d="${digits[digit].outline}" transform="translate(${i * 64} 115) scale(${100/1400} ${-100/1400})"/>`
).join('');
const pickerDigits = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 196 130">${digitPaths}</svg>`, {
  fitTo: {mode: 'width', value: 392}
}).render().asPng();
const pickerDigitsDirectory = path.join(output, 'Assets.xcassets', 'PickerNumbers.imageset');
await fs.mkdir(pickerDigitsDirectory, {recursive: true});
await fs.writeFile(path.join(pickerDigitsDirectory, 'Digits.png'), pickerDigits);
await fs.writeFile(path.join(pickerDigitsDirectory, 'Contents.json'), JSON.stringify({
  images: [{filename: 'Digits.png', idiom: 'universal', scale: '2x'}], info: {author: 'xcode', version: 1}
}));
manifest.pickerDigitsSHA256 = createHash('sha256').update(pickerDigits).digest('hex');
const iconSource = await fs.readFile(path.join(root, 'concepts/assets/icons/icon.svg'));
const icon = new Resvg(iconSource, {fitTo: {mode: 'width', value: 1024}, background: '#fffefa'}).render().asPng();
const iconDirectory = path.join(output, 'Assets.xcassets', 'AppIcon.appiconset');
await fs.mkdir(iconDirectory, {recursive: true});
await fs.writeFile(path.join(iconDirectory, 'AppIcon.png'), icon);
await fs.writeFile(path.join(iconDirectory, 'Contents.json'), JSON.stringify({images: [{filename: 'AppIcon.png', idiom: 'universal', platform: 'ios', size: '1024x1024'}], info: {author: 'xcode', version: 1}}));
manifest.appIconSHA256 = createHash('sha256').update(icon).digest('hex');
await fs.writeFile(path.join(output, 'resources.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Prepared ${resources.length} local resources from web build ${bundle.build}`);
