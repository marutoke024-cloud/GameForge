import { indexedDB } from 'fake-indexeddb';
global.indexedDB = indexedDB;
// ---- mirror real STORES schema ----
const STORES={projects:[['createdAt','createdAt']],characters_draft:[['projectId','projectId'],['createdAt','createdAt']],
 stories_draft:[['projectId','projectId'],['createdAt','createdAt']],milestones:[['projectId','projectId'],['order','order']],
 pages:[['projectId','projectId'],['type','type']],assets:[['projectId','projectId'],['category','category']],
 glossary:[['projectId','projectId'],['term','term']],exp_log:[['projectId','projectId'],['createdAt','createdAt']]};
let _db;
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open('gameforge_db',1);
 r.onupgradeneeded=e=>{const db=e.target.result;for(const[n,ix]of Object.entries(STORES)){if(!db.objectStoreNames.contains(n)){const s=db.createObjectStore(n,{keyPath:'id'});ix.forEach(([a,b])=>s.createIndex(a,b));}}};
 r.onsuccess=e=>{_db=e.target.result;res(_db);};r.onerror=e=>rej(e.target.error);});}
const tx=(s,m='readonly')=>_db.transaction(s,m).objectStore(s);
const P=r=>new Promise((s,j)=>{r.onsuccess=()=>s(r.result);r.onerror=()=>j(r.error);});
const DB={put:(s,v)=>P(tx(s,'readwrite').put(v)),get:(s,k)=>P(tx(s).get(k)),getAll:s=>P(tx(s).getAll()),
 delete:(s,k)=>P(tx(s,'readwrite').delete(k)),getAllByIndex:(s,i,v)=>P(tx(s).index(i).getAll(v))};
let _n=0;const uid=()=>'id'+(Date.now()).toString(36)+(_n++);
const pageId=(p,t)=>p+'::'+t;
const getPage=(p,t)=>DB.get('pages',pageId(p,t));
async function savePage(pid,type,patch){const id=pageId(pid,type);const now=new Date().toISOString();const ex=await DB.get('pages',id);
 const rec=Object.assign({id,projectId:pid,type,data:{},createdAt:now},ex||{},patch,{updatedAt:now});await DB.put('pages',rec);return rec;}
// chara
const listCharas=async p=>{const pg=await getPage(p,'character');return pg&&pg.data&&pg.data.characters?pg.data.characters:[];};
const saveCharas=(p,a)=>savePage(p,'character',{data:{characters:a}});
// milestone gen
const MS_PHASES=['企画','設計','素材制作','実装','テスト','最終調整','完成'];
const MS_TEMPLATE={'企画':[['完成予想を一言で表す','planning'],['ジャンル決定','planning'],['参考作品リストアップ','planning']],'設計':[['世界観設定','world'],['マップラフ設計','world'],['絵コンテ執筆',null],['メインキャラ設計','character'],['序設計','structure'],['破設計','structure'],['急設計','structure'],['ゲームシステム決定','system']],'素材制作':[['シナリオ大枠執筆','scenario'],['立ち絵制作',null],['イベントCG制作',null],['背景制作/収集',null],['BGM/SE収集',null],['UI設計',null]],'実装':[['マップ作製',null],['イベント組み込み',null],['戦闘システム実装',null]],'テスト':[['デバッグ',null],['バランス調整',null]],'最終調整':[['規約修正',null],['タイトル画面決定',null],['クレジット作成',null],['体験版切り出し',null],['告知素材準備',null]],'完成':[['告知',null],['公開',null]]};
async function genMs(pid){let o=0;for(let pi=0;pi<MS_PHASES.length;pi++){for(const[title,page]of MS_TEMPLATE[MS_PHASES[pi]]){await DB.put('milestones',{id:uid(),projectId:pid,phaseIndex:pi,phase:MS_PHASES[pi],title,page,done:false,order:o++,createdAt:new Date().toISOString()});}}}
const listMs=async p=>(await DB.getAllByIndex('milestones','projectId',p)).sort((a,b)=>a.order-b.order);
const EXP_W={'完成予想を一言で表す':1,'ジャンル決定':1,'参考作品リストアップ':1,'規約修正':1,'タイトル画面決定':1,'クレジット作成':1,'告知':1,'世界観設定':2,'マップラフ設計':2,'ゲームシステム決定':2,'背景制作/収集':2,'BGM/SE収集':2,'UI設計':2,'デバッグ':2,'バランス調整':2,'体験版切り出し':2,'告知素材準備':2,'絵コンテ執筆':3,'メインキャラ設計':3,'序設計':3,'破設計':3,'急設計':3,'立ち絵制作':3,'イベントCG制作':3,'マップ作製':3,'戦闘システム実装':3,'シナリオ大枠執筆':5,'イベント組み込み':5};
function compute(tasks){let e=0,pub=false;tasks.forEach(t=>{if(!t.done)return;if(t.title==='公開'){pub=true;return;}e+=EXP_W[t.title]||0;});return pub?{level:30,isMax:true}:{level:Math.min(29,1+Math.floor(e/64*29)),exp:e,isMax:false};}
// auto assets
async function autoAssets(pid){const out={'キャライラスト':[],'背景絵':[],'イベントCG':[]};
 const ch=await getPage(pid,'character');(ch&&ch.data&&ch.data.characters?ch.data.characters:[]).forEach(c=>{(c.standing||[]).forEach(s=>out['キャライラスト'].push({src:s,source:'メインキャラ設計'}));(c.draftArt||[]).forEach(s=>out['キャライラスト'].push({src:s,source:'メインキャラ設計'}));});
 const w=await getPage(pid,'world');(w&&w.data&&w.data.maps?w.data.maps:[]).forEach(s=>out['背景絵'].push({src:s,source:'世界観'}));
 const sc=await getPage(pid,'scenario');(sc&&sc.data&&sc.data.blocks?sc.data.blocks:[]).forEach(b=>{if(b.type==='scene'&&b.bg)out['背景絵'].push({src:b.bg,source:'シナリオ'});if(b.type==='cg'&&b.src)out['イベントCG'].push({src:b.src,source:'シナリオ'});});return out;}

