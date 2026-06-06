import { indexedDB } from 'fake-indexeddb';
let _db;
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open('fix',1);
 r.onupgradeneeded=e=>{const s=e.target.result.createObjectStore('characters_draft',{keyPath:'id'});s.createIndex('createdAt','createdAt');};
 r.onsuccess=e=>{_db=e.target.result;res();};r.onerror=e=>rej(e.target.error);});
const tx=(m='readonly')=>_db.transaction('characters_draft',m).objectStore('characters_draft');
const P=r=>new Promise((s,j)=>{r.onsuccess=()=>s(r.result);r.onerror=()=>j(r.error);});
const DB={put:v=>P(tx('readwrite').put(v)),get:k=>P(tx().get(k)),getAll:()=>P(tx().getAll())};
let _n=0;const uid=()=>'id'+(_n++);
// FIXED saveDraft (else branch)
async function saveDraft(data){const now=new Date().toISOString();let rec;
 if(data.id){const ex=await DB.get(data.id);rec=Object.assign({},ex,data,{updatedAt:now});}
 else{rec=Object.assign({projectId:null,createdAt:now,updatedAt:now},data,{id:uid()});}
 await DB.put(rec);return rec;}
// OLD buggy version for comparison
async function saveDraftOLD(data){const now=new Date().toISOString();let rec;
 if(data.id){const ex=await DB.get(data.id);rec=Object.assign({},ex,data,{updatedAt:now});}
 else{rec=Object.assign({id:uid(),projectId:null,createdAt:now,updatedAt:now},data);}
 await DB.put(rec);return rec;}

const E=[],A=(c,m)=>c?console.log('PASS',m):(E.push(m),console.log('FAIL',m));
await open();
// reproduce real submitDraft input: base = {id: editingId(null), title, images, thumbnail}
const base={id:null,title:'マシュ',images:['i1'],thumbnail:'i1',outline:'盾',charmPoint:'前髪',sexAppeal:'胸元'};
// OLD should throw (null key)
let threw=false;
try{ await saveDraftOLD({...base}); }catch(e){ threw=true; }
A(threw,'OLD code throws on id:null (reproduces the bug)');
// FIXED should succeed and assign real id
const rec=await saveDraft({...base});
A(rec.id&&rec.id!==null,'FIXED assigns a valid id ('+rec.id+')');
A(rec.title==='マシュ'&&rec.charmPoint==='前髪','fields saved');
const all=await DB.getAll();
A(all.length===1,'draft is in store → will appear in card list');
// edit path still works (id present)
const upd=await saveDraft({id:rec.id,title:'マシュ改',images:['i1'],thumbnail:'i1'});
A(upd.id===rec.id&&(await DB.getAll()).length===1,'edit updates in place, no duplicate');
A((await DB.get(rec.id)).title==='マシュ改','edited title persisted');
console.log(E.length?('\nFAILURES '+E.length):'\nALL PASS');
