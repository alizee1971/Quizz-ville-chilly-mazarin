"use strict";
// Quizz : serveur de jeu sans aucune dépendance (Node 18+).
const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto");
const PORT=process.env.PORT||3000;
const USER=String(process.env.ADMIN_USER||"admin").trim().toLowerCase();
const PASS=String(process.env.ADMIN_PASS||"QuizzKahoottest");
const PUBLIC_HOST=String(process.env.PUBLIC_HOST||"quizz.ville-chilly-mazarin.fr");
const SECRET=crypto.createHash("sha256").update("qk|"+USER+"|"+PASS).digest();
const DUR={qcm:20,tf:15,num:25,word:40,idea:60,vote:25};
const TYPES=["qcm","tf","num","word","idea"];
const games=new Map(),fails=new Map();
const ADJ=["Rapide","Malin","Joyeux","Curieux","Rusé","Zen","Cosmique","Rigolo","Brave","Furtif","Géant","Mystique","Épique","Pétillant","Agile","Sage","Turbo","Fou","Doux","Légendaire"];
const ANI=["Panda","Renard","Koala","Dauphin","Hibou","Lynx","Tigre","Pingouin","Lama","Castor","Faucon","Otarie","Écureuil","Dragon","Hérisson","Zèbre","Phoque","Lapin","Ours","Chouette"];
const pick=a=>a[Math.floor(Math.random()*a.length)];

const hmac=s=>crypto.createHmac("sha256",SECRET).update(s).digest("hex");
const mkToken=()=>{const e=Date.now()+30*864e5;return e+"."+hmac(String(e))};
const okToken=t=>{t=String(t||"");const i=t.indexOf(".");if(i<1)return false;const e=t.slice(0,i),h=t.slice(i+1),x=hmac(e);return h.length===x.length&&crypto.timingSafeEqual(Buffer.from(h),Buffer.from(x))&&Date.now()<+e};
const sha=s=>crypto.createHash("sha256").update(String(s)).digest();
const eq=(a,b)=>crypto.timingSafeEqual(sha(a),sha(b));
const authed=req=>{const m=/(?:^|;\s*)qk=([^;]+)/.exec(req.headers.cookie||"");return !!m&&okToken(m[1])};
const json=(res,c,o,h)=>{res.writeHead(c,Object.assign({"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"},h));res.end(JSON.stringify(o))};
const readBody=req=>new Promise(r=>{let b="";req.on("data",c=>{b+=c;if(b.length>4e5)req.destroy()});req.on("end",()=>{try{r(JSON.parse(b||"{}"))}catch(e){r({})}});req.on("error",()=>r({}))});
const clean=(s,n=14)=>String(s==null?"":s).replace(/[\u0000-\u001f<>]/g,"").replace(/\s+/g," ").trim().slice(0,n);
const norm=s=>String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g,"").trim();

