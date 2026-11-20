// SUSTENTECH 11 — simulação de agentes e navegação em calçadas.
// Planejamento por necessidades + A* de ruas + capacidade dos estabelecimentos.
// Movimento com prioridade, filas e separação física; Gemini cuida só dos diálogos.
export function criarMotorRotinas({THREE,people,homes,doors,obstacles=[],onEvent=()=>{}}){
 const V=THREE.Vector3,vector=(x,z)=>new V(x,.04,z);
 const key=(x,z)=>Math.round(x*1000)/1000+','+Math.round(z*1000)/1000;
 const nodes=new Map(),edges=new Map();
 const residents=people.filter(p=>!p.vendor&&!p.drivingCar);
 const STOP_GAP=.77,LANE=.58;
 let elapsed=0;
 const events=[],reservations=new Map(),doorLocks=new Map(),homeIncoming=new Map();
 const emit=(type,p,place)=>{
   const event={type,id:p.id,place,at:Math.round(elapsed*10)/10};
   events.push(event);if(events.length>600)events.shift();
   onEvent(event);
 };
 function register(x,z){
   const k=key(x,z);if(!nodes.has(k)){nodes.set(k,vector(x,z));edges.set(k,new Set());}
   return k;
 }
 function connect(x,z,u,v){
   const a=register(x,z),b=register(u,v);
   edges.get(a).add(b);edges.get(b).add(a);
 }
 for(const r of [12,18]){
   for(let i=-r;i<r;i+=6){
     connect(i,-r,i+6,-r);connect(i,r,i+6,r);
     connect(-r,i,-r,i+6);connect(r,i,r,i+6);
   }
 }
 for(const x of [-12,0,12])for(const sign of [-1,1])connect(x,18*sign,x,12*sign);
 for(const z of [-12,12])for(const sign of [-1,1])connect(18*sign,z,12*sign,z);
 function routeKeys(start,end){
   if(start===end)return [];
   if(!nodes.has(start)||!nodes.has(end))return [];
   // A*: shortest connected sidewalk path, not straight through scenery.
   const queue=[start],score=new Map([[start,0]]),parent=new Map();
   let iter=0;
   while(queue.length&&iter++<200){
     queue.sort((a,b)=>score.get(a)-score.get(b));
     const at=queue.shift();if(at===end)break;
     for(const next of edges.get(at)){
       const current=score.get(at)+nodes.get(at).distanceTo(nodes.get(next));
       if(current<(score.get(next)??Infinity)){
         score.set(next,current);parent.set(next,at);
         if(!queue.includes(next))queue.push(next);
       }
     }
   }
   if(!parent.has(end))return [];
   const out=[];let at=end;
   while(at!==start&&out.length<200){out.push(at);at=parent.get(at);}
   return out.reverse();
 }
 function laneRoute(from,to){
   const keys=routeKeys(from,to),out=[];
   let previous=nodes.get(from);
   if(!previous)return out;
   for(let i=0;i<keys.length;i++){
     const next=nodes.get(keys[i]);
     const dx=next.x-previous.x,dz=next.z-previous.z;
     const length=Math.hypot(dx,dz)||1;
     const shifted=next.clone();
     shifted.x+=dz/length*LANE;
     shifted.z-=dx/length*LANE;
     out.push(shifted);
     previous=next;
   }
   if(keys.length)out.push(nodes.get(to).clone());
   return out;
 }
 const places=[
   {id:'cafe',label:'Café Verde',node:key(-6,-12),kind:'food',duration:11,slots:[vector(-6.67,-11.17),vector(-5.33,-11.17)],capacity:2},
   {id:'feira',label:'Feira Viva',node:key(6,-12),kind:'food',duration:12,slots:[vector(5.33,-11.17),vector(6.67,-11.17)],capacity:2},
   {id:'laboratorio',label:'Laboratório',node:key(0,-18),kind:'science',duration:16,slots:[vector(-.62,-19.63),vector(.62,-19.63)],capacity:2,door:'lab'},
   {id:'parque',label:'Praça do Parque',node:key(0,12),kind:'park',duration:13,slots:[vector(-1.3,10.55),vector(1.3,10.55)],capacity:2}
 ];
 for(const place of places)reservations.set(place.id,new Set());
 function freeSlot(place){
   const reserved=reservations.get(place.id);
   for(let i=0;i<place.slots.length;i++)if(!reserved.has(i))return i;
   return -1;
 }
 function takeSlot(place){const slot=freeSlot(place);if(slot>=0)reservations.get(place.id).add(slot);return slot;}
 function releaseSlot(ai){
   if(ai.destination?.id!=='home'&&ai.destination?.id&&ai.slot>=0)reservations.get(ai.destination.id)?.delete(ai.slot);
   ai.slot=-1;
 }
 function homeAt(p){return homes[p.id%homes.length];}
 function homeSlot(p,home){
   const family=residents.filter(a=>a.id%homes.length===home.index);
   const index=family.findIndex(a=>a.id===p.id);
   // Four interior resting positions with >= 0.9m separation.
   const offset=(index-(family.length-1)/2)*.92;
   const pt=home.inside.clone();
   pt.x+=home.side.x*offset;pt.z+=home.side.z*offset;
   return pt;
 }
 function setPath(p,points,mode){
   p.ai.points=points.map(q=>q.clone());p.ai.step=0;p.ai.mode=mode;
 }
 for(const p of residents){
   const home=homeAt(p);
   p.g.position.copy(homeSlot(p,home));
   p.motion=0;p.activity='Em casa';p.stopsSinceHome=0;p.lastDestination='';
   p.needs={fome:.32+p.id%6*.055,energia:.22+p.id%4*.1,curiosidade:.34+p.id%3*.12};
   p.ai={mode:'home',home,wait:8+p.id*3.3,current:key(home.sidewalk.x,home.sidewalk.z),
     points:[],step:0,slot:-1,destination:null,request:false,visits:0,blocked:0};
 }
 function isObstacle(x,z,margin=.3){
   for(const item of obstacles){
     if(item.type==='circle'){
       if(Math.hypot(x-item.x,z-item.z)<item.radius+margin)return true;
     }else if(item.type==='box'){
       if(Math.abs(x-item.x)<item.halfX+margin&&Math.abs(z-item.z)<item.halfZ+margin)return true;
     }
   }
   return false;
 }
 function moveAlong(p,target,dt){
   const px=p.g.position.x,pz=p.g.position.z;
   const dx=target.x-px,dz=target.z-pz,dist=Math.hypot(dx,dz);
   if(dist<.055){p.g.position.set(target.x,.04,target.z);p.motion=0;p.ai.blocked=0;return true;}
   const speed=1.55+(p.id%4)*.1,step=Math.min(dist,speed*dt);
   const ux=dx/dist,uz=dz/dist;
   const ai=p.ai,indoors=['exitHome','enterHome'].includes(ai.mode);
   // Steering alternatives. The pedestrian first tries the target, then walks
   // around people on one side of the sidewalk without entering solid objects.
   const angles=[0,.4,-.4,.85,-.85,1.22,-1.22,1.58,-1.58,2.0,-2.0];
   const preferred=p.id%2===0?1:-1;
   let best=null,bestScore=-Infinity;
   for(const base of angles){
     const angle=base*preferred;
     const ca=Math.cos(angle),sa=Math.sin(angle);
     const vx=ux*ca-uz*sa,vz=ux*sa+uz*ca;
     const x=px+vx*step,z=pz+vz*step;
     if(!indoors&&isObstacle(x,z,.22))continue;
     let safe=true;
     for(const other of residents){
       if(p===other)continue;
       // Residents resting inside a home yield the doorway to arrivals/departures.
       // Family members at different resting spots allow passage inside the home;
       // only the single-file doorway is reserved at a time.
       if(indoors&&other.ai.home===ai.home&&(
          other.ai.mode==='home'||other.ai.mode==='insideHome'||other.ai.mode==='exitHome'||other.ai.mode==='enterHome'))continue;
       const ax=px-other.g.position.x,az=pz-other.g.position.z;
       const old=Math.hypot(ax,az),newDist=Math.hypot(x-other.g.position.x,z-other.g.position.z);
       if(newDist<STOP_GAP-.005&&(newDist<old-.003||old>STOP_GAP-.005)){safe=false;break;}
     }
     if(!safe)continue;
     const progress=vx*ux+vz*uz;
     const score=progress*2-Math.abs(angle)*.13+(ai.blocked>.7&&Math.abs(angle)>1?.13:0);
     if(score>bestScore){bestScore=score;best={x,z,vx,vz};}
   }
   if(!best){ai.blocked+=dt;p.motion=0;return false;}
   const moved=Math.hypot(best.x-px,best.z-pz);
   p.g.position.set(best.x,.04,best.z);
   const facing=Math.atan2(best.vx,best.vz),old=p.g.rotation.y;
   const diff=Math.atan2(Math.sin(facing-old),Math.cos(facing-old));
   p.g.rotation.y+=THREE.MathUtils.clamp(diff,-dt*7,dt*7);
   p.motion=moved/dt;ai.blocked=0;
   return Math.hypot(target.x-best.x,target.z-best.z)<.055;
 }
 function advance(p,dt){
   const ai=p.ai,target=ai.points[ai.step];
   if(!target)return true;
   if(moveAlong(p,target,dt)){
     ai.step++;
     return ai.step>=ai.points.length;
   }
   return false;
 }
 function choose(p,night){
   const ai=p.ai;
   const home={id:'home',label:ai.home.name,kind:'home',node:key(ai.home.sidewalk.x,ai.home.sidewalk.z)};
   if(ai.request||p.stopsSinceHome>=2){
     const booked=homeIncoming.get(ai.home.id);
     if(booked===undefined||booked===p.id)return home;
   }
   let best=null,value=-Infinity;
   for(const place of [...places,home]){
     if(place.id!=='home'&&freeSlot(place)<0)continue;
     if(place.id==='home'&&homeIncoming.has(ai.home.id)&&homeIncoming.get(ai.home.id)!==p.id)continue;
     const utility=place.kind==='home'?p.needs.energia:place.kind==='food'?p.needs.fome:
       place.kind==='science'?p.needs.curiosidade:(.34+.18*(1-p.needs.energia));
     const bonus=place.id==='home'&&night?.7:place.kind==='science'&&p.id%4===0?.18:0;
     const novelty=place.id===p.lastDestination?-.7:0;
     const variety=.14*(.5+.5*Math.sin(p.id*12+ai.visits*3+place.label.length*7));
     const score=utility+bonus+novelty+variety;
     if(score>value){best=place;value=score;}
   }
   return best||null;
 }
 function plan(p,night){
   const ai=p.ai;
   let destination=choose(p,night);
   ai.slot=-1;
   if(!destination){
     // No free shop or house slot: take an uncrowded promenade segment.
     const keys=Array.from(nodes.keys()).filter(k=>k!==ai.current);
     const node=keys[(p.id*13+ai.visits*19)%keys.length];
     destination={id:'promenade',label:'Passeio pelas ruas',kind:'walk',node,duration:1,slots:[nodes.get(node).clone()],capacity:100};
   }
   if(destination.id!=='home'){
     const slot=destination.id==='promenade'?0:takeSlot(destination);
     if(slot<0)destination={id:'home',label:ai.home.name,kind:'home',node:key(ai.home.sidewalk.x,ai.home.sidewalk.z)};
     else ai.slot=slot;
   }
   ai.destination=destination;
   if(destination.id==='home')homeIncoming.set(ai.home.id,p.id);
   const points=laneRoute(ai.current,destination.node);
   setPath(p,points,'travel');
   p.activity=destination.id==='home'?'Voltando para '+ai.home.name:'Caminhando até '+destination.label;
   emit('depart',p,destination.id);
 }
 function doorOpen(p){
   const d=p.ai.destination;
   if(d.id==='home')doors.openHome(p.ai.home,elapsed+4.5);
   if(d.id==='laboratorio')doors.openLab(elapsed+4.5);
 }
 function departHome(p){
   const ai=p.ai;
   doorLocks.set(ai.home.id,p.id);
   setPath(p,[ai.home.door.clone(),ai.home.sidewalk.clone()],'exitHome');
   p.activity='Saindo de '+ai.home.name;
   doors.openHome(ai.home,elapsed+5);
   emit('leaveHome',p,ai.home.id);
 }
 function arriveAtNode(p){
   const ai=p.ai,d=ai.destination;ai.current=d.node;
   if(d.id==='home'){
     if(doorLocks.has(ai.home.id)&&doorLocks.get(ai.home.id)!==p.id){
       ai.mode='waitDoor';ai.wait=1;p.motion=0;p.activity='Aguardando a porta de casa';return;
     }
     doorLocks.set(ai.home.id,p.id);
     doorOpen(p);
     setPath(p,[ai.home.door.clone(),homeSlot(p,ai.home)],'enterHome');
     p.activity='Entrando em '+ai.home.name;
   }else{
     let approach;
     if(d.id==='laboratorio'){
       const slot=d.slots[ai.slot];
       approach=[vector(slot.x,-18.84),slot.clone()];
     }else approach=[d.slots[ai.slot].clone()];
     if(d.id==='laboratorio')doorOpen(p);
     setPath(p,approach,'approach');
     p.activity='Chegando ao '+d.label;
   }
 }
 function startVisit(p){
   const ai=p.ai,d=ai.destination;
   setPath(p,[],d.id==='home'?'insideHome':'visit');
   ai.wait=d.id==='home'?18+(p.id%5)*4:d.duration+(p.id%3)*2;
   p.motion=0;
   p.activity=d.id==='home'?'Descansando em casa':d.id==='cafe'?'Comprando café':
     d.id==='feira'?'Escolhendo alimentos':d.id==='laboratorio'?'Pesquisando IoT':'Passeando no jardim';
   emit('arrive',p,d.id);
   if(d.id==='home'){
     doorLocks.delete(ai.home.id);homeIncoming.delete(ai.home.id);
     p.needs.energia=.1;p.stopsSinceHome=0;p.ai.request=false;
     emit('returnHome',p,ai.home.id);
   }
 }
 function finishVisit(p){
   const ai=p.ai,d=ai.destination;
   if(d.id==='home'){
     ai.mode='home';ai.wait=42+p.id%5*10;ai.destination=null;p.activity='Em casa';return;
   }
   if(d.kind==='food')p.needs.fome=.05;
   if(d.kind==='science')p.needs.curiosidade=.06;
   if(d.kind==='park')p.needs.energia=Math.max(.08,p.needs.energia-.32);
   p.lastDestination=d.id;p.stopsSinceHome++;ai.visits++;
   p.activity='Saindo de '+d.label;
   ai.mode='returning';
   // Everyone departs from their own assigned slot, then walks back to the sidewalk.
   const out=[nodes.get(d.node).clone()];
   if(d.id==='laboratorio'){out.unshift(vector(d.slots[ai.slot].x,-18.84));doors.openLab(elapsed+4.5);}
   setPath(p,out,'returning');
 }
 function resolveSeparation(){
   // Physics pass: no interpenetration on public sidewalks even during crowded turns.
   for(let pass=0;pass<2;pass++){
     for(let i=0;i<residents.length;i++)for(let j=i+1;j<residents.length;j++){
       const a=residents[i],b=residents[j];
       const ia=a.ai,ib=b.ai;
       if(ia.home===ib.home&&
          ['home','insideHome','exitHome','enterHome'].includes(ia.mode)&&
          ['home','insideHome','exitHome','enterHome'].includes(ib.mode))continue;
       let dx=a.g.position.x-b.g.position.x,dz=a.g.position.z-b.g.position.z;
       let dist=Math.hypot(dx,dz);
       if(dist>=STOP_GAP||dist>1.5)continue;
       if(dist<.0001){dx= a.id<b.id?1:-1;dz=0;dist=1;}
       const deficit=STOP_GAP-dist,ux=dx/dist,uz=dz/dist;
       const aStill=['home','insideHome','visit'].includes(ia.mode),
             bStill=['home','insideHome','visit'].includes(ib.mode);
       if(aStill&&bStill)continue;
       const weightA=aStill?0:bStill?1:.5;
       const shiftA=Math.min(.085,deficit*weightA),shiftB=Math.min(.085,deficit*(1-weightA));
       if(shiftA>0){
         const x=a.g.position.x+ux*shiftA,z=a.g.position.z+uz*shiftA;
         if(['exitHome','enterHome'].includes(ia.mode)||!isObstacle(x,z,.19)){
           a.g.position.x=x;a.g.position.z=z;
         }
       }
       if(shiftB>0){
         const x=b.g.position.x-ux*shiftB,z=b.g.position.z-uz*shiftB;
         if(['exitHome','enterHome'].includes(ib.mode)||!isObstacle(x,z,.19)){
           b.g.position.x=x;b.g.position.z=z;
         }
       }
     }
   }
 }
 function update(dt,{night=false}={}){
   elapsed+=dt;
   for(const p of residents){
     const ai=p.ai;
     p.needs.fome=Math.min(1,p.needs.fome+dt*.0018);
     p.needs.energia=Math.min(1,p.needs.energia+dt*.0013);
     p.needs.curiosidade=Math.min(1,p.needs.curiosidade+dt*.0017);
     if(ai.mode==='home'){
       p.motion=0;ai.wait-=dt;
       // One person per household on the road at once: no family crowd at the door.
       const familyOutside=residents.filter(o=>o!==p&&o.ai.home===ai.home&&
         !['home','insideHome'].includes(o.ai.mode)).length;
       if(ai.wait<=0&&familyOutside<2&&!doorLocks.has(ai.home.id))departHome(p);
     }else if(ai.mode==='exitHome'){
       if(advance(p,dt)){
         doorLocks.delete(ai.home.id);
         ai.current=key(ai.home.sidewalk.x,ai.home.sidewalk.z);plan(p,night);
       }
     }else if(ai.mode==='travel'){
       if(advance(p,dt))arriveAtNode(p);
     }else if(ai.mode==='waitDoor'){
       p.motion=0;
       if(!doorLocks.has(ai.home.id)){
         doorLocks.set(ai.home.id,p.id);
         doorOpen(p);
         setPath(p,[ai.home.door.clone(),homeSlot(p,ai.home)],'enterHome');
         p.activity='Entrando em '+ai.home.name;
       }
     }else if(ai.mode==='enterHome'||ai.mode==='approach'){
       if(ai.mode==='enterHome'||ai.destination.id==='laboratorio')doorOpen(p);
       if(advance(p,dt))startVisit(p);
     }else if(ai.mode==='visit'||ai.mode==='insideHome'){
       ai.wait-=dt;p.motion=0;
       if(ai.wait<=0)finishVisit(p);
     }else if(ai.mode==='returning'){
       if(advance(p,dt)){
         releaseSlot(ai);
         ai.current=ai.destination.node;ai.destination=null;
         plan(p,night);
       }
     }
   }
   resolveSeparation();
   return elapsed;
 }
 function requestHome(id){
   const p=people[id];if(!p?.ai)return false;
   const ai=p.ai;ai.request=true;
   if(ai.mode==='visit')ai.wait=Math.min(ai.wait,1.2);
   emit('requestHome',p,ai.home.id);
   return true;
 }
 return {
   update,requestHome,events,
   route:(a,b)=>laneRoute(a,b),
   places,
   getCitizen(id){
     const p=people[id];if(!p)return null;
     return {id,activity:p.activity||'Em movimento',home:p.ai?.home.name||null,
       phase:p.ai?.mode||(p.drivingCar?'driving':'working'),
       target:p.ai?.destination?.label||null,needs:p.needs||null,
       waiting:p.ai?.blocked>1};
   },
   getStats(){
     return {atHome:residents.filter(p=>p.ai.mode==='home'||p.ai.mode==='insideHome').length,
       onStreet:residents.filter(p=>['travel','returning','exitHome','enterHome'].includes(p.ai.mode)).length,
       visiting:residents.filter(p=>['visit','approach'].includes(p.ai.mode)).length,
       waiting:residents.filter(p=>p.ai.blocked>1).length,
       vendors:people.filter(p=>p.vendor).length,drivers:people.filter(p=>p.drivingCar).length};
   }
 };
}
