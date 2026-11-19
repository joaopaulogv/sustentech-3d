// SUSTENTECH 10 — motor local de agentes com planejamento e navegação em calçadas.
// Rotinas determinísticas, baratas e explicáveis; Gemini continua exclusivo dos diálogos.
export function criarMotorRotinas({THREE,people,homes,doors,onEvent=()=>{}}){
  const V=THREE.Vector3;
  const nodeMap=new Map();
  const edges=new Map();
  // Normalize floats from rotated house entrances to exact grid coordinates.
  const key=(x,z)=>Math.round(x*1000)/1000+','+Math.round(z*1000)/1000;
  const vec=(x,z)=>new V(x,.04,z);
  function register(x,z){
    const id=key(x,z);
    if(!nodeMap.has(id)){nodeMap.set(id,vec(x,z));edges.set(id,new Set());}
    return id;
  }
  function connect(x,z,x2,z2){
    const a=register(x,z),b=register(x2,z2);
    edges.get(a).add(b);edges.get(b).add(a);
  }
  for(const radius of [12,18]){
    for(let i=-radius;i<radius;i+=6){
      connect(i,-radius,i+6,-radius);
      connect(i,radius,i+6,radius);
      connect(-radius,i,-radius,i+6);
      connect(radius,i,radius,i+6);
    }
  }
  // Corredores livres entre os anéis. Não atravessam casas ou barracas.
  for(const x of [-12,0,12])for(const sign of [-1,1]){
    connect(x,18*sign,x,12*sign);
  }
  for(const z of [-12,12])for(const sign of [-1,1]){
    connect(18*sign,z,12*sign,z);
  }
  // Descoberta de caminho mais curto no grafo de calçadas (BFS, pesos uniformes).
  function route(start,end){
    if(start===end)return [];
    if(!edges.has(start)||!edges.has(end))throw Error('Calçada não cadastrada: '+start+' -> '+end);
    const queue=[start],parents=new Map([[start,null]]);
    for(let index=0;index<queue.length;index++){
      const at=queue[index];
      if(at===end)break;
      for(const next of edges.get(at)){
        if(parents.has(next))continue;
        parents.set(next,at);queue.push(next);
      }
    }
    if(!parents.has(end))throw Error('Sem caminho entre '+start+' e '+end);
    const visited=[];let current=end;
    while(current!==start){visited.push(current);current=parents.get(current);}
    return visited.reverse().map(id=>nodeMap.get(id).clone());
  }
  const places=[
    {id:'cafe',label:'Café Verde',node:key(-6,-12),approach:[vec(-6,-12.58)],duration:7,kind:'food'},
    {id:'feira',label:'Feira Viva',node:key(6,-12),approach:[vec(6,-12.58)],duration:8,kind:'food'},
    {id:'laboratorio',label:'Centro de pesquisa',node:key(0,-18),approach:[vec(0,-18.93),vec(0,-19.64)],duration:11,kind:'science',door:'lab'},
    {id:'parque',label:'Praça central',node:key(0,12),approach:[vec(0,11.65)],duration:8,kind:'park'}
  ];
  let seconds=0;
  const candidates=people.filter(p=>!p.drivingCar&&!p.vendor);
  const stateLog=[];
  const emit=(type,p,place)=>{const e={type,id:p.id,place,at:seconds};stateLog.push(e);onEvent(e);};
  function pickHome(p){
    const home=homes[p.id%homes.length];
    const slot=Math.floor(p.id/homes.length);
    return {home,slot};
  }
  function sleepSpot(home,slot){
    // Variações pequenas no interior. Não surgem no meio da rua.
    const pos=home.inside.clone();
    const offset=(slot-1.5)*.36;
    pos.x+=home.side.x*offset;
    pos.z+=home.side.z*offset;
    return pos;
  }
  for(const p of candidates){
    const {home,slot}=pickHome(p);
    const place=sleepSpot(home,slot);
    p.g.position.copy(place);p.g.position.y=.04;
    p.motion=0;p.activity='Em casa';
    p.stopsSinceHome=0;p.lastDestination=null;
    p.needs={fome:.3+(p.id%5)*.07,energia:.25+(p.id%4)*.09,curiosidade:.35+(p.id%3)*.09};
    p.ai={home,mode:'home',wait:2.5+p.id*.9,current:key(home.sidewalk.x,home.sidewalk.z),path:[],index:0,target:null,walked:0};
  }
  function turnAndWalk(p,target,dt,speed){
    const dx=target.x-p.g.position.x,dz=target.z-p.g.position.z,dist=Math.hypot(dx,dz);
    if(dist<.055){p.g.position.set(target.x,.04,target.z);p.motion=0;return true;}
    const step=Math.min(dist,speed*dt);
    const angle=Math.atan2(dx,dz),old=p.g.rotation.y;
    const change=Math.atan2(Math.sin(angle-old),Math.cos(angle-old));
    p.g.rotation.y+=THREE.MathUtils.clamp(change,-dt*7,dt*7);
    p.g.position.x+=dx/dist*step;p.g.position.z+=dz/dist*step;p.g.position.y=.04;
    p.motion=speed;
    return dist-step<.055;
  }
  function pathStep(p,dt){
    const ai=p.ai,target=ai.path[ai.index];
    if(!target)return true;
    if(turnAndWalk(p,target,dt,1.8+(p.id%4)*.10)){
      ai.index++;
      return ai.index>=ai.path.length;
    }
    return false;
  }
  function setPath(p,path,mode){
    const ai=p.ai;
    ai.path=path.map(point=>point.clone());ai.index=0;ai.mode=mode;
  }
  function hungerScore(p,d){return d.kind==='food'?p.needs.fome:.0;}
  function decide(p,night){
    const ai=p.ai;
    const homeOption={
      id:'home',label:ai.home.name,node:ai.current===key(ai.home.sidewalk.x,ai.home.sidewalk.z)?ai.current:key(ai.home.sidewalk.x,ai.home.sidewalk.z),
      approach:[ai.home.door.clone(),ai.home.inside.clone()],kind:'home',duration:14,home:ai.home
    };
    if(ai.forceHome||p.stopsSinceHome>=2)return homeOption;
    const options=[...places,homeOption];
    let winner=options[0],best=-Infinity;
    for(const d of options){
      const need=d.kind==='food'?p.needs.fome:
        d.kind==='science'?p.needs.curiosidade:
        d.kind==='park'?(1-p.needs.energia)*.58:p.needs.energia;
      const bonus=d.id==='home'&&night?.65:0;
      const vocation=d.kind==='science'&&[0,4,6,10,16,18,20,22].includes(p.id)?.21:0;
      const variety=(Math.sin(p.id*13+p.stopsSinceHome*17+d.label.length*4)*.5+.5)*.15;
      const repeat=d.id===p.lastDestination?-.6:0;
      const score=need+bonus+vocation+variety+repeat;
      if(score>best){best=score;winner=d;}
    }
    return winner;
  }
  function doorOpen(place){
    if(place?.door==='lab')doors.openLab(seconds+4);
    if(place?.home)doors.openHome(place.home,seconds+4);
  }
  function planTrip(p,night){
    const ai=p.ai;
    const place=decide(p,night);
    ai.target=place;
    const end=place.node;
    setPath(p,route(ai.current,end),'travel');
    p.activity=place.id==='home'?'Voltando para casa':'Indo a '+place.label;
    emit('depart',p,place.id);
  }
  function leaveHome(p,night){
    const ai=p.ai;
    ai.target=null;
    const path=[ai.home.door.clone(),ai.home.sidewalk.clone()];
    setPath(p,path,'leaving');
    p.activity='Saindo de '+ai.home.name;
    doors.openHome(ai.home,seconds+4);
    emit('leaveHome',p,ai.home.id);
  }
  function arrived(p){
    const ai=p.ai,d=ai.target;
    ai.current=d.node;
    if(d.approach.length){
      setPath(p,d.approach,'approach');
      doorOpen(d);
    }else startVisit(p);
  }
  function startVisit(p){
    const ai=p.ai,d=ai.target;
    ai.mode='visit';ai.wait=d.duration+((p.id+1)%4)*1.5;
    p.motion=0;
    p.activity=d.kind==='home'?'Descansando em casa':
      d.kind==='food'?'Comprando em '+d.label:
      d.kind==='science'?'Trabalhando no laboratório':'Curtindo o parque';
    emit('arrive',p,d.id);
  }
  function completeVisit(p,night){
    const ai=p.ai,d=ai.target;
    p.lastDestination=d.id;
    if(d.kind==='food')p.needs.fome=.05;
    if(d.kind==='science')p.needs.curiosidade=.07;
    if(d.kind==='park')p.needs.energia=Math.max(.08,p.needs.energia-.3);
    if(d.kind==='home'){
      p.needs.energia=.08;p.stopsSinceHome=0;ai.forceHome=false;
      ai.mode='home';ai.wait=12+(p.id%5)*3;ai.target=null;
      p.activity='Em casa';p.motion=0;
      emit('returnHome',p,ai.home.id);
      return;
    }
    p.stopsSinceHome++;
    ai.mode='returning';
    const toSidewalk=[...d.approach].reverse();
    toSidewalk.push(nodeMap.get(d.node).clone());
    setPath(p,toSidewalk,'returning');
    p.activity='Voltando à calçada';
    doorOpen(d);
  }
  function update(dt,{night=false}={}){
    seconds+=dt;
    for(const p of candidates){
      const ai=p.ai;
      p.needs.fome=Math.min(1,p.needs.fome+dt*.0015);
      p.needs.energia=Math.min(1,p.needs.energia+dt*.0010);
      p.needs.curiosidade=Math.min(1,p.needs.curiosidade+dt*.0013);
      if(ai.mode==='home'){
        p.motion=0;ai.wait-=dt;
        if(ai.wait<=0)leaveHome(p,night);
        continue;
      }
      if(ai.mode==='leaving'){
        if(pathStep(p,dt)){
          ai.current=key(ai.home.sidewalk.x,ai.home.sidewalk.z);
          planTrip(p,night);
        }
      }else if(ai.mode==='travel'){
        if(pathStep(p,dt))arrived(p);
      }else if(ai.mode==='approach'){
        doorOpen(ai.target);
        if(pathStep(p,dt))startVisit(p);
      }else if(ai.mode==='visit'){
        ai.wait-=dt;p.motion=0;
        if(ai.wait<=0)completeVisit(p,night);
      }else if(ai.mode==='returning'){
        if(pathStep(p,dt)){
          ai.current=ai.target.node;
          planTrip(p,night);
        }
      }
    }
    return seconds;
  }
  function requestHome(id){
    const p=people[id];if(!p?.ai)return false;
    p.ai.forceHome=true;
    if(p.ai.mode==='visit')p.ai.wait=Math.min(p.ai.wait,1.5);
    emit('requestHome',p,p.ai.home.id);
    return true;
  }
  return{
    update,route,places,events:stateLog,requestHome,
    getCitizen(id){
      const p=people[id];if(!p)return null;
      return{id,activity:p.activity||'Em movimento',home:p.ai?.home.name||null,phase:p.ai?.mode||(p.drivingCar?'driving':'working'),target:p.ai?.target?.label||null,needs:p.needs||null};
    },
    getStats(){
      return {atHome:candidates.filter(p=>p.ai.mode==='home').length,
        onStreet:candidates.filter(p=>['travel','leaving','returning'].includes(p.ai.mode)).length,
        visiting:candidates.filter(p=>['visit','approach'].includes(p.ai.mode)).length,
        vendors:people.filter(p=>p.vendor).length,drivers:people.filter(p=>p.drivingCar).length};
    }
  };
}