function cleanQs(a){
  if(!Array.isArray(a)||!a.length||a.length>50)return null;
  const o=[];
  for(const x of a){
    if(!x||typeof x.q!=="string")return null;
    const t=TYPES.includes(x.t)?x.t:"qcm",q=x.q.slice(0,200);
    if(t==="qcm"){
      if(!Array.isArray(x.a)||x.a.length!==4||!x.a.every(s=>typeof s==="string")||!(x.c>=0&&x.c<=3))return null;
      o.push({t,q,a:x.a.map(s=>s.slice(0,100)),c:x.c|0});
    }else if(t==="tf"){
      if(!(x.c===0||x.c===1))return null;
      o.push({t,q,a:["Vrai","Faux"],c:x.c});
    }else if(t==="num"){
      const c=Number(x.c);if(x.c===""||x.c==null||!Number.isFinite(c)||Math.abs(c)>1e9)return null;
      o.push({t,q,c});
    }else o.push({t,q});
  }
  return o;
}
function funny(g){
  const used=new Set([...g.players.values()].map(p=>p.name));
  for(let i=0;i<30;i++){const n=pick(ANI)+" "+pick(ADJ);if(!used.has(n))return n}
  return pick(ANI)+" "+pick(ADJ)+" "+(1+Math.floor(Math.random()*99));
}
const cur=g=>g.qs[g.qi];
const ranked=g=>[...g.players.entries()].sort((a,b)=>b[1].score-a[1].score);
const remMs=g=>(g.ph==="q"||g.ph==="v")?Math.max(0,g.dur-(Date.now()-g.t0)):0;
const doneOf=(g,p)=>g.ph==="v"?p.voted!==null:(g.ph==="q"&&g.qi>=0&&(cur(g).t==="word"||cur(g).t==="idea"))?false:p.ans!==null;
const cloud=g=>[...g.words.values()].sort((a,b)=>b.n-a.n).slice(0,40).map(e=>[e.w,e.n]);
function hostView(g){
  const q=g.qi>=0?cur(g):null,r=ranked(g);
  const v={ph:g.ph,qi:g.qi,n:g.qs.length,title:g.title,t:q?q.t:null,q:q?{q:q.q,a:q.a||null}:null,
    c:g.ph==="r"&&q&&q.t!=="word"&&q.t!=="idea"?q.c:null,rem:remMs(g),dur:g.dur/1000,
    answered:[...g.players.values()].filter(p=>g.ph==="v"?p.voted!==null:(q&&(q.t==="word"||q.t==="idea"))?p.subs.length>0:p.ans!==null).length,
    players:[...g.players.values()].map(p=>p.name),np:g.players.size,dist:g.dist,funny:g.funny,
    top:r.slice(0,5).map(([,p])=>[p.name,p.score]),cloud:q&&q.t==="word"?cloud(g):null,
    ideas:(g.ph==="q"||g.ph==="v")&&q&&q.t==="idea"?(g.ph==="v"?g.ideaList:g.ideas).slice(-40).map(i=>i.text):null,
    ires:null,num:null,final:null};
  if(g.ph==="r"&&q){
    if(q.t==="idea"){const l=g.ideaList,tot=l.reduce((s,i)=>s+i.v,0)||1;v.ires=l.map(i=>[i.text,i.name,i.v,Math.round(100*i.v/tot)]).sort((a,b)=>b[2]-a[2])}
    if(q.t==="num")v.num={c:q.c,top:g.numTop||[]};
  }
  if(g.ph==="e")v.final={ranking:r.map(([,p])=>({name:p.name,score:p.score,good:p.good})),log:g.log};
  return v;
}
function playerView(g,pid){
  const p=g.players.get(pid),q=g.qi>=0?cur(g):null,i=ranked(g).findIndex(x=>x[0]===pid)+1;
  return{ph:g.ph,qi:g.qi,n:g.qs.length,rem:remMs(g),dur:g.dur/1000,name:p.name,t:q?q.t:null,
    c:g.ph==="r"&&q&&(q.t==="qcm"||q.t==="tf"||q.t==="num")?q.c:null,
    k:p.ans&&p.ans.k!==undefined?p.ans.k:null,done:doneOf(g,p),subs:p.subs,
    ideas:g.ph==="v"?g.ideaList.map(x=>x.text):null,voted:p.voted,res:g.ph==="r"?p.res:null,
    me:[p.score,p.last,i],np:g.players.size};
}
const send=(res,o)=>{try{res.write("data: "+JSON.stringify(o)+"\n\n")}catch(e){}};
function bc(g){
  g.at=Date.now();
  g.host.forEach(r=>send(r,hostView(g)));
  g.conns.forEach((set,pid)=>{if(g.players.has(pid))set.forEach(r=>send(r,playerView(g,pid)))});
}
const arm=(g,f)=>{clearTimeout(g.timer);g.timer=setTimeout(f,g.dur+400)};
const allDone=g=>[...g.players.values()].every(p=>p.ans!==null);

