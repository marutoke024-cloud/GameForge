import { indexedDB } from 'fake-indexeddb';
let _db;
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open('v8',1);
 r.onupgradeneeded=e=>{const db=e.target.result;
   const pg=db.createObjectStore('pages',{keyPath:'id'});
   const as=db.createObjectStore('assets',{keyPath:'id'});as.createIndex('projectId','projectId');as.createIndex('category','category');
   const gl=db.createObjectStore('glossary',{keyPath:'id'});gl.createIndex('projectId','projectId');gl.createIndex('term','term');};
 r.onsuccess=e=>{_db=e.target.result;res();};r.onerror=e=>rej(e.target.error);});
const tx=(s,m='readonly')=>_db.transaction(s,m).objectStore(s);
const P=r=>new Promise((s,j)=>{r.onsuccess=()=>s(r.result);r.onerror=()=>j(r.error);});
const DB={put:(s,v)=>P(tx(s,'readwrite').put(v)),get:(s,k)=>P(tx(s).get(k)),delete:(s,k)=>P(tx(s,'readwrite').delete(k)),
  byIdx:(s,i,v)=>P(tx(s).index(i).getAll(v))};
function pageId(p,t){return p+'::'+t;}
async function getPage(p,t){return DB.get('pages',pageId(p,t));}
async function savePage(pid,type,patch){const id=pageId(pid,type);const now=new Date().toISOString();const ex=await DB.get('pages',id);
 const rec=Object.assign({id,projectId:pid,type,data:{},createdAt:now},ex||{},patch,{updatedAt:now});await DB.put('pages',rec);return rec;}
let _n=0;const uid=()=>'u'+(_n++);
const ASSET_CATS=['キャライラスト','背景絵','イベントCG','ロゴ','借用BGM','借用SE','借用プラグイン','借用素材'];
const BORROW=['借用BGM','借用SE','借用プラグイン','借用素材'];
async function collectAutoAssets(pid){const out={};ASSET_CATS.forEach(c=>out[c]=[]);
 const ch=await getPage(pid,'character');
 (ch&&ch.data&&ch.data.characters?ch.data.characters:[]).forEach(c=>{
   (c.standing||[]).forEach((s,i)=>out['キャライラスト'].push({src:s,name:`${c.name} 立ち絵${i+1}`,source:'メインキャラ設計',auto:true}));
   (c.draftArt||[]).forEach((s,i)=>out['キャライラスト'].push({src:s,name:`${c.name} ラフ${i+1}`,source:'メインキャラ設計',auto:true}));});
 const w=await getPage(pid,'world');(w&&w.data&&w.data.maps?w.data.maps:[]).forEach((s,i)=>out['背景絵'].push({src:s,name:`マップラフ${i+1}`,source:'世界観',auto:true}));
 const sc=await getPage(pid,'scenario');let si=0,ci=0;
 (sc&&sc.data&&sc.data.blocks?sc.data.blocks:[]).forEach(b=>{
   if(b.type==='scene'&&b.bg)out['背景絵'].push({src:b.bg,name:`シーン背景${++si}`,source:'シナリオ',auto:true});
   if(b.type==='cg'&&b.src)out['イベントCG'].push({src:b.src,name:`CG${++ci}`,source:'シナリオ',auto:true});});
 return out;}
async function listManual(pid,cat){return (await DB.byIdx('assets','projectId',pid)).filter(a=>a.category===cat);}

const E=[],A=(c,m)=>c?console.log('PASS',m):(E.push(m),console.log('FAIL',m));
await open();
// seed pages
await savePage('P1','character',{data:{characters:[{id:'c1',name:'マシュ',standing:['st1','st2'],draftArt:['ra1']},{id:'c2',name:'主人公',standing:['st3'],draftArt:[]}]}});
await savePage('P1','world',{data:{maps:['m1','m2','m3']}});
await savePage('P1','scenario',{data:{blocks:[{type:'text',content:'x'},{type:'scene',bg:'bg1',place:'城'},{type:'cg',src:'cg1'},{type:'scene',bg:'bg2'},{type:'cg',src:'cg2'}]}});
const auto=await collectAutoAssets('P1');
A(auto['キャライラスト'].length===4,'キャライラスト auto = 4 (2+1 + 1 standing)');
A(auto['背景絵'].length===5,'背景絵 auto = 5 (3 maps + 2 scene bg)');
A(auto['イベントCG'].length===2,'イベントCG auto = 2');
A(auto['ロゴ'].length===0,'ロゴ auto = 0 (manual only)');
A(auto['キャライラスト'][0].source==='メインキャラ設計','source page recorded');
// manual asset (image)
await DB.put('assets',{id:uid(),projectId:'P1',category:'ロゴ',name:'タイトルロゴ',src:'logo1',url:'',terms:'',createdAt:new Date().toISOString()});
A((await listManual('P1','ロゴ')).length===1,'manual logo added');
// borrow asset
await DB.put('assets',{id:'b1',projectId:'P1',category:'借用BGM',name:'戦場のテーマ',src:null,url:'https://ex.com',terms:'クレジット必須',createdAt:new Date().toISOString()});
const bgm=await listManual('P1','借用BGM');
A(bgm.length===1&&bgm[0].url==='https://ex.com'&&bgm[0].terms==='クレジット必須','borrow BGM with URL+terms');
A(BORROW.includes('借用素材')&&!BORROW.includes('ロゴ'),'borrow category detection');
// delete manual
await DB.delete('assets','b1');
A((await listManual('P1','借用BGM')).length===0,'manual delete works');
// glossary
const tags=['人名','地名','組織・勢力','魔法・呪術・能力','アイテム・道具','固有現象・概念','その他'];
A(tags.length===7,'7 default glossary tags');
await DB.put('glossary',{id:uid(),projectId:'P1',term:'カルデア',reading:'かるであ',desc:'機関',tag:'組織・勢力',createdAt:new Date().toISOString()});
await DB.put('glossary',{id:uid(),projectId:'P1',term:'マシュ',reading:'ましゅ',desc:'盾',tag:'人名',createdAt:new Date().toISOString()});
await DB.put('glossary',{id:uid(),projectId:'P1',term:'藤丸',reading:'ふじまる',desc:'主人公',tag:'人名',createdAt:new Date().toISOString()});
let gl=await DB.byIdx('glossary','projectId','P1');
A(gl.length===3,'3 glossary terms');
// group by tag
const byTag={};gl.forEach(t=>byTag[t.tag]=(byTag[t.tag]||0)+1);
A(byTag['人名']===2&&byTag['組織・勢力']===1,'grouped by tag');
// sort within group by reading
const jinmei=gl.filter(t=>t.tag==='人名').sort((a,b)=>(a.reading).localeCompare(b.reading,'ja'));
A(jinmei[0].term==='藤丸'&&jinmei[1].term==='マシュ','sorted by reading (ふ<ま)');
// search by term
const q='マシュ'.toLowerCase();
const found=gl.filter(t=>t.term.toLowerCase().includes(q)||t.reading.toLowerCase().includes(q));
A(found.length===1&&found[0].term==='マシュ','keyword search by term');
// per-project isolation
A((await DB.byIdx('glossary','projectId','P2')).length===0,'glossary isolated per project');
A((await listManual('P2','ロゴ')).length===0,'assets isolated per project');
console.log(E.length?('\nFAILURES '+E.length):'\nALL PASS');
