/* Quizz : application (joueur + animateur). Dépend de audio.js et scores.js. */
const $=s=>document.querySelector(s),app=$("#app");
const esc=s=>{const d=document.createElement("div");d.textContent=String(s==null?"":s);return d.innerHTML};
const uid=()=>Math.random().toString(36).slice(2,10);
const clone=o=>JSON.parse(JSON.stringify(o));
const ord=n=>n+(n===1?"er":"e");
async function api(path,body){
  const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body||{})});
  let d={};try{d=await r.json()}catch(e){}
  if(!r.ok)throw Object.assign(new Error(d.error||"Erreur"),{status:r.status});
  return d;
}
const store={
  get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},
  del(k){try{localStorage.removeItem(k)}catch(e){}}
};
const ADJ=["Rapide","Malin","Joyeux","Curieux","Rusé","Zen","Cosmique","Rigolo","Brave","Furtif","Géant","Mystique","Épique","Pétillant","Agile","Sage","Turbo","Fou","Doux","Légendaire"];
const ANI=["Panda","Renard","Koala","Dauphin","Hibou","Lynx","Tigre","Pingouin","Lama","Castor","Faucon","Otarie","Écureuil","Dragon","Hérisson","Zèbre","Phoque","Lapin","Ours","Chouette"];
const pick=a=>a[Math.floor(Math.random()*a.length)];
const randPseudo=()=>pick(ANI)+" "+pick(ADJ);
const SH=['<svg viewBox="0 0 24 24"><path d="M12 3 22 21H2z"/></svg>','<svg viewBox="0 0 24 24"><path d="M12 1 23 12 12 23 1 12z"/></svg>','<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>','<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="1"/></svg>'];
const TYPES={qcm:"Choix multiples (4 réponses)",tf:"Vrai ou faux",num:"Estimation (un nombre)",word:"Réponse libre (nuage de mots)",idea:"Idées puis vote (en %)"};
const DEF=[
{t:"qcm",q:"Quelle est la capitale de l’Australie ?",a:["Sydney","Canberra","Melbourne","Perth"],c:1},
{t:"tf",q:"La Terre tourne autour du Soleil.",c:0},
{t:"qcm",q:"Qui a peint La Joconde ?",a:["Michel-Ange","Raphaël","Léonard de Vinci","Botticelli"],c:2},
{t:"num",q:"En quelle année a eu lieu la prise de la Bastille ?",c:1789},
{t:"word",q:"En un mot, quel est ton plat préféré ?"},
{t:"tf",q:"Le mont Blanc est le plus haut sommet d’Afrique.",c:1},
{t:"qcm",q:"Quelle planète est surnommée la planète rouge ?",a:["Vénus","Jupiter","Mars","Mercure"],c:2},
{t:"idea",q:"Quelle activité proposer pour la prochaine sortie ?"},
{t:"qcm",q:"Quel pays a offert la statue de la Liberté aux États-Unis ?",a:["Royaume-Uni","Espagne","Italie","France"],c:3}
];
let LIB=store.get("qk-quizzes");
if(!Array.isArray(LIB)){LIB=[{id:uid(),title:"Culture générale",qs:DEF,t:Date.now()}];store.set("qk-quizzes",LIB)}
const saveLib=()=>store.set("qk-quizzes",LIB);
let CFG={host:location.host},ES=null,H=null,HK="",HS=null,PS=null,PK="",PINFO=null,tEnd=0,tk=null;
const logo=()=>'<div class="logo"><span aria-hidden="true">🏙️</span><img src="/logo.png" alt="Logo de la ville" onerror="this.remove()"></div>';
const logoSm=()=>'<div class="logo sm"><span aria-hidden="true">🏙️</span><img src="/logo.png" alt="Logo de la ville" onerror="this.remove()"></div>';
function closeAll(){
  if(ES)ES.close();ES=null;clearInterval(tk);H=null;HK="";HS=null;PS=null;PK="";
  QKAudio.stop();
  ["dock","pp"].forEach(i=>{const e=document.getElementById(i);if(e)e.remove()});
}
function pressable(){document.addEventListener("touchstart",()=>{},{passive:true})}

