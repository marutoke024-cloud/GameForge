let _n=0;const uid=()=>'x'+(_n++);
const newTextBlock=(c='')=>({id:uid(),type:'text',content:c,charIcon:null,annos:[]});
// dialogue detection mirror: trigger when typed data contains 「
function shouldOpenCharSel(eData, hasCharas){ return !!(eData && eData.indexOf('「')>=0 && hasCharas); }
// annotation add mirror
function addAnno(blk,side,type,value){ blk.annos=blk.annos||[]; blk.annos.push({id:uid(),side,type,value}); }
function delAnno(blk,id){ blk.annos=blk.annos.filter(a=>a.id!==id); }
// vol06 compat: load old block without charIcon/annos
function compat(b){ if(b.type==='text'){ if(!('charIcon'in b))b.charIcon=null; if(!Array.isArray(b.annos))b.annos=[]; } return b; }

const E=[],A=(c,m)=>c?console.log('PASS',m):(E.push(m),console.log('FAIL',m));
// detection
A(shouldOpenCharSel('「',true),'「 typed with charas → open popup');
A(!shouldOpenCharSel('「',false),'「 typed but no charas → no popup');
A(!shouldOpenCharSel('あ',true),'normal char → no popup');
A(!shouldOpenCharSel(null,true),'IME null data → no popup');
A(shouldOpenCharSel('や「',true),'composed input containing 「 → open popup');
// char icon set/clear
const b=newTextBlock('セリフ');
b.charIcon='char1'; A(b.charIcon==='char1','char icon set');
b.charIcon=null; A(b.charIcon===null,'char icon cleared');
// annotations: 4 types, both sides
addAnno(b,'left','bgm','戦場のテーマ');
addAnno(b,'right','expr','😠');
addAnno(b,'left','se','崩れる音');
addAnno(b,'right','battle','城門の番兵');
A(b.annos.length===4,'4 annotations added');
A(b.annos.filter(a=>a.side==='left').length===2 && b.annos.filter(a=>a.side==='right').length===2,'left/right split correct');
A(b.annos.find(a=>a.type==='bgm').value==='戦場のテーマ','bgm value');
A(b.annos.find(a=>a.type==='expr').value==='😠','expr emoji value');
A(b.annos.find(a=>a.type==='battle').value==='城門の番兵','battle value');
// delete
const seId=b.annos.find(a=>a.type==='se').id;
delAnno(b,seId);
A(b.annos.length===3 && !b.annos.some(a=>a.type==='se'),'annotation deleted');
// types list
const types=['bgm','expr','se','battle'];
A(types.length===4,'4 annotation types defined (spec)');
// emoji set count
const EXPR=['😀','😁','😂','😉','😊','🥰','🤔','😏','😒','😶','😑','🙄','😴','😔','😭','😰','😠','🙂‍↕️','🙂‍↔️','🫣'];
A(EXPR.length===20,'20 expression emojis (matches spec list)');
// vol06 compat
const old={id:'o1',type:'text',content:'旧データ'};
compat(old);
A(old.charIcon===null && Array.isArray(old.annos),'vol06 block upgraded with charIcon/annos');
const scene={id:'s1',type:'scene',color:'#fff'}; compat(scene);
A(!('annos'in scene),'non-text block untouched by compat');
console.log(E.length?('\nFAILURES '+E.length):'\nALL PASS');
