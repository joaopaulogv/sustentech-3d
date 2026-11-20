import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { iniciarHabitantes } from './habitantes.js';
import { criarMotorRotinas } from './rotinas.js';

// SUSTENTECH 11: praça viva, agentes com colisão e exploração jogável.
const SIZE=104, EDGE=SIZE/2, ROADS=[-26,26], ROAD_HALF=4.15;
const host=document.querySelector('#scene');
const scene=new THREE.Scene();
scene.background=new THREE.Color('#acdcd0');
scene.fog=new THREE.Fog('#acdcd0',175,360);
const camera=new THREE.PerspectiveCamera(43,1,0.1,350);
camera.position.set(70,65,78);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.38;
host.appendChild(renderer.domElement);
const labels=new CSS2DRenderer();
labels.domElement.className='npc-label-layer';
labels.domElement.style.position='absolute';
labels.domElement.style.inset='0';
labels.domElement.style.pointerEvents='none';
host.appendChild(labels.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;
controls.dampingFactor=.075;
controls.target.set(0,0,0);
controls.minDistance=18;
controls.maxDistance=290;
controls.maxPolarAngle=Math.PI/2.13;

const hemisphere=new THREE.HemisphereLight('#e7fff8','#628b63',2.05);
scene.add(hemisphere);
const sun=new THREE.DirectionalLight('#fff8e4',2.8);
sun.position.set(48,78,35);
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-110;sun.shadow.camera.right=110;
sun.shadow.camera.top=110;sun.shadow.camera.bottom=-110;
sun.shadow.camera.near=.5;sun.shadow.camera.far=190;
sun.shadow.bias=-.00015;
scene.add(sun);

const materials=new Map();
const lamps=[],panels=[],signals=[],infoObjects=[],cars=[],people=[];
const pointsOfInterest=[];
function material(color){
  if(!materials.has(color)) materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.76,metalness:.02}));
  return materials.get(color);
}
function addMesh(geometry,color,parent=scene){
  const obj=new THREE.Mesh(geometry,typeof color==='string'?material(color):color);
  obj.castShadow=true;obj.receiveShadow=true;parent.add(obj);return obj;
}
function box(w,h,d,color,x=0,y=0,z=0,parent=scene){
  const obj=addMesh(new THREE.BoxGeometry(w,h,d),color,parent);obj.position.set(x,y,z);return obj;
}
function ball(r,color,x=0,y=0,z=0,parent=scene){
  const obj=addMesh(new THREE.SphereGeometry(r,12,10),color,parent);obj.position.set(x,y,z);return obj;
}
function cylinder(top,bottom,h,color,x=0,y=0,z=0,parent=scene,sides=10){
  const obj=addMesh(new THREE.CylinderGeometry(top,bottom,h,sides),color,parent);obj.position.set(x,y,z);return obj;
}
function tag(obj,title,description){obj.userData.details={title,description};infoObjects.push(obj);return obj;}
function point(icon,title,description,x,y,z){pointsOfInterest.push({icon,title,description,x,y,z});}

// Plataforma e pavimentação urbana.
box(104,1.3,104,'#4e6559',0,-.75,0);
box(103.6,.1,103.6,'#86b98b',0,-.03,0);
for(const r of ROADS){
  box(104,.065,ROAD_HALF*2,'#414951',0,.14,r);
  box(ROAD_HALF*2,.065,104,'#414951',r,.14,0);
  for(const d of [-5.3,5.3]){
    box(104,.13,1.75,'#ced8cc',0,.17,r+d);
    box(1.75,.13,104,'#ced8cc',r+d,.17,0);
    box(104,.025,.1,'#ecf4de',0,.26,r+(d>0?4.5:-4.5));
    box(.1,.025,104,'#ecf4de',r+(d>0?4.5:-4.5),.26,0);
  }
  for(let p=-48;p<=48;p+=5){
    if(ROADS.every(c=>Math.abs(c-p)>6)){
      box(2.25,.024,.1,'#f5e4a0',p,.2,r);
      box(.1,.024,2.25,'#f5e4a0',r,.2,p);
    }
  }
}
for(const x of ROADS) for(const z of ROADS){
  // Faixas nos quatro braços dos cruzamentos, fora da área central.
  for(let i=-3;i<=3;i++){
    box(.48,.025,2.3,'#f7f5e8',x+i*.77,.23,z-6.65);
    box(.48,.025,2.3,'#f7f5e8',x+i*.77,.23,z+6.65);
    box(2.3,.025,.48,'#f7f5e8',x-6.65,.23,z+i*.77);
    box(2.3,.025,.48,'#f7f5e8',x+6.65,.23,z+i*.77);
  }
}
// SUSTENTECH 5: novos distritos em volta da cidade original.
// Os veículos continuam nas vias internas; as vias externas são cenário e circulação futura.
box(188,1.1,188,'#4e6559',0,-1.42,0);
box(187.4,.09,187.4,'#8ebf93',0,-.82,0);
for(const r of [-68,68]){
  box(188,.07,8.6,'#424c55',0,-.69,r);
  box(8.6,.07,188,'#424c55',r,-.69,0);
  for(const side of [-1,1]){
    box(188,.09,1.65,'#e0dfd3',0,-.62,r+side*5.3);
    box(1.65,.09,188,'#e0dfd3',r+side*5.3,-.62,0);
  }
  for(let d=-88;d<=88;d+=8){
    if(Math.abs(d)<5 || Math.abs(Math.abs(d)-68)<7)continue;
    box(2.7,.018,.11,'#f4db96',d,-.62,r);
    box(.11,.018,2.7,'#f4db96',r,-.62,d);
  }
}
const outerColors=['#e6c8aa','#b6d2d6','#d6c3e2','#e7d0ac','#c2d9ba','#a8cbd4'];
let districtCount=0;
for(let gx=-84;gx<=84;gx+=12){
  for(let gz=-84;gz<=84;gz+=12){
    if(Math.abs(gx)<53 && Math.abs(gz)<53)continue;
    if(Math.abs(Math.abs(gx)-68)<9 || Math.abs(Math.abs(gz)-68)<9)continue;
    if(Math.abs(gx)>88 || Math.abs(gz)>88)continue;
    const seed=Math.abs(Math.round(gx*7+gz*11));
    const height=5+(seed%6)*2.6;
    if(seed%7===0){
      box(8,.06,8,'#8fc695',gx,-.66,gz);
      for(const dx of [-2.6,2.6])for(const dz of [-2.6,2.6]){
        cylinder(.18,.27,2.2,'#806c50',gx+dx,.5,gz+dz);
        ball(1.55,'#4f9b71',gx+dx,2.3,gz+dz);
      }
    }else{
      const col=outerColors[seed%outerColors.length];
      box(7.7,height,7.7,col,gx,-.68+height/2,gz);
      box(8.2,.48,8.2,'#536e77',gx,-.43+height,gz);
      for(let level=2;level<height-1;level+=2.5){
        for(const dx of [-2.1,0,2.1]){
          box(1.25,1.45,.09,'#a4d6e4',gx+dx,level-.68,gz+3.9);
          box(1.25,1.45,.09,'#a4d6e4',gx+dx,level-.68,gz-3.9);
        }
      }
      if(seed%3===0){
        box(4,.25,4,'#294e65',gx,height+.05,gz);
        for(let k=-1;k<=1;k++)box(.05,.02,3.6,'#6db8d7',gx+k*1.1,height+.2,gz);
      }
    }
    districtCount++;
  }
}
// Praça de entrada: bancos e jardins com fontes solares.
for(const side of [-1,1]){
  box(18,.1,8,'#d8d7c7',side*81,-.64,0);
  for(const z of [-2.5,2.5]){
    box(3,.4,.85,'#986d53',side*81,-.17,z);
    box(3,.7,.17,'#986d53',side*81,.3,z-.4);
  }
}