/* ================= PAGE JOUEUR : rejoindre ================= */
function home(msg){
  closeAll();
  const j=new URLSearchParams(location.search).get("j")||"";
  app.innerHTML='<div class="center" style="padding-top:3vh">'+logo()+'<h1 class="brand">Quizz</h1><h2 class="sub">Espace joueur</h2><div class="lcard"><input id="c" inputmode="numeric" maxlength="5" autocomplete="off" placeholder="Code" aria-label="Code de la partie"><div class="row"><input id="n" maxlength="14" autocomplete="off" placeholder="Votre pseudo" aria-label="Votre pseudo"><button class="dice" id="dc" type="button" title="Pseudo aléatoire" aria-label="Générer un pseudo aléatoire">🎲</button></div><button class="btn full" id="go">Jouer !</button><p class="err" id="er">'+esc(msg||"")+'</p></div><button class="lnk" id="hb">Espace animateur</button></div>';
  $("#c").value=j;
  $("#dc").onclick=()=>{$("#n").value=randPseudo();$("#n").focus()};
  let busy=false;
  const go=async()=>{
    if(busy)return;
    const er=t=>$("#er").textContent=t,code=$("#c").value.trim(),name=$("#n").value.trim();
    if(!/^\d{5}$/.test(code))return er("Saisissez le code à 5 chiffres.");
    if(!name)return er("Saisissez un pseudo, ou lancez le dé 🎲.");
    busy=true;const b=$("#go");b.classList.add("wait");b.textContent="Connexion…";er("");
    try{
      const d=await api("/api/join",{code,name});
      PINFO={code,pid:d.pid,name:d.name};store.set("qk-p",PINFO);play();
    }catch(e){busy=false;b.classList.remove("wait");b.textContent="Jouer !";er(e.message)}
  };
  $("#go").onclick=go;
  app.querySelectorAll("input").forEach(i=>i.onkeydown=e=>{if(e.key==="Enter")go()});
  (j?$("#n"):$("#c")).focus();
  $("#hb").onclick=async()=>{let ok=false;try{ok=(await(await fetch("/api/me")).json()).ok}catch(e){}ok?library():login()};
}

