/* Tiny EN/IT translator.
   ALL texts (English + Italian side by side) live in js/strings.js. The English written in the HTML is only a fallback.
   Mark elements with:
     data-i18n="key"                  -> replaces textContent
     data-i18n-html="key"             -> replaces innerHTML (for text with <b>, <a>...)
     data-i18n-attr="aria-label:key;alt:key2"  -> replaces attributes
   Scripts can call I18N.t(key, englishDefault) or I18N.s('key') or I18N.pick('key'). */
(function(){
  const STORE='nc-lang';
  const I18N={
    lang:'en',
    D(){return window.STRINGS||{}},
    s(key,lang){const e=this.D()[key];if(!e)return key;const l=lang||this.lang;return e[l]!=null?e[l]:(e.en!=null?e.en:key)},
    pick(o){if(o==null)return'';if(typeof o==='string')return this.D()[o]?this.s(o):o;return o[this.lang]||o.en||''},
    t(key,en){const e=this.D()[key];return(e&&e[this.lang]!=null)?e[this.lang]:en},
    apply(root){
      const L=this.lang,d=this.D(),has=k=>d[k]&&d[k][L]!=null,val=k=>d[k][L];
      (root||document).querySelectorAll('[data-i18n],[data-i18n-html],[data-i18n-attr]').forEach(el=>{
        const k=el.getAttribute('data-i18n');
        if(k){
          if(el.dataset.en===undefined)el.dataset.en=el.textContent;
          el.textContent=has(k)?val(k):el.dataset.en;
        }
        const kh=el.getAttribute('data-i18n-html');
        if(kh){
          if(el.dataset.enHtml===undefined)el.dataset.enHtml=el.innerHTML;
          el.innerHTML=has(kh)?val(kh):el.dataset.enHtml;
        }
        const ka=el.getAttribute('data-i18n-attr');
        if(ka)ka.split(';').forEach(pair=>{
          const i=pair.indexOf(':'),a=pair.slice(0,i).trim(),key=pair.slice(i+1).trim(),s='data-en-attr-'+a;
          if(!el.hasAttribute(s))el.setAttribute(s,el.getAttribute(a)||'');
          el.setAttribute(a,has(key)?val(key):el.getAttribute(s));
        });
      });
    },
    set(l,silent){
      this.lang=(l==='it')?'it':'en';
      try{localStorage.setItem(STORE,this.lang)}catch(e){}
      document.documentElement.lang=this.lang;
      this.apply(document);
      document.querySelectorAll('.lang-sw button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===this.lang)));
      if(!silent)document.dispatchEvent(new CustomEvent('langchange',{detail:this.lang}));
    },
    init(){
      let l='en';
      try{l=localStorage.getItem(STORE)||'en'}catch(e){}
      this.set(l,false);
    }
  };
  window.I18N=I18N;
})();
