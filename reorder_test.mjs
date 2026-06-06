let scnDoc={scenes:[{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'},{id:'d',name:'D'}],currentId:'a'};
let scnUndo=[];const scnSnapshot=()=>scnUndo.push(JSON.stringify(scnDoc));
function reorderScenes(fromId,toId){
  if(!fromId||fromId===toId)return;
  const arr=scnDoc.scenes;const fi=arr.findIndex(s=>s.id===fromId);if(fi<0)return;
  scnSnapshot();const[moved]=arr.splice(fi,1);const ti=arr.findIndex(s=>s.id===toId);
  arr.splice(ti<0?arr.length:ti,0,moved);
}
const ids=()=>scnDoc.scenes.map(s=>s.id).join('');
const E=[],A=(c,m)=>c?console.log('PASS',m):(E.push(m),console.log('FAIL',m));
A(ids()==='abcd','initial order abcd');
// move D before B (drop on B)
reorderScenes('d','b');
A(ids()==='adbc','move D onto B → adbc');
// move A onto C
reorderScenes('a','c');
A(ids()==='dbac','move A onto C → dbac');
// drop on self = noop
const before=ids();reorderScenes('b','b');A(ids()===before,'drop on self = no change');
// snapshot taken per real reorder (2)
A(scnUndo.length===2,'snapshot pushed for undo on each reorder');
// move first to last (drop on last item inserts before it)
scnDoc={scenes:[{id:'x'},{id:'y'},{id:'z'}],currentId:'x'};scnUndo=[];
reorderScenes('x','z');
A(scnDoc.scenes.map(s=>s.id).join('')==='yxz','move x onto z → yxz (before target)');
console.log(E.length?('\nFAILURES '+E.length):'\nALL PASS');
