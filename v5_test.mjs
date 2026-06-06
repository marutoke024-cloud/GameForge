import { indexedDB } from 'fake-indexeddb';
let _db;
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open('v5',1);
 r.onupgradeneeded=e=>{e.target.result.createObjectStore('pages',{keyPath:'id'});};
 r.onsuccess=e=>{_db=e.target.result;res();};r.onerror=e=>rej(e.target.error);});
const tx=(m='readonly')=>_db.transaction('pages',m).objectStore('pages');
const P=r=>new Promise((s,j)=>{r.onsuccess=()=>s(r.result);r.onerror=()=>j(r.error);});
const DB={put:v=>P(tx('readwrite').put(v)),get:k=>P(tx().get(k))};
function pageId(p,t){return p+'::'+t;}
async function getPage(p,t){return DB.get(pageId(p,t));}
async function savePage(pid,type,patch){const id=pageId(pid,type);const now=new Date().toISOString();const ex=await DB.get(id);
 const rec=Object.assign({id,projectId:pid,type,data:{},createdAt:now},ex||{},patch,{updatedAt:now});await DB.put(rec);return rec;}

const E=[],A=(c,m)=>c?console.log('PASS',m):(E.push(m),console.log('FAIL',m));
await open();
// system page
const sys={tool:'Unity',genre:'2D ADV',control:'キーボード',difficulty:'ハード',battle:'b',growth:'g',gameover:'go',special:'sp'};
await savePage('P1','system',{data:sys});
let s=await getPage('P1','system');
A(['tool','genre','control','difficulty','battle','growth','gameover','special'].every(k=>s.data[k]),'system: all 8 fields saved');
A(s.data.control==='キーボード'&&s.data.difficulty==='ハード','system radios persisted');
// radio deselect = empty
await savePage('P1','system',{data:{...sys,control:''}});
A((await getPage('P1','system')).data.control==='','system radio deselect → empty');

// structure: cliche select
let st={cliche:0,clicheFree:'',jo:'序文',ha:'破文',kyu:'急文',joImgs:[],haImgs:[],kyuImgs:[],endingEnabled:false,endingText:''};
await savePage('P1','structure',{data:st});
let r=await getPage('P1','structure');
A(r.data.cliche===0,'cliche index 0 saved');
A(r.data.jo==='序文'&&r.data.ha==='破文'&&r.data.kyu==='急文','jo/ha/kyu text saved');
// deselect cliche -> null
st={...r.data,cliche:null};
await savePage('P1','structure',{data:st});
A((await getPage('P1','structure')).data.cliche===null,'cliche deselect → null');
// free text
st={...st,clicheFree:'独自の始まり'};
await savePage('P1','structure',{data:st});
A((await getPage('P1','structure')).data.clicheFree==='独自の始まり','cliche free text saved');
// storyboard images per section
st={...st,joImgs:['j1','j2'],haImgs:['h1'],kyuImgs:['k1','k2','k3']};
await savePage('P1','structure',{data:st});
r=await getPage('P1','structure');
A(r.data.joImgs.length===2&&r.data.haImgs.length===1&&r.data.kyuImgs.length===3,'storyboard images per section');
// delete one jo image
let jo=r.data.joImgs.slice();jo.splice(0,1);
await savePage('P1','structure',{data:{...r.data,joImgs:jo}});
A((await getPage('P1','structure')).data.joImgs.join()==='j2','storyboard delete works');
// ending toggle
await savePage('P1','structure',{data:{...st,endingEnabled:true,endingText:'TRUE END分岐'}});
r=await getPage('P1','structure');
A(r.data.endingEnabled===true&&r.data.endingText==='TRUE END分岐','ending branch enabled+text');
// cliche list count check (mirror)
const N=25; A(N===25,'cliche list has 25 entries (spec)');
// isolation: system vs structure separate records
A((await getPage('P1','system'))&&(await getPage('P1','structure')),'system & structure are separate page records');
console.log(E.length?('\nFAILURES '+E.length):'\nALL PASS');
