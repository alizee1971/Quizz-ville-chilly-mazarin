"use strict";
// Quiz Éclair : serveur de jeu sans aucune dépendance (Node 18+).
const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto");
const PORT=process.env.PORT||3000;
const USER=String(process.env.ADMIN_USER||"admin").trim().toLowerCase();
const PASS=String(process.env.ADMIN_PASS||"QuizzKahoottest");
const SECRET=crypto.createHash("sha256").update("qk|"+USER+"|"+PASS).digest();
const T=20,games=new Map(),fails=new Map();
const hmac=s=>crypto.createHmac("sha256",SECRET).update(s).digest("hex");
const mkToken=()=>{const e=Date.now()+30*864e5;return e+"."+hmac(String(e))};
const okToken=t=>{t=String(t||"");const i=t.indexOf(".");if(i<1)return false;const e=t.slice(0,i),h=t.slice(i+1),x=hmac(e);return h.length===x.length&&crypto.timingSafeEqual(Buffer.from(h),Buffer.from(x))&&Date.now()<+e};
const sha=s=>crypto.createHash("sha256").update(String(s)).digest();
const eq=(a,b)=>crypto.timingSafeEqual(sha(a),sha(b));
const authed=req=>{const m=/(?:^|;\s*)qk=([^;]+)/.exec(req.headers.cookie||"");return !!m&&okToken(m[1])};
const json=(res,c,o,h)=>{res.writeHead(c,Object.assign({"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"},h));res.end(JSON.stringify(o))};
const readBody=req=>new Promise(r=>{let b="";req.on("data",c=>{b+=c;if(b.length>3e5)req.destroy()});req.on("end",()=>{try{r(JSON.parse(b||"{}"))}catch(e){r({})}});req.on("error",()=>r({}))});
const clean=s=>String(s||"").replace(/[\u0000-\u001f<>]/g,"").trim().slice(0,14);

function cleanQs(a){
  if(!Array.isArray(a)||!a.length||a.length>50)return null;
  const o=[];
  for(const x of a){
    if(!x||typeof x.q!=="string"||!Array.isArray(x.a)||x.a.length!==4||!x.a.every(t=>typeof t==="string")||!(x.c>=0&&x.c<=3))return null;
    o.push({q:x.q.slice(0,200),a:x.a.map(t=>t.slice(0,100)),c:x.c|0});
  }
  return o;
}
const ranked=g=>[...g.players.entries()].sort((a,b)=>b[1].score-a[1].score);
const remMs=g=>g.ph==="q"?Math.max(0,T*1000-(Date.now()-g.t0)):0;
function hostView(g){
  const q=g.qi>=0?g.qs[g.qi]:null,r=ranked(g);
  return{ph:g.ph,qi:g.qi,n:g.qs.length,title:g.title,q:q?{q:q.q,a:q.a}:null,
    c:(g.ph==="r"||g.ph==="e")&&q?q.c:null,rem:remMs(g),
    answered:[...g.players.values()].filter(p=>p.ans).length,
    players:[...g.players.values()].map(p=>p.name),np:g.players.size,dist:g.dist,
    top:r.slice(0,5).map(([,p])=>[p.name,p.score])};
}
function playerView(g,pid){
  const p=g.players.get(pid),q=g.qi>=0?g.qs[g.qi]:null,i=ranked(g).findIndex(x=>x[0]===pid)+1;
  return{ph:g.ph,qi:g.qi,n:g.qs.length,rem:remMs(g),name:p.name,
    c:(g.ph==="r"||g.ph==="e")&&q?q.c:null,k:p.ans?p.ans.k:null,me:[p.score,p.last,i],np:g.players.size};
}
const send=(res,o)=>{try{res.write("data: "+JSON.stringify(o)+"\n\n")}catch(e){}};
function bc(g){
  g.at=Date.now();
  g.host.forEach(r=>send(r,hostView(g)));
  g.conns.forEach((set,pid)=>{if(g.players.has(pid))set.forEach(r=>send(r,playerView(g,pid)))});
}
function startQ(g){
  g.ph="q";g.t0=Date.now();g.dist=[0,0,0,0];
  g.players.forEach(p=>p.ans=null);
  clearTimeout(g.timer);g.timer=setTimeout(()=>reveal(g),T*1000+400);
  bc(g);
}
function reveal(g){
  if(g.ph!=="q")return;
  clearTimeout(g.timer);
  const q=g.qs[g.qi];
  g.players.forEach(p=>{
    let pts=0;const a=p.ans;
    if(a){g.dist[a.k]++;
      if(a.k===q.c){p.stk++;pts=Math.round(1000*(1-(a.el/T)/2))+Math.min(p.stk-1,4)*100}else p.stk=0;
    }else p.stk=0;
    p.score+=pts;p.last=pts;
  });
  g.ph="r";bc(g);
}
function act(g,a){
  if(a==="start"&&g.ph==="lobby"&&g.players.size){g.qi=0;startQ(g)}
  else if(a==="skip")reveal(g);
  else if(a==="next"&&g.ph==="r"){if(g.qi<g.qs.length-1){g.qi++;startQ(g)}else{g.ph="e";bc(g)}}
  else if(a==="restart"&&g.ph==="e"){g.ph="lobby";g.qi=-1;g.players.forEach(p=>{p.score=0;p.last=0;p.stk=0;p.ans=null});bc(g)}
}
setInterval(()=>{for(const[c,g]of games)if(Date.now()-g.at>4*36e5){clearTimeout(g.timer);games.delete(c)}},6e5).unref();

