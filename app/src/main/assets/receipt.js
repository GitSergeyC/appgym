// Чеки по QR: consumer.oofd.kz (Казахтелеком — Magnum, Small и др.).
// QR → ссылка с i,f,s,t → скрытая страница чека → позиции → сопоставление с нашими позициями → лист проверки.
(function(){
const M=S.money;M.rmap=M.rmap||{};M.seen=M.seen||{};
const hasQR=!!(window.Android&&Android.scanQR);
const num=s=>parseFloat(String(s).replace(/[\s ₸тг]/g,"").replace(",","."))||0;
const norm=s=>String(s).toLowerCase().replace(/ё/g,"е");
const key=s=>norm(s).replace(/[\d.,%×x*=_"'«»()/-]+/g," ").replace(/\s+/g," ").trim();
const R=window.MoneyAPI;

// правила: подстрока/регулярка из названия в чеке → наша позиция [категория, подкатегория, позиция]
const RULES=[
 [/печенье/,"food","Сладкое","Печенье"],[/печень/,"food","Мясо и птица","Печень"],
 [/грудк|филе\s*кур|кур.*филе/,"food","Мясо и птица","Куриная грудка"],[/бедр/,"food","Мясо и птица","Куриное бедро"],
 [/крыл/,"food","Мясо и птица","Куриные крылья"],[/тушка|цыпл|курица/,"food","Мясо и птица","Курица целая"],
 [/фарш/,"food","Мясо и птица","Говяжий фарш"],[/говядин|говяж/,"food","Мясо и птица","Говядина"],[/индейк/,"food","Мясо и птица","Индейка"],
 [/свинин/,"food","Мясо и птица","Свинина"],[/баранин|курдюк/,"food","Мясо и птица","Баранина"],[/конин|казы|карта\b/,"food","Мясо и птица","Конина"],
 [/колбас/,"food","Мясо и птица","Колбаса"],[/сосиск|сардельк/,"food","Мясо и птица","Сосиски"],[/пельмен|вареник/,"food","Мясо и птица","Пельмени"],
 [/креветк/,"food","Рыба и морепродукты","Креветки"],[/крабов/,"food","Рыба и морепродукты","Крабовые палочки"],[/тунец/,"food","Рыба и морепродукты","Тунец консервы"],
 [/сельд/,"food","Рыба и морепродукты","Сельдь"],[/семг|лосос/,"food","Рыба и морепродукты","Сёмга"],[/горбуш/,"food","Рыба и морепродукты","Горбуша"],[/минтай/,"food","Рыба и морепродукты","Минтай"],[/хек\b/,"food","Рыба и морепродукты","Хек"],
 [/яйц|яйко/,"food","Молочное и яйца","Яйца"],[/кефир|снежок|ряженк/,"food","Молочное и яйца","Кефир"],[/айран|шубат|кумыс/,"food","Молочное и яйца","Айран"],
 [/творож|творог/,"food","Молочное и яйца","Творог"],[/йогурт/,"food","Молочное и яйца","Йогурт"],[/сметан/,"food","Молочное и яйца","Сметана"],
 [/моцарел/,"food","Молочное и яйца","Моцарелла"],[/сыр.*косич|косичк/,"food","Снеки и закуски","Сыр-косичка"],[/сыр(?!ок)/,"food","Молочное и яйца","Сыр"],
 [/масло\s*слив|сливочн.*масл/,"food","Молочное и яйца","Масло сливочное"],[/молок/,"food","Молочное и яйца","Молоко"],
 [/\bрис\b/,"food","Крупы и макароны","Рис"],[/гречк|греча/,"food","Крупы и макароны","Гречка"],[/овсян|геркулес|хлопья/,"food","Крупы и макароны","Овсянка"],
 [/булгур/,"food","Крупы и макароны","Булгур"],[/макарон|спагет|рожки|перья|лапш/,"food","Крупы и макароны","Макароны"],[/нут\b/,"food","Крупы и макароны","Нут"],[/чечевиц/,"food","Крупы и макароны","Чечевица"],
 [/ржан|бородин/,"food","Хлеб и выпечка","Хлеб ржаной"],[/батон/,"food","Хлеб и выпечка","Батон"],[/лепеш/,"food","Хлеб и выпечка","Лепёшка"],[/лаваш/,"food","Хлеб и выпечка","Лаваш"],
 [/хлебц/,"food","Хлеб и выпечка","Хлебцы"],[/хлеб/,"food","Хлеб и выпечка","Хлеб белый"],[/булоч|круассан/,"food","Хлеб и выпечка","Булочки"],
 [/чипс|lays|pringles/,"food","Снеки и закуски","Чипсы"],[/картоф|картош/,"food","Овощи и зелень","Картофель"],
 [/огурц/,"food","Овощи и зелень","Огурцы"],[/помидор|томат(?!.*паст)/,"food","Овощи и зелень","Помидоры"],[/капуст/,"food","Овощи и зелень","Капуста"],
 [/брокколи/,"food","Овощи и зелень","Брокколи"],[/морков/,"food","Овощи и зелень","Морковь"],[/\bлук\b/,"food","Овощи и зелень","Лук"],[/перец/,"food","Овощи и зелень","Перец болгарский"],
 [/кабач/,"food","Овощи и зелень","Кабачки"],[/шампиньон|гриб/,"food","Овощи и зелень","Грибы"],[/укроп|петрушк|зелень|кинза/,"food","Овощи и зелень","Зелень"],
 [/банан/,"food","Фрукты и ягоды","Бананы"],[/яблок/,"food","Фрукты и ягоды","Яблоки"],[/апельсин/,"food","Фрукты и ягоды","Апельсины"],[/мандарин/,"food","Фрукты и ягоды","Мандарины"],
 [/груш/,"food","Фрукты и ягоды","Груши"],[/виноград/,"food","Фрукты и ягоды","Виноград"],[/киви/,"food","Фрукты и ягоды","Киви"],[/хурм/,"food","Фрукты и ягоды","Хурма"],[/финик|изюм|курага|чернослив/,"food","Фрукты и ягоды","Сухофрукты"],
 [/пив|beer|kozel|velkopop|tuborg|heineken|балтик|карагандин/,"habit","Алкоголь","Пиво"],[/вино\b|вина\b/,"habit","Алкоголь","Вино"],[/водк|коньяк|виски|ром\b/,"habit","Алкоголь","Крепкое"],
 [/сигарет|winston|marlboro|parliament|kent|camel|lucky|chesterfield|rothmans/,"habit","Сигареты","Пачка"],[/iqos|heets|terea|стик/,"habit","Сигареты","Стики / IQOS"],[/зажигал/,"habit","Сигареты","Зажигалка"],
 [/энергет|red bull|burn|adrenalin|gorilla|flash/,"habit","Энергетики","Энергетик"],
 [/сухар|кириешк/,"food","Снеки и закуски","Сухарики"],[/арахис|орех|фисташ|миндал/,"food","Снеки и закуски","Орешки"],[/вобл|рыб.*суш|кальмар/,"food","Снеки и закуски","Рыбка сушёная"],[/семечк/,"food","Снеки и закуски","Семечки"],[/попкорн/,"food","Снеки и закуски","Попкорн"],
 [/шоколад|snickers|mars|twix|kitkat|alpen|баунти|bounty/,"food","Сладкое","Шоколад"],[/конфет/,"food","Сладкое","Конфеты"],[/морожен|пломбир|эскимо/,"food","Сладкое","Мороженое"],[/мед\b|мёд/,"food","Сладкое","Мёд"],
 [/\bвода\b|aqua|\basu\b|a.su|сарыагаш|bonaqua|tassay|borjomi|минерал/,"food","Напитки","Вода"],[/\bсок\b|нектар|juice|морс/,"food","Напитки","Сок"],
 [/cola|кола|pepsi|fanta|sprite|лимонад|газ/,"food","Напитки","Газировка"],[/\bчай\b|tea/,"food","Напитки","Чай"],[/кофе|coffee|nescafe|jacobs/,"food","Напитки","Кофе зерно/молотый"],
 [/сахар|фруктоз/,"food","Бакалея и соусы","Сахар"],[/\bсоль\b|специ|приправ/,"food","Бакалея и соусы","Соль и специи"],[/подсолн|растит/,"food","Бакалея и соусы","Масло растительное"],
 [/оливк/,"food","Бакалея и соусы","Масло оливковое"],[/кетчуп/,"food","Бакалея и соусы","Кетчуп"],[/майонез/,"food","Бакалея и соусы","Майонез"],[/соев/,"food","Бакалея и соусы","Соевый соус"],[/мука/,"food","Бакалея и соусы","Мука"],[/консерв/,"food","Бакалея и соусы","Консервы"],
 [/протеин|whey/,"food","Спортпит","Протеин"],[/креатин/,"food","Спортпит","Креатин"],[/батончик/,"food","Спортпит","Протеиновые батончики"],[/витамин/,"health","Аптека","Витамины"],
 [/туалетн|бумага/,"home","Бытовая химия","Туалетная бумага"],[/порошок|ariel|tide|persil|миф\b/,"home","Бытовая химия","Порошок"],[/fairy|для посуд/,"home","Бытовая химия","Для посуды"],
 [/губк|салфет|тряпк/,"home","Бытовая химия","Губки и тряпки"],[/мусор/,"home","Бытовая химия","Пакеты для мусора"],[/пакет/,"home","Товары для дома","Мелочи"],
 [/шампун/,"beauty","Гигиена","Шампунь"],[/зубн|colgate|blend|щетк/,"beauty","Гигиена","Зубная паста и щётка"],[/гель\s*д.*душ/,"beauty","Гигиена","Гель для душа"],
 [/дезодор|антиперсп/,"beauty","Гигиена","Дезодорант"],[/мыло/,"beauty","Гигиена","Мыло"],[/станк|gillette|бритв/,"beauty","Бритьё","Станки"]
];
function itemOf(c,s,n){const cat=MoneyAPI.catOf(c);const sub=cat.s&&cat.s.find(x=>x.n===s);const it=sub&&sub.it.find(x=>x.n===n);return it?{c,s,it}:null}
function match(raw){
  const k=key(raw);if(M.rmap[k]){const m=M.rmap[k],r=itemOf(m.c,m.s,m.n);if(r)return r}
  const n=norm(raw);for(const [re,c,s,i] of RULES)if(re.test(n)){const r=itemOf(c,s,i);if(r)return r}
  // запасной вариант: слово из чека совпадает с началом названия позиции (не подкатегории)
  const words=n.split(/[^a-zа-я]+/).filter(w=>w.length>=5);
  for(const w of words){const st=w.slice(0,Math.min(6,w.length-1));
    const f=MoneyAPI.items("exp").find(x=>norm(x.it.n).split(/[\s/-]+/).some(p=>p.length>=4&&p.startsWith(st)));if(f)return f}
  return null;
}
// количество в единицах нашей позиции: «0,5Л × 10» → 5 л, «900ГР × 1» → 0,9 кг, «10ШТ» → 10 шт
function qtyFor(raw,qty,u){
  const n=norm(raw).replace(/,/g,".");let size=null;
  const re=/(\d+(?:\.\d+)?)\s*(кг|гр|г|мл|л)(?![а-я])/g;let m;while((m=re.exec(n)))size=m;
  const pcs=n.match(/(\d+)\s*шт/);
  if(u==="шт")return pcs&&+pcs[1]>1?qty*+pcs[1]:qty;
  if(size){let v=+size[1];const un=size[2];
    if(un==="г"||un==="гр"||un==="мл")v=v/1000;
    if((u==="кг"&&(un==="кг"||un==="г"||un==="гр"))||(u==="л"&&(un==="л"||un==="мл")))return Math.round(qty*v*1000)/1000}
  return qty; // весовой товар: количество уже в кг
}
function sellerName(s){const t=norm(s);
  if(/small|скиф/.test(t))return"Small";if(/magnum|магнум/.test(t))return"Магнум";if(/galmart/.test(t))return"Galmart";
  if(/anvar|анвар/.test(t))return"Анвар";if(/арзан/.test(t))return"Арзан";if(/metro/.test(t))return"Metro";
  return String(s).replace(/^\s*(тоо|ип|ао)\s*/i,"").replace(/["«»]/g,"").trim().slice(0,30)}
function qrParams(url){const q={};try{const u=new URL(url.replace(/^http:/,"https:"));u.searchParams.forEach((v,k)=>q[k]=v)}catch(e){}
  let d=null;if(q.t&&/^\d{8}/.test(q.t))d=q.t.slice(0,4)+"-"+q.t.slice(4,6)+"-"+q.t.slice(6,8);return{i:q.i,s:num(q.s||0),d}}

// ----- поток -----
let pending=null;
window.onQR=function(text){
  if(!text)return;const p=qrParams(text);
  if(p.i&&M.seen[p.i]){wToast("Этот чек уже записан");return}
  pending={url:text,p};
  if(/oofd\.kz/i.test(text)){MoneyAPI.loading("Загружаю чек… обычно 5–10 секунд");try{Android.fetchReceipt(text)}catch(e){onReceipt(null,text)}}
  else onReceipt(null,text);
};
window.onReceipt=function(json,url){
  const p=(pending&&pending.p)||qrParams(url||"");let data=null;
  try{data=typeof json==="string"?JSON.parse(json):json}catch(e){}
  const lines=[];let seller="";
  if(data&&data.items&&data.items.length){
    seller=sellerName(data.seller||"");
    data.items.forEach(cells=>{
      let name="",nums=[];
      if(cells.length>=6){name=cells[1];nums=[num(cells[3]),num(cells[4]),num(cells[5])]}
      else{const t=cells.filter(c=>/[a-zа-я]{2}/i.test(c));name=t.sort((a,b)=>b.length-a.length)[0]||"";nums=cells.filter(c=>/^[\d\s .,₸]+$/.test(c)&&c.trim()).map(num).slice(-3)}
      const [price,qty,total]=nums.length===3?nums:[0,1,nums[nums.length-1]||0];
      if(!name||!total)return;
      const m=match(name);
      const l={raw:name.trim(),a:String(Math.round(total)),q:""};
      if(m){Object.assign(l,{c:m.c,s:m.s,n:m.it.n,f:m.it.f,u:m.it.u});if(m.it.u)l.q=String(qtyFor(name,qty||1,m.it.u))}
      lines.push(l);
    });
  }
  const sum=lines.reduce((s,l)=>s+(+l.a||0),0);
  MoneyAPI.openReceipt({lines,d:p.d,note:seller,qr:p.i||null,total:p.s,
    msg:lines.length?"Чек: "+lines.length+" поз. на "+Math.round(sum).toLocaleString("ru-RU")+" ₸"+(p.s&&Math.abs(p.s-sum)>1?" (в чеке "+Math.round(p.s).toLocaleString("ru-RU")+" ₸ — проверь скидки)":"")+". Проверь категории, позиции без категории — выбери.":
      "Позиции не загрузились"+(p.s?", но есть сумма "+Math.round(p.s).toLocaleString("ru-RU")+" ₸ и дата":"")+". Выбери категорию или добавь позиции вручную."});
  pending=null;
};
// ----- фото чека: распознанный текст → позиции -----
// Форматы: Small «НАЗВАНИЕ / 1 x 380.00 = 380.00_A», Magnum «4870… НАЗВАНИЕ … 10.000000 X 235.00 / =2350.00_A»
const NUM=/\d[\d  ]*[.,]\d{1,2}/;
function fixDigits(s){return s.replace(/(?<=[\d.,\s=xх×*])[ОоOo](?=[\d.,\s]|$)/g,"0").replace(/(?<=\d)[Зз](?=\d)/g,"3")}
function parseOcr(text){
  const L=String(text||"").split(/\r?\n/).map(x=>fixDigits(x.trim())).filter(Boolean);
  const items=[],used=new Set();let total=0,d=null,seller="";
  const skip=/(ндс|итог|сдача|наличн|банк|карт|оплат|фискальн|кассир|касса|смена|знм|рнм|бин|иин|продажа|чек|спасибо|сайт|oofd|ofd|налог|промежут|надбавк|скидк)/i;
  for(let i=0;i<L.length;i++){const x=L[i];
    if(!seller){const m=x.match(/small|magnum|galmart|анвар|арзан|metro/i);if(m)seller=sellerName(m[0])}
    if(!d){let m=x.match(/(\d{2})[.\/](\d{2})[.\/](\d{4})/);if(m)d=m[3]+"-"+m[2]+"-"+m[1];else{m=x.match(/(20\d{2})-(\d{2})-(\d{2})/);if(m)d=m[1]+"-"+m[2]+"-"+m[3]}}
    if(/итог/i.test(x)&&!/промежут/i.test(x)){const m=x.match(NUM)||(L[i+1]||"").match(NUM);if(m&&!total)total=num(m[0])}
    const m=x.match(/(\d+(?:[.,]\d+)?)\s*[xхХX×*]\s*(\d[\d  ]*[.,]\d{1,2})(?:\s*=\s*(\d[\d  ]*[.,]\d{1,2}))?/);
    if(!m)continue;
    const qty=num(m[1]),price=num(m[2]);let tot=m[3]?num(m[3]):0;
    if(!tot){const n=(L[i+1]||"").match(/^=?\s*(\d[\d  ]*[.,]\d{1,2})/);if(n){tot=num(n[1]);used.add(i+1)}}
    if(!tot)tot=Math.round(qty*price*100)/100;
    let name=x.slice(0,m.index).replace(/^\d{6,}\s*/,"").trim();
    // название на предыдущих строках (Small) или продолжение на этой (Magnum: «ДАР 4.000000 X 35.00»)
    for(let k=i-1;k>=0&&k>=i-2&&(name.replace(/[^a-zа-я]/gi,"").length<6);k--){
      if(used.has(k)||skip.test(L[k])||NUM.test(L[k])&&!/[a-zа-я]{3}/i.test(L[k]))break;
      name=L[k].replace(/^\d{6,}\s*/,"").trim()+" "+name;used.add(k)}
    // Magnum: начало названия на строке со штрихкодом
    {const k=i-1;if(k>=0&&!used.has(k)&&/^\d{8,}\s+[a-zа-я]/i.test(L[k])&&!/[xхХX×*]\s*\d/.test(L[k])){name=L[k].replace(/^\d{6,}\s*/,"")+" "+name;used.add(k)}}
    name=name.replace(/\s+/g," ").trim();
    if(name.replace(/[^a-zа-я]/gi,"").length<2||!tot)continue;
    used.add(i);items.push({name,qty,price,total:tot});
  }
  return{items,total,d,seller};
}
function buildLines(items){return items.map(it=>{const m=match(it.name);const l={raw:it.name,a:String(Math.round(it.total)),q:""};
  if(m){Object.assign(l,{c:m.c,s:m.s,n:m.it.n,f:m.it.f,u:m.it.u});if(m.it.u)l.q=String(qtyFor(it.name,it.qty||1,m.it.u))}return l})}
window.parseOcr=parseOcr;
window.onOcrStart=function(){MoneyAPI.loading("Распознаю чек с фото… обычно 5–20 секунд")};
window.onOcr=function(text){
  if(!text){MoneyAPI.openReceipt({lines:[],msg:"Не получилось распознать фото. Сфотографируй ровнее, при хорошем свете, чтобы чек занимал весь кадр."});return}
  const r=parseOcr(text),lines=buildLines(r.items),sum=lines.reduce((s,l)=>s+(+l.a||0),0);
  MoneyAPI.openReceipt({lines,d:r.d,note:r.seller,total:r.total,
    msg:lines.length?"С фото: "+lines.length+" поз. на "+Math.round(sum).toLocaleString("ru-RU")+" ₸"+(r.total&&Math.abs(r.total-sum)>1?" (ИТОГ в чеке "+Math.round(r.total).toLocaleString("ru-RU")+" ₸ — что-то не распозналось, проверь)":" — сходится с ИТОГ")+". Фото распознаётся не идеально: проверь названия и суммы.":
      "Позиции не нашёл"+(r.total?", но ИТОГ "+Math.round(r.total).toLocaleString("ru-RU")+" ₸":"")+". Попробуй переснять ближе или добавь вручную."});
};
// запоминаем, как сопоставили строки чека
window.rememberReceipt=function(tx,lines){(lines||[]).forEach(l=>{if(l.raw&&l.c&&l.n)M.rmap[key(l.raw)]={c:l.c,s:l.s,n:l.n}});if(tx.qr)M.seen[tx.qr]=tx.id};
window.QR_AVAILABLE=hasQR;
})();
