/* Musique et sons du jeu, 100 % synthétisés (aucun fichier audio).
   - lobby    : musique d'attente calme et enjouée
   - suspense : le tempo accélère quand le temps de la question diminue
   - jingle   : courts jingles pour les annonces ("reveal", "board", "join")
   - fanfare  : fanfare finale
   Quand la musique est coupée, c'est le silence. */
const QKAudio=(()=>{
  let ctx=null,master=null,timer=null,mode=null,remFn=null,muted=false;
  try{muted=localStorage.getItem("qk-muted")==="1"}catch(e){}
  const hz=m=>440*Math.pow(2,(m-69)/12);
  function ensure(){
    if(!ctx){
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
      ctx=new C();master=ctx.createGain();master.gain.value=.55;master.connect(ctx.destination);
    }
    if(ctx.state==="suspended")ctx.resume();
    return ctx;
  }
  function note(f,t,d,type,v,out){
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type||"sine";o.frequency.value=f;
    g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v||.12,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g);g.connect(out||master);o.start(t);o.stop(t+d+.05);
  }
  function hat(t,v){
    const n=Math.floor(ctx.sampleRate*.04),b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
    const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    s.buffer=b;f.type="highpass";f.frequency.value=6000;g.gain.value=v||.05;
    s.connect(f);f.connect(g);g.connect(master);s.start(t);
  }
  function stopLoop(){clearInterval(timer);timer=null}
  function loop(fn){
    stopLoop();
    let next=ctx.currentTime+.08,s=0;
    timer=setInterval(()=>{while(next<ctx.currentTime+.35)next=fn(next,s++)},80);
  }
  /* Musique d'attente : accords C - G - Am - F, arpèges doux, 104 bpm */
  const CH=[[60,64,67,72],[59,62,67,71],[57,60,64,69],[53,57,60,65]],BS=[36,31,33,29],ARP=[0,2,1,3,2,1,3,2];
  function lobbyStep(t,s){
    const bar=Math.floor(s/8)%4,pos=s%8,ch=CH[bar];
    note(hz(ch[ARP[pos]]),t,.4,"triangle",.09);
    if(pos===0||pos===4)note(hz(BS[bar]),t,.55,"sine",.17);
    if(pos%2===1)hat(t,.035);
    if(pos===0)note(hz(ch[1]-12),t,1.2,"sine",.05);
    return t+60/104/2;
  }
  /* Suspense : pulsation qui accélère (0.7 s -> 0.13 s) et monte en hauteur */
  const SC=[0,0,3,0,5,3,7,5];
  function suspenseStep(t,s){
    const f=Math.max(0,Math.min(1,remFn?remFn():1)),u=1-f;
    const dt=.7-.57*u;
    note(hz(45+SC[s%8]+Math.round(u*5)),t,Math.min(.35,dt*.9),"sawtooth",.1+.05*u);
    note(1100+u*900,t,.03,"square",.03+.03*u);
    if(s%2===1)note(hz(69+SC[s%8]),t+dt/2,.08,"triangle",.04*u+.015);
    return t+dt;
  }
  function play(m,fn){
    mode=m;remFn=fn||null;
    if(muted||!ensure()){stopLoop();return}
    if(m==="lobby")loop(lobbyStep);
    else if(m==="suspense")loop(suspenseStep);
    else stopLoop();
  }
  function stop(){mode=null;stopLoop()}
  function seq(list,type,vol,out){const t0=ctx.currentTime+.05;list.forEach(([m,s,d])=>note(hz(m),t0+s,d,type,vol,out))}
  function jingle(kind){
    if(muted||!ensure())return;
    if(kind!=="join"){stopLoop();mode=null}
    if(kind==="reveal")seq([[72,0,.18],[76,.12,.18],[79,.24,.5]],"triangle",.16);
    else if(kind==="board")seq([[67,0,.14],[72,.1,.14],[76,.2,.14],[79,.3,.14],[84,.42,.6]],"triangle",.16);
    else if(kind==="join")seq([[84,0,.12],[88,.07,.25]],"sine",.07);
  }
  function fanfare(){
    mode=null;stopLoop();
    if(muted||!ensure())return;
    const f=ctx.createBiquadFilter();f.type="lowpass";f.frequency.value=2200;f.connect(master);
    const t0=ctx.currentTime+.1,V=.07;
    const hit=(ms,s,d)=>ms.forEach(m=>{note(hz(m),t0+s,d,"sawtooth",V,f);note(hz(m)*1.004,t0+s,d,"sawtooth",V*.6,f)});
    hit([67,72,76],0,.2);hit([67,72,76],.24,.2);hit([67,72,76],.48,.2);
    hit([72,76,79],.72,.7);hit([71,74,79],1.5,.25);hit([72,76,79,84],1.8,1.6);
    note(hz(48),t0+.72,.7,"sine",.2);note(hz(48),t0+1.8,1.6,"sine",.22);
  }
  function setMuted(v){
    muted=!!v;try{localStorage.setItem("qk-muted",muted?"1":"0")}catch(e){}
    if(muted)stopLoop();else if(mode)play(mode,remFn);
    return muted;
  }
  return{unlock:ensure,play,stop,jingle,fanfare,setMuted,isMuted:()=>muted};
})();
