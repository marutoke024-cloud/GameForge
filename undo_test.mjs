// --- mirror scenario snapshot undo ---
let scnDoc={scenes:[{id:'s1',name:'A',blocks:[{id:'b1',type:'text',content:'',charIcon:null,annos:[]}]}],currentId:'s1'};
let scnUndo=[];
const curBlocks=()=>scnDoc.scenes.find(s=>s.id===scnDoc.currentId).blocks;
function scnSnapshot(){scnUndo.push(JSON.stringify(scnDoc));}
function scnUndoApply(){if(!scnUndo.length)return false;scnDoc=JSON.parse(scnUndo.pop());return true;}

const E=[],A=(c,m)=>c?console.log('PASS',m):(E.push(m),console.log('FAIL',m));

// type text (arm: one snapshot before burst)
scnSnapshot(); curBlocks()[0].content='こんにちは';
A(curBlocks()[0].content==='こんにちは','typed text');
// add a line (Enter)
scnSnapshot(); curBlocks().push({id:'b2',type:'text',content:'2行目',charIcon:null,annos:[]});
A(curBlocks().length===2,'line added');
// add annotation
scnSnapshot(); curBlocks()[0].annos.push({id:'a1',side:'left',type:'bgm',value:'曲'});
A(curBlocks()[0].annos.length===1,'annotation added');
// set char
scnSnapshot(); curBlocks()[1].charIcon='hero';
A(curBlocks()[1].charIcon==='hero','char set');
// insert scene-transition block
scnSnapshot(); curBlocks().splice(1,0,{id:'sc1',type:'scene',place:'城',bg:null});
A(curBlocks().some(b=>b.type==='scene'),'scene transition inserted');
// now undo 5 times, each reverts last op
scnUndoApply(); A(!curBlocks().some(b=>b.type==='scene'),'undo scene transition');
scnUndoApply(); A(curBlocks()[1].charIcon===null,'undo char set');
scnUndoApply(); A(curBlocks()[0].annos.length===0,'undo annotation');
scnUndoApply(); A(curBlocks().length===1,'undo line add');
scnUndoApply(); A(curBlocks()[0].content==='','undo text typing (back to empty)');
A(scnUndoApply()===false,'undo stack empty after all reverts');

// --- mirror global UndoMgr (record restore) ---
const store={}; // fake glossary store
const DBput=(k,v)=>{store[k]=JSON.parse(JSON.stringify(v));};
const DBget=(k)=>store[k]?JSON.parse(JSON.stringify(store[k])):undefined;
const DBdel=(k)=>{delete store[k];};
const UndoMgr={stack:[],push(fn){this.stack.push(fn);},async undo(){const fn=this.stack.pop();if(!fn)return 'empty';await fn();return 'ok';}};
// add glossary term -> undo deletes it
DBput('g1',{id:'g1',term:'カルデア'}); UndoMgr.push(async()=>DBdel('g1'));
A(!!DBget('g1'),'glossary added');
await UndoMgr.undo(); A(!DBget('g1'),'undo add → removed');
// delete glossary -> undo restores it
DBput('g2',{id:'g2',term:'マシュ'});
const before=DBget('g2'); DBdel('g2'); UndoMgr.push(async()=>DBput('g2',before));
A(!DBget('g2'),'glossary deleted');
await UndoMgr.undo(); A(DBget('g2')&&DBget('g2').term==='マシュ','undo delete → restored');
// empty
A(await UndoMgr.undo()==='empty','UndoMgr empty handled');
// LIFO order
let log=[];UndoMgr.push(async()=>log.push('A'));UndoMgr.push(async()=>log.push('B'));
await UndoMgr.undo();await UndoMgr.undo();
A(log.join()==='B,A','UndoMgr is LIFO');
console.log(E.length?('\nFAILURES '+E.length):'\nALL PASS');