const INDEX=path.join(__dirname,"public","index.html");
http.createServer(async(req,res)=>{
  const u=new URL(req.url,"http://x"),q=Object.fromEntries(u.searchParams),p=u.pathname;
  try{
    const st=/^\/([\w.-]+\.(png|jpe?g|svg|webp|ico))$/i.exec(p);
    if(req.method==="GET"&&st){
      const f=path.join(__dirname,"public",st[1]);
      if(fs.existsSync(f)){
        const ext=st[2].toLowerCase(),mt={png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",svg:"image/svg+xml",webp:"image/webp",ico:"image/x-icon"}[ext];
        res.writeHead(200,{"Content-Type":mt,"Cache-Control":"public, max-age=3600"});
        return res.end(fs.readFileSync(f));
      }
      res.writeHead(404);return res.end();
    }
    if(req.method==="GET"&&!p.startsWith("/api/")){
      res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-cache"});
      return res.end(fs.readFileSync(INDEX));
    }
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
      games.set(code,{code,key,qs,title:String(b.title||"").slice(0,60),ph:"lobby",qi:-1,players:new Map(),host:new Set(),conns:new Map(),dist:[0,0,0,0],t0:0,timer:null,at:Date.now()});
      return json(res,200,{code,key});
    }
    const g=games.get(String(b.code||""));
    if(!g)return json(res,404,{error:"Code inconnu. Vérifie le code affiché sur l’écran."});
    if(p==="/api/join"){
      const name=clean(b.name);
      if(!name)return json(res,400,{error:"Saisis un pseudo."});
      if(g.players.size>=300)return json(res,400,{error:"La partie est pleine."});
      const pid=crypto.randomBytes(8).toString("hex");
      g.players.set(pid,{name,score:0,last:0,stk:0,ans:null});
      bc(g);return json(res,200,{pid});
    }
    if(p==="/api/answer"){
      const pl=g.players.get(String(b.pid||""));
      if(!pl||g.ph!=="q"||b.qi!==g.qi||pl.ans||!(b.k>=0&&b.k<=3))return json(res,200,{ok:false});
      pl.ans={k:b.k|0,el:Math.min(T,(Date.now()-g.t0)/1000)};
      if([...g.players.values()].every(x=>x.ans))reveal(g);else bc(g);
      return json(res,200,{ok:true});
    }
    if(p==="/api/action"){
      if(!eq(b.key||"",g.key))return json(res,403,{error:"Accès refusé"});
      act(g,b.a);return json(res,200,{ok:true});
    }
    json(res,404,{error:"Introuvable"});
  }catch(e){try{json(res,500,{error:"Erreur serveur"})}catch(_){}}
}).listen(PORT,()=>console.log("Quiz Éclair prêt sur http://localhost:"+PORT));
