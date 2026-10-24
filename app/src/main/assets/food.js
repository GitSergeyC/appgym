// Питание: дневник еды, база продуктов, штрихкоды
// Значения на 100 г: [название, ккал, белки, жиры, углеводы]
const FOOD=[
["Куриная грудка",113,23.6,1.9,0.4],["Куриное бедро без кожи",121,19.7,4.1,0],["Куриная грудка варёная",137,29.8,1.8,0.5],
["Филе индейки",112,24,1.5,0],["Говядина вырезка",158,22.2,7.1,0],["Говяжий фарш",254,17.2,20,0],
["Свинина постная",142,19.4,7.1,0],["Свиная шея",343,13.5,31.9,0],["Печень говяжья",127,17.9,3.7,5.3],
["Конина",187,20.2,7,0],["Баранина",209,15.6,16.3,0],["Колбаса варёная",257,12.8,22.2,1.5],["Сосиски",266,11,23.9,1.6],
["Минтай",72,15.9,0.9,0],["Хек",86,16.6,2.2,0],["Горбуша",140,20.5,6.5,0],["Сёмга",202,22.5,12.5,0],
["Тунец консервированный в с/с",96,23,1,0],["Креветки",97,22,1,0],
["Яйцо куриное (1 шт ≈ 55 г)",157,12.7,11.5,0.7],["Яичный белок",44,11.1,0,0],
["Творог 0%",71,16.5,0,1.3],["Творог 5%",121,17.2,5,1.8],["Творог 9%",159,16.7,9,2],
["Молоко 2,5%",52,2.8,2.5,4.7],["Молоко 3,2%",59,2.9,3.2,4.7],["Кефир 1%",40,2.8,1,4],["Кефир 2,5%",53,2.9,2.5,4],
["Йогурт греческий 2%",66,8,2,4],["Сметана 15%",158,2.6,15,3],["Сыр твёрдый",363,24.1,29.5,0.3],
["Моцарелла",280,22,22,2.2],["Брынза",260,22,19,0.4],["Масло сливочное 82%",748,0.5,82.5,0.8],
["Рис белый (сухой)",344,6.7,0.7,78.9],["Гречка (сухая)",313,12.6,3.3,57.1],["Овсяные хлопья",352,12.3,6.2,61.8],
["Булгур (сухой)",342,12.3,1.3,63],["Перловка (сухая)",320,9.3,1.1,66.9],["Пшено (сухое)",342,11.5,3.3,66.5],
["Макароны (сухие)",350,11,1.3,71],["Чечевица (сухая)",295,24,1.5,46.3],["Нут (сухой)",309,20.1,4.3,46.2],
["Фасоль (сухая)",298,21,2,47],["Киноа (сухая)",368,14.1,6.1,57.2],
["Рис варёный",116,2.2,0.5,24.9],["Гречка варёная",110,3.6,1.3,21.3],["Макароны варёные",112,3.5,0.4,23.2],
["Картофель",77,2,0.4,16.3],["Картофель отварной",82,2,0.4,16.7],
["Хлеб белый",262,7.6,1,51],["Хлеб ржаной",208,6.8,1.3,40.7],["Лаваш",277,9,1,56],["Хлебцы",300,9,2.5,58],
["Огурец",15,0.8,0.1,2.8],["Помидор",20,0.6,0.2,4.2],["Капуста белокочанная",27,1.8,0.1,4.7],["Брокколи",34,2.8,0.4,6.6],
["Морковь",35,1.3,0.1,6.9],["Лук репчатый",41,1.4,0,8.2],["Перец болгарский",26,1.3,0,5.3],["Кабачок",24,0.6,0.3,4.6],
["Салат листовой",12,1.2,0.3,1.3],["Свёкла",42,1.5,0.1,8.8],["Шпинат",22,2.9,0.3,2],["Кукуруза консервированная",119,3.9,1.2,22.7],
["Горошек зелёный консервированный",55,3.6,0.1,9.8],["Шампиньоны",27,4.3,1,0.1],
["Банан",96,1.5,0.5,21],["Яблоко",47,0.4,0.4,9.8],["Апельсин",43,0.9,0.2,8.1],["Груша",47,0.4,0.3,10.3],
["Виноград",72,0.6,0.6,15.4],["Киви",47,1,0.6,10.3],["Мандарин",38,0.8,0.2,7.5],["Хурма",67,0.5,0.4,15.3],
["Клубника",41,0.8,0.4,7.5],["Арбуз",27,0.6,0.1,5.8],["Финики сушёные",282,2.5,0.4,75],["Изюм",264,2.9,0.6,66],
["Грецкий орех",654,15.2,65.2,7],["Миндаль",609,18.6,57.7,13],["Арахис",551,26.3,45.2,9.9],["Арахисовая паста",588,25,50,20],
["Семечки подсолнечника",601,20.7,52.9,3.4],["Авокадо",160,2,14.7,1.8],["Масло подсолнечное",899,0,99.9,0],["Масло оливковое",898,0,99.8,0],
["Сахар",398,0,0,99.7],["Мёд",329,0.8,0,81.5],["Шоколад горький",539,6.2,35.4,48.2],["Шоколад молочный",534,7.6,34,54],
["Печенье",417,7.5,11.8,74.9],["Протеин сывороточный (смотри банку)",380,75,5,8],
["Пиво светлое",42,0.3,0,4.6],["Кола",42,0,0,10.6],["Сок апельсиновый",45,0.7,0.2,10],
["Кетчуп",93,1.8,1,22],["Майонез 67%",627,0.3,67,2.6],["Соевый соус",51,6,0,6.7],
["Донер / шаурма ≈",230,11,12,20],["Бургер ≈",254,12.4,10,28],["Пицца ≈",266,11,10,33],["Пельмени ≈",275,11.9,12.4,29],
["Плов ≈",190,7,9,20],["Манты ≈",220,10,11,20],["Баурсаки ≈",410,7,22,47]
].map(a=>({n:a[0],k:a[1],p:a[2],f:a[3],c:a[4]}));

