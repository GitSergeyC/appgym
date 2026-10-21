// Прогресс: посещения, выполнение, тоннаж, рабочие веса
(function(){
const TABS=["A","B","C"],LET={A:"А",B:"Б",C:"В"};

const months=()=>(S.hist||[]).concat([{s:S.s||{},e:S.e||{},cur:true}]);
const repsOf=(d,scheme)=>{
  const nums=String(d.r||"").match(/\d+(?:[.,]\d+)?/g);
  if(nums)return nums.reduce((a,x)=>a+num(x),0);
  if(d.c){const m=String(scheme).match(/(\d+)\s*[×x]\s*(\d+)/);if(m)return +m[1]*+m[2]}
  return 0;
};
const fmtD=k=>{const [y,m,d]=k.split("-").map(Number);return new Date(y,m-1,d).toLocaleDateString("ru-RU",{day:"numeric",month:"short"}).replace(".","")};
const fmtN=x=>r0(x).toLocaleString("ru-RU");

window.renderStats=function(){
  const M=months();
  // посещения
  let dated=[],undated=0;
  M.forEach(mo=>Object.keys(mo.s).forEach(i=>{const v=mo.s[i];if(!v)return;
    if(typeof v==="string")dated.push({d:v,t:["А","Б","В"][i%3]});else undated++}));
  dated.sort((a,b)=>a.d<b.d?1:-1);
  const total=dated.length+undated;
  const cur=Object.values(S.s||{}).filter(Boolean).length;
  const since=new Date();since.setDate(since.getDate()-28);const sk=dkey(since);
  const perWeek=dated.filter(x=>x.d>=sk).length/4;
  // выполнение текущего месяца
  let fillAll=0,doneAll=0;const comp={};
  TABS.forEach(t=>{let f=0,d=0;PLAN[t].ex.forEach(e=>{for(let w=1;w<=4;w++){const x=(S.e||{})[e.id+"-"+w];
    if(x&&(x.w||x.r||x.c)){f++;if(x.c)d++}}});comp[t]={f,d};fillAll+=f;doneAll+=d});
  $("stKpi").innerHTML=[[cur+" из 12","тренировок в этом месяце"],[total,"тренировок всего"],
    [String(Math.round(perWeek*10)/10).replace(".",","),"в неделю за последние 4 недели"],
    [fillAll?Math.round(doneAll/fillAll*100)+"%":"—","подходов выполнено полностью"]]
    .map(([a,b])=>'<div class="kpi"><b>'+a+"</b><span>"+b+"</span></div>").join("");
  $("stDates").innerHTML=(dated.slice(0,24).map(x=>"<span>"+fmtD(x.d)+" · "+x.t+"</span>").join("")+
    (undated?'<span class="nodate">ещё '+undated+" без даты</span>":""))||'<span class="nodate">Отметь тренировку на вкладке «Зал», и она появится здесь с датой</span>';
  $("stComp").innerHTML=TABS.map(t=>{const c=comp[t],pct=c.f?c.d/c.f*100:0;
    return '<div class="comp"><span>Тренировка '+LET[t]+'</span><div class="bar"><i class="'+(pct>=90?"full":"")+'" style="width:'+pct+'%"></i></div><span>'+(c.f?r0(pct)+"%":"—")+"</span></div>"}).join("")+
    '<div class="muted">Доля недель с галочкой «всё выполнено» среди заполненных.</div>';
  // тоннаж по неделям
  const ton=[0,0,0,0];
  TABS.forEach(t=>PLAN[t].ex.forEach(e=>{if(e.bw||e.assist)return;
    for(let w=1;w<=4;w++){const x=(S.e||{})[e.id+"-"+w];if(!x)continue;const kg=num(x.w);if(kg>0)ton[w-1]+=kg*repsOf(x,e.sch)}}));
  const mx=Math.max(...ton,1);
  $("stTon").innerHTML=ton.map((v,i)=>'<div class="tbar"><b>'+(v?fmtN(v):"—")+'</b><i style="height:'+(v/mx*100)+'%"></i>нед '+(i+1)+"</div>").join("");
  // рабочие веса
  const row=(label,id,assist)=>{
    const ser=[];M.forEach(mo=>{for(let w=1;w<=4;w++){const x=mo.e[id+"-"+w];const kg=x?num(x.w):0;if(kg>0)ser.push(kg)}});
    let spark="",delta='<div class="delta flat">—</div>',sub="нет записей";
    if(ser.length){
      const lo=Math.min(...ser),hi=Math.max(...ser),W=96,Hh=32,n=ser.length;
      const pts=ser.map((v,i)=>[n>1?i/(n-1)*W:W/2,hi===lo?Hh/2:Hh-(v-lo)/(hi-lo)*(Hh-4)-2]);
      spark='<svg viewBox="0 0 96 32" aria-hidden="true"><polyline class="spark" points="'+pts.map(p=>p.map(c=>c.toFixed(1)).join(",")).join(" ")+'"/><circle class="sparkdot" r="3" cx="'+pts[n-1][0].toFixed(1)+'" cy="'+pts[n-1][1].toFixed(1)+'"/></svg>';
      const d=ser[n-1]-ser[0],good=assist?d<0:d>0;
      delta='<div class="delta '+(d===0?"flat":good?"up":"down")+'">'+(d>0?"+":d<0?"−":"")+String(Math.abs(Math.round(d*10)/10)).replace(".",",")+" кг</div>";
      sub=String(ser[0]).replace(".",",")+" → "+String(ser[n-1]).replace(".",",")+" кг · записей "+n+(assist?" · противовес":"");
    }else if(label.retired)return "";
    return '<div class="prow"><div class="nm">'+label.t+"<small>"+sub+"</small></div><div>"+spark+"</div>"+delta+"</div>";
  };
  let h="";
  TABS.forEach(t=>PLAN[t].ex.forEach(e=>{if(!e.bw)h+=row({t:LET[t]+" · "+e.n},e.id,e.assist)}));
  let old="";for(const id in RETIRED)old+=row({t:RETIRED[id],retired:true},id,false);
  if(old)h+='<div class="msg" style="margin-top:8px">Из прежней программы</div>'+old;
  $("stEx").innerHTML=h;
};
})();