// Parque central e calçadas que mantêm os pedestres fora das pistas.
box(40,.06,40,'#76b67e',0,.075,0);
for(const r of [12,18]){
  box(2*r+2,.12,2.3,'#e6dcc6',0,.16,-r);
  box(2*r+2,.12,2.3,'#e6dcc6',0,.16,r);
  box(2.3,.12,2*r+2,'#e6dcc6',-r,.16,0);
  box(2.3,.12,2*r+2,'#e6dcc6',r,.16,0);
  for(let tile=-r;tile<=r;tile+=2){
    for(const z of [-r,r])box(.065,.014,2.1,'#cabda4',tile,.238,z);
    for(const x of [-r,r])box(2.1,.014,.065,'#cabda4',x,.238,tile);
  }
}
// Fonte central.
cylinder(3.9,3.9,.45,'#ddd9d0',0,.32,0,scene,24);
cylinder(3.45,3.45,.1,'#53bdcf',0,.58,0,scene,24);
cylinder(.42,.65,2.35,'#d8e6d8',0,1.74,0,scene,12);
const fountainWater=ball(.8,'#8cdeef',0,3.05,0);fountainWater.scale.y=.5;
tag(fountainWater,'💧 Água e sustentabilidade','Uma cidade inteligente pode monitorar consumo de água, vazamentos e qualidade dos recursos hídricos.');
point('💧','Fonte inteligente','A fonte ilustra a importância do monitoramento do consumo de água e da detecção de vazamentos.',0,4.5,0);

// Vegetação e mobiliário.
function tree(x,z,large=false){
  cylinder(.19,.27,2.5,'#816246',x,1.32,z);
  const crown=ball(large?1.65:1.32,'#318d55',x,3.15,z);
  ball(large?1.1:.88,'#49aa65',x-.75,3.52,z+.15);
  ball(large?1.1:.9,'#247a4b',x+.72,3.3,z-.3);
  tag(crown,'🌳 Natureza urbana','Áreas verdes ajudam a reduzir o calor e tornam a cidade mais agradável para moradores e visitantes.');
}
for(const [x,z] of [[-6,-6],[6,-6],[-6,6],[6,6],[0,8],[8,0],[-8,0],[0,-8]]) tree(x,z,true);
for(const x of [-47,-32,32,47])for(const z of [-46,-35,-15,0,15,35,46]){
  if(ROADS.every(v=>Math.abs(z-v)>8))tree(x,z);
}
function bench(x,z,rotation=0){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;scene.add(g);
  box(2.2,.2,.65,'#925f43',0,.85,0,g);
  box(2.2,.75,.15,'#925f43',0,1.27,-.36,g);
  for(const v of [-.84,.84]) box(.12,.75,.14,'#3e4c4c',v,.43,0,g);
}
for(const p of [[-8,3,0],[8,-3,Math.PI],[3,8,Math.PI/2],[-3,-8,-Math.PI/2]])bench(...p);

function building(x,z,h,color,i){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  box(6.5,.45,6.5,'#b8c6b8',0,.2,0,g);
  const body=box(5.25,h,5.25,color,0,h/2+.45,0,g);
  tag(body,'🏙️ Prédio conectado','Edifícios inteligentes podem integrar sensores de presença, climatização e eficiência energética.');
  box(5.56,.22,5.56,'#344d56',0,h+.55,0,g);
  const floors=Math.floor((h-2)/2);
  for(let level=0;level<floors;level++){
    const y=1.9+level*1.92;
    for(const xx of [-1.68,-.55,.58,1.7]){
      box(.68,1.1,.075,'#8bcede',xx,y,2.67,g);
      box(.68,1.1,.075,'#9dc6d5',xx,y,-2.67,g);
      box(.075,1.1,.66,'#8bcede',2.67,y,xx,g);
    }
    box(5.35,.08,5.35,'#496b70',0,y-.82,0,g);
  }
  box(.95,1.5,.09,'#314d48',0,1.22,2.66,g);
  // Jardins verticais, antena e detalhes de telhado.
  if(i%3===0){
    for(let y=3;y<h-1;y+=3){
      box(.48,.26,.27,'#4f9462',-2.66,y,1.8,g);
    }
  }
  if(i%4===0){
    cylinder(.055,.065,2.25,'#c8e7e3',0,h+1.76,0,g);
    ball(.27,'#69f1ce',0,h+2.9,0,g);
  }else{
    box(2.6,.15,1.75,'#214d79',0,h+.78,0,g);
  }
}
function house(x,z,color,i){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  box(6.4,.35,6,'#b6c7ae',0,.16,0,g);
  const house=box(4.55,3.25,4.45,color,0,1.8,0,g);
  tag(house,'🏡 Casa automatizada','Moradias conectadas utilizam automação em iluminação, conforto térmico e segurança.');
  const roof=addMesh(new THREE.ConeGeometry(3.5,1.65,4),'#9c6553',g);
  roof.rotation.y=Math.PI/4;roof.position.y=4.28;
  box(.9,1.95,.1,'#486057',0,1.4,2.28,g);
  for(const u of [-1.25,1.25]){
    box(.79,.85,.1,'#a9dce7',u,2.2,2.29,g);
    box(.09,.9,.13,'#e4f0e8',u,2.2,2.37,g);
  }
  if(i%4===0){
    box(2.8,.12,1.7,'#1b527d',0,4.55,0,g);
  }
  ball(.6,'#4f9e5b',-2.8,.68,2.05,g);
}
let blockNum=0;
for(const x of [-44,-36,-15,15,36,44]){
  for(const z of [-44,-36,-15,15,36,44]){
    if(Math.abs(x)<20 && Math.abs(z)<20) continue;
    const palette=['#8eb4b7','#aeb4c9','#d8b5a3','#91bcb2','#bac3a8','#b9a7bc'];
    if(blockNum%4===0 || (Math.abs(x)>30&&Math.abs(z)>30)){
      building(x,z,8+((blockNum*7)%6)*2.2,palette[blockNum%palette.length],blockNum);
    }else house(x,z,['#eac9b4','#b4d5c4','#dfb6a8','#d9d4b6'][blockNum%4],blockNum);
    blockNum++;
  }
}
// Paisagismo da versão 6: canteiros, flores, esculturas e área de convivência.
function flowerBed(x,z){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  box(3.2,.28,1.25,'#e5d9bf',0,.23,0,g);
  box(2.9,.12,.98,'#487e53',0,.44,0,g);
  const petals=['#ffb3c1','#ffd98a','#f3f0d5','#b7a6f2'];
  for(let i=0;i<8;i++){
    const px=-1.2+(i%4)*.8,pz=i<4?-.23:.23;
    cylinder(.035,.035,.35,'#4d9e59',px,.68,pz,g,6);
    const flower=ball(.16,petals[(i+Math.round(x))%4<0?(i+Math.round(x))%4+4:(i+Math.round(x))%4],px,.91,pz,g);
    flower.scale.y=.55;
  }
}
for(const [x,z] of [[-9,-9],[9,-9],[-9,9],[9,9],[-3,9],[3,9]])flowerBed(x,z);
function recyclingStation(x,z){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  for(const [i,color] of ['#3299d1','#e5c454','#62bd7d'].entries()){
    box(.62,1.15,.67,color,(i-1)*.74,.67,0,g);
    box(.7,.11,.73,'#264e46',(i-1)*.74,1.28,0,g);
  }
  const sign=box(2.5,.45,.14,'#226f55',0,2.2,0,g);
  tag(sign,'♻️ Coleta seletiva','A separação de resíduos ajuda na reciclagem e reduz o impacto ambiental.');
}
recyclingStation(-13,13);recyclingStation(13,-13);
point('♻️','Coleta seletiva','As lixeiras coloridas representam a separação de materiais recicláveis.',-13,3.8,13);
// Coberturas fotovoltaicas de convivência no parque.
function shadeCanopy(x,z){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  for(const dx of [-2.1,2.1])for(const dz of [-1.3,1.3])cylinder(.09,.12,3.25,'#4c726b',dx,1.7,dz,g);
  box(5.1,.18,3.4,'#2a6575',0,3.42,0,g);
  for(const dx of [-1.5,-.5,.5,1.5])box(.045,.03,3.15,'#91d3e5',dx,3.54,0,g);
  box(2.1,.25,.75,'#9e795b',0,.7,0,g);
  box(2.1,.65,.14,'#9e795b',0,1.05,-.36,g);
}
shadeCanopy(-14,4);shadeCanopy(14,-4);
// Pequenas placas solares na praça, com sinalização informativa.
for(const [x,z] of [[-12,0],[12,0]]){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  cylinder(.08,.11,2.2,'#4c716e',0,1.17,0,g);
  const sign=box(1.8,.9,.12,'#236b70',0,2.45,0,g);
  tag(sign,'📡 Sensores urbanos','Os sensores IoT podem acompanhar luminosidade, temperatura e movimento.');
}

