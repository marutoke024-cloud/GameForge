import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import fs from 'fs';
global.indexedDB = indexedDB;
global.IDBKeyRange = IDBKeyRange;
global.window = { addEventListener(){}, scrollTo(){} };
global.document = { querySelectorAll:()=>[], getElementById:()=>({addEventListener(){},classList:{add(){},remove(){}},style:{},focus(){}}) };

const html = fs.readFileSync('index.html','utf8');
const script = html.split('<script>')[1].split('</script>')[0];

const test = `
;(async()=>{
  const errors=[];
  const assert=(c,m)=> c?console.log('PASS',m):(errors.push(m),console.log('FAIL',m));
  await openDB();
  const names=Array.from(_db.objectStoreNames);
  const expected=['projects','characters_draft','stories_draft','milestones','pages','assets','glossary','exp_log'];
  assert(expected.every(s=>names.includes(s))&&names.length===8,'8 stores: '+names.join(','));
  const a=await createProject('はじまりのRPG');
  await new Promise(r=>setTimeout(r,5));
  const b=await createProject('二作目');
  assert(a.level===1&&a.exp===0,'starts Lv.1/exp0');
  assert(a.id!==b.id,'unique ids');
  const list=await listProjects();
  assert(list.length===2,'lists 2');
  assert(list[0].name==='二作目','newest-first sort');
  const st=_db.transaction('milestones').objectStore('milestones');
  assert(st.indexNames.contains('projectId'),'milestones projectId index');
  console.log(errors.length===0?'\\nALL PASS':'\\nFAILURES '+errors.length);
})();
`;
eval(script + test);
