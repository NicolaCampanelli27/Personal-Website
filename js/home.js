/* Fun facts (main page) */
(function(){
  const facts=['fact.1','fact.2','fact.3','fact.4','fact.5'];
  let i=0;
  const t=document.getElementById('fact-text'),c=document.getElementById('fact-count'),b=document.getElementById('fact-btn');
  function show(){t.textContent=I18N.pick(facts[i]);c.textContent=(i+1)+' / '+facts.length}
  b.addEventListener('click',()=>{i=(i+1)%facts.length;show()});
  document.addEventListener('langchange',show);
  show();
})();
