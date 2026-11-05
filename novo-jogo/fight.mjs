import {createFight, advance, behaviour, TUNE} from './simulation.mjs';
const $=id=>document.getElementById(id);
const STR={pt:{subtitle:'LABORATÓRIO DA PESCARIA · 1 PEIXE',pattern:'Jeito',patterns:['Constante','Impulsivo','Arisco'],reset:'Recomeçar',hint:'Segure para recolher. Solte para ceder aos puxões. Nem força demais, nem linha frouxa!',start:'Lançar a linha',hold:'Segure para recolher',holding:'Recolhendo… solte para aliviar',resume:'Continuar',again:'Tentar de novo',tension:'Tensão da linha',progress:'Perto do cais',bite:'Mordeu! Prepare a mão…',steady:'Ele resiste. Recolha com cuidado.',rest:'Está descansando. Hora de recolher!',warn:'Virou o corpo… vem um puxão!',pull:'Puxão! Ceda um pouco de linha.',run:'Está fugindo! Espere ele cansar.',caught:'Boa pescaria! Peixe no cais.',broken:'A linha rompeu. No próximo puxão, alivie antes.',escaped:'Escapou do anzol. Não deixe a linha frouxa tanto tempo.',paused:'Pausa. A linha está segura.',danger:'Vai romper! Solte para aliviar.',slack:'Linha frouxa! Segure para manter o anzol.',normal:'Segurar: recolhe · Soltar: alivia',footer:'Mouse, toque ou Espaço · mesma seed, mesma luta.<br>Sem pontuação ou gravação diária. <a href="../">Jogo original</a>'},en:{subtitle:'FISHING LAB · 1 FISH',pattern:'Style',patterns:['Steady','Impulsive','Skittish'],reset:'Restart',hint:'Hold to reel. Release to yield to a pull. Avoid both excess force and a slack line!',start:'Cast the line',hold:'Hold to reel',holding:'Reeling… release to ease off',resume:'Continue',again:'Try again',tension:'Line tension',progress:'Near the pier',bite:'A bite! Get ready…',steady:'It resists. Reel carefully.',rest:'Resting. Time to reel!',warn:'Turning around… a pull is coming!',pull:'A tug! Give it some line.',run:'Running! Wait for it to tire.',caught:'Good catch! Fish on the pier.',broken:'The line broke. Ease off earlier next time.',escaped:'Off the hook. Do not leave the line slack so long.',paused:'Paused. The line is safe.',danger:'About to snap! Release.',slack:'Slack line! Hold to keep the hook in.',normal:'Hold: reel · Release: ease off',footer:'Mouse, touch or Space · same seed, same fight.<br>No score or daily save. <a href="../">Original game</a>'}};
let lang=navigator.language.startsWith('pt')?'pt':'en';
const t=k=>STR[lang][k], terminal=()=>['caught','broken','escaped'].includes(sim.state);
let sim=createFight(), mode='ready', pointer=null, keyboard=false, last=null, endTime=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const images={};for(const [name,path] of Object.entries({cat:'ui/catBack',fish:'fish/garoupa'})){const im=new Image();im.src='../art/'+path+'.png';images[name]=im}
const ctx=$('sea').getContext('2d');ctx.imageSmoothingEnabled=false;
function rect(c,x,y,w,h){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
function sprite(id,x,y,flip=false){const im=images[id];if(!im.complete||!im.naturalWidth)return;ctx.save();ctx.translate(Math.round(x),Math.round(y));if(flip){ctx.translate(im.naturalWidth,0);ctx.scale(-1,1)}ctx.drawImage(im,0,0);ctx.restore()}
function draw(now){
  rect('#76C7CD',0,0,208,28);rect('#248F9D',0,28,208,84);rect('#167387',0,65,208,47);
  for(let i=0;i<18;i++)rect('#60B7BB',(i*37+(reduced?0:Math.floor(sim.time*5)))%208,33+i*13%73,6,1);
  for(let y=55;y<112;y+=6){rect('#8B5A2B',0,y,54,6);rect('#5E3A1A',0,y+5,54,1)}
  const b=behaviour(sim), force=b.force, active=mode==='active';
  let fx=172-sim.progress*1.14, fy=69+(!reduced&&active?Math.sin(sim.time*(b.kind==='run'?12:4))*Math.min(6,force*5):0);
  if(terminal()){const a=reduced?1:Math.min(1,(now-endTime)/650);if(sim.state==='caught'){fx=65-35*a;fy=69-37*a-Math.sin(a*Math.PI)*22}else fx+=a*100}
  sprite('cat',15,32+(sim.held&&!reduced?Math.round(Math.sin(sim.time*12)):0));
  ctx.strokeStyle='#2E1A0C';ctx.beginPath();ctx.moveTo(35,45);ctx.quadraticCurveTo(49,16,61,22+sim.tension*.08);ctx.stroke();
  if(sim.state!=='broken'&&sim.state!=='escaped'){
    ctx.strokeStyle=sim.overload>0?'#E8826A':sim.tension<12?'#BFE7E6':'#FFF1D0';ctx.lineWidth=sim.overload>0?2:1;ctx.beginPath();ctx.moveTo(61,22+sim.tension*.08);ctx.quadraticCurveTo(80,70-sim.tension*.38,fx+5,fy+7);ctx.stroke();ctx.lineWidth=1;
  }
  sprite('fish',fx,fy,b.kind==='warn'||b.kind==='rest');
  if(active&&(b.kind==='warn'||b.kind==='pull'||b.kind==='run')){rect('#FFF1D0',fx-5,fy-4,2,6);rect('#FFF1D0',fx+20,fy-1,3,2)}
  if(b.kind==='warn'&&active){ctx.fillStyle='#FFF1D0';ctx.font='14px system-ui';ctx.fillText('!',Math.round(fx+8),Math.round(fy-8))}
}
function text(id,value){if($(id).textContent!==value)$(id).textContent=value}
function render(){
  document.documentElement.lang=lang;text('lang',lang==='pt'?'EN':'PT');text('subtitle',t('subtitle'));text('patternLabel',t('pattern'));text('reset',t('reset'));text('hint',t('hint'));text('tensionLabel',t('tension'));text('progressLabel',t('progress'));
  [...$('pattern').options].forEach((o,i)=>o.textContent=t('patterns')[i]);$('footer').innerHTML=t('footer');
  text('action',mode==='ready'?t('start'):mode==='paused'?t('resume'):terminal()?t('again'):sim.held?t('holding'):t('hold'));
  $('action').dataset.held=String(sim.held);$('action').setAttribute('aria-pressed',String(sim.held));
  const cue=mode==='paused'?'paused':mode==='ready'?'normal':sim.state==='fight'?behaviour(sim).kind:sim.state;
  text('cue',t(cue));text('status',terminal()?t('again'):sim.overload>0?t('danger')+' '+Math.ceil((TUNE.breakGrace-sim.overload)*10)/10+'s':sim.slack>0?t('slack'):t('normal'));
  for(const [id,v]of [['tension',sim.tension],['progress',sim.progress]]){const n=Math.round(v);$(id).style.width=v+'%';text(id+'Text',n+'%');$(id+'Meter').setAttribute('aria-valuenow',n);$(id+'Meter').setAttribute('aria-label',t(id))}
  $('tension').style.background=sim.overload>0?'#E8826A':'#F2B33D';
}
function clearInput(){const old=pointer;pointer=null;keyboard=false;sim.held=false;if(old!==null&&$('action').hasPointerCapture(old))$('action').releasePointerCapture(old)}
function restart(){clearInput();sim=createFight($('pattern').value,Number($('seed').value)||0);mode='ready';last=null;render()}
function begin(){if(mode==='paused'){mode='active';last=null;return}if(mode==='ready'||terminal()){if(terminal())restart();mode='active';last=null}}
function pause(){clearInput();if(mode==='active'&&!terminal())mode='paused';last=null;render()}
$('action').addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;e.preventDefault();$('action').focus({preventScroll:true});begin();pointer=e.pointerId;$('action').setPointerCapture(pointer)});
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('action').addEventListener(type,e=>{if(e.pointerId===pointer){pointer=null;sim.held=keyboard}});
$('action').addEventListener('contextmenu',e=>e.preventDefault());
$('action').addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!e.repeat){begin();keyboard=true}}});
window.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter'){keyboard=false;sim.held=pointer!==null}});
$('action').addEventListener('blur',pause);window.addEventListener('blur',pause);
// Screen-reader activation starts/resumes, but does not latch the reel on.
$('action').addEventListener('click',e=>{if(e.detail===0&&!keyboard){begin();render()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
$('reset').onclick=restart;$('pattern').onchange=restart;$('seed').onchange=()=>{ $('seed').value=String(Math.max(0,Math.min(4294967295,Number($('seed').value)||0)));restart()};
$('lang').onclick=()=>{lang=lang==='pt'?'en':'pt';render()};
function tick(now){const dt=last===null?0:Math.min(.05,(now-last)/1000);last=now;
  if(mode==='active'&&!terminal()){advance(sim,pointer!==null||keyboard,dt);if(terminal()){clearInput();endTime=now}}
  render();draw(now);requestAnimationFrame(tick)
}
render();requestAnimationFrame(tick);
