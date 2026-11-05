import assert from 'node:assert/strict';
const elements=new Map();
function target(){return {listeners:{},style:{},dataset:{},value:'42',options:[{},{},{}],textContent:'',capture:null,
 addEventListener(k,f){(this.listeners[k]??=[]).push(f)},fire(k,e={}){for(const f of this.listeners[k]||[])f({preventDefault(){},...e})},
 setAttribute(k,v){this[k]=v},focus(){},setPointerCapture(p){this.capture=p},hasPointerCapture(p){return this.capture===p},releasePointerCapture(){this.capture=null},getContext(){return new Proxy({},{get:()=>()=>{}})}}}
const doc=target();doc.documentElement={};doc.getElementById=id=>{if(!elements.has(id))elements.set(id,target());return elements.get(id)};
globalThis.document=doc;globalThis.window=target();globalThis.matchMedia=()=>({matches:true});globalThis.Image=class {complete=false};let callback;
globalThis.requestAnimationFrame=f=>{callback=f};
doc.getElementById('pattern').value='constant';
await import('./fight.mjs');
let now=0;const frame=(n=1)=>{for(let i=0;i<n;i++){now+=16.667;callback(now)}};
const action=doc.getElementById('action'),cue=doc.getElementById('cue');
for(const event of ['pointerup','pointercancel','lostpointercapture']){
 doc.getElementById('reset').onclick();action.fire('pointerdown',{isPrimary:true,button:0,pointerId:1});frame(70);assert.equal(action.dataset.held,'true');action.fire(event,{pointerId:1});frame();assert.equal(action.dataset.held,'false');
}
action.fire('pointerdown',{isPrimary:false,button:0,pointerId:2});frame();assert.equal(action.dataset.held,'false');
action.fire('keydown',{code:'Space',repeat:false});frame();assert.equal(action.dataset.held,'true');window.fire('keyup',{code:'Space'});frame();assert.equal(action.dataset.held,'false');
for(const [where,event]of [[window,'blur'],[action,'blur'],[doc,'visibilitychange']]){doc.getElementById('reset').onclick();action.fire('pointerdown',{isPrimary:true,button:0,pointerId:1});frame();doc.hidden=true;where.fire(event);frame();assert.equal(action.dataset.held,'false');assert.match(cue.textContent,/Paused|Pausa/);doc.hidden=false;action.fire('pointerdown',{isPrimary:true,button:0,pointerId:1});frame(2);assert.equal(action.dataset.held,'true');action.fire('pointerup',{pointerId:1})}
console.log('input ok: pointer release/cancel/capture loss, secondary pointer, keyboard, window/button blur, hidden tab, resume');
