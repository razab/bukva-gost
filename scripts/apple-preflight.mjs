import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {readBundle} from './internal-package.mjs';
import {offlineHTML} from './offline-html.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = '.agents/skills/';
const STATUSES = ['PASS', 'BLOCK', 'FLAG', 'UNKNOWN', 'NOT_CHECKED', 'N/A'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const serialize = data => JSON.stringify(data, null, 2) + '\n';
const internal = {kind: 'internal'};
export const semanticChecks = {
  'privacy-policy': ['Политика приватности', '5.1.1'],
  'kids': ['Детская аудитория и родительские барьеры', '1.3'],
  'network-privacy': ['Сетевые обращения и данные', '5.1'],
  'functionality': ['Самостоятельная ценность', '4.2'],
  'metadata': ['Магазинные сведения', '2.3'],
  'content-rights': ['Права на материалы', '5.2'],
  'account-purchases': ['Регистрация и покупки', '3.1'],
  'reviewer-access': ['Доступ проверяющего и dev-функции', '2.3.1'],
  'permissions-privacy': ['Разрешения и privacy manifests', '5.1']
};
const finding = (id, status, summary, evidence, source = internal) => ({id, status, summary, evidence, source});
const note = text => [{note: text}];

async function walk(dir, prefix = '') {
  let entries;
  try { entries = await fs.readdir(dir, {withFileTypes: true}); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const names = [];
  for (const entry of entries) {
    if (entry.name === '.DS_Store' || entry.name === 'tests') continue;
    const name = prefix + entry.name;
    if (entry.isSymbolicLink()) throw Error('Audit input symlink: ' + name);
    if (entry.isDirectory()) names.push(...await walk(path.join(dir, entry.name), name + '/'));
    else if (entry.isFile()) names.push(name);
    else throw Error('Unsupported audit input: ' + name);
  }
  return names.sort();
}

async function inputsFor(projectRoot, webDir) {
  const source = new Set(['package.json', 'references/isopromat-fonts/SOURCE.json',
    'docs/release-readiness.md', 'docs/ipad-pilot.md', 'docs/internal-delivery.md',
    'scripts/apple-preflight.mjs', 'scripts/internal-package.mjs', 'scripts/offline-html.mjs', 'scripts/build-offline.mjs']);
  for (const dir of ['concepts', SKILLS + 'apple-preflight', SKILLS + 'app-store-review'])
    for (const file of await walk(path.join(projectRoot, dir))) source.add(dir + '/' + file);
  const buffers = new Map(), inputs = [];
  for (const [area, base, files] of [['source', projectRoot, [...source].sort()], ['bundle', webDir, await walk(webDir)]]) {
    for (const file of files) {
      let bytes = null;
      try { bytes = await fs.readFile(path.join(base, file)); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      const id = area + ':' + file;
      buffers.set(id, bytes);
      inputs.push({id, sha256: bytes ? hash(bytes) : null, bytes: bytes?.length ?? null});
    }
  }
  return {buffers, inputs, fingerprint: hash(serialize(inputs))};
}

export async function scan({projectRoot = ROOT, webDir = path.join(projectRoot, 'dist/web')} = {}) {
  const data = await inputsFor(projectRoot, webDir);
  const evidence = (input, line = 1) => [{input, line}];
  const text = id => data.buffers.get(id)?.toString('utf8');
  const checks = [];
  let bundle = null, inputMissing = false;
  try {
    bundle = await readBundle(webDir);
    checks.push(finding('bundle-integrity', 'PASS', `${bundle.resourceURLs} URL: whitelist и SHA-256 совпадают.`, evidence('bundle:precache-manifest.js')));
  } catch (error) {
    inputMissing = error.code === 'ENOENT' && !data.buffers.get('bundle:.generated');
    checks.push(finding('bundle-integrity', inputMissing ? 'UNKNOWN' : 'BLOCK', error.message, note('Вход: dist/web; проверка readBundle.')));
  }
  if (bundle) {
    const mismatches = [];
    for (const [name, bytes] of bundle.files) {
      if (name === 'precache-manifest.js') continue;
      const original = data.buffers.get('source:concepts/' + name);
      const expected = name === 'index.html' && original ? Buffer.from(offlineHTML(original.toString('utf8'))) : original;
      if (!expected?.equals(bytes)) mismatches.push(name);
    }
    checks.push(finding('bundle-current', mismatches.length ? 'BLOCK' : 'PASS', mismatches.length ?
      'Комплект отличается от текущих исходников: ' + mismatches.join(', ') : 'Байты комплекта соответствуют текущим исходникам, включая offline-обёртку HTML.', evidence('bundle:index.html')));
    const hasDeveloper = bundle.files.has('components/developer-panel.js') || bundle.files.get('index.html').includes('id="developer-panel"');
    checks.push(finding('release-dev-tools', hasDeveloper ? 'FLAG' : 'PASS', hasDeveloper ?
      'Внутренний комплект включает developer-panel. Перед Release требуется решение о составе и доступе проверяющего.' :
      'Известный developer-panel отсутствует в комплекте; это не поиск всех возможных скрытых функций.', evidence('bundle:index.html')));
  } else {
    for (const id of ['bundle-current', 'release-dev-tools']) checks.push(finding(id, 'UNKNOWN', 'Нужен целостный автономный комплект.', note('Целостность входа не подтверждена.')));
  }
  let checklist = null;
  try {
    const pin = JSON.parse(text('source:' + SKILLS + 'apple-preflight/references/upstream.json'));
    if (pin.repository !== 'https://github.com/safaiyeh/app-store-review-skill' || !/^[a-f0-9]{40}$/.test(pin.commit) || pin.license !== 'MIT' || !pin.version || !pin.files?.['SKILL.md'] || !pin.files?.LICENSE)
      throw Error('Invalid checklist pin');
    const actual = await walk(path.join(projectRoot, SKILLS + 'app-store-review'));
    if (JSON.stringify(actual) !== JSON.stringify(Object.keys(pin.files).sort())) throw Error('Checklist files differ from pin');
    for (const file of actual) if (hash(data.buffers.get('source:' + SKILLS + 'app-store-review/' + file)) !== pin.files[file]) throw Error('Checklist hash differs: ' + file);
    checklist = {repository: pin.repository, commit: pin.commit, version: pin.version, license: pin.license};
    checks.push(finding('checklist-pin', 'PASS', `Checklist ${pin.version}, commit ${pin.commit}: файлы и MIT совпадают с описью.`, evidence('source:' + SKILLS + 'apple-preflight/references/upstream.json')));
  } catch (error) { checks.push(finding('checklist-pin', 'BLOCK', error.message, note('Проверка установленного checklist относительно локальной pinned-описи.'))); }
  const fontInput = 'source:references/isopromat-fonts/SOURCE.json';
  checks.push(finding('font-permission', 'UNKNOWN', 'Документ разрешения на распространение ASCON-производных контуров не проверен; скачивание TTF и fsType не являются такой проверкой.',
    data.buffers.get(fontInput) ? evidence(fontInput) : note('Нет SOURCE.json шрифта.')));
  const pngInput = 'bundle:assets/watermelon-reference.png';
  checks.push(finding('watermelon-provenance', 'UNKNOWN', 'Происхождение и разрешение на PNG арбуза требуют документального подтверждения.',
    data.buffers.get(pngInput) ? evidence(pngInput) : note('Нет проверенного входа PNG/документа о правах.')));
  let gitHead = null;
  try { gitHead = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim(); }
  catch { /* A fixture or source export can legitimately have no Git metadata. */ }
  return {schema: 1, kind: 'mechanical', createdAt: new Date().toISOString(),
    build: text('source:concepts/index.html')?.match(/name="app-build" content="([^"]+)"/)?.[1] ?? null,
    bundleVersion: bundle?.version ?? null, checklist, gitHead, inputs: data.inputs, fingerprint: data.fingerprint,
    checks, inputMissing, limits: {
      'native-package': 'Нативный архив, подпись, SDK, entitlements и содержимое финального бинарного файла не проверены.',
      'app-store-connect': 'Аккаунт, магазинные поля и анкеты App Store Connect не проверены.',
      'physical-ipad': 'Установка, Pencil, ладонь, поворот и автономный запуск на физическом iPad не проверены.'
    }};
}

function checkFinding(item, mechanical, {semantic = false} = {}) {
  if (!item || typeof item.id !== 'string' || !STATUSES.includes(item.status) || !item.summary?.trim() || !Array.isArray(item.evidence) || !item.evidence.length)
    throw Error('Invalid finding: ' + item?.id);
  if (!['internal', 'apple'].includes(item.source?.kind)) throw Error('Missing finding source: ' + item.id);
  if (item.source.kind === 'apple') {
    const url = new URL(item.source.url);
    if (url.protocol !== 'https:' || url.hostname !== 'developer.apple.com' || url.username || url.password || !item.source.guideline)
      throw Error('Invalid Apple source: ' + item.id);
  } else if (semantic) throw Error('Semantic finding needs an Apple source: ' + item.id);
  const inputs = new Map(mechanical.inputs.map(i => [i.id, i]));
  let anchored = false;
  for (const ev of item.evidence) {
    if (ev.input) {
      if (!inputs.get(ev.input)?.sha256 || !Number.isInteger(ev.line) || ev.line < 1) throw Error('Unknown evidence input: ' + ev.input);
      anchored = true;
    } else if (!ev.note?.trim()) throw Error('Missing evidence: ' + item.id);
  }
  if (semantic && ['PASS', 'BLOCK', 'FLAG', 'N/A'].includes(item.status) && !anchored)
    throw Error('Finding needs file evidence: ' + item.id);
}

export function combine(mechanical, semantic = null) {
  if (mechanical.schema !== 1 || mechanical.kind !== 'mechanical') throw Error('Invalid mechanical report');
  const checks = structuredClone(mechanical.checks);
  for (const [id, summary] of Object.entries(mechanical.limits)) checks.push(finding(id, 'NOT_CHECKED', summary, note('Требуется отдельный фактический вход/проверка.')));
  if (semantic) {
    if (semantic.schema !== 1 || semantic.fingerprint !== mechanical.fingerprint || !semantic.author?.trim() || !Number.isFinite(Date.parse(semantic.checkedAt)))
      throw Error('Semantic report missing author/date or stale fingerprint');
    if (!Array.isArray(semantic.findings) || semantic.findings.length !== Object.keys(semanticChecks).length)
      throw Error('Semantic sections missing');
    const seen = new Set();
    for (const item of semantic.findings) {
      if (!Object.hasOwn(semanticChecks, item.id) || seen.has(item.id)) throw Error('Unknown/duplicate semantic ID: ' + item.id);
      seen.add(item.id); checkFinding(item, mechanical, {semantic: true}); checks.push(structuredClone(item));
    }
  } else for (const [id, [summary, guideline]] of Object.entries(semanticChecks)) checks.push(finding(id, 'NOT_CHECKED', summary, note('AI-аудит ещё не выполнялся.'), {kind: 'apple', url: 'https://developer.apple.com/app-store/review/guidelines/', guideline}));
  for (const item of checks) checkFinding(item, mechanical);
  const counts = Object.fromEntries(STATUSES.map(status => [status, checks.filter(c => c.status === status).length]));
  return {schema: 1, build: mechanical.build, bundleVersion: mechanical.bundleVersion, fingerprint: mechanical.fingerprint,
    gitHead: mechanical.gitHead, checklist: mechanical.checklist, createdAt: mechanical.createdAt, semantic: semantic ? {author: semantic.author, checkedAt: semantic.checkedAt} : null,
    assessment: counts.BLOCK ? 'BLOCKERS_FOUND' : counts.UNKNOWN || counts.NOT_CHECKED ? 'INCOMPLETE' : 'REVIEW_REQUIRED',
    approval: 'NOT_DETERMINED', counts, mechanicalSHA256: hash(serialize(mechanical)), checks};
}

export function markdown(report) {
  const clean = value => String(value).replaceAll('\n', ' ').replaceAll('|', '\\|');
  let output = `# Apple Review · ${clean(report.build ?? 'сборка неизвестна')}\n\n` +
    `Состояние: **${report.assessment}**. Одобрение Apple: **не определено**.\n\n` +
    `Fingerprint: ${report.fingerprint}\n\n` +
    Object.entries(report.counts).map(([s, n]) => `${s}: ${n}`).join(' · ') + '\n\n';
  for (const item of report.checks) {
    output += `## ${item.status} · ${item.id}\n\n${item.summary}\n\n`;
    for (const ev of item.evidence) output += `- ${ev.input ? `${clean(ev.input)}:${ev.line}` : clean(ev.note)}${ev.input && ev.note ? ' — ' + clean(ev.note) : ''}\n`;
    if (item.source.kind === 'apple') output += `\n[Apple ${clean(item.source.guideline)}](${item.source.url})\n`;
    else output += '\nВнутренняя техническая проверка; не отдельное требование Apple.\n';
    if (item.action) output += `\nДействие: ${item.action}\n`;
    output += '\n';
  }
  output += '## Не проверено или неизвестно\n\n' + report.checks.filter(c => ['UNKNOWN', 'NOT_CHECKED'].includes(c.status)).map(c => `- ${c.id}: ${c.summary}`).join('\n') + '\n';
  return output;
}

async function writeReport(dir, report) {
  for (const [name, content] of [['report.json', serialize(report)], ['report.md', markdown(report)]]) {
    await fs.writeFile(path.join(dir, name + '.tmp'), content);
    await fs.rename(path.join(dir, name + '.tmp'), path.join(dir, name));
  }
}

async function reportDirectory(value, projectRoot) {
  const base = path.join(projectRoot, 'reports/apple-review'), target = path.resolve(value);
  if (!target.startsWith(base + path.sep) || target === base) throw Error('Report directory must be inside reports/apple-review/');
  let current = projectRoot;
  for (const part of path.relative(projectRoot, target).split(path.sep)) {
    current = path.join(current, part);
    try { if ((await fs.lstat(current)).isSymbolicLink()) throw Error('Report path symlink'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return target;
}

export async function startReport({projectRoot = ROOT, reportDir, webDir} = {}) {
  const dir = await reportDirectory(reportDir ?? path.join(projectRoot, 'reports/apple-review', new Date().toISOString().replace(/[:.]/g, '-') + '-' + process.pid), projectRoot);
  const mechanical = await scan({projectRoot, webDir});
  await fs.mkdir(path.dirname(dir), {recursive: true});
  await fs.mkdir(dir); // Existing runs are durable evidence, never overwritten by another start.
  await fs.writeFile(path.join(dir, 'mechanical.json'), serialize(mechanical), {flag: 'wx'});
  await writeReport(dir, combine(mechanical));
  return {dir, mechanical, exitCode: mechanical.inputMissing ? 2 : mechanical.checks.some(c => c.status === 'BLOCK') ? 1 : 0};
}

export async function finalizeReport({projectRoot = ROOT, reportDir, webDir} = {}) {
  const dir = await reportDirectory(reportDir, projectRoot);
  const mechanical = JSON.parse(await fs.readFile(path.join(dir, 'mechanical.json'), 'utf8'));
  const current = await scan({projectRoot, webDir});
  if (['fingerprint', 'build', 'bundleVersion', 'checklist', 'inputs', 'checks', 'limits'].some(key => JSON.stringify(mechanical[key]) !== JSON.stringify(current[key])))
    throw Error('Audit inputs/facts changed: start a new report');
  const semanticPath = path.join(dir, 'semantic.json');
  if ((await fs.lstat(semanticPath)).isSymbolicLink() || (await fs.stat(semanticPath)).size > 2_000_000) throw Error('Invalid semantic report file');
  const semantic = JSON.parse(await fs.readFile(semanticPath, 'utf8'));
  const report = combine(mechanical, semantic);
  for (const item of semantic.findings) for (const ev of item.evidence) if (ev.input) {
    const [area, ...parts] = ev.input.split(':');
    const name = parts.join(':');
    const base = area === 'source' ? projectRoot : (webDir ?? path.join(projectRoot, 'dist/web'));
    if (ev.line > (await fs.readFile(path.join(base, name), 'utf8')).split('\n').length) throw Error('Evidence line outside file: ' + ev.input);
  }
  await writeReport(dir, report);
  return report;
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length && (argv.length !== 2 || !['--report-dir', '--finalize'].includes(argv[0]))) throw Error('Usage: npm run check:apple [-- --report-dir reports/apple-review/NAME | --finalize reports/apple-review/NAME]');
  if (argv[0] === '--finalize') {
    const report = await finalizeReport({reportDir: argv[1]});
    console.log(JSON.stringify({assessment: report.assessment, counts: report.counts, report: argv[1] + '/report.md'}));
    return report.counts.BLOCK ? 1 : 0;
  }
  const run = await startReport({reportDir: argv[1]});
  console.log(JSON.stringify({mechanicalExitCode: run.exitCode, assessment: 'AI_AND_DEVICE_CHECKS_PENDING', report: path.join(run.dir, 'report.md'), fingerprint: run.mechanical.fingerprint}));
  return run.exitCode;
}

// Node resolves import.meta through symlinks; argv retains the invocation spelling.
const entry = process.argv[1] ? await fs.realpath(process.argv[1]).catch(error => { if (error.code === 'ENOENT') return null; throw error; }) : null;
if (entry && import.meta.url === pathToFileURL(entry).href)
  main().then(code => { process.exitCode = code; }).catch(error => { console.error(error.message); process.exitCode = 2; });