function startQ(g){
  const q=cur(g);
  g.ph="q";g.t0=Date.now();g.dur=DUR[q.t]*1000;
  g.dist=q.t==="tf"?[0,0]:[0,0,0,0];
  g.words=new Map();g.ideas=[];g.ideaList=[];g.numTop=[];
  g.players.forEach(p=>{p.ans=null;p.subs=[];p.voted=null;p.res=null});
  arm(g,()=>endQ(g));bc(g);
}
function endQ(g){
  if(g.ph!=="q")return;
  if(cur(g).t==="idea"&&g.ideas.length>1)return startVote(g);
  g.ideaList=g.ideas.slice(0,12);reveal(g);
}
function startVote(g){
  g.ph="v";g.t0=Date.now();g.dur=DUR.vote*1000;
  g.ideaList=g.ideas.slice(0,12);g.ideaList.forEach(i=>i.v=0);
  g.players.forEach(p=>p.voted=null);
  arm(g,()=>reveal(g));bc(g);
}
function reveal(g){
  if(g.ph!=="q"&&g.ph!=="v")return;
  clearTimeout(g.timer);
  const q=cur(g),t=q.t,rows=[],secs=g.dur/1000;
  g.players.forEach(p=>{p.last=0;p.res=null});
  if(t==="qcm"||t==="tf"){
    g.players.forEach(p=>{
      let pts=0,ok=false;const a=p.ans;
      if(a){g.dist[a.k]++;ok=a.k===q.c;
        if(ok){p.stk++;p.good++;pts=Math.round(1000*(1-(a.el/secs)/2))+Math.min(p.stk-1,4)*100}else p.stk=0;
      }else p.stk=0;
      p.score+=pts;p.last=pts;p.res={ok,pts};
      rows.push([p.name,a?q.a[a.k]:"",a?(ok?"Oui":"Non"):"",pts,""]);
    });
  }else if(t==="num"){
    const close=[];
    g.players.forEach(p=>{
      let pts=0,ok=false;const a=p.ans;
      if(a){const e=Math.abs(a.v-q.c)/Math.max(Math.abs(q.c),1);pts=Math.round(1000*Math.max(0,1-e*2));ok=e<=.05;if(ok)p.good++;close.push([p.name,a.v,Math.abs(a.v-q.c)])}
      p.score+=pts;p.last=pts;p.res={ok,pts,v:a?a.v:null};
      rows.push([p.name,a?a.v:"",a?(ok?"Oui":"Non"):"",pts,"Bonne réponse : "+q.c]);
    });
    g.numTop=close.sort((a,b)=>a[2]-b[2]).slice(0,3).map(x=>[x[0],x[1]]);
  }else if(t==="word"){
    g.players.forEach(p=>{p.res={ok:null,pts:0};rows.push([p.name,p.subs.join(" | "),"",0,""])});
  }else{
    const l=g.ideaList,tot=l.reduce((s,i)=>s+i.v,0)||1;
    g.players.forEach(p=>p.res={ok:null,pts:0});
    l.forEach(i=>rows.push([i.name,i.text,"",0,i.v+" vote(s) - "+Math.round(100*i.v/tot)+" %"]));
  }
  g.log.push({n:g.qi+1,q:q.q,t,rows});
  g.ph="r";bc(g);
}
function finish(g){clearTimeout(g.timer);g.ph="e";bc(g)}
function act(g,a,b){
  if(a==="start"&&g.ph==="lobby"&&g.players.size){g.qi=0;startQ(g)}
  else if(a==="skip"&&g.ph==="q")endQ(g);
  else if(a==="skip"&&g.ph==="v")reveal(g);
  else if(a==="board"&&g.ph==="r"){g.ph="lb";bc(g)}
  else if(a==="next"&&g.ph==="lb"){if(g.qi<g.qs.length-1){g.qi++;startQ(g)}else finish(g)}
  else if(a==="end"&&g.ph!=="e")finish(g);
  else if(a==="restart"&&g.ph==="e"){
    g.ph="lobby";g.qi=-1;g.log=[];g.dur=0;
    g.players.forEach(p=>{p.score=0;p.last=0;p.stk=0;p.good=0;p.ans=null;p.subs=[];p.voted=null;p.res=null});
    bc(g);
  }
  else if(a==="funny"){g.funny=!!(b&&b.on);bc(g)}
}
function answer(g,pl,b){
  if(g.qi<0||b.qi!==g.qi)return false;
  const q=cur(g);
  if(g.ph==="q"){
    const el=Math.min(g.dur/1000,(Date.now()-g.t0)/1000);
    if(q.t==="qcm"||q.t==="tf"){
      const k=b.k|0;
      if(pl.ans||!(b.k>=0&&b.k<(q.t==="tf"?2:4)))return false;
      pl.ans={k,el};allDone(g)?endQ(g):bc(g);return true;
    }
    if(q.t==="num"){
      const v=Number(b.v);
      if(pl.ans||b.v===""||b.v==null||!Number.isFinite(v)||Math.abs(v)>1e9)return false;
      pl.ans={v,el};allDone(g)?endQ(g):bc(g);return true;
    }
    if(q.t==="word"){
      const w=clean(b.text,24),n=norm(w);
      if(!n||pl.subs.length>=3||pl.subs.some(s=>norm(s)===n))return false;
      pl.subs.push(w);const e=g.words.get(n)||{w,n:0};e.n++;g.words.set(n,e);bc(g);return true;
    }
    if(q.t==="idea"){
      const w=clean(b.text,60),n=norm(w);
      if(!n||pl.subs.length>=5||g.ideas.some(i=>i.norm===n))return false;
      pl.subs.push(w);g.ideas.push({text:w,name:pl.name,norm:n,v:0});bc(g);return true;
    }
  }else if(g.ph==="v"){
    if(pl.voted!==null||!(b.i>=0&&b.i<g.ideaList.length))return false;
    pl.voted=b.i|0;g.ideaList[pl.voted].v++;
    [...g.players.values()].every(p=>p.voted!==null)?reveal(g):bc(g);return true;
  }
  return false;
}
setInterval(()=>{for(const[c,g]of games)if(Date.now()-g.at>4*36e5){clearTimeout(g.timer);games.delete(c)}},6e5).unref();