// Postes e painéis fotovoltaicos.
function lamp(x,z){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  cylinder(.10,.16,5,'#425c63',0,2.6,0,g);
  box(1.45,.14,.23,'#425c63',.65,5.05,0,g);
  const m=new THREE.MeshStandardMaterial({color:'#fff0c8',emissive:'#ffde9a',emissiveIntensity:0});
  const bulb=box(.5,.11,.37,m,1.2,4.95,0,g);
  const light=new THREE.PointLight('#ffe2a0',0,10);light.position.set(1.2,4.85,0);g.add(light);
  lamps.push({bulb,light});
  tag(bulb,'💡 Poste com sensor LDR','A luz pode acender de modo automático quando o ambiente escurece, economizando energia.');
}
for(const z of ROADS)for(const x of [-45,-35,-15,-5,5,15,35,45])lamp(x,z-5.45);
for(const x of ROADS)for(const z of [-44,-33,-14,14,33,44])lamp(x+5.45,z);
function solarPanel(x,z){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  cylinder(.12,.13,1.9,'#7595a0',0,1,0,g);
  const tilted=new THREE.Group();tilted.position.y=2.03;tilted.rotation.x=-.26;g.add(tilted);
  const p=box(3.8,.15,2.2,'#1b598b',0,0,0,tilted);
  for(const xx of [-1.15,0,1.15])box(.045,.025,2.13,'#a4d2ed',xx,.088,0,tilted);
  for(const zz of [-.52,.52])box(3.7,.025,.035,'#a4d2ed',0,.088,zz,tilted);
  panels.push(p);
  tag(p,'☀️ Painel solar','A geração solar mostrada no site é ilustrativa e não representa dados reais de sensores.');
}
for(const [x,z] of [[-42,-12],[42,-12],[-42,12],[42,12]])solarPanel(x,z);
point('☀️','Energia solar','Os painéis fotovoltaicos convertem luz solar em eletricidade. Nesta maquete os indicadores são ilustrativos.',-42,4,-12);
point('💡','Iluminação IoT','Postes inteligentes simulam o acionamento de lâmpadas conforme o ciclo dia e noite.',-35,7,-31);
point('🚦','Trânsito conectado','Os semáforos são coordenados para organizar o fluxo de veículos nos cruzamentos.',-26,7,-26);
point('🏡','Casas inteligentes','Casas automatizadas podem utilizar sensores de presença, temperatura e segurança.',15,7,15);
point('🏢','Edifícios eficientes','Edifícios inteligentes podem economizar energia por meio de sensores e automação.',-44,15,-44);
point('🌳','Parque sustentável','Áreas verdes reduzem ilhas de calor e melhoram o conforto urbano.',-7,6,7);

// Semáforos coordenados: eixos Leste-Oeste e Norte-Sul nunca têm verde ao mesmo tempo.
function signal(x,z,axis,angle=0){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=angle;scene.add(g);
  cylinder(.11,.17,4.2,'#38545a',0,2.2,0,g);
  const body=box(.86,2.2,.72,'#182b2b',0,4.15,0,g);
  tag(body,'🚦 Semáforos coordenados','Os quatro cruzamentos alternam a passagem entre ruas Leste-Oeste e Norte-Sul.');
  const bulbs={};
  [['red','#fc5150'],['yellow','#ffd55c'],['green','#5af3a0']].forEach(([state,color],i)=>{
    const m=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0});
    bulbs[state]=ball(.24,m,0,4.78-i*.64,.41,g);
  });
  signals.push({bulbs,axis});
}
for(const x of ROADS)for(const z of ROADS){
  signal(x-5.8,z-5.8,'x');
  signal(x+5.8,z+5.8,'x',Math.PI);
  signal(x-5.8,z+5.8,'z',Math.PI/2);
  signal(x+5.8,z-5.8,'z',-Math.PI/2);
}

