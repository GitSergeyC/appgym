// База → «Категории денег»: полный редактор категорий, подкатегорий и позиций.
(function(){
const A=MoneyAPI,M=A.M,svg=A.svg,PAL=A.PALETTE;
const box=$("catEd"),prod=$("baseProd"),seg=$("baseSeg");
const ICONS=["basket","fork","smoke","home","car","phone","health","dumbbell","shirt","scissors","monitor","game","edu","bank","people","plane","paw","tag","more","briefcase","trophy","coins","percent","back","gift","cash","card","wallet","apple","swap","trend","db"].filter(k=>MCAT.P[k]);
const esc=esc0,norm=s=>String(s).toLowerCase().replace(/ё/g,"е");
let T="exp",open=null,itEd=null,arm=null;
const cats=()=>M.cats[T];
const done=()=>{A.save();render()};

function setTab(t){seg.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.bt===t));
  prod.hidden=t!=="prod";box.hidden=t!=="cat";if(t==="cat")render()}
seg.addEventListener("click",e=>{const b=e.target.closest("[data-bt]");if(b)setTab(b.dataset.bt)});
window.openCatEditor=function(t){T=t||"exp";open=null;itEd=null;showPage("base");setTab("cat");window.scrollTo(0,0)};
function armed(k,btn,label){if(arm===k){arm=null;return true}arm=k;btn.textContent=label;setTimeout(()=>{if(arm===k){arm=null;render()}},4000);return false}