/* ================= JOUEUR : partie ================= */
function play(){
  closeAll();
  app.innerHTML='<div class="center" style="padding-top:12vh"><h1>Quizz</h1><p>Connexion…</p></div>';
  ES=new EventSource("/api/events?role=play&code="+PINFO.code+"&pid="+PINFO.pid);
  ES.onmessage=e=>pRender(JSON.parse(e.data));
  ES.onerror=()=>{if(ES&&ES.readyState===2){store.del("qk-p");home("Cette partie n’existe plus.")}};
}
function pRender(s){
  PS=s;tEnd=Date.now()+(s.rem||0);
  if(s.me&&s.ph!=="lobby")QKScores.saveMine(PINFO.code,s.name,s.me[0],s.me[2]);
  const k=s.ph+":"+s.qi+":"+(s.done?"a":"n");
  if(k!==PK){PK=k;pFull(s)}else if(s.ph==="q"&&(s.t==="word"||s.t==="idea"))drawSent(s);
}
function drawSent(s){
  const e=$("#sent");if(!e)return;
  const max=s.t==="word"?3:5;
  e.textContent=s.subs.length?"Envoyé : "+s.subs.join(", ")+" ("+s.subs.length+"/"+max+")":"";
}
function pFull(s){
  clearInterval(tk);
  const head='<div class="tb" style="justify-content:center">'+logoSm()+'<span class="bt">Quizz</span></div>';
  const w=h=>{app.innerHTML='<div class="center phone">'+head+h+"</div>"};
  const bar='<div class="bar"><i id="bar"></i></div>';
  const tick=()=>{tk=setInterval(()=>{const b=$("#bar");if(b)b.style.transform="scaleX("+Math.max(0,(tEnd-Date.now())/(s.dur*1000))+")"},200)};
  const rankLine=()=>{const m=s.me||[0,0,0];return '<p style="margin-top:18px">Vous êtes '+ord(m[2])+" avec "+m[0]+" points</p>"};
  if(s.ph==="lobby")return w("<h1>"+esc(s.name)+"</h1><p>Vous êtes dans la partie ! Regardez l’écran.</p>");
  if(s.ph==="q"){
    const send=(body)=>api("/api/answer",Object.assign({code:PINFO.code,pid:PINFO.pid,qi:s.qi},body));
    if((s.t==="qcm"||s.t==="tf"||s.t==="num")&&s.done)return w('<div class="card res"><p class="big" style="color:#1e1b4b">Réponse envoyée</p><p>Regardez l’écran.</p></div>');
    if(s.t==="qcm"){
      w(bar+'<div class="grid">'+[0,1,2,3].map(k=>'<button class="ans c'+k+'" data-k="'+k+'" aria-label="Réponse '+(k+1)+'">'+SH[k]+"</button>").join("")+"</div>");
    }else if(s.t==="tf"){
      w(bar+'<div class="grid two"><button class="ans c3" data-k="0">✔ Vrai</button><button class="ans c0" data-k="1">✖ Faux</button></div>');
    }
    if(s.t==="qcm"||s.t==="tf"){
      app.querySelectorAll("button.ans").forEach(b=>b.onclick=()=>{
        const k=+b.dataset.k;PS.done=true;PK=PS.ph+":"+PS.qi+":a";pFull(PS);send({k}).catch(()=>{});
      });
      return tick();
    }
    if(s.t==="num"){
      w(bar+'<div class="card"><p>Votre réponse (un nombre)</p><input id="v" type="number" inputmode="decimal" step="any" aria-label="Votre réponse"><button class="btn full" id="sd">Envoyer</button><p class="err" id="er"></p></div>');
      const go=async()=>{
        const v=$("#v").value;if(v==="")return $("#er").textContent="Saisissez un nombre.";
        PS.done=true;PK=PS.ph+":"+PS.qi+":a";send({v}).catch(()=>{});pFull(PS);
      };
      $("#sd").onclick=go;$("#v").onkeydown=e=>{if(e.key==="Enter")go()};$("#v").focus();
      return tick();
    }
    const max=s.t==="word"?3:5;
    w(bar+'<div class="card"><p>'+(s.t==="word"?"Écrivez un mot ou une courte réponse":"Écrivez votre idée (vous pouvez en proposer plusieurs)")+'</p><input id="tx" maxlength="'+(s.t==="word"?24:60)+'" autocomplete="off" aria-label="Votre réponse"><button class="btn full" id="sd">Envoyer</button><p class="err" id="er"></p></div><p class="sent" id="sent"></p>');
    const go=async()=>{
      const el=$("#tx"),text=el.value.trim();if(!text)return;
      if(PS.subs.length>=max)return $("#er").textContent="Maximum atteint ("+max+").";
      try{
        const d=await send({text});
        if(d.ok){PS.subs.push(text);el.value="";$("#er").textContent=""}else $("#er").textContent="Déjà proposé ou maximum atteint.";
      }catch(e){$("#er").textContent="Envoi impossible."}
      drawSent(PS);el.focus();
    };
    $("#sd").onclick=go;$("#tx").onkeydown=e=>{if(e.key==="Enter")go()};$("#tx").focus();drawSent(s);
    return tick();
  }
  if(s.ph==="v"){
    if(s.done)return w('<div class="card res"><p class="big" style="color:#1e1b4b">Vote envoyé</p><p>Regardez l’écran.</p></div>');
    w(bar+"<h2>Votez pour votre idée préférée</h2>"+'<div class="vote">'+(s.ideas||[]).map((t,i)=>'<button data-i="'+i+'">'+esc(t)+"</button>").join("")+"</div>");
    app.querySelectorAll(".vote button").forEach(b=>b.onclick=()=>{
      const i=+b.dataset.i;PS.done=true;PK=PS.ph+":"+PS.qi+":a";pFull(PS);
      api("/api/answer",{code:PINFO.code,pid:PINFO.pid,qi:s.qi,i}).catch(()=>{});
    });
    return tick();
  }
  if(s.ph==="r"){
    const r=s.res||{};
    if(r.ok===null||s.t==="word"||s.t==="idea")return w('<div class="card res neu"><p class="big">Merci !</p><p>Regardez l’écran pour les résultats.</p></div>'+rankLine());
    const sub=s.t==="num"?(r.v===null?"Pas de réponse":"Votre réponse : "+r.v+" · Bonne réponse : "+s.c):(r.ok?"+"+r.pts+" points":"");
    return w('<div class="card res '+(r.ok?"ok":"ko")+'"><p class="big">'+(s.k===null&&r.v==null?"Temps écoulé":r.ok?"Bonne réponse":s.t==="num"?"Presque !":"Raté")+"</p><p>"+esc(sub)+(s.t==="num"&&r.pts?" (+"+r.pts+" points)":"")+"</p></div>"+rankLine());
  }
  if(s.ph==="lb")return w("<h1>Classement</h1><p>Regardez l’écran.</p>"+rankLine());
  const m=s.me||[0,0,0];
  w('<h1>Terminé !</h1><div class="card"><h2>'+ord(m[2])+"</h2><p>"+m[0]+" points</p></div><p>Merci d’avoir joué !</p>");
}

