// DOM-free, fixed-step simulation. Seed changes the schedule, never the input rules.
export const TUNE = Object.freeze({step:1/120, engage:.3, reel:22, release:38,
  breakAt:86, slackAt:12, breakGrace:1.1, slackGrace:2.2, recovery:1.5});
export function schedule(pattern, seed=42) {
  let n=seed>>>0;
  const random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
  const phases=[];
  for(let i=0;i<40;i++) {
    const jitter=()=>random()*.35;
    if(pattern==='constant') phases.push({kind:'steady',duration:2.5+jitter(),force:.3},{kind:'warn',duration:.85,force:.3},{kind:'pull',duration:1.1+jitter(),force:.85});
    else if(pattern==='impulsive') phases.push({kind:'rest',duration:1.6+jitter(),force:.12},{kind:'warn',duration:.85,force:.12},{kind:'pull',duration:.85+jitter(),force:1.35});
    else phases.push({kind:'rest',duration:2.2+jitter(),force:.08},{kind:'warn',duration:1,force:.08},{kind:'run',duration:2+jitter(),force:1.05});
  }
  return phases;
}
export function createFight(pattern='constant',seed=42) {
  if(!['constant','impulsive','skittish'].includes(pattern)) throw Error('Unknown fish pattern');
  return {pattern,seed,phases:schedule(pattern,seed),phase:0,phaseTime:0,state:'bite',time:0,
    tension:35,progress:8,overload:0,slack:0,engaged:0,held:false,accumulator:0};
}
export function behaviour(s){return s.phases[s.phase % s.phases.length]}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function step(s,held,dt){
  s.time+=dt;s.held=held;
  if(s.state==='bite'){if(s.time>=.7)s.state='fight';return}
  s.phaseTime+=dt;
  if(s.phaseTime>=behaviour(s).duration){s.phaseTime-=behaviour(s).duration;s.phase++}
  const f=behaviour(s).force;
  // Reeling needs sustained pressure; release is instant. Tapping cannot reset risk.
  s.engaged=held?Math.min(TUNE.engage,s.engaged+dt):0;
  const grip=held?s.engaged/TUNE.engage:0;
  s.tension=clamp(s.tension+((held?12+f*26:-TUNE.release+f*9))*dt,0,100);
  const gain=TUNE.reel*(1-f*.48)*grip;
  s.progress=clamp(s.progress+(held?gain:-(2+f*6))*dt,0,100);
  s.overload=clamp(s.overload+(s.tension>=TUNE.breakAt?dt:-dt*TUNE.recovery),0,TUNE.breakGrace);
  s.slack=clamp(s.slack+(s.tension<=TUNE.slackAt?dt:-dt*TUNE.recovery),0,TUNE.slackGrace);
  if(s.overload>=TUNE.breakGrace-1e-9)s.state='broken';
  else if(s.slack>=TUNE.slackGrace-1e-9)s.state='escaped';
  else if(s.progress>=100)s.state='caught';
}
export function advance(s,held,delta){
  if(!['bite','fight'].includes(s.state))return s;
  // Discard long wall-clock gaps, subdivide accepted time: reproducible at 30/60/120Hz.
  s.accumulator+=clamp(Number.isFinite(delta)?delta:0,0,.05);
  while(s.accumulator+1e-10>=TUNE.step && ['bite','fight'].includes(s.state)){
    s.accumulator-=TUNE.step;step(s,held,TUNE.step);
  }
  return s;
}
