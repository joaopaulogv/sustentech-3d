import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const PROFILE_KEY='sustentech_v6_profiles';
const CHAT_KEY='sustentech_v4_chats';
const API_KEY='sustentech_v4_api_url';
const MODE_KEY='sustentech_v9_mode';
const examples=[
  ['Sofia Martins','Engenheira ambiental','Curiosa, otimista e apaixonada pela natureza','energia solar, reciclagem, parques','amigável','solar => Eu amo painéis solares! Eles geram eletricidade usando a luz do sol.'],
  ['Lucas Ferreira','Estudante de IoT','Criativo, bem-humorado e curioso','programação, jogos, sensores','engraçado','arduino => Eu adoro fazer projetos de IoT com Arduino!'],
  ['Ana Oliveira','Professora','Paciente, didática e observadora','ciência, educação, tecnologia','formal','escola => A educação pode transformar uma cidade inteira.'],
  ['Pedro Costa','Motorista de ônibus','Prático, paciente e cuidadoso no trânsito','mobilidade, ônibus, segurança viária','amigável','transito => Motoristas e pedestres precisam se respeitar nas ruas.'],
  ['Marina Santos','Arquiteta','Criativa, atenta aos detalhes e sociável','urbanismo, praças, arquitetura','amigável','parque => Uma praça pode transformar o cotidiano das pessoas.'],
  ['Rafael Lima','Técnico em automação','Analítico, reservado e prestativo','sensores, redes, automação','reservado','iot => IoT é conectar sensores, sistemas e dispositivos.'],
  ['Beatriz Melo','Bióloga','Tranquila, amigável e contemplativa','biodiversidade, árvores, água','amigável','arvore => Elas refrescam as ruas e abrigam animais.'],
  ['Gabriel Rocha','Desenvolvedor de software','Objetivo, engraçado e curioso','código, aplicações, inteligência artificial','engraçado','ia => O interessante é criar IA que ajude as pessoas.'],
  ['Camila Duarte','Enfermeira','Gentil, responsável e tranquila','saúde pública, qualidade de vida','amigável','saude => Cuidar do meio ambiente também é cuidar das pessoas.'],
  ['Tiago Alves','Jardineiro','Calmo, bem-humorado e paciente','jardins, plantas, solo','reservado','plantas => Cada planta precisa de água e luz na medida certa.'],
  ['Lívia Ribeiro','Pesquisadora','Investigativa, otimista e detalhista','dados, energia, ciência','formal','energia => Monitorar o consumo ajuda a identificar desperdícios.'],
  ['Bruno Dias','Urbanista','Sociável, realista e criativo','calçadas, acessibilidade, mobilidade','amigável','acessibilidade => Uma cidade boa precisa ser acessível para todos.']
];
const genders=['f','m','f','m','f','m','f','m','f','m','f','m'];
const uniqueNames=['Helena Nascimento','Mateus Almeida','Isabela Torres','Daniel Carvalho','Clara Azevedo','Felipe Mendes','Juliana Prado','André Lima','Laura Costa','Victor Martins','Fernanda Reis','Caio Ribeiro'];
const defaults=Array.from({length:26},(_,i)=>{
  const b=examples[i%12];
  const merchant=i===24?['Júlia Campos','Vendedora de café','Acolhedora e simpática','cafés, bebidas, alimentação sustentável','amigável','cafe => Temos café fresco e alimentos da região.']:i===25?['Miguel Reis','Feirante','Comunicativo e gentil','hortas, legumes, frutas','amigável','feira => Nossa feira tem produtos frescos e locais.']:null;
  const values=merchant||[i<12?b[0]:uniqueNames[i-12],...b.slice(1)];
  return{id:i,genero:genders[i%12],nome:values[0],profissao:values[1],personalidade:values[2],conhecimentos:values[3],estilo:values[4],frases:values[5],instrucoes:'',criatividade:65,humor:['feliz','sereno','curioso','animado'][i%4]};
});
function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function persist(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
const saved=readJson(PROFILE_KEY,[]);
const profiles=defaults.map((p,i)=>{
  const savedPerson=Array.isArray(saved)?saved.find(v=>v.id===i):null;
  const migrated=savedPerson?{...savedPerson}:null;
  if(i>=12&&i<24&&migrated&&/\s(?:Júnior|Neto)$/.test(migrated.nome||''))migrated.nome=p.nome;
  return {...p,...migrated};
});
const cached=readJson(CHAT_KEY,{});
const chats={};
for(const p of profiles){const c=cached[p.id];chats[p.id]=Array.isArray(c)?c.filter(v=>['npc','user'].includes(v.role)&&typeof v.text==='string').slice(-14):[];}
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const choose=a=>a[Math.floor(Math.random()*a.length)];
const $=id=>document.getElementById(id);
const escapeLength=(str,max)=>String(str||'').trim().slice(0,max);

function localReply(p,text,history){
  const q=norm(text),first=(p.conhecimentos||'cidades inteligentes').split(',')[0].trim();
  const lines=(p.frases||'').split('\n');
  for(const line of lines){
    const pos=line.indexOf('=>');if(pos<1)continue;
    const word=norm(line.slice(0,pos).trim());
    const reply=line.slice(pos+2).trim();
    if(word&&reply&&(word==='*'||q.includes(word)))return reply;
  }
  let options;
  if(/lembra|lembre|ultima pergunta|falei antes/.test(q)){
    const previous=history.filter(m=>m.role==='user').slice(-2)[0]?.text;
    options=previous?[`Claro! Você comentou: "${previous.slice(0,90)}". Quer continuar esse assunto?`]:['Ainda não conversamos muito, mas estou prestando atenção.'];
  }else if(/\b(oi|ola|bom dia|boa tarde|boa noite)\b/.test(q)){
    options=[`Oi, eu sou ${p.nome}! Como está sendo seu passeio?`,`Olá! Sou ${p.profissao.toLowerCase()}. Que bom te conhecer.`,`Bem-vindo à nossa cidade! Gosto bastante de ${first}.`];
  }else if(/nome|quem e voce|quem voce e/.test(q)){
    options=[`Sou ${p.nome} e trabalho como ${p.profissao.toLowerCase()}.`];
  }else if(/trabalh|profiss|ocupac/.test(q)){
    options=[`Trabalho como ${p.profissao.toLowerCase()}. Gosto especialmente de ${first}.`];
  }else if(/gosta|interesse|hobby/.test(q)){
    options=[`Eu me interesso por ${p.conhecimentos}.`,`Meu trabalho é ${p.profissao.toLowerCase()}, mas adoro aprender mais sobre ${first}.`];
  }else if(/solar|energia|sustent|ambient|reciclag/.test(q)){
    options=[`A energia renovável ajuda a diminuir impactos ambientais. Na minha área, penso bastante em ${first}.`,`Uma cidade sustentável também precisa economizar água, energia e cuidar das áreas verdes.`];
  }else if(/carro|transito|semafor|pedestr|onibus/.test(q)){
    options=[`Aqui os carros usam semáforos coordenados. Segurança vem antes da velocidade!`,`Uma cidade precisa de calçadas, transporte coletivo e respeito entre pessoas e veículos.`];
  }else if(/iot|sensor|arduino|tecnologia|automac|ia/.test(q)){
    options=[`Sensores e dispositivos IoT permitem acompanhar o funcionamento da cidade.`,`Eu gosto da ideia de usar ${first} para resolver problemas reais.`,`Tecnologia é ferramenta. O mais interessante é melhorar a vida de quem mora aqui.`];
  }else if(/humor|feliz|triste/.test(q)){
    options=[`Hoje estou ${p.humor}. Obrigado por perguntar!`];
  }else {
    options=[`Isso me fez pensar em ${first}. O que te chamou mais atenção?`,`Como ${p.profissao.toLowerCase()}, eu vejo esse assunto com bastante curiosidade.`,`Boa pergunta! Eu sou ${p.personalidade.toLowerCase()}, então gosto de refletir antes de responder.`];
  }
  let answer=Number(p.criatividade)<20?options[0]:choose(options);
  if(p.estilo==='engraçado')answer+=' 😄';
  if(p.estilo==='reservado')answer=answer.split(/[.!?]/)[0]+'.';
  if(p.estilo==='formal')answer=answer.replace(/^Oi,/, 'Olá,');
  if(/faca perguntas|pergunte/i.test(p.instrucoes))answer+=' Qual é a sua opinião?';
  return answer;
}
function getApiBase(){return ($('npcApiUrl').value||'').trim().replace(/\/+$/,'');}
async function remoteReply(person,history){
  const origin=getApiBase();
  if(!/^https:\/\/[^\s/]+(?:\/[\w-]*)?$/.test(origin))throw Error('Informe uma URL HTTPS válida da Vercel');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),24000);
  try{
    const response=await fetch(`${origin}/api/conversar`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({person,history:history.slice(-12)}),signal:controller.signal
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(data.error||`Servidor respondeu HTTP ${response.status}`);
    if(!data.reply||typeof data.reply!=='string')throw Error('O servidor retornou uma resposta vazia');
    return data.reply.trim();
  }finally{clearTimeout(timer);}
}