S.food=S.food||{};S.recent=S.recent||[];S.lastG=S.lastG||{};
S.goal=S.goal||{p:180,f:60,c:240};
// своя база: стандартные продукты копируются один раз, дальше всё можно менять
if(!S.base){const mine=S.custom||[];S.base=mine.concat(FOOD.filter(f=>!mine.some(c=>c.n===f.n)));delete S.custom;save()}
const $=id=>document.getElementById(id);
const esc=t=>String(t).replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
const num=v=>{const x=parseFloat(String(v).replace(",","."));return isFinite(x)?x:0};
const r0=x=>Math.round(x),r1=x=>Math.round(x*10)/10;
const goalK=()=>r0(S.goal.p*4+S.goal.f*9+S.goal.c*4);
const findByName=n=>S.base.find(x=>x.n===n);
const macroLine=x=>r0(x.k)+" ккал · Б"+r1(x.p)+" Ж"+r1(x.f)+" У"+r1(x.c);
const priceTag=x=>x.pkg?'<b class="price">'+Math.round(x.pkg).toLocaleString("ru-RU")+" ₸/кг</b>":"";

let day=bizNow();day.setHours(12,0,0,0);
const dkey=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const todayNoon=()=>{const t=bizNow();t.setHours(12,0,0,0);return t};
function dayLabel(){
  const diff=Math.round((day-todayNoon())/864e5);
  if(diff===0)return"Сегодня";if(diff===-1)return"Вчера";if(diff===1)return"Завтра";
  return day.toLocaleDateString("ru-RU",{weekday:"short",day:"numeric",month:"short"});
}
const entries=()=>S.food[dkey(day)]||(S.food[dkey(day)]=[]);
function totals(key){const t={k:0,p:0,f:0,c:0,n:0};(S.food[key]||[]).forEach(e=>{const m=e.g/100;t.k+=e.k*m;t.p+=e.p*m;t.f+=e.f*m;t.c+=e.c*m;t.n++});return t}
const status=k=>{const g=goalK();return k>g*1.1?"hi":k>=g*0.9?"ok":"lo"};

