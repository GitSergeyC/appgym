// Деньги: операции, чеки из нескольких позиций, периоды от зарплаты, «Куда ушло», отчёты,
// редактор категорий и счетов, связь с питанием (цены продуктов, еда вне дома).
(function(){
const {svg}=MCAT;
const clone=o=>JSON.parse(JSON.stringify(o));
const M=S.money=S.money||{};
if(!M.cats)M.cats={exp:clone(MCAT.EXP),inc:clone(MCAT.INC)};
if(!M.acc)M.acc=[{id:"cash",n:"Наличные",i:"cash",c:"#6cd39a",start:0},{id:"kaspi",n:"Kaspi Gold",i:"card",c:"#f08a7e",start:0}];
M.tx=M.tx||[];M.budget=M.budget||0;M.sal=M.sal||{from:15,to:18};M.nid=M.nid||1;
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
const today=()=>keyOf(new Date());
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
function cmpPer(P){const pp=periodOf(P.i-1);if(!pp)return null;if(!P.open)return pp;
  const n=Math.round((parse(today())-parse(P.a))/864e5);return Object.assign({},pp,{b:addDays(pp.a,Math.min(n,Math.round((parse(pp.b)-parse(pp.a))/864e5))),cut:n+1})}
const inPer=(t,P)=>P&&t.d>=P.a&&t.d<=P.b;
function sums(P){let e=0,i=0;M.tx.forEach(t=>{if(!inPer(t,P))return;if(t.t==="exp")e+=t.a;if(t.t==="inc")i+=t.a});return{e,i,b:i-e}}
const expLines=P=>{const r=[];M.tx.forEach(t=>{if(t.t==="exp"&&inPer(t,P))(t.lines||[]).forEach(l=>r.push(Object.assign({d:t.d},l)))});return r};
function accBal(a){let v=+a.start||0;M.tx.forEach(x=>{if(x.acc===a.id){if(x.t==="exp")v-=x.a;if(x.t==="inc")v+=x.a}if(x.t==="tr"){if(x.from===a.id)v-=x.a;if(x.to===a.id)v+=x.a}});return v}

// ---------- состояние экрана ----------
let per=null,sub="rec",openTx=null,delArm=null;
const Wv={lvl:"cat",fc:null,fs:null,q:"",item:null};
const root=$("money");
const fab=document.createElement("button");fab.className="mfab";fab.type="button";fab.setAttribute("aria-label","Добавить операцию");
fab.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
document.body.appendChild(fab);fab.hidden=true;fab.onclick=()=>openSheet();

window.renderMoney=function(){
  if(per==null||!periodOf(per))per=curPer();
  fab.hidden=$("pageMoney").hidden||sub==="edit";
  if(sub==="edit"){root.innerHTML=editor();return}
  const P=periodOf(per);
  root.innerHTML=head(P)+(sub==="rec"?records(P):sub==="where"?where(P):reports(P));
};
const rerender=()=>{save();renderMoney()};
["navTrain","navFood","navStats","navBase"].forEach(id=>$(id).addEventListener("click",()=>{fab.hidden=true}));

// ---------- шапка ----------
function head(P){
  const s=sums(P),last=starts().length-1;let daily="";
  if(P.open){const t=parse(today()),nx=new Date(t.getFullYear(),t.getMonth()+(t.getDate()>=M.sal.from?1:0),M.sal.from,12);
    const left=Math.max(1,Math.round((nx-t)/864e5)),mon=nx.toLocaleDateString("ru-RU",{month:"short"}).replace(".","");
    daily='<div class="daily"><span>До зарплаты ≈ '+left+" дн. (ждём "+M.sal.from+"–"+M.sal.to+" "+mon+')</span><b>'+(s.b>0?fmt(s.b/left)+" ₸/день":"—")+"</b></div>"}
  else daily='<div class="daily"><span>Период закрыт</span><b class="'+(s.b>=0?"pos":"neg")+'">'+(s.b>=0?"осталось ":"перерасход ")+fmt(Math.abs(s.b))+" ₸</b></div>";
  const hasSal=M.tx.some(isSalaryTx);
  return '<div class="hero"><div class="pnav"><button type="button" data-per="-1" aria-label="Прошлый период"'+(per>0?"":" disabled")+'>‹</button><div><b>'+short(P.a)+" – "+(P.open?"сейчас":short(P.b))+'</b><span>'+(hasSal?"от зарплаты "+short(P.a):"с "+short(P.a)+" · запиши зарплату, и период начнётся с неё")+(P.open&&hasSal?" · идёт "+(Math.round((parse(today())-parse(P.a))/864e5)+1)+"-й день":"")+'</span></div><button type="button" data-per="1" aria-label="Следующий период"'+(per<last?"":" disabled")+">›</button></div>"+
    '<div class="nums"><div><span>Расходы</span><b>'+fmt(s.e)+'</b></div><div><span>Доходы</span><b>'+fmt(s.i)+'</b></div><div><span>Остаток</span><b class="'+(s.b>=0?"pos":"neg")+'">'+fmt(s.b)+"</b></div></div>"+daily+"</div>"+
    '<div class="seg" role="group">'+[["rec","Записи"],["where","Куда ушло"],["rep","Отчёты"]].map(([k,n])=>'<button type="button" data-sub="'+k+'" aria-pressed="'+(sub===k)+'">'+n+"</button>").join("")+"</div>";
}

// ---------- записи ----------
function records(P){
  const by={};M.tx.forEach(t=>{if(inPer(t,P))(by[t.d]=by[t.d]||[]).push(t)});
  const days=Object.keys(by).sort().reverse();
  if(!days.length)return '<div class="empty">Записей пока нет.<br>Нажми «+», чтобы добавить расход, доход или перевод. Начни с зарплаты: с неё начинается учётный месяц.</div>';
  return days.map(d=>{let e=0,i=0;by[d].forEach(t=>{if(t.t==="exp")e+=t.a;if(t.t==="inc")i+=t.a});
    return '<div class="daycard"><div class="dayh"><b>'+short(d)+' <span style="font-weight:400">'+wday(d)+"</span></b><span>"+(e?"−"+fmt(e):"")+(e&&i?" · ":"")+(i?'<span class="pos">+'+fmt(i)+"</span>":"")+"</span></div>"+
      by[d].slice().reverse().map(txRow).join("")+"</div>"}).join("");
}
function txRow(t){
  const isOpen=openTx===t.id;
  const tools=isOpen?'<div class="txtools"><button type="button" data-edit="'+t.id+'">Изменить</button><button type="button" class="danger" data-del="'+t.id+'">'+(delArm===t.id?"Точно удалить?":"Удалить")+"</button></div>":"";
  if(t.t==="tr")return '<div class="tx" data-tx="'+t.id+'"><div class="ic" style="background:var(--surface2);color:var(--fg)">'+svg("swap")+'</div><div class="nm"><b>Перевод</b><small>'+esc(accOf(t.from).n)+" → "+esc(accOf(t.to).n)+'</small></div><div class="am">'+fmt(t.a)+"</div></div>"+tools;
  const c=catOf(t.c),ln=t.lines||[];
  const cn=t.c==="mixed"?[...new Set(ln.map(l=>catOf(l.c).n))].join(", "):"";
  const det=(t.note?t.note+" · ":"")+(t.c==="mixed"?cn+" · "+ln.length+" поз.":ln.length>1?ln.length+" поз.: "+ln.slice(0,3).map(x=>x.n.toLowerCase()).join(", ")+(ln.length>3?"…":""):ln.length?ln[0].s+" › "+ln[0].n:"");
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
  const prevP=cmpPer(P);let L=expLines(P),Lp=prevP?expLines(prevP):[];
  let h='<div class="msearch"><span aria-hidden="true">⌕</span><input id="wq" type="text" placeholder="Найти: пиво, такси, грудка…" value="'+esc(Wv.q)+'" autocomplete="off">'+(Wv.q?'<button type="button" data-wq="x" aria-label="Очистить">×</button>':"")+"</div>";
  if(!L.length&&!Wv.q)return h+'<div class="empty">В этом периоде расходов пока нет.</div>';
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
    h+='<div class="card"><div class="donutwrap"><svg class="donut" viewBox="0 0 140 140" role="img" aria-label="Расходы по категориям">'+arcs+'<text x="70" y="66" text-anchor="middle" class="dl">расходы</text><text x="70" y="84" text-anchor="middle" class="dv">'+fmt(total)+"</text></svg>"+
      '<div class="legend">'+rows.slice(0,5).map(x=>'<div><i style="background:'+catOf(x.c).c+'"></i><span>'+esc(catOf(x.c).n)+"</span><span>"+Math.round(x.a/total*100)+"%</span></div>").join("")+"</div></div></div>"}
  h+='<div class="card"><div class="label">'+(lvl==="cat"?"На что ушло больше всего":lvl==="sub"?"Подкатегории":"Позиции")+" · "+fmt(total)+" ₸</div>"+
    '<div class="muted">'+(lvl==="item"?"Нажми на позицию: история покупок и цена за единицу.":"Нажми на строку, чтобы провалиться глубже.")+(prevP?(prevP.cut?" Стрелка — сравнение с первыми "+prevP.cut+" днями прошлого периода.":" Стрелка — сравнение с прошлым периодом."):"")+'</div><div class="rank">'+
    rows.map((r,i)=>{const c=catOf(r.c),p=prev[r.k];let d="";
      if(prevP){if(p==null)d='<small class="neg">новое</small>';else{const ch=Math.round((r.a-p)/p*100);d='<small class="'+(ch>5?"neg":ch<-5?"pos":"muted")+'">'+(ch>5?"▲ ":ch<-5?"▼ ":"")+Math.abs(ch)+"%</small>"}}
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
   (prevP?'<div class="kv"><span>'+(prevP.cut?"Те же "+prevP.cut+" дн. прошлого периода":"Прошлый период")+'</span><b class="'+(a>ap?"neg":"pos")+'">'+fmt(ap)+" ₸ "+(ap?(a>ap?"▲ ":"▼ ")+Math.abs(Math.round((a-ap)/ap*100))+"%":"")+"</b></div>":"")+
   '<div class="hist">'+L.slice().sort((x,y)=>x.d<y.d?1:-1).slice(0,15).map(l=>"<div><span>"+short(l.d)+" · "+esc(l.n)+(l.q?" · "+l.q+" "+(l.u||""):"")+"</span><b>"+fmt(l.a)+"</b></div>").join("")+(L.length>15?'<div><span>и ещё '+(L.length-15)+"</span></div>":"")+"</div></div>";
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
  h+='<div class="card"><div class="label">Еда и привычки</div>'+
   '<div class="kv"><span>Продукты домой</span><b>'+fmt(sum(l=>l.c==="food"&&l.s!=="Снеки и закуски"))+'</b></div>'+
   '<div class="kv"><span>Кафе, донеры, кофе, доставка</span><b>'+fmt(sum(l=>l.c==="cafe"))+'</b></div>'+
   '<div class="kv"><span>Алкоголь и закуски</span><b>'+fmt(sum(l=>l.s==="Алкоголь"||l.s==="Снеки и закуски"))+'</b></div>'+
   '<div class="kv"><span>Сигареты</span><b>'+fmt(sum(l=>l.s==="Сигареты"))+'</b></div></div>'+
   '<div class="card"><div class="label">Счета</div>'+M.acc.map(a=>'<div class="accrow"><div class="ic" style="background:'+a.c+'">'+svg(a.i)+"</div><span>"+esc(a.n)+"</span><b>"+fmt(accBal(a))+" ₸</b></div>").join("")+"</div>"+
   '<button type="button" class="bigbtn ghost" data-sub="edit">Категории, счета и настройки</button>';
  return h;
}

// ---------- редактор категорий, счетов, настроек ----------
let edT="exp",edOpen=null,edArm=null;
const PALETTE=["#6cd39a","#5ec4b6","#e88fb0","#c9a27e","#7fb2f0","#f08a7e","#9ad06b","#b3b86a","#a99bf0","#f0a6d8","#8c9cf2","#f0c46a","#6fc3e8","#f0a35e","#d9a5e8","#78d0c0","#d6b48c","#9fb3c8"];
function editor(){
  const cats=M.cats[edT];
  let h='<div class="edhead"><button type="button" class="chipbtn" data-sub="rep">‹ Назад</button><b>Настройки денег</b></div>'+
   '<div class="card"><div class="label">Учётный месяц</div><div class="muted">Период начинается в день, когда записана зарплата (кроме аванса). Окно зарплаты нужно для подсказки «до зарплаты N дней».</div>'+
   '<div class="fgrid" style="grid-template-columns:1fr 1fr 1fr"><label>Зарплата с<input class="inp" id="salF" inputmode="numeric" value="'+M.sal.from+'"></label><label>по число<input class="inp" id="salT" inputmode="numeric" value="'+M.sal.to+'"></label><label>Бюджет, ₸<input class="inp" id="bud" inputmode="numeric" placeholder="нет" value="'+(M.budget||"")+'"></label></div></div>'+
   '<div class="card"><div class="label">Счета</div><div class="muted">Начальный остаток — сколько было на счёте до первой записи.</div>'+
   M.acc.map((a,i)=>'<div class="fgrid" style="grid-template-columns:1fr 120px 36px;align-items:end"><label>Название<input class="inp" data-an="'+i+'" value="'+esc(a.n)+'"></label><label>Начальный, ₸<input class="inp" data-as="'+i+'" inputmode="numeric" value="'+(a.start||0)+'"></label><button type="button" class="xbtn" data-adel="'+i+'" aria-label="Удалить счёт">'+(edArm==="a"+i?"?":"×")+"</button></div>").join("")+
   '<button type="button" class="chipbtn" data-aadd="1">+ Счёт</button></div>'+
   '<div class="seg" role="group">'+[["exp","Категории расходов"],["inc","Категории доходов"]].map(([k,n])=>'<button type="button" data-edt="'+k+'" aria-pressed="'+(edT===k)+'">'+n+"</button>").join("")+"</div>";
  h+=cats.map((c,ci)=>{const op=edOpen===c.id;
    let x='<div class="card edcat"><button type="button" class="edc" data-edo="'+c.id+'" aria-expanded="'+op+'"><span class="ic" style="background:'+c.c+'">'+svg(c.i)+'</span><span>'+esc(c.n)+'</span><small>'+c.s.length+" подкат.</small></button>";
    if(op){x+='<label class="fl">Название<input class="inp" data-cn="'+ci+'" value="'+esc(c.n)+'"></label>';
      x+=c.s.map((s,si)=>'<div class="edsub"><div class="edsubh"><input class="inp" data-sn="'+ci+"|"+si+'" value="'+esc(s.n)+'" aria-label="Подкатегория"><button type="button" class="xbtn" data-sdel="'+ci+"|"+si+'" aria-label="Удалить подкатегорию">'+(edArm==="s"+ci+"|"+si?"?":"×")+'</button></div><div class="chips">'+
        s.it.map((it,ii)=>'<span class="chip">'+esc(it.n)+(it.f?' <i class="kk">ккал</i>':"")+'<button type="button" data-idel="'+ci+"|"+si+"|"+ii+'" aria-label="Удалить позицию">×</button></span>').join("")+
        '</div><div class="addrow"><input class="inp" data-inew="'+ci+"|"+si+'" placeholder="Новая позиция"><button type="button" class="chipbtn" data-iadd="'+ci+"|"+si+'">+</button></div></div>').join("");
      x+='<div class="addrow"><input class="inp" data-snew="'+ci+'" placeholder="Новая подкатегория"><button type="button" class="chipbtn" data-sadd="'+ci+'">+</button></div>'+
        '<button type="button" class="chipbtn danger" data-cdel="'+ci+'">'+(edArm==="c"+ci?"Нажми ещё раз: удалить категорию":"Удалить категорию")+"</button>"}
    return x+"</div>"}).join("");
  h+='<div class="addrow"><input class="inp" id="cnew" placeholder="Новая категория"><button type="button" class="bigbtn" style="padding:10px 16px" data-cadd="1">Добавить</button></div>'+
   '<div class="muted">Удаление категории не стирает записи: старые траты останутся в аналитике под своим названием до конца периода как «Удалённая категория».</div>';
  return h;
}
function armOr(key){if(edArm===key){edArm=null;return true}edArm=key;setTimeout(()=>{if(edArm===key){edArm=null;renderMoney()}},4000);renderMoney();return false}

// ---------- события ----------
root.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;const d=b.dataset;
  if(d.sub){sub=d.sub;Wv.item=null;renderMoney();window.scrollTo(0,0);return}
  if(d.per){per+=+d.per;Wv.item=null;openTx=null;renderMoney();return}
  if(d.edit){openSheet(M.tx.find(t=>t.id===+d.edit));return}
  if(d.del){if(delArm!==+d.del){delArm=+d.del;renderMoney();setTimeout(()=>{if(delArm===+d.del){delArm=null;renderMoney()}},4000);return}
    removeTx(+d.del);delArm=null;openTx=null;rerender();toast("Запись удалена");return}
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
  if(t.id==="salF"){M.sal.from=Math.min(28,Math.max(1,+t.value||15));rerender()}
  else if(t.id==="salT"){M.sal.to=Math.min(31,Math.max(1,+t.value||18));rerender()}
  else if(t.id==="bud"){M.budget=+String(t.value).replace(/\D/g,"")||0;rerender()}
  else if(d.an!=null){M.acc[+d.an].n=t.value.trim()||M.acc[+d.an].n;save()}
  else if(d.as!=null){M.acc[+d.as].start=+String(t.value).replace(/[^\d-]/g,"")||0;save()}
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
  if(perKg>0){b.pkg=Math.round(perKg);b.pd=tx.d}})}
