/* Stockage des points et export CSV.
   - côté joueur : mémorise son score (navigateur)
   - côté animateur : mémorise l'historique des parties et fabrique les CSV */
const QKScores=(()=>{
  const TYPE={qcm:"Choix multiples",tf:"Vrai ou faux",num:"Estimation",word:"Nuage de mots",idea:"Idées et vote"};
  const get=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}};
  const set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  const cell=v=>{v=String(v==null?"":v);return /[;"\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const csv=rows=>"\ufeff"+rows.map(r=>r.map(cell).join(";")).join("\r\n");
  function rankingCSV(f){
    const rows=[["Rang","Pseudo","Points","Bonnes réponses"]];
    f.ranking.forEach((p,i)=>rows.push([i+1,p.name,p.score,p.good]));
    return csv(rows);
  }
  function questionsCSV(f){
    const rows=[["N°","Question","Type","Joueur","Réponse","Correct","Points","Détail"]];
    f.log.forEach(l=>l.rows.forEach(r=>rows.push([l.n,l.q,TYPE[l.t]||l.t].concat(r))));
    return csv(rows);
  }
  function download(name,text){
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([text],{type:"text/csv;charset=utf-8"}));
    a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  }
  const stamp=()=>new Date().toISOString().slice(0,16).replace(/[-:T]/g,"");
  /* animateur : historique des parties terminées */
  function saveGame(code,title,f){
    const h=get("qk-history",[]).filter(x=>x.code!==code);
    h.unshift({code,title,t:Date.now(),ranking:f.ranking.slice(0,20)});
    set("qk-history",h.slice(0,20));
  }
  /* joueur : points cumulés */
  function saveMine(code,name,points,rank){set("qk-mine",{code,name,points,rank,t:Date.now()})}
  return{rankingCSV,questionsCSV,download,stamp,saveGame,saveMine,history:()=>get("qk-history",[])};
})();