// навигация
const PAGES={train:["pageTrain","navTrain"],food:["pageFood","navFood"],money:["pageMoney","navMoney"],base:["pageBase","navBase"],stats:["pageStats","navStats"]};
function showPage(name){
  if(!PAGES[name])name="train";
  for(const k in PAGES){$(PAGES[k][0]).hidden=k!==name;$(PAGES[k][1]).setAttribute("aria-selected",k===name)}
  $("timer").hidden=name!=="train"||!(S.workout&&S.workout.on);
  {const f=document.querySelector(".mfab");if(f)f.hidden=name!=="money";}
  try{localStorage.setItem(KEY+"-page",name)}catch(e){}
  if(name==="food")renderFood();if(name==="base")renderBase();if(name==="stats"&&window.renderStats)renderStats();if(name==="money"&&window.renderMoney)renderMoney();if(name==="train"&&window.renderWorkout)renderWorkout();
  window.scrollTo(0,0);
}
$("navTrain").onclick=()=>showPage("train");$("navFood").onclick=()=>showPage("food");$("navBase").onclick=()=>showPage("base");$("navStats").onclick=()=>showPage("stats");$("navMoney").onclick=()=>showPage("money");
$("dPrev").onclick=()=>{day.setDate(day.getDate()-1);calM=new Date(day);renderFood()};
$("dNext").onclick=()=>{day.setDate(day.getDate()+1);calM=new Date(day);renderFood()};

// календарь
let calM=new Date(day);
$("dLabel").onclick=()=>{const c=$("cal");c.hidden=!c.hidden;$("dLabel").setAttribute("aria-expanded",!c.hidden);calM=new Date(day);if(!c.hidden)renderCal()};
$("cPrev").onclick=()=>{calM.setDate(1);calM.setMonth(calM.getMonth()-1);renderCal()};
$("cNext").onclick=()=>{calM.setDate(1);calM.setMonth(calM.getMonth()+1);renderCal()};
function renderCal(){
  const y=calM.getFullYear(),m=calM.getMonth();
  $("cTitle").textContent=new Date(y,m,1).toLocaleDateString("ru-RU",{month:"long",year:"numeric"}).replace(" г.","");
  const first=(new Date(y,m,1).getDay()+6)%7,n=new Date(y,m+1,0).getDate();
  const tk=dkey(todayNoon()),sk=dkey(day),now=todayNoon();
  let h=["пн","вт","ср","чт","пт","сб","вс"].map(d=>'<div class="wd">'+d+"</div>").join("");
  for(let i=0;i<first;i++)h+="<div></div>";
  let cnt=0,sk2={k:0,p:0,f:0,c:0},ok=0;
  for(let d=1;d<=n;d++){
    const dt=new Date(y,m,d,12),key=dkey(dt),t=totals(key);
    let cls=[];if(t.n){cls.push(status(t.k));cnt++;sk2.k+=t.k;sk2.p+=t.p;sk2.f+=t.f;sk2.c+=t.c;if(status(t.k)==="ok")ok++}
    if(key===tk)cls.push("today");if(key===sk)cls.push("sel");if(dt>now)cls.push("fut");
    h+='<button type="button" class="'+cls.join(" ")+'" data-d="'+d+'" aria-label="'+d+(t.n?", "+r0(t.k)+" ккал":"")+'">'+d+'<small>'+(t.n?r0(t.k):"·")+"</small></button>";
  }
  $("cGrid").innerHTML=h;
  $("cSum").innerHTML=cnt?[["Дней с записями",cnt],["В норме",ok+" из "+cnt],["Среднее, ккал",r0(sk2.k/cnt)],
    ["Б / Ж / У в среднем",r0(sk2.p/cnt)+" / "+r0(sk2.f/cnt)+" / "+r0(sk2.c/cnt)]].map(([a,b])=>"<div><b>"+b+"</b>"+a+"</div>").join("")
    :'<div style="grid-column:1/-1">В этом месяце записей нет.</div>';
}
$("cGrid").addEventListener("click",ev=>{const b=ev.target.closest("button");if(!b)return;
  day=new Date(calM.getFullYear(),calM.getMonth(),+b.dataset.d,12);
  $("cal").hidden=true;$("dLabel").setAttribute("aria-expanded","false");renderFood()});

