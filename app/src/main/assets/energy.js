// Шаги (Health Connect) и расход калорий за день
(function(){
S.prof=Object.assign({w:74,h:175,a:"",s:"m",t:250,b:3000},S.prof||{});
S.steps=S.steps||{};
const hasHC=!!(window.Android&&Android.steps);
let state=null; // null — ещё не спрашивали, -1 нет разрешения, -2 нет Health Connect, -3 ошибка, >=0 ок

function workoutOn(key){
  const all=[S.s||{}].concat((S.hist||[]).map(h=>h.s||{}));
  return all.some(o=>Object.values(o).some(v=>v===key));
}
function calc(key){
  const P=S.prof,w=num(P.w),h=num(P.h),a=num(P.a);
  if(!w||!h||!a)return null;
  const bmr=10*w+6.25*h-5*a+(P.s==="f"?-161:5);
  const base=bmr*1.2;
  const st=S.steps[key];
  const extra=st!=null?Math.max(0,st-num(P.b)):0;
  const stepK=extra*(0.415*h/100/1000)*w*0.5;
  const wk=workoutOn(key)?num(P.t):0;
  return {bmr,base,st,stepK,wk,total:base+stepK+wk};
}
function request(){
  if(!hasHC)return;
  try{Android.steps(dkey(day))}catch(e){}
}
window.onSteps=(d,n)=>{
  state=n;
  if(n>=0){S.steps[d]=n;save()}
  if(d===dkey(day))renderEnergy();
};
window.onStepsPerm=()=>request();
window.onAppResume=()=>{if(!$("pageFood").hidden)request()};

function renderEnergy(){
  const key=dkey(day),c=calc(key),st=S.steps[key];
  const sN=$("stepsN");
  if(document.activeElement!==sN)sN.value=st!=null?st:"";
  const msg=$("stepsMsg"),b=$("stepsBtn");
  msg.hidden=true;b.hidden=true;
  if(hasHC&&state===-1){b.hidden=false;b.textContent="Подключить шаги";
    msg.hidden=false;msg.textContent="Шаги берутся из Health Connect. Туда их пишет Google Fit или Samsung Health."}
  else if(hasHC&&state===-2){b.hidden=false;b.textContent="Установить Health Connect";
    msg.hidden=false;msg.textContent="На телефоне нет Health Connect. Пока можно вписать шаги вручную."}
  else if(hasHC&&state===-3){msg.hidden=false;msg.textContent="Не удалось прочитать шаги. Можно вписать вручную."}
  else if(!hasHC){msg.hidden=false;msg.textContent="Впиши шаги вручную."}
  if(!c){$("burnN").textContent="—";
    $("burnBreak").textContent="Укажи возраст, вес и рост в «Профиле для расчёта расхода» ниже.";$("balance").innerHTML="";return}
  $("burnN").textContent=r0(c.total).toLocaleString("ru-RU");
  $("burnBreak").innerHTML="Базовый обмен "+r0(c.bmr)+" × 1,2 = "+r0(c.base)+
    " · шаги +"+r0(c.stepK)+(c.st==null?" (нет данных)":"")+
    (c.wk?" · тренировка +"+r0(c.wk):"");
  const eat=totals(key).k,bal=eat-c.total;
  $("balance").innerHTML='Баланс: съедено '+r0(eat)+" − расход "+r0(c.total)+' = <b class="'+(bal<0?"minus":"plus")+'">'+
    (bal>0?"+":bal<0?"−":"")+Math.abs(r0(bal)).toLocaleString("ru-RU")+"</b> ккал"+
    '<div class="muted">'+(bal<0?"Дефицит: вес будет уходить.":"Профицит: вес будет расти.")+" Чтобы набирать без лишнего жира, держи примерно +200…+300.</div>";
}
window.renderEnergy=renderEnergy;

// шаги вручную: поле в карточке
(function(){const old=$("stepsN");const inp=document.createElement("input");
  inp.id="stepsN";inp.className="inp steps";inp.type="text";inp.inputMode="numeric";inp.placeholder="0";
  inp.setAttribute("aria-label","Шаги за день");inp.style.cssText="max-width:150px;padding:2px 6px";
  old.replaceWith(inp);
  inp.addEventListener("change",()=>{const v=String(inp.value).replace(/\D/g,"");
    if(v==="")delete S.steps[dkey(day)];else S.steps[dkey(day)]=+v;save();renderEnergy()});
})();
$("stepsBtn").onclick=()=>{try{Android.stepsConnect()}catch(e){}};

// профиль
const PF={prW:"w",prH:"h",prA:"a",prS:"s",prT:"t",prB:"b"};
for(const id in PF){const el=$(id);el.value=S.prof[PF[id]];
  el.addEventListener("change",()=>{S.prof[PF[id]]=el.value.trim();save();renderEnergy()})}

// встраиваемся в экран питания
const orig=renderFood;
renderFood=function(){orig.apply(this,arguments);renderEnergy();request()};
if(!$("pageFood").hidden)renderFood();
})();
