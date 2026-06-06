import { indexedDB } from 'fake-indexeddb';
let _db;
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open('pl',1);
 r.onupgradeneeded=e=>{const s=e.target.result.createObjectStore('pages',{keyPath:'id'});s.createIndex('projectId','projectId');s.createIndex('type','type');};
 r.onsuccess=e=>{_db=e.target.result;res();};r.onerror=e=>rej(e.target.error);});
const tx=(m='readonly')=>_db.transaction('pages',m).objectStore('pages');
const P=r=>new Promise((s,j)=>{r.onsuccess=()=>s(r.result);r.onerror=()=>j(r.error);});
const DB={put:v=>P(tx('readwrite').put(v)),get:k=>P(tx().get(k))};
const pageId=(p,t)=>p+'::'+t;const getPage=(p,t)=>DB.get(pageId(p,t));
async function savePage(pid,type,patch){const id=pageId(pid,type);const now=new Date().toISOString();const ex=await DB.get(id);
 const rec=Object.assign({id,projectId:pid,type,data:{},createdAt:now},ex||{},patch,{updatedAt:now});await DB.put(rec);return rec;}
const PLAN_KEYS=['vision','genre','refs'];
const E=[],A=(c,m)=>c?console.log('PASS',m):(E.push(m),console.log('FAIL',m));
await open();
await savePage('P1','planning',{data:{vision:'盾の少女のRPG',genre:'2D探索RPG',refs:'FGO\nニーア'}});
let pg=await getPage('P1','planning');
A(PLAN_KEYS.every(k=>pg.data[k]),'all 3 planning fields saved');
A(pg.data.vision==='盾の少女のRPG'&&pg.data.genre==='2D探索RPG','vision/genre persisted');
A(pg.data.refs.includes('\n'),'refs (大テキスト) keeps newlines');
A(pg.id==='P1::planning'&&pg.type==='planning','planning is its own page record');
// separate from world
await savePage('P1','world',{data:{stage:'近未来'}});
A((await getPage('P1','planning')).data.vision==='盾の少女のRPG','planning unaffected by world save');
A((await getPage('P1','world')).data.stage==='近未来','world is separate record');
// per-project isolation
A((await getPage('P2','planning'))===undefined,'planning isolated per project');
// edit in place
await savePage('P1','planning',{data:{vision:'改訂版',genre:'ADV',refs:''}});
A((await getPage('P1','planning')).data.vision==='改訂版','planning edit updates in place');
console.log(E.length?('\nFAILURES '+E.length):'\nALL PASS');
