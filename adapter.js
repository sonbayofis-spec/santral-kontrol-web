/* claude.ai "db"/"user" arayüzünü Firebase (Firestore + Auth) üzerinden sağlar.
   Veri yolu: parks/{sg|ol}/{logs|incidents|photos|settings}/... */
(function(){
  var cfg=window.FIREBASE_CONFIG,P=window.__PARK;
  if(!cfg||!cfg.apiKey||!window.firebase){window.claude={use:async function(){return null}};return}
  firebase.initializeApp(cfg);
  var auth=firebase.auth(),fs=firebase.firestore();
  try{fs.enablePersistence({synchronizeTabs:true}).catch(function(){})}catch(e){}
  if(/[?&]cikis/.test(location.search)){auth.signOut().then(function(){location.replace(location.pathname)})}
  var base=function(){return fs.collection("parks").doc(P)};
  var dbObj={
    collection:function(c){return base().collection(c)},
    doc:function(p){var a=p.split("/");return base().collection(a[0]).doc(a[1])}
  };
  var TX={
    tr:{t:"Giriş yap",e:"E-posta",p:"Şifre",b:"Giriş",bad:"E-posta veya şifre yanlış.",net:"Bağlantı yok. İnternete bağlanıp tekrar dene."},
    ro:{t:"Autentificare",e:"E-mail",p:"Parolă",b:"Intră",bad:"E-mail sau parolă greșită.",net:"Fără conexiune. Conectează-te la internet și încearcă din nou."}
  };
  var lang="tr";try{lang=localStorage.getItem("sk.lang")||"tr"}catch(e){}
  var ov=null;
  function show(){
    if(ov)return;
    ov=document.createElement("div");
    ov.style.cssText="position:fixed;inset:0;z-index:999;color-scheme:light;background:#FBF5EE;display:grid;place-items:center;padding:20px;font-family:'Atkinson Hyperlegible',system-ui,sans-serif;color:#2A1F17";
    function render(){
      var t=TX[lang];
      ov.innerHTML='<form style="width:100%;max-width:380px;display:grid;gap:14px;background:#fff;border-radius:22px;padding:22px;box-shadow:0 6px 24px rgba(60,30,10,.15)">'
       +'<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:22px">'+t.t+'</b>'
       +'<span><button type="button" data-l="tr" style="padding:6px 10px;border-radius:8px;border:2px solid #C2540E;background:'+(lang==="tr"?"#C2540E":"#fff")+';color:'+(lang==="tr"?"#fff":"#C2540E")+';font-weight:800">TR</button> '
       +'<button type="button" data-l="ro" style="padding:6px 10px;border-radius:8px;border:2px solid #C2540E;background:'+(lang==="ro"?"#C2540E":"#fff")+';color:'+(lang==="ro"?"#fff":"#C2540E")+';font-weight:800">RO</button></span></div>'
       +'<label style="display:grid;gap:6px;font-weight:800">'+t.e+'<input name="e" type="email" autocomplete="username" required style="min-height:52px;border-radius:14px;border:2px solid #EADCCB;padding:10px 12px;font-size:17px;background:#fff;color:#2A1F17;-webkit-text-fill-color:#2A1F17;color-scheme:light"></label>'
       +'<label style="display:grid;gap:6px;font-weight:800">'+t.p+'<input name="p" type="password" autocomplete="current-password" required style="min-height:52px;border-radius:14px;border:2px solid #EADCCB;padding:10px 12px;font-size:17px;background:#fff;color:#2A1F17;-webkit-text-fill-color:#2A1F17;color-scheme:light"></label>'
       +'<div id="skerr" style="color:#C23B3B;font-weight:700;min-height:20px"></div>'
       +'<button type="submit" style="min-height:58px;border-radius:16px;background:#C2540E;color:#fff;font-weight:900;font-size:19px">'+t.b+'</button></form>';
      ov.querySelectorAll("[data-l]").forEach(function(b){b.onclick=function(){lang=b.getAttribute("data-l");try{localStorage.setItem("sk.lang",lang)}catch(e){}render()}});
      ov.querySelector("form").onsubmit=function(ev){
        ev.preventDefault();var f=ev.target,er=ov.querySelector("#skerr");er.textContent="";
        auth.signInWithEmailAndPassword(f.e.value.trim(),f.p.value).catch(function(x){
          er.textContent=(x&&x.code==="auth/network-request-failed")?TX[lang].net:TX[lang].bad});
      };
    }
    render();document.body.appendChild(ov);
  }
  function hide(){if(ov){ov.remove();ov=null}}
  var signed=new Promise(function(res){
    auth.onAuthStateChanged(function(u){if(u){hide();res(u)}else{if(document.body)show();else document.addEventListener("DOMContentLoaded",show)}});
  });
  window.claude={use:async function(n){
    if(n==="user")return {can:function(){return true},isOwner:function(){return false}};
    if(n==="db"){await signed;return dbObj}
    return null;
  }};
})();
