import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { iniciarHabitantes } from './habitantes.js';

// SUSTENTECH 5.0: cidade expandida, IA, visual low-poly e mobilidade com segurança.
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
  box(2*r+.9,.12,.85,'#dfd5b9',0,.16,-r);
  box(2*r+.9,.12,.85,'#dfd5b9',0,.16,r);
  box(.85,.12,2*r+.9,'#dfd5b9',-r,.16,0);
  box(.85,.12,2*r+.9,'#dfd5b9',r,.16,0);
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
for(const [x,z] of [[-11,-11],[11,-11],[-11,11],[11,11],[-3,11],[3,-11]])flowerBed(x,z);
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
for(const [x,z] of [[-6,-15],[6,-15],[-6,15],[6,15]])solarPanel(x,z);
point('☀️','Energia solar','Os painéis fotovoltaicos convertem luz solar em eletricidade. Nesta maquete os indicadores são ilustrativos.',6,4,-15);
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
  for(const u of [-.13,.13]){
    const eye=ball(.035,'#20252c',u,2.54,.33,g);eyes.push(eye);
    ball(.012,'#ffffff',u-.011,2.558,.361,g);
    box(.11,.025,.025,'#4b3830',u,2.68,.31,g);
  }
  const mouth=box(.15,.026,.023,female?'#a85c60':'#593b36',0,2.37,.344,g);
  if(!female&&i%5===3)box(.24,.045,.035,'#614636',0,2.29,.32,g);
  const eyes=[];
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
people.forEach(applyPedestrian);
for(const p of people){p.nextDestination=null;p.routineIndex=0;p.visitCooldown=8+p.id*1.4;}

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
function foodStall(x,z,title,color,icon){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  box(4.4,.23,2.5,'#d6c2a3',0,.18,0,g);
  box(3.8,1.12,1.25,'#b88c68',0,.78,-.28,g);
  box(4.4,.24,1.75,'#f5e3c2',0,1.42,.15,g);
  for(const dx of [-1.8,1.8])cylinder(.065,.065,2.4,'#516d61',dx,2.55,-.65,g);
  box(4.9,.26,2.8,color,0,3.82,-.5,g);
  for(let i=0;i<5;i++)box(.88,.37,.19,i%2?'#fff1d7':color,-1.95+i*.97,3.56,.91,g);
  const board=box(3.8,.52,.14,'#194b3c',0,2.9,.93,g);
  tag(board,icon+' '+title,'Loja com atendente, compras simuladas e moradores que fazem visitas durante suas rotinas.');
  const sign=document.createElement('div');sign.className='scene-shop-name';sign.textContent=icon+' '+title;
  const signLabel=new CSS2DObject(sign);signLabel.position.set(0,4.65,0);g.add(signLabel);

  for(let i=0;i<5;i++)ball(.15,['#e6b867','#c95c4d','#80b96b'][i%3],-1.35+i*.67,1.62,.58,g);
  point(icon,title,'Os moradores visitam esta loja para comprar alimentos. O atendimento e as rotinas são simulados localmente.',x,5,z);
}
foodStall(-6,-13.8,'CAFÉ VERDE','#eaa66f','☕');
foodStall(6,-13.8,'FEIRA VIVA','#55c991','🥗');
// Residência habitada — uma porta articulada e caminho real até a calçada.
const home=new THREE.Group();home.position.set(14.5,0,0);scene.add(home);
box(5.5,3.7,5.2,'#f0d9c0',0,2,0,home);
box(5.9,.22,5.7,'#e4cfb7',0,.21,0,home);
const homeRoof=addMesh(new THREE.ConeGeometry(4.25,1.8,4),'#a65f51',home);
homeRoof.rotation.y=Math.PI/4;homeRoof.position.y=4.7;
const homeDoorPivot=new THREE.Group();homeDoorPivot.position.set(2.84,0,.57);home.add(homeDoorPivot);
box(.13,2.19,1.08,'#3e8774',0,1.3,-.54,homeDoorPivot);
ball(.065,'#f5d691',.12,1.25,-.89,homeDoorPivot);
for(const z of [-1.44,1.44]){
 box(.13,.95,.93,'#9bdfe4',2.84,2.64,z,home);
 box(.15,.06,1.02,'#f4f7e9',2.95,2.64,z,home);
}
for(const z of [-1.9,1.9])ball(.55,'#4ea16d',3.05,.72,z,home);
box(1.4,.08,2.35,'#dedacb',17.75,.18,0);
point('🏠','Casa habitada','Moradores saem pela porta, andam até a calçada, seguem compromissos e retornam.',14.5,5.2,0);

// Motoristas são moradores identificáveis dentro dos veículos, com janelas transparentes.
// O carro e a pessoa usam a mesma transformação 3D: nada de teleportar o cidadão.
for(const [id,carIndex] of [[7,2],[11,5]]){
 const person=people[id],car=cars[carIndex];
 car.g.add(person.g);
 person.g.position.set(-.2,.74,.12);
 person.g.rotation.y=Math.PI/2;
 person.g.scale.setScalar(.42);
 person.drivingCar=car;
 person.state='driving';
 person.activity='Dirigindo pela cidade';
 car.g.userData.npcId=id;
}
const vendors=[people[24],people[25]];
vendors[0].vendor='café';vendors[1].vendor='feira';
vendors[0].g.position.set(-6,.04,-14.38);vendors[0].g.rotation.y=0;
vendors[1].g.position.set(6,.04,-14.38);vendors[1].g.rotation.y=0;
for(const p of vendors){p.state='working';p.routine='working';p.activity='Atendendo clientes';}