function gramsOf(l){const q=+l.q||0;if(l.u==="л"||l.u==="кг")return Math.round((q||(l.u==="л"?0.5:0.3))*1000);return Math.round((q||1)*(PORTION[l.f]||300))}
function linkFood(tx){if(!tx.foodLink)return;(tx.lines||[]).forEach(l=>{if(!l.f||!EAT_CATS.includes(l.c))return;const b=S.base.find(x=>x.n===l.f);if(!b)return;
  S.food[tx.d]=S.food[tx.d]||[];S.food[tx.d].push({n:b.n,g:gramsOf(l),k:b.k,p:b.p,f:b.f,c:b.c,cost:l.a,tx:tx.id})})}
function unlinkFood(tx){if(!tx)return;Object.keys(S.food).forEach(k=>{S.food[k]=S.food[k].filter(e=>e.tx!==tx.id)})}
function removeTx(id){const t=M.tx.find(x=>x.id===id);unlinkFood(t);M.tx=M.tx.filter(x=>x.id!==id)}
const costOf=e=>e.cost!=null?e.cost:(()=>{const b=S.base.find(x=>x.n===e.n);return b&&b.pkg?e.g*b.pkg/1000:null})();
function renderCost(){
  const box=$("costCard");if(!box)return;const E=(S.food[dkey(day)]||[]);
  if(!E.length){box.innerHTML='<div class="label">Еда стоила</div><div class="muted">Добавь еду в дневник: цены продуктов берутся из покупок во вкладке «Деньги».</div>';return}
  let tot=0,out=0,miss=0;const rows=E.map(e=>{const c=costOf(e);if(c==null)miss++;else{tot+=c;if(e.cost!=null)out+=c}
    return '<div class="frow"><span>'+esc0(e.n)+"<small>"+(e.cost!=null?"из «Денег»":c==null?"нет цены":fmt(c/e.g*1000)+" ₸/кг")+"</small></span><span>"+e.g+" г</span><span>"+(c==null?"—":fmt(c)+" ₸")+"</span></div>"}).join("");
  const prot=S.base.filter(b=>b.pkg&&b.p>=8).map(b=>({n:b.n,v:b.pkg/10/b.p*100})).sort((x,y)=>x.v-y.v).slice(0,5);
  box.innerHTML='<div class="label">Еда '+(dkey(day)===today()?"сегодня":"за день")+' стоила</div><div class="kcal">'+fmt(tot)+' <small>₸</small></div>'+
   '<div class="muted">Дома '+fmt(tot-out)+" ₸ · вне дома "+fmt(out)+" ₸"+(miss?" · без цены: "+miss+" поз.":"")+"</div><div>"+rows+"</div>"+
   (miss?'<div class="muted">Цена появится, когда купишь продукт и укажешь количество в кг, л или шт. Или впиши «Цену за кг» в Базе.</div>':"")+
   (prot.length?'<div class="label" style="margin-top:6px">Цена 100 г белка</div><div class="ptable">'+prot.map((x,i)=>"<span>"+esc0(x.n)+'</span><span class="'+(i?"":"best")+'">'+fmt(x.v)+" ₸</span>").join("")+"</div>":"");
}
const origRF=renderFood;renderFood=function(){origRF.apply(this,arguments);renderCost()};

