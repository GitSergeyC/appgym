// Питание: голосовой ввод съеденного и режим «Блюдо» (ингредиенты → готовый вес → порции).
(function(){
S.dishes=S.dishes||[];S.pots=S.pots||[];
const hasVoice=!!(window.Android&&Android.voice);
const norm=s=>String(s).toLowerCase().replace(/ё/g,"е");
const esc=esc0,R0=x=>Math.round(x),R1=x=>Math.round(x*10)/10;
const fmt=n=>Math.round(n).toLocaleString("ru-RU");
const toast=m=>window.wToast&&wToast(m);

// ---------- поиск продукта по словам ----------
const SYN={"куриц":"грудк","картош":"картоф","яичн":"яйц","огурч":"огурц","помид":"помид","макарош":"макар"};
const stem=w=>{let s=norm(w).slice(0,Math.max(3,Math.min(5,w.length-1)));for(const k in SYN)if(s.startsWith(k.slice(0,4))&&k.startsWith(s.slice(0,4))){s=SYN[k];break}return s};
const recent=()=>(S.recent||[]);
function findProd(words,raw){
  const st=words.map(stem);
  const hits=S.base.filter(b=>{const pw=norm(b.n).split(/[^a-zа-я0-9]+/).filter(Boolean);return st.every(s=>pw.some(p=>p.startsWith(s)))});
  if(!hits.length)return null;
  const rec=recent();
  hits.sort((a,b)=>{const ra=rec.indexOf(a.n),rb=rec.indexOf(b.n);
    if(ra>=0||rb>=0)return(ra<0?99:ra)-(rb<0?99:rb);
    const pa=raw&&/сух|сыр/.test(norm(a.n))?0:1,pb=raw&&/сух|сыр/.test(norm(b.n))?0:1;if(pa!==pb)return pa-pb;
    if(!!a.dish!==!!b.dish)return a.dish?-1:1;return a.n.length-b.n.length});
  return hits[0];
}
const pieceW=b=>{const m=b.n.match(/1 шт ≈ (\d+) г/);return m?+m[1]:b.pw?+b.pw:0};

// ---------- разбор фразы: «куриная грудка 153 грамма, картошка 523, лук морковь кабачок 133, 2 яйца» ----------
const NUMW={"один":1,"одна":1,"одно":1,"одну":1,"два":2,"две":2,"три":3,"четыре":4,"пять":5,"шесть":6,"семь":7,"восемь":8,"девять":9,"десять":10,"полтора":1.5,"полторы":1.5,"половина":0.5,"половину":0.5,"сто":100,"двести":200,"триста":300,"пятьсот":500};
const UNITS=[[/^(г|гр|грамм[а-я]*)$/,"g"],[/^(кг|кило[а-я]*)$/,"kg"],[/^(мл|миллилитр[а-я]*)$/,"ml"],[/^(л|литр[а-я]*)$/,"l"],[/^(шт|штук[а-я]*|штуки|кусо?к[а-я]*|ложк[а-я]*)$/,"pcs"]];
const FILL=new Set(["и","с","со","на","по","еще","ещё","съел","съела","поел","поела","потом","а","это","вот","граммов","грамм","примерно","где-то","около"]);
const unitOf=w=>{for(const [re,u] of UNITS)if(re.test(w||""))return u;return null};
function parsePhrase(text,raw){
  let t=" "+norm(text).replace(/[,;!?]+/g," , ").replace(/(\d),(\d)/g,"$1.$2")+" ";
  t=t.replace(/\sпол\s?кило[а-я]*\s/g," 500 г ").replace(/\sпол\s?литр[а-я]*\s/g," 500 мл ");
  for(let k=0;k<2;k++)t=t.replace(/\s([а-я]+)\s/g,(m,w)=>NUMW[w]!=null?" "+NUMW[w]+" ":m);
  t=t.replace(/(\d)(г|гр|кг|мл|л|шт)(?=\s)/g,"$1 $2");
  const tok=t.trim().split(/\s+/),segs=[];let cur={w:[],v:null,u:null,pre:false};
  const push=()=>{if(cur.w.length)segs.push(cur);cur={w:[],v:null,u:null,pre:false}};
  for(let i=0;i<tok.length;i++){const w=tok[i];
    if(w===","||w==="и"){if(cur.w.length&&cur.v!=null)push();continue} // «2 яйца и банан 120» — разные куски
    if(/^\d+(\.\d+)?$/.test(w)){const v=parseFloat(w),u=unitOf(tok[i+1]);if(u)i++;
      if(cur.w.length&&cur.v==null){cur.v=v;cur.u=u;push()}
      else{if(cur.w.length)push();cur.v=v;cur.u=u;cur.pre=true}
      continue}
    if(unitOf(w)||FILL.has(w))continue;
    cur.w.push(w)}
  push();
  const lines=[];
  segs.forEach(sg=>{
    // в одном куске может быть несколько продуктов: «лук морковь кабачок 133»
    const ws=sg.w,found=[];let i=0;const left=[];
    while(i<ws.length){let hit=null,len=0;for(let j=Math.min(ws.length,i+3);j>i;j--){const p=findProd(ws.slice(i,j),raw);if(p){hit=p;len=j-i;break}}
      if(hit){found.push(hit);i+=len}else{left.push(ws[i]);i++}}
    const v=sg.v;
    const gramsFor=b=>{if(v==null)return"";if(sg.u==="kg"||sg.u==="l")return R0(v*1000);if(sg.u==="g"||sg.u==="ml")return R0(v);
      const pw=b?pieceW(b):0;if(sg.u==="pcs"||(sg.pre&&v<=20))return pw?R0(v*pw):"";return R0(v)};
    if(!found.length){lines.push({n:null,raw:ws.join(" "),g:gramsFor(null)});return}
    if(found.length===1){lines.push({n:found[0].n,raw:ws.join(" "),g:gramsFor(found[0])});return}
    const tot=gramsFor(null);
    found.forEach(b=>lines.push({n:b.n,raw:ws.join(" "),g:tot===""?"":R0(tot/found.length),split:true}));
  });
  return lines;
}
window.parseFoodPhrase=parsePhrase;
const kcalOf=l=>{const b=l.n&&findByName(l.n);return b&&+l.g?b.k*l.g/100:0};

// ---------- голос: куда отправить результат ----------
let voiceTo=null;
const prevVoice=window.onVoice;
window.onVoice=function(text){if(voiceTo){const f=voiceTo;voiceTo=null;f(text);return}if(prevVoice)prevVoice(text)};
function listen(fn){voiceTo=fn;try{Android.voice()}catch(e){voiceTo=null;toast("Голосовой ввод недоступен")}}

// ---------- панель «Услышал» в Питании ----------
let FV=null,pickFor=null;
const fvBox=$("fvoice");
function lineRows(lines,pre){return lines.map((l,i)=>'<div class="fl2"><div class="nm">'+(l.n?esc(l.n)+(l.split?"<small>вес поделён поровну — поправь</small>":l.raw&&norm(l.raw)!==norm(l.n)?"<small>«"+esc(l.raw)+"»</small>":""):
  '<button type="button" class="pickp" data-'+pre+'pick="'+i+'">«'+esc(l.raw||"?")+'» — выбрать продукт</button>')+"</div>"+
  '<input class="inp" data-'+pre+'g="'+i+'" inputmode="decimal" placeholder="г" value="'+esc(l.g)+'" aria-label="Граммы">'+
  '<span class="kc">'+(l.n&&+l.g?R0(kcalOf(l))+" ккал":"")+'</span><button type="button" class="x" data-'+pre+'x="'+i+'" aria-label="Убрать">×</button></div>').join("")}
function renderFV(){
  if(!FV){fvBox.hidden=true;fvBox.innerHTML="";return}
  const tot=FV.lines.reduce((s,l)=>s+kcalOf(l),0);
  fvBox.hidden=false;
  fvBox.innerHTML='<div class="heard">'+(FV.heard?"Услышал: «"+esc(FV.heard)+"»":"Разбор")+'</div>'+lineRows(FV.lines,"v")+
    (pickFor!=null?'<div class="hint" style="color:var(--fg)">Найди продукт в поиске выше и нажми на него.</div>':"")+
    '<div class="muted">Итого ≈ '+R0(tot)+' ккал. Граммы можно поправить.</div>'+
    '<div class="pickrow" style="flex-wrap:wrap"><button type="button" class="btn" data-fv="eat">Записать в съеденное</button><button type="button" class="btn ghost" data-fv="dish">Это ингредиенты блюда</button><button type="button" class="btn ghost" data-fv="close">Отмена</button></div>';
}
function showParsed(text,heard){FV={heard:heard?text:"",lines:parsePhrase(text,false)};pickFor=null;
  if(!FV.lines.length){toast("Не понял. Скажи так: «грудка 150 грамм, рис 200»");FV=null}renderFV()}
if(hasVoice){$("fMic").hidden=false;$("fMic").onclick=()=>listen(t=>{if(!t){toast("Не расслышал");return}showParsed(t,true)})}
// фраза с цифрами в поиске + Enter
$("q").addEventListener("keydown",e=>{if(e.key==="Enter"&&/\d/.test(e.target.value)){e.preventDefault();showParsed(e.target.value,false);e.target.value="";renderFood()}});
fvBox.addEventListener("input",e=>{const i=e.target.dataset.vg;if(i!=null){FV.lines[+i].g=e.target.value.replace(",",".");const k=e.target.parentNode.querySelector(".kc");if(k)k.textContent=FV.lines[+i].n&&+FV.lines[+i].g?R0(kcalOf(FV.lines[+i]))+" ккал":""}});
fvBox.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const d=b.dataset;
  if(d.vx!=null){FV.lines.splice(+d.vx,1);if(!FV.lines.length)FV=null;renderFV();return}
  if(d.vpick!=null){pickFor=+d.vpick;renderFV();const q=$("q");q.value=FV.lines[pickFor].raw||"";q.dispatchEvent(new Event("input"));q.focus();return}
  if(d.fv==="close"){FV=null;renderFV();return}
  if(d.fv==="eat"){const ok=FV.lines.filter(l=>l.n&&+l.g>0);if(!ok.length){toast("Выбери продукты и впиши граммы");return}
    ok.forEach(l=>{const p=findByName(l.n);entries().push({n:p.n,g:+l.g,k:p.k,p:p.p,f:p.f,c:p.c});S.lastG[p.n]=+l.g;S.recent=[p.n].concat(S.recent.filter(n=>n!==p.n)).slice(0,15)});
    save();toast("Записано: "+ok.length+" поз.");FV=null;renderFV();renderFood();return}
  if(d.fv==="dish"){openDish(null,FV.lines.filter(l=>l.n).map(l=>({n:l.n,g:l.g})));FV=null;renderFV();return}
});
// выбор продукта для строки без совпадения — перехватываем клик по результатам поиска
$("results").addEventListener("click",e=>{
  const b=e.target.closest("button[data-n]");if(!b)return;
  if(pickFor!=null&&FV){e.stopImmediatePropagation();FV.lines[pickFor].n=b.dataset.n;pickFor=null;$("q").value="";renderFood();renderFV();return}
  if(dPick&&!$("dsheet").hidden){e.stopImmediatePropagation()}
},true);

