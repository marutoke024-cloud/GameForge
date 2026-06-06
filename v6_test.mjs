import { indexedDB } from 'fake-indexeddb';
let _db;
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open('v6',1);
 r.onupgradeneeded=e=>{e.target.result.createObjectStore('pages',{keyPath:'id'});};
 r.onsuccess=e=>{_db=e.target.result;res();};r.onerror=e=>rej(e.target.error);});
const tx=(m='readonly')=>_db.transaction('pages',m).objectStore('pages');
const P=r=>new Promise((s,j)=>{r.onsuccess=()=>s(r.result);r.onerror=()=>j(r.error);});
const DB={put:v=>P(tx('readwrite').put(v)),get:k=>P(tx().get(k))};
function pageId(p,t){return p+'::'+t;}
async function getPage(p,t){return DB.get(pageId(p,t));}
async function savePage(pid,type,patch){const id=pageId(pid,type);const now=new Date().toISOString();const ex=await DB.get(id);
 const rec=Object.assign({id,projectId:pid,type,data:{},createdAt:now},ex||{},patch,{updatedAt:now});await DB.put(rec);return rec;}
let _n=0;const uid=()=>'b'+(_n++);
// mirror of block logic
let scnBlocks=[],scnFocusId=null,currentProjectId='P1';
const newTextBlock=(c='')=>({id:uid(),type:'text',content:c});
const newSceneBlock=()=>({id:uid(),type:'scene',place:'',time:'',color:'#49a96f',bg:null});
const newCgBlock=()=>({id:uid(),type:'cg',src:null,size:'m'});
const blockIndexById=id=>scnBlocks.findIndex(b=>b.id===id);
function insertBlock(block){let at=scnFocusId?blockIndexById(scnFocusId):-1;at=at>=0?at+1:scnBlocks.length;
 scnBlocks.splice(at,0,block);if(!scnBlocks[at+1]||scnBlocks[at+1].type!=='text'){scnBlocks.splice(at+1,0,newTextBlock());}
 scnFocusId=scnBlocks[at+1].id;}
function deleteBlock(id){const i=blockIndexById(id);if(i<0)return;scnBlocks.splice(i,1);if(scnBlocks.length===0)scnBlocks.push(newTextBlock());}
const persist=()=>savePage(currentProjectId,'scenario',{data:{blocks:scnBlocks}});

const E=[],A=(c,m)=>c?console.log('PASS',m):(E.push(m),console.log('FAIL',m));
await open();
scnBlocks=[newTextBlock('はじまり')];scnFocusId=scnBlocks[0].id;
// insert scene
insertBlock(newSceneBlock());
A(scnBlocks.length===3&&scnBlocks[1].type==='scene'&&scnBlocks[2].type==='text','scene inserted + trailing text block');
// insert cg after the scene's trailing text (focus moved there)
insertBlock(newCgBlock());
A(scnBlocks.some(b=>b.type==='cg'),'cg inserted');
const cg=scnBlocks.find(b=>b.type==='cg');
A(scnBlocks[scnBlocks.indexOf(cg)+1].type==='text','cg also followed by text block');
// edit fields
const sc=scnBlocks.find(b=>b.type==='scene');
sc.place='王城';sc.time='夕暮れ';sc.color='#ff0000';sc.bg='bgdata';
cg.src='cgdata';cg.size='l';
scnBlocks[0].content='本文編集';
await persist();
let pg=await getPage('P1','scenario');
A(pg.data.blocks.length===scnBlocks.length,'all blocks saved');
const ssc=pg.data.blocks.find(b=>b.type==='scene');
A(ssc.place==='王城'&&ssc.time==='夕暮れ'&&ssc.color==='#ff0000'&&ssc.bg==='bgdata','scene fields persisted');
const scg=pg.data.blocks.find(b=>b.type==='cg');
A(scg.src==='cgdata'&&scg.size==='l','cg src+size persisted');
A(pg.data.blocks[0].content==='本文編集','text content persisted');
// reload simulation
scnBlocks=pg.data.blocks;
A(scnBlocks.filter(b=>b.type==='text').length>=1,'reload keeps text blocks');
// delete the scene block
const before=scnBlocks.length;
deleteBlock(sc.id);
A(scnBlocks.length===before-1&&!scnBlocks.some(b=>b.type==='scene'),'scene block deleted');
// delete down to empty -> auto text block
scnBlocks=[newTextBlock()];const only=scnBlocks[0].id;deleteBlock(only);
A(scnBlocks.length===1&&scnBlocks[0].type==='text','delete last → keeps one empty text block');
// empty doc fallback
const empty=await getPage('P2','scenario');
const init=(empty&&empty.data&&empty.data.blocks&&empty.data.blocks.length)?empty.data.blocks:[newTextBlock()];
A(init.length===1&&init[0].type==='text','new project → one empty text block');
console.log(E.length?('\nFAILURES '+E.length):'\nALL PASS');
