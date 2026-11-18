import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readBundle} from './internal-package.mjs';
import {Resvg} from '@resvg/resvg-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundle = await readBundle(path.join(root, 'dist', 'web'));
const output = path.join(root, 'dist', 'ipad-pilot');
const web = path.join(output, 'Web');
const assets = new Map(bundle.files);

const pilotHead = `<meta http-equiv="Content-Security-Policy" content="connect-src 'none'">\n</head>`;
const original = assets.get('index.html').toString();
const pilotHTML = original
  .replace(/<meta name="offline-bundle"[^>]*>/, '')
  .replace(/<link rel="manifest"[^>]*>/, '')
  .replace(/<script src="components\/offline-client\.js\?v=\d+"><\/script>/, '')
  // Installed resources update with the app, rather than through a PWA cache.
  .replace(/<section class="backup-panel"><h2>Приложение<\/h2>[\s\S]*?<\/section>/, '')
  .replace('</head>', pilotHead);
if (pilotHTML.includes('offline-client.js') || !pilotHTML.includes(pilotHead)) {
  throw Error('The iPad lesson must use installed resources');
}
for (const id of ['choose-letter', 'show-progress', 'next-letter', 'result-next', 'export-backup', 'import-backup', 'open-developer']) {
  if (!pilotHTML.includes(`id="${id}"`)) throw Error('Missing installed app action: ' + id);
}
if (pilotHTML.includes('install-update')) throw Error('Installed app cannot offer a PWA update');
assets.set('index.html', Buffer.from(pilotHTML));
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
const manifest = {sourceBuild: bundle.build, sourceVersion: bundle.version, distribution: 'INTERNAL REVIEW ONLY', resources};
const iconSource = await fs.readFile(path.join(root, 'concepts/assets/icons/icon.svg'));
const icon = new Resvg(iconSource, {fitTo: {mode: 'width', value: 1024}, background: '#fffefa'}).render().asPng();
const iconDirectory = path.join(output, 'Assets.xcassets', 'AppIcon.appiconset');
await fs.mkdir(iconDirectory, {recursive: true});
await fs.writeFile(path.join(iconDirectory, 'AppIcon.png'), icon);
await fs.writeFile(path.join(iconDirectory, 'Contents.json'), JSON.stringify({images: [{filename: 'AppIcon.png', idiom: 'universal', platform: 'ios', size: '1024x1024'}], info: {author: 'xcode', version: 1}}));
manifest.appIconSHA256 = createHash('sha256').update(icon).digest('hex');
await fs.writeFile(path.join(output, 'resources.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Prepared ${resources.length} local resources from web build ${bundle.build}`);
