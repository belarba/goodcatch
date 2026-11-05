// Prototype checks: run with node tools/timing-check.mjs. No dependencies.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../novo-jogo/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const elements=new Map();
const element=()=>({style:{setProperty(){}},listeners:{},addEventListener(n,f){this.listeners[n]=f},focus(){},getContext(){return new Proxy({},{get:()=>()=>{}})},toDataURL(){return ''}});
const document={documentElement:element(),hidden:false,createElement:element,getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},listeners:{},addEventListener(n,f){this.listeners[n]=f}};
let time=1000;
const context=vm.createContext({document,navigator:{language:'pt'},localStorage:{getItem(){return null},setItem(){}},Image:class{complete=false},matchMedia:()=>({matches:false}),performance:{now:()=>time},requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
vm.runInContext(script,context);
const run=code=>vm.runInContext(code,context);
for(let d=1;d<=30;d++){
 const date=`2026-11-${String(d).padStart(2,'0')}`;
 assert.equal(run(`JSON.stringify(daily('${date}'))`),run(`JSON.stringify(daily('${date}'))`));
 assert.equal(run(`daily('${date}').every((f,i,a)=>f.center-f.width/2>=0&&f.center+f.width/2<=1&&f.green<f.width&&(!i||(f.width<a[i-1].width&&f.speed>a[i-1].speed)))`),true);
}
assert.notEqual(run("JSON.stringify(daily('2026-11-05'))"),run("JSON.stringify(daily('2026-11-06'))"));
for(let i=0;i<5;i++){
 assert.equal(run('phase'),'ready');run('act()');assert.equal(run('phase'),'running');
 if(i===0){document.hidden=true;document.listeners.visibilitychange();assert.equal(run('phase'),'paused');document.hidden=false;run('act()');assert.equal(run('phase'),'running')}
 const q=i%3;
 run(`pos=${q===0?'0':q===1?'encounters[index].center+encounters[index].green/2+.01':'encounters[index].center'};act()`);
 assert.equal(run('results[index].q'),q);
 run('act()');assert.equal(run('index'),i); // a double tap cannot spend the next encounter
 time+=700;run('act()');
}
assert.equal(run('phase'),'finished');assert.equal(run('results.length'),5);assert.equal(elements.get('results').hidden,false);
elements.get('replay').onclick();assert.equal(run('index'),0);assert.equal(run('results.length'),0);assert.equal(run('phase'),'ready');
for(let i=0;i<5;i++)for(let ms=0;ms<20000;ms+=17)assert.equal(run(`position(encounters[${i}],${ms}/1000)>=0&&position(encounters[${i}],${ms}/1000)<=1`),true);
console.log('timing ok: 30 daily setups, increasing difficulty, all qualities, 5 encounters, double-tap guard, pause and replay');