// Veículos em faixas dedicadas. Cada carro conhece eixo, direção e velocidade.
function createCar(axis,road,dir,i){
  const c=new THREE.Group();scene.add(c);
  const color=['#ec746b','#e5bd69','#65b1d9','#87cfa5','#a590d7','#f19b75'][i%6];
  box(2.6,.69,1.15,color,0,.83,0,c);
  const glass=new THREE.MeshStandardMaterial({color:'#98dce7',metalness:.14,roughness:.24,transparent:true,opacity:.43,depthWrite:false});
  const cabin=box(1.32,.64,1.04,glass,-.12,1.42,0,c);cabin.castShadow=false;
  box(.22,.17,.14,'#fff9ca',1.27,.85,-.4,c);
  box(.22,.17,.14,'#fff9ca',1.27,.85,.4,c);
  box(.12,.17,.23,'#f56d69',-1.29,.85,-.39,c);
  box(.12,.17,.23,'#f56d69',-1.29,.85,.39,c);
  box(.17,.2,.72,'#dce9d0',1.26,.85,0,c);
  for(const u of [-.87,.87])for(const v of [-.62,.62]){
    const wheel=addMesh(new THREE.CylinderGeometry(.32,.32,.19,12),'#202d35',c);
    wheel.rotation.x=Math.PI/2;wheel.position.set(u,.43,v);
  }
  const lane=road+(dir>0?1.55:-1.55);
  const car={g:c,axis,road,dir,lane,pos:-42+(i%3)*29+(i%2)*1.1,speed:0,maxSpeed:4.2+((i%3)*.35),length:2.6};
  cars.push(car);return car;
}
for(const axis of ['x','z']) for(const r of ROADS)for(const dir of [1,-1]){
  for(let i=0;i<3;i++)createCar(axis,r,dir,i+(axis==='z'?3:0)+(r>0?2:0)+(dir<0?1:0));
}
function worldCar(c){
  if(c.axis==='x'){c.g.position.set(c.pos,0,c.lane);c.g.rotation.y=c.dir>0?0:Math.PI;}
  else{c.g.position.set(c.lane,0,c.pos);c.g.rotation.y=c.dir>0?-Math.PI/2:Math.PI/2;}
}
cars.forEach(worldCar);

