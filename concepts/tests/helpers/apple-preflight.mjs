import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {scan, startReport, finalizeReport, combine, semanticChecks, main} from '../../../scripts/apple-preflight.mjs';

export async function checkApplePreflight(projectRoot, evidenceDir = null) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'gost-apple-audit-'));
  const completed = [];
  const copy = async name => { await fs.mkdir(path.dirname(path.join(temp, name)), {recursive: true}); await fs.cp(path.join(projectRoot, name), path.join(temp, name), {recursive: true, filter: p => !p.includes(path.sep + 'tests')}); };
  try {
    for (const name of ['concepts', 'dist/web', '.agents/skills/apple-preflight', '.agents/skills/app-store-review', 'package.json', 'references/isopromat-fonts/SOURCE.json',
      'docs/release-readiness.md', 'docs/ipad-pilot.md', 'docs/internal-delivery.md', 'scripts/apple-preflight.mjs', 'scripts/internal-package.mjs', 'scripts/offline-html.mjs', 'scripts/build-offline.mjs']) await copy(name);
    const options = {projectRoot: temp, reportDir: path.join(temp, 'reports/apple-review/canary')};
    const first = await startReport(options);
    assert.equal(first.exitCode, 0);
    const cli = name => spawnSync(process.execPath, [path.join(temp, 'scripts/apple-preflight.mjs'), '--report-dir', 'reports/apple-review/' + name], {cwd: temp, encoding: 'utf8'});
    assert.equal(cli('cli-healthy').status, 0);
    assert(JSON.parse(cli('cli-healthy-second').stdout).report.endsWith('/report.md'), 'CLI must execute, not merely exit0');
    assert.equal(first.mechanical.checks.find(c => c.id === 'bundle-integrity').status, 'PASS');
    assert.equal(first.mechanical.checks.find(c => c.id === 'bundle-current').status, 'PASS');
    assert.equal(first.mechanical.checks.find(c => c.id === 'checklist-pin').status, 'PASS');
    assert.equal(first.mechanical.checks.find(c => c.id === 'release-dev-tools').status, 'FLAG');
    assert.equal(first.mechanical.checks.find(c => c.id === 'font-permission').status, 'UNKNOWN');
    const originalMechanical = await fs.readFile(path.join(first.dir, 'mechanical.json'), 'utf8');
    await assert.rejects(startReport(options), {code: 'EEXIST'});
    assert.equal(await fs.readFile(path.join(first.dir, 'mechanical.json'), 'utf8'), originalMechanical);
    const pending = combine(first.mechanical);
    for (const id of ['native-package', 'app-store-connect', 'physical-ipad']) assert.equal(pending.checks.find(c => c.id === id).status, 'NOT_CHECKED');
    assert.equal(pending.assessment, 'INCOMPLETE');
    completed.push('healthy bundle; explicit pending scopes; existing run preserved');

    const semantic = {schema: 1, fingerprint: first.mechanical.fingerprint, author: 'Test fixture, not App Review', checkedAt: new Date().toISOString(),
      findings: Object.entries(semanticChecks).map(([id, [summary, guideline]]) => ({id, status: 'NOT_CHECKED', summary, evidence: [{note: 'Not executed by fixture'}], source: {kind: 'apple', url: 'https://developer.apple.com/app-store/review/guidelines/', guideline}}))};
    const semanticPath = path.join(first.dir, 'semantic.json');
    const write = async value => fs.writeFile(semanticPath, JSON.stringify(value));
    await write(semantic);
    await finalizeReport(options);
    const savedReport = await fs.readFile(path.join(first.dir, 'report.json'), 'utf8');
    await finalizeReport(options);
    assert.equal(await fs.readFile(path.join(first.dir, 'report.json'), 'utf8'), savedReport, 'Resume must reproduce the same report');
    assert.equal((await scan({projectRoot: temp})).fingerprint, first.mechanical.fingerprint, 'Audit must not modify inputs');
    completed.push('JSON/Markdown finalization; repeated resume; source immutability');

    const negative = async (mutate, pattern) => { const invalid = structuredClone(semantic); mutate(invalid); await write(invalid); await assert.rejects(finalizeReport(options), pattern); assert.equal(await fs.readFile(path.join(first.dir, 'report.json'), 'utf8'), savedReport); };
    await negative(s => { s.findings[0].status = 'MAGIC'; }, /Invalid finding/);
    await negative(s => { s.findings.pop(); }, /sections missing/);
    await negative(s => { s.findings[0].id = 'physical-ipad'; s.findings[0].status = 'PASS'; }, /Unknown\/duplicate/);
    await negative(s => { s.findings[0].status = 'PASS'; }, /file evidence/);
    await negative(s => { s.findings[0].evidence = [{input: 'source:../../private', line: 1}]; }, /Unknown evidence/);
    await negative(s => { s.findings[0].evidence = [{input: 'source:concepts/index.html', line: 99999}]; }, /outside file/);
    await negative(s => { s.findings[0].source.url = 'https://developer.apple.com.evil.test/'; }, /Invalid Apple source/);
    await negative(s => { s.fingerprint = 'stale'; }, /stale fingerprint/);
    await write(semantic);
    const m = JSON.parse(originalMechanical); m.checks[0].status = 'UNKNOWN';
    await fs.writeFile(path.join(first.dir, 'mechanical.json'), JSON.stringify(m));
    await assert.rejects(finalizeReport(options), /inputs\/facts changed/);
    await fs.writeFile(path.join(first.dir, 'mechanical.json'), originalMechanical);
    completed.push('false PASS/status/source/line/scope; missing sections; protected mechanical facts');

    const sourcePath = path.join(temp, 'concepts/index.html'), originalSource = await fs.readFile(sourcePath);
    await fs.appendFile(sourcePath, '\n<!-- changed after audit -->');
    await assert.rejects(finalizeReport(options), /inputs\/facts changed/);
    const stale = await startReport({...options, reportDir: path.join(temp, 'reports/apple-review/stale')});
    assert.equal(stale.exitCode, 1);
    assert.equal(stale.mechanical.checks.find(c => c.id === 'bundle-current').status, 'BLOCK');
    await fs.writeFile(sourcePath, originalSource);
    await finalizeReport(options);
    const bundlePath = path.join(temp, 'dist/web/components/glyphs.js'), originalBundle = await fs.readFile(bundlePath);
    await fs.appendFile(bundlePath, '\n// corrupt');
    const failed = await startReport({...options, reportDir: path.join(temp, 'reports/apple-review/corrupt')});
    assert.equal(failed.exitCode, 1);
    assert.equal(cli('cli-corrupt').status, 1);
    assert.equal(failed.mechanical.checks.find(c => c.id === 'bundle-integrity').status, 'BLOCK');
    await fs.writeFile(bundlePath, originalBundle);
    const recovered = await startReport({...options, reportDir: path.join(temp, 'reports/apple-review/recovered')});
    assert.equal(recovered.mechanical.fingerprint, first.mechanical.fingerprint);
    await fs.rename(path.join(temp, 'dist/web'), path.join(temp, 'dist/web-saved'));
    const missing = await startReport({...options, reportDir: path.join(temp, 'reports/apple-review/missing')});
    assert.equal(missing.exitCode, 2);
    assert.equal(cli('cli-missing').status, 2);
    assert.equal(missing.mechanical.checks.find(c => c.id === 'bundle-integrity').status, 'UNKNOWN');
    const checklistPath = path.join(temp, '.agents/skills/app-store-review/SKILL.md');
    await fs.appendFile(checklistPath, '\nUnreviewed update');
    const altered = await scan({projectRoot: temp});
    assert.equal(altered.checks.find(c => c.id === 'checklist-pin').status, 'BLOCK');
    completed.push('stale-source rejection; stale/corrupt/missing bundle; recovery; checklist tampering');
    await assert.rejects(startReport({...options, reportDir: path.join(temp, 'concepts/write-here')}), /inside reports/);
    await fs.symlink(path.join(temp, 'concepts'), path.join(temp, 'reports/apple-review/link'));
    await assert.rejects(startReport({...options, reportDir: path.join(temp, 'reports/apple-review/link/no')}), /symlink/);
    await assert.rejects(main(['--upload']), /Usage:/);
    completed.push('report write boundary; symlink and unknown CLI options rejected');

    if (evidenceDir) {
      await fs.mkdir(evidenceDir, {recursive: true});
      await fs.cp(path.join(temp, 'reports/apple-review/canary'), path.join(evidenceDir, 'fixture-report'), {recursive: true});
      await fs.writeFile(path.join(evidenceDir, 'canary.json'), JSON.stringify({fixture: true, physicalChecksExecuted: false, completed, reports: ['fixture-report/report.md', 'fixture-report/report.json']}, null, 2) + '\n');
    }
    console.log('PASS: Apple preflight ' + completed.join('; '));
  } finally { await fs.rm(temp, {recursive: true, force: true}); }
}