/* ================= ESPACE ANIMATEUR : connexion ================= */
function login(msg){
  closeAll();
  app.innerHTML='<div class="center" style="padding-top:3vh">'+logo()+'<h1 class="brand">Quizz</h1><h2 class="sub">Espace animateur</h2><div class="lcard"><div class="lh"><span aria-hidden="true">🔒</span><h2>Connexion</h2></div><p>Entrez le mot de passe animateur pour accéder à l’espace.</p><input id="u" autocomplete="username" maxlength="30" placeholder="Identifiant" aria-label="Identifiant"><input id="p" type="password" autocomplete="current-password" placeholder="Mot de passe" aria-label="Mot de passe"><button class="btn full" id="ok">Se connecter</button><p class="err" id="er">'+esc(msg||"")+'</p></div><button class="lnk" id="jn">Rejoindre une partie</button></div>';
  let busy=false;
  const go=async()=>{
    if(busy)return;busy=true;
    const b=$("#ok");b.classList.add("wait");b.textContent="Connexion…";$("#er").textContent="";
    try{await api("/api/login",{u:$("#u").value,p:$("#p").value});library()}
    catch(e){busy=false;b.classList.remove("wait");b.textContent="Se connecter";$("#er").textContent=e.message}
  };
  $("#ok").onclick=go;
  app.querySelectorAll("input").forEach(i=>i.onkeydown=e=>{if(e.key==="Enter")go()});
  $("#jn").onclick=()=>home();
  $("#u").focus();
}

