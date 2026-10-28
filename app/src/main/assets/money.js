// Деньги: операции, чеки из нескольких позиций, периоды от зарплаты, «Куда ушло», отчёты,
// редактор категорий и счетов, связь с питанием (цены продуктов, еда вне дома).
(function(){
const {svg}=MCAT;
const clone=o=>JSON.parse(JSON.stringify(o));
const M=S.money=S.money||{};
if(!M.cats)M.cats={exp:clone(MCAT.EXP),inc:clone(MCAT.INC)};
if(!M.acc)M.acc=[{id:"cash",n:"Наличные",i:"cash",c:"#6cd39a",start:0},{id:"kaspi",n:"Kaspi Gold",i:"card",c:"#f08a7e",start:0}];
M.tx=M.tx||[];M.budget=M.budget||0;M.sal=M.sal||{from:15,to:18};M.nid=M.nid||1;M.loans=M.loans||[];
// чаевые — первая категория дохода
if(!M.cats.inc.some(c=>c.id==="transfers"))M.cats.inc.splice(1,0,{id:"transfers",n:"Переводы на карту",i:"swap",c:"#78d0c0",s:[{n:"Переводы",it:[{n:"От людей"},{n:"С другого банка"},{n:"Пособие"}]}]});
if(!M.cats.inc.some(c=>c.id==="tips"))M.cats.inc.unshift({id:"tips",n:"Чаевые",i:"coins",c:"#f0c46a",s:[{n:"Чаевые",it:[{n:"Наличными"},{n:"На карту"}]}]});
save();

// продукты для связи с деньгами, которых не было в базе питания
const EXTRA=[["Хот-дог ≈",260,10,15,22],["Самса ≈",300,9,17,29],["Курица KFC ≈",260,20,15,10],["Картошка фри",312,3.4,15,41],
 ["Лагман ≈",110,6,4,13],["Бешбармак ≈",180,12,9,13],["Шашлык ≈",250,20,18,0],["Энергетики",45,0,0,11],["Вино",85,0.1,0,2.6],["Крепкое",235,0,0,0.1],
 ["Чипсы",530,6.5,30,53],["Сухарики",400,10,8,70],["Рыбка сушёная",235,46,5.5,0],["Сыр-косичка",300,26,21,0.5],["Попкорн",400,12,7,70],
 ["Вода",0,0,0,0],["Айран",25,1.1,1.5,1.4],["Батон",262,7.5,2.9,51],["Лепёшка",260,8,1.5,53],["Курица целая",190,16,14,0],
 ["Крабовые палочки",73,6,1,10],["Сельдь",217,19.8,15.4,0],["Мороженое",230,3.7,15,21],["Конфеты",450,4,20,65],["Гейнер",380,20,3,70],
 ["Мука",334,10.3,1.1,69.9],["Протеиновые батончики",350,30,10,35]];
let added=0;EXTRA.forEach(([n,k,p,f,c])=>{if(!S.base.some(x=>x.n===n)){S.base.push({n,k,p,f,c});added++}});if(added)save();
// порция по умолчанию, г или мл, когда еду вне дома записывают в питание
const PORTION={"Донер / шаурма ≈":350,"Бургер ≈":250,"Пицца ≈":300,"Плов ≈":400,"Манты ≈":250,"Баурсаки ≈":150,"Хот-дог ≈":150,"Самса ≈":120,
 "Курица KFC ≈":250,"Картошка фри":120,"Лагман ≈":450,"Бешбармак ≈":400,"Шашлык ≈":200,"Энергетики":450,"Вино":150,"Крепкое":50};
const EAT_CATS=["cafe","habit"];

// ---------- утилиты ----------
const fmt=n=>Math.round(n).toLocaleString("ru-RU");
const esc=esc0;
const pad2=n=>String(n).padStart(2,"0");
const keyOf=dt=>dt.getFullYear()+"-"+pad2(dt.getMonth()+1)+"-"+pad2(dt.getDate());
const parse=k=>{const [y,m,d]=k.split("-").map(Number);return new Date(y,m-1,d,12)};
const addDays=(k,n)=>{const d=parse(k);d.setDate(d.getDate()+n);return keyOf(d)};
const addMonth=k=>{const d=parse(k);d.setMonth(d.getMonth()+1);return keyOf(d)};
const short=k=>parse(k).toLocaleDateString("ru-RU",{day:"numeric",month:"short"}).replace(".","");
const wday=k=>parse(k).toLocaleDateString("ru-RU",{weekday:"long"});
const today=()=>keyOf(bizNow());
const toast=m=>window.wToast&&wToast(m);
const allCats=()=>M.cats.exp.concat(M.cats.inc);
const MIXED={id:"mixed",n:"Покупка",i:"basket",c:"#9fb3c8",s:[]};
const GONE={id:"gone",n:"Удалённая категория",i:"more",c:"#9aa6b2",s:[]};
const catOf=id=>id==="mixed"?MIXED:allCats().find(c=>c.id===id)||GONE;
const accOf=id=>M.acc.find(a=>a.id===id)||{n:"Удалённый счёт",i:"card",c:"#9aa6b2"};
const norm=s=>String(s).toLowerCase().replace(/ё/g,"е");
const stem=w=>norm(w).slice(0,Math.max(4,Math.min(6,w.length-1)));
function itemIndex(){const r=[];[["exp",M.cats.exp],["inc",M.cats.inc]].forEach(([t,cs])=>cs.forEach(c=>c.s.forEach(s=>s.it.forEach(it=>r.push({t,c:c.id,s:s.n,it})))));return r}
function findItems(q,t){const ws=norm(q).split(/[^a-zа-я0-9-]+/).filter(w=>w.length>=3);if(!ws.length)return[];
  return itemIndex().filter(x=>x.t===t&&ws.every(w=>norm(x.it.n+" "+x.s).split(/[\s/-]+/).some(p=>p.startsWith(stem(w))))).slice(0,8)}

// ---------- периоды от зарплаты ----------
const isSalaryTx=t=>t.t==="inc"&&t.c==="salary"&&(t.lines||[]).some(l=>l.n!=="Аванс");
function starts(){
  let s=[...new Set(M.tx.filter(isSalaryTx).map(t=>t.d))].sort();
  if(!s.length){const t=parse(today());const st=new Date(t.getFullYear(),t.getMonth()-(t.getDate()>=M.sal.from?0:1),M.sal.from,12);s=[keyOf(st)]}
  const first=M.tx.reduce((m,t)=>!m||t.d<m?t.d:m,null);
  if(first&&first<s[0])s.unshift(first);
  return s;
}
function periodOf(i){const S_=starts();if(i<0||i>=S_.length)return null;const a=S_[i],nx=i+1<S_.length?S_[i+1]:addMonth(a);
  return{i,a,b:addDays(nx,-1),open:i===S_.length-1}}
function curPer(){const S_=starts(),t=today();let i=0;S_.forEach((s,j)=>{if(s<=t)i=j});return i}
// ---------- свой период ----------
let cust=null,ppOpen=false;
const dayDiff=(a,b)=>Math.round((parse(b)-parse(a))/864e5);
const MON=["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
function presetRange(kind,base){const t=parse(base||today()),y=t.getFullYear(),m=t.getMonth();
  const mon=new Date(t);mon.setDate(t.getDate()-((t.getDay()+6)%7));
  switch(kind){
    case"day":return[keyOf(t),keyOf(t)];
    case"week":return[keyOf(mon),addDays(keyOf(mon),6)];
    case"month":return[keyOf(new Date(y,m,1,12)),keyOf(new Date(y,m+1,0,12))];
    case"year":return[y+"-01-01",y+"-12-31"];
  }}
function custLabel(c){
  if(c.kind==="day")return c.a===today()?"Сегодня":c.a===addDays(today(),-1)?"Вчера":short(c.a);
  if(c.kind==="week")return"Неделя "+short(c.a)+" – "+short(c.b);
  if(c.kind==="month"){const d=parse(c.a);return MON[d.getMonth()][0].toUpperCase()+MON[d.getMonth()].slice(1)+" "+d.getFullYear()}
  if(c.kind==="year")return c.a.slice(0,4)+" год";
  if(c.kind==="all")return"Всё время";
  return short(c.a)+" – "+short(c.b)}
function setCust(kind,a,b){cust={kind,a,b};cust.label=custLabel(cust);ppOpen=false;Wv.item=null;openTx=null}
function shiftCust(dir){const c=cust;
  if(c.kind==="day"){const a=addDays(c.a,dir);setCust("day",a,a);return}
  if(c.kind==="week"){const a=addDays(c.a,7*dir);setCust("week",a,addDays(a,6));return}
  if(c.kind==="month"){const d=parse(c.a);d.setMonth(d.getMonth()+dir);const r=presetRange("month",keyOf(d));setCust("month",r[0],r[1]);return}
  if(c.kind==="year"){const r=presetRange("year",(+c.a.slice(0,4)+dir)+"-06-01");setCust("year",r[0],r[1]);return}
  const len=dayDiff(c.a,c.b)+1;setCust(c.kind==="all"?"custom":c.kind,addDays(c.a,len*dir),addDays(c.b,len*dir))}
function activeP(){if(cust)return Object.assign({i:null,custom:true,open:cust.b>=today()},cust);return periodOf(per)}
function picker(){
  const t=today(),first=M.tx.reduce((m,x)=>!m||x.d<m?x.d:m,null)||t;
  const P=[["day","Сегодня",t,t],["yday","Вчера",addDays(t,-1),addDays(t,-1)],["week","Эта неделя"].concat(presetRange("week")),
    ["lweek","Прошлая неделя"].concat(presetRange("week",addDays(t,-7))),["month","Этот месяц"].concat(presetRange("month")),
    ["lmonth","Прошлый месяц"].concat(presetRange("month",keyOf(new Date(parse(t).getFullYear(),parse(t).getMonth()-1,15,12)))),
    ["d7","7 дней",addDays(t,-6),t],["d30","30 дней",addDays(t,-29),t],["year","Этот год"].concat(presetRange("year")),["all","Всё время",first,t]];
  const a=cust?cust.a:activeP().a,b=cust?cust.b:activeP().b;
  return '<div class="card pp"><div class="label">Период</div>'+
   '<button type="button" class="bigbtn'+(cust?" ghost":"")+'" data-pp="reset">↺ От зарплаты до зарплаты'+(cust?"":" · сейчас")+"</button>"+
   '<div class="chips">'+P.map(([k,n,x,y])=>'<button type="button" data-pk="'+k+'" data-a="'+x+'" data-b="'+y+'" aria-pressed="'+(!!cust&&cust.a===x&&cust.b===y)+'">'+n+"</button>").join("")+"</div>"+
   '<div class="label">Свой период</div><div class="fgrid" style="grid-template-columns:1fr 1fr"><label>С<input class="inp" id="ppA" type="date" value="'+a+'"></label><label>По<input class="inp" id="ppB" type="date" value="'+b+'"></label></div>'+
   '<button type="button" class="chipbtn" data-pp="apply">Показать за эти даты</button></div>';
}
function cmpPer(P){
  if(P.custom){const len=dayDiff(P.a,P.b)+1,pa=addDays(P.a,-len);
    if(P.open){const n=dayDiff(P.a,today());return{a:pa,b:addDays(pa,n),cut:n+1}}return{a:pa,b:addDays(P.a,-1)}}
  const pp=periodOf(P.i-1);if(!pp)return null;if(!P.open)return pp;
  const n=Math.round((parse(today())-parse(P.a))/864e5);return Object.assign({},pp,{b:addDays(pp.a,Math.min(n,Math.round((parse(pp.b)-parse(pp.a))/864e5))),cut:n+1})}
const inPer=(t,P)=>P&&t.d>=P.a&&t.d<=P.b;
function sums(P){let e=0,i=0;M.tx.forEach(t=>{if(!inPer(t,P))return;if(t.t==="exp")e+=t.a;if(t.t==="inc")i+=t.a});return{e,i,b:i-e}}
const expLines=(P,ty)=>{const r=[];M.tx.forEach(t=>{if(t.t===(ty||"exp")&&inPer(t,P))(t.lines||[]).forEach(l=>r.push(Object.assign({d:t.d,tid:t.id},l,{a:+l.a||0})))});return r};
// последний остаток «Доступно» из Kaspi для счёта и что по записям было в тот же момент
function kRef(a){let r=null;
  M.tx.forEach(t=>{if(t.kav==null||t.acc!==a.id||(a.sd&&t.id<=a.sid))return;if(!r||(t.kt||0)>r.time)r={time:t.kt||0,v:t.kav,d:t.d,act:accBal(a,t.id)}});
  (M.kin||[]).forEach(k=>{if(k.avail==null||k.acc!==a.id)return;if(!r||k.time>r.time)r={time:k.time,v:k.avail,d:k.d,act:accBal(a)+(window.kaspiPending?kaspiPending(a.id,k.time):0)}});
  if(r)r.diff=Math.round(r.v-r.act);return r}
let accEd=null;
M.tx.forEach(t=>(t.lines||[]).forEach(l=>{if(!l.n)l.n=l.raw||l.s||"Без уточнения";if(!l.s)l.s="Без уточнения"}));
// разовые исправления данных после проверки 29.10 (см. переписку): кДж в дневнике, пакет в «Прочем», ложные цены за кг
if(!M.fx1){M.fx1=1;
  for(const k in S.food)(S.food[k]||[]).forEach(e=>{if(e.k>900&&e.k/4.184<=900)e.k=Math.round(e.k/4.184*10)/10});
  M.tx.forEach(t=>(t.lines||[]).forEach(l=>{if(l.c==="other"&&/n[aа][xхk][eе]t|пакет/i.test(l.raw||"")){l.c="home";l.s="Товары для дома";l.n="Мелочи"}}));
  Object.keys(M.rmap||{}).forEach(k=>{if(/^подытог/.test(k))delete M.rmap[k]});
  // чек-список 28.10 (5 500 ₸): веса не было, «1 кг печенья», «6 л воды», «1 л кефира» — убираем эти цены
  const t26=M.tx.find(t=>t.a===5500&&t.d==="2026-10-28");
  if(t26){(t26.lines||[]).forEach(l=>{delete l.q});
    S.base.forEach(b=>{if(!b.ph||!b.ph.some(h=>h.t===t26.id))return;b.ph=b.ph.filter(h=>h.t!==t26.id);const l=b.ph[b.ph.length-1];if(l){b.pkg=l.p;b.pd=l.d}else{delete b.pkg;delete b.pd}})}
  save()}
const onAcc=()=>M.acc.reduce((v,a)=>v+accBal(a),0);
function accBal(a,upto){let v=+a.start||0;M.tx.forEach(x=>{if(a.sd&&(x.d<a.sd||x.id<=a.sid))return;if(upto!=null&&x.id>upto)return;if(x.acc===a.id){if(x.t==="exp")v-=x.a;if(x.t==="inc")v+=x.a}if(x.t==="tr"){if(x.from===a.id)v-=x.a;if(x.to===a.id)v+=x.a}});return v}

// ---------- состояние экрана ----------
let per=null,sub="rec",openTx=null,delArm=null;
const Wv={lvl:"cat",fc:null,fs:null,q:"",item:null,t:"exp"};
const root=$("money");
const fab=document.createElement("button");fab.className="mfab";fab.type="button";fab.setAttribute("aria-label","Добавить операцию");
fab.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
document.body.appendChild(fab);fab.hidden=true;fab.onclick=()=>openSheet();

window.renderMoney=function(){
  if(!cust&&(per==null||!periodOf(per)))per=curPer();
  fab.hidden=$("pageMoney").hidden||sub==="edit"||sub==="loan";
  if(sub==="edit"){root.innerHTML=editor();return}
  if(sub==="loan"){root.innerHTML=loanForm();return}
  const P=activeP();
  try{root.innerHTML=head(P)+(sub==="rec"?records(P):sub==="where"?where(P):reports(P))}
  catch(err){root.innerHTML='<div class="card"><div class="label">Ошибка экрана</div><div class="muted">Что-то в данных сломало этот экран. Пришли скриншот — исправлю.</div><div class="muted" style="font-size:11px">'+esc(String(err&&err.stack||err).slice(0,400))+'</div><button type="button" class="chipbtn" data-sub="rep">Открыть Отчёты</button></div>'}
};
const rerender=()=>{save();renderMoney()};
["navTrain","navFood","navStats","navBase"].forEach(id=>$(id).addEventListener("click",()=>{fab.hidden=true}));

// ---------- шапка ----------
function head(P){
  const s=sums(P),last=starts().length-1;let daily="",nav="";
  if(P.custom){
    const days=Math.max(1,dayDiff(P.a,P.open?today():P.b)+1);
    daily='<div class="daily"><span>'+(P.open?"Идёт "+days+"-й день":"Дней: "+days)+' · расход в день</span><b>'+fmt(s.e/days)+" ₸</b></div>";
    nav='<div class="pnav"><button type="button" data-cs="-1" aria-label="Раньше">‹</button><button type="button" class="ptitle" data-pp="open"><b>'+esc(P.label)+' ▾</b><span>'+short(P.a)+" – "+short(P.b)+'</span></button><button type="button" data-cs="1" aria-label="Позже"'+(P.b>=today()?" disabled":"")+">›</button></div>"+
      '<button type="button" class="chipbtn back" data-pp="reset">↺ Вернуться к периоду от зарплаты</button>';
  }else{
    if(P.open){const t=parse(today()),nx=new Date(t.getFullYear(),t.getMonth()+(t.getDate()>=M.sal.from?1:0),M.sal.from,12);
      const left=Math.max(1,Math.round((nx-t)/864e5)),mon=nx.toLocaleDateString("ru-RU",{month:"short"}).replace(".","");
      daily='<div class="daily"><span>До зарплаты ≈ '+left+" дн. (ждём "+M.sal.from+"–"+M.sal.to+" "+mon+')</span><b>'+(()=>{const all=onAcc();
        if(!M.budget)return all>0?"≈ "+fmt(all/left)+" ₸/день":"—";
        const bl=Math.min(M.budget-s.e,all);
        return (bl>0?'<small class="dl">по бюджету</small>≈ '+fmt(bl/left)+" ₸/день":'<span class="neg">бюджет исчерпан</span>')+(all>0?'<small class="dl">всего денег ≈ '+fmt(all/left)+" ₸/день</small>":"")})()+"</b></div>"}
    else daily='<div class="daily"><span>Период закрыт</span><b class="'+(s.b>=0?"pos":"neg")+'">'+(s.b>=0?"осталось ":"перерасход ")+fmt(Math.abs(s.b))+" ₸</b></div>";
    const hasSal=M.tx.some(isSalaryTx);
    nav='<div class="pnav"><button type="button" data-per="-1" aria-label="Прошлый период"'+(per>0?"":" disabled")+'>‹</button><button type="button" class="ptitle" data-pp="open"><b>'+short(P.a)+" – "+(P.open?"сейчас":short(P.b))+' ▾</b><span>'+(hasSal?"от зарплаты "+short(P.a):"с "+short(P.a)+" · запиши зарплату, и период начнётся с неё")+(P.open&&hasSal?" · идёт "+(Math.round((parse(today())-parse(P.a))/864e5)+1)+"-й день":"")+'</span></button><button type="button" data-per="1" aria-label="Следующий период"'+(per<last?"":" disabled")+">›</button></div>";
  }
  return '<div class="hero">'+nav+
    '<div class="nums"><div><span>Расходы</span><b>'+fmt(s.e)+'</b></div><div><span>Доходы</span><b>'+fmt(s.i)+'</b></div>'+(P.open&&!P.custom?'<div><span>На счетах</span><b class="'+(onAcc()>=0?"pos":"neg")+'">'+fmt(onAcc())+"</b></div>":'<div><span>Итог</span><b class="'+(s.b>=0?"pos":"neg")+'">'+(s.b>0?"+":"")+fmt(s.b)+"</b></div>")+"</div>"+daily+"</div>"+
    (ppOpen?picker():"")+
    '<div class="seg" role="group">'+[["rec","Записи"],["where","Куда ушло"],["rep","Отчёты"]].map(([k,n])=>'<button type="button" data-sub="'+k+'" aria-pressed="'+(sub===k)+'">'+n+"</button>").join("")+"</div>";
}

// ---------- записи ----------
function records(P){
  const by={};M.tx.forEach(t=>{if(inPer(t,P))(by[t.d]=by[t.d]||[]).push(t)});
  const days=Object.keys(by).sort().reverse();
  const qrBtn=hasQR()||hasPhoto()?'<div class="wrow">'+(hasQR()?'<button type="button" class="bigbtn ghost qrbig" data-x2="qr">'+svg("qr")+"Чек по QR</button>":"")+(hasPhoto()?'<button type="button" class="bigbtn ghost qrbig" data-x2="photo">'+svg("camera")+"Фото чека</button>":"")+"</div>":"";
  const dueB=(window.kaspiCard?kaspiCard():"")+dueBanner();
  if(!days.length)return dueB+qrBtn+'<div class="empty">Записей пока нет.<br>Нажми «+», чтобы добавить расход, доход или перевод. Начни с зарплаты: с неё начинается учётный месяц.</div>';
  return dueB+qrBtn+days.map(d=>{let e=0,i=0;by[d].forEach(t=>{if(t.t==="exp")e+=t.a;if(t.t==="inc")i+=t.a});
    return '<div class="daycard"><div class="dayh"><b>'+short(d)+' <span style="font-weight:400">'+wday(d)+"</span></b><span>"+(e?"−"+fmt(e):"")+(e&&i?" · ":"")+(i?'<span class="pos">+'+fmt(i)+"</span>":"")+"</span></div>"+
      by[d].slice().reverse().map(txRow).join("")+"</div>"}).join("");
}
function txRow(t){
  const isOpen=openTx===t.id;
  const tools=isOpen?'<div class="txtools"><button type="button" data-edit="'+t.id+'">Изменить</button><button type="button" class="danger" data-del="'+t.id+'">'+(delArm===t.id?"Точно удалить?":"Удалить")+"</button></div>":"";
  if(t.t==="tr")return '<div class="tx" data-tx="'+t.id+'"><div class="ic" style="background:var(--surface2);color:var(--fg)">'+svg("swap")+'</div><div class="nm"><b>Перевод</b><small>'+esc(accOf(t.from).n)+" → "+esc(accOf(t.to).n)+'</small></div><div class="am">'+fmt(t.a)+"</div></div>"+tools;
  const c=catOf(t.c),ln=t.lines||[];
  const cn=t.c==="mixed"?[...new Set(ln.map(l=>catOf(l.c).n))].join(", "):"";
  const det=(t.note?t.note+" · ":"")+(t.c==="mixed"?cn+" · "+ln.length+" поз.":ln.length>1?ln.length+" поз.: "+ln.slice(0,3).map(x=>String(x.n||x.raw||x.s||"").toLowerCase()).join(", ")+(ln.length>3?"…":""):ln.length?ln[0].s+" › "+ln[0].n:"");
  return '<div class="tx" data-tx="'+t.id+'"><div class="ic" style="background:'+c.c+'">'+svg(c.i)+'</div><div class="nm"><b>'+esc(t.receipt||c.n)+
    (t.foodLink?'<span class="link">+ в питании</span>':"")+(ln.length>1?'<span class="link">чек</span>':"")+"</b><small>"+esc(det)+"</small></div>"+
    '<div class="am '+(t.t==="inc"?"pos":"")+'">'+(t.t==="inc"?"+":"−")+fmt(t.a)+"<small>"+esc(accOf(t.acc).n)+"</small></div></div>"+
    (isOpen&&ln.length?'<div class="txlines">'+ln.map(x=>"<div><span>"+(t.c==="mixed"?esc(catOf(x.c).n)+" › ":"")+esc(x.n)+(x.q?" · "+String(x.q).replace(".",",")+" "+(x.u||""):"")+"</span><b>"+fmt(x.a)+"</b></div>").join("")+"</div>":"")+tools;
}

// ---------- куда ушло ----------
function agg(lines,lvl){const m={};lines.forEach(l=>{
  const k=lvl==="cat"?l.c:lvl==="sub"?l.c+"|"+l.s:l.c+"|"+l.s+"|"+l.n;
  const o=m[k]=m[k]||{k,c:l.c,s:l.s,n:l.n,a:0,cnt:0,q:0,u:l.u};o.a+=l.a;o.cnt++;if(l.q)o.q+=+l.q});
  return Object.values(m).sort((x,y)=>y.a-x.a)}
function where(P){
  const prevP=cmpPer(P),inc=Wv.t==="inc";let L=expLines(P,Wv.t),Lp=prevP?expLines(prevP,Wv.t):[];
  let h='<div class="seg small" role="group">'+[["exp","Расходы"],["inc","Доходы"]].map(([k,n])=>'<button type="button" data-wt="'+k+'" aria-pressed="'+(Wv.t===k)+'">'+n+"</button>").join("")+"</div>"+'<div class="msearch"><span aria-hidden="true">⌕</span><input id="wq" type="text" placeholder="Найти: пиво, такси, грудка…" value="'+esc(Wv.q)+'" autocomplete="off">'+(Wv.q?'<button type="button" data-wq="x" aria-label="Очистить">×</button>':"")+"</div>";
  if(!L.length&&!Wv.q)return h+'<div class="empty">В этом периоде '+(inc?"доходов":"расходов")+' пока нет.</div>';
  if(Wv.q.trim().length>=3){const w=norm(Wv.q.trim()).slice(0,5);
    const hit=l=>norm(l.n+" "+l.s+" "+catOf(l.c).n).split(/[\s›/-]+/).some(p=>p.startsWith(w));
    return h+detail("Поиск: «"+Wv.q.trim()+"»",L.filter(hit),Lp.filter(hit),prevP,null,P)}
  if(Wv.item){const [c,s,n]=Wv.item.split("|");const m=l=>l.c===c&&l.s===s&&l.n===n;h+=detail(n,L.filter(m),Lp.filter(m),prevP,catOf(c).n+" › "+s,P)}
  if(Wv.fc){L=L.filter(l=>l.c===Wv.fc);Lp=Lp.filter(l=>l.c===Wv.fc)}
  if(Wv.fs){L=L.filter(l=>l.s===Wv.fs);Lp=Lp.filter(l=>l.s===Wv.fs)}
  const lvl=Wv.fs?"item":Wv.fc?"sub":Wv.lvl;
  if(!Wv.fc)h+='<div class="seg small" role="group">'+[["cat","Категории"],["sub","Подкатегории"],["item","Позиции"]].map(([k,n])=>'<button type="button" data-lvl="'+k+'" aria-pressed="'+(Wv.lvl===k)+'">'+n+"</button>").join("")+"</div>";
  else h+='<div class="crumbs"><button type="button" data-cr="all">Все</button>›<button type="button" data-cr="cat">'+esc(catOf(Wv.fc).n)+"</button>"+(Wv.fs?'›<button type="button" data-cr="sub">'+esc(Wv.fs)+"</button>":"")+"</div>";
  const rows=agg(L,lvl),prev={};agg(Lp,lvl).forEach(r=>prev[r.k]=r.a);
  const total=rows.reduce((s,r)=>s+r.a,0);
  if(lvl==="cat"&&!Wv.fc&&rows.length){const R=55,C=2*Math.PI*R;let off=0;
    const arcs=rows.map(x=>{const len=x.a/total*C;const s='<circle cx="70" cy="70" r="'+R+'" fill="none" stroke="'+catOf(x.c).c+'" stroke-width="20" stroke-dasharray="'+Math.max(0,len-2).toFixed(2)+" "+C.toFixed(2)+'" stroke-dashoffset="'+(-off).toFixed(2)+'" transform="rotate(-90 70 70)"/>';off+=len;return s}).join("");
    h+='<div class="card"><div class="donutwrap"><svg class="donut" viewBox="0 0 140 140" role="img" aria-label="'+(inc?"Доходы":"Расходы")+' по категориям">'+arcs+'<text x="70" y="66" text-anchor="middle" class="dl">'+(inc?"доходы":"расходы")+'</text><text x="70" y="84" text-anchor="middle" class="dv">'+fmt(total)+"</text></svg>"+
      '<div class="legend">'+rows.slice(0,5).map(x=>'<div><i style="background:'+catOf(x.c).c+'"></i><span>'+esc(catOf(x.c).n)+"</span><span>"+Math.round(x.a/total*100)+"%</span></div>").join("")+"</div></div></div>"}
  h+='<div class="card"><div class="label">'+(lvl==="cat"?(inc?"Откуда пришло больше всего":"На что ушло больше всего"):lvl==="sub"?"Подкатегории":"Позиции")+" · "+fmt(total)+" ₸</div>"+
    '<div class="muted">'+(lvl==="item"?"Нажми на позицию: история покупок и цена за единицу.":"Нажми на строку, чтобы провалиться глубже.")+(prevP?(prevP.cut?" Стрелка — сравнение с первыми "+prevP.cut+" днями прошлого периода.":" Стрелка — сравнение с прошлым периодом."):"")+'</div><div class="rank">'+
    rows.map((r,i)=>{const c=catOf(r.c),p=prev[r.k];let d="";
      if(prevP){if(p==null)d='<small class="'+(inc?"pos":"neg")+'">новое</small>';else{const ch=Math.round((r.a-p)/p*100);d='<small class="'+(ch>5?(inc?"pos":"neg"):ch<-5?(inc?"neg":"pos"):"muted")+'">'+(ch>5?"▲ ":ch<-5?"▼ ":"")+Math.abs(ch)+"%</small>"}}
      const name=lvl==="cat"?c.n:lvl==="sub"?r.s:r.n;
      const subl=(lvl==="cat"?"":lvl==="sub"?c.n:c.n+" › "+r.s)+(lvl!=="cat"?" · ":"")+"× "+r.cnt+(r.q&&r.u?" · "+String(Math.round(r.q*10)/10).replace(".",",")+" "+r.u:"");
      return '<button type="button" class="rrow" data-row="'+esc(r.k)+'" data-lv="'+lvl+'"><span class="no">'+(i+1)+'</span><span class="nm"><b>'+esc(name)+"</b><small>"+esc(subl)+'</small><span class="mbar2"><i style="width:'+(r.a/rows[0].a*100)+"%;background:"+c.c+'"></i></span></span><span class="am">'+fmt(r.a)+d+"</span></button>"}).join("")+"</div></div>";
  return h;
}
function detail(title,L,Lp,prevP,path,P){
  if(!L.length)return '<div class="card mdetail"><b>'+esc(title)+'</b><div class="muted">В этом периоде таких трат нет.</div>'+(Wv.item?'<button type="button" class="chipbtn" data-wq="close">Закрыть</button>':"")+"</div>";
  const a=L.reduce((s,l)=>s+l.a,0),q=L.reduce((s,l)=>s+(+l.q||0),0),u=(L.find(l=>l.u)||{}).u,ap=Lp.reduce((s,l)=>s+l.a,0);
  const days=new Set(L.map(l=>l.d)).size,span=Math.max(1,Math.round((parse(P.open?today():P.b)-parse(P.a))/864e5)+1);
  return '<div class="card mdetail"><div style="display:flex;justify-content:space-between;gap:8px;align-items:start"><div><b style="font-size:17px">'+esc(title)+"</b>"+(path?'<div class="muted">'+esc(path)+"</div>":"")+'</div>'+(Wv.item?'<button type="button" class="chipbtn" data-wq="close">Закрыть</button>':"")+"</div>"+
   '<div class="dnums"><div><b>'+fmt(a)+" ₸</b>за период</div><div><b>"+L.length+"</b>покупок, "+days+" дн.</div>"+
   (q&&u?'<div><b>'+String(Math.round(q*10)/10).replace(".",",")+" "+u+"</b>всего</div><div><b>"+fmt(a/q)+" ₸/"+u+"</b>средняя цена</div>":'<div><b>'+fmt(a/L.length)+' ₸</b>средний чек</div><div><b>'+fmt(a/span)+" ₸</b>в среднем в день</div>")+"</div>"+
   (prevP?'<div class="kv"><span>'+(prevP.cut?"Те же "+prevP.cut+" дн. прошлого периода":"Прошлый период")+'</span><b class="'+((a>ap)!==(Wv.t==="inc")?"neg":"pos")+'">'+fmt(ap)+" ₸ "+(ap?(a>ap?"▲ ":"▼ ")+Math.abs(Math.round((a-ap)/ap*100))+"%":"")+"</b></div>":"")+
   '<div class="muted">Нажми на покупку, чтобы исправить количество или сумму.</div><div class="hist">'+L.slice().sort((x,y)=>x.d<y.d?1:-1).slice(0,15).map(l=>'<button type="button" class="hrow" data-edit="'+l.tid+'"><span>'+short(l.d)+" · "+esc(l.n)+(l.q?" · "+String(l.q).replace(".",",")+" "+(l.u||""):"")+"</span><b>"+fmt(l.a)+" ✎</b></button>").join("")+(L.length>15?'<div><span>и ещё '+(L.length-15)+"</span></div>":"")+"</div></div>";
}

// ---------- отчёты ----------
function reports(P){
  const s=sums(P),pp=cmpPer(P),sp=pp?sums(pp):null,L=expLines(P),sum=f=>L.filter(f).reduce((a,l)=>a+l.a,0);
  let h='<div class="card"><div class="label">'+(pp&&pp.cut?"Первые "+pp.cut+" дн. против того же отрезка прошлого периода":"Этот период против прошлого")+"</div>"+
   (sp?'<div class="kv"><span>Расходы</span><b>'+fmt(s.e)+' <small class="'+(s.e>sp.e?"neg":"pos")+'">'+(s.e>sp.e?"▲ ":"▼ ")+fmt(Math.abs(s.e-sp.e))+'</small></b></div><div class="kv"><span>Доходы</span><b>'+fmt(s.i)+"</b></div>":'<div class="muted">Прошлого периода пока нет.</div>')+"</div>";
  if(M.budget){const pct=Math.min(1,s.e/M.budget),R=44,C=2*Math.PI*R;
    h+='<div class="card"><div class="label">Бюджет на период</div><div class="ring"><div style="display:flex;flex-direction:column;gap:8px">'+
    '<div class="kv"><span>Бюджет</span><b>'+fmt(M.budget)+'</b></div><div class="kv"><span>Потрачено</span><b>'+fmt(s.e)+'</b></div><div class="kv" style="border-top:1px dashed var(--line);padding-top:8px"><span>Остаток</span><b class="'+(M.budget-s.e>=0?"pos":"neg")+'">'+fmt(M.budget-s.e)+"</b></div></div>"+
    '<svg viewBox="0 0 110 110" width="110" height="110" role="img" aria-label="Использовано '+Math.round(pct*100)+'% бюджета"><circle cx="55" cy="55" r="'+R+'" fill="none" class="rbg" stroke-width="10"/><circle cx="55" cy="55" r="'+R+'" fill="none" class="'+(pct>.9?"rwarn":"racc")+'" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+(pct*C).toFixed(1)+" "+C.toFixed(1)+'" transform="rotate(-90 55 55)"/><text x="55" y="61" text-anchor="middle" class="dv">'+Math.round(pct*100)+"%</text></svg></div></div>"}
  h+=incomeCard(P,pp);
  h+='<div class="card"><div class="label">Еда и привычки</div>'+
   '<div class="kv"><span>Продукты домой</span><b>'+fmt(sum(l=>l.c==="food"&&l.s!=="Снеки и закуски"))+'</b></div>'+
   '<div class="kv"><span>Кафе, донеры, кофе, доставка</span><b>'+fmt(sum(l=>l.c==="cafe"))+'</b></div>'+
   '<div class="kv"><span>Алкоголь и закуски</span><b>'+fmt(sum(l=>l.s==="Алкоголь"||l.s==="Снеки и закуски"))+'</b></div>'+
   '<div class="kv"><span>Сигареты</span><b>'+fmt(sum(l=>l.s==="Сигареты"))+'</b></div></div>'+
   '<div class="card"><div class="label">Счета</div><div class="muted">Нажми на счёт, чтобы вписать, сколько на нём сейчас.</div>'+M.acc.map(a=>{const r=kRef(a);
     return '<div class="accrow" data-acced="'+a.id+'" style="cursor:pointer"><div class="ic" style="background:'+a.c+'">'+svg(a.i)+"</div><span>"+esc(a.n)+(r?'<small class="muted" style="display:block">по Kaspi '+short(r.d)+": "+fmt(r.v)+" ₸"+(Math.abs(r.diff)>10?' · <span class="neg">расхождение '+(r.diff>0?"+":"−")+fmt(Math.abs(r.diff))+'</span><br><button type="button" class="chipbtn" data-kfix="'+a.id+'" style="margin-top:6px">Поставить как в Kaspi</button>':" · сходится")+"</small>":"")+"</span><b>"+fmt(accBal(a))+" ₸</b></div>"+
       (accEd===a.id?'<div class="addrow"><input class="inp" id="accNow" inputmode="numeric" placeholder="Сейчас на счёте, ₸" value="'+Math.round(accBal(a))+'"><button type="button" class="chipbtn" data-accsave="'+a.id+'">Сохранить</button></div><div class="muted">Всё, что записано до этой минуты, на остаток больше не влияет.</div>':"")}).join("")+
   (M.acc.some(a=>{const r=kRef(a);return r&&Math.abs(r.diff)>10})?'<div class="muted">Расхождение — какая-то операция не записана или записана не на тот счёт. Найди её, нажми «Поставить как в Kaspi» или нажми на счёт и впиши остаток сам.</div>':"")+"</div>"+
   loansCard()+'<button type="button" class="bigbtn ghost" data-sub="edit">Категории, счета и настройки</button>';
  return h;
}

// ---------- доходы: по категориям и чаевые за смену ----------
function incomeCard(P,pp){
  const L=expLines(P,"inc");if(!L.length)return '<div class="card"><div class="label">Доходы</div><div class="muted">В этом периоде доходов пока нет.</div></div>';
  const tot=L.reduce((s,l)=>s+l.a,0),Lp=pp?expLines(pp,"inc"):[],totp=Lp.reduce((s,l)=>s+l.a,0);
  const by=agg(L,"cat");
  let h='<div class="card"><div class="label">Доходы · '+fmt(tot)+' ₸</div>'+
    (pp?'<div class="muted">'+(pp.cut?"Те же "+pp.cut+" дн. прошлого периода":"Прошлый период")+": "+fmt(totp)+" ₸"+(totp?' <span class="'+(tot>=totp?"pos":"neg")+'">'+(tot>=totp?"▲ ":"▼ ")+Math.abs(Math.round((tot-totp)/totp*100))+"%</span>":"")+"</div>":"")+
    by.map(r=>'<div class="kv"><span>'+esc(catOf(r.c).n)+'</span><b>'+fmt(r.a)+' <small class="muted">'+Math.round(r.a/tot*100)+"%</small></b></div>").join("");
  const T=L.filter(l=>l.c==="tips");
  if(T.length){const days={};T.forEach(l=>days[l.d]=(days[l.d]||0)+l.a);const dk=Object.keys(days),tt=T.reduce((s,l)=>s+l.a,0);
    const best=dk.sort((a,b)=>days[b]-days[a])[0],card=T.filter(l=>/карт|kaspi|перевод/i.test(l.n||"")).reduce((s,l)=>s+l.a,0);
    const Tp=Lp.filter(l=>l.c==="tips"),dp=new Set(Tp.map(l=>l.d)).size,ttp=Tp.reduce((s,l)=>s+l.a,0);
    h+='<div class="label" style="margin-top:10px">Чаевые</div>'+
      '<div class="kv"><span>Смен с чаевыми</span><b>'+dk.length+"</b></div>"+
      '<div class="kv"><span>В среднем за смену</span><b>'+fmt(tt/dk.length)+" ₸"+(dp?' <small class="'+(tt/dk.length>=ttp/dp?"pos":"neg")+'">было '+fmt(ttp/dp)+"</small>":"")+"</b></div>"+
      '<div class="kv"><span>Лучшая смена</span><b>'+fmt(days[best])+" ₸ <small class=\"muted\">"+short(best)+"</small></b></div>"+
      '<div class="kv"><span>На карту / наличными</span><b>'+fmt(card)+" / "+fmt(tt-card)+"</b></div>"}
  return h+'<button type="button" class="chipbtn" data-incwhere="1">Подробно по доходам</button></div>';
}

// ---------- редактор категорий, счетов, настроек ----------
let edT="exp",edOpen=null,edArm=null;
const PALETTE=["#6cd39a","#5ec4b6","#e88fb0","#c9a27e","#7fb2f0","#f08a7e","#9ad06b","#b3b86a","#a99bf0","#f0a6d8","#8c9cf2","#f0c46a","#6fc3e8","#f0a35e","#d9a5e8","#78d0c0","#d6b48c","#9fb3c8"];
function editor(){
  const cats=M.cats[edT];
  let h='<div class="edhead"><button type="button" class="chipbtn" data-sub="rep">‹ Назад</button><b>Настройки денег</b></div>'+
   '<div class="card"><div class="label">Учётный месяц</div><div class="muted">Период начинается в день, когда записана зарплата (кроме аванса). Окно зарплаты нужно для подсказки «до зарплаты N дней».</div>'+
   '<div class="fgrid" style="grid-template-columns:1fr 1fr 1fr"><label>Зарплата с<input class="inp" id="salF" inputmode="numeric" value="'+M.sal.from+'"></label><label>по число<input class="inp" id="salT" inputmode="numeric" value="'+M.sal.to+'"></label><label>Бюджет, ₸<input class="inp" id="bud" inputmode="numeric" placeholder="нет" value="'+(M.budget||"")+'"></label></div></div>'+
   '<div class="card"><div class="label">Рабочий день</div><div class="muted">До этого часа ночи записи идут во вчерашний день: чаевые после полуночи, поздний ужин, тренировка. Касается денег, питания и зала.</div>'+
   '<label class="fl">День заканчивается в<select class="inp" id="dayEnd">'+[0,1,2,3,4,5,6].map(h=>'<option value="'+h+'"'+((S.dayEnd==null?4:+S.dayEnd)===h?" selected":"")+">"+h+":00"+(h===0?" (полночь)":"")+"</option>").join("")+"</select></label></div>"+
   (window.Android&&Android.notify?'<div class="card"><div class="label">Виджет в шторке</div><label class="chk"><input type="checkbox" id="notifOn"'+(M.notif!==false?" checked":"")+'>Показывать «+ Доход / + Расход / Чек» и итог дня в уведомлениях</label></div>':"")+
   (window.Android&&Android.kaspiInbox?'<div class="card"><div class="label">Уведомления Kaspi</div><label class="chk"><input type="checkbox" id="kaspiOn"'+(M.kaspiOff?"":" checked")+'>Собирать операции из уведомлений Kaspi во входящие</label>'+
     (Android.listenerOn&&!Android.listenerOn()?'<div class="muted">Нужен доступ к уведомлениям: в списке включи «Зал».</div><button type="button" class="chipbtn" data-x3="perm">Дать доступ к уведомлениям</button>':'<div class="muted">Доступ есть. Новые операции появятся наверху вкладки «Записи».</div>')+"</div>":"")+
   '<div class="card"><div class="label">Счета</div><div class="muted">Впиши, сколько на счёте сейчас. Записи до этого момента на остаток уже не влияют — старые траты можно спокойно дописывать.</div>'+
   M.acc.map((a,i)=>'<div class="fgrid" style="grid-template-columns:1fr 120px 36px;align-items:end"><label>Название<input class="inp" data-an="'+i+'" value="'+esc(a.n)+'"></label><label>Сейчас, ₸<input class="inp" data-as="'+i+'" inputmode="numeric" value="'+Math.round(accBal(a))+'"></label><button type="button" class="xbtn" data-adel="'+i+'" aria-label="Удалить счёт">'+(edArm==="a"+i?"?":"×")+"</button></div>").join("")+
   '<button type="button" class="chipbtn" data-aadd="1">+ Счёт</button></div>'+
   (window.Android&&Android.shareFile?'<div class="card"><div class="label">Проверка данных</div><div class="muted">Соберёт все записи, продукты, категории и питание в один файл. Его можно отправить в чат на проверку — в телефоне ничего не меняется.</div><button type="button" class="chipbtn" data-x3="export">Отправить данные файлом</button></div>':"")+
   '<button type="button" class="bigbtn ghost" data-x3="cated">Категории и подкатегории — в Базе</button>'+
   (window.Android&&Android.version?'<div class="muted" style="text-align:center">Версия приложения '+esc(Android.version())+"</div>":"");
  return h;
}
function armOr(key){if(edArm===key){edArm=null;return true}edArm=key;setTimeout(()=>{if(edArm===key){edArm=null;renderMoney()}},4000);renderMoney();return false}

// ---------- события ----------
root.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;const d=b.dataset;
  if(d.x3==="perm"){try{Android.openMusicPermission()}catch(err){}return}
  if(d.x3==="export"){try{const k=today();Android.shareFile("zal-"+k+".json",JSON.stringify({app:"zal",ver:window.Android&&Android.version?Android.version():"",at:new Date().toISOString(),data:S}))}catch(err){toast("Не получилось")}return}
  if(d.x3==="cated"){if(window.openCatEditor)openCatEditor("exp");return}
  if(d.x2==="qr"){try{Android.scanQR()}catch(err){toast("Сканер недоступен")}return}
  if(d.x2==="photo"){openSheet();Fm.photoAsk=true;renderSheet();return}
  if(d.sub){sub=d.sub;Wv.item=null;renderMoney();window.scrollTo(0,0);return}
  if(d.per){per+=+d.per;Wv.item=null;openTx=null;renderMoney();return}
  if(d.cs){shiftCust(+d.cs);renderMoney();return}
  if(d.pp==="open"){ppOpen=!ppOpen;renderMoney();return}
  if(d.pp==="reset"){cust=null;ppOpen=false;per=curPer();Wv.item=null;renderMoney();return}
  if(d.pp==="apply"){let a=$("ppA").value,b=$("ppB").value;if(!a||!b)return;if(a>b)[a,b]=[b,a];setCust("custom",a,b);renderMoney();return}
  if(d.pk){const k=d.pk,kind=k==="yday"?"day":k==="lweek"?"week":k==="lmonth"?"month":k==="d7"||k==="d30"?"custom":k;
    setCust(kind,d.a,d.b);if(k==="d7"||k==="d30")cust.label=k==="d7"?"Последние 7 дней":"Последние 30 дней";renderMoney();return}
  if(d.edit){openSheet(M.tx.find(t=>t.id===+d.edit));return}
  if(d.del){if(delArm!==+d.del){delArm=+d.del;renderMoney();setTimeout(()=>{if(delArm===+d.del){delArm=null;renderMoney()}},4000);return}
    removeTx(+d.del);delArm=null;openTx=null;rerender();toast("Запись удалена");return}
  if(d.incwhere){Wv.t="inc";Wv.fc=Wv.fs=Wv.item=null;sub="where";renderMoney();window.scrollTo(0,0);return}
  if(d.wt){Wv.t=d.wt;Wv.fc=Wv.fs=Wv.item=null;renderMoney();return}
  if(d.lvl){Wv.lvl=d.lvl;Wv.item=null;renderMoney();return}
  if(d.row){const p=d.row.split("|");if(d.lv==="cat"){Wv.fc=p[0];Wv.fs=null;Wv.item=null}else if(d.lv==="sub"){Wv.fc=p[0];Wv.fs=p[1];Wv.item=null}else Wv.item=d.row;renderMoney();window.scrollTo(0,0);return}
  if(d.cr){if(d.cr==="all")Wv.fc=Wv.fs=null;else if(d.cr==="cat")Wv.fs=null;Wv.item=null;renderMoney();return}
  if(d.wq==="x"){Wv.q="";renderMoney();return}
  if(d.wq==="close"){Wv.item=null;renderMoney();return}
  // редактор
  if(d.edt){edT=d.edt;edOpen=null;renderMoney();return}
  if(d.edo){edOpen=edOpen===d.edo?null:d.edo;renderMoney();return}
  const cats=M.cats[edT];
  if(d.idel){const [ci,si,ii]=d.idel.split("|").map(Number);cats[ci].s[si].it.splice(ii,1);rerender();return}
  if(d.iadd){const [ci,si]=d.iadd.split("|").map(Number),inp=root.querySelector('[data-inew="'+d.iadd+'"]'),n=inp.value.trim();if(!n)return;
    const it={n};const bn=S.base.find(x=>norm(x.n)===norm(n));if(bn)it.f=bn.n,it.u="кг";cats[ci].s[si].it.push(it);rerender();return}
  if(d.sadd){const ci=+d.sadd,inp=root.querySelector('[data-snew="'+ci+'"]'),n=inp.value.trim();if(!n)return;cats[ci].s.push({n,it:[]});rerender();return}
  if(d.sdel){if(!armOr("s"+d.sdel))return;const [ci,si]=d.sdel.split("|").map(Number);cats[ci].s.splice(si,1);rerender();return}
  if(d.cdel){if(!armOr("c"+d.cdel))return;cats.splice(+d.cdel,1);edOpen=null;rerender();return}
  if(d.cadd){const n=$("cnew").value.trim();if(!n)return;const id="u"+Date.now().toString(36);
    cats.push({id,n,i:"more",c:PALETTE[cats.length%PALETTE.length],s:[{n:n,it:[]}]});edOpen=id;rerender();return}
  if(d.aadd){M.acc.push({id:"a"+Date.now().toString(36),n:"Новый счёт",i:"card",c:PALETTE[M.acc.length*3%PALETTE.length],start:0});rerender();return}
  if(d.adel){if(M.acc.length<2){toast("Нужен хотя бы один счёт");return}if(!armOr("a"+d.adel))return;M.acc.splice(+d.adel,1);rerender();return}
});
root.addEventListener("change",e=>{const t=e.target,d=t.dataset,cats=M.cats[edT];
  if(t.id==="dayEnd"){S.dayEnd=+t.value;save();toast("Готово. Перезапусти приложение, чтобы питание тоже пересчиталось");rerender();return}
  if(t.id==="kaspiOn"){M.kaspiOff=!t.checked;save();return}
  if(t.id==="notifOn"){M.notif=t.checked;save();pushNotif();return}
  if(t.id==="salF"){M.sal.from=Math.min(28,Math.max(1,+t.value||15));rerender()}
  else if(t.id==="salT"){M.sal.to=Math.min(31,Math.max(1,+t.value||18));rerender()}
  else if(t.id==="bud"){M.budget=+String(t.value).replace(/\D/g,"")||0;rerender()}
  else if(d.an!=null){M.acc[+d.an].n=t.value.trim()||M.acc[+d.an].n;save()}
  else if(d.as!=null){const a=M.acc[+d.as];a.start=+String(t.value).replace(/[^\d-]/g,"")||0;a.sd=today();a.sid=M.nid-1;save()}
  else if(d.cn!=null){cats[+d.cn].n=t.value.trim()||cats[+d.cn].n;rerender()}
  else if(d.sn!=null){const [ci,si]=d.sn.split("|").map(Number),old=cats[ci].s[si].n,nw=t.value.trim();if(!nw)return;
    cats[ci].s[si].n=nw;M.tx.forEach(x=>(x.lines||[]).forEach(l=>{if(l.c===cats[ci].id&&l.s===old)l.s=nw}));save()}
});
root.addEventListener("input",e=>{if(e.target.id==="wq"){Wv.q=e.target.value;const pos=e.target.selectionStart;renderMoney();const q=$("wq");q.focus();q.setSelectionRange(pos,pos)}});
root.addEventListener("click",e=>{const r=e.target.closest(".tx");if(!r||e.target.closest("button"))return;const id=+r.dataset.tx;openTx=openTx===id?null:id;delArm=null;renderMoney()});

// ---------- связь с питанием ----------
function pieceWeight(b){const m=b.n.match(/1 шт ≈ (\d+) г/);return m?+m[1]:b.pw?+b.pw:0}
function updatePrices(tx){(tx.lines||[]).forEach(l=>{if(!l.f||!l.a||!l.q)return;const b=S.base.find(x=>x.n===l.f);if(!b)return;
  let perKg=0;if(l.u==="кг"||l.u==="л")perKg=l.a/l.q;else if(l.u==="шт"){const w=pieceWeight(b);if(w)perKg=l.a/l.q/w*1000}
  if(perKg>0){b.pkg=Math.round(perKg);b.pd=tx.d;
    b.ph=(b.ph||[]).filter(h=>h.t!==tx.id);b.ph.push({d:tx.d,p:b.pkg,w:tx.note||"",t:tx.id});b.ph.sort((x,y)=>x.d<y.d?-1:x.d>y.d?1:0);b.ph=b.ph.slice(-30);
    const last=b.ph[b.ph.length-1];b.pkg=last.p;b.pd=last.d}})}
// история цен продукта: последняя, минимум, средняя, где дешевле
window.priceHist=function(b){
  if(!b||!b.ph||!b.ph.length)return"";const H=b.ph,ps=H.map(h=>h.p),mn=Math.min(...ps),avg=ps.reduce((s,v)=>s+v,0)/ps.length,mi=H.find(h=>h.p===mn);
  const dd=d=>d.slice(8)+"."+d.slice(5,7);
  return '<div class="phist"><div class="label">История цен, ₸/кг</div>'+(H.length>1?'<div class="muted">Сейчас '+fmt(H[H.length-1].p)+" · мин "+fmt(mn)+(mi.w&&mi.w!=="вручную"?" ("+esc0(mi.w)+")":"")+" · средняя "+fmt(avg)+"</div>":"")+
    H.slice().reverse().slice(0,8).map(h=>'<div class="frow"><span>'+dd(h.d)+(h.w?" <small>"+esc0(h.w)+"</small>":"")+"</span><span></span><span>"+fmt(h.p)+"</span></div>").join("")+"</div>"};
function gramsOf(l){const q=+l.q||0;if(l.u==="л"||l.u==="кг")return Math.round((q||(l.u==="л"?0.5:0.3))*1000);return Math.round((q||1)*(PORTION[l.f]||300))}
function linkFood(tx){if(!tx.foodLink)return;(tx.lines||[]).forEach(l=>{if(!l.f||!EAT_CATS.includes(l.c))return;const b=S.base.find(x=>x.n===l.f);if(!b)return;
  S.food[tx.d]=S.food[tx.d]||[];S.food[tx.d].push({n:b.n,g:gramsOf(l),k:b.k,p:b.p,f:b.f,c:b.c,cost:l.a,tx:tx.id})})}
function unlinkFood(tx){if(!tx)return;Object.keys(S.food).forEach(k=>{S.food[k]=S.food[k].filter(e=>e.tx!==tx.id)})}
function removeTx(id){const t=M.tx.find(x=>x.id===id);unlinkFood(t);M.tx=M.tx.filter(x=>x.id!==id);
  S.base.forEach(b=>{if(!b.ph||!b.ph.some(h=>h.t===id))return;b.ph=b.ph.filter(h=>h.t!==id);const l=b.ph[b.ph.length-1];if(l){b.pkg=l.p;b.pd=l.d}})}
// цена съеденного фиксируется в момент записи (e.pc, ₸/кг): новая цена в Базе не переписывает прошлые дни
const costOf=e=>e.cost!=null?e.cost:e.pc!=null?e.g*e.pc/1000:(()=>{const b=S.base.find(x=>x.n===e.n);return b&&b.pkg?e.g*b.pkg/1000:null})();
function freezePrices(){let ch=0;const by={};S.base.forEach(b=>{if(b.pkg)by[b.n]=b.pkg});
  for(const k in S.food)(S.food[k]||[]).forEach(e=>{if(e.cost==null&&e.pc==null&&by[e.n]){e.pc=by[e.n];ch++}});return ch}
S.base.forEach(b=>{if(b.pkg&&!b.ph)b.ph=[{d:b.pd||today(),p:b.pkg,w:""}]});
freezePrices();save();
{const os=window.save;window.save=function(){try{freezePrices()}catch(e){}return os.apply(this,arguments)}}
function renderCost(){
  const box=$("costCard");if(!box)return;const E=(S.food[dkey(day)]||[]);
  if(!E.length){box.innerHTML='<div class="label">Еда стоила</div><div class="muted">Добавь еду в дневник: цены продуктов берутся из покупок во вкладке «Деньги».</div>';return}
  let tot=0,out=0,miss=0;const rows=E.map(e=>{const c=costOf(e);if(c==null)miss++;else{tot+=c;if(e.cost!=null)out+=c}
    return '<div class="frow"><span>'+esc0(e.n)+"<small>"+(e.cost!=null?"из «Денег»":c==null?'<button type="button" class="chipbtn setpr" data-setpr="'+esc0(e.n)+'">Указать цену</button>':fmt(c/e.g*1000)+" ₸/кг")+"</small></span><span>"+e.g+" г</span><span>"+(c==null?"—":fmt(c)+" ₸")+"</span></div>"}).join("");
  const prot=S.base.filter(b=>b.pkg&&b.p>=8).map(b=>({n:b.n,v:b.pkg/10/b.p*100})).sort((x,y)=>x.v-y.v).slice(0,5);
  box.innerHTML='<div class="label">Еда '+(dkey(day)===today()?"сегодня":"за день")+' стоила</div><div class="kcal">'+fmt(tot)+' <small>₸</small></div>'+
   '<div class="muted">Дома '+fmt(tot-out)+" ₸ · вне дома "+fmt(out)+" ₸"+(miss?" · без цены: "+miss+" поз.":"")+"</div><div>"+rows+"</div>"+
   (miss?'<div class="muted">У '+miss+' поз. нет цены. Нажми «Указать цену» — или цена подставится сама, когда запишешь покупку этого продукта в «Деньгах» с весом.</div>':"")+
   (prot.length>1?'<div class="label" style="margin-top:8px">Где белок дешевле</div><div class="muted">Сколько стоят 100 г чистого белка. Чем меньше — тем выгоднее добирать белок этим продуктом.</div><div class="ptable">'+prot.map((x,i)=>"<span>"+esc0(x.n)+'</span><span class="'+(i?"":"best")+'">'+fmt(x.v)+" ₸</span>").join("")+"</div>":"");
}
document.addEventListener("click",ev=>{const b=ev.target.closest("[data-setpr]");if(!b)return;
  const it=S.base.find(x=>x.n===b.dataset.setpr);showPage("base");if(it)openBase(it);setTimeout(()=>{const f=$("bPr");if(f)f.focus()},50)});
const origRF=renderFood;renderFood=function(){origRF.apply(this,arguments);renderCost()};

// ---------- лист добавления / изменения ----------
const sheet=$("msheet");
let Fm={};
function openSheet(tx){
  if(tx){Fm={edit:tx.id,t:tx.t,c:tx.t==="tr"?null:(tx.c==="mixed"?(tx.lines[0]||{}).c:tx.c),s:null,
      lines:(tx.lines||[]).map(l=>Object.assign({},l,{a:String(l.a),q:l.q?String(l.q):""})),acc:tx.acc||tx.from,to:tx.to||"",a:tx.t==="tr"?String(tx.a):"",d:tx.d,foodOn:!!tx.foodLink||tx.t!=="exp",q:"",note:tx.note||"",own:null,loan:tx.loan||null}}
  else Fm={t:"exp",c:null,s:null,lines:[],acc:M.acc[M.acc.length>1?1:0].id,to:M.acc[0].id,a:"",d:today(),foodOn:true,q:"",note:"",own:null,assign:null};
  sheet.hidden=false;document.body.style.overflow="hidden";renderSheet();
}
function closeSheet(){sheet.hidden=true;document.body.style.overflow=""}
const lineSum=()=>Fm.lines.reduce((s,l)=>s+(+l.a||0),0);
function addLine(c,s,it){Fm.c=c;Fm.s=s;Fm.lines.push({c,s,n:it.n,f:it.f,u:it.u,a:"",q:it.u==="шт"?"1":""})}
const hasVoice=!!(window.Android&&Android.voice);
function renderSheet(){
  const cats=Fm.t==="inc"?M.cats.inc:M.cats.exp,c=Fm.c&&Fm.t!=="tr"?catOf(Fm.c):null,subc=c&&Fm.s?c.s.find(x=>x.n===Fm.s):null;
  if(Fm.busy){sheet.innerHTML='<div class="sin"><div class="sheethead"><button type="button" data-x="close">Отмена</button><b>Чек</b><span style="width:60px"></span></div><div class="empty"><div class="spin"></div>'+esc(Fm.busy)+"</div></div>";return}
  let h='<div class="sin"><div class="sheethead"><button type="button" data-x="close">Отмена</button><b>'+(Fm.edit?"Изменить":"Добавить")+'</b><span style="width:60px"></span></div>'+
   '<div class="seg">'+[["exp","Расход"],["inc","Доход"],["tr","Перевод"]].map(([k,n])=>'<button type="button" data-ft="'+k+'" aria-pressed="'+(Fm.t===k)+'">'+n+"</button>").join("")+"</div>";
  if(Fm.t==="tr"){
    h+='<div class="fgrid" style="grid-template-columns:1fr 1fr"><label>Откуда<select class="inp" id="ffrom">'+M.acc.map(a=>'<option value="'+a.id+'"'+(a.id===Fm.acc?" selected":"")+">"+esc(a.n)+"</option>").join("")+'</select></label><label>Куда<select class="inp" id="fto">'+M.acc.map(a=>'<option value="'+a.id+'"'+(a.id===Fm.to?" selected":"")+">"+esc(a.n)+"</option>").join("")+"</select></label></div>"+
      '<label class="fl">Сумма, ₸<input class="inp amount" id="famt" inputmode="numeric" placeholder="0" value="'+esc(Fm.a)+'"></label>'+
      '<label class="fl">Дата<input class="inp" id="fdate" type="date" value="'+Fm.d+'"></label><button class="save" type="button" data-x="save">Сохранить</button></div>';
    sheet.innerHTML=h;return;
  }
  h+='<div class="quick"><input id="qtext" type="text" placeholder="Поиск или «пиво 900 чипсы 600»" aria-label="Быстрый ввод" value="'+esc(Fm.q)+'" autocomplete="off">'+
   (/\d/.test(Fm.q)?'<button type="button" class="qadd" data-x="qadd">Добавить</button>':"")+
   (hasVoice?'<button type="button" data-x="mic" aria-label="Сказать голосом">'+svg("mic")+"</button>":"")+
   (hasQR()?'<button type="button" data-x="qr" aria-label="Сканировать QR чека">'+svg("qr")+"</button>":"")+
   (hasPhoto()?'<button type="button" data-x="photo" aria-label="Фото чека">'+svg("camera")+"</button>":"")+"</div>";
  if(Fm.photoAsk)h+='<div class="pickrow"><button type="button" class="chipbtn" data-ph="cam">Сфотографировать чек</button><button type="button" class="chipbtn" data-ph="gal">Выбрать из галереи</button></div><div class="hint">Чек целиком в кадре, ровно, при хорошем свете. Длинный чек можно снять в два фото и добавить по очереди.</div>';
  if(Fm.msg)h+='<div class="foodlink voicebox">'+esc(Fm.msg).split("\n").map(x=>"<div>"+x+"</div>").join("")+"</div>";
  if(Fm.link&&window.Android&&Android.openUrl)h+='<button type="button" class="chipbtn" data-x="openlink" style="margin-bottom:8px">Открыть чек на сайте ОФД</button>';
  if(Fm.sug&&Fm.sug.length)h+='<div class="label">Раньше выбирал</div><div class="chips">'+Fm.sug.map((g,i)=>{const c=catOf(g.c);return '<button type="button" data-sug="'+i+'" aria-pressed="'+(Fm.c===g.c&&Fm.s===g.s)+'">'+esc((c?c.n:"")+(g.s?" › "+g.s:"")+(g.n?" › "+g.n:""))+"</button>"}).join("")+"</div>";
  if(Fm.assign!=null&&Fm.lines[Fm.assign])h+='<div class="assign"><span>Выбери позицию для «<b>'+esc(Fm.lines[Fm.assign].raw||Fm.lines[Fm.assign].n||"")+'</b>»: найди в строке выше или выбери категорию ниже.</span><button type="button" class="chipbtn" data-x="unassign">Готово</button></div>';
  const found=Fm.q?findItems(Fm.q,Fm.t):[];
  if(found.length)h+='<div class="found">'+found.map((x,i)=>'<button type="button" data-fi="'+i+'"><span>'+esc(x.it.n)+'</span><span>'+esc(catOf(x.c).n+" › "+x.s)+"</span></button>").join("")+"</div>";
  else if(!Fm.lines.length)h+='<div class="hint">Пиши позицию — «грудка», «пиво», «яндекс» — или выбери категорию. Несколько сразу: «грудка 200 г 500, пиво 2 бутылки 900» и «Добавить». Можно добавить слово «вчера».'+(hasVoice?" Или нажми микрофон и скажи то же самое.":"")+"</div>";
  h+='<div class="grid">'+cats.map(x=>'<button type="button" class="cat" data-c="'+x.id+'" aria-pressed="'+(Fm.c===x.id)+'"><span class="ic"'+(Fm.c===x.id?' style="background:'+x.c+'"':"")+">"+svg(x.i)+"</span>"+esc(x.n)+"</button>").join("")+"</div>"+
   '<button type="button" class="linkbtn" data-x="cated">✎ Изменить категории</button>';
  if(c){
    h+='<div class="crumbs2"><b>'+esc(c.n)+"</b>"+(subc?" › <b>"+esc(subc.n)+"</b>":"")+"</div>";
    const act=M.loans.filter(L=>loanActive(L)||L.id===Fm.loan);
    if(c.id==="credit"&&act.length)h+='<div class="label">Платёж по кредиту</div><div class="chips">'+act.map(L=>'<button type="button" data-loan="'+L.id+'" aria-pressed="'+(Fm.loan===L.id)+'">'+esc(L.n)+" · "+fmt(L.pay)+"</button>").join("")+"</div>";
    if(c.s.length>1)h+='<div class="chips">'+c.s.map(x=>'<button type="button" data-s="'+esc(x.n)+'" aria-pressed="'+(Fm.s===x.n)+'">'+esc(x.n)+"</button>").join("")+"</div>";
    const sv=subc||(c.s.length===1?c.s[0]:null);
    if(sv){h+='<div class="chips items">'+sv.it.map((it,i)=>'<button type="button" class="'+(it.f?"food":"")+'" data-it="'+i+'" data-sn="'+esc(sv.n)+'">+ '+esc(it.n)+"</button>").join("")+'<button type="button" data-x="own">+ своя позиция</button></div>';
      if(Fm.own)h+='<div class="addrow"><input class="inp" id="ownN" placeholder="Название позиции"><button type="button" class="chipbtn" data-x="ownok">Добавить</button></div><div class="hint">Позиция сохранится в «'+esc(sv.n)+'» и будет в списке в следующий раз.</div>'}
  }
  if(Fm.lines.length){
    h+='<div class="lines">'+Fm.lines.map((l,i)=>'<div class="line'+(Fm.assign===i?" sel":"")+'"><div class="nm">'+(l.c?esc(l.n||l.raw||l.s)+"<small>"+esc(catOf(l.c).n+" › "+l.s)+(l.f?" · питание":"")+"</small>":'<button type="button" class="pickit" data-as="'+i+'">Выбрать позицию</button>')+
      (l.raw?'<small class="raw" data-as="'+i+'">'+esc(l.raw)+(l.c?" · сменить":"")+"</small>":"")+"</div>"+
      (l.u?'<label class="mini">Кол-во, '+l.u+'<input class="inp" data-lq="'+i+'" inputmode="decimal" value="'+esc(l.q||"")+'"></label>':"<span></span>")+
      '<label class="mini">Сумма, ₸<input class="inp" data-la="'+i+'" inputmode="numeric" value="'+esc(l.a||"")+'"></label><button type="button" class="x" data-lx="'+i+'" aria-label="Убрать">×</button></div>').join("")+"</div>"+
      '<div class="total"><span>Итого, '+Fm.lines.length+' поз.</span><b id="tot">'+fmt(lineSum())+" ₸</b></div>";
  }else if(c)h+='<label class="fl">Сумма без позиции, ₸<input class="inp amount" id="famt" inputmode="numeric" placeholder="0" value="'+esc(Fm.a)+'"></label>';
  if(c||Fm.lines.length){
    h+='<div class="fgrid" style="grid-template-columns:1fr 1fr"><label>Счёт<select class="inp" id="facc">'+M.acc.map(a=>'<option value="'+a.id+'"'+(a.id===Fm.acc?" selected":"")+">"+esc(a.n)+"</option>").join("")+'</select></label><label>Дата<input class="inp" id="fdate" type="date" value="'+Fm.d+'"></label></div>'+
      '<label class="fl">Где / комментарий<input class="inp" id="fnote" placeholder="Магнум, Small, у Саши…" value="'+esc(Fm.note)+'"></label>';
    const eat=Fm.lines.filter(l=>l.f&&EAT_CATS.includes(l.c)),buy=Fm.lines.filter(l=>l.f&&!EAT_CATS.includes(l.c));
    if(Fm.t==="exp"&&eat.length)h+='<div class="foodlink"><label class="chk"><input type="checkbox" id="ffood"'+(Fm.foodOn?" checked":"")+'>Записать съеденное и выпитое в питание</label><div class="hint">'+eat.map(l=>esc(l.n)+" ≈ "+gramsOf(l)+(l.u==="л"?" мл":" г")).join(", ")+". Граммы потом можно поправить в «Питании».</div></div>";
    if(Fm.t==="exp"&&buy.length)h+='<div class="foodlink"><div class="hint">Обновятся цены в базе питания: '+buy.map(l=>{const b=S.base.find(x=>x.n===l.f);let p="";
      if(b&&+l.q&&+l.a){if(l.u==="кг"||l.u==="л")p=fmt(l.a/l.q)+" ₸/"+l.u;else{const w=pieceWeight(b);p=w?fmt(l.a/l.q/w*1000)+" ₸/кг":"нужен вес 1 шт в Базе"}}else p="впиши количество";
      return esc(l.n)+" — "+p}).join(", ")+"</div></div>";
    h+='<button class="save" type="button" data-x="save">Сохранить</button>';
  }
  sheet.innerHTML=h+"</div>";
}
function grab(){const v=id=>{const e=$(id);return e?e.value:null};
  if(v("famt")!=null)Fm.a=v("famt").replace(/\D/g,"");if(v("facc"))Fm.acc=v("facc");if(v("ffrom"))Fm.acc=v("ffrom");if(v("fto"))Fm.to=v("fto");
  if(v("fdate"))Fm.d=v("fdate");if($("ffood"))Fm.foodOn=$("ffood").checked;if(v("fnote")!=null)Fm.note=v("fnote")}
function assignTo(c,s,it){const l=Fm.lines[Fm.assign];Object.assign(l,{c,s,n:it.n,f:it.f,u:it.u});if(it.u&&!l.q)l.q=it.u==="шт"?"1":"";
  const nx=Fm.lines.findIndex(x=>!x.c);Fm.assign=nx>=0?nx:null;Fm.c=c;renderSheet()}
sheet.addEventListener("click",e=>{const r=e.target.closest(".raw");if(r){Fm.assign=+r.dataset.as;renderSheet();sheet.scrollTop=0}});
function focusLast(){const ins=sheet.querySelectorAll("[data-la]");if(ins.length)ins[ins.length-1].focus()}
sheet.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;grab();const d=b.dataset;
  if(d.ft){setType(d.ft);renderSheet()}
  else if(d.loan){const L=M.loans.find(x=>x.id===+d.loan);if(L)fillLoan(L);renderSheet()}
  else if(d.c){Fm.c=d.c;const c=catOf(Fm.c);Fm.s=c.s.length===1?c.s[0].n:null;Fm.own=null;renderSheet()}
  else if(d.s!=null){Fm.s=d.s;Fm.own=null;renderSheet()}
  else if(d.it!=null){const c=catOf(Fm.c),sv=c.s.find(x=>x.n===d.sn);if(Fm.assign!=null)assignTo(Fm.c,sv.n,sv.it[+d.it]);else{addLine(Fm.c,sv.n,sv.it[+d.it]);renderSheet();focusLast()}}
  else if(d.fi!=null){const x=findItems(Fm.q,Fm.t)[+d.fi];Fm.q="";if(Fm.assign!=null)assignTo(x.c,x.s,x.it);else{addLine(x.c,x.s,x.it);renderSheet();focusLast()}}
  else if(d.as!=null){Fm.assign=+d.as;renderSheet();window.scrollTo(0,0);sheet.scrollTop=0}
  else if(d.x==="unassign"){Fm.assign=null;renderSheet()}
  else if(d.x==="qr"){try{Android.scanQR()}catch(err){toast("Сканер недоступен")}}
  else if(d.x==="photo"){Fm.photoAsk=!Fm.photoAsk;renderSheet()}
  else if(d.x==="openlink"){try{Android.openUrl(Fm.link)}catch(err){}}
  else if(d.ph){Fm.photoAsk=false;renderSheet();try{Android.photo(d.ph)}catch(err){toast("Камера недоступна")}}
  else if(d.lx!=null){Fm.lines.splice(+d.lx,1);renderSheet()}
  else if(d.x==="own"){Fm.own=true;renderSheet();$("ownN").focus()}
  else if(d.x==="ownok"){const n=$("ownN").value.trim();if(!n)return;const c=catOf(Fm.c),sv=c.s.find(x=>x.n===Fm.s)||c.s[0];
    const it={n};const bn=S.base.find(x=>norm(x.n)===norm(n));if(bn){it.f=bn.n;it.u="кг"}
    if(!sv.it.some(x=>x.n===n))sv.it.push(it);save();Fm.own=null;addLine(c.id,sv.n,it);renderSheet();focusLast()}
  else if(d.x==="close")closeSheet();
  else if(d.x==="cated"){closeSheet();if(window.openCatEditor)openCatEditor(Fm.t==="inc"?"inc":"exp")}
  else if(d.x==="mic"){try{Android.voice()}catch(err){toast("Голосовой ввод недоступен")}}
  else if(d.x==="save")saveSheet();
});
function setType(t){Fm.t=t;Fm.c=null;Fm.s=null;Fm.lines=[];Fm.q="";Fm.loan=null;
  if(t==="inc"){const tp=M.cats.inc.find(c=>c.id==="tips");if(tp){Fm.c="tips";Fm.s=tp.s[0].n;const cash=M.acc.find(a=>a.id==="cash");if(cash)Fm.acc=cash.id}}}
