// Режим тренировки: старт, секундомер, плеер и таймер отдыха только пока идёт тренировка
(function(){
S.workout=S.workout||{on:false};
S.wlog=S.wlog||[];
const el=()=>{const s=Math.floor((Date.now()-S.workout.t0)/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60);
  return (h?h+":"+String(m).padStart(2,"0"):m)+":"+String(s%60).padStart(2,"0")};
function nextSlot(){const N=slots(),t=todayKey();
  for(let i=0;i<N;i++)if(S.s&&S.s[i]===t)return{i,already:true};
  for(let i=0;i<N;i++)if(!(S.s&&S.s[i]))return{i,already:false};
  return null}
function nextKey(){const keys=Object.keys(PLAN),n=Object.values(S.s||{}).filter(Boolean).length;return keys[n%keys.length]}
function sync(){
  const on=!!S.workout.on;
  $("timer").hidden=!on||$("pageTrain").hidden;
  if(window.musicShow)musicShow();
  renderWorkout();
}
window.renderWorkout=function(){
  const W=S.workout,box=$("wcard");if(!box)return;
  if(!W.on){
    const k=nextKey(),d=PLAN[k];
    box.innerHTML='<div class="startcard"><div class="label">Следующая</div><div class="t">Тренировка '+esc0(d.name)+'</div>'+
      '<div class="muted">'+esc0(d.sub||"")+(d.sub?" · ":"")+d.ex.length+' упр.</div>'+
      '<button class="bigbtn" type="button" id="wStart">Начать тренировку</button>'+
      '<div class="muted">Тренировка отметится в сетке с датой, появятся плеер и таймер отдыха.</div></div>';
    $("wStart").onclick=start;
  }else{
    const d=PLAN[W.tab]||{name:"?"};
    box.innerHTML='<div class="startcard"><div class="label">Идёт тренировка '+esc0(d.name)+'</div><div class="elapsed" id="wEl">'+el()+'</div>'+
      '<div class="wrow"><button class="bigbtn go" type="button" id="wStop">Завершить</button><button class="bigbtn ghost" type="button" id="wCancel">Отменить</button></div>'+
      '<div class="muted">Плеер виден на всех вкладках, пока идёт тренировка. Кнопка «Отдых» — справа внизу.</div></div>';
    $("wStop").onclick=stop;$("wCancel").onclick=cancel;
  }
};
function start(){
  const sl=nextSlot(),k=nextKey();
  S.workout={on:true,t0:Date.now(),tab:k,slot:sl?sl.i:null,marked:!!(sl&&!sl.already)};
  if(sl&&!sl.already){S.s=S.s||{};S.s[sl.i]=todayKey()}
  save();tab=k;try{localStorage.setItem(KEY+"-tab",k)}catch(e){}
  renderGrid();renderTabs();renderList();sync();
  try{Android.keepScreenOn(true)}catch(e){}
  wToast("Тренировка "+PLAN[k].name+" началась");
}
function stop(){
  const W=S.workout,min=Math.max(1,Math.round((Date.now()-W.t0)/60000));
  S.wlog.push({d:todayKey(),tab:W.tab,min:min});
  S.workout={on:false};save();sync();
  try{Android.keepScreenOn(false)}catch(e){}
  wToast("Тренировка записана: "+min+" мин");
}
let armed=false;
function cancel(){
  const b=$("wCancel");
  if(!armed){armed=true;b.textContent="Точно отменить?";setTimeout(()=>{armed=false;if($("wCancel"))$("wCancel").textContent="Отменить"},4000);return}
  armed=false;const W=S.workout;
  if(W.marked&&W.slot!=null&&S.s)delete S.s[W.slot];
  S.workout={on:false};save();renderGrid();sync();
  try{Android.keepScreenOn(false)}catch(e){}
  wToast("Тренировка отменена");
}
function wToast(m){const t=$("toast");if(!t)return;t.textContent=m;t.hidden=false;clearTimeout(t._h);t._h=setTimeout(()=>t.hidden=true,2600)}
window.wToast=wToast;
setInterval(()=>{if(S.workout.on){const e=$("wEl");if(e)e.textContent=el()}},1000);
// при переключении вкладок
["navTrain","navFood","navMoney","navStats","navBase"].forEach(id=>$(id).addEventListener("click",()=>setTimeout(sync,0)));
window.addEventListener("DOMContentLoaded",()=>setTimeout(sync,0));
sync();
})();
