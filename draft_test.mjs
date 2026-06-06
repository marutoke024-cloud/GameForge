import { indexedDB } from 'fake-indexeddb';
const DB_NAME='gf_test', DB_VERSION=1;
const STORES={characters_draft:[['projectId','projectId'],['createdAt','createdAt']],
              stories_draft:[['projectId','projectId'],['createdAt','createdAt']]};
let _db;
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);
  r.onupgradeneeded=e=>{const db=e.target.result;for(const[n,ix]of Object.entries(STORES)){
    const s=db.createObjectStore(n,{keyPath:'id'});ix.forEach(([a,b])=>s.createIndex(a,b));}};
  r.onsuccess=e=>{_db=e.target.result;res();};r.onerror=e=>rej(e.target.error);});
const tx=(s,m='readonly')=>_db.transaction(s,m).objectStore(s);
const P=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
const DB={put:(s,v)=>P(tx(s,'readwrite').put(v)),get:(s,k)=>P(tx(s).get(k)),
  getAll:s=>P(tx(s).getAll()),delete:(s,k)=>P(tx(s,'readwrite').delete(k))};
let _n=0; const uid=()=>'id_'+(Date.now()).toString(36)+'_'+(_n++);
const draftStore=k=>k==='character'?'characters_draft':'stories_draft';
async function saveDraft(kind,data){const now=new Date().toISOString();const store=draftStore(kind);let rec;
  if(data.id){const ex=await DB.get(store,data.id);rec=Object.assign({},ex,data,{updatedAt:now});}
  else{rec=Object.assign({id:uid(),projectId:null,createdAt:now,updatedAt:now},data);}
  await DB.put(store,rec);return rec;}
async function listDrafts(kind){const all=await DB.getAll(draftStore(kind));
  return all.sort((a,b)=>a.createdAt<b.createdAt?1:-1);}
async function getDraft(k,id){return DB.get(draftStore(k),id);}
async function deleteDraft(k,id){return DB.delete(draftStore(k),id);}

const E=[],A=(c,m)=>c?console.log('PASS',m):(E.push(m),console.log('FAIL',m));
await open();
const c=await saveDraft('character',{title:'マシュ',outline:'盾',charmPoint:'前髪',sexAppeal:'胸元',images:['i1','i2'],thumbnail:'i1'});
A(c.projectId===null,'character draft is cross-project (projectId null)');
A(!!c.id&&!!c.createdAt,'id+createdAt assigned');
const s=await saveDraft('story',{title:'序章',memo:'断片',images:[],thumbnail:null});
A(s.thumbnail===null,'story thumbnail optional (null ok)');
A((await listDrafts('character')).length===1 && (await listDrafts('story')).length===1,'kinds stored separately');
A((await getDraft('character',c.id)).charmPoint==='前髪','character fields persisted');
const c2=await saveDraft('character',{id:c.id,title:'マシュ改',images:['i1','i2'],thumbnail:'i2',outline:'盾',charmPoint:'前髪',sexAppeal:'胸元'});
A(c2.id===c.id,'edit keeps same id');
const lc=await listDrafts('character');
A(lc.length===1&&lc[0].title==='マシュ改'&&lc[0].thumbnail==='i2','edit updates in place (no dup), thumbnail changed');
await deleteDraft('character',c.id);
A((await listDrafts('character')).length===0,'delete works');
// sort newest-first
const a1=await saveDraft('story',{title:'A',images:[]});await new Promise(r=>setTimeout(r,3));
const a2=await saveDraft('story',{title:'B',images:[]});
A((await listDrafts('story'))[0].title==='B','listDrafts newest-first');
console.log(E.length?('\nFAILURES '+E.length):'\nALL PASS');