// Perfis e figuras 3D com braços, cabelo, roupas, pele, mochilas e estados.
const npcGenders=['f','m','f','m','f','m','f','m','f','m','f','m'];
const skins=['#f2c5a2','#b77752','#deb08e','#81533e','#c6906a'];
const shirts=['#4c9eca','#e2966d','#78b987','#ae8bd0','#e6b861','#d87f99'];
const hairs=['#30261e','#614332','#171b27','#b78546','#593a2a'];
function createPedestrian(i){
  const g=new THREE.Group();scene.add(g);
  const shirt=shirts[i%shirts.length],skin=skins[(i*3)%skins.length],female=npcGenders[i%12]==='f';
  const torso=box(.63,1.1,.42,shirt,0,1.57,0,g);
  box(.44,.16,.27,'#e6e6d4',0,2.16,0,g);
  const neck=cylinder(.13,.13,.22,skin,0,2.23,0,g);
  const head=ball(.35,skin,0,2.52,0,g);
  const hairColor=hairs[(i*7)%hairs.length];
  const hair=ball(.35,hairColor,0,2.68,-.065,g);hair.scale.y=female?.78:.52;
  if(female){
    // Cabelo comprido visível de lado e atrás, sem esconder o rosto.
    const backHair=ball(.37,hairColor,0,2.36,-.24,g);backHair.scale.set(1,1.55,.7);
    for(const side of [-1,1]){const lock=ball(.12,hairColor,side*.29,2.34,-.12,g);lock.scale.y=2.2;}
  }else if(i%4===1){
    // Corte masculino curto com costeletas.
    for(const side of [-1,1])box(.075,.19,.17,hairColor,side*.32,2.53,-.04,g);
  }
  const eyes=[];
  for(const u of [-.13,.13]){
    const eye=ball(.035,'#20252c',u,2.54,.33,g);eyes.push(eye);
    ball(.012,'#ffffff',u-.011,2.558,.361,g);
    box(.11,.025,.025,'#4b3830',u,2.68,.31,g);
  }
  const mouth=box(.15,.026,.023,female?'#a85c60':'#593b36',0,2.37,.344,g);
  if(!female&&i%5===3)box(.24,.045,.035,'#614636',0,2.29,.32,g);
  const arms=[],legs=[];
  for(const side of [-1,1]){
    const a=new THREE.Group();a.position.set(side*.46,1.98,0);g.add(a);
    box(.21,.8,.23,shirt,0,-.4,0,a);
    ball(.12,skin,0,-.84,0,a);arms.push(a);
    const l=new THREE.Group();l.position.set(side*.18,1.02,0);g.add(l);
    box(.24,.82,.3,i%3===1?'#486578':'#344559',0,-.43,0,l);
    box(.29,.17,.46,'#2d3139',0,-.84,.095,l);legs.push(l);
  }
  if(i%5===0)box(.48,.72,.21,'#647c5e',0,1.56,-.34,g);
  if(!female&&i%7===0){
    cylinder(.4,.35,.13,hairColor,0,2.85,0,g,12);
  }
  // Personalidades visuais: golas, bolsos, pulseiras, tênis e acessórios.
  box(.22,.17,.03,'#f7f8ee',-.11,1.96,.223,g);
  box(.22,.17,.03,'#f7f8ee',.11,1.96,.223,g);
  if(i%3===0){box(.19,.23,.027,'#f0d3aa',.17,1.48,.233,g);box(.03,.1,.03,'#4a725a',.17,1.49,.256,g);}
  if(i%3===1){box(.56,.065,.045,'#f9ecd0',0,1.35,.24,g);}
  if(i%4===2){for(const side of [-1,1])box(.24,.1,.32,'#e7ece4',side*.18,.16,.12,g);}
  if(female&&i%4===0){const bag=box(.32,.55,.18,'#d4a86c',.53,1.24,.12,g);bag.rotation.z=.12;}
  if(i>=24){box(.53,.74,.032,i===24?'#fff5db':'#eef9db',0,1.48,.244,g);box(.3,.2,.045,'#88b39c',0,1.83,.263,g);}
  // Área de clique ampliada e invisível para facilitar selecionar pessoas pequenas.
  const hitbox=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,3.1,10),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
  hitbox.position.y=1.55;g.add(hitbox);
  // Anel de seleção, normalmente invisível.
  const ring=new THREE.Mesh(new THREE.RingGeometry(.56,.7,24),new THREE.MeshBasicMaterial({color:'#54efb3',side:THREE.DoubleSide,transparent:true,opacity:.92}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.17;ring.visible=false;g.add(ring);
  const track=i%2,side=track?18:12,perimeter=side*8;
  const p={g,arms,legs,eyes,head,mouth,speakingUntil:0,ring,track,side,perimeter,distance:Math.floor(i/2)*perimeter/12,speed:1.08+(i%5)*.08,offset:i*.56,state:'walking',mood:['alegre','calmo','curioso','concentrado'][i%4],id:i,gender:female?'f':'m',visitStage:'walking',visitCooldown:0,visitProgress:0};
  people.push(p);
}
for(let i=0;i<26;i++)createPedestrian(i);
function pathAt(t,side){
  const length=side*2;
  const d=((t%(length*4))+length*4)%(length*4);
  if(d<length)return {x:-side+d,z:-side,heading:Math.PI/2};
  if(d<length*2)return {x:side,z:-side+d,heading:0};
  if(d<length*3)return {x:side-(d-length*2),z:side,heading:-Math.PI/2};
  return{x:-side,z:side-(d-length*3),heading:Math.PI};
}
function applyPedestrian(p){
  const at=pathAt(p.distance,p.side);
  p.g.position.set(at.x,.04,at.z);
  p.g.rotation.y=at.heading;
}
// Os moradores serão inicializados dentro de suas casas, não em pontos aleatórios da rua.

// Pavilhão de pesquisa: moradores entram por uma porta real, permanecem dentro e retornam.
const pavilion=new THREE.Group();pavilion.position.set(0,0,-20.3);scene.add(pavilion);
box(4.2,3.15,2.6,'#d6e6d5',0,1.66,0,pavilion);
box(4.65,.3,3.05,'#376e68',0,3.34,0,pavilion);
box(1.15,2.25,.07,'#0d2928',0,1.21,1.35,pavilion);
const pavilionDoorPivot=new THREE.Group();pavilionDoorPivot.position.set(-.49,0,1.41);pavilion.add(pavilionDoorPivot);
const pavilionDoor=box(.98,2.1,.09,'#4d9b87',.49,1.2,0,pavilionDoorPivot);
const pavilionSign=box(3.1,.42,.12,'#175747',0,2.95,1.43,pavilion);
tag(pavilionSign,'🔬 Centro de pesquisa','Os moradores podem visitar o laboratório para estudar sensores, energia e sustentabilidade.');
point('🔬','Centro de pesquisa','Observe os moradores entrando no laboratório! Aqui são simuladas pesquisas sobre sensores IoT e sustentabilidade.',0,4.3,-20.3);
// Rotinas autônomas locais: decisões baseadas em horários, destinos e tarefas.
// Não chamamos o Gemini a cada frame; a IA generativa permanece exclusiva dos diálogos.
const shopLabels=[];
function foodStall(x,z,title,color,icon){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=Math.PI;scene.add(g);
  // Fachada voltada para o passeio. O balcão fica fora da pista de pedestres.
  box(4.65,.20,2.8,'#d4bd9b',0,.18,0,g);
  box(3.8,1.12,1.25,'#b88c68',0,.78,-.28,g);
  box(4.4,.24,1.75,'#f5e3c2',0,1.42,.15,g);
  for(const dx of [-1.8,1.8])cylinder(.065,.065,2.4,'#516d61',dx,2.55,-.65,g);
  box(4.9,.26,2.8,color,0,3.82,-.5,g);
  for(let i=0;i<5;i++)box(.88,.37,.19,i%2?'#fff1d7':color,-1.95+i*.97,3.56,.91,g);
  for(let stripe=-2;stripe<=2;stripe++)box(.63,.018,2.44,stripe%2?'#fff1db':color,stripe*.93,3.96,-.48,g);
  box(1.4,.88,.12,'#19463b',-1.05,2.3,.92,g);
  for(const yy of [2.1,2.3,2.5])box(.88,.035,.03,'#f9daa3',-1.05,yy,1,g);
  for(const xx of [.68,1.34,1.98]){
    cylinder(.31,.34,.25,'#b88b60',xx-1.1,1.55,.53,g,8);
    ball(.19,xx>1.6?'#dd9d58':'#eec783',xx-1.1,1.81,.53,g);
  }
  for(const edge of [-2.2,2.2]){
    cylinder(.23,.29,.7,'#866851',edge,.5,.35,g);
    ball(.39,'#4c995a',edge,.99,.35,g);
  }
  const board=box(3.8,.52,.14,'#194b3c',0,2.9,.93,g);
  tag(board,icon+' '+title,'Loja com atendente, compras simuladas e moradores que fazem visitas durante suas rotinas.');
  const sign=document.createElement('div');sign.className='scene-shop-name';sign.textContent=icon+' '+title;
  const signLabel=new CSS2DObject(sign);signLabel.position.set(0,4.65,0);g.add(signLabel);
  shopLabels.push({element:sign,group:g});

  for(let i=0;i<5;i++)ball(.15,['#e6b867','#c95c4d','#80b96b'][i%3],-1.35+i*.67,1.62,.58,g);
  point(icon,title,'Os moradores visitam esta loja para comprar alimentos. O atendimento e as rotinas são simulados localmente.',x,5,z);
}
foodStall(-6,-8.9,'CAFÉ VERDE','#e2a073','☕');
foodStall(6,-8.9,'FEIRA VIVA','#5ec395','🥗');
// Bairro residencial: casas transparentes (estilo maquete) e portas articuladas.
// As entradas ficam ligadas às calçadas; nenhum morador atravessa uma parede sólida.
const residences=[],doorOpenUntil=new Map();
let labDoorOpenUntil=0;
const homeColors=['#e6c8aa','#b6d2d6','#d8c1a6','#c3d4e6','#e5c8d2','#cbd8b5'];
function makeResidence(x,z,angle,index){
 const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=angle;scene.add(g);
 const facade=homeColors[index];
 const glass=new THREE.MeshStandardMaterial({color:facade,roughness:.68,transparent:true,opacity:.63,depthWrite:false});
 const roofMat=new THREE.MeshStandardMaterial({color:'#976450',roughness:.8,transparent:true,opacity:.46,depthWrite:false});
 box(3.8,.22,4.65,'#e9e3d4',0,.18,0,g);
 box(.13,3.15,4.65,glass,-1.86,1.75,0,g);
 for(const side of [-1,1])box(3.7,3.15,.14,glass,0,1.75,side*2.25,g);
 for(const side of [-1,1])box(.14,3.15,1.69,glass,1.86,1.75,side*1.45,g);
 box(.14,1.07,1.13,facade,1.86,2.90,0,g);
 const hinge=new THREE.Group();hinge.position.set(1.91,0,-.54);g.add(hinge);
 box(.13,2.13,1.08,'#3a806a',0,1.23,.54,hinge);
 ball(.07,'#f3c979',.1,1.24,.81,hinge);
 const roof=addMesh(new THREE.ConeGeometry(3.52,1.3,4),roofMat,g);
 roof.position.y=4.1;roof.rotation.y=Math.PI/4;roof.castShadow=false;
 // Interiores: mesa, sofá, estante e plantas visíveis através do material translúcido.
 box(1.15,.38,.74,'#a18065',-.55,.53,-1.1,g);
 box(.28,.75,.2,'#e8f6df',-1,.85,-1.1,g);
 box(.95,.24,.63,'#d2a18a',-.5,.52,1.25,g);
 box(.95,.62,.13,'#d2a18a',-.94,.85,1.25,g);
 ball(.3,'#58a06b',-1.15,.52,-1.76,g);
 box(.14,.9,.9,'#9cdbe5',1.91,2.64,-1.42,g);
 box(.14,.9,.9,'#9cdbe5',1.91,2.64,1.42,g);
 box(1.43,.07,1.2,'#dce4d8',2.5,.17,0,g);
 const pointAt=(lx,lz=0)=>new THREE.Vector3(x+lx*Math.cos(angle)+lz*Math.sin(angle),.04,z-lx*Math.sin(angle)+lz*Math.cos(angle));
 const home={id:'casa-'+(index+1),name:'Casa '+String(index+1).padStart(2,'0'),group:g,hinge,
    sidewalk:pointAt(3),door:pointAt(1.96),inside:pointAt(.46),
    side:{x:Math.sin(angle),z:Math.cos(angle)},angle,index};
 residences.push(home);
 point('🏡',home.name,'Esta casa tem moradores, porta funcional e uma rotina de saídas e retornos.',x,5.2,z);
 return home;
}
makeResidence(15,-6,0,0);
makeResidence(15,6,0,1);
makeResidence(-15,-6,Math.PI,2);
makeResidence(-15,6,Math.PI,3);
makeResidence(-6,15,-Math.PI/2,4);
makeResidence(6,15,-Math.PI/2,5);

// Motoristas são os próprios NPCs, ligados ao modelo 3D do carro.
for(const [id,carIndex] of [[7,2],[11,5]]){
 const p=people[id],car=cars[carIndex];
 car.g.add(p.g);p.g.position.set(-.2,.74,.12);p.g.rotation.y=Math.PI/2;p.g.scale.setScalar(.42);
 p.drivingCar=car;p.state='driving';p.activity='Dirigindo pela cidade';car.g.userData.npcId=id;
}
const vendors=[people[24],people[25]];
vendors[0].vendor='café';vendors[1].vendor='feira';
vendors[0].g.position.set(-6,.04,-8.15);vendors[0].g.rotation.y=Math.PI;
vendors[1].g.position.set(6,.04,-8.15);vendors[1].g.rotation.y=Math.PI;
for(const p of vendors){p.state='working';p.routine='working';p.activity='Atendendo clientes';}
const rotinaIA=criarMotorRotinas({
 THREE,people,homes:residences,
 obstacles:[
   {type:'circle',x:0,z:0,radius:3.92},
   {type:'box',x:-6,z:-8.9,halfX:2.36,halfZ:1.29},
   {type:'box',x:6,z:-8.9,halfX:2.36,halfZ:1.29},
   ...[[-6,-6],[6,-6],[-6,6],[6,6],[0,8],[8,0],[-8,0],[0,-8]]
     .map(([x,z])=>({type:'circle',x,z,radius:.31})),
   ...[[-9,-9],[9,-9],[-9,9],[9,9],[-3,9],[3,9]]
     .map(([x,z])=>({type:'box',x,z,halfX:1.58,halfZ:.65}))
 ],
 doors:{openHome:(home,until)=>doorOpenUntil.set(home.id,until),
   openLab:until=>{labDoorOpenUntil=until}},
 onEvent:e=>document.dispatchEvent(new CustomEvent('sustentech:agent',{detail:e}))
});

// UI: mantém controles originais.
const $=id=>document.getElementById(id);
const ui={day:$('dayToggle'),lights:$('lightsToggle'),traffic:$('trafficToggle'),solar:$('solarToggle'),auto:$('autoMode'),manual:$('manualMode'),state:$('signalState'),count:$('countdown'),duration:$('greenDuration')};
let night=false,automatic=true,phase='green',remaining=12;
function durations(){return{green:THREE.MathUtils.clamp(Number(ui.duration.value)||12,3,60),yellow:3,red:13};}
function axisState(axis){
  if(axis==='x')return phase;
  if(phase==='red')return automatic?(remaining<=1.7?'red':remaining<=4.3?'yellow':'green'):'green';
  return 'red';
}
function updateUI(){
  scene.background.set(night?'#101e32':'#acdcd0');
  scene.fog.color.set(night?'#101e32':'#acdcd0');
  hemisphere.intensity=night?.55:2.05;sun.intensity=night?.35:2.8;
  const lightOn=night&&ui.lights.checked;
  lamps.forEach(({bulb,light})=>{bulb.material.emissiveIntensity=lightOn?2.4:0;light.intensity=lightOn?2.6:0;});
  panels.forEach(p=>p.material.color.set(ui.solar.checked?'#1b598b':'#50616b'));
  signals.forEach(({axis,bulbs})=>{
    const active=axisState(axis);
    for(const [key,bulb] of Object.entries(bulbs))bulb.material.emissiveIntensity=key===active?3.6:.06;
  });
  $('sceneStatus').textContent=night?'🌙 Noite':'☀️ Dia';
  $('lightMetric').textContent=`${lightOn?lamps.length:0}/${lamps.length}`;
  $('solarMetric').textContent=night||!ui.solar.checked?'0%':'75%';
  $('trafficMetric').textContent=ui.traffic.checked?'Ativo':'Pausado';
  $('npcMetric').textContent=String(people.length);
  ui.state.textContent={green:'Verde Leste–Oeste',yellow:'Amarelo Leste–Oeste',red:'Verde Norte–Sul'}[phase];
  ui.count.textContent=automatic?`${Math.ceil(remaining)}s`:'Manual';
  ui.auto.classList.toggle('active',automatic);ui.manual.classList.toggle('active',!automatic);
  document.querySelectorAll('[data-signal]').forEach(b=>{b.disabled=automatic;b.classList.toggle('selected',b.dataset.signal===phase);});
}
function setPhase(value){phase=value;remaining=durations()[phase];updateUI();}
ui.day.onclick=()=>{night=!night;ui.day.textContent=night?'Dia':'Noite';updateUI();};
[ui.lights,ui.traffic,ui.solar].forEach(input=>input.onchange=updateUI);
ui.auto.onclick=()=>{automatic=true;setPhase('green');};
ui.manual.onclick=()=>{automatic=false;setPhase(phase);};
document.querySelectorAll('[data-signal]').forEach(b=>{b.onclick=()=>{if(!automatic)setPhase(b.dataset.signal);};});
ui.duration.onchange=()=>{ui.duration.value=durations().green;if(automatic&&phase==='green')remaining=durations().green;updateUI();};
$('resetCamera').onclick=()=>{if(inhabitants?.isFollowing())inhabitants.stopFollow();camera.position.set(70,65,78);controls.target.set(0,0,0);controls.update();};

// Movimento no espaço circular da avenida: sem ultrapassar e sem encostar.
function ahead(a,b,dir){return (((b-a)*dir)%SIZE+SIZE)%SIZE;}
function intersectionOccupied(car,cross){
  const otherAxis=car.axis==='x'?'z':'x';
  return cars.some(o=>o.axis===otherAxis &&
    Math.abs(o.pos-car.road)<5.9 &&
    Math.abs(o.lane-cross)<4.1);
}
function updateCars(dt){
  if(!ui.traffic.checked)return;
  const initial=cars.map(c=>({c,pos:c.pos}));
  for(const c of cars){
    let free=SIZE;
    for(const other of initial){
      if(other.c===c || other.c.axis!==c.axis || other.c.road!==c.road || other.c.dir!==c.dir)continue;
      const d=ahead(c.pos,other.pos,c.dir);
      if(d>.001)free=Math.min(free,d-c.length);
    }
    // Zera a velocidade se o veículo à frente está perto.
    const safe=4.2;
    let target=Math.min(c.maxSpeed,Math.max(0,(free-safe)*.9));
    let stopDistance=Infinity;
    for(const junction of ROADS){
      const stop=junction-c.dir*6.7;
      const distance=ahead(c.pos,stop,c.dir);
      if(distance>25)continue;
      if(axisState(c.axis)!=='green'||intersectionOccupied(c,junction)){
        stopDistance=Math.min(stopDistance,distance);
      }
    }
    if(stopDistance!==Infinity){
      target=Math.min(target,Math.sqrt(2*4.4*Math.max(0,stopDistance-.15)));
      if(stopDistance<.2)target=0;
    }
    const accel=target>c.speed?2.9:6.5;
    c.speed+=THREE.MathUtils.clamp(target-c.speed,-accel*dt,accel*dt);
    let step=Math.min(c.speed*dt,Math.max(0,free-safe));
    if(stopDistance!==Infinity)step=Math.min(step,Math.max(0,stopDistance-.17));
    c.pos+=c.dir*step;
    if(c.pos>EDGE)c.pos-=SIZE;
    if(c.pos< -EDGE)c.pos+=SIZE;
    worldCar(c);
  }
}
// Rotas calculadas por calçadas, sem teleportar moradores.
function updatePedestrians(dt,time){
 if(!ui.traffic.checked)return;
 const hour=(8+time/20)%24;
 rotinaIA.update(dt,{night:night||hour>=20||hour<6});
}
function animateResidents(dt,time){
 for(const p of people){
   const walking=p.drivingCar?0:(p.motion||0);
   const swing=walking>.08?Math.sin(time*7.8+p.offset)*Math.min(.42,.23*walking):0;
   p.legs[0].rotation.x=swing;p.legs[1].rotation.x=-swing;
   p.arms[0].rotation.x=-swing*.8;p.arms[1].rotation.x=swing*.8;
   if(p.vendor){
     p.arms[0].rotation.x=-.55+Math.sin(time*2.7+p.id)*.34;
     p.head.rotation.y=Math.sin(time*.6+p.id)*.12;
   }
   if(p.speakingUntil>Date.now())p.arms[1].rotation.x=-.2+Math.sin(time*3+p.id)*.25;
   if(!p.drivingCar){
     p.g.position.y=.04+(walking>.08?Math.abs(Math.sin(time*7.8+p.offset))*.048:0);
     p.head.rotation.z=Math.sin(time*2.5+p.offset)*.017;
   }
   if(p.eyes){
     const blink=Math.sin(time*.95+p.id*2.8)>.986?.1:1;
     for(const eye of p.eyes)eye.scale.y=blink;
   }
   if(p.mouth){
     const speaking=p.speakingUntil>Date.now();
     p.mouth.scale.y=speaking?2+Math.abs(Math.sin(time*16+p.id))*4:1;
   }
 }
 const t=simulationTime;
 for(const home of residences){
   const angle=t<(doorOpenUntil.get(home.id)||0)?-.98:0;
   home.hinge.rotation.y=THREE.MathUtils.damp(home.hinge.rotation.y,angle,4.3,dt);
 }
 const labAngle=t<labDoorOpenUntil?-.94:0;
 pavilionDoorPivot.rotation.y=THREE.MathUtils.damp(pavilionDoorPivot.rotation.y,labAngle,4.3,dt);
}

// Missões do visitante: cada objetivo depende de interação real.
const gameMissions=new Set();let gameTimer=0;
let collectedEnergy=0;
function completeMission(id){
 if(gameMissions.has(id))return;
 gameMissions.add(id);
 const card=document.querySelector('[data-mission="'+id+'"]');
 if(card){card.classList.add('done');const check=card.querySelector('.mission-check');if(check)check.textContent='✓';}
 const xp=gameMissions.size*50;
 const xpNode=document.getElementById('gameXp'),count=document.getElementById('gameCount'),badge=document.getElementById('gameBadge');
 if(xpNode)xpNode.textContent=xp+' XP';
 if(count)count.textContent=gameMissions.size+'/5';
 if(badge)badge.textContent=gameMissions.size===5?'Explorador da cidade ★':'Explorador · Nível '+(1+Math.floor(xp/100));
 document.getElementById('sceneMessage').textContent='✦ Missão concluída — +50 XP';
}
function updateGameState(dt,time){
 gameTimer+=dt;if(gameTimer<.8)return;gameTimer=0;
 const hour=(8+time/20)%24;
 const clock=document.getElementById('simClock');
 if(clock)clock.textContent=String(Math.floor(hour)).padStart(2,'0')+':'+String(Math.floor(hour*60)%60).padStart(2,'0');
 const stats=rotinaIA.getStats(),label=document.getElementById('gameStats');
 if(label)label.textContent=stats.atHome+' em casa · '+stats.onStreet+' caminhando · '+stats.visiting+' em atividade';
}
document.addEventListener('sustentech:talk',()=>completeMission('talk'));
document.addEventListener('sustentech:agent',e=>{
 if(e.detail.type==='requestHome')completeMission('request');
 if(e.detail.type==='returnHome'&&inhabitants?.isFollowingPerson?.(e.detail.id))completeMission('home');
});
document.getElementById('gameToggle')?.addEventListener('click',()=>document.getElementById('gameWidget')?.classList.toggle('collapsed'));

// Interação dos moradores: balões 3D e formulário de conversa dentro do visor.
const inhabitants=iniciarHabitantes({people,renderer,camera,host,labels,controls});

// Jogo: coletar energia clicando nos cristais suspensos acima dos jardins.
const energyOrbs=[];
const orbMaterial=new THREE.MeshStandardMaterial({
 color:'#8bffbe',emissive:'#2bff96',emissiveIntensity:1.25,
 metalness:.28,roughness:.18
});
const orbPositions=[[-9,-9],[9,-9],[-9,9],[9,9],[-3,9],[3,9]];
for(let i=0;i<orbPositions.length;i++){
 const [x,z]=orbPositions[i],g=new THREE.Group();
 g.position.set(x,1.65,z);scene.add(g);
 const crystal=addMesh(new THREE.OctahedronGeometry(.43),orbMaterial,g);
 crystal.userData.orbIndex=i;crystal.castShadow=false;
 const halo=new THREE.Mesh(new THREE.TorusGeometry(.62,.038,5,24),
   new THREE.MeshBasicMaterial({color:'#94ffd0',transparent:true,opacity:.7}));
 halo.rotation.x=Math.PI/2;g.add(halo);
 energyOrbs.push({g,crystal,halo,taken:false,offset:i});
}
function collectEnergyOrb(i){
 const orb=energyOrbs[i];
 if(!orb||orb.taken)return;
 orb.taken=true;orb.g.visible=false;collectedEnergy++;
 const label=document.getElementById('energyCount');
 if(label)label.textContent=collectedEnergy+'/'+energyOrbs.length;
 document.getElementById('sceneMessage').textContent='⚡ Energia coletada! '+collectedEnergy+'/'+energyOrbs.length;
 if(collectedEnergy===energyOrbs.length)completeMission('collect');
}
function animateEnergyOrbs(t){
 for(const orb of energyOrbs){
   if(orb.taken)continue;
   orb.g.position.y=1.66+Math.sin(t*2+orb.offset)*.28;
   orb.crystal.rotation.y+=.015;
   orb.crystal.rotation.z+=.006;
   orb.halo.rotation.z+=.012;
 }
}

// Marcadores interativos flutuam no cenário 3D e abrem informações no próprio visor.
const poiLayer=document.createElement('div');poiLayer.className='poi-layer';host.appendChild(poiLayer);
const poiCard=document.createElement('section');poiCard.className='poi-card';poiCard.hidden=true;
poiCard.innerHTML='<button class="poi-close" aria-label="Fechar informações">×</button><div class="poi-card-icon"></div><h3></h3><p></p>';
host.appendChild(poiCard);
poiCard.querySelector('button').onclick=()=>{poiCard.hidden=true;};
const poiButtons=pointsOfInterest.map((poi,index)=>{
  const button=document.createElement('button');button.className='poi-marker';button.type='button';button.title='Clique para conhecer: '+poi.title;
  button.setAttribute('aria-label','Informações: '+poi.title);
  button.innerHTML='<span class="poi-marker-icon"></span><span class="poi-marker-label"></span>';
  button.querySelector('.poi-marker-icon').textContent=poi.icon;
  button.querySelector('.poi-marker-label').textContent=poi.title;
  button.onclick=()=>{
    poiCard.querySelector('.poi-card-icon').textContent=poi.icon;
    poiCard.querySelector('h3').textContent=poi.title;
    poiCard.querySelector('p').textContent=poi.description;
    poiCard.hidden=false;
    document.querySelector('#sceneMessage').textContent='📍 '+poi.title+' — informação aberta no mapa';
    button.classList.add('visited');
    if(/Café|Feira|Alimentos/i.test(poi.title))completeMission('shop');
  };
  poiLayer.appendChild(button);return button;
});
const poiWorld=new THREE.Vector3();
function updatePOI(){
 const w=host.clientWidth,h=host.clientHeight;
 const candidates=[],temp=new THREE.Vector3(),position=new THREE.Vector3();
 for(let i=0;i<pointsOfInterest.length;i++){
   const poi=pointsOfInterest[i];
   position.set(poi.x,poi.y,poi.z);
   const distance=camera.position.distanceTo(position);
   temp.copy(position).project(camera);
   const inView=temp.z>-1&&temp.z<1&&Math.abs(temp.x)<.92&&Math.abs(temp.y)<.88&&distance<100;
   poiButtons[i].hidden=true;
   if(!inView)continue;
   candidates.push({i,distance,x:(temp.x+1)*.5*w,y:(1-temp.y)*.5*h});
 }
 candidates.sort((a,b)=>a.distance-b.distance);
 const placed=[];
 for(const target of candidates){
   if(placed.length>=9)break;
   if(placed.some(p=>Math.hypot(p.x-target.x,p.y-target.y)<72))continue;
   const button=poiButtons[target.i];
   button.hidden=false;button.style.left=target.x+'px';button.style.top=target.y+'px';
   placed.push(target);
 }
 for(const label of shopLabels){
   label.group.getWorldPosition(position);
   label.element.hidden=camera.position.distanceTo(position)>47;
 }
}

const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let down=null;
renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
renderer.domElement.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  const foundOrb=raycaster.intersectObjects(energyOrbs.filter(o=>!o.taken).map(o=>o.crystal),false)[0];
  if(foundOrb){collectEnergyOrb(foundOrb.object.userData.orbIndex);return;}
  const hit=raycaster.intersectObjects(infoObjects)[0];
  if(hit){const d=hit.object.userData.details;const info=$('info');info.replaceChildren();
    const eyebrow=document.createElement('span');eyebrow.className='eyebrow';eyebrow.textContent='TECNOLOGIA SUSTENTECH';
    const title=document.createElement('h3');title.textContent=d.title;
    const p=document.createElement('p');p.textContent=d.description;
    info.append(eyebrow,title,p);}
});