const PUB=path.join(__dirname,"public"),INDEX=path.join(PUB,"index.html");
const MIME={png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",svg:"image/svg+xml",webp:"image/webp",ico:"image/x-icon",css:"text/css; charset=utf-8",js:"application/javascript; charset=utf-8"};
http.createServer(async(req,res)=>{
  const u=new URL(req.url,"http://x"),q=Object.fromEntries(u.searchParams),p=u.pathname;
  try{
    const st=/^\/((?:js|css)\/)?([\w.-]+\.(png|jpe?g|svg|webp|ico|css|js))$/i.exec(p);
    if(req.method==="GET"&&st){
      const f=path.join(PUB,(st[1]||"")+st[2]);
      if(fs.existsSync(f)){
        const ext=st[3].toLowerCase();
        res.writeHead(200,{"Content-Type":MIME[ext],"Cache-Control":ext==="js"||ext==="css"?"no-cache":"public, max-age=3600"});
        return res.end(fs.readFileSync(f));
      }
      res.writeHead(404);return res.end();
    }
    if(req.method==="GET"&&!p.startsWith("/api/")){
      res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-cache"});
      return res.end(fs.readFileSync(INDEX));
    }
    if(p==="/api/config")return json(res,200,{host:PUBLIC_HOST});
    if(p==="/api/me")return json(res,200,{ok:authed(req)});
    if(p==="/api/events"){
      const g=games.get(q.code);
      if(!g)return json(res,404,{error:"Partie introuvable"});
      const host=q.role==="host";
      if(host?!eq(q.key||"",g.key):!g.players.has(q.pid))return json(res,host?403:404,{error:"Accès refusé"});
      res.writeHead(200,{"Content-Type":"text/event-stream","Cache-Control":"no-cache, no-transform","Connection":"keep-alive","X-Accel-Buffering":"no"});
      res.write("retry: 2000\n\n");
      if(host){g.host.add(res);send(res,hostView(g))}
      else{if(!g.conns.has(q.pid))g.conns.set(q.pid,new Set());g.conns.get(q.pid).add(res);send(res,playerView(g,q.pid))}
      const ka=setInterval(()=>{try{res.write(": ka\n\n")}catch(e){}},15000);
      req.on("close",()=>{clearInterval(ka);if(host)g.host.delete(res);else{const s=g.conns.get(q.pid);if(s)s.delete(res)}});
      return;
    }
    if(req.method!=="POST")return json(res,404,{error:"Introuvable"});
    const b=await readBody(req);
    if(p==="/api/login"){
      const ip=String(req.headers["x-forwarded-for"]||req.socket.remoteAddress).split(",")[0].trim(),f=fails.get(ip)||{n:0,t:Date.now()};
      if(Date.now()-f.t>6e5){f.n=0;f.t=Date.now()}
      if(f.n>=8)return json(res,429,{error:"Trop d’essais. Réessaie dans quelques minutes."});
      if(eq(String(b.u||"").trim().toLowerCase(),USER)&&eq(b.p||"",PASS)){
        fails.delete(ip);
        const sec=req.headers["x-forwarded-proto"]==="https"?"; Secure":"";
        return json(res,200,{ok:true},{"Set-Cookie":"qk="+mkToken()+"; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000"+sec});
      }
      f.n++;fails.set(ip,f);
      return setTimeout(()=>json(res,401,{error:"Identifiant ou mot de passe incorrect."}),500);
    }
    if(p==="/api/logout")return json(res,200,{ok:true},{"Set-Cookie":"qk=; Path=/; HttpOnly; Max-Age=0"});
    if(p==="/api/game"){
      if(!authed(req))return json(res,401,{error:"Connexion requise"});
      const qs=cleanQs(b.qs);
      if(!qs)return json(res,400,{error:"Quiz invalide"});
      let code;do{code=String(Math.floor(10000+Math.random()*90000))}while(games.has(code));
      const key=crypto.randomBytes(16).toString("hex");
      games.set(code,{code,key,qs,title:clean(b.title,60),ph:"lobby",qi:-1,players:new Map(),host:new Set(),conns:new Map(),
        dist:[0,0,0,0],dur:0,t0:0,timer:null,at:Date.now(),funny:false,log:[],words:new Map(),ideas:[],ideaList:[],numTop:[]});
      return json(res,200,{code,key});
    }
    const g=games.get(String(b.code||""));
    if(!g)return json(res,404,{error:"Code inconnu. Vérifie le code affiché sur l’écran."});
    if(p==="/api/join"){
      const name=g.funny?funny(g):clean(b.name);
      if(!name)return json(res,400,{error:"Saisis un pseudo."});
      if(g.players.size>=300)return json(res,400,{error:"La partie est pleine."});
      const pid=crypto.randomBytes(8).toString("hex");
      g.players.set(pid,{name,score:0,last:0,stk:0,good:0,ans:null,subs:[],voted:null,res:null});
      bc(g);return json(res,200,{pid,name});
    }
    if(p==="/api/answer"){
      const pl=g.players.get(String(b.pid||""));
      return json(res,200,{ok:!!pl&&answer(g,pl,b)});
    }
    if(p==="/api/action"){
      if(!eq(b.key||"",g.key))return json(res,403,{error:"Accès refusé"});
      act(g,b.a,b);return json(res,200,{ok:true});
    }
    json(res,404,{error:"Introuvable"});
  }catch(e){try{json(res,500,{error:"Erreur serveur"})}catch(_){}}
}).listen(PORT,()=>console.log("Quizz prêt sur http://localhost:"+PORT));
