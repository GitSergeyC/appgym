// Кнопка «Назад» на телефоне: закрывает открытое окно, иначе возвращает на прошлую вкладку, иначе выходит
(function(){
const PG={pageTrain:"train",pageFood:"food",pageMoney:"money",pageBase:"base",pageStats:"stats"};
const cur=()=>{for(const id in PG){const e=$(id);if(e&&!e.hidden)return PG[id]}return null};
const stack=[];let nav=false;const orig=window.showPage;
window.showPage=function(n){const c=cur();if(!nav&&c&&c!==n){stack.push(c);if(stack.length>20)stack.shift()}return orig.apply(this,arguments)};
const vis=id=>{const e=$(id);return e&&!e.hidden};
window.onBack=function(){
  if(vis("msheet")&&window.MoneyAPI&&MoneyAPI.back())return true;
  if(vis("dsheet")){$("dsheet").hidden=true;document.body.style.overflow="";return true}
  if(vis("fvoice")){$("fvoice").hidden=true;return true}
  if(vis("bForm")){$("bForm").hidden=true;return true}
  if(vis("prodForm")){$("prodForm").hidden=true;return true}
  if(cur()==="money"&&window.MoneyAPI&&MoneyAPI.back())return true;
  while(stack.length){const p=stack.pop();if(p!==cur()){nav=true;try{showPage(p)}finally{nav=false}return true}}
  return false};
})();