/* ================= BIBLIOTHÈQUE ET ÉDITEUR ================= */
const blankQ=()=>({t:"qcm",q:"",a:["","","",""],c:0});
function library(msg){
  closeAll();
  app.innerHTML='<div class="tb">'+logoSm()+'<span class="bt">Quizz</span><span style="flex:1"></span><button class="btn sm" id="lo">Se déconnecter</button></div><h1>Mes quiz</h1><p>Vos quiz sont enregistrés dans ce navigateur.</p><p class="err" id="er" style="color:#fecaca!important">'+esc(msg||"")+'</p><div id="ql"></div><button class="btn" id="nw">Nouveau quiz</button><br><button class="lnk" id="bk">← Espace joueur</button>';
  $("#bk").onclick=()=>home();
  $("#lo").onclick=async()=>{try{await api("/api/logout")}catch(e){}home()};
  $("#nw").onclick=()=>editor({title:"",qs:[blankQ()]});
  const el=$("#ql");
  if(!LIB.length){el.innerHTML='<div class="card center"><p>Aucun quiz pour le moment.</p></div>';return}
  LIB.sort((a,b)=>(b.t||0)-(a.t||0));
  el.innerHTML=LIB.map((q,i)=>'<div class="card qrow"><div><h2>'+esc(q.title||"Sans titre")+"</h2><p>"+q.qs.length+' questions</p></div><div class="acts"><button class="btn" data-a="go" data-i="'+i+'">Lancer</button><button class="btn sec" data-a="ed" data-i="'+i+'">Modifier</button><button class="btn sec" data-a="rm" data-i="'+i+'">Supprimer</button></div></div>').join("");
  el.querySelectorAll("button[data-a]").forEach(b=>b.onclick=()=>{
    const q=LIB[+b.dataset.i],a=b.dataset.a;
    if(a==="go")launch(q);else if(a==="ed")editor(q);
    else if(b.dataset.s){LIB=LIB.filter(x=>x.id!==q.id);saveLib();library()}
    else{b.dataset.s=1;b.textContent="Confirmer ?"}
  });
}
function editor(q){
  closeAll();
  const D={id:q.id,title:q.title||"",qs:clone(q.qs||[])};
  D.qs.forEach(x=>{if(!x.t)x.t="qcm";if(x.t==="qcm"&&!x.a)x.a=["","","",""]});
  if(!D.qs.length)D.qs.push(blankQ());
  const body=(x,i)=>{
    if(x.t==="qcm")return "<p>Cochez la bonne réponse.</p>"+[0,1,2,3].map(k=>'<label class="opt c'+k+'"><input type="radio" name="r'+i+'" data-i="'+i+'" data-k="'+k+'" aria-label="Bonne réponse : option '+(k+1)+'">'+SH[k]+'<input class="oi" data-i="'+i+'" data-k="'+k+'" maxlength="80" placeholder="Réponse '+(k+1)+'" aria-label="Réponse '+(k+1)+'"></label>').join("");
    if(x.t==="tf")return '<p>Quelle est la bonne réponse ?</p><div class="tfo"><label class="c3"><input type="radio" name="r'+i+'" data-tf="'+i+'" value="0">✔ Vrai</label><label class="c0"><input type="radio" name="r'+i+'" data-tf="'+i+'" value="1">✖ Faux</label></div>';
    if(x.t==="num")return '<p>Les joueurs devinent un nombre : le plus proche gagne le plus de points.</p><input class="ni" data-i="'+i+'" type="number" step="any" placeholder="Bonne réponse (nombre)" aria-label="Bonne réponse (nombre)">';
    if(x.t==="word")return "<p>Les joueurs écrivent un mot : les mots les plus donnés grossissent à l’écran.</p>";
    return "<p>Les joueurs proposent des idées (plusieurs possibles), puis votent. Résultat en pourcentage.</p>";
  };
  const draw=()=>{
    app.innerHTML='<div class="tb"><button class="btn sm" id="bk">← Mes quiz</button></div><div class="card"><label for="tt"><h2>Titre du quiz</h2></label><input id="tt" maxlength="60" placeholder="Ex. Histoire de France"></div>'+
    D.qs.map((x,i)=>'<div class="card eq"><div class="qrow" style="margin:0"><h2>Question '+(i+1)+'</h2><button class="lnk" data-rm="'+i+'" style="margin:0">Supprimer</button></div><select data-ty="'+i+'" aria-label="Type de la question '+(i+1)+'">'+Object.keys(TYPES).map(k=>'<option value="'+k+'"'+(x.t===k?" selected":"")+">"+TYPES[k]+"</option>").join("")+'</select><input class="qi" data-i="'+i+'" maxlength="140" placeholder="Écrivez la question" aria-label="Question '+(i+1)+'">'+body(x,i)+"</div>").join("")+
    '<div class="center"><button class="btn sec" id="aq"'+(D.qs.length>=50?" disabled":"")+'>Ajouter une question</button><p class="err" id="er" style="color:#fecaca!important"></p><button class="btn" id="sv">Enregistrer</button></div>';
    $("#tt").value=D.title;$("#tt").oninput=e=>D.title=e.target.value;
    app.querySelectorAll(".qi").forEach(e=>{e.value=D.qs[+e.dataset.i].q;e.oninput=()=>D.qs[+e.dataset.i].q=e.value});
    app.querySelectorAll(".oi").forEach(e=>{e.value=D.qs[+e.dataset.i].a[+e.dataset.k];e.oninput=()=>D.qs[+e.dataset.i].a[+e.dataset.k]=e.value});
    app.querySelectorAll("input[data-k][type=radio]").forEach(e=>{e.checked=D.qs[+e.dataset.i].c===+e.dataset.k;e.onchange=()=>D.qs[+e.dataset.i].c=+e.dataset.k});
    app.querySelectorAll("input[data-tf]").forEach(e=>{e.checked=D.qs[+e.dataset.tf].c===+e.value;e.onchange=()=>D.qs[+e.dataset.tf].c=+e.value});
    app.querySelectorAll(".ni").forEach(e=>{const v=D.qs[+e.dataset.i].c;e.value=v===undefined||v===""?"":v;e.oninput=()=>D.qs[+e.dataset.i].c=e.value});
    app.querySelectorAll("select[data-ty]").forEach(e=>e.onchange=()=>{
      const x=D.qs[+e.dataset.ty],t=e.value;x.t=t;
      if(t==="qcm"){x.a=["","","",""];x.c=0}else if(t==="tf"){delete x.a;x.c=0}else if(t==="num"){delete x.a;x.c=""}else{delete x.a;delete x.c}
      draw();
    });
    app.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{D.qs.splice(+b.dataset.rm,1);if(!D.qs.length)D.qs.push(blankQ());draw()});
    $("#aq").onclick=()=>{D.qs.push(blankQ());draw();window.scrollTo(0,document.body.scrollHeight)};
    $("#bk").onclick=()=>library();
    $("#sv").onclick=()=>{
      const bad=D.qs.findIndex(x=>!x.q.trim()||(x.t==="qcm"&&x.a.some(t=>!t.trim()))||(x.t==="num"&&!Number.isFinite(Number(x.c))||(x.t==="num"&&x.c==="")));
      if(bad>=0)return $("#er").textContent="La question "+(bad+1)+" est incomplète.";
      const qs=D.qs.map(x=>{
        const o={t:x.t,q:x.q.trim()};
        if(x.t==="qcm"){o.a=x.a.map(t=>t.trim());o.c=x.c}else if(x.t==="tf")o.c=x.c;else if(x.t==="num")o.c=Number(x.c);
        return o;
      });
      const data={id:D.id||uid(),title:D.title.trim()||"Sans titre",qs,t:Date.now()};
      LIB=LIB.filter(x=>x.id!==data.id).concat(data);saveLib();library();
    };
  };
  draw();
}

