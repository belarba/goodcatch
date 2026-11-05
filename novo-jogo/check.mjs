import assert from 'node:assert/strict';
import {createFight,advance,behaviour,schedule,TUNE} from './simulation.mjs';
const patterns=['constant','impulsive','skittish'];
function play(pattern,seed,policy,hz=120){const s=createFight(pattern,seed);let held=true;while(s.time<60&&['bite','fight'].includes(s.state)){held=policy(s,held);advance(s,held,1/hz)}return s}
const adaptive=(s,h)=>s.tension>70||(['warn','pull','run'].includes(behaviour(s).kind)&&s.tension>32)?false:s.tension<25||['rest','steady'].includes(behaviour(s).kind)?true:h;
const times={};
for(const pattern of patterns){
 assert.deepEqual(schedule(pattern,42),schedule(pattern,42));assert.notDeepEqual(schedule(pattern,42),schedule(pattern,43));
 const phases=schedule(pattern,42);phases.forEach((p,i)=>{if(['pull','run'].includes(p.kind))assert.equal(phases[i-1].kind,'warn')});
 times[pattern]=[];
 for(let seed=42;seed<47;seed++){
  for(const [policy,result]of [[()=>true,'broken'],[()=>false,'escaped'],[s=>Math.floor(s.time*10)%2===0,'escaped']]) assert.equal(play(pattern,seed,policy).state,result);
  const s=play(pattern,seed,adaptive);assert.equal(s.state,'caught');assert(s.time<20);times[pattern].push(+s.time.toFixed(2));
  for(const hz of [30,60]){const other=play(pattern,seed,adaptive,hz);assert.equal(other.state,'caught');assert(other.time<22)}
 }
}
const bad=createFight();bad.state='fight';bad.tension=95;bad.overload=.7;for(let i=0;i<84;i++)advance(bad,false,1/120);assert(bad.tension<95&&bad.overload<.7);
const loose=createFight();loose.state='fight';loose.tension=8;loose.slack=1;for(let i=0;i<100;i++)advance(loose,true,1/120);assert(loose.slack<1&&loose.state==='fight');
const gap=createFight(),short=createFight();advance(gap,true,100);advance(short,true,.05);assert.deepEqual(gap,short);
const fixed=createFight(),low=createFight();for(let i=0;i<120;i++)advance(fixed,true,1/120);for(let i=0;i<30;i++)advance(low,true,1/30);assert(Math.abs(fixed.tension-low.tension)<1e-8);
const end=play('constant',42,()=>true),before=structuredClone(end);advance(end,false,.05);assert.deepEqual(end,before);
assert(TUNE.breakGrace>1&&TUNE.slackGrace>2);
console.log('fight ok: deterministic schedule, warned pulls, 15 adaptive captures, 45 naive failures, 30/60/120Hz, recovery, delta clamp, terminal freeze');console.log('Adaptive policy seconds:',times);