function fillLoan(L){Fm.loan=L.id;Fm.c="credit";Fm.s=L.type==="inst"?"Рассрочки":"Кредиты";Fm.lines=[{c:"credit",s:Fm.s,n:L.n,a:String(L.pay)}];if(!Fm.note)Fm.note=L.n}
function saveSheet(){
  let tx;
  if(Fm.t==="tr"){const a=+Fm.a;if(!a){toast("Впиши сумму");return}if(Fm.acc===Fm.to){toast("Выбери разные счета");return}
    tx={d:Fm.d,t:"tr",from:Fm.acc,to:Fm.to,a}}
  else{const c=catOf(Fm.c);
    Fm.lines.forEach(l=>{if(!l.c){l.c="other";l.s="Прочее";l.n=l.raw||"Прочее"}});
    let lines=Fm.lines.filter(l=>+l.a>0).map(l=>{const o={c:l.c,s:l.s||"Без уточнения",n:l.n||l.raw||l.s||"Без уточнения",a:+l.a};if(l.raw)o.raw=l.raw;if(l.f)o.f=l.f;if(l.u){o.u=l.u;const q=+String(l.q).replace(",",".");if(q)o.q=q}return o});
    let a=lines.reduce((s,l)=>s+l.a,0);
    if(!lines.length){if(Fm.lines.length){toast("Впиши суммы позиций");return}a=+Fm.a;if(!a||!Fm.c){toast("Впиши сумму");return}
      lines=[{c:Fm.c,s:Fm.s||(c.s.length===1?c.s[0].n:"Без уточнения"),n:Fm.s||c.n,a}]}
    const cs=[...new Set(lines.map(l=>l.c))];
    tx={d:Fm.d,t:Fm.t,c:cs.length===1?cs[0]:"mixed",a,acc:Fm.acc,lines};
    if(Fm.note.trim()){tx.note=Fm.note.trim();if(lines.length>1)tx.receipt=tx.note}
    if(Fm.t==="exp"&&Fm.foodOn&&lines.some(l=>l.f&&EAT_CATS.includes(l.c)))tx.foodLink=true;
    if(Fm.qr)tx.qr=Fm.qr;
    if(Fm.loan&&tx.c==="credit")tx.loan=Fm.loan;
    if(Fm.kin)tx.kaspi=true;
  }
  if(Fm.edit){const old=M.tx.find(x=>x.id===Fm.edit);unlinkFood(old);tx.id=Fm.edit;if(old.kav!=null){tx.kav=old.kav;tx.kt=old.kt}if(old.kaspi)tx.kaspi=true;M.tx[M.tx.indexOf(old)]=tx}
  else{tx.id=M.nid++;M.tx.push(tx)}
  if(tx.t==="exp"){updatePrices(tx);linkFood(tx);if(window.rememberReceipt)rememberReceipt(tx,Fm.lines.filter(l=>l.raw&&l.c!=="other"))}
  if(Fm.kin&&window.kaspiDone)kaspiDone(Fm.kin,tx);
  save();closeSheet();sub="rec";openTx=null;per=curPer();
  const idx=starts().findIndex((s,i,a)=>tx.d>=s&&(i===a.length-1||tx.d<a[i+1]));if(idx>=0)per=idx;
  if(cust&&(tx.d<cust.a||tx.d>cust.b))cust=null;
  renderMoney();pushNotif();
  if(tx.loan){const L=M.loans.find(x=>x.id===tx.loan);if(L){const p=loanPaid(L);toast(p>=L.total?"«"+L.n+"» закрыт: все "+L.total+" платежей внесены":"Платёж "+p+" из "+L.total+". Осталось "+(L.total-p));return}}
  toast(Fm.edit?"Изменено":tx.foodLink?"Записано в деньги и в питание":"Записано");
}
// быстрый ввод: «пиво 900 чипсы 600», «вчера такси 1800», «донер 2к»
// Разбор фразы: «куриная грудка 200 г 500 тенге, одна палка колбасы 500»
// число + единица (г, кг, л, мл, шт, пачка, палка, бутылка) — количество; число с «тенге» или без единицы — сумма.
const NUMW={"один":1,"одна":1,"одно":1,"одну":1,"два":2,"две":2,"три":3,"четыре":4,"пять":5,"шесть":6,"семь":7,"восемь":8,"девять":9,"десять":10,
  "полтора":1.5,"полторы":1.5,"половина":0.5,"половину":0.5,"сто":100,"двести":200,"триста":300,"пятьсот":500,"тысяча":1000,"тысячу":1000};