function renderFood(){
  $("dLabel").textContent=dayLabel();
  const E=entries(),t=totals(dkey(day)),gk=goalK();
  $("kEat").textContent=r0(t.k);$("kGoal").textContent=gk;
  const left=gk-t.k;
  $("kLeft").textContent=left>=0?"Осталось "+r0(left)+" ккал":"Перебор на "+r0(-left)+" ккал";
  $("kLeft").className=left>=0?"muted":"muted over";
  $("macros").innerHTML=[["Белки",t.p,S.goal.p],["Жиры",t.f,S.goal.f],["Углеводы",t.c,S.goal.c]].map(([n,v,g])=>{
    const pct=g?v/g*100:0;const cls=pct>110?"overfill":pct>=90?"full":"";
    return '<div class="macro"><span>'+n+'</span><div class="bar"><i class="'+cls+'" style="width:'+Math.min(100,pct)+'%"></i></div><span>'+r0(v)+" / "+r0(g)+" г</span></div>";
  }).join("");
  $("eaten").innerHTML=E.length?E.map((e,i)=>{const m=e.g/100;
    return '<div class="row"><div class="nm">'+esc(e.n)+'<small>Б '+r1(e.p*m)+' · Ж '+r1(e.f*m)+' · У '+r1(e.c*m)+'</small></div>'+
      '<input class="inp" type="text" inputmode="decimal" id="eg'+i+'" data-i="'+i+'" value="'+e.g+'" aria-label="Граммы">'+
      '<div class="kc">'+r0(e.k*m)+'</div><button class="del" type="button" data-del="'+i+'" aria-label="Удалить">×</button></div>';
  }).join(""):'<div class="muted">Пока пусто. Найди продукт в поиске или отсканируй штрихкод.</div>';
  $("gP").value=S.goal.p;$("gF").value=S.goal.f;$("gC").value=S.goal.c;
  $("gK").textContent="Получается "+gk+" ккал в день.";
  if(!$("cal").hidden)renderCal();
  renderResults();
}
$("eaten").addEventListener("change",ev=>{const i=ev.target.dataset.i;if(i==null)return;
  const g=num(ev.target.value);if(g>0){entries()[i].g=g;save();renderFood()}});
$("eaten").addEventListener("click",ev=>{const i=ev.target.dataset.del;if(i==null)return;
  entries().splice(+i,1);save();renderFood()});
["gP","gF","gC"].forEach((id,ix)=>$(id).addEventListener("change",ev=>{
  S.goal["pfc"[ix]]=num(ev.target.value);save();renderFood()}));

// поиск
function search(q){const w=q.toLowerCase().split(/\s+/).filter(Boolean);
  return S.base.filter(x=>{const n=x.n.toLowerCase();return w.every(s=>n.includes(s)||(x.b&&x.b.includes(s)))})}