// ---------- блюда ----------
const dishCard=$("dishCard");
function dishTotals(D){let w=0,k=0,p=0,f=0,c=0,cost=0,priced=0;
  D.ing.forEach(i=>{const b=findByName(i.n),g=+i.g||0;w+=g;if(!b)return;k+=b.k*g/100;p+=b.p*g/100;f+=b.f*g/100;c+=b.c*g/100;if(b.pkg){cost+=b.pkg*g/1000;priced++}});
  const cooked=(+D.cooked||w)-(+D.pot||0);
  return{w,k,p,f,c,cost,priced,cooked:cooked>0?cooked:w}}
function renderDishCard(){
  const L=S.dishes.slice().sort((a,b)=>(b.t||0)-(a.t||0));
  dishCard.innerHTML='<div class="label">Блюда</div>'+(L.length?L.slice(0,showAll?99:5).map(D=>{const b=findByName(D.n);
    return '<div class="dishrow"><div class="nm"><button type="button" class="linkbtn" style="padding:0;text-align:left" data-dedit="'+D.id+'">'+esc(D.n)+"</button><small>"+(b?R0(b.k)+" ккал/100 г · Б"+R1(b.p)+" Ж"+R1(b.f)+" У"+R1(b.c)+(b.pkg?" · "+fmt(b.pkg/10)+" ₸/100 г":""):"")+"</small></div>"+
      '<input class="inp" data-dg="'+D.id+'" inputmode="decimal" placeholder="г" value="'+(S.lastG[D.n]||"")+'" aria-label="Граммы порции"><button type="button" class="btn" data-deat="'+D.id+'">Съел</button></div>'}).join("")+
    (L.length>5?'<button type="button" class="linkbtn" data-dall="1">'+(showAll?"Свернуть":"Все блюда: "+L.length)+"</button>":""):
    '<div class="muted">Готовишь на несколько раз? Взвесь ингредиенты сырыми, потом готовое блюдо целиком — и записывай порции по весу тарелки.</div>')+
    '<button type="button" class="btn ghost" data-dnew="1">+ Новое блюдо</button>';
}
let showAll=false;
dishCard.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const d=b.dataset;
  if(d.dnew){openDish(null,[]);return}
  if(d.dall){showAll=!showAll;renderDishCard();return}
  if(d.dedit){openDish(S.dishes.find(x=>x.id===d.dedit));return}
  if(d.deat){const D=S.dishes.find(x=>x.id===d.deat),p=D&&findByName(D.n),g=+String(dishCard.querySelector('[data-dg="'+d.deat+'"]').value).replace(",",".");
    if(!p||!(g>0)){toast("Впиши вес порции в граммах");return}
    entries().push({n:p.n,g,k:p.k,p:p.p,f:p.f,c:p.c});S.lastG[p.n]=g;S.recent=[p.n].concat(S.recent.filter(n=>n!==p.n)).slice(0,15);
    save();renderFood();toast(p.n+": "+g+" г ≈ "+R0(p.k*g/100)+" ккал")}
});
const origRF=renderFood;renderFood=function(){origRF.apply(this,arguments);renderDishCard()};

