// Редактор программы: тренировки и упражнения
(function(){
window.editMode=false;
const btn=document.getElementById("editBtn");
let editIdx=null,armed=null,armT=null;
const LETTERS="АБВГДЕЖЗИКЛМ";
const commit=()=>{syncNames();save();renderTabs();renderGrid();renderList();setSub()};
function setSub(){const o=order();document.getElementById("trainSub").textContent=slots()+" тренировок на месяц · порядок "+o.join(" → ")}
function arm(key,el,label){ // второе нажатие подтверждает
  if(armed===key){armed=null;clearTimeout(armT);return true}
  armed=key;el.textContent=label;clearTimeout(armT);armT=setTimeout(()=>{armed=null;renderList()},4000);return false;
}
btn.onclick=()=>{editMode=!editMode;editIdx=null;btn.textContent=editMode?"Готово":"Изменить программу";
  btn.className=editMode?"btn":"btn ghost";renderList()};

function form(e){
  e=e||{};const v=x=>esc0(x==null?"":x);
  return '<form class="pick" id="exForm">'+
    '<div class="ttl">'+(e.id?"Изменить упражнение":"Новое упражнение")+'</div>'+
    '<label class="fl">Название<input class="inp" id="exN" type="text" required value="'+v(e.n)+'"></label>'+
    '<div class="fgrid" style="grid-template-columns:1fr 1fr 1fr">'+
      '<label>Подходы×повт.<input class="inp" id="exS" type="text" placeholder="4×10" value="'+v(e.sch)+'"></label>'+
      '<label>Цель нед 1–2, кг<input class="inp" id="exW1" type="text" value="'+v(e.w12)+'"></label>'+
      '<label>Цель нед 3–4, кг<input class="inp" id="exW2" type="text" value="'+v(e.w34)+'"></label>'+
    '</div>'+
    '<label class="fl">Подсказка по технике<input class="inp" id="exNote" type="text" value="'+v(e.note)+'"></label>'+
    '<label class="chk"><input type="checkbox" id="exBw"'+(e.bw?" checked":"")+'>Без веса (только повторы)</label>'+
    '<label class="chk"><input type="checkbox" id="exAs"'+(e.assist?" checked":"")+'>Противовес: меньше = тяжелее</label>'+
    '<div class="pickrow"><button class="btn" type="submit">Сохранить</button><button class="btn ghost" type="button" id="exCancel">Отмена</button></div>'+
  '</form>';
}

window.renderEditor=function(L){
  const d=PLAN[tab],ex=d.ex,keys=Object.keys(PLAN);
  let h='<div class="card"><div class="label">Тренировка</div><div class="fgrid" style="grid-template-columns:90px 1fr">'+
    '<label>Буква<input class="inp" id="dName" type="text" maxlength="3" value="'+esc0(d.name)+'"></label>'+
    '<label>Описание<input class="inp" id="dSub" type="text" placeholder="ноги · спина · грудь" value="'+esc0(d.sub||"")+'"></label></div></div>';
  ex.forEach((e,i)=>{
    if(editIdx===i){h+=form(e);return}
    h+='<div class="edrow"><div class="nm">'+(i+1)+". "+esc0(e.n)+'<small>'+esc0(e.sch||"")+
      (e.bw?" · без веса":e.w12?" · "+esc0(e.w12)+(e.w34&&e.w34!==e.w12?" → "+esc0(e.w34):"")+" кг":"")+(e.assist?" · противовес":"")+'</small></div>'+
      '<div class="edbtns"><button type="button" data-a="up" data-i="'+i+'" aria-label="Выше"'+(i?"":" disabled")+'>↑</button>'+
      '<button type="button" data-a="down" data-i="'+i+'" aria-label="Ниже"'+(i<ex.length-1?"":" disabled")+'>↓</button>'+
      '<button type="button" data-a="edit" data-i="'+i+'" aria-label="Изменить">✎</button>'+
      '<button type="button" data-a="del" data-i="'+i+'" aria-label="Удалить">×</button></div></div>';
  });
  if(editIdx==="new")h+=form(null);
  h+='<div class="pickrow" style="flex-wrap:wrap"><button class="btn" type="button" data-a="add">+ Упражнение</button>'+
     '<button class="btn ghost" type="button" data-a="addDay">+ Тренировка</button></div>'+
     '<div class="foot" style="display:flex;gap:8px;flex-wrap:wrap">'+
     (keys.length>1?'<button class="reset" type="button" data-a="delDay">Удалить тренировку '+esc0(d.name)+'</button>':"")+
     '<button class="reset" type="button" data-a="reset">Вернуть программу по умолчанию</button></div>'+
     '<div class="msg">Записи по удалённым упражнениям не пропадают: они останутся в «Прогрессе».</div>';
  L.innerHTML=h;
  const f=document.getElementById("exForm");
  if(f){document.getElementById("exN").focus();
    document.getElementById("exCancel").onclick=()=>{editIdx=null;renderList()};
    f.onsubmit=ev=>{ev.preventDefault();
      const g=id=>document.getElementById(id).value.trim();
      const n=g("exN");if(!n)return;
      const it={id:editIdx==="new"?"x"+Date.now().toString(36):ex[editIdx].id,n:n,sch:g("exS")||"4×10",
        w12:g("exW1"),w34:g("exW2")||g("exW1"),note:g("exNote")};
      if(document.getElementById("exBw").checked){it.bw=true;it.w12=it.w34=""}
      if(document.getElementById("exAs").checked)it.assist=true;
      if(editIdx==="new")ex.push(it);else ex[editIdx]=it;
      editIdx=null;commit();
    };
  }
  document.getElementById("dName").onchange=ev=>{d.name=ev.target.value.trim()||d.name;commit()};
  document.getElementById("dSub").onchange=ev=>{d.sub=ev.target.value.trim();commit()};
};

document.getElementById("list").addEventListener("click",ev=>{
  if(!editMode)return;const b=ev.target.closest("button[data-a]");if(!b)return;
  const a=b.dataset.a,i=+b.dataset.i,ex=PLAN[tab].ex;
  if(a==="up"&&i>0){[ex[i-1],ex[i]]=[ex[i],ex[i-1]];commit()}
  else if(a==="down"&&i<ex.length-1){[ex[i+1],ex[i]]=[ex[i],ex[i+1]];commit()}
  else if(a==="edit"){editIdx=i;renderList()}
  else if(a==="del"){if(arm("del"+i,b,"?")){ex.splice(i,1);editIdx=null;commit()}}
  else if(a==="add"){editIdx="new";renderList()}
  else if(a==="addDay"){
    const k="T"+Date.now().toString(36),n=Object.keys(PLAN).length;
    PLAN[k]={name:LETTERS[n]||String(n+1),sub:"",ex:[]};tab=k;editIdx="new";
    try{localStorage.setItem(KEY+"-tab",k)}catch(e){}commit();
  }
  else if(a==="delDay"){if(arm("day",b,"Точно удалить "+PLAN[tab].name+"?")){
    delete PLAN[tab];tab=Object.keys(PLAN)[0];commit()}}
  else if(a==="reset"){if(arm("reset",b,"Нажми ещё раз: твои изменения программы пропадут")){
    S.plan=JSON.parse(JSON.stringify(DEFAULT_PLAN));PLAN=S.plan;tab=Object.keys(PLAN)[0];editIdx=null;commit()}}
});
setSub();
})();
