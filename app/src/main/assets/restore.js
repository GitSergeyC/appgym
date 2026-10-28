// Восстановление из файла выгрузки («Отправить данные файлом»): заменяет все данные приложения
(function(){
let pend=null;
function box(html){let b=document.getElementById("restoreBox");if(!b){b=document.createElement("div");b.id="restoreBox";b.className="restorebox";document.body.appendChild(b)}b.innerHTML='<div class="rin">'+html+"</div>";b.hidden=false;return b}
window.onImportFile=function(text){
  let j=null;try{j=JSON.parse(text)}catch(e){}
  const d=j&&(j.data||j);
  if(!d||!(d.money||d.food||d.base)){box('<b>Это не файл «Зала»</b><div class="muted">Выбери файл zal-….json, который сохранял через «Отправить данные файлом».</div><button type="button" class="bigbtn ghost" data-rs="x">Закрыть</button>');return}
  pend=d;const M=d.money||{},nt=(M.tx||[]).length,nf=Object.values(d.food||{}).reduce((s,a)=>s+a.length,0),np=(d.base||[]).length;
  box('<b>Восстановить данные из файла?</b><div class="muted">'+(j.at?"Сохранено "+new Date(j.at).toLocaleString("ru-RU")+". ":"")+"Записей денег: "+nt+", еды в дневнике: "+nf+", продуктов: "+np+'.</div><div class="muted">Всё, что сейчас в приложении, заменится данными из файла.</div><div class="wrow"><button type="button" class="bigbtn" data-rs="ok">Восстановить</button><button type="button" class="bigbtn ghost" data-rs="x">Отмена</button></div>');
};
window.startRestore=function(){try{Android.pickFile()}catch(e){wToast("Не открылся выбор файла")}};
document.addEventListener("click",e=>{const b=e.target.closest("[data-rs]");if(!b)return;
  const box=document.getElementById("restoreBox");
  if(b.dataset.rs==="ok"&&pend){try{localStorage.setItem(KEY,JSON.stringify(pend));try{localStorage.setItem(KEY+"-page","money")}catch(_){}location.reload()}catch(err){wToast("Не получилось записать данные")}return}
  if(b.dataset.rs==="pick"){startRestore();return}
  box.hidden=true;pend=null});
})();
