import { indexedDB } from 'fake-indexeddb';
let _db;
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open('w',1);
 r.onupgradeneeded=e=>{const s=e.target.result.createObjectStore('pages',{keyPath:'id'});s.createIndex('projectId','projectId');s.createIndex('type','type');};
 r.onsuccess=e=>{_db=e.target.result;res();};r.onerror=e=>rej(e.target.error);});
const tx=(m='readonly')=>_db.transaction('pages',m).objectStore('pages');
const P=r=>new Promise((s,j)=>{r.onsuccess=()=>s(r.result);r.onerror=()=>j(r.error);});
const DB={put:v=>P(tx('readwrite').put(v)),get:k=>P(tx().get(k))};
function pageId(p,t){return p+'::'+t;}
async function getPage(p,t){return DB.get(pageId(p,t));}
async function savePage(projectId,type,patch){const id=pageId(projectId,type);const now=new Date().toISOString();
 const ex=await DB.get(id);const rec=Object.assign({id,projectId,type,data:{},createdAt:now},ex||{},patch,{updatedAt:now});
 await DB.put(rec);return rec;}

const E=[],A=(c,m)=>c?console.log('PASS',m):(E.push(m),console.log('FAIL',m));
await open();
const KEYS=['stage','rules','tone','taboo','energy'];
// save 5 fields
await savePage('P1','world',{data:{stage:'近未来',rules:'魔法あり',tone:'切ない',taboo:'禁術',energy:'霊脈'},maps:[]});
let pg=await getPage('P1','world');
A(KEYS.every(k=>pg.data[k]),'all 5 world fields saved');
A(pg.id==='P1::world'&&pg.projectId==='P1'&&pg.type==='world','id/projectId/type correct');
// add maps
await savePage('P1','world',{data:pg.data,maps:['m1','m2','m3']});
pg=await getPage('P1','world');
A(pg.maps.join()==='m1,m2,m3','maps added');
A(pg.data.stage==='近未来','data preserved through map update');
// reorder (swap 0,1)
let maps=pg.maps.slice();[maps[0],maps[1]]=[maps[1],maps[0]];
await savePage('P1','world',{data:pg.data,maps});
A((await getPage('P1','world')).maps.join()==='m2,m1,m3','reorder persisted');
// delete index 1
maps=(await getPage('P1','world')).maps.slice();maps.splice(1,1);
await savePage('P1','world',{data:pg.data,maps});
A((await getPage('P1','world')).maps.join()==='m2,m3','delete persisted');
// partial update keeps createdAt
const created=(await getPage('P1','world')).createdAt;
await new Promise(r=>setTimeout(r,3));
await savePage('P1','world',{data:{...pg.data,tone:'明るい'},maps:['m2','m3']});
const pg2=await getPage('P1','world');
A(pg2.createdAt===created&&pg2.updatedAt!==created,'createdAt preserved, updatedAt changed');
A(pg2.data.tone==='明るい','field edit applied');
// isolation between projects/types
await savePage('P2','world',{data:{stage:'別世界'},maps:[]});
A((await getPage('P1','world')).data.stage==='近未来'&&(await getPage('P2','world')).data.stage==='別世界','per-project isolation');
A(await getPage('P1','planning')===undefined,'unsaved type returns undefined');
console.log(E.length?('\nFAILURES '+E.length):'\nALL PASS');
