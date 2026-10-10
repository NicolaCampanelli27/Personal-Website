/* Small dependency-free SVG charts for the Details page.
   All numbers come from the tables of the two papers. Labels are {en,it}. */
(function(){
  const NS='http://www.w3.org/2000/svg';
  const C={navy:'#1B3A6B',red:'#D8341F',amber:'#F5B335',pine:'#2E7D6A',sky:'#5AA9E6',mist:'#DCE7F3',ink:'#14243D'};
  const loc=()=>I18N.lang==='it'?'it-IT':'en-US';
  const num=(v,d)=>v.toLocaleString(loc(),{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const L=o=>I18N.pick(o);
  function el(tag,attrs,text,parent){
    const e=document.createElementNS(NS,tag);
    for(const k in attrs)e.setAttribute(k,attrs[k]);
    if(text!=null)e.textContent=text;
    if(parent)parent.appendChild(e);return e;
  }
  function wrap(s,max){
    const w=s.split(' '),out=[];let cur='';
    w.forEach(x=>{if((cur+' '+x).trim().length>max&&cur){out.push(cur);cur=x}else cur=(cur+' '+x).trim()});
    if(cur)out.push(cur);return out;
  }
  function legend(svg,series,x,y){
    const g=el('g',{class:'lg'},null,svg);let cx=x;
    series.forEach(s=>{
      el('rect',{x:cx,y:y-10,width:14,height:14,rx:4,fill:s.color},null,g);
      const t=el('text',{x:cx+20,y:y+2},L(s.name),g);
      cx+=20+L(s.name).length*7.2+22;
    });
  }

  /* grouped or stacked vertical bars */
  function bars(host,cfg){
    const W=640,H=350,m={l:64,r:14,t:50,b:58},pw=W-m.l-m.r,ph=H-m.t-m.b;
    const svg=el('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':L(cfg.alt)});
    legend(svg,cfg.series,m.l,22);
    const ticks=cfg.ticks||5,labels=[],lf=cfg.labelFmt||cfg.fmt;
    for(let i=0;i<=ticks;i++){
      const v=cfg.max*i/ticks,y=m.t+ph-ph*i/ticks;
      el('line',{x1:m.l,x2:W-m.r,y1:y,y2:y,class:i?'ax':'zero'},null,svg);
      el('text',{x:m.l-8,y:y+4,'text-anchor':'end'},cfg.fmt(v),svg);
    }
    if(cfg.unit)el('text',{x:m.l-8,y:m.t-14,'text-anchor':'end'},L(cfg.unit),svg);
    const n=cfg.cats.length,gw=pw/n,ns=cfg.series.length;
    cfg.cats.forEach((c,i)=>{
      const x0=m.l+i*gw;
      if(cfg.stack){
        const bw=gw*0.5,bx=x0+(gw-bw)/2;let acc=0,total=0;
        cfg.series.forEach(s=>total+=s.values[i]);
        cfg.series.forEach((s,j)=>{
          const v=s.values[i],h=v/cfg.max*ph,y=m.t+ph-(acc+v)/cfg.max*ph;
          const r=el('rect',{x:bx,y:y,width:bw,height:h,fill:s.color,class:'bar bv',style:`--bd:${i*0.1}s`},null,svg);
          el('title',{},L(s.name)+': '+cfg.fmt(v),r);
          if(h>24)labels.push({x:bx+bw/2,y:y+h/2+4,t:cfg.fmt(v),white:1});
          acc+=v;
        });
        const shown=cfg.totals?cfg.totals[i]:total;
        labels.push({x:bx+bw/2,y:m.t+ph-total/cfg.max*ph-8,t:cfg.fmt(shown)});
      }else{
        const bw=gw*0.74/ns,bx=x0+gw*0.13;
        cfg.series.forEach((s,j)=>{
          const v=s.values[i],h=v/cfg.max*ph,y=m.t+ph-h;
          const r=el('rect',{x:bx+j*bw,y:y,width:bw-4,height:h,rx:4,fill:s.color,class:'bar bv',style:`--bd:${(i*ns+j)*0.07}s`},null,svg);
          el('title',{},L(s.name)+': '+cfg.fmt(v),r);
          labels.push({x:bx+j*bw+(bw-4)/2,y:y-6,t:lf(v)});
        });
      }
      L(c).split('|').forEach((line,k)=>el('text',{x:x0+gw/2,y:H-m.b+20+k*15,'text-anchor':'middle'},line,svg));
    });
    labels.forEach(l=>el('text',{x:l.x,y:l.y,'text-anchor':'middle',class:'vl',style:l.white?'fill:#fff':''},l.t,svg));
    host.replaceChildren(svg);
  }

  /* horizontal bars, optional negative values and reference lines */
  function hbars(host,cfg){
    const rowH=cfg.rowH||56,W=640,m={l:cfg.left||170,r:58,t:cfg.refs?58:34,b:40},pw=W-m.l-m.r,H=m.t+rowH*cfg.items.length+m.b;
    const x=v=>m.l+(v-cfg.min)/(cfg.max-cfg.min)*pw;
    const svg=el('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':L(cfg.alt)});
    const ticks=cfg.ticks||5;
    for(let i=0;i<=ticks;i++){
      const v=cfg.min+(cfg.max-cfg.min)*i/ticks,xx=x(v);
      el('line',{x1:xx,x2:xx,y1:m.t-8,y2:H-m.b+4,class:'ax'},null,svg);
      el('text',{x:xx,y:H-m.b+22,'text-anchor':'middle'},cfg.fmt(v),svg);
    }
    el('line',{x1:x(0),x2:x(0),y1:m.t-8,y2:H-m.b+4,class:'zero'},null,svg);
    cfg.items.forEach((it,i)=>{
      const y=m.t+i*rowH+8,h=rowH-20,neg=it.value<0;
      const x1=neg?x(it.value):x(0),w=Math.abs(x(it.value)-x(0));
      const r=el('rect',{x:x1,y:y,width:w,height:h,rx:5,fill:it.color,class:'bar '+(neg?'bhn':'bh'),style:`--bd:${i*0.12}s`},null,svg);
      el('title',{},L(it.label)+': '+cfg.fmt(it.value),r);
      el('text',{x:neg?x1-8:x1+w+8,y:y+h/2+5,'text-anchor':neg?'end':'start',class:'vl'},cfg.fmt(it.value),svg);
      wrap(L(it.label),cfg.wrap||24).forEach((ln,k,a)=>el('text',{x:m.l-12,y:y+h/2+4+(k-(a.length-1)/2)*15,'text-anchor':'end',style:'fill:#14243D;font-weight:600'},ln,svg));
    });
    (cfg.refs||[]).forEach((r,i)=>{
      const xx=x(r.value);
      el('line',{x1:xx,x2:xx,y1:m.t-8+(0),y2:H-m.b+4,class:'ref',stroke:r.color},null,svg);
      el('text',{x:xx+(r.anchor==='end'?-6:6),y:m.t-16-(i%2?0:0),'text-anchor':r.anchor||'start',class:'reftxt',fill:r.color,style:'fill:'+r.color},L(r.label),svg);
    });
    host.replaceChildren(svg);
  }

  const usd=v=>'$'+num(Math.round(v));
  const CHARTS={
    'sac-fuel':{type:bars,cfg:()=>({
      alt:'ch.sac-fuel.1',
      max:8,ticks:4,fmt:v=>num(v,v%1?2:0),unit:'ch.sac-fuel.2',
      cats:['ch.sac-fuel.3','ch.sac-fuel.4','ch.sac-fuel.5'],
      series:[{name:'ch.sac-fuel.6',color:C.navy,values:[4.93,5.26,4.12]},
              {name:'ch.sac-fuel.7',color:C.red,values:[5.36,6.18,4.04]}]})},
    'sac-gap':{type:hbars,cfg:()=>({
      alt:'ch.sac-gap.1',
      min:-5,max:20,ticks:5,left:150,fmt:v=>(v>0?'+':v<0?'−':'')+num(Math.abs(v),v%1?1:0)+'%',
      items:[{label:'ch.sac-gap.2',value:8.6,color:C.amber},
             {label:'ch.sac-gap.3',value:17.5,color:C.red},
             {label:'ch.sac-gap.4',value:-1.9,color:C.pine}]})},
    'bat-bill':{type:bars,cfg:()=>({
      alt:'ch.bat-bill.1',
      max:100000,fmt:v=>usd(v),stack:true,totals:[89695,84011,71413,60604],
      cats:['ch.bat-bill.2','ch.bat-bill.3','ch.bat-bill.4','ch.bat-bill.5'],
      series:[{name:'ch.bat-bill.6',color:C.navy,values:[67564,58792,58840,43788]},
              {name:'ch.bat-bill.7',color:C.amber,values:[22131,25219,11363,16816]}]})},
    'bat-catch':{type:bars,cfg:()=>({
      alt:'ch.bat-catch.1',
      max:40000,ticks:4,fmt:v=>usd(v),labelFmt:v=>'$'+num(v/1000,1)+'k',
      cats:['ch.bat-catch.2','ch.bat-catch.3','ch.bat-catch.4','ch.bat-catch.5','ch.bat-catch.6'],
      series:[{name:'ch.bat-catch.7',color:C.pine,values:[5684,18282,29091,18265,20172]},
              {name:'ch.bat-catch.8',color:C.red,values:[36014,34588,35861,36015,29880]}]})},
    'bat-chem':{type:hbars,cfg:()=>({
      alt:'ch.bat-chem.1',
      min:0,max:0.25,ticks:5,left:170,rowH:52,wrap:22,fmt:v=>'$'+num(v,v===0?0:(Math.abs(v*100-Math.round(v*100))<1e-9?2:4)),
      items:[{label:'ch.bat-chem.2',value:0.2313,color:C.navy},
             {label:'ch.bat-chem.3',value:0.2177,color:C.sky},
             {label:'ch.bat-chem.4',value:0.1951,color:C.sky},
             {label:'ch.bat-chem.5',value:0.2298,color:C.sky},
             {label:'ch.bat-chem.6',value:0.1726,color:C.sky}],
      refs:[{value:0.1173,color:C.red,label:'ch.bat-chem.7',anchor:'start'},
            {value:0.05,color:C.pine,label:'ch.bat-chem.8',anchor:'end'}]})}
  };
  function renderAll(){
    document.querySelectorAll('.cj[data-chart]').forEach(h=>{
      const d=CHARTS[h.dataset.chart];if(!d)return;
      const cfg=d.cfg();d.type(h,cfg);
    });
  }
  renderAll();
  window.observeReveal&&window.observeReveal(document);
  document.addEventListener('langchange',renderAll);
})();