// ---------- лист добавления / изменения ----------
const sheet=$("msheet");
let Fm={};
function openSheet(tx){
  if(tx){Fm={edit:tx.id,t:tx.t,c:tx.t==="tr"?null:(tx.c==="mixed"?(tx.lines[0]||{}).c:tx.c),s:null,
      lines:(tx.lines||[]).map(l=>Object.assign({},l,{a:String(l.a),q:l.q?String(l.q):""})),acc:tx.acc||tx.from,to:tx.to||"",a:tx.t==="tr"?String(tx.a):"",d:tx.d,foodOn:!!tx.foodLink||tx.t!=="exp",q:"",note:tx.note||"",own:null}}
  else Fm={t:"exp",c:null,s:null,lines:[],acc:M.acc[M.acc.length>1?1:0].id,to:M.acc[0].id,a:"",d:today(),foodOn:true,q:"",note:"",own:null};
  sheet.hidden=false;document.body.style.overflow="hidden";renderSheet();
}
function closeSheet(){sheet.hidden=true;document.body.style.overflow=""}
const lineSum=()=>Fm.lines.reduce((s,l)=>s+(+l.a||0),0);
function addLine(c,s,it){Fm.c=c;Fm.s=s;Fm.lines.push({c,s,n:it.n,f:it.f,u:it.u,a:"",q:it.u==="шт"?"1":""})}
const hasVoice=!!(window.Android&&Android.voice);
function renderSheet(){
  const cats=Fm.t==="inc"?M.cats.inc:M.cats.exp,c=Fm.c&&Fm.t!=="tr"?catOf(Fm.c):null,subc=c&&Fm.s?c.s.find(x=>x.n===Fm.s):null;
  let h='<div class="sin"><div class="sheethead"><button type="button" data-x="close">Отмена</button><b>'+(Fm.edit?"Изменить":"Добавить")+'</b><span style="width:60px"></span></div>'+
   '<div class="seg">'+[["exp","Расход"],["inc","Доход"],["tr","Перевод"]].map(([k,n])=>'<button type="button" data-ft="'+k+'" aria-pressed="'+(Fm.t===k)+'">'+n+"</button>").join("")+"</div>";
  if(Fm.t==="tr"){
    h+='<div class="fgrid" style="grid-template-columns:1fr 1fr"><label>Откуда<select class="inp" id="ffrom">'+M.acc.map(a=>'<option value="'+a.id+'"'+(a.id===Fm.acc?" selected":"")+">"+esc(a.n)+"</option>").join("")+'</select></label><label>Куда<select class="inp" id="fto">'+M.acc.map(a=>'<option value="'+a.id+'"'+(a.id===Fm.to?" selected":"")+">"+esc(a.n)+"</option>").join("")+"</select></label></div>"+
      '<label class="fl">Сумма, ₸<input class="inp amount" id="famt" inputmode="numeric" placeholder="0" value="'+esc(Fm.a)+'"></label>'+
      '<label class="fl">Дата<input class="inp" id="fdate" type="date" value="'+Fm.d+'"></label><button class="save" type="button" data-x="save">Сохранить</button></div>';
    sheet.innerHTML=h;return;
  }
  h+='<div class="quick"><input id="qtext" type="text" placeholder="Поиск или «пиво 900 чипсы 600»" aria-label="Быстрый ввод" value="'+esc(Fm.q)+'" autocomplete="off">'+
   (hasVoice?'<button type="button" data-x="mic" aria-label="Сказать голосом">'+svg("mic")+"</button>":"")+"</div>";
  const found=Fm.q?findItems(Fm.q,Fm.t):[];
  if(found.length)h+='<div class="found">'+found.map((x,i)=>'<button type="button" data-fi="'+i+'"><span>'+esc(x.it.n)+'</span><span>'+esc(catOf(x.c).n+" › "+x.s)+"</span></button>").join("")+"</div>";
  else if(!Fm.lines.length)h+='<div class="hint">Пиши позицию — «грудка», «пиво», «яндекс» — или выбери категорию. Несколько сразу: «пиво 900 чипсы 600 » (после суммы пробел). Можно добавить слово «вчера».'+(hasVoice?" Или нажми микрофон и скажи то же самое.":"")+"</div>";
  h+='<div class="grid">'+cats.map(x=>'<button type="button" class="cat" data-c="'+x.id+'" aria-pressed="'+(Fm.c===x.id)+'"><span class="ic"'+(Fm.c===x.id?' style="background:'+x.c+'"':"")+">"+svg(x.i)+"</span>"+esc(x.n)+"</button>").join("")+"</div>";
  if(c){
    h+='<div class="crumbs2"><b>'+esc(c.n)+"</b>"+(subc?" › <b>"+esc(subc.n)+"</b>":"")+"</div>";
    if(c.s.length>1)h+='<div class="chips">'+c.s.map(x=>'<button type="button" data-s="'+esc(x.n)+'" aria-pressed="'+(Fm.s===x.n)+'">'+esc(x.n)+"</button>").join("")+"</div>";
    const sv=subc||(c.s.length===1?c.s[0]:null);
    if(sv){h+='<div class="chips items">'+sv.it.map((it,i)=>'<button type="button" class="'+(it.f?"food":"")+'" data-it="'+i+'" data-sn="'+esc(sv.n)+'">+ '+esc(it.n)+"</button>").join("")+'<button type="button" data-x="own">+ своя позиция</button></div>';
      if(Fm.own)h+='<div class="addrow"><input class="inp" id="ownN" placeholder="Название позиции"><button type="button" class="chipbtn" data-x="ownok">Добавить</button></div><div class="hint">Позиция сохранится в «'+esc(sv.n)+'» и будет в списке в следующий раз.</div>'}
  }
  if(Fm.lines.length){
    h+='<div class="lines">'+Fm.lines.map((l,i)=>'<div class="line"><div class="nm">'+esc(l.n)+"<small>"+esc(catOf(l.c).n+" › "+l.s)+(l.f?" · питание":"")+"</small></div>"+
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
function focusLast(){const ins=sheet.querySelectorAll("[data-la]");if(ins.length)ins[ins.length-1].focus()}
sheet.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;grab();const d=b.dataset;
  if(d.ft){Fm.t=d.ft;Fm.c=null;Fm.s=null;Fm.lines=[];Fm.q="";renderSheet()}
  else if(d.c){Fm.c=d.c;const c=catOf(Fm.c);Fm.s=c.s.length===1?c.s[0].n:null;Fm.own=null;renderSheet()}
  else if(d.s!=null){Fm.s=d.s;Fm.own=null;renderSheet()}
  else if(d.it!=null){const c=catOf(Fm.c),sv=c.s.find(x=>x.n===d.sn);addLine(Fm.c,sv.n,sv.it[+d.it]);renderSheet();focusLast()}
  else if(d.fi!=null){const x=findItems(Fm.q,Fm.t)[+d.fi];Fm.q="";addLine(x.c,x.s,x.it);renderSheet();focusLast()}
  else if(d.lx!=null){Fm.lines.splice(+d.lx,1);renderSheet()}
  else if(d.x==="own"){Fm.own=true;renderSheet();$("ownN").focus()}
  else if(d.x==="ownok"){const n=$("ownN").value.trim();if(!n)return;const c=catOf(Fm.c),sv=c.s.find(x=>x.n===Fm.s)||c.s[0];
    const it={n};const bn=S.base.find(x=>norm(x.n)===norm(n));if(bn){it.f=bn.n;it.u="кг"}
    if(!sv.it.some(x=>x.n===n))sv.it.push(it);save();Fm.own=null;addLine(c.id,sv.n,it);renderSheet();focusLast()}
  else if(d.x==="close")closeSheet();
  else if(d.x==="mic"){try{Android.voice()}catch(err){toast("Голосовой ввод недоступен")}}
  else if(d.x==="save")saveSheet();
});
function saveSheet(){
  let tx;
  if(Fm.t==="tr"){const a=+Fm.a;if(!a){toast("Впиши сумму");return}if(Fm.acc===Fm.to){toast("Выбери разные счета");return}
    tx={d:Fm.d,t:"tr",from:Fm.acc,to:Fm.to,a}}
  else{const c=catOf(Fm.c);
    let lines=Fm.lines.filter(l=>+l.a>0).map(l=>{const o={c:l.c,s:l.s,n:l.n,a:+l.a};if(l.f)o.f=l.f;if(l.u){o.u=l.u;const q=+String(l.q).replace(",",".");if(q)o.q=q}return o});
    let a=lines.reduce((s,l)=>s+l.a,0);
    if(!lines.length){if(Fm.lines.length){toast("Впиши суммы позиций");return}a=+Fm.a;if(!a||!Fm.c){toast("Впиши сумму");return}
      lines=[{c:Fm.c,s:Fm.s||c.s[0].n,n:Fm.s||c.n,a}]}
    const cs=[...new Set(lines.map(l=>l.c))];
    tx={d:Fm.d,t:Fm.t,c:cs.length===1?cs[0]:"mixed",a,acc:Fm.acc,lines};
    if(Fm.note.trim()){tx.note=Fm.note.trim();if(lines.length>1)tx.receipt=tx.note}
    if(Fm.t==="exp"&&Fm.foodOn&&lines.some(l=>l.f&&EAT_CATS.includes(l.c)))tx.foodLink=true;
  }
  if(Fm.edit){const old=M.tx.find(x=>x.id===Fm.edit);unlinkFood(old);tx.id=Fm.edit;M.tx[M.tx.indexOf(old)]=tx}
  else{tx.id=M.nid++;M.tx.push(tx)}
  if(tx.t==="exp"){updatePrices(tx);linkFood(tx)}
  save();closeSheet();sub="rec";openTx=null;per=curPer();
  const idx=starts().findIndex((s,i,a)=>tx.d>=s&&(i===a.length-1||tx.d<a[i+1]));if(idx>=0)per=idx;
  renderMoney();toast(Fm.edit?"Изменено":tx.foodLink?"Записано в деньги и в питание":"Записано");
}
// быстрый ввод: «пиво 900 чипсы 600», «вчера такси 1800», «донер 2к»
function parseQuick(text,commitAll){
  let t=" "+norm(text)+" ";
  if(/\sпозавчера\s/.test(t)){Fm.d=addDays(today(),-2);t=t.replace(/\sпозавчера\s/," ")}
  else if(/\sвчера\s/.test(t)){Fm.d=addDays(today(),-1);t=t.replace(/\sвчера\s/," ")}
  t=t.replace(/(\d+)[.,]?(\d*)\s*(к|тыс\w*)(?=\s)/g,(m,a,b)=>String(Math.round(parseFloat(a+"."+(b||"0"))*1000)));
  t=t.replace(/(\d)\s(?=\d{3}\b)/g,"$1").replace(/(\d+)\s*(тенге|тг|₸)/g,"$1");
  const re=/([a-zа-я][a-zа-я\s-]*?)\s+(\d+)(?=\s)/g;let m,added=0,lastEnd=0;
  while((m=re.exec(t))){const words=m[1].trim().split(/\s+/);let f=null;
    for(let k=0;k<words.length&&!f;k++)f=findItems(words.slice(k).join(" "),Fm.t)[0];
    if(f){addLine(f.c,f.s,f.it);Fm.lines[Fm.lines.length-1].a=m[2];added++;lastEnd=re.lastIndex}}
  return{added,rest:commitAll?"":t.slice(lastEnd).trim()};
}
sheet.addEventListener("input",e=>{
  const t=e.target;
  if(t.dataset.la!=null){Fm.lines[+t.dataset.la].a=t.value.replace(/\D/g,"");const tot=$("tot");if(tot)tot.textContent=fmt(lineSum())+" ₸";return}
  if(t.dataset.lq!=null){Fm.lines[+t.dataset.lq].q=t.value;return}
  if(t.id==="qtext"){grab();Fm.q=t.value;
    if(/\d\s$/.test(t.value)){const r=parseQuick(t.value);if(r.added){Fm.q=r.rest;renderSheet();const q=$("qtext");q.focus();toast("Добавлено: "+Fm.lines.slice(-r.added).map(l=>l.n.toLowerCase()).join(", "));return}}
    const pos=t.selectionStart;renderSheet();const q=$("qtext");q.focus();q.setSelectionRange(pos,pos)}
});
sheet.addEventListener("keydown",e=>{if(e.target.id==="qtext"&&e.key==="Enter"){grab();const r=parseQuick(e.target.value+" ",true);if(r.added){Fm.q="";renderSheet();toast("Добавлено позиций: "+r.added)}}});
// голос: Android возвращает распознанный текст
window.onVoice=function(text){
  if(sheet.hidden)openSheet();
  if(!text){toast("Не расслышал, попробуй ещё раз");return}
  grab();const r=parseQuick(text+" ",true);
  if(r.added){Fm.q="";renderSheet();toast("Услышал: «"+text+"»")}
  else{Fm.q=text.replace(/\d+/g,"").trim();renderSheet();toast("Услышал: «"+text+"». Выбери позицию из списка")}
};
window.addEventListener("DOMContentLoaded",()=>{if(!$("pageMoney").hidden)renderMoney()});
})();
