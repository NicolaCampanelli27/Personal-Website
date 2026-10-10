/* Shared behaviour: nav + footer injection, language switch, popups,
   scroll reveal (both directions), contact form. */
(function(){
  const page=document.body.dataset.page||'home';
  const home=page==='home';
  const B=home?'':'index.html';

  /* ---------- Nav + footer ---------- */
  const navHTML=`
  <nav aria-label="Main" id="nav">
    <div class="wrap">
      <a class="logo" href="${home?'#top':'index.html'}" data-i18n-attr="aria-label:nav.logo" aria-label="Home"><span>NC</span></a>
      <ul class="menu" id="menu">
        <li><a href="${B}#about" data-i18n="nav.about">About</a></li>
        <li><a href="${B}#career" data-i18n="nav.career">Career</a></li>
        <li class="has-drop"><a href="${B}#projects" aria-haspopup="true"><span data-i18n="nav.projects">Projects</span><i class="caret"></i></a>
          <ul class="drop">
            <li><a href="${B}#proj-sac"><span data-i18n="nav.p1">Teaching a hybrid car to save fuel</span></a></li>
            <li><a href="${B}#proj-battery"><span data-i18n="nav.p2">Is a battery storage worth it?</span></a></li>
            <li><a href="${B}#proj-pv"><span data-i18n="nav.p3">Energy independence (solar)</span></a></li>
          </ul></li>
        <li class="has-drop"><a href="${B}#publications" aria-haspopup="true"><span data-i18n="nav.papers">Papers</span><i class="caret"></i></a>
          <ul class="drop">
            <li><a href="${B}#pub-battery"><span data-i18n="nav.pa1">Long-duration battery storage</span><small>2026</small></a></li>
            <li><a href="${B}#pub-sac"><span data-i18n="nav.pa2">Soft Actor-Critic for hybrids</span><small>2024</small></a></li>
          </ul></li>
        <li><a href="personal.html" class="${page==='personal'?'here':''}" data-i18n="nav.personal">Personal</a></li>
        <li class="has-pop" data-touchfirst="1"><a class="nav-cta" href="${B}#contact" aria-describedby="pop-nav" data-i18n="nav.contact">Get in touch</a>
          <div class="pop pop-fun" id="pop-nav" role="tooltip" data-i18n-html="pop.fun"><b>Wait, one thing before you write:</b> please don't introduce me to a new tech field, a new sport or a good book. I'm a nerd at heart, I already like too many things and I want one life to be enough...</div></li>
      </ul>
      <div class="lang-sw" role="group" data-i18n-attr="aria-label:nav.lang" aria-label="Language">
        <button type="button" data-lang="en" aria-pressed="true">EN</button>
        <button type="button" data-lang="it" aria-pressed="false">IT</button>
      </div>
      <button type="button" class="burger" aria-expanded="false" aria-controls="menu" data-i18n-attr="aria-label:nav.menu" aria-label="Menu"><i></i></button>
    </div>
  </nav>`;
  document.body.insertAdjacentHTML('afterbegin',navHTML);
  document.body.insertAdjacentHTML('beforeend','<footer>© 2026 Nicola Campanelli. <span data-i18n="ft.made">Made in Fano.</span></footer>');

  const nav=document.getElementById('nav');
  nav.querySelector('.burger').addEventListener('click',e=>{
    const o=nav.classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',String(o));
  });
  nav.querySelectorAll('#menu a').forEach(a=>a.addEventListener('click',e=>{
    if(e.defaultPrevented)return;
    if(a.closest('.has-pop')&&a.dataset.held)return;
    nav.classList.remove('open');nav.querySelector('.burger').setAttribute('aria-expanded','false');
  }));
  nav.querySelectorAll('.lang-sw button').forEach(b=>b.addEventListener('click',()=>I18N.set(b.dataset.lang)));
  /* touch: first tap on "Projects"/"Papers" opens the list, second tap goes to the section */
  nav.querySelectorAll('.has-drop>a').forEach(a=>a.addEventListener('click',e=>{
    const li=a.parentElement;
    if(window.matchMedia('(hover: none)').matches&&window.innerWidth>960&&!li.classList.contains('open')){
      e.preventDefault();
      nav.querySelectorAll('.has-drop.open').forEach(x=>x.classList.remove('open'));
      li.classList.add('open');
    }
  }));

  /* ---------- Popups ---------- */
  function bindPops(){
    document.querySelectorAll('.has-pop').forEach(w=>{
      if(w.dataset.bound)return;w.dataset.bound='1';
      const a=w.querySelector('a.btn, a.nav-cta');if(!a)return;
      a.addEventListener('click',e=>{
        if(w.dataset.touchfirst==='1'&&window.matchMedia('(hover: none)').matches&&!w.classList.contains('open')){
          e.preventDefault();a.dataset.held='1';w.classList.add('open');
          setTimeout(()=>{w.classList.remove('open');delete a.dataset.held},7000);return;
        }
        if(w.dataset.persist==='1')w.classList.add('open');
      });
    });
  }
  document.addEventListener('click',e=>{
    document.querySelectorAll('.has-pop.open,.has-drop.open,.cv-menu.open').forEach(w=>{if(!w.contains(e.target))w.classList.remove('open')});
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape')document.querySelectorAll('.has-pop.open,.has-drop.open,.cv-menu.open').forEach(w=>w.classList.remove('open'));
  });

  /* ---------- CV menu: click or tap toggles it (hover/focus also open it on desktop) ---------- */
  const cv=document.getElementById('cv-menu');
  if(cv){
    const cb=cv.querySelector('.cv-btn');
    cb.addEventListener('click',()=>{const o=cv.classList.toggle('open');cb.setAttribute('aria-expanded',String(o))});
    cv.addEventListener('focusin',()=>cb.setAttribute('aria-expanded','true'));
    cv.addEventListener('focusout',e=>{if(!cv.contains(e.relatedTarget))cb.setAttribute('aria-expanded',String(cv.classList.contains('open')))});
    cv.querySelectorAll('.cv-list a').forEach(a=>a.addEventListener('click',()=>{cv.classList.remove('open');cb.setAttribute('aria-expanded','false')}));
  }

  /* ---------- Scroll reveal: animates when sections enter, scrolling down or up ---------- */
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const io=('IntersectionObserver' in window&&!reduce)?new IntersectionObserver(es=>{
    es.forEach(en=>{
      const el=en.target;
      if(en.isIntersecting){el.classList.add('in')}
      else{el.dataset.from=en.boundingClientRect.top>0?'down':'up';el.classList.remove('in')}
    });
  },{rootMargin:'0px 0px -6% 0px',threshold:0}):null;
  window.observeReveal=function(root){
    (root||document).querySelectorAll('.reveal,.cj').forEach(el=>{
      if(el.dataset.obs)return;el.dataset.obs='1';
      if(!io){el.classList.add('in');return}
      io.observe(el);
    });
  };
  function stagger(){
    document.querySelectorAll('.stagger').forEach(p=>{
      [...p.children].forEach((c,i)=>{if(c.classList.contains('reveal'))c.style.setProperty('--d',(i*0.09)+'s')});
    });
  }

  /* ---------- Contact form ---------- */
  const PREFILL={
    battery:{subject:'Paper request: long-duration battery storage',
      msg:{en:'Hi Nicola, could you send me a copy of your paper "Optimal control and techno-economic analysis of long-duration battery energy storage system applications"? Thank you!',
           it:'Ciao Nicola, potresti inviarmi una copia del tuo paper "Optimal control and techno-economic analysis of long-duration battery energy storage system applications"? Grazie!'}},
    sac:{subject:'Paper request: Soft Actor-Critic energy management',
      msg:{en:'Hi Nicola, could you send me a copy of your paper "Development of a Soft-Actor Critic Reinforcement Learning Algorithm for the Energy Management of a Hybrid Electric Vehicle"? Thank you!',
           it:'Ciao Nicola, potresti inviarmi una copia del tuo paper "Development of a Soft-Actor Critic Reinforcement Learning Algorithm for the Energy Management of a Hybrid Electric Vehicle"? Grazie!'}}
  };
  function prefill(key){
    const f=document.getElementById('contact-form');if(!f||!PREFILL[key])return;
    const p=PREFILL[key];
    f.querySelector('[name=message]').value=I18N.pick(p.msg);
    f.querySelector('[name=_subject]').value=p.subject;
    f.dataset.prefill=key;
  }
  document.addEventListener('click',e=>{
    const a=e.target.closest('[data-prefill]');if(a&&document.getElementById('contact-form'))prefill(a.dataset.prefill);
  });
  document.addEventListener('langchange',()=>{
    const f=document.getElementById('contact-form');
    if(f&&f.dataset.prefill){const m=f.querySelector('[name=message]');
      const cur=m.value,p=PREFILL[f.dataset.prefill];
      if(cur===I18N.s(p.msg,'en')||cur===I18N.s(p.msg,'it'))m.value=I18N.pick(p.msg);}
  });
  function initForm(){
    const f=document.getElementById('contact-form');if(!f)return;
    const st=document.getElementById('form-status'),btn=f.querySelector('button[type=submit]');
    const say=(cls,key,en)=>{st.className='form-status '+cls;st.dataset.key=key;st.dataset.en=en;st.textContent=I18N.t(key,en)};
    document.addEventListener('langchange',()=>{if(st.dataset.key)st.textContent=I18N.t(st.dataset.key,st.dataset.en)});
    const q=new URLSearchParams(location.search).get('prefill');if(q)prefill(q);
    f.addEventListener('submit',async e=>{
      e.preventDefault();
      if(f.action.includes('YOUR_FORM_ID')){say('err','form.todo','The form is not connected yet. Please use LinkedIn for now.');return}
      btn.disabled=true;say('','form.sending','Sending...');
      try{
        const r=await fetch(f.action,{method:'POST',body:new FormData(f),headers:{Accept:'application/json'}});
        if(r.ok){f.reset();delete f.dataset.prefill;say('ok','form.ok',"Message sent. Thank you, I'll get back to you soon!")}
        else say('err','form.err','Something went wrong. Please try again or reach out on LinkedIn.');
      }catch(err){say('err','form.err','Something went wrong. Please try again or reach out on LinkedIn.')}
      btn.disabled=false;
    });
  }

  /* ---------- Go ---------- */
  bindPops();stagger();initForm();
  I18N.init();
  window.observeReveal();
  /* Arriving with #section from another page: keep re-aligning while fonts/images settle, so the target is where it should be */
  if(location.hash.length>1){
    const go=()=>{const t=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(t)t.scrollIntoView({behavior:'instant',block:'start'})};
    let userScrolled=false;
    ['wheel','touchstart','keydown'].forEach(e=>window.addEventListener(e,()=>{userScrolled=true},{once:true,passive:true}));
    const again=()=>{if(!userScrolled)go()};
    go();
    document.addEventListener('DOMContentLoaded',again);
    window.addEventListener('load',again);
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(again);
    setTimeout(again,400);setTimeout(again,1000);
  }
})();