const E=[],A=(c,m)=>c?console.log('PASS',m):(E.push(m),console.log('FAIL',m));
await openDB();
// === project A full flow ===
const A1={id:uid(),name:'プロジェクトA',createdAt:new Date().toISOString(),level:1,exp:0};await DB.put('projects',A1);await genMs(A1.id);
// 1. netabook draft → chara import
const draft={id:uid(),projectId:null,title:'マシュ',charmPoint:'前髪',sexAppeal:'胸元',outline:'盾',images:['rough1'],thumbnail:'thumb1',createdAt:new Date().toISOString()};
await DB.put('characters_draft',draft);
const imported={id:uid(),name:draft.title,charmPoint:draft.charmPoint,sexAppeal:draft.sexAppeal,background:draft.outline,draftArt:draft.images.slice(),thumbnail:draft.thumbnail,standing:['standA'],roles:['ヒロイン'],fromDraftId:draft.id};
await saveCharas(A1.id,[imported]);
let charas=await listCharas(A1.id);
A(charas.length===1&&charas[0].name==='マシュ'&&charas[0].thumbnail==='thumb1','① 草案→キャラインポート（名前/サムネ引継ぎ）');
// 2. chara thumbnail available to scenario icon strip (same listCharas source)
A(charas[0].thumbnail==='thumb1','② キャラサムネ→シナリオアイコンに利用可能');
// 5. scene bg in scenario
await savePage(A1.id,'world',{data:{maps:['map1','map2']}});
await savePage(A1.id,'scenario',{data:{blocks:[{type:'text',content:'本文'},{type:'scene',bg:'bgX',place:'城'},{type:'cg',src:'cgX'}]}});
const scn=await getPage(A1.id,'scenario');
A(scn.data.blocks[1].type==='scene'&&scn.data.blocks[1].bg==='bgX','⑤ 背景画像→シーン転換に紐付け');
// 3. auto aggregation
const aa=await autoAssets(A1.id);
A(aa['キャライラスト'].length===2,'③ キャラ立ち絵+ラフ→アセット自動集約(2)');
A(aa['背景絵'].length===3&&aa['イベントCG'].length===1,'③ マップ+シーン背景→背景絵(3), CG(1)');
// 4. milestone done → EXP
let ms=await listMs(A1.id);
const charaTask=ms.find(t=>t.title==='メインキャラ設計');charaTask.done=true;await DB.put('milestones',charaTask);
const scenTask=ms.find(t=>t.title==='シナリオ大枠執筆');scenTask.done=true;await DB.put('milestones',scenTask);
ms=await listMs(A1.id);let prog=compute(ms);
A(prog.exp===8&&prog.level>1,'④ タスク完了→EXP反映(exp8, Lv>'+1+')');
// 公開 → MAX + version log
const pubTask=ms.find(t=>t.title==='公開');pubTask.done=true;await DB.put('milestones',pubTask);
ms=await listMs(A1.id);A(compute(ms).isMax,'④ 公開完了→Lv.MAX');
A1.versionLog=[{id:uid(),version:'1.0.0',note:'公開',date:'2026/06/06'}];await DB.put('projects',A1);
// glossary
await DB.put('glossary',{id:uid(),projectId:A1.id,term:'カルデア',reading:'かるであ',tag:'組織・勢力',desc:'',createdAt:new Date().toISOString()});
// === project B isolation ===
const B1={id:uid(),name:'プロジェクトB',createdAt:new Date().toISOString(),level:1,exp:0};await DB.put('projects',B1);await genMs(B1.id);
A((await listCharas(B1.id)).length===0,'⑦ プロジェクトBはキャラ独立(空)');
A((await DB.getAllByIndex('glossary','projectId',B1.id)).length===0,'⑦ 用語集も独立');
A((await listMs(B1.id)).every(t=>!t.done),'⑦ BのマイルストーンはAの完了に影響されない');
A((await getPage(B1.id,'scenario'))===undefined,'⑦ Bのシナリオは独立(未作成)');
// === persistence: close & reopen DB ===
_db.close();
await new Promise(r=>setTimeout(r,10));
await openDB();
const reCh=await listCharas(A1.id);
const reMs=await listMs(A1.id);
const reProj=await DB.get('projects',A1.id);
const rePage=await getPage(A1.id,'world');
A(reCh.length===1&&reCh[0].name==='マシュ','⑥ リロード後もキャラ保持');
A(reMs.filter(t=>t.done).length===3,'⑥ リロード後も完了状態保持(3)');
A(reProj.versionLog&&reProj.versionLog.length===1,'⑥ リロード後もVer記録保持');
A(rePage.data.maps.length===2,'⑥ リロード後も世界観マップ保持');
A((await DB.getAll('projects')).length===2,'⑥ 2プロジェクト保持');
console.log(E.length?('\nFAILURES '+E.length):'\nALL PASS ('+(13)+' checks)');
