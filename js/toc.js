/* Side menu for the Details page: built from the sections and their sub-headings, highlights where you are. */
(function(){
  const host=document.getElementById('toc-list');if(!host)return;
  const secs=[...document.querySelectorAll('.detail[data-toc]')];
  const top=document.createElement('ul');top.className='toc-top';
  const items=[];
  secs.forEach(sec=>{
    const li=document.createElement('li');li.className='toc-proj';
    const a=document.createElement('a');a.href='#'+sec.id;a.setAttribute('data-i18n',sec.dataset.toc);
    const key=sec.dataset.toc,jl=document.querySelector('.jump a[data-i18n="'+key+'"]');a.textContent=jl?(jl.dataset.en||jl.textContent):key;
    li.appendChild(a);items.push({el:sec,link:a,proj:li});
    const wrap=document.createElement('div');wrap.className='toc-subs';const ul=document.createElement('ul');wrap.appendChild(ul);
    sec.querySelectorAll('h3.sub').forEach(h=>{
      const k=h.getAttribute('data-i18n');if(!h.id)h.id=k.replace(/\./g,'-');
      const si=document.createElement('li'),sa=document.createElement('a');
      sa.href='#'+h.id;sa.setAttribute('data-i18n',k);sa.textContent=h.dataset.en||h.textContent;
      si.appendChild(sa);ul.appendChild(si);items.push({el:h,link:sa,proj:li});
    });
    li.appendChild(wrap);top.appendChild(li);
  });
  host.appendChild(top);I18N.apply(host);

  let ticking=false;
  function spy(){
    ticking=false;
    const y=window.innerHeight*0.3;let cur=items[0];
    for(const it of items){if(it.el.getBoundingClientRect().top<=y)cur=it;else break}
    items.forEach(it=>it.link.classList.toggle('on',it===cur));
    top.querySelectorAll('.toc-proj').forEach(p=>p.classList.toggle('open',p===cur.proj));
    const bar=cur.link.closest('.toc-subs>ul');
    if(bar&&window.innerWidth<=1100){bar.scrollLeft=cur.link.getBoundingClientRect().left-bar.getBoundingClientRect().left+bar.scrollLeft-24}
  }
  window.addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(spy)}},{passive:true});
  window.addEventListener('resize',spy);
  document.addEventListener('langchange',spy);
  spy();
})();