function resize(){
  const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
  camera.aspect=w/h;camera.updateProjectionMatrix();
  renderer.setSize(w,h);labels.setSize(w,h);
}
new ResizeObserver(resize).observe(host);resize();
const clock=new THREE.Clock();let time=0,simulationTime=0;
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);time+=dt;
  if(ui.traffic.checked)simulationTime+=dt;
  if(automatic){
    const oldState=axisState('z');
    remaining-=dt;
    if(remaining<=0)setPhase(phase==='green'?'yellow':phase==='yellow'?'red':'green');
    else{
      ui.count.textContent=`${Math.ceil(remaining)}s`;
      if(oldState!==axisState('z'))updateUI();
    }
  }
  updateCars(dt);
  updatePedestrians(dt,time);
  animateResidents(dt,time);
  updateGameState(dt,time);
  animateEnergyOrbs(time);
  if(inhabitants?.updateCamera)inhabitants.updateCamera(dt);
  if(fountainWater)fountainWater.position.y=3.05+Math.sin(time*2)*.13;
  controls.update();
  renderer.render(scene,camera);labels.render(scene,camera);updatePOI();
}
// Comandos de navegação da nova interface de exploração.
window.sustentech={
  setView(view){
    if(inhabitants?.isFollowing())inhabitants.stopFollow();
    const presets={
      intro:{position:[70,65,78],target:[0,0,0]},
      aerial:{position:[110,106,116],target:[0,0,0]},
      street:{position:[25,14,37],target:[0,2,0]},
      park:{position:[37,42,41],target:[0,0,0]}
    };
    const preset=presets[view]||presets.park;
    controls.target.set(...preset.target);
    camera.position.set(...preset.position);
    controls.update();
    document.querySelector('#sceneMessage').textContent={
      intro:'✦ Uma cidade. Mil histórias.',
      aerial:'◈ Vista aérea da cidade',
      street:'⌁ Explorando as ruas',
      park:'♧ Passeando pelo parque'
    }[view]||'Explore o mundo';
  },
  meetPerson(){inhabitants?.selectPerson?.(0);},
  stopFollow(){inhabitants?.stopFollow?.();},
  sendHome(id){return rotinaIA.requestHome(id);},
  getCitizen(id){return rotinaIA.getCitizen(id);},
  getWorldStats(){return rotinaIA.getStats();},
  getVersion(){return '11.0.0';}
};
updateUI();animate();