/* ================= ANIMATEUR : partie en direct ================= */
async function launch(q){
  QKAudio.unlock();
  try{
    const d=await api("/api/game",{qs:q.qs,title:q.title});
    closeAll();H={code:d.code,key:d.key,title:q.title};
    ES=new EventSource("/api/events?role=host&code="+d.code+"&key="+d.key);
    ES.onmessage=e=>hRender(JSON.parse(e.data));
    ES.onerror=()=>{if(ES&&ES.readyState===2)library("La partie n’existe plus.")};
  }catch(e){e.status===401?login("Session expirée, reconnectez-vous."):library(e.message)}
}
const act=(a,extra)=>api("/api/action",Object.assign({code:H.code,key:H.key,a},extra||{})).catch(()=>{});
function hRender(h){
  HS=h;tEnd=Date.now()+(h.rem||0);
  const k=h.ph+":"+h.qi;
  if(k!==HK){HK=k;hFull(h)}else hPart(h);
  drawDock(h);
}
function drawDock(h){
  let d=document.getElementById("dock");
  if(!d){
    d=document.createElement("div");d.id="dock";
    d.innerHTML='<button class="dk" id="dj" aria-expanded="false">👥 Joueurs</button><button class="dk" id="dm"></button>';
    document.body.appendChild(d);
    const pp=document.createElement("div");pp.id="pp";pp.hidden=true;document.body.appendChild(pp);
    $("#dj").onclick=()=>{pp.hidden=!pp.hidden;$("#dj").setAttribute("aria-expanded",String(!pp.hidden));drawDock(HS)};
    $("#dm").onclick=()=>{QKAudio.unlock();QKAudio.setMuted(!QKAudio.isMuted());drawDock(HS)};
  }
  $("#dm").textContent=QKAudio.isMuted()?"🔇 Musique coupée":"🔊 Musique";
  const pp=$("#pp");
  if(h&&!pp.hidden)pp.innerHTML="<h3>Joueurs connectés ("+h.np+")</h3>"+(h.players.length?h.players.map(n=>"<span>"+esc(n)+"</span>").join(""):"<p>Personne pour le moment.</p>");
}
function shell(inner,withEnd){
  return '<div class="tb">'+logoSm()+'<span class="bt">Quizz</span>'+(withEnd===false?"":'<button class="btn sm" id="endg">Terminer la partie</button>')+"</div>"+inner;
}
function bindShell(){
  const b=$("#endg");if(!b)return;
  b.onclick=()=>{if(b.dataset.s)act("end");else{b.dataset.s=1;b.textContent="Confirmer ?";setTimeout(()=>{if(b.isConnected){delete b.dataset.s;b.textContent="Terminer la partie"}},4000)}};
}
const plural=(n,w)=>n+" "+w+(n>1?"s":"");
function tiles(h,dist,c){
  const tf=h.t==="tf";
  return '<div class="grid hostg">'+h.q.a.map((t,k)=>'<div class="ans '+(tf?(k===0?"c3":"c0"):"c"+k)+(dist&&k!==c?" dim":"")+'">'+(tf?(k===0?"✔":"✖"):SH[k])+"<span>"+(tf?"":"")+esc(t)+"</span>"+(dist?"<b>"+dist[k]+"</b>":"")+"</div>").join("")+"</div>";
}
const rank=(l,o=0)=>'<ul class="rank">'+l.map((t,i)=>"<li><span>"+(i+1+o)+". "+esc(t[0])+"</span><span>"+t[1]+"</span></li>").join("")+"</ul>";
const COL=["#e21b3c","#1368ce","#b45309","#26890c","#7c3aed","#be185d","#0f766e"];
const hash=s=>{let n=0;for(const c of String(s))n=(n*31+c.charCodeAt(0))>>>0;return n};
function drawCloud(list){
  const el=$("#cloud");if(!el)return;
  if(!list||!list.length){el.innerHTML="<p>En attente des réponses…</p>";return}
  const mx=Math.max(...list.map(x=>x[1])),span=Math.min(3,mx*.6);
  el.innerHTML=list.map(([w,n])=>'<span style="font-size:'+(1.3+span*n/mx).toFixed(2)+"rem;color:"+COL[hash(w)%COL.length]+'">'+esc(w)+"</span>").join("");
}
function drawIdeas(list){
  const el=$("#ideas");if(!el)return;
  el.innerHTML=list&&list.length?list.map(t=>'<div class="idea">'+esc(t)+"</div>").join(""):"<p>En attente des idées…</p>";
}
function hPart(h){
  if(h.ph==="lobby"){
    const n=$("#np"),b=$("#st"),f=$("#fn");
    if(n)n.textContent=plural(h.np,"joueur")+" connecté"+(h.np>1?"s":"");
    if(b)b.disabled=!h.np;
    if(f&&f.checked!==h.funny)f.checked=h.funny;
    if(h.np>(hPart.last||0))QKAudio.jingle("join");
    hPart.last=h.np;
  }
  if(h.ph==="q"||h.ph==="v"){
    const c=$("#cnt");if(c)c.textContent=plural(h.answered,h.ph==="v"?"vote":"réponse");
    if(h.t==="word")drawCloud(h.cloud);
    if(h.t==="idea")drawIdeas(h.ideas);
  }
}
function startTick(h){
  tk=setInterval(()=>{const l=Math.max(0,tEnd-Date.now()),t=$("#tm"),b=$("#bar");if(t)t.textContent=Math.ceil(l/1000);if(b)b.style.transform="scaleX("+l/(h.dur*1000)+")"},200);
}
function hFull(h){
  clearInterval(tk);
  const counter='<span class="pill">'+(h.qi+1)+" / "+h.n+"</span>";
  if(h.ph==="lobby"){
    hPart.last=0;QKAudio.play("lobby");
    const url=location.origin+"/?j="+H.code;
    app.innerHTML=shell('<h1 class="qt">'+esc(H.title||"Quizz")+'</h1><div class="lob"><div id="qr"></div><div class="join"><h2>Rejoignez sur <b>'+esc(CFG.host)+'</b></h2><div class="codebox"><small>Code de la partie :</small><b>'+H.code+'</b></div></div></div><span class="np" id="np"></span><label class="chk"><input type="checkbox" id="fn"> Pseudos amusants imposés (pour les prochains arrivants)</label><div class="center"><button class="btn startb" id="st"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>Démarrer</button></div>');
    try{new QRCode($("#qr"),{text:url,width:190,height:190})}catch(e){$("#qr").textContent=url}
    $("#st").onclick=()=>{QKAudio.unlock();act("start")};
    $("#fn").onchange=e=>act("funny",{on:e.target.checked});
    bindShell();hPart(h);return;
  }
  if(h.ph==="q"||h.ph==="v"){
    QKAudio.play("suspense",()=>Math.max(0,tEnd-Date.now())/(h.dur*1000));
    let main="";
    if(h.ph==="v")main='<div class="card q"><h2>'+esc(h.q.q)+'</h2><p>Votez pour votre idée préférée sur votre téléphone</p></div><div class="ideas" id="ideas"></div>';
    else if(h.t==="qcm"||h.t==="tf")main='<div class="card q"><h2>'+esc(h.q.q)+"</h2></div>"+tiles(h);
    else if(h.t==="num")main='<div class="card q"><h2>'+esc(h.q.q)+'</h2><p>Saisissez un nombre sur votre téléphone</p></div>';
    else if(h.t==="word")main='<div class="card q"><h2>'+esc(h.q.q)+'</h2></div><div class="card cloud" id="cloud"></div>';
    else main='<div class="card q"><h2>'+esc(h.q.q)+'</h2><p>Proposez vos idées sur votre téléphone</p></div><div class="ideas" id="ideas"></div>';
    app.innerHTML=shell('<div class="pills">'+counter+'<span class="pill" id="tm">'+Math.ceil(h.dur)+'</span><span class="pill" id="cnt"></span></div><div class="bar"><i id="bar"></i></div>'+main+'<div class="center"><button class="btn sec" id="sk">Passer</button></div>');
    $("#sk").onclick=()=>act("skip");bindShell();hPart(h);startTick(h);return;
  }
  if(h.ph==="r"){
    QKAudio.jingle("reveal");
    let main="";
    if(h.t==="qcm"||h.t==="tf")main=tiles(h,h.dist,h.c);
    else if(h.t==="num")main='<div class="card q"><p>Bonne réponse</p><p class="numv">'+esc(h.num?h.num.c:h.c)+"</p>"+(h.num&&h.num.top.length?"<p>Les plus proches : "+h.num.top.map(x=>esc(x[0])+" ("+esc(x[1])+")").join(", ")+"</p>":"<p>Personne n’a répondu.</p>")+"</div>";
    else if(h.t==="word")main='<div class="card cloud" id="cloud"></div>';
    else main='<div class="ideas">'+(h.ires&&h.ires.length?h.ires.map(x=>'<div class="pbar"><i style="width:'+x[3]+'%"></i><span>'+esc(x[0])+"</span><span>"+x[3]+" % ("+x[2]+")</span></div>").join(""):"<p>Aucune idée proposée.</p>")+"</div>";
    app.innerHTML=shell('<div class="pills">'+counter+'</div><div class="card q"><h2>'+esc(h.q.q)+"</h2></div>"+main+'<div class="center"><button class="btn" id="bd">Classement</button></div>');
    if(h.t==="word")drawCloud(h.cloud);
    $("#bd").onclick=()=>act("board");bindShell();return;
  }
  if(h.ph==="lb"){
    QKAudio.jingle("board");
    app.innerHTML=shell('<div class="pills">'+counter+'</div><h1 class="qt">Classement</h1>'+(h.top.length?rank(h.top):"<p>Aucun joueur.</p>")+'<div class="center"><button class="btn" id="nx">'+(h.qi<h.n-1?"Question suivante":"Résultats finaux")+"</button></div>");
    $("#nx").onclick=()=>act("next");bindShell();return;
  }
  /* fin de partie */
  QKAudio.fanfare();
  const f=h.final||{ranking:[],log:[]},t=f.ranking.map(p=>[p.name,p.score]);
  QKScores.saveGame(H.code,H.title,f);
  const pod=(p,c)=>p?'<div class="'+c+'"><span>'+esc(p[0])+"</span><small>"+p[1]+"</small></div>":"<div></div>";
  app.innerHTML=shell('<h1 class="qt">Classement final</h1><div class="pod">'+pod(t[1],"p2")+pod(t[0],"p1")+pod(t[2],"p3")+"</div>"+(t.length>3?rank(t.slice(3,10),3):"")+'<div class="exp"><button class="btn blue" id="e1">⬇ Classement (CSV)</button><button class="btn blue" id="e2">⬇ Résultats par question (CSV)</button><button class="btn" id="e3">Nouvelle partie</button></div><div class="center"><button class="lnk" id="lib">Mes quiz</button></div>',false);
  $("#e1").onclick=()=>QKScores.download("classement-"+QKScores.stamp()+".csv",QKScores.rankingCSV(f));
  $("#e2").onclick=()=>QKScores.download("resultats-par-question-"+QKScores.stamp()+".csv",QKScores.questionsCSV(f));
  $("#e3").onclick=()=>act("restart");
  $("#lib").onclick=()=>library();
}

/* ================= DÉMARRAGE ================= */
pressable();
(async()=>{
  try{CFG=await(await fetch("/api/config")).json()}catch(e){}
  const sp=store.get("qk-p"),j=new URLSearchParams(location.search).get("j");
  if(sp&&sp.code&&sp.pid&&(!j||j===sp.code)){PINFO=sp;play()}else home();
})();
