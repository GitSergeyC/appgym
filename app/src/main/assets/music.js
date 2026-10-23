// Мини-плеер: управляет любым играющим приложением (Яндекс Музыка, YouTube, YT Music…)
(function(){
const bar=document.getElementById("mbar");
const ok=!!(window.Android&&Android.musicState);
const root=document.documentElement;
const active=()=>!!(S.workout&&S.workout.on);
const setH=()=>root.style.setProperty("--mb",bar.hidden?"0px":bar.offsetHeight+"px");
// плеер виден только во время тренировки
window.musicShow=function(){bar.hidden=!(ok&&active());setH();if(!bar.hidden)poll()};
bar.hidden=true;
if(!ok){window.musicShow=function(){root.style.setProperty("--mb","0px")};return}
try{new ResizeObserver(setH).observe(bar)}catch(e){}
setH();

const PLAY="M8 5v14l11-7z",PAUSE="M6 5h4v14H6zM14 5h4v14h-4z";
let st={},artKey="";
const g=id=>document.getElementById(id);
function apps(show){g("mApps").hidden=!show;g("mInfo").setAttribute("aria-expanded",show);setH()}

function render(){
  const hint=g("mHint");
  if(!st.perm){
    g("mTitle").textContent="Музыка";g("mSub").textContent="Нажми ▶, чтобы разрешить управление плеером";
    hint.textContent="Откроются настройки «Доступ к уведомлениям». Включи там «Зал» и вернись. Доступ нужен только для кнопок музыки.";
    hint.hidden=false;
  }else if(!st.has){
    g("mTitle").textContent="Ничего не играет";g("mSub").textContent="Запусти плеер кнопкой ниже";hint.hidden=true;
    if(g("mApps").hidden)apps(true);
  }else{
    g("mTitle").textContent=st.title||(st.app?st.app+" — играет":"Играет");
    g("mSub").textContent=[st.artist,st.app].filter(Boolean).join(" · ");hint.hidden=true;
  }
  g("mPlayIco").innerHTML='<path d="'+(st.playing?PAUSE:PLAY)+'"/>';
  const key=st.has?(st.title||"")+"|"+(st.art?st.art.length:0):"";
  if(key!==artKey){artKey=key;const a=g("mArt");
    a.innerHTML=st.art?'<img src="'+st.art+'" alt="" style="width:44px;height:44px;border-radius:6px;object-fit:cover">':"♪"}
  setH();
}
function poll(){
  if(document.hidden||bar.hidden)return;
  try{st=JSON.parse(Android.musicState())||{}}catch(e){st={}}
  render();
}
function cmd(c){try{Android.musicCmd(c)}catch(e){}setTimeout(poll,350);setTimeout(poll,1200)}

g("mPlay").onclick=()=>{if(!st.perm){try{Android.openMusicPermission()}catch(e){}return}cmd("toggle")};
g("mPrev").onclick=()=>cmd("prev");
g("mNext").onclick=()=>cmd("next");
g("mInfo").onclick=()=>apps(g("mApps").hidden);
g("mApps").addEventListener("click",ev=>{const b=ev.target.closest("button");if(!b)return;
  try{Android.openApp(b.dataset.pkg)}catch(e){}});
document.addEventListener("visibilitychange",poll);
setInterval(poll,1500);window.musicShow();
})();