const UNIT=[[/^(г|гр|грамм[а-яa-z]*)$/,"g"],[/^(кг|кило[а-яa-z]*)$/,"kg"],[/^(мл|миллилитр[а-яa-z]*)$/,"ml"],[/^(л|литр[а-яa-z]*)$/,"l"],
  [/^(шт|штук[а-яa-z]*|штуки|пач[а-яa-z]*|палк[а-яa-z]*|бутыл[а-яa-z]*|банк[а-яa-z]*|упаков[а-яa-z]*|блок[а-яa-z]*|бутылоч[а-яa-z]*)$/,"pcs"]];
const CUR=/^(тенге|тэнге|теңге|тг|₸|тенг)$/;
// разговорные названия → как в категориях («картошка» → «картофель», «булка» → «булочки»)
const QSYN={"картошка":"картофель","картошки":"картофель","картоху":"картофель","булка":"булочки","булку":"булочки","булки":"булочки","колбаску":"колбаса","минералка":"вода","минералку":"вода","газировку":"газировка","сигареты":"сигареты","яйца":"яйца"};
const FILL=new Set(["и","за","на","по","купил","купила","взял","взяла","ещё","еще","потом","а","это","вот"]);
const unitOf=w=>{for(const [re,u] of UNIT)if(re.test(w))return u;return null};
function qtyIn(u,q){if(!q||!u)return"";const v=q.v;
  if(u==="кг")return q.u==="g"?v/1000:q.u==="kg"?v:"";
  if(u==="л")return q.u==="ml"?v/1000:q.u==="l"?v:q.u==="pcs"?v*0.5:""; // бутылка ≈ 0,5 л
  if(u==="шт")return q.u==="pcs"?v:"";return""}
