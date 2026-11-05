// Give classic browser scripts their real filenames in V8 reports. Do not
// rewrite/instrument application code or count the harness as application code.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),names=fs.readdirSync(root+'/concepts/components').filter(n=>n.endsWith('.js')).map(n=>root+'/concepts/components/'+n).concat(root+'/concepts/sw.js');
const filenames=new Map(names.map(file=>[fs.readFileSync(file,'utf8'),file]));
for(const method of ['runInContext','runInNewContext']){
 const original=vm[method];
 vm[method]=function(code,context,options){const filename=typeof code==='string'?filenames.get(code):null;return original.call(this,code,context,filename?{...(typeof options==='string'?{filename:options}:options),filename}:options)};
}
