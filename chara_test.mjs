import { indexedDB } from 'fake-indexeddb';
let _db;
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open('c',1);
 r.onupgradeneeded=e=>{e.target.result.createObjectStore('pages',{keyPath:'id'});};
 r.onsuccess=e=>{_db=e.target.result;res();};r.onerror=e=>rej(e.target.error);});
const tx=(m='readonly')=>_db.transaction('pages',m).objectStore('pages');
const P=r=>new Promise((s,j)=>{r.onsuccess=()=>s(r.result);r.onerror=()=>j(r.error);});
const DB={put:v=>P(tx('readwrite').put(v)),get:k=>P(tx().get(k))};
function pageId(p,t){return p+'::'+t;}
async function getPage(p,t){return DB.get(pageId(p,t));}
async function savePage(pid,type,patch){const id=pageId(pid,type);const now=new Date().toISOString();const ex=await DB.get(id);
 const rec=Object.assign({id,projectId:pid,type,data:{},createdAt:now},ex||{},patch,{updatedAt:now});await DB.put(rec);return rec;}
let _n=0;const uid=()=>'c'+(_n++);
async function listCharas(pid){const pg=await getPage(pid,'character');return (pg&&pg.data&&Array.isArray(pg.data.characters))?pg.data.characters:[];}
async function saveCharas(pid,arr){return savePage(pid,'character',{data:{characters:arr}});}
async function upsertChara(pid,c){const arr=await listCharas(pid);const i=arr.findIndex(x=>x.id===c.id);if(i>=0)arr[i]=c;else arr.push(c);await saveCharas(pid,arr);return c;}
async function deleteChara(pid,id){const arr=(await listCharas(pid)).filter(c=>c.id!==id);await saveCharas(pid,arr);}
function roleMark(roles){roles=roles||[];if(roles.includes('主人公'))return 'star';if(roles.includes('ヒロイン'))return 'heart';return '';}
function newChara(){return {id:uid(),name:'',roles:[],personality:'',height:'',background:'',purpose:'',capturable:false,charmPoint:'',sexAppeal:'',draftArt:[],standing:[],thumbnail:null,sm:'',cup:'',pubic:'',fetish:'',extreme:'',fromDraftId:null};}
function importFromDraft(d){const c=newChara();c.name=d.title||'';c.charmPoint=d.charmPoint||'';c.sexAppeal=d.sexAppeal||'';c.background=d.outline||'';c.draftArt=(d.images||[]).slice();c.thumbnail=d.thumbnail||null;c.fromDraftId=d.id;return c;}

const E=[],A=(c,m)=>c?console.log('PASS',m):(E.push(m),console.log('FAIL',m));
await open();
// role marks
A(roleMark(['主人公','ヒロイン'])==='star','主人公 priority → star');
A(roleMark(['ヒロイン'])==='heart','ヒロイン → heart');
A(roleMark(['敵','NPC'])==='','その他 → no mark');
A(roleMark([])==='','empty → no mark');
// create
const c1=Object.assign(newChara(),{name:'マシュ',roles:['ヒロイン','味方'],personality:'献身的',height:'158',capturable:true,sm:'M',cup:'G',pubic:'ハートシェイプ',fetish:'x',extreme:'y'});
await upsertChara('P1',c1);
let list=await listCharas('P1');
A(list.length===1&&list[0].name==='マシュ','chara created in pages');
A(list[0].capturable&&list[0].cup==='G'&&list[0].sm==='M','capture fields persisted');
A(list[0].roles.length===2,'multi roles persisted');
// update same id
const c1b=Object.assign(JSON.parse(JSON.stringify(list[0])),{name:'マシュ改',height:'160'});
await upsertChara('P1',c1b);
list=await listCharas('P1');
A(list.length===1&&list[0].name==='マシュ改'&&list[0].height==='160','update in place, no dup');
// second chara + isolation
await upsertChara('P1',Object.assign(newChara(),{name:'主人公くん',roles:['主人公']}));
list=await listCharas('P1');
A(list.length===2,'second chara added');
A(roleMark(list.find(c=>c.name==='主人公くん').roles)==='star','main char shows star');
// import from draft
const draft={id:'d1',title:'銀髪の少女',charmPoint:'前髪',sexAppeal:'胸元',outline:'盾の少女',images:['ra1','ra2'],thumbnail:'th1'};
const imp=importFromDraft(draft);
A(imp.name==='銀髪の少女'&&imp.charmPoint==='前髪'&&imp.sexAppeal==='胸元','import carries name/charm/appeal');
A(imp.background==='盾の少女'&&imp.draftArt.join()==='ra1,ra2'&&imp.thumbnail==='th1','import carries outline/rough/thumbnail');
A(imp.fromDraftId==='d1'&&imp.id!=='d1','import is new chara linked to draft');
await upsertChara('P1',imp);
A((await listCharas('P1')).length===3,'imported chara saved');
// delete
await deleteChara('P1',c1b.id);
A((await listCharas('P1')).length===2,'delete works');
// per-project isolation
A((await listCharas('P2')).length===0,'other project empty');
console.log(E.length?('\nFAILURES '+E.length):'\nALL PASS');