function parseQuick(text,commitAll){
  // «2.700» / «12.500» из голоса — это тысячи, а не 2,7 (если дальше не кг/л/г)
  let t=" "+norm(text).replace(/(\d{1,3})(?:[.,](\d{3}))+(?!\d|[.,]\d)(?!\s*(?:кг|г(?![а-яё])|гр|л(?![а-яё])|мл|литр|кило|грам))/g,m=>m.replace(/[.,]/g,""))
    .replace(/[,;!?]+(?=\s|$)/g," ").replace(/(\d),(\d)/g,"$1.$2")+" ";
  if(/\sпозавчера\s/.test(t)){Fm.d=addDays(today(),-2);t=t.replace(/\sпозавчера\s/," ")}
  else if(/\sвчера\s/.test(t)){Fm.d=addDays(today(),-1);t=t.replace(/\sвчера\s/," ")}
  t=t.replace(/\sпол\s?кило[а-я]*\s/g," 0.5 кг ").replace(/\sпол\s?литр[а-я]*\s/g," 0.5 л ");
  for(let k=0;k<2;k++)t=t.replace(/\s([а-я]+)\s/g,(m,w)=>NUMW[w]!=null?" "+NUMW[w]+" ":m);
  t=t.replace(/(\d+(?:\.\d+)?)\s*(к|тыс[а-я]*)(?=\s)/g,(m,a)=>String(Math.round(parseFloat(a)*1000)));
  t=t.replace(/(\d)\s(?=\d{3}(?!\d))/g,"$1").replace(/(\d)(тенге|тг|₸|кг|г|л|мл|шт)(?=\s)/g,"$1 $2");
  const tok=t.trim().split(/\s+/);let words=[],q=null,added=[],lastI=-1,pendA=null;
  const close=a=>{const ws=words.filter(w=>!FILL.has(w)&&!/^\d/.test(w));let f=null;
    if(!ws.length){pendA=a;words=[];return}
    const W=ws.map(w=>QSYN[w]||Object.keys(QSYN).find(k=>k.endsWith("*")&&w.startsWith(k.slice(0,-1)))&&QSYN[Object.keys(QSYN).find(k=>k.endsWith("*")&&w.startsWith(k.slice(0,-1)))]||w);
    // на вес (кг/г) — скорее продукт из магазина, а не блюдо из кафе
    const pick=L=>{if(!L.length)return null;const wq=q&&/^(кг|г|л|мл)$/.test(q.u);return (wq&&L.find(x=>x.it.u&&x.c==="food"))||(Fm.t==="exp"&&L.find(x=>x.c==="food"))||L[0]};
    for(let k=0;k<W.length&&!f;k++)f=pick(findItems(W.slice(k).join(" "),Fm.t));
    if(!f)for(let k=W.length;k>0&&!f;k--)f=pick(findItems(W.slice(0,k).join(" "),Fm.t));
    if(f){addLine(f.c,f.s,f.it);const l=Fm.lines[Fm.lines.length-1];l.a=String(Math.round(a));const qq=qtyIn(f.it.u,q);if(qq!=="")l.q=String(qq)}
    else if(ws.length)Fm.lines.push({raw:ws.join(" "),a:String(Math.round(a)),q:""});
    if(ws.length||f)added.push(Fm.lines[Fm.lines.length-1]);words=[];q=null};
  for(let i=0;i<tok.length;i++){const w=tok[i];
    if(/^\d+(\.\d+)?$/.test(w)){const v=parseFloat(w),u=unitOf(tok[i+1]||"");
      if(u){q={v,u};i++;continue}
      if(CUR.test(tok[i+1]||""))i++;
      close(v);lastI=i;continue}
    if(CUR.test(w))continue;
    words.push(w)}
  if(pendA!=null&&words.length){close(pendA);pendA=null;lastI=tok.length}
  return{added:added.length,lines:added,rest:commitAll?"":tok.slice(lastI+1).join(" ")};
}
const fmtLine=l=>(l.n||("«"+l.raw+"» — выбери позицию"))+(l.q?" "+String(l.q).replace(".",",")+" "+(l.u||""):"")+" — "+fmt(+l.a||0)+" ₸";
function quickCommit(text,voice){grab();const r=parseQuick(text+" ",true);
  const un=Fm.lines.findIndex(l=>!l.c);Fm.assign=un>=0?un:null;
  Fm.msg=(voice?"Услышал: «"+text+"»\n":"")+(r.added?"Записал: "+r.lines.map(fmtLine).join("; "):"Не нашёл, что записать. Скажи так: «грудка 200 грамм 500 тенге».");
  Fm.q="";renderSheet()}
