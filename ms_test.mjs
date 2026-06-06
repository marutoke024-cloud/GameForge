import { indexedDB } from 'fake-indexeddb';
let _db;
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open('ms',1);
 r.onupgradeneeded=e=>{const s=e.target.result.createObjectStore('milestones',{keyPath:'id'});s.createIndex('projectId','projectId');};
 r.onsuccess=e=>{_db=e.target.result;res();};r.onerror=e=>rej(e.target.error);});
const tx=(m='readonly')=>_db.transaction('milestones',m).objectStore('milestones');
const P=r=>new Promise((s,j)=>{r.onsuccess=()=>s(r.result);r.onerror=()=>j(r.error);});
const DB={put:v=>P(tx('readwrite').put(v)),get:k=>P(tx().get(k)),byIdx:v=>P(tx().index('projectId').getAll(v))};
let _n=0;const uid=()=>'id'+(_n++);
const MS_PHASES=['企画','設計','素材制作','実装','テスト','最終調整','完成'];
const MS_PAGES={planning:{label:'企画ページ',vol:'Vol.03'},world:{label:'世界観＆マップラフページ',vol:'Vol.03'},character:{label:'メインキャラ設計ページ',vol:'Vol.04'},system:{label:'ゲームシステム決定ページ',vol:'Vol.05'},structure:{label:'序破急ページ',vol:'Vol.05'},scenario:{label:'シナリオ執筆ページ',vol:'Vol.06'}};
const MS_TEMPLATE={'企画':[['完成予想を一言で表す','planning'],['ジャンル決定','planning'],['参考作品リストアップ','planning']],'設計':[['世界観設定','world'],['マップラフ設計','world'],['絵コンテ執筆',null],['メインキャラ設計','character'],['序設計','structure'],['破設計','structure'],['急設計','structure'],['ゲームシステム決定','system']],'素材制作':[['シナリオ大枠執筆','scenario'],['立ち絵制作',null],['イベントCG制作',null],['背景制作/収集',null],['BGM/SE収集',null],['UI設計',null]],'実装':[['マップ作製',null],['イベント組み込み',null],['戦闘システム実装',null]],'テスト':[['デバッグ',null],['バランス調整',null]],'最終調整':[['規約修正',null],['タイトル画面決定',null],['クレジット作成',null],['体験版切り出し',null],['告知素材準備',null]],'完成':[['告知',null],['公開',null]]};
async function generateMilestones(pid){const now=new Date().toISOString();let o=0;for(let pi=0;pi<MS_PHASES.length;pi++){const ph=MS_PHASES[pi];for(const[title,page]of MS_TEMPLATE[ph]){await DB.put({id:uid(),projectId:pid,phaseIndex:pi,phase:ph,title,page,done:false,order:o++,createdAt:now,updatedAt:now});}}}
async function listMilestones(pid){return (await DB.byIdx(pid)).sort((a,b)=>a.order-b.order);}
async function setDone(id,d){const t=await DB.get(id);t.done=d;await DB.put(t);}
async function setTitle(id,v){const t=await DB.get(id);t.title=v;await DB.put(t);}

const E=[],A=(c,m)=>c?console.log('PASS',m):(E.push(m),console.log('FAIL',m));
await open();
await generateMilestones('P1');
const ts=await listMilestones('P1');
A(ts.length===29,'29 tasks generated (got '+ts.length+')');
const counts={};ts.forEach(t=>counts[t.phase]=(counts[t.phase]||0)+1);
A(JSON.stringify(counts)===JSON.stringify({'企画':3,'設計':8,'素材制作':6,'実装':3,'テスト':2,'最終調整':5,'完成':2}),'phase counts correct');
const pageN=ts.filter(t=>t.page).length, noPageN=ts.filter(t=>!t.page).length;
A(pageN===11&&noPageN===18,'page tasks=11, no-page=18 (got '+pageN+'/'+noPageN+')');
A(ts.every(t=>!t.page||MS_PAGES[t.page]),'every page key valid');
A(ts.find(t=>t.title==='メインキャラ設計').page==='character','メインキャラ設計→character');
A(ts.find(t=>t.title==='絵コンテ執筆').page===null,'絵コンテ執筆 has no page');
A(ts.map(t=>t.order).join()===ts.map((_,i)=>i).join(),'order is 0..28 sequential');
A(MS_PHASES.every((p,i)=>ts.filter(t=>t.phaseIndex===i).every(t=>t.phase===p)),'phaseIndex matches phase');
// toggle + progress
await setDone(ts[0].id,true);await setDone(ts[1].id,true);
const ts2=await listMilestones('P1');
const done=ts2.filter(t=>t.done).length;
A(done===2&&Math.round(done/29*100)===7,'progress 2/29 = 7%');
await setDone(ts[0].id,false);
A((await listMilestones('P1')).filter(t=>t.done).length===1,'untoggle works');
// edit title
await setTitle(ts[5].id,'改名テスト');
A((await DB.get(ts[5].id)).title==='改名テスト','inline edit persists');
// idempotent ensure (no dup)
const before=(await listMilestones('P1')).length;
const ex=await listMilestones('P1'); if(ex.length===0)await generateMilestones('P1');
A((await listMilestones('P1')).length===before,'ensure does not duplicate');
console.log(E.length?('\nFAILURES '+E.length):'\nALL PASS');
