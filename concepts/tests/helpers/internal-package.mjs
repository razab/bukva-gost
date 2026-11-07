import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {readBundle, packageInternal} from '../../../scripts/internal-package.mjs';

export async function checkInternalPackage(webDir) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'gost-package-'));
  try {
    const outputDir = path.join(temp, 'out');
    const first = await packageInternal({webDir, outputDir});
    const interrupted = path.join(path.dirname(first.output), '.package-interrupted');
    await fs.mkdir(interrupted);
    await fs.writeFile(path.join(interrupted, first.archive), 'incomplete old staging');
    const again = await packageInternal({webDir, outputDir});
    assert.deepEqual(first, again, 'Repeated package must preserve exact bytes');
    assert.equal(await fs.readFile(path.join(interrupted, first.archive), 'utf8'), 'incomplete old staging');
    await fs.rm(interrupted, {recursive: true});
    assert.equal(first.distribution, 'INTERNAL REVIEW ONLY');
    const notices = JSON.parse(await fs.readFile(path.join(first.output, 'RESOURCE-NOTICES.json'), 'utf8'));
    assert.equal(notices.resources.length, first.files - 2);
    assert.equal(notices.categories['ascon-derived'].status, 'permission-unresolved');
    assert.equal(notices.categories['watermelon-png'].source, null);
    assert(notices.resources.every(r => /^[a-f0-9]{64}$/.test(r.sha256) && notices.categories[r.category]));
    assert(!notices.resources.some(r => r.path.endsWith('.ttf') || r.path.includes('/editor/')));
    const archiveBefore = await fs.readFile(path.join(first.output, first.archive));
    const reportPath = path.join(first.output, 'package.json');
    await fs.writeFile(reportPath, 'existing different result');
    await assert.rejects(packageInternal({webDir, outputDir}), /Existing package differs/);
    assert.equal(await fs.readFile(reportPath, 'utf8'), 'existing different result');
    assert((await fs.readFile(path.join(first.output, first.archive))).equals(archiveBefore));
    assert.deepEqual(await fs.readdir(path.dirname(first.output)), [path.basename(first.output)], 'No partial staging remains');

    const copy = path.join(temp, 'web');
    await fs.cp(webDir, copy, {recursive: true});
    const target = path.join(copy, 'components/glyphs.js');
    const original = await fs.readFile(target);
    await fs.appendFile(target, '\n// unexpected modification');
    await assert.rejects(packageInternal({webDir: copy, outputDir: path.join(temp, 'failed-out')}), /Resource hash mismatch/);
    await assert.rejects(fs.stat(path.join(temp, 'failed-out')), {code: 'ENOENT'});
    await fs.writeFile(target, original);
    const recovered = await packageInternal({webDir: copy, outputDir: path.join(temp, 'failed-out')});
    assert.equal(recovered.sha256, first.sha256, 'Recovery after invalid input must produce the verified result');
    const unexpected = path.join(copy, 'private.txt');
    await fs.writeFile(unexpected, 'must never enter a package');
    await assert.rejects(readBundle(copy), /outside bundle whitelist/);
    await fs.rm(unexpected);
    await fs.symlink(target, unexpected);
    await assert.rejects(readBundle(copy), /Symlink/);
    await fs.rm(unexpected);
    const manifestPath = path.join(copy, 'precache-manifest.js');
    const manifest = (await readBundle(copy)).files.get('precache-manifest.js').toString();
    const value = JSON.parse(manifest.slice('self.GOST_PRECACHE='.length, -2));
    const writeManifest = async data => fs.writeFile(manifestPath, 'self.GOST_PRECACHE=' + JSON.stringify(data) + ';\n');
    await writeManifest({...value, files: [{path: '../private.txt', sha256: ''}, ...value.files]});
    await assert.rejects(readBundle(copy), /Unsafe resource path/);
    await writeManifest({...value, files: [value.files[0], ...value.files]});
    await assert.rejects(readBundle(copy), /Duplicate resource URL/);
    await writeManifest({...value, version: '0'.repeat(20)});
    await assert.rejects(readBundle(copy), /Manifest version does not match/);
    await fs.writeFile(manifestPath, manifest);
    await fs.writeFile(path.join(copy, '.generated'), 'unknown source');
    await assert.rejects(readBundle(copy), /Unmarked offline directory/);
    assert.deepEqual(await fs.readdir(outputDir), [first.build]);
    console.log('PASS: internal ZIP round-trip, deterministic repeat, provenance/rights, existing-output preservation, corrupted hashes, extras, symlinks, unsafe/duplicate paths and stale manifest');
  } finally {
    await fs.rm(temp, {recursive: true, force: true});
  }
}