sheet.addEventListener("input",e=>{
  const t=e.target;
  if(t.dataset.la!=null){Fm.lines[+t.dataset.la].a=t.value.replace(/\D/g,"");const tot=$("tot");if(tot)tot.textContent=fmt(lineSum())+" ₸";return}
  if(t.dataset.lq!=null){Fm.lines[+t.dataset.lq].q=t.value;return}
  if(t.id==="qtext"){grab();Fm.q=t.value;const pos=t.selectionStart;renderSheet();const q=$("qtext");q.focus();q.setSelectionRange(pos,pos)}
});
sheet.addEventListener("keydown",e=>{if(e.target.id==="qtext"&&e.key==="Enter"&&/\d/.test(e.target.value))quickCommit(e.target.value,false)});
sheet.addEventListener("click",e=>{const b=e.target.closest('[data-x="qadd"]');if(b){const v=$("qtext").value;if(/\d/.test(v))quickCommit(v,false)}});
// голос: Android возвращает распознанный текст
window.onVoice=function(text){
  if(sheet.hidden)openSheet();
  if(!text){toast("Не расслышал, попробуй ещё раз");return}
  quickCommit(text,true);
};
// ---------- кредиты и рассрочки ----------
let loanEdit=null,loanArm=false,showClosed=false;
const loanPaid=L=>(+L.paid0||0)+M.tx.filter(t=>t.loan===L.id).length;
const loanActive=L=>loanPaid(L)<L.total;
function nextDue(L){const t=parse(today());let d=new Date(t.getFullYear(),t.getMonth(),Math.min(L.day||1,28),12);
  const last=M.tx.filter(x=>x.loan===L.id).map(x=>x.d).sort().pop();
  // если платёж уже внесён в этом цикле (за 20 дней до даты или позже) — следующий месяц
  if(last&&parse(last)>=new Date(d.getTime()-20*864e5))d.setMonth(d.getMonth()+1);
  // платежей в приложении ещё нет и дата прошла — считаем, что этот месяц оплачен до начала учёта
  else if(!last&&d<t)d.setMonth(d.getMonth()+1);
  return keyOf(d)}