function renderResults(){
  const q=$("q").value.trim();
  const list=q?search(q).slice(0,30):S.recent.map(findByName).filter(Boolean).slice(0,10);
  const head=!q&&list.length?'<div class="msg">Недавние</div>':"";
  $("results").innerHTML=head+list.map(x=>'<button type="button" data-n="'+esc(x.n)+'"><span>'+esc(x.n)+priceTag(x)+
    '</span><span>'+macroLine(x)+'</span>'+(q?"":'<span class="rmx" data-rm="'+esc(x.n)+'" aria-label="Убрать из недавних">×</span>')+'</button>').join("")+
    (!q&&list.length>1?'<button type="button" class="linkbtn" data-rmall="1">Очистить недавние</button>':"")+
    (q&&!list.length?'<div class="msg">Ничего не нашёл. Добавь как свой продукт.</div>':"");
}
$("q").addEventListener("input",renderResults);
$("results").addEventListener("click",ev=>{const r=ev.target.closest("[data-rm],[data-rmall]");if(!r)return;
  ev.stopImmediatePropagation();ev.preventDefault();
  S.recent=r.dataset.rmall?[]:S.recent.filter(n=>n!==r.dataset.rm);save();renderResults()},true);
$("results").addEventListener("click",ev=>{const b=ev.target.closest("button");if(b)pick(findByName(b.dataset.n))});

let cur=null;
function pick(item){
  if(!item)return;cur=item;$("prodForm").hidden=true;
  $("pickName").textContent=item.n;$("pickG").value=S.lastG[item.n]||100;$("pick").hidden=false;prev();
  $("pickG").focus();$("pickG").select();
}
function prev(){if(!cur)return;const m=num($("pickG").value)/100;
  $("pickPrev").textContent="= "+r0(cur.k*m)+" ккал, Б "+r1(cur.p*m)+" Ж "+r1(cur.f*m)+" У "+r1(cur.c*m)}
$("pickG").addEventListener("input",prev);
$("pickCancel").onclick=()=>{$("pick").hidden=true;cur=null};
$("pickAdd").onclick=()=>{
  const g=num($("pickG").value);if(!cur||g<=0)return;
  entries().push({n:cur.n,g:g,k:cur.k,p:cur.p,f:cur.f,c:cur.c});
  S.lastG[cur.n]=g;S.recent=[cur.n].concat(S.recent.filter(n=>n!==cur.n)).slice(0,15);
  save();$("pick").hidden=true;cur=null;$("q").value="";renderFood();
};

// сохранить продукт в базу (общая функция для «Питания» и «Базы»)
function upsert(it,oldName){
  const was=oldName!=null?S.base.findIndex(x=>x.n===oldName):-1;
  S.base=S.base.filter((x,i)=>i===was||(x.n!==it.n&&!(it.b&&x.b===it.b)));
  const idx=oldName!=null?S.base.findIndex(x=>x.n===oldName):-1;
  if(idx>=0)S.base[idx]=it;else S.base.unshift(it);
  if(oldName&&oldName!==it.n){S.recent=S.recent.map(n=>n===oldName?it.n:n);if(S.lastG[oldName]){S.lastG[it.n]=S.lastG[oldName];delete S.lastG[oldName]}}
  save();
}
function readProd(pre){
  let p=num($(pre+"P").value),f=num($(pre+"F").value),c=num($(pre+"C").value),k=num($(pre+"K").value);
  if(!k)k=r0(p*4+f*9+c*4);return{n:$(pre+"Name").value.trim(),k:k,p:p,f:f,c:c};
}

// свой продукт из «Питания»
let formCode=null;
function openForm(d,msg,code){
  formCode=code||null;$("pick").hidden=true;
  $("fName").value=d.n||"";$("fK").value=d.k??"";$("fP").value=d.p??"";$("fF").value=d.f??"";$("fC").value=d.c??"";
  $("formMsg").textContent=msg||"";$("formMsg").hidden=!msg;$("prodForm").hidden=false;$("fName").focus();
}
$("newBtn").onclick=()=>openForm({n:$("q").value.trim()});
$("fCancel").onclick=()=>{$("prodForm").hidden=true};
$("prodForm").addEventListener("submit",ev=>{
  ev.preventDefault();const it=readProd("f");if(!it.n)return;if(formCode)it.b=formCode;
  upsert(it);$("prodForm").hidden=true;pick(it);
});