// ---------- редактор блюда ----------
const ds=$("dsheet");let D=null,dPick=false,dArm=false;
function openDish(dish,ing){
  D=dish?JSON.parse(JSON.stringify(dish)):{id:"d"+Date.now().toString(36),n:"",ing:ing||[],cooked:"",pot:"",isNew:true};
  if(ing&&dish)D.ing=D.ing.concat(ing);
  ds.hidden=false;document.body.style.overflow="hidden";dArm=false;renderDish();
}
function closeDish(){ds.hidden=true;document.body.style.overflow="";D=null}
function renderDish(){
  const T=dishTotals(D),k100=T.cooked?T.k/T.cooked*100:0;
  const q=(ds.querySelector("#dq")||{}).value||"";
  const res=q.trim().length>=2?search(q).slice(0,8):[];
  ds.innerHTML='<div class="sin"><div class="sheethead"><button type="button" data-dx="close">Отмена</button><b>'+(D.isNew?"Новое блюдо":"Блюдо")+'</b><button type="button" data-dx="save">Сохранить</button></div>'+
   '<label class="fl">Название<input class="inp" id="dN" placeholder="Курица с картошкой" value="'+esc(D.n)+'"></label>'+
   '<div class="card"><div class="label">Ингредиенты (сырые, без посуды)</div>'+
   (D.ing.length?lineRows(D.ing.map(i=>({n:i.n,g:i.g})),"i"):'<div class="muted">Добавь продукты поиском или голосом: «курица 153 грамма, картошка 523, лук морковь кабачок 133».</div>')+
   '<div class="addrow"><input class="inp" id="dq" placeholder="Найти продукт или «рис 200»" value="'+esc(q)+'" autocomplete="off">'+(hasVoice?'<button type="button" class="btn micbtn" data-dx="mic" aria-label="Сказать ингредиенты"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>':"")+"</div>"+
   (res.length?'<div class="res">'+res.map(x=>'<button type="button" data-dadd="'+esc(x.n)+'"><span>'+esc(x.n)+"</span><span>"+R0(x.k)+" ккал</span></button>").join("")+"</div>":"")+"</div>"+
   '<div class="card"><div class="label">Готовое блюдо</div>'+
   '<div class="fgrid" style="grid-template-columns:1fr 1fr"><label>Вес готового, г<input class="inp" id="dC" inputmode="decimal" placeholder="'+R0(T.w)+'" value="'+esc(D.cooked)+'"></label><label>Минус посуда, г<input class="inp" id="dP" inputmode="decimal" placeholder="0" value="'+esc(D.pot)+'"></label></div>'+
   (S.pots.length?'<div class="chips">'+S.pots.map((p,i)=>'<button type="button" data-pot="'+i+'">'+esc(p.n)+" "+p.g+" г</button>").join("")+"</div>":"")+
   '<div class="hint">Взвесь кастрюлю или сковороду с готовым блюдом и впиши вес посуды — он вычтется. Не взвешивал — посчитаю по сырому весу ('+R0(T.w)+' г).</div>'+
   '<div class="addrow"><input class="inp" id="potN" placeholder="Запомнить посуду: «кастрюля 2 л»"><input class="inp" id="potG" inputmode="numeric" placeholder="г" style="max-width:80px"><button type="button" class="chipbtn" data-dx="potadd">+</button></div></div>'+
   '<div class="dtot"><div><b>'+R0(T.k)+'</b>ккал во всём блюде</div><div><b>'+R0(T.cooked)+' г</b>готового</div>'+
   '<div><b>'+R0(k100)+'</b>ккал на 100 г</div><div><b>'+(T.cooked?R1(T.p/T.cooked*100)+" / "+R1(T.f/T.cooked*100)+" / "+R1(T.c/T.cooked*100):"—")+'</b>Б / Ж / У на 100 г</div>'+
   '<div><b>'+(T.cooked?R0(k100*3.5):"—")+'</b>ккал в тарелке 350 г</div><div><b>'+(T.priced?fmt(T.cost)+" ₸":"—")+'</b>'+(T.priced?"стоимость"+(T.priced<D.ing.length?" (цены есть у "+T.priced+" из "+D.ing.length+")":""):"нет цен в базе")+"</div></div>"+
   (D.isNew?"":'<button type="button" class="chipbtn danger" data-dx="del">'+(dArm?"Нажми ещё раз: удалить блюдо":"Удалить блюдо")+"</button>")+"</div>";
}
const keepQ=()=>{const q=ds.querySelector("#dq");return q?{v:q.value,p:q.selectionStart}:null};
ds.addEventListener("input",e=>{const t=e.target;
  if(t.id==="dN"){D.n=t.value;return}
  if(t.id==="dC"||t.id==="dP"){D[t.id==="dC"?"cooked":"pot"]=t.value.replace(",",".");const k=keepQ(),id=t.id,pos=t.selectionStart;renderDish();const el=$(id);el.focus();el.setSelectionRange(pos,pos);return}
  if(t.dataset.ig!=null){D.ing[+t.dataset.ig].g=t.value.replace(",",".");const id='[data-ig="'+t.dataset.ig+'"]',pos=t.selectionStart;renderDish();const el=ds.querySelector(id);el.focus();el.setSelectionRange(pos,pos);return}
  if(t.id==="dq"){const pos=t.selectionStart;renderDish();const el=$("dq");el.focus();el.setSelectionRange(pos,pos)}
});
ds.addEventListener("keydown",e=>{if(e.target.id==="dq"&&e.key==="Enter"&&/\d/.test(e.target.value)){e.preventDefault();addParsed(e.target.value);e.target.value="";renderDish()}});
function addParsed(text){const L=parsePhrase(text,true);const ok=L.filter(l=>l.n);D.ing=D.ing.concat(ok.map(l=>({n:l.n,g:l.g})));
  const miss=L.filter(l=>!l.n).map(l=>l.raw);toast((ok.length?"Добавлено: "+ok.map(l=>l.n).join(", "):"")+(miss.length?(ok.length?". ":"")+"Не нашёл: "+miss.join(", "):""))}
