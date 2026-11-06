// Project entry point; OpenSpec is a developer CLI, never a browser dependency.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('../',import.meta.url));
const result=spawnSync('openspec',process.argv.slice(2).length?process.argv.slice(2):['--help'],{
  cwd,stdio:'inherit',env:{...process.env,OPENSPEC_TELEMETRY:'0',DO_NOT_TRACK:'1'}
});
if(result.error){
  console.error(result.error.code==='ENOENT'
    ? 'OpenSpec CLI отсутствует. Установка проверенной версии: npm install -g @fission-ai/openspec@1.16.0'
    : result.error.message);
  process.exit(1);
}
process.exit(result.status??1);