// вкладка «База»
let editName=null,delArmed=false;
function renderBase(){
  const q=$("bq").value.trim();const list0=q?search(q):S.base;
  // сначала продукты с ценой, потом без цены (внутри групп порядок прежний)
  const list=list0.filter(x=>x.pkg).concat(list0.filter(x=>!x.pkg));
  $("bCount").textContent="Продуктов в базе: "+S.base.length+". Нажми на продукт, чтобы изменить или удалить.";
  $("bList").innerHTML=list.map(x=>'<button type="button" data-n="'+esc(x.n)+'"><span>'+esc(x.n)+priceTag(x)+(x.b?'<span class="bc">▮ '+esc(x.b)+'</span>':"")+
    '</span><span>'+macroLine(x)+'</span></button>').join("")||'<div class="msg">Ничего не нашёл.</div>';
}
function openBase(item){
  editName=item?item.n:null;delArmed=false;
  $("bTitle").textContent=item?"Изменить продукт":"Новый продукт";
  $("bName").value=item?item.n:$("bq").value.trim();
  $("bK").value=item?item.k:"";$("bP").value=item?item.p:"";$("bF").value=item?item.f:"";$("bC").value=item?item.c:"";
  $("bB").value=item&&item.b||"";$("bPw").value=item&&item.pw||"";
  {const pp=item&&item.pp;$("bPu").value=pp?pp.u:"kg";$("bPr").value=pp?pp.a:(item&&item.pkg||"");$("bPg").value=pp&&pp.g||"";priceInfo()}$("bDel").hidden=!item;$("bDel").textContent="Удалить";
  $("bMsg").hidden=true;$("bForm").hidden=false;window.scrollTo(0,0);$("bName").focus();
}
$("bq").addEventListener("input",renderBase);
let warnPw=false;
function calcPkg(){
  const a=num($("bPr").value),u=$("bPu").value;if(!(a>0))return{};
  if(u==="kg")return{pkg:Math.round(a),pp:{u,a}};
  if(u==="pack"){const g=num($("bPg").value);if(!(g>0))return{err:"Впиши вес упаковки в граммах — тогда посчитаю цену за кг."};return{pkg:Math.round(a/g*1000),pp:{u,a,g}}}
  const w=num($("bPw").value);if(!(w>0))return{err:"Впиши, сколько весит 1 штука — тогда посчитаю цену за кг."};return{pkg:Math.round(a/w*1000),pp:{u,a}};
}
function priceInfo(){
  const u=$("bPu").value;$("bPgL").hidden=u!=="pack";warnPw=false;
  const r=calcPkg();$("bPrInfo").textContent=r.pkg?(u==="kg"?"Цена "+r.pkg.toLocaleString("ru-RU")+" ₸ за кг":"= "+r.pkg.toLocaleString("ru-RU")+" ₸ за кг — так и посчитаю съеденное"):"";
}
["bPr","bPg","bPw"].forEach(id=>$(id).addEventListener("input",priceInfo));$("bPu").addEventListener("change",priceInfo);
$("bAdd").onclick=()=>openBase(null);
$("bList").addEventListener("click",ev=>{const b=ev.target.closest("button");if(b)openBase(findByName(b.dataset.n))});
$("bCancel").onclick=()=>{$("bForm").hidden=true;editName=null};
$("bForm").addEventListener("submit",ev=>{
  ev.preventDefault();const it=readProd("b");if(!it.n)return;
  const old=editName!=null?findByName(editName):null;if(old){if(old.pd)it.pd=old.pd}
  const pw=num($("bPw").value),pr=calcPkg();if(pw>0)it.pw=pw;
  if(pr.err){$("bMsg").textContent=pr.err;$("bMsg").hidden=false;return}
  if(pr.pkg){it.pkg=pr.pkg;it.pp=pr.pp;if(!old||old.pkg!==pr.pkg)it.pd=new Date().toISOString().slice(0,10)}
  if(it.k>900){const k=Math.round(it.k/4.184*10)/10;$("bK").value=k;$("bMsg").textContent="Больше 900 ккал на 100 г не бывает (даже у масла ~750). Похоже, это кДж — перевёл: "+k+" ккал. Проверь и нажми «Сохранить» ещё раз.";$("bMsg").hidden=false;return}
  if(pw>=1000&&!warnPw){warnPw=true;$("bMsg").textContent="1 штука весит "+pw+" г? Если это цена — перенеси её в поле «Цена». Нажми «Сохранить» ещё раз, если всё верно.";$("bMsg").hidden=false;return}
  const b=$("bB").value.trim();if(b)it.b=b;
  const clash=S.base.find(x=>x.n===it.n&&x.n!==editName);
  if(clash){$("bMsg").textContent="Продукт с таким названием уже есть. Измени название или отредактируй тот.";$("bMsg").hidden=false;return}
  upsert(it,editName);$("bForm").hidden=true;editName=null;renderBase();
});
$("bDel").onclick=()=>{
  if(!delArmed){delArmed=true;$("bDel").textContent="Точно удалить?";setTimeout(()=>{delArmed=false;$("bDel").textContent="Удалить"},4000);return}
  S.base=S.base.filter(x=>x.n!==editName);S.recent=S.recent.filter(n=>n!==editName);
  save();$("bForm").hidden=true;editName=null;renderBase();
};
$("bRestore").onclick=()=>{
  const miss=FOOD.filter(f=>!S.base.some(x=>x.n===f.n));
  S.base=S.base.concat(miss);save();renderBase();
  $("bRestoreMsg").textContent=miss.length?"Вернул: "+miss.length:"Все стандартные продукты на месте";
};