function dueBanner(){
  const t=today();return M.loans.filter(loanActive).map(L=>{const d=nextDue(L),days=Math.round((parse(d)-parse(t))/864e5);
    if(days>3)return"";const late=days<0;
    return '<div class="due'+(late?" late":"")+'"><span><b>'+esc(L.n)+"</b><br>"+(late?"Платёж просрочен с "+short(d):days===0?"Платёж сегодня":"Платёж "+short(d)+", через "+days+" дн.")+" · "+fmt(L.pay)+' ₸</span><button type="button" class="chipbtn" data-pay="'+L.id+'">Внести</button></div>'}).join("")}
function loansCard(){
  const act=M.loans.filter(loanActive),cl=M.loans.filter(L=>!loanActive(L));
  let h='<div class="card"><div class="label">Кредиты и рассрочки</div>';
  if(!M.loans.length)h+='<div class="muted">Добавь кредит или рассрочку: сколько платить в месяц, сколько всего платежей и сколько уже внесено. Приложение будет считать остаток и напоминать о дате.</div>';
  const debt=act.reduce((s,L)=>s+(L.total-loanPaid(L))*L.pay,0),month=act.reduce((s,L)=>s+ +L.pay,0);
  if(act.length)h+='<div class="kv"><span>Осталось выплатить</span><b>'+fmt(debt)+' ₸</b></div><div class="kv"><span>В месяц</span><b>'+fmt(month)+" ₸</b></div>";
  h+=act.map(L=>{const p=loanPaid(L),d=nextDue(L);
    return '<div class="loan"><div class="loanh"><b>'+esc(L.n)+'</b><span>'+fmt(L.pay)+' ₸</span></div>'+
     '<div class="muted">'+(L.type==="inst"?"Рассрочка":"Кредит")+" · платёж "+(p+1)+" из "+L.total+" · следующий "+short(d)+" · осталось "+fmt((L.total-p)*L.pay)+" ₸</div>"+
     '<div class="mbar2"><i style="width:'+(p/L.total*100)+'%;background:var(--ok)"></i></div>'+
     '<div style="display:flex;gap:8px"><button type="button" class="chipbtn" data-pay="'+L.id+'">Внести платёж</button><button type="button" class="chipbtn" data-ledit="'+L.id+'">Изменить</button></div></div>'}).join("");
  h+='<button type="button" class="chipbtn" data-ledit="new">+ Кредит или рассрочка</button>';
  if(cl.length){h+='<button type="button" class="chipbtn" data-lclosed="1">Закрытые: '+cl.length+(showClosed?" ▴":" ▾")+"</button>";
    if(showClosed)h+=cl.map(L=>'<div class="loan"><div class="loanh"><b>'+esc(L.n)+'</b><span class="pos">закрыт</span></div><div class="muted">'+L.total+" платежей по "+fmt(L.pay)+' ₸</div><button type="button" class="chipbtn" data-ledit="'+L.id+'">Изменить</button></div>').join("")}
  return h+"</div>";
}
function loanForm(){
  const L=loanEdit==="new"?{n:"",type:"credit",pay:"",total:"",paid0:0,day:M.sal.from}:M.loans.find(x=>x.id===loanEdit)||{};
  const pd=loanEdit==="new"?0:M.tx.filter(t=>t.loan===L.id).length;
  return '<div class="edhead"><button type="button" class="chipbtn" data-sub="rep">‹ Назад</button><b>'+(loanEdit==="new"?"Новый кредит":"Кредит")+"</b></div>"+
   '<div class="card"><label class="fl">Название<input class="inp" id="lN" placeholder="Kaspi Red — телефон, кредит Halyk…" value="'+esc(L.n)+'"></label>'+
   '<div class="seg small" role="group">'+[["credit","Кредит"],["inst","Рассрочка"]].map(([k,n])=>'<button type="button" data-ltype="'+k+'" aria-pressed="'+(L.type===k)+'">'+n+"</button>").join("")+"</div>"+
   '<div class="fgrid" style="grid-template-columns:1fr 1fr"><label>Платёж в месяц, ₸<input class="inp" id="lP" inputmode="numeric" value="'+esc(L.pay)+'"></label><label>Всего платежей<input class="inp" id="lT" inputmode="numeric" value="'+esc(L.total)+'"></label>'+
   '<label>Уже оплачено до учёта<input class="inp" id="l0" inputmode="numeric" value="'+esc(L.paid0||0)+'"></label><label>Число платежа<input class="inp" id="lD" inputmode="numeric" value="'+esc(L.day||"")+'"></label></div>'+
   (pd?'<div class="muted">Записано платежей в приложении: '+pd+". Они считаются сами.</div>":"")+
   '<div class="muted" id="lSum"></div>'+
   '<button type="button" class="save" data-lsave="1">Сохранить</button>'+
   (loanEdit!=="new"?'<button type="button" class="chipbtn danger" data-ldel="1">'+(loanArm?"Нажми ещё раз: удалить кредит":"Удалить кредит")+"</button>":"")+"</div>";
}
let lType="credit";
function readLoan(){const g=id=>$(id).value.trim(),n=x=>+String(x).replace(/\D/g,"")||0;
  return{n:g("lN"),pay:n(g("lP")),total:n(g("lT")),paid0:n(g("l0")),day:Math.min(28,Math.max(1,n(g("lD"))||1)),type:lType}}
