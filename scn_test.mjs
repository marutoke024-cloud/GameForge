let _n=0;const uid=()=>'b'+(_n++);
const newTextBlock=(c='')=>({id:uid(),type:'text',content:c,charIcon:null,annos:[]});
const newSceneBlock=()=>({id:uid(),type:'scene',place:'',time:'',color:'#49a96f',bg:null});
const newScene=(name)=>({id:uid(),name:name||'新しいシーン',blocks:[newTextBlock()]});
function normalizeBlocks(blocks){const out=[];(blocks||[]).forEach(b=>{
 if(b.type==='text'){if(!('charIcon'in b))b.charIcon=null;if(!Array.isArray(b.annos))b.annos=[];
  const parts=String(b.content||'').split('\n');
  if(parts.length<=1)out.push(b);else parts.forEach((line,i)=>out.push(i===0?Object.assign(b,{content:parts[0]}):newTextBlock(line)));}
 else out.push(b);});if(out.length===0)out.push(newTextBlock());return out;}

// doc + ops
let scnDoc={scenes:[],currentId:null};
const curScene=()=>scnDoc.scenes.find(s=>s.id===scnDoc.currentId)||scnDoc.scenes[0];
const curBlocks=()=>curScene().blocks;
function loadFrom(data){
 if(data&&Array.isArray(data.scenes)&&data.scenes.length)scnDoc={scenes:data.scenes,currentId:data.currentId||data.scenes[0].id};
 else if(data&&Array.isArray(data.blocks)&&data.blocks.length)scnDoc={scenes:[{id:uid(),name:'シーン1',blocks:data.blocks}],currentId:null};
 else scnDoc={scenes:[{id:uid(),name:'シーン1',blocks:[newTextBlock()]}],currentId:null};
 scnDoc.scenes.forEach(s=>s.blocks=normalizeBlocks(s.blocks));
 if(!scnDoc.currentId||!scnDoc.scenes.find(s=>s.id===scnDoc.currentId))scnDoc.currentId=scnDoc.scenes[0].id;}
function splitLine(b,pos){const blocks=curBlocks();const idx=blocks.findIndex(x=>x.id===b.id);
 const before=b.content.slice(0,pos),after=b.content.slice(pos);b.content=before;const nb=newTextBlock(after);blocks.splice(idx+1,0,nb);return nb;}
function mergeBackspace(b){const blocks=curBlocks();const idx=blocks.findIndex(x=>x.id===b.id);const prev=blocks[idx-1];
 if(prev&&prev.type==='text'){const caret=prev.content.length;prev.content+=b.content;blocks.splice(idx,1);return{prev,caret};}return null;}
function addScene(){const s=newScene('シーン'+(scnDoc.scenes.length+1));scnDoc.scenes.push(s);scnDoc.currentId=s.id;return s;}
function deleteScene(id){if(scnDoc.scenes.length<=1)return false;scnDoc.scenes=scnDoc.scenes.filter(s=>s.id!==id);if(scnDoc.currentId===id)scnDoc.currentId=scnDoc.scenes[0].id;return true;}

const E=[],A=(c,m)=>c?console.log('PASS',m):(E.push(m),console.log('FAIL',m));
// migration from OLD single blocks with multiline text
loadFrom({blocks:[{type:'text',content:'1行目\n2行目\n3行目',charIcon:'c1',annos:[{id:'a',side:'left',type:'bgm',value:'x'}]},{type:'scene',bg:'bg'}]});
A(scnDoc.scenes.length===1,'migration: old blocks → 1 scene');
let bl=curBlocks();
A(bl.filter(b=>b.type==='text').length===3,'multiline text split into 3 lines');
A(bl[0].content==='1行目'&&bl[0].charIcon==='c1'&&bl[0].annos.length===1,'first line keeps charIcon/annos');
A(bl[1].content==='2行目'&&bl[1].charIcon===null,'2nd line is independent (no carryover)');
A(bl.some(b=>b.type==='scene'),'scene block preserved through migration');
// Enter split
loadFrom({scenes:[{id:'s1',name:'A',blocks:[newTextBlock('helloworld')]}],currentId:'s1'});
const first=curBlocks()[0];
const nb=splitLine(first,5);
A(curBlocks().length===2&&first.content==='hello'&&nb.content==='world','Enter splits line at caret');
A(nb.annos.length===0&&nb.charIcon===null,'new line is independent block');
// Backspace merge
const r=mergeBackspace(nb);
A(curBlocks().length===1&&curBlocks()[0].content==='helloworld'&&r.caret===5,'Backspace at line start merges with previous (caret preserved)');
// each line independent annotations
loadFrom({scenes:[{id:'s1',name:'A',blocks:[newTextBlock('L1'),newTextBlock('L2')]}],currentId:'s1'});
curBlocks()[0].annos.push({id:'x',side:'right',type:'se',value:'音'});
curBlocks()[0].charIcon='hero';
A(curBlocks()[1].annos.length===0&&curBlocks()[1].charIcon===null,'annotations/char attach to individual line only');
// scenes: add/switch/delete (別名保存)
loadFrom({scenes:[{id:'s1',name:'導入',blocks:[newTextBlock('a')]}],currentId:'s1'});
const s2=addScene();
A(scnDoc.scenes.length===2&&scnDoc.currentId===s2.id,'addScene switches to new scene');
s2.name='決戦';
A(scnDoc.scenes[1].name==='決戦','scene renamed (別名保存)');
scnDoc.currentId='s1';
A(curBlocks()[0].content==='a','switch scene loads its own blocks');
A(deleteScene(s2.id)===true&&scnDoc.scenes.length===1,'deleteScene removes scene');
A(deleteScene('s1')===false,'cannot delete last scene');
// save shape
const saved={scenes:scnDoc.scenes,currentId:scnDoc.currentId};
A(Array.isArray(saved.scenes)&&saved.currentId,'persist shape {scenes,currentId}');
// reload roundtrip
loadFrom(saved);
A(scnDoc.scenes.length===1&&curBlocks().length>=1,'reload from saved shape works');
console.log(E.length?('\nFAILURES '+E.length):'\nALL PASS');