// штрихкод
const hasScan=!!(window.Android&&Android.scan);
$("scanBtn").hidden=!hasScan;
function scanMsg(t){$("scanMsg").textContent=t||"";$("scanMsg").hidden=!t}
$("scanBtn").onclick=()=>{scanMsg("");try{Android.scan()}catch(e){scanMsg("Сканер не запустился.")}};
window.onScanError=m=>scanMsg("Сканер не запустился. Нужны сервисы Google Play. "+(m||""));
window.onScan=code=>{
  const mine=S.base.find(x=>x.b===code);
  if(mine){scanMsg("");pick(mine);return}
  scanMsg("Ищу продукт "+code+"…");
  try{Android.lookup(code)}catch(e){onLookup(code,null)}
};
window.onLookup=(code,text)=>{
  let pr=null;try{const j=JSON.parse(text);if(j&&j.status===1)pr=j.product}catch(e){}
  const nu=pr&&pr.nutriments||{};
  const k=nu["energy-kcal_100g"]??(nu["energy_100g"]!=null?r0(nu["energy_100g"]/4.184):null);
  scanMsg("");
  if(pr&&k!=null){
    openForm({n:(pr.product_name_ru||pr.product_name||"Продукт "+code).trim(),k:r0(k),
      p:r1(nu.proteins_100g||0),f:r1(nu.fat_100g||0),c:r1(nu.carbohydrates_100g||0)},
      "Нашёл в Open Food Facts. Сверь цифры с упаковкой и сохрани.",code);
  }else{
    openForm({},text===null?"Нет интернета или база не ответила. Впиши КБЖУ на 100 г с упаковки, штрихкод запомнится.":
      "Этого продукта нет в базе. Впиши КБЖУ на 100 г с упаковки, в следующий раз он найдётся по штрихкоду.",code);
  }
};

let startPage="train";try{startPage=localStorage.getItem(KEY+"-page")||"train"}catch(e){}
if(startPage==="false")startPage="train";if(startPage==="true")startPage="food";
window.addEventListener("DOMContentLoaded",()=>showPage(startPage));