root.addEventListener("input",e=>{if(!["lP","lT","l0"].includes(e.target.id))return;const L=readLoan();
  $("lSum").textContent=L.pay&&L.total?"Всего по кредиту "+fmt(L.pay*L.total)+" ₸ · осталось "+fmt(Math.max(0,L.total-L.paid0)*L.pay)+" ₸ ("+Math.max(0,L.total-L.paid0)+" платежей)":""});
root.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const d=b.dataset;
  if(d.pay){const L=M.loans.find(x=>x.id===+d.pay);if(!L)return;openSheet();fillLoan(L);renderSheet();return}
  if(d.ledit){loanEdit=d.ledit==="new"?"new":+d.ledit;loanArm=false;const L=M.loans.find(x=>x.id===loanEdit);lType=L?L.type:"credit";sub="loan";renderMoney();window.scrollTo(0,0);return}
  if(d.lclosed){showClosed=!showClosed;renderMoney();return}
  if(d.ltype){lType=d.ltype;root.querySelectorAll("[data-ltype]").forEach(x=>x.setAttribute("aria-pressed",x.dataset.ltype===lType));return}
  if(d.lsave){const L=readLoan();if(!L.n||!L.pay||!L.total){toast("Заполни название, платёж и количество платежей");return}
    if(loanEdit==="new"){L.id=M.nid++;M.loans.push(L)}else Object.assign(M.loans.find(x=>x.id===loanEdit),L);
    sub="rep";rerender();toast("Сохранено");return}
  if(d.ldel){if(!loanArm){loanArm=true;renderMoney();setTimeout(()=>{loanArm=false},4000);return}
    M.loans=M.loans.filter(x=>x.id!==loanEdit);M.tx.forEach(t=>{if(t.loan===loanEdit)delete t.loan});sub="rep";rerender();toast("Кредит удалён, платежи остались в записях");return}
});

