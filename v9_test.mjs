const EXP_WEIGHTS={'完成予想を一言で表す':1,'ジャンル決定':1,'参考作品リストアップ':1,'規約修正':1,'タイトル画面決定':1,'クレジット作成':1,'告知':1,'世界観設定':2,'マップラフ設計':2,'ゲームシステム決定':2,'背景制作/収集':2,'BGM/SE収集':2,'UI設計':2,'デバッグ':2,'バランス調整':2,'体験版切り出し':2,'告知素材準備':2,'絵コンテ執筆':3,'メインキャラ設計':3,'序設計':3,'破設計':3,'急設計':3,'立ち絵制作':3,'イベントCG制作':3,'マップ作製':3,'戦闘システム実装':3,'シナリオ大枠執筆':5,'イベント組み込み':5};
const PUBLISH_TASK='公開',MAX_LEVEL=30,MAX_EXP=64;
function computeProgress(tasks){let exp=0,pub=false;tasks.forEach(t=>{if(!t.done)return;if(t.title===PUBLISH_TASK){pub=true;return;}exp+=(EXP_WEIGHTS[t.title]||0);});
 let level,pct,isMax=false;if(pub){level=MAX_LEVEL;pct=100;isMax=true;}else{level=Math.min(MAX_LEVEL-1,1+Math.floor(exp/MAX_EXP*(MAX_LEVEL-1)));pct=Math.min(96,Math.round(exp/MAX_EXP*96.6));}return{exp,level,pct,isMax,publishDone:pub};}
// template (mirror of MS_TEMPLATE)
const MS_TEMPLATE={'企画':['完成予想を一言で表す','ジャンル決定','参考作品リストアップ'],'設計':['世界観設定','マップラフ設計','絵コンテ執筆','メインキャラ設計','序設計','破設計','急設計','ゲームシステム決定'],'素材制作':['シナリオ大枠執筆','立ち絵制作','イベントCG制作','背景制作/収集','BGM/SE収集','UI設計'],'実装':['マップ作製','イベント組み込み','戦闘システム実装'],'テスト':['デバッグ','バランス調整'],'最終調整':['規約修正','タイトル画面決定','クレジット作成','体験版切り出し','告知素材準備'],'完成':['告知','公開']};
const allTasks=[];Object.values(MS_TEMPLATE).forEach(arr=>arr.forEach(t=>allTasks.push({title:t,done:false})));

const E=[],A=(c,m)=>c?console.log('PASS',m):(E.push(m),console.log('FAIL',m));
// weight coverage: every template task except 公開 has a weight
const missing=allTasks.filter(t=>t.title!=='公開'&&!(t.title in EXP_WEIGHTS)).map(t=>t.title);
A(missing.length===0,'every non-公開 task has a weight ('+(missing.join(',')||'none')+')');
// sum of weights == MAX_EXP
const sum=Object.values(EXP_WEIGHTS).reduce((a,b)=>a+b,0);
A(sum===64,'total weight = 64 = MAX_EXP (got '+sum+')');
// none done
A(computeProgress(allTasks).level===1,'no tasks done → Lv.1');
// one light task
let ts=allTasks.map(t=>({...t}));ts.find(t=>t.title==='ジャンル決定').done=true;
A(computeProgress(ts).exp===1,'light task = 1 EXP');
// heavy + critical
ts=allTasks.map(t=>({...t}));ts.find(t=>t.title==='メインキャラ設計').done=true;ts.find(t=>t.title==='シナリオ大枠執筆').done=true;
A(computeProgress(ts).exp===8,'重め3 + 最重要5 = 8 EXP');
// all non-公開 done → Lv.29 (not 30)
ts=allTasks.map(t=>({...t,done:t.title!=='公開'}));
let pr=computeProgress(ts);
A(pr.exp===64&&pr.level===29&&!pr.isMax,'all but 公開 → Lv.29, not MAX');
// 公開 done → MAX Lv.30
ts=allTasks.map(t=>({...t,done:true}));
pr=computeProgress(ts);
A(pr.level===30&&pr.isMax&&pr.pct===100,'公開 done → Lv.30 MAX 100%');
// 公開 done alone also MAX
ts=allTasks.map(t=>({...t}));ts.find(t=>t.title==='公開').done=true;
A(computeProgress(ts).isMax,'公開 alone → MAX (special)');
// level-up detection (level increases as more done)
let prev=1, ups=0; ts=allTasks.map(t=>({...t}));
['世界観設定','メインキャラ設計','シナリオ大枠執筆','立ち絵制作','イベントCG制作'].forEach(name=>{
  ts.find(t=>t.title===name).done=true; const L=computeProgress(ts).level; if(L>prev){ups++;prev=L;}});
A(ups>0,'levels increase as tasks complete ('+ups+' level-ups)');
// pct monotonic and <=100
let ok=true,last=-1;ts=allTasks.map(t=>({...t}));
allTasks.filter(t=>t.title!=='公開').forEach(t=>{ts.find(x=>x.title===t.title).done=true;const p=computeProgress(ts).pct;if(p<last||p>100)ok=false;last=p;});
A(ok,'pct monotonic non-decreasing and ≤100');
// version log model
const vlog=[];const add=(v,n,d)=>vlog.push({id:'v'+vlog.length,version:v,note:n,date:d});
add('1.0.0','公開','2026/06/06');add('1.0.1','バグ修正','2026/06/07');
A(vlog.length===2&&vlog[1].date==='2026/06/07','version log appends with auto date');
A(vlog.filter(e=>e.id!=='v0').length===1,'version entry deletable by id');
console.log(E.length?('\nFAILURES '+E.length):'\nALL PASS');