function render(){
  const C=cats();
  let h='<header><h1>Категории денег</h1><p class="sub">Категория → подкатегория → позиция. Позиции с пометкой «ккал» связаны с продуктом из вкладки «Продукты»: оттуда калории, туда — цена из покупок.</p></header>'+
   '<div class="seg small" role="group">'+[["exp","Расходы"],["inc","Доходы"]].map(([k,n])=>'<button type="button" data-t="'+k+'" aria-pressed="'+(T===k)+'">'+n+"</button>").join("")+"</div>";
  h+=C.map((c,ci)=>{const op=open===c.id,nIt=c.s.reduce((s,x)=>s+x.it.length,0);
    let x='<div class="card"><div class="cerow"><span class="ic" style="background:'+c.c+'">'+svg(c.i)+'</span>'+
      '<button type="button" class="nmb" data-open="'+c.id+'" aria-expanded="'+op+'">'+esc(c.n)+"<small>"+c.s.length+" подкат. · "+nIt+" поз. "+(op?"▴":"▾")+"</small></button>"+
      '<span class="mv"><button type="button" data-cup="'+ci+'" aria-label="Выше"'+(ci?"":" disabled")+'>↑</button><button type="button" data-cdn="'+ci+'" aria-label="Ниже"'+(ci<C.length-1?"":" disabled")+">↓</button></span></div>";
    if(op){
      x+='<label class="fl">Название<input class="inp" data-cn="'+ci+'" value="'+esc(c.n)+'"></label>'+
        '<div class="label">Цвет</div><div class="swatches">'+PAL.map(p=>'<button type="button" data-col="'+p+'" aria-label="Цвет" aria-pressed="'+(c.c===p)+'" style="background:'+p+'"></button>').join("")+"</div>"+
        '<div class="label">Иконка</div><div class="icons">'+ICONS.map(k=>'<button type="button" data-ico="'+k+'" aria-pressed="'+(c.i===k)+'" aria-label="Иконка">'+svg(k)+"</button>").join("")+"</div>";
      x+=c.s.map((s,si)=>{
        let y='<div class="edsub"><div class="subh"><input class="inp" data-sn="'+ci+"|"+si+'" value="'+esc(s.n)+'" aria-label="Подкатегория">'+
          '<span class="mv"><button type="button" data-sup="'+ci+"|"+si+'"'+(si?"":" disabled")+' aria-label="Выше">↑</button><button type="button" data-sdn="'+ci+"|"+si+'"'+(si<c.s.length-1?"":" disabled")+' aria-label="Ниже">↓</button><button type="button" data-sdel="'+ci+"|"+si+'" aria-label="Удалить подкатегорию">×</button></span></div>'+
          '<div class="ichips">'+s.it.map((it,ii)=>{const k=ci+"|"+si+"|"+ii;return '<button type="button" data-ie="'+k+'" aria-pressed="'+(itEd===k)+'">'+esc(it.n)+(it.u?" · "+it.u:"")+(it.f?'<i class="kk">ккал</i>':"")+"</button>"}).join("")+"</div>";
        if(itEd&&itEd.startsWith(ci+"|"+si+"|")){const it=s.it[+itEd.split("|")[2]];if(it)y+=
          '<div class="ied"><label class="fl">Название позиции<input class="inp" id="ieN" value="'+esc(it.n)+'"></label>'+
          '<div class="fgrid" style="grid-template-columns:1fr 110px"><label>Продукт в базе питания<input class="inp" id="ieF" list="baseNames" placeholder="не связан" value="'+esc(it.f||"")+'"></label>'+
          '<label>Единица<select class="inp" id="ieU">'+[["","—"],["кг","кг"],["л","л"],["шт","шт"]].map(([v,n])=>'<option value="'+v+'"'+((it.u||"")===v?" selected":"")+">"+n+"</option>").join("")+"</select></label></div>"+
          '<div class="hint">Если связать с продуктом, в питании будут калории, а покупки обновят его цену за кг. Единица нужна для количества: кг, л или штуки.</div>'+
          '<div class="pickrow"><button type="button" class="chipbtn" data-isave="1">Сохранить</button><button type="button" class="chipbtn danger" data-idel="1">Удалить позицию</button><button type="button" class="chipbtn" data-icancel="1">Отмена</button></div></div>'}
        y+='<div class="addrow"><input class="inp" data-inew="'+ci+"|"+si+'" placeholder="Новая позиция в «'+esc(s.n)+'»"><button type="button" class="chipbtn" data-iadd="'+ci+"|"+si+'">+</button></div></div>';
        return y}).join("");
      x+='<div class="addrow"><input class="inp" data-snew="'+ci+'" placeholder="Новая подкатегория"><button type="button" class="chipbtn" data-sadd="'+ci+'">+</button></div>'+
        '<button type="button" class="chipbtn danger" data-cdel="'+ci+'">Удалить категорию</button>';
    }
    return x+"</div>"}).join("");
  h+='<div class="card"><div class="label">Новая категория</div><div class="addrow"><input class="inp" id="cNew" placeholder="Например: Ребёнок, Бизнес, Дача"><button type="button" class="chipbtn" data-cadd="1">Добавить</button></div></div>'+
   '<div class="foot"><button type="button" class="reset" data-restore="1">Вернуть стандартные категории и позиции</button></div>'+
   '<div class="muted">Удаление ничего не стирает в записях: старые траты останутся в аналитике со старым названием или как «Удалённая категория».</div>'+
   '<datalist id="baseNames">'+S.base.map(b=>'<option value="'+esc(b.n)+'">').join("")+"</datalist>";
  box.innerHTML=h;
}
const idx=s=>s.split("|").map(Number);
const swap=(a,i,j)=>{[a[i],a[j]]=[a[j],a[i]]};
box.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;const d=b.dataset,C=cats();
  if(d.t){T=d.t;open=null;itEd=null;render();return}
  if(d.open){open=open===d.open?null:d.open;itEd=null;render();return}
  if(d.cup){const i=+d.cup;swap(C,i,i-1);done();return}
  if(d.cdn){const i=+d.cdn;swap(C,i,i+1);done();return}
  const c=C.find(x=>x.id===open);
  if(d.col&&c){c.c=d.col;done();return}
  if(d.ico&&c){c.i=d.ico;done();return}
  if(d.sup){const [ci,si]=idx(d.sup);swap(C[ci].s,si,si-1);itEd=null;done();return}
  if(d.sdn){const [ci,si]=idx(d.sdn);swap(C[ci].s,si,si+1);itEd=null;done();return}
  if(d.sdel){const [ci,si]=idx(d.sdel);if(!armed("s"+d.sdel,b,"?"))return;C[ci].s.splice(si,1);itEd=null;done();return}
  if(d.ie){itEd=itEd===d.ie?null:d.ie;render();const n=$("ieN");if(n)n.focus();return}
  if(d.icancel){itEd=null;render();return}
  if(d.isave){const [ci,si,ii]=idx(itEd),cat=C[ci],sub=cat.s[si],it=sub.it[ii],old=it.n,nn=$("ieN").value.trim()||old;
    const f=$("ieF").value.trim(),u=$("ieU").value;
    it.n=nn;const bp=S.base.find(x=>norm(x.n)===norm(f));if(f&&bp)it.f=bp.n;else delete it.f;if(u)it.u=u;else delete it.u;
    if(nn!==old){M.tx.forEach(t=>(t.lines||[]).forEach(l=>{if(l.c===cat.id&&l.s===sub.n&&l.n===old)l.n=nn}));
      for(const k in (M.rmap||{})){const r=M.rmap[k];if(r.c===cat.id&&r.s===sub.n&&r.n===old)r.n=nn}}
    if(f&&!bp)wToast("Продукт «"+f+"» не найден в базе — позиция не связана");else wToast("Сохранено");
    itEd=null;done();return}
  if(d.idel){if(!armed("i"+itEd,b,"Нажми ещё раз"))return;const [ci,si,ii]=idx(itEd);C[ci].s[si].it.splice(ii,1);itEd=null;done();return}
  if(d.iadd){const [ci,si]=idx(d.iadd),inp=box.querySelector('[data-inew="'+d.iadd+'"]'),n=inp.value.trim();if(!n)return;
    const it={n};const bp=S.base.find(x=>norm(x.n)===norm(n));if(bp){it.f=bp.n;it.u="кг"}C[ci].s[si].it.push(it);done();return}
  if(d.sadd){const ci=+d.sadd,inp=box.querySelector('[data-snew="'+ci+'"]'),n=inp.value.trim();if(!n)return;C[ci].s.push({n,it:[]});done();return}
  if(d.cdel){const ci=+d.cdel;if(!armed("c"+ci,b,"Нажми ещё раз: удалить «"+C[ci].n+"»"))return;C.splice(ci,1);open=null;done();return}
  if(d.cadd){const n=$("cNew").value.trim();if(!n)return;const id="u"+Date.now().toString(36);
    C.push({id,n,i:"more",c:PAL[C.length%PAL.length],s:[{n:n,it:[]}]});open=id;done();return}
  if(d.restore){if(!armed("restore",b,"Нажми ещё раз: добавить недостающие стандартные"))return;
    let added=0;const D=T==="inc"?MCAT.INC:MCAT.EXP;
    D.forEach(dc=>{let c=C.find(x=>x.id===dc.id);if(!c){C.push(JSON.parse(JSON.stringify(dc)));added++;return}
      dc.s.forEach(ds=>{let s=c.s.find(x=>x.n===ds.n);if(!s){c.s.push(JSON.parse(JSON.stringify(ds)));added++;return}
        ds.it.forEach(di=>{if(!s.it.some(x=>x.n===di.n)){s.it.push(JSON.parse(JSON.stringify(di)));added++}})})});
    wToast(added?"Вернул: "+added:"Всё стандартное на месте");done();return}
});
box.addEventListener("change",e=>{const t=e.target,d=t.dataset,C=cats();
  if(d.cn!=null){const v=t.value.trim();if(v){C[+d.cn].n=v;done()}}
  else if(d.sn!=null){const [ci,si]=idx(d.sn),cat=C[ci],old=cat.s[si].n,v=t.value.trim();if(!v||v===old)return;
    cat.s[si].n=v;M.tx.forEach(x=>(x.lines||[]).forEach(l=>{if(l.c===cat.id&&l.s===old)l.s=v}));
    for(const k in (M.rmap||{})){const r=M.rmap[k];if(r.c===cat.id&&r.s===old)r.s=v}done()}
});
box.addEventListener("keydown",e=>{if(e.key!=="Enter")return;const t=e.target,d=t.dataset;
  const btn=d.inew?box.querySelector('[data-iadd="'+d.inew+'"]'):d.snew!=null?box.querySelector('[data-sadd="'+d.snew+'"]'):t.id==="cNew"?box.querySelector("[data-cadd]"):null;
  if(btn){e.preventDefault();btn.click()}});
})();