// ---------- виджет в шторке и быстрые действия ----------
function pushNotif(){
  if(!(window.Android&&Android.notify))return;
  if(M.notif===false){try{Android.notifyOff()}catch(e){}return}
  const t=today();let e=0,i=0;M.tx.forEach(x=>{if(x.d!==t)return;if(x.t==="exp")e+=x.a;if(x.t==="inc")i+=x.a});
  const tail=sh=>{const a=allowPerDay(sh),w=allowPerDay(sh,true);return " · на счетах "+fmt(onAcc())+" ₸"+(a!=null?" · по бюджету ≈"+fmt(a)+" ₸/день":"")+(M.budget&&w!=null?" · всего денег ≈"+fmt(w)+" ₸/день":"")};
  const txt=(e||i?"Сегодня −"+fmt(e)+(i?" · +"+fmt(i):"")+" ₸":"Сегодня без трат")+tail(0);
  const tp=parse(t),h=S.dayEnd==null?4:+S.dayEnd,at=new Date(tp.getFullYear(),tp.getMonth(),tp.getDate()+1,h,0,30).getTime();
  try{if(Android.notify2)Android.notify2(txt,"Новый день, трат пока нет"+tail(1),at);else Android.notify(txt)}catch(err){}
}
// сколько можно тратить в день до зарплаты: остаток бюджета (или деньги на счетах, что меньше) / дни; sh=1 — завтра
function allowPerDay(sh,all){
  const P=periodOf(curPer());if(!P||!P.open)return null;const s=sums(P);
  const t=parse(today());t.setDate(t.getDate()+(sh||0));
  const nx=new Date(t.getFullYear(),t.getMonth()+(t.getDate()>=M.sal.from?1:0),M.sal.from,12);
  const left=Math.max(1,Math.round((nx-t)/864e5));const bl=M.budget&&!all?Math.min(M.budget-s.e,onAcc()):onAcc();
  return bl>0?bl/left:null;
}
setTimeout(pushNotif,1500);
{const pr=window.onAppResume;window.onAppResume=function(){try{pr&&pr()}catch(e){}pushNotif()}}
// текст из «Поделиться» (заметка: «Колбаса 2700 / Картошка 1кг 350 …») — каждая строка как позиция
window.onShareText=function(text){
  showPage("money");openSheet();setType("exp");
  const t=String(text).split(/\r?\n/).map(x=>x.trim()).filter(x=>/\d/.test(x)).join(", ");
  if(!t){renderSheet();toast("В тексте нет сумм");return}
  quickCommit(t,false);
};
window.onQuick=function(k){
  showPage("money");
  if(k==="qr"){try{Android.scanQR()}catch(e){}return}
  if(k==="inc"||k==="exp"){openSheet();if(k==="inc")setType("inc");renderSheet()}
};
setTimeout(pushNotif,1500);

// ---------- чеки: API для receipt.js ----------
const hasQR=()=>!!(window.Android&&Android.scanQR);
const hasPhoto=()=>!!(window.Android&&Android.photo);
window.MoneyAPI={openPrefilled(o){openSheet();setType(o.t);
    if(o.c){Fm.c=o.c;Fm.s=o.s||null;if(o.n)Fm.lines=[{c:o.c,s:o.s,n:o.n,a:String(o.a)}];else Fm.a=String(o.a)}else Fm.a=String(o.a);
    if(o.acc)Fm.acc=o.acc;if(o.d)Fm.d=o.d;Fm.note=o.note||"";Fm.kin=o.kin;Fm.msg=o.msg||null;Fm.sug=o.sug||null;Fm.foodOn=false;renderSheet()},
  setTab(x){sub=x;renderMoney()},accOf,today,M,svg,PALETTE,save,rerender:()=>{save();if(!$("pageMoney").hidden)renderMoney()},catOf,findItems,items:t=>itemIndex().filter(x=>x.t===t),
  loading(msg){Fm={t:"exp",c:null,s:null,lines:[],acc:M.acc[M.acc.length>1?1:0].id,to:M.acc[0].id,a:"",d:today(),foodOn:true,q:"",note:"",own:null,busy:msg};
    sheet.hidden=false;document.body.style.overflow="hidden";renderSheet()},
  openReceipt(o){if(sheet.hidden)this.loading("");Fm.busy=null;Fm.lines=o.lines;Fm.d=o.d||Fm.d;Fm.note=o.note||"";Fm.qr=o.qr;Fm.msg=o.msg;Fm.foodOn=false;Fm.link=o.link||null;
    if(o.edit)Fm.edit=o.edit;if(o.acc)Fm.acc=o.acc;
    if(!o.lines.length&&o.total)Fm.a=String(Math.round(o.total));
    const un=o.lines.findIndex(l=>!l.c);Fm.assign=un>=0?un:null;if(o.lines[0]&&o.lines[0].c)Fm.c=o.lines[0].c;renderSheet()}};
window.addEventListener("DOMContentLoaded",()=>{if(!$("pageMoney").hidden)renderMoney()});
// кнопка «Назад» телефона: сначала закрываем открытое внутри «Денег»
MoneyAPI.back=function(){
  if(!sheet.hidden){closeSheet();return true}
  if(ppOpen){ppOpen=false;renderMoney();return true}
  if(sub==="edit"||sub==="loan"){sub="rep";renderMoney();return true}
  if(sub==="where"&&(Wv.item||Wv.fc||Wv.fs||Wv.q)){Wv.item=null;if(Wv.fs)Wv.fs=null;else Wv.fc=null;Wv.q="";renderMoney();return true}
  if(sub!=="rec"){sub="rec";renderMoney();return true}
  if(openTx!=null){openTx=null;renderMoney();return true}
  return false};
sheet.addEventListener("click",e=>{const b=e.target.closest("[data-sug]");if(!b||!Fm.sug)return;e.stopPropagation();
  const g=Fm.sug[+b.dataset.sug],amt=(Fm.lines[0]&&Fm.lines[0].a)||Fm.a;Fm.c=g.c;Fm.s=g.s||null;
  if(g.n){Fm.lines=[{c:g.c,s:g.s,n:g.n,a:String(amt)}];Fm.a=""}else{Fm.lines=[];Fm.a=String(amt)}renderSheet()},true);
document.addEventListener("click",e=>{
  const ed=e.target.closest("[data-acced]");if(ed&&!e.target.closest("button")){accEd=accEd===ed.dataset.acced?null:ed.dataset.acced;renderMoney();const f=$("accNow");if(f){f.focus();f.select()}return}
  const sv=e.target.closest("[data-accsave]");if(sv){const a=M.acc.find(x=>x.id===sv.dataset.accsave),v=+String($("accNow").value).replace(/[^\d-]/g,"");
    if(a&&!isNaN(v)){a.start=v;a.sd=today();a.sid=M.nid-1;accEd=null;save();renderMoney();toast(a.n+": "+fmt(v)+" ₸")}return}
  const b=e.target.closest("[data-kfix]");if(!b)return;
  const a=M.acc.find(x=>x.id===b.dataset.kfix),r=a&&kRef(a);if(!r)return;
  a.start=(+a.start||0)+r.diff;save();renderMoney();toast("Остаток "+a.n+": "+fmt(accBal(a))+" ₸")});
})();
