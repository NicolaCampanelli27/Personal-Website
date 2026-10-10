/* ---------- My journey so far (game) ---------- */
(function(){
  const cv=document.getElementById('game');if(!cv)return;
  const ctx=cv.getContext('2d');
  const W=720,H=270,G=216,PX=120,S=1.55;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  const msgEl=document.getElementById('game-msg'),ctaEl=document.getElementById('game-cta');
  const T=(k,en)=>I18N.t(k,en);
  let curMsg=null;
  const setMsg=m=>{curMsg=m;msgEl.textContent=m?I18N.pick(m):''};

  /* the places, in order. len = how long the stage lasts, the last one is short because it is still going on */
  const ST=[
    {name:'Fano',c:'it',len:3600,sky:['#78C4F0','#EAF7FF'],gnd:'#E7D29E',lip:'#F4E5BD',kind:'sea',msg:'g.msg.0'},
    {name:'Modena',c:'it',len:3600,sky:['#A5CBEF','#F7EBD0'],gnd:'#4B505D',lip:'#6A7080',kind:'hills',msg:'g.msg.1'},
    {name:'Torino',c:'it',len:3800,sky:['#8FB6E8','#EEF3FB'],gnd:'#5A6070',lip:'#7A8090',kind:'alps',msg:'g.msg.2'},
    {name:'Hamilton',c:'ca',len:3600,sky:['#B7CCDD','#F4F8FB'],gnd:'#F1F5F9',lip:'#FFFFFF',kind:'canada',msg:'g.msg.3'},
    {name:'Torino',c:'it',len:3600,bike:true,sky:['#F2A27E','#FCE6CC'],gnd:'#5A6070',lip:'#7A8090',kind:'alps',tint:'rgba(255,140,90,.14)',msg:'g.msg.4'},
    {name:'Columbus',c:'us',len:3600,sky:['#6DB4EE','#FFF0C8'],gnd:'#A48E66',lip:'#BDA97F',kind:'midwest',msg:'g.msg.5'},
    {name:'Torino',c:'it',len:1800,dawn:true,sky:['#3B3F86','#FFA866'],gnd:'#4A5064',lip:'#6A7090',kind:'alps',tint:'rgba(255,140,90,.22)',msg:'g.msg.6'}
  ];
  const MSG_LOSE='g.lose';
  const MSG_END='g.end';
  const CC={it:'#1E9B57',ca:'#D8341F',us:'#2B4C9B'};
  let cum=0;ST.forEach(s=>{s.s0=cum;cum+=s.len;s.s1=cum});
  const TOTAL=cum;

  /* helpers */
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const smooth=t=>t*t*(3-2*t);
  const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const mix=(a,b,t)=>{const A=hex(a),B=hex(b);return 'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')+')'};
  function rrect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
  function line(x1,y1,x2,y2,w,c){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
  function disc(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill()}
  function poly(pts,c){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)ctx.lineTo(pts[i],pts[i+1]);ctx.closePath();ctx.fill()}
  const stageAt=d=>{for(let i=0;i<ST.length;i++)if(d<ST[i].s1)return i;return ST.length-1};
  function blend(d){
    const a=stageAt(d),B=380,nb=ST[a+1];
    if(!nb)return {a,b:a,t:0};
    return {a,b:a+1,t:smooth(clamp((d-(ST[a].s1-B))/B))};
  }

  /* state */
  let mode='idle',lock=0,last=0,acc=0;
  let dist,speed,py,vy,air,load,invuln,obs,sinceSpawn,gap,frameN,stageIdx,parts,shake,endT;
  function reset(){
    dist=0;speed=5.6;py=G;vy=0;air=false;load=0;invuln=0;obs=[];sinceSpawn=0;gap=420;frameN=0;stageIdx=-1;
    parts=[];shake=0;endT=0;
  }
  reset();

  function start(){
    if(performance.now()<lock)return;
    reset();mode='play';ctaEl.hidden=true;setMsg(null);last=0;acc=0;
    requestAnimationFrame(loop);
  }
  function jump(){
    if(mode==='idle'||mode==='over'){start();return}
    if(mode==='end'){if(endT>90)start();return}
    if(mode==='play'&&!air){vy=-11.2;air=true;load+=8}
  }
  function lose(){
    mode='over';lock=performance.now()+500;
    setMsg(MSG_LOSE);
    draw();
  }
  function finish(){
    mode='end';endT=0;lock=performance.now()+500;
    setMsg(MSG_END);
    ctaEl.hidden=false;
  }

  const OB={
    sea:[{t:'crab',w:28,h:18},{t:'ball',w:30,h:30},{t:'castle',w:36,h:32}],
    hills:[{t:'cone',w:26,h:36},{t:'tire',w:34,h:34},{t:'barrier',w:44,h:26}],
    alps:[{t:'car',w:54,h:34},{t:'toret',w:22,h:36}],
    canada:[{t:'goose',w:32,h:36},{t:'snowman',w:26,h:48}],
    midwest:[{t:'hay',w:34,h:34},{t:'mailbox',w:26,h:44},{t:'pumpkin',w:30,h:26}]
  };
  function spawn(){
    const k=ST[stageAt(dist)].kind,l=OB[k];
    const o=Object.assign({},l[Math.floor(Math.random()*l.length)]);
    o.x=W+40;obs.push(o);
    gap=38*speed+170+Math.random()*250;sinceSpawn=0;
  }

  function step(){
    frameN++;
    const si=stageAt(dist),cur=ST[si];
    const base=5.6+clamp(dist/TOTAL)*1.5,target=base*(cur.bike?1.3:1);
    speed+=(target-speed)*.04;
    dist+=speed;sinceSpawn+=speed;
    vy+=0.6;py+=vy;
    if(py>=G){py=G;vy=0;air=false}
    load=Math.max(0,load-0.12);
    if(invuln>0)invuln--;
    if(shake>0)shake--;
    if(si!==stageIdx){stageIdx=si;setMsg(ST[si].msg)}
    if(dist<TOTAL-800&&sinceSpawn>=gap)spawn();
    obs.forEach(o=>o.x-=speed);
    obs=obs.filter(o=>o.x>-90);
    if(!air&&!cur.bike&&frameN%6===0)parts.push({x:PX-16,y:G-2,vx:-1.3-Math.random(),vy:-.4-Math.random()*.7,life:22});
    parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life--});
    parts=parts.filter(p=>p.life>0);
    if(invuln===0){
      const pl=cur.bike?PX-26:PX-12,pr=cur.bike?PX+40:PX+12;
      for(const o of obs){
        const l=o.x+5,r=o.x+o.w-5,t=G-o.h+7;
        if(pr>l&&pl<r&&py>t){load+=34;invuln=80;shake=10;break}
      }
    }
    if(load>=100){lose();return}
    if(dist>=TOTAL)finish();
  }
  function stepEnd(){
    endT++;frameN++;
    speed+=(4.4-speed)*.02;dist+=speed;
    vy+=0.6;py+=vy;if(py>=G){py=G;vy=0;air=false}
    obs.forEach(o=>o.x-=speed);obs=obs.filter(o=>o.x>-90);
    if(frameN%6===0)parts.push({x:PX-16,y:G-2,vx:-1.3-Math.random(),vy:-.4-Math.random()*.7,life:22});
    parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life--});
    parts=parts.filter(p=>p.life>0);
  }
  function loop(t){
    if(mode!=='play'&&mode!=='end')return;
    if(!last)last=t;
    acc+=Math.min(t-last,100);last=t;
    while(acc>=1000/60&&(mode==='play'||mode==='end')){mode==='play'?step():stepEnd();acc-=1000/60}
    draw();
    if(mode==='play'||mode==='end')requestAnimationFrame(loop);
  }

  /* ---------- generic scenery ---------- */
  function mountains(off,base,amp,color,cap,seed,period){
    const half=period/2,pk=[];
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-period,G);
    for(let x=-period;x<=W+period;x+=half){
      const n=Math.floor((x+off)/half),gx=n*half-off,hgt=amp*(0.6+0.4*Math.abs(Math.sin(n*seed)));
      const y=base-(n%2?0:hgt);ctx.lineTo(gx,y);
      if(!(n%2))pk.push([gx,y,hgt]);
    }
    ctx.lineTo(W+period,G);ctx.closePath();ctx.fill();
    if(cap)pk.forEach(([gx,y,h])=>poly([gx,y,gx+h*.2,y+h*.3,gx+h*.1,y+h*.25,gx,y+h*.4,gx-h*.12,y+h*.27,gx-h*.2,y+h*.3],cap));
  }
  const hillY=(x,off,base,amp,sp)=>base-amp*(0.55+0.3*Math.sin((x+off)*sp)+0.15*Math.sin((x+off)*sp*2.3+1));
  function hillLayer(off,base,amp,sp,color,rows){
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-10,G);
    for(let x=-10;x<=W+10;x+=8)ctx.lineTo(x,hillY(x,off,base,amp,sp));
    ctx.lineTo(W+10,G);ctx.closePath();ctx.fill();
    if(rows){
      ctx.strokeStyle='rgba(30,80,40,.25)';ctx.lineWidth=1.3;
      for(let r=1;r<=4;r++){ctx.beginPath();for(let x=-10;x<=W+10;x+=8){const y=hillY(x,off,base,amp,sp)+r*8;x===-10?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.stroke()}
    }
  }
  function town(off,col,roof){
    const period=520,B=[[40,44],[30,32],[46,58],[34,40],[52,50],[28,30],[44,42],[36,56]];
    for(let x=-(off%period)-period;x<W+period;x+=period){
      let cx=x;
      B.forEach(([w,h])=>{
        ctx.fillStyle=col;ctx.fillRect(cx,G-h,w,h);
        poly([cx-2,G-h,cx+w/2,G-h-8,cx+w+2,G-h],roof);
        ctx.fillStyle='rgba(60,50,40,.45)';
        for(let yy=G-h+8;yy<G-10;yy+=13)for(let xx=cx+6;xx<cx+w-8;xx+=11)ctx.fillRect(xx,yy,4,6);
        cx+=w+14+12;
      });
    }
  }
  function pine(x,h,snow,col){
    for(let i=0;i<3;i++){
      const w=h*.5*(1-i*.2),y0=G-h*(.2+i*.27),top=y0-h*.4;
      poly([x,top,x+w/2,y0,x-w/2,y0],col);
      if(snow)poly([x,top,x+w*.22,top+h*.15,x-w*.22,top+h*.15],'#fff');
    }
    ctx.fillStyle='#4a3a2c';ctx.fillRect(x-2,G-h*.22,4,h*.22);
  }
  function pineRow(off,snow,col){
    const period=118;
    for(let x=-(off%period)-period;x<W+period;x+=period){
      const k=Math.floor((x+off)/period);
      pine(x,52+((k%3)+3)%3*10,snow,col);pine(x+58,36+((k%2)+2)%2*8,snow,col);
    }
  }
  function corn(off){
    const step=6;
    for(let x=-(off%step)-step;x<W+step;x+=step){
      const k=Math.floor((x+off)/step),h=22+(((k*37)%7)),c=(k%3)?'#C9A93B':'#9DB04A';
      line(x,G,x,G-h,1.6,c);
      line(x,G-h*.55,x+5,G-h*.8,1.3,c);line(x,G-h*.4,x-5,G-h*.65,1.3,c);
    }
  }

  /* ---------- landmarks (never named anywhere on the page) ---------- */
  const PD={
    arch(x){
      const w=118,x0=x-w/2;
      ctx.fillStyle='#D9C8A2';ctx.fillRect(x0,G-52,w,52);
      ctx.fillStyle='#BFAE88';ctx.fillRect(x0-2,G-55,w+4,4);
      ctx.fillStyle='#E0D1AE';ctx.fillRect(x0+6,G-84,w-12,29);
      ctx.fillStyle='#BFAE88';ctx.fillRect(x0+4,G-87,w-8,4);
      ctx.fillStyle='#6D6A66';
      for(let i=0;i<5;i++){const ax=x0+12+i*19;ctx.beginPath();ctx.arc(ax+7,G-66,6,Math.PI,0);ctx.lineTo(ax+13,G-57);ctx.lineTo(ax+1,G-57);ctx.closePath();ctx.fill()}
      ctx.fillStyle='#575A66';
      ctx.beginPath();ctx.arc(x,G-30,19,Math.PI,0);ctx.lineTo(x+19,G);ctx.lineTo(x-19,G);ctx.closePath();ctx.fill();
      [-41,41].forEach(o=>{ctx.beginPath();ctx.arc(x+o,G-22,9,Math.PI,0);ctx.lineTo(x+o+9,G);ctx.lineTo(x+o-9,G);ctx.closePath();ctx.fill()});
      ctx.strokeStyle='rgba(120,100,70,.28)';ctx.lineWidth=1;
      for(let y=G-46;y<G;y+=9){ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x0+w,y);ctx.stroke()}
    },
    lisippo(x){
      const c='#5F7D63';
      ctx.fillStyle='#CFC2A8';ctx.fillRect(x-12,G-24,24,24);ctx.fillStyle='#BCAF94';ctx.fillRect(x-15,G-27,30,4);
      const yb=G-27;
      line(x-3,yb,x-4,yb-17,4.8,c);line(x+3,yb,x+4,yb-17,4.8,c);
      line(x,yb-16,x,yb-31,9.5,c);
      disc(x+1,yb-37,4.6,c);
      line(x-5,yb-30,x-8,yb-18,3.4,c);
      line(x+5,yb-30,x+10,yb-41,3.4,c);
      ctx.strokeStyle='#7FA06E';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(x+12,yb-44,3.6,0,7);ctx.stroke();
    },
    shield(x){
      line(x-12,G,x-12,G-52,3,'#5A5F6B');line(x+12,G,x+12,G-52,3,'#5A5F6B');
      const y0=G-102;
      ctx.fillStyle='#FFD60A';ctx.strokeStyle='#111';ctx.lineWidth=1.6;
      ctx.beginPath();ctx.moveTo(x-20,y0);ctx.lineTo(x+20,y0);ctx.lineTo(x+20,y0+28);ctx.quadraticCurveTo(x+20,y0+48,x,y0+52);ctx.quadraticCurveTo(x-20,y0+48,x-20,y0+28);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.save();ctx.translate(x,y0+32);ctx.scale(1.25,1.25);
      const k='#111';
      line(-6,-1,6,-3,6.4,k);line(6,-3,9,-12,4,k);line(9,-12,14,-13,3,k);
      ctx.strokeStyle=k;ctx.lineWidth=2.2;ctx.lineCap='round';ctx.lineJoin='round';
      ctx.beginPath();ctx.moveTo(6,-3);ctx.lineTo(12,-8);ctx.lineTo(14,-3);ctx.moveTo(5,-2);ctx.lineTo(10,-4);ctx.lineTo(11,2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(-6,-1);ctx.lineTo(-10,4);ctx.lineTo(-9,10);ctx.moveTo(-5,0);ctx.lineTo(-2,5);ctx.lineTo(-3,11);ctx.stroke();
      ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(-6,-2);ctx.quadraticCurveTo(-14,-6,-13,-12);ctx.stroke();
      ctx.restore();
    },
    trident(x){
      line(x-12,G,x-12,G-50,3,'#5A5F6B');line(x+12,G,x+12,G-50,3,'#5A5F6B');
      ctx.fillStyle='#14314F';rrect(x-22,G-100,44,50,6);ctx.fill();
      const s='#D2DCE8';
      line(x,G-60,x,G-90,2.8,s);line(x-5,G-64,x+5,G-64,2.4,s);
      ctx.strokeStyle=s;ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(x-12,G-88);ctx.quadraticCurveTo(x-12,G-72,x,G-72);ctx.quadraticCurveTo(x+12,G-72,x+12,G-88);ctx.stroke();
      [[x,G-97],[x-12,G-94],[x+12,G-94]].forEach(([a,b])=>poly([a,b,a-3,b+7,a+3,b+7],s));
    },
    supercar(x){
      ctx.save();ctx.translate(x,G);ctx.scale(1.3,1.3);
      poly([-38,-3,-38,-11,-28,-15,-8,-19,-2,-23,10,-19,34,-13,40,-8,40,-3],'#D8341F');
      poly([-6,-18,-1,-21,9,-18,2,-14],'#2B3447');
      line(-37,-8,39,-8,1,'rgba(255,255,255,.7)');
      disc(-24,-5,6.5,'#111');disc(-24,-5,3,'#B8C0CC');disc(24,-5,6.5,'#111');disc(24,-5,3,'#B8C0CC');
      ctx.restore();
    },
    lingotto(x){
      const x0=x-105;
      ctx.fillStyle='#A9A296';ctx.fillRect(x0-18,G-72,8,72);
      ctx.fillStyle='#BDB6AA';ctx.fillRect(x0,G-48,190,48);
      ctx.fillStyle='#9E978B';ctx.fillRect(x0,G-52,190,5);
      for(let r=0;r<3;r++){ctx.fillStyle='#EEF1F4';ctx.fillRect(x0+4,G-42+r*12,182,5)}
      ctx.strokeStyle='rgba(120,115,105,.5)';ctx.lineWidth=1;
      for(let xx=x0+10;xx<x0+190;xx+=12){ctx.beginPath();ctx.moveTo(xx,G-44);ctx.lineTo(xx,G-4);ctx.stroke()}
      ctx.fillStyle='#C9C2B6';ctx.fillRect(x0+190,G-62,36,62);
      ctx.strokeStyle='#8E877B';ctx.lineWidth=2;
      for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(x0+190,G-60+i*12);ctx.lineTo(x0+226,G-48+i*12);ctx.stroke()}
      ctx.fillStyle='rgba(111,168,214,.9)';ctx.beginPath();ctx.arc(x0+70,G-52,11,Math.PI,0);ctx.closePath();ctx.fill();
    },
    mole(x){
      const st='#E6D9BE',sh='#CDBE9C';
      ctx.fillStyle=st;ctx.fillRect(x-25,G-26,50,26);
      ctx.strokeStyle=sh;ctx.lineWidth=2;
      for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(x-21+i*8.4,G-24);ctx.lineTo(x-21+i*8.4,G-3);ctx.stroke()}
      poly([x-28,G-26,x,G-37,x+28,G-26],'#DDCFB0');
      ctx.fillStyle=st;ctx.fillRect(x-18,G-54,36,18);
      ctx.fillStyle='#8B8268';
      [-10,0,10].forEach(o=>{ctx.beginPath();ctx.arc(x+o,G-46,3.4,Math.PI,0);ctx.lineTo(x+o+3.4,G-40);ctx.lineTo(x+o-3.4,G-40);ctx.closePath();ctx.fill()});
      ctx.fillStyle='#E1D3B4';
      ctx.beginPath();ctx.moveTo(x-15,G-54);ctx.bezierCurveTo(x-14,G-80,x-9,G-94,x-4,G-100);ctx.lineTo(x+4,G-100);ctx.bezierCurveTo(x+9,G-94,x+14,G-80,x+15,G-54);ctx.closePath();ctx.fill();
      ctx.strokeStyle=sh;ctx.lineWidth=1.4;
      [-62,-70,-78,-86,-93].forEach((o,i)=>{const hw=14-i*2.4;ctx.beginPath();ctx.moveTo(x-hw,G+o+8);ctx.lineTo(x+hw,G+o+8);ctx.stroke()});
      ctx.fillStyle=st;ctx.fillRect(x-4.5,G-114,9,15);
      ctx.strokeStyle=sh;ctx.lineWidth=1.2;[-2,0,2].forEach(o=>{ctx.beginPath();ctx.moveTo(x+o,G-112);ctx.lineTo(x+o,G-101);ctx.stroke()});
      line(x,G-114,x,G-146,2,sh);disc(x,G-148,2.6,'#F5B335');
    },
    moose(x){
      const b='#6A4630',d='#4F3322';
      [[-12,-9],[-6,-9],[8,-9],[13,-9]].forEach(([o],i)=>line(x+o,G-26,x+o+(i%2?2:-1),G,3,i%2?d:b));
      ctx.fillStyle=b;ctx.beginPath();ctx.ellipse(x,G-30,19,9,0,0,7);ctx.fill();
      ctx.beginPath();ctx.ellipse(x+10,G-36,9,7,0,0,7);ctx.fill();
      line(x+17,G-34,x+25,G-42,7,b);
      ctx.fillStyle=b;ctx.beginPath();ctx.ellipse(x+29,G-42,7,4,.5,0,7);ctx.fill();
      ctx.strokeStyle=d;ctx.lineWidth=2.4;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(x+24,G-46);ctx.lineTo(x+22,G-58);ctx.moveTo(x+22,G-58);ctx.lineTo(x+14,G-64);ctx.moveTo(x+22,G-58);ctx.lineTo(x+26,G-66);ctx.moveTo(x+22,G-52);ctx.lineTo(x+14,G-54);ctx.stroke();
      poly([x+12,G-60,x+22,G-58,x+20,G-50,x+14,G-52],d);
    },
    flagCA(x){
      line(x,G,x,G-104,3,'#8B939F');disc(x,G-106,3,'#F5B335');
      ctx.save();ctx.translate(x+1,G-102);ctx.transform(1,Math.sin(frameN*.08)*.05,0,1,0,0);
      ctx.fillStyle='#fff';ctx.fillRect(0,0,48,26);ctx.fillStyle='#D52B1E';ctx.fillRect(0,0,12,26);ctx.fillRect(36,0,12,26);
      const L=[0,-10,1.8,-6,4.8,-7.2,4,-3,8,-4.5,6.8,-.5,9.4,1.6,5.6,2.6,6.2,5.8,1.8,4.4,1,9,-1,9,-1.8,4.4,-6.2,5.8,-5.6,2.6,-9.4,1.6,-6.8,-.5,-8,-4.5,-4,-3,-4.8,-7.2,-1.8,-6];
      ctx.save();ctx.translate(24,12);ctx.scale(.85,.85);poly(L,'#D52B1E');ctx.restore();
      ctx.restore();
    },
    flagUS(x){
      line(x,G,x,G-110,3,'#8B939F');disc(x,G-112,3,'#F5B335');
      ctx.save();ctx.translate(x+1,G-108);ctx.transform(1,Math.sin(frameN*.08)*.05,0,1,0,0);
      for(let i=0;i<7;i++){ctx.fillStyle=i%2?'#fff':'#BB2233';ctx.fillRect(0,i*4,50,4)}
      ctx.fillStyle='#2B3B7E';ctx.fillRect(0,0,22,16);
      ctx.fillStyle='#fff';for(let a=0;a<4;a++)for(let b=0;b<3;b++)ctx.fillRect(3+a*5,2.5+b*4.5,1.6,1.6);
      ctx.restore();
    },
    maple(x){
      ctx.fillStyle='#6B4A32';ctx.fillRect(x-3,G-34,6,34);
      disc(x,G-48,17,'#D8541F');disc(x-13,G-38,11,'#E8761F');disc(x+13,G-38,11,'#C43A1B');disc(x+2,G-60,10,'#F09A2A');
    },
    barn(x){
      ctx.fillStyle='#B9BEC6';ctx.fillRect(x+40,G-72,18,72);disc(x+49,G-72,9,'#9AA0AA');
      ctx.strokeStyle='rgba(80,90,100,.35)';ctx.lineWidth=1;for(let y=G-64;y<G;y+=10){ctx.beginPath();ctx.moveTo(x+40,y);ctx.lineTo(x+58,y);ctx.stroke()}
      ctx.fillStyle='#B4301F';ctx.fillRect(x-38,G-38,76,38);
      poly([x-43,G-38,x-30,G-59,x,G-70,x+30,G-59,x+43,G-38],'#8F2417');
      ctx.fillStyle='#fff';ctx.fillRect(x-7,G-56,14,11);ctx.fillStyle='#3a1a14';ctx.fillRect(x-5,G-54,10,7);
      ctx.fillStyle='#9A2819';ctx.fillRect(x-15,G-27,30,27);
      ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(x-15,G-27,30,27);
      ctx.beginPath();ctx.moveTo(x-15,G-27);ctx.lineTo(x+15,G);ctx.moveTo(x+15,G-27);ctx.lineTo(x-15,G);ctx.stroke();
    },
    tower(x){
      ctx.strokeStyle='#8A93A0';ctx.lineWidth=2.4;
      [[-14,-10],[14,10],[-5,-3],[5,3]].forEach(([a,b])=>{ctx.beginPath();ctx.moveTo(x+a,G-54);ctx.lineTo(x+b*1.2,G);ctx.stroke()});
      ctx.fillStyle='#C9CED6';rrect(x-17,G-84,34,30,9);ctx.fill();
      ctx.fillStyle='#B71C1C';ctx.fillRect(x-17,G-74,34,6);
      poly([x-17,G-82,x,G-96,x+17,G-82],'#AAB1BC');
    },
    crane(x){
      const c='#F5B335';
      line(x,G,x,G-116,5,c);
      ctx.strokeStyle='rgba(20,36,61,.5)';ctx.lineWidth=1;for(let y=G-4;y>G-112;y-=9){ctx.beginPath();ctx.moveTo(x-2.5,y);ctx.lineTo(x+2.5,y-9);ctx.stroke()}
      line(x-46,G-112,x+62,G-112,4,c);ctx.fillStyle='#6B7280';ctx.fillRect(x-48,G-110,12,10);
      line(x+50,G-112,x+50,G-80,1.2,'#333');ctx.fillStyle='#333';ctx.fillRect(x+47,G-80,6,5);
    }
  };
  const PROPS=[
    [['lisippo',.2],['arch',.58]],
    [['shield',.18],['supercar',.42],['trident',.66],['supercar',.9]],
    [['lingotto',.22],['mole',.6]],
    [['moose',.2],['flagCA',.5],['maple',.75]],
    [['mole',.3],['lingotto',.7]],
    [['barn',.2],['flagUS',.46],['tower',.7],['barn',.92]],
    [['mole',.4],['crane',.78]]
  ];
  function props(si){
    const s=ST[si];
    PROPS[si].forEach(([t,a])=>{
      const sx=430+(s.s0+a*s.len-dist)*0.6;
      if(sx>-170&&sx<W+170)PD[t](sx);
    });
  }

  /* ---------- scenes ---------- */
  function scene(si,al){
    if(al<=0.01)return;
    const k=ST[si].kind;
    ctx.globalAlpha=al;
    if(k==='sea'){
      const g=ctx.createLinearGradient(0,G-60,0,G-6);g.addColorStop(0,'#3C97D6');g.addColorStop(1,'#7BCDF1');
      ctx.fillStyle=g;ctx.fillRect(-10,G-60,W+20,54);
      ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=1.6;
      for(let r=0;r<3;r++){
        const y=G-48+r*14,per=46+r*10,sp=.16+.06*r;
        for(let x=-((dist*sp+r*17)%per)-per;x<W+per;x+=per){ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+per/4,y-4,x+per/2,y);ctx.stroke()}
      }
      ctx.fillStyle='rgba(255,255,255,.75)';ctx.fillRect(-10,G-9,W+20,3);
      // parasols
      const per=190;
      for(let x=-((dist*.75)%per)-per,i=0;x<W+per;x+=per,i++){
        const k2=Math.floor((x+dist*.75)/per),c=['#D8341F','#F5B335','#2E7D6A','#5AA9E6'][((k2%4)+4)%4];
        line(x,G-3,x,G-22,2,'#6b5a45');
        ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,G-22,13,Math.PI,0);ctx.closePath();ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.85)';ctx.beginPath();ctx.arc(x,G-22,13,Math.PI*1.3,Math.PI*1.55);ctx.lineTo(x,G-22);ctx.closePath();ctx.fill();
      }
      // gulls
      for(let i=0;i<3;i++){
        const gx=W+100-((dist*.35+i*260)%(W+200)),gy=46+i*20+Math.sin(frameN*.1+i)*4,f=Math.sin(frameN*.2+i)*3;
        ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(gx-9,gy+f);ctx.quadraticCurveTo(gx-4,gy-4,gx,gy);ctx.quadraticCurveTo(gx+4,gy-4,gx+9,gy+f);ctx.stroke();
      }
    }else if(k==='hills'){
      hillLayer(dist*.1,G-52,70,.012,'#B7D49C',false);
      hillLayer(dist*.25,G-20,56,.02,'#86B26F',true);
    }else if(k==='alps'){
      mountains(dist*.05,G-36,150,'#8CA6CF','#FFFFFF',1.37,400);
      mountains(dist*.12,G-14,100,'#6F8CBB','#F1F6FC',2.1,310);
      town(dist*.4,'#CDB894','#A5562F');
      if(ST[si].tint){ctx.fillStyle=ST[si].tint;ctx.fillRect(0,G-170,W,170)}
    }else if(k==='canada'){
      mountains(dist*.06,G-30,110,'#A9BDD3','#FFFFFF',1.7,360);
      pineRow(dist*.35,true,'#3B6B66');
      for(let x=-((dist*.6)%330)-330;x<W+330;x+=330){PD.maple(x+120)}
    }else if(k==='midwest'){
      ctx.fillStyle='rgba(255,255,255,.55)';
      for(let i=0;i<3;i++){const cx=((i*300-dist*.08)%(W+200)+W+200)%(W+200)-100;ctx.beginPath();ctx.ellipse(cx,70+i*14,50,12,0,0,7);ctx.ellipse(cx+26,62+i*14,34,11,0,0,7);ctx.fill()}
      ctx.fillStyle='#A7C58A';ctx.fillRect(-10,G-14,W+20,14);
    }
    props(si);
    if(k==='midwest')corn(dist*.8);
    if(k==='canada'){
      ctx.fillStyle='rgba(255,255,255,.9)';
      for(let i=0;i<55;i++){const x=(i*97+frameN*(.4+(i%3)*.25))%W,y=(i*53+frameN*(.8+(i%4)*.3))%G;ctx.fillRect(x,y,2.2,2.2)}
    }
    ctx.globalAlpha=1;
  }
  function groundDetail(k,al){
    if(al<=0.01)return;
    ctx.globalAlpha=al;
    if(k==='sea'){
      ctx.fillStyle='rgba(150,120,70,.35)';
      for(let x=-(dist%41)-41,i=0;x<W+41;x+=41,i++)ctx.fillRect(x+(i%3)*7,G+14+(i%4)*10,3,2);
    }else if(k==='hills'){
      for(let x=-(dist%56)-56;x<W+56;x+=28){ctx.fillStyle=(Math.floor((x+dist)/28)%2)?'#D8341F':'#fff';ctx.fillRect(x,G,28,6)}
      ctx.fillStyle='rgba(255,255,255,.55)';for(let x=-(dist%64);x<W;x+=64)ctx.fillRect(x,G+28,32,3);
    }else if(k==='alps'){
      ctx.fillStyle='rgba(255,255,255,.5)';for(let x=-(dist%64);x<W;x+=64)ctx.fillRect(x,G+28,32,3);
    }else if(k==='canada'){
      ctx.fillStyle='rgba(120,160,200,.4)';for(let x=-(dist%90);x<W;x+=90)ctx.fillRect(x,G+30,46,3);
    }else if(k==='midwest'){
      ctx.fillStyle='rgba(90,70,40,.35)';for(let x=-(dist%70);x<W;x+=70)ctx.fillRect(x,G+30,36,3);
    }
    ctx.globalAlpha=1;
  }

  /* ---------- obstacles ---------- */
  function drawObs(o){
    const x=o.x,w=o.w,h=o.h,cx=x+w/2;
    switch(o.t){
    case 'cone':
      ctx.fillStyle='#2B3447';ctx.fillRect(x-1,G-5,w+2,5);
      poly([x+3,G-5,cx-3,G-h,cx+3,G-h,x+w-3,G-5],'#FF7A1A');
      {const hw=t=>(w/2-3)*(1-t)+3*t,yy=t=>G-5-t*(h-5);poly([cx-hw(.4),yy(.4),cx+hw(.4),yy(.4),cx+hw(.62),yy(.62),cx-hw(.62),yy(.62)],'#fff')}
      break;
    case 'tire':
      disc(cx,G-h/2,h/2,'#1E232E');ctx.strokeStyle='#394156';ctx.lineWidth=4;ctx.beginPath();ctx.arc(cx,G-h/2,h/2-6,0,7);ctx.stroke();
      disc(cx,G-h/2,5,'#8A94A8');ctx.strokeStyle='#FFD60A';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,G-h/2,h/2-2,Math.PI*.15,Math.PI*.6);ctx.stroke();
      break;
    case 'barrier':
      ctx.fillStyle='#fff';rrect(x,G-h,w,h-4,3);ctx.fill();
      ctx.save();rrect(x,G-h,w,h-4,3);ctx.clip();ctx.fillStyle='#D8341F';
      for(let i=-2;i<8;i++){const sx=x+i*12;poly([sx,G-4,sx+6,G-4,sx+6+h,G-h,sx+h,G-h],'#D8341F')}
      ctx.restore();ctx.fillStyle='#2B3447';ctx.fillRect(x+4,G-5,5,5);ctx.fillRect(x+w-9,G-5,5,5);
      break;
    case 'crab':
      line(cx-8,G-8,cx-13,G-2,1.6,'#B02A18');line(cx-5,G-6,cx-9,G,1.6,'#B02A18');line(cx+8,G-8,cx+13,G-2,1.6,'#B02A18');line(cx+5,G-6,cx+9,G,1.6,'#B02A18');
      line(cx-8,G-10,cx-12,G-14,2,'#E0472B');line(cx+8,G-10,cx+12,G-14,2,'#E0472B');
      disc(cx-12,G-15,4.2,'#E0472B');disc(cx+12,G-15,4.2,'#E0472B');
      ctx.fillStyle='#E0472B';ctx.beginPath();ctx.ellipse(cx,G-8,10,6.5,0,0,7);ctx.fill();
      line(cx-3,G-13,cx-3,G-17,1.2,'#B02A18');line(cx+3,G-13,cx+3,G-17,1.2,'#B02A18');disc(cx-3,G-18,1.5,'#111');disc(cx+3,G-18,1.5,'#111');
      break;
    case 'ball':{
      const r=w/2,cy=G-r,cols=['#D8341F','#fff','#F5B335','#fff','#2E7D6A','#fff'];
      for(let i=0;i<6;i++){ctx.fillStyle=cols[i];ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,i*Math.PI/3,(i+1)*Math.PI/3);ctx.closePath();ctx.fill()}
      ctx.strokeStyle='rgba(20,36,61,.25)';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(cx,cy,r,0,7);ctx.stroke();break;}
    case 'castle':
      poly([x,G,x+w,G,x+w-4,G-14,x+4,G-14],'#D9B97A');
      ctx.fillStyle='#E4C88C';ctx.fillRect(x+2,G-26,9,14);ctx.fillRect(cx-5,G-30,10,18);ctx.fillRect(x+w-11,G-24,9,12);
      ctx.fillStyle='#D9B97A';[[x+2,G-29],[x+7,G-29],[cx-5,G-33],[cx+1,G-33],[x+w-11,G-27],[x+w-6,G-27]].forEach(([a,b])=>ctx.fillRect(a,b,4,3));
      line(cx,G-30,cx,G-38,1.4,'#6b5a45');poly([cx,G-38,cx+8,G-35,cx,G-32],'#D8341F');
      ctx.fillStyle='#A98A55';ctx.beginPath();ctx.arc(cx,G-4,4.5,Math.PI,0);ctx.fill();
      break;
    case 'car':
      ctx.fillStyle='#9BD0E8';ctx.beginPath();ctx.moveTo(x+3,G-5);ctx.lineTo(x+3,G-15);ctx.quadraticCurveTo(x+5,G-20,x+13,G-21);ctx.bezierCurveTo(x+17,G-35,x+37,G-35,x+41,G-21);ctx.quadraticCurveTo(x+50,G-20,x+51,G-14);ctx.lineTo(x+51,G-5);ctx.closePath();ctx.fill();
      ctx.fillStyle='#2B3447';ctx.beginPath();ctx.moveTo(x+18,G-22);ctx.bezierCurveTo(x+20,G-31,x+34,G-31,x+37,G-22);ctx.closePath();ctx.fill();
      line(x+27,G-30,x+27,G-22,1.6,'#9BD0E8');
      disc(x+14,G-5,6,'#222');disc(x+14,G-5,2.6,'#C9D4E0');disc(x+40,G-5,6,'#222');disc(x+40,G-5,2.6,'#C9D4E0');
      disc(x+49,G-14,2.6,'#FFE08A');ctx.fillStyle='#C9D4E0';ctx.fillRect(x+2,G-9,50,2.4);
      break;
    case 'toret':
      ctx.fillStyle='#165E3F';ctx.fillRect(x+2,G-5,18,5);
      ctx.fillStyle='#1F7A52';rrect(x+5,G-30,12,26,5);ctx.fill();
      disc(x+11,G-31,7,'#1F7A52');
      line(x+5,G-35,x+2,G-40,2,'#1F7A52');line(x+17,G-35,x+20,G-40,2,'#1F7A52');
      line(x+15,G-27,x+21,G-24,3,'#1F7A52');disc(x+21,G-19,1.7,'#8FD0F2');
      break;
    case 'goose':
      line(cx-2,G-12,cx-2,G,1.6,'#222');line(cx+4,G-12,cx+4,G,1.6,'#222');
      poly([x,G-16,x+8,G-20,x+8,G-12],'#3E424A');
      ctx.fillStyle='#4B4F57';ctx.beginPath();ctx.ellipse(cx,G-15,12,7,0,0,7);ctx.fill();
      ctx.fillStyle='#CFC6B4';ctx.beginPath();ctx.ellipse(cx+4,G-13,7,4.5,0,0,7);ctx.fill();
      line(cx+9,G-18,cx+10,G-31,4,'#1D1F24');disc(cx+11,G-32,3.8,'#1D1F24');
      ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(cx+12,G-30.5,2.4,1.6,0,0,7);ctx.fill();
      line(cx+14,G-32,cx+18,G-31,1.8,'#111');
      break;
    case 'snowman':
      disc(cx,G-11,11,'#fff');disc(cx,G-28,8,'#fff');disc(cx,G-42,6,'#fff');
      ctx.strokeStyle='rgba(120,160,200,.5)';ctx.lineWidth=1;[[G-11,11],[G-28,8],[G-42,6]].forEach(([y,r])=>{ctx.beginPath();ctx.arc(cx,y,r,0,7);ctx.stroke()});
      disc(cx-2,G-43,.9,'#111');disc(cx+2,G-43,.9,'#111');poly([cx,G-41,cx+6,G-40,cx,G-39],'#FF7A1A');
      line(cx-7,G-35,cx+7,G-35,3,'#D52B1E');
      ctx.fillStyle='#222';ctx.fillRect(cx-5,G-52,10,5);ctx.fillRect(cx-7,G-48,14,2);
      break;
    case 'hay':{
      const r=w/2,cy=G-r;disc(cx,cy,r,'#D9B356');
      ctx.strokeStyle='#B88F34';ctx.lineWidth=1.6;[4,9,13].forEach(rr=>{ctx.beginPath();ctx.arc(cx,cy,rr,0,7);ctx.stroke()});
      ctx.strokeStyle='#8A6A22';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(cx,cy,r-.6,0,7);ctx.stroke();break;}
    case 'mailbox':
      ctx.fillStyle='#7A5A3A';ctx.fillRect(cx-3,G-32,6,32);
      ctx.fillStyle='#2B4C9B';rrect(x+1,G-44,w-2,14,7);ctx.fill();
      ctx.fillStyle='#D52B1E';ctx.fillRect(x+w-5,G-51,3,10);ctx.fillRect(x+w-5,G-51,8,4);
      ctx.fillStyle='#fff';ctx.fillRect(x+5,G-39,10,2);
      break;
    case 'pumpkin':
      ctx.fillStyle='#F08A24';ctx.beginPath();ctx.ellipse(cx,G-12,15,12,0,0,7);ctx.fill();
      ctx.strokeStyle='#C96A12';ctx.lineWidth=1.4;[-7,0,7].forEach(o=>{ctx.beginPath();ctx.ellipse(cx+o*.9,G-12,Math.abs(o)<1?4:8,12,0,0,7);ctx.stroke()});
      ctx.fillStyle='#4F7F3A';ctx.fillRect(cx-2,G-26,4,6);
      break;
    }
  }

  /* ---------- the head (shared by runner and cyclist) ---------- */
  function head(cx,cy){
    const skin='#E2AA84',skinD='#C58C68';
    ctx.fillStyle=skin;ctx.beginPath();ctx.arc(cx,cy,6.4,0,7);ctx.fill();
    disc(cx-1.8,cy+.8,1.7,skinD);
    poly([cx+5.4,cy-.8,cx+8.2,cy+1.9,cx+5.2,cy+2.5],skin);
    disc(cx+3.3,cy-1.2,.95,'#1d1511');
    line(cx+2,cy-3.4,cx+5.2,cy-3,1.3,'#0B0B0D');
    line(cx+3,cy+3.7,cx+5.2,cy+3.7,.9,'#9a5546');
    ctx.fillStyle='#0B0B0D';ctx.beginPath();
    ctx.moveTo(cx+6.2,cy-1.8);
    ctx.bezierCurveTo(cx+7.6,cy-8.4,cx+2,cy-10.2,cx-3,cy-9);
    ctx.bezierCurveTo(cx-7.4,cy-8.2,cx-8.6,cy-3,cx-7.4,cy+1.4);
    ctx.bezierCurveTo(cx-6.4,cy+2,cx-5.4,cy+.4,cx-5.2,cy-1.2);
    ctx.bezierCurveTo(cx-2,cy-3.4,cx+2.5,cy-4.4,cx+6.2,cy-1.8);
    ctx.closePath();ctx.fill();
  }
  function brace(kx,ky,dx,dy){
    const len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;const nx=-dy,ny=dx;
    line(kx-dx*6.5,ky-dy*6.5,kx+dx*6.5,ky+dy*6.5,8.8,'#222B3C');
    [-4.2,4.2].forEach(m=>line(kx+dx*m-nx*4.7,ky+dy*m-ny*4.7,kx+dx*m+nx*4.7,ky+dy*m+ny*4.7,1.8,'#F5B335'));
    disc(kx,ky,1.7,'#9FB2CE');
  }

  /* ---------- the runner ---------- */
  function drawRunner(x,yFeet,o){
    ctx.save();ctx.translate(x,yFeet);ctx.scale(S,S);
    const ph=o.phase,T=12,Sh=12;
    let legs;
    if(o.air)legs=[{a:.95,k:1.05},{a:-.45,k:.55}];
    else if(o.stand)legs=[{a:.1,k:.08},{a:-.1,k:.08}];
    else legs=[0,Math.PI].map(d=>({a:.85*Math.sin(ph+d),k:.2+1.05*Math.max(0,Math.cos(ph+d))}));
    const pts=legs.map(l=>({a:l.a,k:l.k,kx:T*Math.sin(l.a),ky:T*Math.cos(l.a),fx:T*Math.sin(l.a)+Sh*Math.sin(l.a-l.k),fy:T*Math.cos(l.a)+Sh*Math.cos(l.a-l.k)}));
    const hx=0,hy=-Math.max(pts[0].fy,pts[1].fy);
    const lean=o.stand?.04:.2;
    const sx=hx+17*Math.sin(lean),sy=hy-17*Math.cos(lean);
    const cx=sx+Math.sin(lean)*8+2,cy=sy-9;
    const skin='#E2AA84',skinD='#C58C68';
    function arm(near){
      let s,e;
      if(o.stand){s=near?.12:-.12;e=.25}
      else if(o.air){s=near?1.25:-.9;e=near?1.1:1.0}
      else{s=(near?-1:1)*.8*Math.sin(ph);e=1.35}
      const ex=sx+8.5*Math.sin(s),ey=sy+8.5*Math.cos(s);
      const hxn=ex+8*Math.sin(s+e),hyn=ey+8*Math.cos(s+e);
      const c=near?skin:skinD;
      line(sx,sy,ex,ey,5,c);line(ex,ey,hxn,hyn,4.4,c);
      line(sx,sy,sx+(ex-sx)*.45,sy+(ey-sy)*.45,7,near?'#D8341F':'#B02A18');
      disc(hxn,hyn,2.5,c);
    }
    function leg(i,front){
      const p=pts[i],kx=hx+p.kx,ky=hy+p.ky,fx=hx+p.fx,fy=hy+p.fy;
      const sk=front?skin:skinD,sh=front?'#1B3A6B':'#142C52';
      line(kx,ky,fx,fy,5.4,sk);line(hx,hy,kx,ky,6.4,sk);
      line(hx,hy,hx+(kx-hx)*.58,hy+(ky-hy)*.58,9.6,sh);
      ctx.save();ctx.translate(fx,fy-.6);ctx.rotate(clamp(-(p.a-p.k)*.45,-.45,.6));
      ctx.fillStyle=front?'#F3F6FA':'#D2D9E4';
      ctx.beginPath();ctx.moveTo(-3.6,-3.4);ctx.lineTo(2.6,-3.4);ctx.quadraticCurveTo(8.8,-2.6,8.8,1);ctx.lineTo(-3.6,1);ctx.closePath();ctx.fill();
      ctx.fillStyle='#222B3C';ctx.fillRect(-3.8,.4,12.8,1.7);
      ctx.fillStyle='#D8341F';ctx.fillRect(-1,-2,4,1.6);
      ctx.restore();
      if(front)brace(kx,ky,(Math.sin(p.a)+Math.sin(p.a-p.k))/2,(Math.cos(p.a)+Math.cos(p.a-p.k))/2);
    }
    arm(false);
    leg(1,false);
    line(hx,hy-1,sx,sy,12.5,'#D8341F');
    disc(hx,hy,6.4,'#1B3A6B');
    leg(0,true);
    line(sx,sy,cx-.5,cy+4,4.8,skin);
    head(cx,cy);
    arm(true);
    ctx.restore();
  }

  /* ---------- the cyclist ---------- */
  function ik(ax,ay,bx,by,l1,l2,sign){
    let dx=bx-ax,dy=by-ay,d=Math.hypot(dx,dy);
    const dd=Math.min(d,l1+l2-.05);
    const a=(l1*l1-l2*l2+dd*dd)/(2*dd),h=Math.sqrt(Math.max(0,l1*l1-a*a));
    const ux=dx/d,uy=dy/d,px=ax+ux*a,py2=ay+uy*a;
    let nx=uy*sign,ny=-ux*sign;
    return {kx:px+nx*h,ky:py2+ny*h,fx:ax+ux*dd,fy:ay+uy*dd};
  }
  function drawCyclist(x,yFeet,o){
    ctx.save();ctx.translate(x,yFeet);ctx.scale(S,S);
    if(o.air)ctx.rotate(-.08);
    const BB={x:0,y:-9},RA={x:-15,y:-11},FA={x:16,y:-11};
    const th=o.phase;
    function wheel(c){
      ctx.strokeStyle='#1E232E';ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(c.x,c.y,10.6,0,7);ctx.stroke();
      ctx.strokeStyle='rgba(110,120,140,.85)';ctx.lineWidth=.7;
      for(let i=0;i<6;i++){const a=o.wheel+i*Math.PI/3;ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(c.x+Math.cos(a)*10.2,c.y+Math.sin(a)*10.2);ctx.stroke()}
      disc(c.x,c.y,1.4,'#444');
    }
    wheel(RA);wheel(FA);
    const hip={x:-6,y:-26.6};
    const sh={x:hip.x+16*Math.sin(.95),y:hip.y-16*Math.cos(.95)};
    const hand={x:16,y:-28.2};
    const p1={x:BB.x+6*Math.cos(th),y:BB.y+6*Math.sin(th)},p2={x:BB.x-6*Math.cos(th),y:BB.y-6*Math.sin(th)};
    const skin='#E2AA84',skinD='#C58C68';
    function leg(p,front){
      const r=ik(hip.x,hip.y,p.x,p.y,12.5,12.2,1);
      const sk=front?skin:skinD,shc=front?'#1B3A6B':'#142C52';
      line(r.kx,r.ky,r.fx,r.fy,5.2,sk);line(hip.x,hip.y,r.kx,r.ky,6.4,sk);
      line(hip.x,hip.y,hip.x+(r.kx-hip.x)*.6,hip.y+(r.ky-hip.y)*.6,9.4,shc);
      ctx.fillStyle=front?'#F3F6FA':'#D2D9E4';rrect(r.fx-3.2,r.fy-1.8,10,3.8,1.8);ctx.fill();
      if(front)brace(r.kx,r.ky,((r.kx-hip.x)+(r.fx-r.kx))/2,((r.ky-hip.y)+(r.fy-r.ky))/2);
    }
    // far leg + far crank
    line(BB.x,BB.y,p2.x,p2.y,1.6,'#555');
    leg(p2,false);
    // frame
    const fr='#D8341F';
    line(BB.x,BB.y,-5,-24,2.8,fr);line(-5.2,-23.6,11,-25,2.6,fr);line(BB.x,BB.y,10.5,-24,2.8,fr);
    line(10.5,-24,12,-28.4,3.2,fr);line(11,-24.5,FA.x,FA.y,2.2,fr);
    line(BB.x,BB.y,RA.x,RA.y,2,fr);line(-5,-24,RA.x,RA.y,2,fr);
    line(-5.5,-25,-6,-26.2,1.6,'#222');line(-9.4,-26.9,-2.8,-26.5,2.6,'#111');
    line(12,-28.4,15,-28.8,2.2,'#222');
    ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(15,-28.8);ctx.quadraticCurveTo(19,-28.2,17.2,-24.4);ctx.stroke();
    ctx.strokeStyle='#8A93A0';ctx.lineWidth=1;ctx.beginPath();ctx.arc(BB.x,BB.y,3.4,0,7);ctx.stroke();
    // torso
    line(hip.x,hip.y-1,sh.x,sh.y,11.5,'#D8341F');
    disc(hip.x,hip.y,6.2,'#1B3A6B');
    // near leg
    line(BB.x,BB.y,p1.x,p1.y,1.6,'#777');
    leg(p1,true);
    // neck, head
    const cx=sh.x+5,cy=sh.y-5.2;
    line(sh.x,sh.y,cx-1,cy+4,4.8,skin);
    head(cx,cy);
    // arms
    const e=ik(sh.x,sh.y,hand.x,hand.y,8.6,8.6,-1);
    line(sh.x,sh.y,e.kx,e.ky,5,skin);line(e.kx,e.ky,e.fx,e.fy,4.4,skin);
    line(sh.x,sh.y,sh.x+(e.kx-sh.x)*.45,sh.y+(e.ky-sh.y)*.45,7,'#D8341F');
    disc(e.fx,e.fy,2.5,skin);
    ctx.restore();
  }

  /* ---------- HUD + overlays ---------- */
  function hud(){
    const bx=18,bw=W-88,by=14;
    ST.forEach(s=>{
      const x0=bx+bw*s.s0/TOTAL+1,w=bw*s.len/TOTAL-2;
      ctx.fillStyle='rgba(20,36,61,.18)';rrect(x0,by,w,8,4);ctx.fill();
      const f=clamp((dist-s.s0)/s.len);
      if(f>0){ctx.fillStyle=CC[s.c];rrect(x0,by,Math.max(8,w*f),8,4);ctx.fill()}
      ctx.font='700 11px Figtree,system-ui,sans-serif';ctx.textAlign='center';ctx.fillStyle='rgba(20,36,61,.85)';
      ctx.fillText(s.name,x0+w/2,by+24);
    });
    for(let i=0;i<3;i++){ctx.fillStyle='rgba(20,36,61,'+(.5-i*.15)+')';ctx.beginPath();ctx.arc(bx+bw+12+i*11,by+4,2.6-i*.4,0,7);ctx.fill()}
    const mx=bx+bw*clamp(dist/TOTAL);
    disc(mx,by+4,7,'#fff');disc(mx,by+4,4.6,'#D8341F');
    ctx.textAlign='left';ctx.fillStyle='#14243D';ctx.font='700 13px Figtree,system-ui,sans-serif';
    ctx.fillText(T('g.knee','Knee load'),18,62);
    ctx.fillStyle='rgba(20,36,61,.18)';rrect(100,53,150,10,5);ctx.fill();
    const lc=load<50?'#2E7D6A':load<80?'#F5B335':'#D8341F';
    ctx.fillStyle=lc;rrect(100,53,Math.max(0,1.5*clamp(load,0,100)),10,5);ctx.fill();
    if(load>=80){ctx.strokeStyle='#D8341F';ctx.lineWidth=2;rrect(99,52,152,12,6);ctx.stroke()}
  }
  const PXC=W/2+55;
  function panel(l1,l2,l3){
    ctx.fillStyle='rgba(18,42,79,.88)';rrect(PXC-240,H/2-58,480,124,16);ctx.fill();
    ctx.textAlign='center';
    ctx.fillStyle='#fff';ctx.font='800 28px "Bricolage Grotesque",system-ui,sans-serif';ctx.fillText(l1,PXC,H/2-14);
    ctx.fillStyle='#F5B335';ctx.font='600 16px Figtree,system-ui,sans-serif';ctx.fillText(l2,PXC,H/2+14);
    ctx.fillStyle='#D5E2F3';ctx.font='500 14px Figtree,system-ui,sans-serif';ctx.fillText(l3,PXC,H/2+42);
    ctx.textAlign='left';
  }
  function endPanel(){
    const a=clamp(endT/50);
    ctx.globalAlpha=a;
    ctx.fillStyle='rgba(18,42,79,.88)';rrect(PXC-240,H/2-62,480,128,16);ctx.fill();
    ctx.textAlign='center';
    ctx.fillStyle='#fff';ctx.font='800 28px "Bricolage Grotesque",system-ui,sans-serif';ctx.fillText(T('g.end1','To be continued...'),PXC,H/2-20);
    ctx.fillStyle='#F5B335';ctx.font='600 16px Figtree,system-ui,sans-serif';ctx.fillText(T('g.end2','This is just the beginning.'),PXC,H/2+6);
    ctx.fillStyle='#D5E2F3';ctx.font='500 13px Figtree,system-ui,sans-serif';ctx.fillText(T('g.end3','Loading the next move...'),PXC,H/2+30);
    const bw=300,bx=PXC-bw/2,by=H/2+40;
    ctx.fillStyle='rgba(255,255,255,.2)';rrect(bx,by,bw,8,4);ctx.fill();
    const pr=.62+.03*Math.sin(frameN*.05);
    ctx.fillStyle='#F5B335';rrect(bx,by,bw*pr,8,4);ctx.fill();
    const sx=bx+((frameN*3)%(bw*pr));ctx.fillStyle='rgba(255,255,255,.45)';ctx.fillRect(sx,by,16,8);
    if(endT>90){ctx.fillStyle='rgba(213,226,243,.8)';ctx.font='500 11px Figtree,system-ui,sans-serif';ctx.fillText(T('g.again','Tap or press Space to run again'),PXC,H/2+62)}
    ctx.textAlign='left';ctx.globalAlpha=1;
  }

  function draw(){
    const bl=blend(dist),A=ST[bl.a],B=ST[bl.b],t=bl.t;
    const si=stageAt(dist),cur=ST[si];
    ctx.save();
    if(shake>0)ctx.translate((Math.random()-.5)*5,(Math.random()-.5)*5);
    const sky=ctx.createLinearGradient(0,0,0,G);
    sky.addColorStop(0,mix(A.sky[0],B.sky[0],t));sky.addColorStop(1,mix(A.sky[1],B.sky[1],t));
    ctx.fillStyle=sky;ctx.fillRect(-10,-10,W+20,H+20);
    // stars at dawn, fading as the sun rises
    const fw=bl.a===6?1:(bl.b===6?t:0);
    const p6=clamp((dist-ST[6].s0)/ST[6].len);
    if(fw>0){ctx.fillStyle='rgba(255,255,255,'+(0.8*fw*(1-p6*1.4>0?1-p6*1.4:0))+')';for(let i=0;i<16;i++)ctx.fillRect((i*83)%W,10+(i*37)%90,2,2)}
    // sun
    let sy=70;
    if(bl.a===6)sy=(G-4)-((G-4)-58)*smooth(p6);
    else if(bl.b===6)sy=70+((G-4)-70)*t;
    ctx.fillStyle='rgba(245,179,53,.28)';ctx.beginPath();ctx.arc(570,sy,40,0,7);ctx.fill();
    disc(570,sy,24,'#F5B335');
    scene(bl.a,1-t);if(t>0)scene(bl.b,t);
    // ground
    ctx.fillStyle=mix(A.gnd,B.gnd,t);ctx.fillRect(-10,G,W+20,H-G+10);
    ctx.fillStyle=mix(A.lip,B.lip,t);ctx.fillRect(-10,G,W+20,5);
    groundDetail(A.kind,1-t);if(t>0)groundDetail(B.kind,t);
    obs.forEach(drawObs);
    parts.forEach(p=>{ctx.fillStyle='rgba(255,255,255,'+(0.55*p.life/22)+')';ctx.beginPath();ctx.arc(p.x,p.y,2+(22-p.life)*.12,0,7);ctx.fill()});
    const blink=invuln>0&&Math.floor(invuln/5)%2===0;
    if(!blink){
      if(cur.bike)drawCyclist(PX,py,{phase:dist*.075,wheel:dist*.061,air:air&&mode==='play'});
      else drawRunner(PX,py,{phase:dist*.055,air:air&&mode==='play',stand:mode==='idle'});
    }
    ctx.restore();
    hud();
    if(mode==='idle')panel(T('g.title','My journey so far'),T('g.sub','A few places, one knee. Pace yourself.'),T('g.start','Tap, click or press Space to start'));
    if(mode==='over')panel(T('g.over1','Too much, too soon'),T('g.over2','Every comeback needs rest days.'),T('g.retry','Tap or press Space to try again'));
    if(mode==='end')endPanel();
  }

  cv.addEventListener('pointerdown',e=>{e.preventDefault();cv.focus({preventScroll:true});jump()});
  window.addEventListener('keydown',e=>{
    if(e.code!=='Space'&&e.code!=='ArrowUp')return;
    if(mode==='play'||mode==='end'||document.activeElement===cv){e.preventDefault();if(!e.repeat)jump()}
  });
  document.addEventListener('langchange',()=>{if(curMsg)msgEl.textContent=I18N.pick(curMsg);if(mode==='idle'||mode==='over')draw()});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(draw);
  draw();
})();