export function iniciarHabitantes({people,renderer,camera,host,controls}){
  const aside=document.querySelector('aside.panel');
  const panel=document.createElement('section');panel.className='npc-settings';
  panel.innerHTML=`
    <span class="eyebrow">🤖 SUSTENTECH AI</span><h3>Habitantes inteligentes</h3>
    <p>Clique em qualquer morador no cenário 3D para falar. Aqui você só personaliza os perfis e configura o servidor.</p>
    <label for="npcSelect">Habitante</label><select id="npcSelect"></select>
    <div class="npc-settings-actions"><button type="button" class="npc-primary" id="npcTalk">📍 Encontrar no 3D</button><button type="button" id="npcEdit">✏️ Personalizar</button></div>
    <div id="npcEditor" hidden>
      <label for="npcName">Nome</label><input id="npcName" maxlength="60">
      <label for="npcJob">Profissão</label><input id="npcJob" maxlength="80">
      <label for="npcPersonality">Personalidade</label><textarea id="npcPersonality" maxlength="500"></textarea>
      <label for="npcKnowledge">Conhecimentos e interesses</label><textarea id="npcKnowledge" maxlength="500"></textarea>
      <label for="npcStyle">Jeito de falar</label><select id="npcStyle"><option value="amigável">Amigável</option><option value="engraçado">Engraçado</option><option value="formal">Formal</option><option value="reservado">Reservado</option></select>
      <label for="npcMood">Humor</label><select id="npcMood"><option>feliz</option><option>sereno</option><option>curioso</option><option>animado</option><option>pensativo</option></select>
      <label for="npcRules">Respostas criadas por vocês (uma por linha)</label>
      <textarea id="npcRules" maxlength="1300" placeholder="solar => Acho a energia solar incrível!&#10;oi => Olá, visitante!"></textarea>
      <p class="npc-note">Quando o visitante escrever a palavra antes de =>, o NPC responde com a frase depois de => no modo local.</p>
      <label for="npcInstructions">Instruções extras para o Gemini</label><textarea id="npcInstructions" maxlength="650" placeholder="Ex.: fale como uma estudante de tecnologia e seja muito curiosa"></textarea>
      <label for="npcCreativity">Variação das respostas: <b id="npcCreativityValue">65</b>%</label><input id="npcCreativity" type="range" min="0" max="100">
      <div class="npc-settings-actions"><button class="npc-primary" type="button" id="npcSave">Salvar perfil</button><button type="button" id="npcReset">Restaurar</button></div>
    </div>
    <span class="npc-subtitle">Modo de conversação</span>
    <select id="npcMode"><option value="local">Local: sem servidor, gratuito</option><option value="generativa">Gemini: IA generativa</option></select>
    <div id="npcApiSettings" hidden>
      <label for="npcApiUrl">URL da API na Vercel</label>
      <input id="npcApiUrl" type="url" placeholder="https://nome-do-projeto.vercel.app" autocomplete="off">
      <p class="npc-note">Coloque o endereço principal do projeto na Vercel, sem /api/conversar. Não coloque chave Gemini aqui.</p>
      <button type="button" id="npcTestApi">Testar conexão</button>
    </div>
    <div class="npc-settings-actions"><button type="button" id="npcClear">Apagar memória deste morador</button></div>
    <div id="npcStatus" class="npc-status-note" role="status">Modo local ativo • Perfis salvos neste navegador.</div>
    <p class="npc-note">As conversas e perfis são guardados no navegador. A IA local é simulada. O Gemini exige configurar o servidor na Vercel.</p>`;
  aside.appendChild(panel);

  const hud=document.createElement('section');hud.id='npcHud';hud.className='npc-hud';hud.hidden=true;
  hud.innerHTML=`<div class="npc-hud-top"><div><div id="hudName" class="npc-hud-name"></div><div id="hudJob" class="npc-hud-job"></div></div><button type="button" class="npc-hud-close" id="npcClose" aria-label="Fechar conversa">×</button></div>
    <div id="hudStatus" class="npc-hud-status" role="status">Converse com o morador</div>
    <form class="npc-hud-form" id="npcForm"><input id="npcQuestion" aria-label="Pergunta ao habitante" maxlength="450" placeholder="Pergunte algo ao habitante..." autocomplete="off" required><button type="submit" id="npcSend">Enviar</button></form>
    <div class="npc-hud-actions"><button id="npcGoHome" type="button">🏠 Pedir para voltar para casa</button></div>
    <div class="npc-hud-hint">Siga os passos do morador e veja seu próximo compromisso.</div>`;
  host.appendChild(hud);

  // Elemento CSS2D acompanha a posição 3D da cabeça de cada morador.
  const bubbles=[];
  people.forEach((person,i)=>{
    person.g.userData.npcId=i;
    const container=document.createElement('div');container.className='npc-label';container.hidden=true;
    const speech=document.createElement('div');speech.className='npc-speech';speech.hidden=true;
    const label=document.createElement('div');label.className='npc-name-tag';label.textContent=profiles[i].nome;
    container.append(speech,label);
    const obj=new CSS2DObject(container);obj.position.set(0,3.65,0);person.g.add(obj);
    bubbles.push({container,speech,label});
  });
  let selected=-1,busy=false,speechTimer=null;
  const worldHead=new THREE.Vector3();
  const followTarget=new THREE.Vector3();
  const followDesired=new THREE.Vector3();
  const followDirection=new THREE.Vector3();
  const followRight=new THREE.Vector3();
  const worldQuaternion=new THREE.Quaternion();
  // Câmera cinematográfica: acompanha a posição MUNDIAL, inclusive dentro dos carros,
  // posicionada na diagonal frontal para mostrar o rosto e não ficar em cima do NPC.
  function followPlacement(i){
    const p=people[i];
    p.g.getWorldPosition(worldHead);
    p.g.getWorldQuaternion(worldQuaternion);
    followDirection.set(0,0,1).applyQuaternion(worldQuaternion).setY(0).normalize();
    if(followDirection.lengthSq()<.01)followDirection.set(0,0,1);
    followRight.set(followDirection.z,0,-followDirection.x);
    const inCar=!!p.drivingCar;
    followTarget.copy(worldHead).add(new THREE.Vector3(0,inCar?.65:1.5,0));
    followDesired.copy(followTarget)
      .addScaledVector(followDirection,inCar?8:5.6)
      .addScaledVector(followRight,inCar?6.5:5)
      .add(new THREE.Vector3(0,inCar?5.6:4.4,0));
    followDesired.y=Math.max(followDesired.y,3.5);
  }
  function focusOnPerson(i){
    followPlacement(i);
    controls.target.lerp(followTarget,.48);
    camera.position.lerp(followDesired,.28);
    controls.update();
  }
  function updateCamera(dt){
    if(selected<0)return;
    followPlacement(selected);
    const alpha=1-Math.exp(-Math.min(dt,.06)*3.2);
    controls.target.lerp(followTarget,alpha);
    camera.position.lerp(followDesired,alpha);
    const p=people[selected],activity=p?.activity||'Explorando a cidade';
    const job=document.getElementById('hudJob');
    if(job){const txt=profiles[selected].profissao+' • '+activity;if(job.textContent!==txt)job.textContent=txt;}
  }
  const minimizeButton=document.createElement('button');
  minimizeButton.type='button';minimizeButton.className='npc-hud-minimize';
  minimizeButton.title='Minimizar conversa';minimizeButton.textContent='−';
  const focusButton=document.createElement('button');
  focusButton.type='button';focusButton.className='npc-hud-focus';
  focusButton.title='Localizar morador na cidade';focusButton.textContent='◎ Localizar';
  hud.querySelector('.npc-hud-top').insertBefore(focusButton,$('npcClose'));
  hud.querySelector('.npc-hud-top').insertBefore(minimizeButton,$('npcClose'));
  minimizeButton.onclick=()=>{
    hud.classList.toggle('minimized');
    minimizeButton.textContent=hud.classList.contains('minimized')?'+':'−';
    minimizeButton.title=hud.classList.contains('minimized')?'Expandir conversa':'Minimizar conversa';
  };
  focusButton.onclick=()=>{if(selected>=0)focusOnPerson(selected);};
  function status(text){$('npcStatus').textContent=text;$('hudStatus').textContent=text;}
  function refreshSelect(){
    $('npcSelect').replaceChildren();
    profiles.forEach((p,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`${p.nome} • ${p.profissao}`;$('npcSelect').append(o);});
    if(selected>=0)$('npcSelect').value=String(selected);
  }
  function fill(){
    const p=profiles[Math.max(selected,0)];
    $('npcName').value=p.nome;$('npcJob').value=p.profissao;
    $('npcPersonality').value=p.personalidade;$('npcKnowledge').value=p.conhecimentos;
    $('npcStyle').value=p.estilo;$('npcMood').value=p.humor;
    $('npcRules').value=p.frases;$('npcInstructions').value=p.instrucoes;
    $('npcCreativity').value=p.criatividade;$('npcCreativityValue').textContent=p.criatividade;
  }
  let speechToken=0;
  function speak(i,text,timeout=19000,instant=false){
    const token=++speechToken;
    if(speechTimer)clearTimeout(speechTimer);
    bubbles.forEach((b,k)=>{b.container.hidden=k!==i;b.speech.hidden=k!==i;b.speech.classList.remove('is-typing');});
    const b=bubbles[i],full=String(text).slice(0,510);
    const rate=44; // caracteres por segundo: resposta aparece aos poucos
    const duration=instant?0:Math.min(15000,full.length/rate*1000);
    people[i].speakingUntil=Date.now()+Math.max(1300,duration);
    b.speech.textContent=instant?full:'▌';
    if(!instant){
      if(selected===i)status('✍️ '+profiles[i].nome+' está digitando...');
      b.speech.classList.add('is-typing');
      const start=performance.now();
      let last=-1;
      function typeFrame(now){
        if(token!==speechToken||b.speech.hidden)return;
        const count=Math.min(full.length,Math.floor((now-start)/1000*rate));
        if(count!==last){b.speech.textContent=full.slice(0,count)+(count<full.length?'▌':'');last=count;}
        if(count<full.length)requestAnimationFrame(typeFrame);
        else{
          b.speech.classList.remove('is-typing');
          people[i].speakingUntil=Date.now()+350;
          if(selected===i)status('✦ '+profiles[i].nome+' terminou de responder.');
        }
      }
      requestAnimationFrame(typeFrame);
    }
    speechTimer=setTimeout(()=>{
      if(token===speechToken&&selected!==i)b.speech.hidden=true;
    },Math.max(timeout,duration+4800));
  }
  function select(i,showGreeting=true){
    if(busy)return;
    window.sustentechUi?.beginExploring?.();
    selected=Math.max(0,Math.min(profiles.length-1,i));
    const p=profiles[selected];
    people.forEach((v,j)=>{v.ring.visible=j===selected;});
    controls.enableRotate=false;controls.enablePan=false;controls.enableZoom=false;
    controls.enableDamping=false;
    focusOnPerson(selected);
    const follow=document.getElementById('followBanner');
    if(follow){follow.hidden=false;document.getElementById('followWho').textContent=p.nome;}
    bubbles.forEach((b,j)=>{b.container.hidden=j!==selected;b.label.hidden=j!==selected;b.speech.hidden=true;});
    if(speechTimer)clearTimeout(speechTimer);
    speechToken++;
    $('npcSelect').value=String(selected);fill();
    $('hudName').textContent=p.nome;$('hudJob').textContent=`${p.profissao} • ${people[selected].activity||p.humor}`;
    hud.hidden=false;hud.classList.remove('minimized');minimizeButton.textContent='−';
    if(showGreeting){
      const previous=chats[selected].filter(m=>m.role==='npc').at(-1);
      speak(selected,previous?.text||`Oi! Eu sou ${p.nome}, ${p.profissao.toLowerCase()}. Pode perguntar!`);
    }
    status(`${p.nome} pronto para conversar • ${$('npcMode').value==='local'?'modo local':'modo Gemini'}`);
    const goHome=$('npcGoHome');
    goHome.hidden=!!(people[selected].vendor||people[selected].drivingCar);
    document.dispatchEvent(new CustomEvent('sustentech:talk',{detail:{id:selected}}));
  }
  function close(){
    if(selected>=0)people[selected].state='walking';
    controls.enableRotate=true;controls.enablePan=true;controls.enableZoom=true;controls.enableDamping=true;
    const follow=document.getElementById('followBanner');if(follow)follow.hidden=true;
    speechToken++;
    bubbles.forEach(b=>{b.container.hidden=true;b.speech.hidden=true;b.speech.classList.remove('is-typing');});
    people.forEach(v=>v.ring.visible=false);hud.hidden=true;selected=-1;
  }
  refreshSelect();fill();
  $('npcTalk').onclick=()=>{const i=Number($('npcSelect').value);select(i);focusOnPerson(i);$('npcQuestion').focus();};
  $('npcSelect').onchange=()=>{const i=Number($('npcSelect').value);select(i);focusOnPerson(i);};
  $('npcEdit').onclick=()=>{$('npcEditor').hidden=!$('npcEditor').hidden;};
  $('npcCreativity').oninput=e=>$('npcCreativityValue').textContent=e.target.value;
  $('npcSave').onclick=()=>{
    if(selected<0)selected=0;
    const p=profiles[selected];
    p.nome=escapeLength($('npcName').value,60)||p.nome;
    p.profissao=escapeLength($('npcJob').value,80)||p.profissao;
    p.personalidade=escapeLength($('npcPersonality').value,500);
    p.conhecimentos=escapeLength($('npcKnowledge').value,500);
    p.estilo=$('npcStyle').value;p.humor=$('npcMood').value;
    p.frases=escapeLength($('npcRules').value,1300);
    p.instrucoes=escapeLength($('npcInstructions').value,650);
    p.criatividade=Number($('npcCreativity').value);
    persist(PROFILE_KEY,profiles);refreshSelect();
    bubbles[selected].label.textContent=p.nome;
    $('hudName').textContent=p.nome;$('hudJob').textContent=`${p.profissao} • ${p.humor}`;
    status('Personalidade salva neste navegador.');
  };
  $('npcReset').onclick=()=>{
    if(selected<0)selected=0;
    profiles[selected]={...defaults[selected]};persist(PROFILE_KEY,profiles);
    refreshSelect();fill();bubbles[selected].label.textContent=profiles[selected].nome;
    status('Perfil original restaurado.');
  };
  $('npcClear').onclick=()=>{
    if(selected<0)selected=0;
    chats[selected]=[];persist(CHAT_KEY,chats);
    status('Memória deste personagem apagada.');
  };
  $('npcGoHome').onclick=()=>{
    if(selected<0)return;
    const success=window.sustentech?.sendHome?.(selected);
    status(success?'🏡 Pedido recebido. O morador terminará o compromisso atual e voltará caminhando para casa.':'Este morador está trabalhando ou dirigindo.');
  };
  $('npcClose').onclick=close;
  const exitFollow=document.getElementById('followExit');
  if(exitFollow)exitFollow.onclick=close;
  $('npcMode').value=localStorage.getItem(MODE_KEY)||(localStorage.getItem(API_KEY)?'generativa':'local');
  $('npcApiSettings').hidden=$('npcMode').value!=='generativa';
  $('npcMode').onchange=()=>{
    try{localStorage.setItem(MODE_KEY,$('npcMode').value);}catch{}
    $('npcApiSettings').hidden=$('npcMode').value!=='generativa';
    status($('npcMode').value==='local'?'Modo local ativo.':'Modo Gemini: informe ou teste a URL Vercel.');
  };
  $('npcApiUrl').value=localStorage.getItem(API_KEY)||'';
  $('npcApiUrl').onchange=e=>{persist(API_KEY,e.target.value.trim());};
  $('npcApiUrl').oninput=e=>{try{localStorage.setItem(API_KEY,e.target.value.trim());}catch{}};
  $('npcTestApi').onclick=async()=>{
    const base=getApiBase();
    if(!base.startsWith('https://')){status('Use a URL https://...vercel.app.');return;}
    status('Testando a conexão com a Vercel...');
    try{
      const controller=new AbortController();const t=setTimeout(()=>controller.abort(),12000);
      let r;try{r=await fetch(base+'/api/status',{signal:controller.signal});}finally{clearTimeout(t);}
      const data=await r.json();
      status(data.ok?data.configured?'Servidor conectado! Gemini configurado.':'Servidor conectado, mas falta GEMINI_API_KEY.':'Servidor respondeu com erro.');
    }catch{status('Não foi possível conectar. Confira a URL, o deploy e o CORS.');}
  };
  $('npcForm').onsubmit=async event=>{
    event.preventDefault();if(busy||selected<0)return;
    const text=$('npcQuestion').value.trim().slice(0,450);if(!text)return;
    const id=selected,p={...profiles[id]},mode=$('npcMode').value;
    const history=chats[id];history.push({role:'user',text});
    $('npcQuestion').value='';busy=true;$('npcSend').disabled=true;
    speak(id,'💭 Pensando na resposta...',30000,true);
    status(mode==='generativa'?'Consultando Gemini...':'Preparando resposta local...');
    let reply;
    try{
      if(mode==='generativa'){
        reply=await remoteReply(p,history);
        status('Resposta gerada pelo Gemini.');
      }else{
        reply=localReply(p,text,history);
        status('Resposta do simulador local.');
      }
    }catch(err){
      reply=localReply(p,text,history);
      status(`Gemini indisponível: ${err.message.slice(0,92)}. Usando modo local.`);
    }finally{
      history.push({role:'npc',text:reply});
      chats[id]=history.slice(-14);persist(CHAT_KEY,chats);
      if(selected===id)speak(id,reply);
      busy=false;$('npcSend').disabled=false;
    }
  };

  // Balões espontâneos: cada morador pode cumprimentar sem abrir chat.
  const greetings=['Que dia bonito na cidade!','A energia solar está funcionando!','Vou dar uma volta no parque.','A cidade está cada vez mais verde!','Hoje quero conhecer um bairro novo.'];
  function ambientSpeech(){
    if(selected>=0)return;
    const i=Math.floor(Math.random()*people.length);
    const b=bubbles[i];
    b.container.hidden=false;b.speech.hidden=false;
    b.speech.textContent=greetings[i%greetings.length];
    people[i].speakingUntil=Date.now()+2700;
    b.label.hidden=false;
    setTimeout(()=>{if(selected<0){b.container.hidden=true;b.speech.hidden=true;}},4200);
  }
  setInterval(ambientSpeech,11000);
  setTimeout(ambientSpeech,1700);
  // Seleção pelo próprio corpo 3D, sem arrastar a página até o painel.
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
  renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
  renderer.domElement.addEventListener('pointerup',e=>{
    if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;
    const rect=renderer.domElement.getBoundingClientRect();
    pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    const hits=raycaster.intersectObjects([...people.map(p=>p.g),...people.filter(p=>p.drivingCar).map(p=>p.drivingCar.g)],true);
    for(const hit of hits){
      let obj=hit.object;
      while(obj&&obj.userData.npcId===undefined)obj=obj.parent;
      if(obj){e.stopImmediatePropagation();select(obj.userData.npcId);return;}
    }
  });
  return {updateCamera,selectPerson:select,stopFollow:close,isFollowing:()=>selected>=0,isFollowingPerson:id=>selected===id};
}
