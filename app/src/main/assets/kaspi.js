// Входящие из уведомлений Kaspi: «Пополнение: 555 ₸ / Маржан Е.: …», «Оплата: 1 995 ₸ / За годовое обслуживание / Доступно: …»,
// «Покупка: 2 500 ₸ / MAGNUM …», «Перевод: 5 000 ₸ / Имя Ф.». Разбор, угадывание категории, подтверждение одним нажатием.
(function(){
const A=MoneyAPI,M=A.M,svg=A.svg;
M.kin=M.kin||[];M.kmap=M.kmap||{};M.bankBal=M.bankBal||{};
const has=!!(window.Android&&Android.kaspiInbox);
const esc=esc0,norm=s=>String(s).toLowerCase().replace(/ё/g,"е");
const num=s=>parseFloat(String(s).replace(/[\s ₸]/g,"").replace(",","."))||0;
const fmt=n=>Math.round(n).toLocaleString("ru-RU");
const pad=n=>String(n).padStart(2,"0");
const dayOf=t=>{const h=S.dayEnd==null?4:+S.dayEnd,d=new Date(t-h*3600e3);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())};
const hm=t=>{const d=new Date(t);return pad(d.getHours())+":"+pad(d.getMinutes())};

// продавец/описание → категория [тип, категория, подкатегория, позиция]
const MERCH=[
 [/yandex[\s.]*go|яндекс[\s.]*go|yandex[\s.]*taxi|яндекс\s*такси/,"exp","trans","Такси","Яндекс Go"],[/indrive|индрайв/,"exp","trans","Такси","inDrive"],[/uber/,"exp","trans","Такси","Uber"],
 [/onay|онай/,"exp","trans","Общественный","Пополнение Онай"],[/glovo/,"exp","cafe","Доставка","Glovo"],[/wolt/,"exp","cafe","Доставка","Wolt"],[/яндекс[\s.]*ед|yandex[\s.]*eda/,"exp","cafe","Доставка","Яндекс Еда"],
 [/kfc|burger|бургер|донер|doner|shawarma|шаурм|mcdonald|hardee|pizza|пицц/,"exp","cafe","Фастфуд",null],[/coffee|кофе|starbucks/,"exp","cafe","Кофе и напитки с собой","Кофе"],
 [/magnum|магнум|small|смолл|galmart|анвар|anvar|арзан|metro|fix\s*price|toimart|green|алма|супермаркет|маркет|market/,"exp","food",null,null],
 [/beeline|билайн/,"exp","comm","Мобильная связь","Beeline"],[/kcell|кселл/,"exp","comm","Мобильная связь","Kcell"],[/activ|актив/,"exp","comm","Мобильная связь","Activ"],[/tele2|теле2/,"exp","comm","Мобильная связь","Tele2"],
 [/yandex[\s.]*plus|яндекс[\s.]*плюс/,"exp","comm","Подписки","Яндекс Плюс"],[/youtube|google/,"exp","comm","Подписки","YouTube Premium"],
 [/аптек|apteka|pharm|биосфер|europharma|евроферм/,"exp","health","Аптека","Лекарства"],
 [/helios|sinooil|qazaq\s*oil|газпром|lukoil|лукойл|азс|petrol|royal\s*petrol/,"exp","auto","Топливо",null],
 [/годов\S*\s*обслуж|обслуживан/,"exp","credit","Банк","Обслуживание карты"],[/kaspi\s*red|рассрочк/,"exp","credit","Рассрочки","Kaspi Red"],[/кредит/,"exp","credit","Кредиты","Платёж по кредиту"],
 [/с другого банка/,"inc","transfers","Переводы","С другого банка"],[/пособ|соц/,"inc","transfers","Переводы","Пособие"],[/кешб|cashback|бонус/,"inc","cashback","Кешбэк","Kaspi"]
];
function guess(kind,who,desc){
  const k=norm(who||desc||"");if(k&&M.kmap[k])return M.kmap[k];
  const t=norm((who||"")+" "+(desc||""));
  for(const [re,ty,c,s,n] of MERCH)if(ty===kind&&re.test(t))return{c,s,n};
  if(kind==="inc"&&/^[a-zа-я]+\s+[a-zа-я]\.?$/i.test((who||"").trim()))return{c:"tips",s:"Чаевые",n:"На карту"}; // перевод от человека — чаевые
  return null;
}
function parse(o){
  const lines=String(o.b||"").split(/\n/).map(x=>x.trim()).filter(Boolean);
  const all=lines.join("\n");
  const m=all.match(/([А-Яа-яЁёA-Za-z ]{3,30}):\s*([\d\s .,]+)\s*₸/);
  if(!m)return null;
  const type=m[1].trim(),a=num(m[2]);if(!a)return null;
  const t=norm(type);
  const kind=/пополн|возврат|зачисл|кешб|поступ/.test(t)?"inc":/покупк|оплат|платеж|платёж|списан|снят|перевод|погашен/.test(t)?"exp":null;
  if(!kind)return null;
  const av=all.match(/Доступно:\s*([\d\s .,]+)\s*₸/);
  // остальное: «Маржан Е.: сообщение», «С другого банка», «MAGNUM ALMATY»
  const rest=all.replace(m[0],"").replace(/Доступно:[^\n]*/,"").split(/\n/).map(x=>x.trim()).filter(Boolean);
  let who="",msg="",desc="";
  if(rest.length){const r=rest[0];const pm=r.match(/^([A-ZА-ЯЁ][a-zа-яё]+\s+[A-ZА-ЯЁ]\.)\s*:?\s*(.*)$/);
    if(pm){who=pm[1];msg=pm[2]}else desc=r}
  const acc=(()=>{const tn=norm(o.t||"");const f=M.acc.find(x=>tn&&(norm(x.n).includes(tn)||tn.includes(norm(x.n))));
    return f?f.id:(M.acc.find(x=>x.id==="kaspi")||M.acc[0]).id})();
  return{id:o.time+"|"+a+"|"+type,time:o.time,d:dayOf(o.time),type,kind,a,who,msg,desc,acc,title:o.t||"",avail:av?num(av[1]):null};
}
function pull(){
  if(!has||M.kaspiOff)return;let arr=[];
  try{arr=JSON.parse(Android.kaspiInbox()||"[]")}catch(e){}
  if(!arr.length)return;let added=0;
  arr.forEach(o=>{const p=parse(o);if(!p)return;
    if(p.avail!=null){const cur=M.bankBal[p.acc];if(!cur||cur.time<p.time)M.bankBal[p.acc]={v:p.avail,d:p.d,time:p.time}}
    if(M.kin.some(x=>x.id===p.id))return;M.kin.push(p);added++});
  if(added){save();if(!$("pageMoney").hidden)renderMoney();wToast("Kaspi: новых операций — "+added)}
}
const dupOf=k=>M.tx.find(t=>t.d===k.d&&t.t===k.kind&&Math.abs(t.a-k.a)<=1&&!t.kaspi);
window.kaspiCard=function(){
  if(!M.kin.length)return"";
  const list=M.kin.slice().sort((x,y)=>y.time-x.time);
  return '<div class="card kin"><div class="label">Из Kaspi · новых: '+list.length+"</div>"+list.map(k=>{
    const g=guess(k.kind,k.who,k.desc),c=g?A.catOf(g.c):null,dup=dupOf(k);
    return '<div class="kinrow"><div class="ic" style="background:'+(c?c.c:"var(--line)")+'">'+svg(c?c.i:(k.kind==="inc"?"coins":"card"))+'</div>'+
      '<div class="nm"><b>'+esc(k.type)+(k.who?" · "+esc(k.who):"")+"</b><small>"+esc([k.desc,k.msg].filter(Boolean).join(" · ")||k.title)+" · "+k.d.slice(8)+"."+k.d.slice(5,7)+" "+hm(k.time)+
      (c?" · → "+esc(c.n):"")+(dup?' · <span class="neg">похоже, уже записано</span>':"")+"</small></div>"+
      '<div class="am '+(k.kind==="inc"?"pos":"")+'">'+(k.kind==="inc"?"+":"−")+fmt(k.a)+"</div>"+
      '<div class="kbtns"><button type="button" class="chipbtn" data-kok="'+esc(k.id)+'">'+(dup?"Всё равно записать":"Записать")+'</button><button type="button" class="chipbtn" data-kno="'+esc(k.id)+'">'+(dup?"Пропустить (уже есть)":"Пропустить")+"</button></div></div>"}).join("")+
    (list.length>1?'<button type="button" class="linkbtn" data-kclear="1">Пропустить все</button>':"")+"</div>";
};
document.addEventListener("click",e=>{const b=e.target.closest("[data-kok],[data-kno],[data-kclear]");if(!b)return;
  if(b.dataset.kclear){M.kin=[];save();renderMoney();return}
  const k=M.kin.find(x=>x.id===(b.dataset.kok||b.dataset.kno));if(!k)return;
  if(b.dataset.kno){M.kin=M.kin.filter(x=>x!==k);save();renderMoney();return}
  const g=guess(k.kind,k.who,k.desc)||{};
  A.openPrefilled({t:k.kind,c:g.c,s:g.s,n:g.n,a:k.a,acc:k.acc,d:k.d,note:k.who||k.desc||"",kin:k.id,
    msg:"Из Kaspi: «"+k.type+": "+fmt(k.a)+" ₸"+(k.who?" · "+k.who:"")+(k.desc?" · "+k.desc:"")+"». "+(g.c?"Категорию угадал — проверь.":"Выбери категорию.")+" Выбор запомню для «"+(k.who||k.desc||k.type)+"»."});
});
// после сохранения: убрать из входящих и запомнить категорию для этого человека/продавца
window.kaspiDone=function(id,tx){const k=M.kin.find(x=>x.id===id);M.kin=M.kin.filter(x=>x.id!==id);
  if(k&&tx.lines&&tx.lines[0]){const key=norm(k.who||k.desc||"");const l=tx.lines[0];if(key)M.kmap[key]={c:l.c,s:l.s,n:l.n}}};
window.kaspiParse=parse;
const prev=window.onAppResume;window.onAppResume=function(){try{prev&&prev()}catch(e){}pull()};
document.addEventListener("visibilitychange",()=>{if(!document.hidden)pull()});
setInterval(()=>{if(!document.hidden)pull()},15000);
setTimeout(pull,1200);
})();