const v=(x,z)=>new THREE.Vector3(x,.04,z);
// Caminhos com pontos sucessivos: ninguém atravessa paredes ou cruza o parque em linha reta.
const destinations=[
 {name:'café',track:0,distance:6,points:[v(-6,-12.35),v(-6,-12.75)],duration:7,activity:'Comprando no café'},
 {name:'feira',track:0,distance:18,points:[v(6,-12.35),v(6,-12.75)],duration:8,activity:'Visitando a feira'},
 {name:'casa',track:1,distance:54,points:[v(17.35,0),v(16.56,0)],duration:10,activity:'Descansando em casa'},
 {name:'laboratório',track:1,distance:18,points:[v(0,-18.72),v(0,-19.56)],duration:10,activity:'Pesquisando tecnologia'}
];
let homeDoorOpenUntil=0,labDoorOpenUntil=0;
// Dois moradores começam de fato dentro da casa e saem em momentos distintos.
for(const [id,delay] of [[12,.3],[13,6.5]]){
 const p=people[id];
 p.track=1;p.side=18;p.perimeter=144;p.distance=54;
 p.g.position.set(16.55,.04,0);
 p.g.rotation.y=Math.PI/2;
 p.routine='homeStart';p.routineTime=-delay;
 p.activity='Preparando-se para sair';
 p.visitCooldown=18+id;
}
function moveOnGround(p,target,dt,speed=1.35){
 const dx=target.x-p.g.position.x,dz=target.z-p.g.position.z;
 const dist=Math.hypot(dx,dz);
 if(dist<.04){p.g.position.set(target.x,.04,target.z);p.motion=0;return true;}
 const step=Math.min(dist,Math.max(0,dt)*speed);
 p.g.position.x+=dx/dist*step;p.g.position.z+=dz/dist*step;p.g.position.y=.04;
 const desired=Math.atan2(dx,dz),current=p.g.rotation.y;
 const diff=Math.atan2(Math.sin(desired-current),Math.cos(desired-current));
 p.g.rotation.y+=THREE.MathUtils.clamp(diff,-dt*5,dt*5);
 p.motion=speed;
 return dist-step<.04;
}
function decideGoal(p){
 // Inteligência de agentes por utilidade: os moradores avaliam necessidades ao
 // selecionar um objetivo; não há chamadas contínuas e caras à API Gemini.
 if(!p.needs)p.needs={hunger:.4+(p.id%5)*.07,rest:.18+(p.id%3)*.12,curiosity:.3+(p.id%4)*.09};
 const options=destinations.filter(d=>d.track===p.track);
 let best=options[0],score=-Infinity;
 for(const d of options){
   const relevance=d.name==='casa'?p.needs.rest:d.name==='laboratório'?p.needs.curiosity:p.needs.hunger;
   const jobBonus=d.name==='laboratório'&&p.id%4===0?.3:0;
   const variety=(Math.sin(p.id*14+p.routineIndex*8+d.distance)*.5+.5)*.22;
   const repeatPenalty=p.lastDestination===d.name?-.34:0;
   const value=relevance+jobBonus+variety+repeatPenalty;
   if(value>score){score=value;best=d;}
 }
 return best;
}
function completeVisit(p,d){
 if(d.name==='casa')p.needs.rest=.04;
 if(d.name==='laboratório')p.needs.curiosity=.08;
 if(d.name==='feira'||d.name==='café')p.needs.hunger=.06;
 p.lastDestination=d.name;p.routineIndex++;
 p.visitCooldown=12+(p.id%7)*3;
}
function beginPath(p,points,mode){
 p.waypoints=points;p.waypointIndex=0;p.routine=mode;p.motion=0;
}
function stepPath(p,dt){
 const target=p.waypoints[p.waypointIndex];
 if(!target)return true;
 if(moveOnGround(p,target,dt,1.32+p.id%3*.12)){
   p.waypointIndex++;
   return p.waypointIndex>=p.waypoints.length;
 }
 return false;
}
function routineAt(p,dt){
 if(p.vendor||p.drivingCar){p.motion=0;return true;}
 p.visitCooldown=Math.max(0,p.visitCooldown-dt);
 if(!p.routine)p.routine='walk';
 if(!p.needs)p.needs={hunger:.35,rest:.3,curiosity:.5};
 p.needs.hunger=Math.min(1,p.needs.hunger+dt*.0009);
 p.needs.rest=Math.min(1,p.needs.rest+dt*.0007);
 p.needs.curiosity=Math.min(1,p.needs.curiosity+dt*.0009);
 if(p.routine==='homeStart'){
   p.routineTime+=dt;p.motion=0;
   if(p.routineTime<0)return true;
   p.destination=destinations[2];
   p.activity='Saindo de casa';
   beginPath(p,[v(17.34,0),v(18,0)],'leave');
   homeDoorOpenUntil=performance.now()+2600;
   return true;
 }
 if(p.routine==='walk'){
   p.activity='Passeando pela cidade';
   if(p.visitCooldown>0)return false;
   if(!p.nextDestination)p.nextDestination=decideGoal(p);
   const d=p.nextDestination;
   const delta=(d.distance-p.distance+p.perimeter)%p.perimeter;
   if(delta<Math.max(.16,p.speed*dt*2.2)){
     p.destination=d;p.nextDestination=null;
     p.distance=d.distance;
     applyPedestrian(p);
     p.activity='Indo ao '+d.name;
     beginPath(p,d.points,'enter');
     if(d.name==='casa')homeDoorOpenUntil=performance.now()+3200;
     if(d.name==='laboratório')labDoorOpenUntil=performance.now()+3000;
     return true;
   }
   return false;
 }
 if(p.routine==='enter'){
   if(stepPath(p,dt)){
     p.routine='inside';p.routineTime=0;p.motion=0;
     p.activity=p.destination.activity;
   }
   return true;
 }
 if(p.routine==='inside'){
   p.routineTime+=dt;p.motion=0;
   if(p.routineTime>=p.destination.duration){
     p.activity='Voltando para a calçada';
     const sidewalk=pathAt(p.destination.distance,p.side);
     beginPath(p,[...p.destination.points].reverse().slice(1).concat([v(sidewalk.x,sidewalk.z)]),'leave');
     if(p.destination.name==='casa')homeDoorOpenUntil=performance.now()+3200;
     if(p.destination.name==='laboratório')labDoorOpenUntil=performance.now()+3000;
   }
   return true;
 }
 if(p.routine==='leave'){
   if(stepPath(p,dt)){
     p.distance=(p.destination.distance+.4)%p.perimeter;
     completeVisit(p,p.destination);
     p.routine='walk';p.motion=0;
     applyPedestrian(p);
   }
   return true;
 }
 return false;
}

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
// Pedestres em duas trilhas distintas, longe de carros e edifícios.
function updatePedestrians(dt,time){
  if(!ui.traffic.checked)return;
  const snap=people.map(p=>p.distance);
  for(let i=0;i<people.length;i++){
    const p=people[i];
    if(p.drivingCar||p.vendor)continue;
    if(routineAt(p,dt))continue;
    let gap=p.perimeter;
    for(let j=0;j<people.length;j++){
      const other=people[j];
      if(i===j||p.track!==other.track||other.drivingCar||other.vendor||other.routine!=='walk')continue;
      const d=((snap[j]-snap[i]+p.perimeter)%p.perimeter);
      if(d>.001)gap=Math.min(gap,d);
    }
    const speed=Math.min(p.speed,Math.max(0,(gap-1.45)*.77));
    p.distance=(p.distance+speed*dt)%p.perimeter;
    applyPedestrian(p);
    p.motion=speed;
    p.state=speed<.08?'waiting':'walking';
  }
}
function animateResidents(dt,time){
 for(const p of people){
   const walking=p.drivingCar?0:(p.motion||0);
   const swing=walking>.08?Math.sin(time*7.8+p.offset)*Math.min(.42,.23*walking):0;
   p.legs[0].rotation.x=swing;p.legs[1].rotation.x=-swing;
   p.arms[0].rotation.x=-swing*.8;p.arms[1].rotation.x=swing*.8;
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
 const now=performance.now();
 const a=now<homeDoorOpenUntil?1.05:0;
 const b=now<labDoorOpenUntil?-.95:0;
 homeDoorPivot.rotation.y=THREE.MathUtils.damp(homeDoorPivot.rotation.y,a,4.3,dt);
 pavilionDoorPivot.rotation.y=THREE.MathUtils.damp(pavilionDoorPivot.rotation.y,b,4.3,dt);
}

// Interação dos moradores: balões 3D e formulário de conversa dentro do visor.
const inhabitants=iniciarHabitantes({people,renderer,camera,host,labels,controls});

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
  };
  poiLayer.appendChild(button);return button;
});
const poiWorld=new THREE.Vector3();
function updatePOI(){
  const w=host.clientWidth,h=host.clientHeight;
  pointsOfInterest.forEach((poi,i)=>{
    poiWorld.set(poi.x,poi.y,poi.z).project(camera);
    const inView=poiWorld.z>-1&&poiWorld.z<1&&Math.abs(poiWorld.x)<.95&&Math.abs(poiWorld.y)<.95;
    const button=poiButtons[i];button.hidden=!inView;
    if(inView){button.style.left=((poiWorld.x+1)*.5*w)+'px';button.style.top=((-poiWorld.y+1)*.5*h)+'px';}
  });
}

const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let down=null;
renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
renderer.domElement.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(pointer,camera);
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
const clock=new THREE.Clock();let time=0;
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);time+=dt;
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
  getVersion(){return '9.0.0';}
};
updateUI();animate();