ds.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const d=b.dataset;
  if(d.dx==="close"){closeDish();return}
  if(d.dx==="mic"){listen(t=>{if(!t){toast("Не расслышал");return}addParsed(t);renderDish()});return}
  if(d.dadd){D.ing.push({n:d.dadd,g:""});ds.querySelector("#dq").value="";renderDish();const ins=ds.querySelectorAll("[data-ig]");if(ins.length)ins[ins.length-1].focus();return}
  if(d.ix!=null){D.ing.splice(+d.ix,1);renderDish();return}
  if(d.pot!=null){D.pot=String(S.pots[+d.pot].g);renderDish();return}
  if(d.dx==="potadd"){const n=$("potN").value.trim(),g=+$("potG").value;if(!n||!g)return;S.pots.push({n,g});save();D.pot=String(g);renderDish();return}
  if(d.dx==="del"){if(!dArm){dArm=true;renderDish();return}S.dishes=S.dishes.filter(x=>x.id!==D.id);S.base=S.base.filter(x=>x.dish!==D.id);save();closeDish();renderFood();toast("Блюдо удалено");return}
  if(d.dx==="save"){
    const n=(D.n||"").trim();if(!n){toast("Назови блюдо");$("dN").focus();return}
    const ing=D.ing.filter(i=>+i.g>0);if(!ing.length){toast("Добавь ингредиенты с граммами");return}
    D.ing=ing;D.n=n;const T=dishTotals(D);
    if(S.base.some(x=>x.n===n&&x.dish!==D.id)){toast("Продукт с таким названием уже есть — назови блюдо иначе");return}
    const prod={n,k:R1(T.k/T.cooked*100),p:R1(T.p/T.cooked*100),f:R1(T.f/T.cooked*100),c:R1(T.c/T.cooked*100),dish:D.id};
    if(T.priced===ing.length&&T.cost)prod.pkg=R0(T.cost/T.cooked*1000);
    S.base=S.base.filter(x=>x.dish!==D.id);S.base.unshift(prod);
    const rec={id:D.id,n,ing,cooked:D.cooked,pot:D.pot,t:Date.now()};
    const i=S.dishes.findIndex(x=>x.id===D.id);if(i>=0)S.dishes[i]=rec;else S.dishes.push(rec);
    save();closeDish();renderFood();toast("Блюдо «"+n+"»: "+prod.k+" ккал на 100 г. Записывай порции в карточке «Блюда»")}
});
// пикер для строки ингредиента без совпадения не нужен: ингредиенты добавляются только найденные
renderDishCard();
})();
