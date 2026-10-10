/* Photo viewer: Beyond work galleries (personal page) + chart zoom (main page) */
(function(){
  /* HOW TO ADD YOUR PHOTOS:
     1. Put the image files in images/gallery/
     2. Add or edit a slide: {src:'images/gallery/your-photo.jpeg', cap:{en:'English caption', it:'Didascalia italiana'}}
     Slides with an empty src show a "photo coming soon" tile. */
  const GALLERIES={
    motor:[
      {src:'images/gallery/Castelluccio.jpeg',cap:'gal.motor.1'},
      {src:'images/gallery/GT4RS.jpeg',cap:'gal.motor.2',link:'https://www.youtube.com/watch?v=69z05ziuXpU',linkLabel:'gal.motor.3'},
      {src:'images/gallery/Indy500.jpeg',cap:'gal.motor.4'},
      {src:'images/gallery/Dallara_Stradale.jpeg',cap:'gal.motor.5'}
    ],
    fit:[
      {src:'images/gallery/Giant.jpeg',cap:'gal.fit.1'},
      {src:'images/gallery/Climbing.jpeg',cap:'gal.fit.2'},
      {src:'images/gallery/Swimming_Pool.jpeg',cap:'gal.fit.3'}
    ],
    mountains:[
      {src:'images/gallery/Mountain_snow.jpeg',cap:'gal.mountains.1'},
      {src:'images/gallery/YellowStone.jpeg',cap:'gal.mountains.2'},
      {src:'images/gallery/Bisalta.jpeg',cap:'gal.mountains.3'}
    ],
    intro:[
      {src:'images/gallery/Northern_Lights.jpeg',cap:'...'},
      {src:'images/gallery/Hamilton_woods.jpeg',cap:'...'},
      {src:'images/gallery/NiagaraOnTheLake.jpeg',cap:'...'}
    ]
  };
  const COLORS={motor:['#D8341F','🏎️',false],fit:['#F5B335','🏋️',true],mountains:['#2E7D6A','⛰️',false],intro:['#1B3A6B','📖',false]};

  document.body.insertAdjacentHTML('beforeend',`
  <div class="viewer" id="viewer" role="dialog" aria-modal="true" aria-labelledby="viewer-title" hidden>
    <div class="viewer-panel">
      <div class="viewer-head"><h3 id="viewer-title"></h3>
        <button type="button" class="viewer-close" id="viewer-close" aria-label="Close" data-i18n-attr="aria-label:v.close">&times;</button></div>
      <div class="viewer-track" id="viewer-track" tabindex="0"></div>
      <div class="viewer-bar" id="viewer-bar">
        <button type="button" class="vbtn" id="viewer-prev" aria-label="Previous" data-i18n-attr="aria-label:v.prev">&#8249;</button>
        <div class="dots" id="viewer-dots" aria-hidden="true"></div>
        <button type="button" class="vbtn" id="viewer-next" aria-label="Next" data-i18n-attr="aria-label:v.next">&#8250;</button>
      </div>
      <p id="viewer-cap" aria-live="polite"></p>
    </div>
  </div>`);
  const v=document.getElementById('viewer');I18N.apply(v);
  const track=document.getElementById('viewer-track'),titleEl=document.getElementById('viewer-title'),capEl=document.getElementById('viewer-cap'),
        dotsEl=document.getElementById('viewer-dots'),bar=document.getElementById('viewer-bar'),
        prev=document.getElementById('viewer-prev'),next=document.getElementById('viewer-next'),closeBtn=document.getElementById('viewer-close');
  let slides=[],idx=0,lastFocus=null,curKey='',curTitleEl=null;

  function render(sl,key){
    track.innerHTML='';dotsEl.innerHTML='';
    sl.forEach((s,i)=>{
      const d=document.createElement('div');d.className='slide';
      if(s.src){
        const im=document.createElement('img');im.src=s.src;im.alt=I18N.pick(s.alt||s.cap)||'';
        if(s.link){
          const m=document.createElement('div');m.className='media';m.appendChild(im);
          const a=document.createElement('a');a.className='vlink';a.href=s.link;a.target='_blank';a.rel='noopener';
          const lbl=I18N.pick(s.linkLabel)||I18N.t('v.open','Open link');
          a.setAttribute('aria-label',lbl+' ('+I18N.t('v.newtab','opens in a new tab')+')');
          a.innerHTML='<span>&#9654; '+lbl+'</span>';
          m.appendChild(a);d.appendChild(m);
        }else d.appendChild(im);
      }else{
        const c=COLORS[key]||['#1B3A6B','📷',false];
        const ph=document.createElement('div');ph.className='ph'+(c[2]?' dark':'');ph.style.background=c[0];
        ph.innerHTML='<span class="em" aria-hidden="true">'+c[1]+'</span>'+I18N.t('v.soon','Photo coming soon')+'<small>'+(i+1)+' / '+sl.length+'</small>';
        d.appendChild(ph);
      }
      track.appendChild(d);dotsEl.appendChild(document.createElement('i'));
    });
    bar.hidden=sl.length<2;
  }
  function mark(){
    [...dotsEl.children].forEach((d,k)=>d.classList.toggle('on',k===idx));
    capEl.textContent=(slides[idx]&&I18N.pick(slides[idx].cap))||'';
  }
  function show(i,smooth){
    idx=Math.max(0,Math.min(slides.length-1,i));
    track.scrollTo({left:idx*track.clientWidth,behavior:smooth?'smooth':'auto'});mark();
  }
  function open(titleSrc,sl,key,start){
    lastFocus=document.activeElement;slides=sl;curKey=key;curTitleEl=titleSrc;
    titleEl.textContent=titleSrc.textContent||titleSrc;
    render(sl,key);v.hidden=false;document.body.style.overflow='hidden';show(start||0,false);closeBtn.focus();
  }
  function close(){v.hidden=true;document.body.style.overflow='';if(lastFocus&&lastFocus.focus)lastFocus.focus()}
  let t=null;
  track.addEventListener('scroll',()=>{clearTimeout(t);t=setTimeout(()=>{const i=Math.round(track.scrollLeft/track.clientWidth);if(i!==idx){idx=i;mark()}},60)});
  prev.addEventListener('click',()=>show(idx-1,true));
  next.addEventListener('click',()=>show(idx+1,true));
  closeBtn.addEventListener('click',close);
  v.addEventListener('click',e=>{if(e.target===v)close()});
  document.addEventListener('keydown',e=>{
    if(v.hidden)return;
    if(e.key==='Escape')close();
    else if(e.key==='ArrowLeft')show(idx-1,true);
    else if(e.key==='ArrowRight')show(idx+1,true);
    else if(e.key==='Tab'){
      const f=[...v.querySelectorAll('button:not([hidden]),a[href]')].filter(b=>!b.closest('[hidden]'));
      if(!f.length)return;const first=f[0],last=f[f.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    }
  });
  document.addEventListener('langchange',()=>{
    if(v.hidden)return;
    if(curTitleEl&&curTitleEl.textContent)titleEl.textContent=curTitleEl.textContent;
    const keep=idx;render(slides,curKey);show(keep,false);
  });

  document.querySelectorAll('.passion[data-gallery]').forEach(card=>{
    const key=card.dataset.gallery,h=card.querySelector('h3');
    const go=()=>open(h,GALLERIES[key]||[],key,0);
    card.addEventListener('click',go);
    card.querySelector('.see-btn').addEventListener('click',e=>{e.stopPropagation();go()});
  });
  document.querySelectorAll('.zoom').forEach(b=>{
    const im=b.querySelector('img');
    b.addEventListener('click',()=>{
      const titleHolder={get textContent(){return b.getAttribute('data-title')||''}};
      const sl=[{src:b.dataset.zoom,alt:im.alt,cap:b.getAttribute('data-cap')||''}];
      open(titleHolder,sl,'chart',0);
    });
  });
})();
