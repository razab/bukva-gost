import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readBundle} from './internal-package.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundle = await readBundle(path.join(root, 'dist', 'web'));
const output = path.join(root, 'dist', 'ipad-pilot');
const web = path.join(output, 'Web');
const assets = new Map(bundle.files);

// Keep the worksheet's controls in the DOM so the shared runtime can initialize.
const pilotHead = `<meta http-equiv="Content-Security-Policy" content="connect-src 'none'">
<style>
#choose-letter, #show-progress, #next-letter, #result-next,
.parent-choice, .parent-choice + .quiet-note, #parent-panel .backup-panel { display: none !important; }
</style></head>`;
const original = assets.get('index.html').toString();
const pilotHTML = original
  .replace(/<meta name="offline-bundle"[^>]*>/, '')
  .replace(/<link rel="manifest"[^>]*>/, '')
  .replace(/<script src="components\/offline-client\.js\?v=\d+"><\/script>/, '')
  .replace('</head>', pilotHead);
if (pilotHTML.includes('offline-client.js') || !pilotHTML.includes(pilotHead)) {
  throw Error('The iPad lesson must use installed resources');
}
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
await fs.writeFile(path.join(output, 'resources.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Prepared ${resources.length} local resources from web build ${bundle.build}`);
