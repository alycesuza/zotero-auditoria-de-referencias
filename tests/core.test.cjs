const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const core=require('../src/core.js');
const item=(overrides={})=>({key:'SYNTH001',title:'Synthetic example',date:'2020',type:'book',creators:[{lastName:'Example'}],tags:[],attachments:[],...overrides});
test('CSV export protects spreadsheet formulas and preserves quotes',()=>{
 const csv=core.csv([{title:'=HYPERLINK("x")',evidence:'Line; "quoted"'}]);
 assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes('""quoted""'));
});
test('package contains no database, account credentials or real document fixture',()=>{
 const manifest=require('../src/manifest.json');const pkg=require('../package.json');
 assert.equal(manifest.version,pkg.version);assert.equal(manifest.applications.zotero.id,pkg.zotero.id);
 assert.equal(manifest.applications.zotero.strict_min_version,'10.0');
 for(const file of fs.readdirSync('src'))assert.ok(!/\.(sqlite|pdf|docx|env)$/i.test(file));
 for(const file of fs.readdirSync('src').filter(x=>x.endsWith('.js')))new vm.Script(fs.readFileSync('src/'+file,'utf8'),{filename:file});
});
test('flags malformed identifiers and duplicate DOI without declaring automatic merges',()=>{
 const rows=core.audit([item({DOI:'wrong',ISBN:'9780306406158'}),item({key:'OTHER001',DOI:'10.1234/example'}),item({key:'OTHER002',DOI:'https://doi.org/10.1234/example'})]);
 assert.ok(rows.some(x=>x.field==='ISBN'));
 assert.ok(rows.some(x=>x.field==='DOI'&&/inválido/.test(x.message)));
 assert.equal(rows.filter(x=>/compartilhado/.test(x.message)).length,2);
});
test('missing dates are type-aware and a valid ISBN passes',()=>{
 assert.ok(!core.audit([item({type:'webpage',date:'',ISBN:'9780306406157'})]).some(x=>['date','ISBN'].includes(x.field)));
 assert.ok(core.audit([item({date:''})]).some(x=>x.field==='date'));
});
