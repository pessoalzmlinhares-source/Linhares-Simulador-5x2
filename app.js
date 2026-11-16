(function(){'use strict';
const L=window.EscalaLogic,$=s=>document.querySelector(s);
const KEY='linhares.escala5x2.formulario.v3', OLD_KEY='linhares.escala5x2.formulario.v2';
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let sequencia=0;const novoId=()=>`f-${Date.now().toString(36)}-${++sequencia}`;
const empty=()=>({...L.corrigirRegistro({}),id:novoId()});
const novoEstado=()=>({empresa:'',funcionamento:'',domingo:'nao',observacoes:'',funcionarios:[empty()],cenario:42});
function carregar(){try{const s=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(OLD_KEY));if(s&&Array.isArray(s.funcionarios))return {...novoEstado(),...s,funcionarios:s.funcionarios.slice(0,150).map(r=>({...empty(),...L.corrigirRegistro(r),id:novoId()}))};}catch{}return novoEstado();}
let estado=carregar();
const salvar=()=>{try{localStorage.setItem(KEY,JSON.stringify(estado));}catch{}};
function notificar(msg,erro=false){const e=$('#mensagem');e.hidden=false;e.className='notice '+(erro?'error':'success');e.textContent=msg;}
function preencherCabecalho(){for(const k of ['empresa','funcionamento','domingo','observacoes'])$('#'+k).value=estado[k]||'';alternarCenario(estado.cenario,false);}
function mostrarDias(r){return L.diasNumero(r).map(d=>L.DIAS[d]).join(', ');}
function resumoDias(r){if(!r.semana)return '';const days=L.diasNumero(r);return days.map(d=>{const h=L.horarioDia(r,d);return `${L.DIAS[d]}: ${h.entrada||'—'}–${h.intervalo_inicio||'—'} / ${h.intervalo_fim||'—'}–${h.saida||'—'}`;}).join(' · ');}
function atualizarPrint(tr,r){const campos=tr.querySelectorAll('td');campos.forEach((td,i)=>{if(i>5)return;let p=td.querySelector('.print-value');if(!p){p=document.createElement('span');p.className='print-value';td.append(p);}let v='';if(i===0)v=r.nome;else if(i===1)v=r.semana?'Por dia (abaixo)':(r.dias==='personalizado'?r.dias_personalizados:tr.querySelector('select.dias')?.selectedOptions?.[0]?.textContent||'');else if(!r.semana)v=r[['entrada','intervalo_inicio','intervalo_fim','saida'][i-2]]||'';p.textContent=v||' ';});}
function linhaRecap(tr,r){for(const el of tr.querySelectorAll('[data-key]')){const valor=r[el.dataset.key]||'';if(el.value!==valor)el.value=valor;}
 tr.querySelector('.personalizado').hidden=r.dias!=='personalizado';const calc=L.calculo(r),c=tr.querySelector('.total-cell');c.textContent=L.duracao(calc.total);c.classList.toggle('warning',calc.total===null||calc.avisos.some(a=>a.includes('Acima de 8h')));c.title=calc.avisos.join(' ');
 const timeInputs=tr.querySelectorAll('input.time');timeInputs.forEach(i=>{i.disabled=!!r.semana;i.title=r.semana?'Edite os horários diferentes em “Horários por dia”':'Formato 24h: 07:30, 12:00, 13:30, 18:00';});
 const editBtn=tr.querySelector('.edit-days');editBtn.classList.toggle('editing',!!r.semana);
 atualizarPrint(tr,r);}
function criarDetalhe(r){const tr=document.createElement('tr');tr.className='details-row no-print';tr.hidden=true;const td=document.createElement('td');td.colSpan=8;tr.append(td);
 function reconstruir(){const ativos=L.diasNumero(r);td.replaceChildren();const top=document.createElement('div');top.className='detail-head';top.innerHTML=`<div><strong>Horários específicos de ${esc(r.nome||'funcionário')}</strong><p>Marque os dias trabalhados e informe os 4 horários. Todos em 24h, por exemplo 07:30.</p></div><button type="button" class="button tiny close-days">Fechar</button>`;top.querySelector('button').onclick=()=>tr.hidden=true;
 const reset=document.createElement('button');reset.type='button';reset.className='button tiny';reset.textContent='Usar o mesmo horário em todos os dias';
 reset.onclick=()=>{if(!confirm('Retirar os horários diferentes e usar o horário principal em todos os dias selecionados?'))return;r.semana=null;tr.hidden=true;atualizar();};
 top.append(reset);td.append(top);
 const grid=document.createElement('div');grid.className='day-grid';
 for(let d=0;d<7;d++){
   const h=L.horarioDia(r,d),on=ativos.includes(d),card=document.createElement('section');card.className='day-card'+(on?'':' off');
   const hd=document.createElement('label');hd.className='day-card-title';hd.innerHTML=`<input type="checkbox" ${on?'checked':''} aria-label="Trabalha ${L.DIAS_LONGOS[d]}"><strong>${L.DIAS_LONGOS[d]}</strong>`;
   const chk=hd.querySelector('input');chk.addEventListener('change',()=>{
     const ns=new Set(L.diasNumero(r));if(chk.checked)ns.add(d);else ns.delete(d);
     r.dias='personalizado';r.dias_personalizados=[...ns].sort((a,b)=>a-b).map(x=>L.DIAS[x].toLowerCase()).join(', ');
     if(!r.semana)r.semana={};if(chk.checked&&!r.semana[d])r.semana[d]={...L.horarioDia(r,d)};
     reconstruir();atualizar();
   });card.append(hd);
   const g=document.createElement('div');g.className='day-hours';
   for(const [chave,label] of [['entrada','Entrada'],['intervalo_inicio','Almoço início'],['intervalo_fim','Almoço fim'],['saida','Saída']]){
     const wrap=document.createElement('label');wrap.textContent=label;const inp=document.createElement('input');inp.type='text';inp.inputMode='numeric';inp.maxLength=5;inp.placeholder='hh:mm';inp.value=h[chave]||'';inp.disabled=!on;inp.setAttribute('aria-label',`${L.DIAS_LONGOS[d]} ${label}`);
     inp.addEventListener('change',()=>{const normal=L.normalizarHora(inp.value);if(inp.value.trim()&&!normal){inp.classList.add('invalid');notificar('Horário inválido. Use 07:30, 12:00, 13:30 ou 18:00.',true);return;}inp.classList.remove('invalid');inp.value=normal;
       r.semana=r.semana||{};r.semana[d]={...L.horarioDia(r,d),[chave]:normal};atualizar();});wrap.append(inp);g.append(wrap);
   }card.append(g);const sub=document.createElement('small');sub.className='day-subtotal';const c=L.calculoDia(h);sub.textContent=on?`Total: ${L.duracao(c.minutos)}`:'Folga';card.append(sub);grid.append(card);
 }
 td.append(grid);const bottom=document.createElement('p');bottom.className='detail-foot';bottom.textContent='Os intervalos são descontados automaticamente. Trabalho em domingos, feriados, noturno e outras jornadas especiais exigem avaliação específica.';td.append(bottom);
 }
 return {tr,reconstruir};}
function renderItem(r){const tr=$('#modelo-linha').content.firstElementChild.cloneNode(true),det=criarDetalhe(r);tr.dataset.id=r.id;
 function receber(){linhaRecap(tr,r);const printRow=tr.nextElementSibling===det.tr?det.tr.nextElementSibling:null;if(printRow?.classList.contains('print-day-row'))printRow.querySelector('.detail-print-summary').textContent=resumoDias(r);}
 for(const el of tr.querySelectorAll('[data-key]')){
   const atualizarCampo=()=>{r[el.dataset.key]=el.value;if(el.dataset.key==='dias')tr.querySelector('.personalizado').hidden=el.value!=='personalizado';receber();atualizar();};
   el.addEventListener('input',()=>{if(el.matches('.time'))return;atualizarCampo();});
   el.addEventListener('change',()=>{if(el.matches('.time')){const norm=L.normalizarHora(el.value);if(el.value.trim()&&!norm){el.classList.add('invalid');notificar('Use o horário brasileiro de 24h, por exemplo 07:30.',true);return;}el.classList.remove('invalid');el.value=norm;}atualizarCampo();});
 }
 tr.querySelector('.edit-days').addEventListener('click',()=>{if(!r.semana){r.semana={};for(const d of L.diasNumero(r))r.semana[d]={...L.horarioDia(r,d)};}receber();det.reconstruir();det.tr.hidden=!det.tr.hidden;atualizar();});
 tr.querySelector('.remove-row').addEventListener('click',()=>{if(!confirm(`Remover ${r.nome||'este funcionário'}?`))return;estado.funcionarios=estado.funcionarios.filter(x=>x.id!==r.id);tr.remove();det.tr.remove();printRow.remove();atualizar();});
 const printRow=document.createElement('tr');printRow.className='print-day-row';const ptd=document.createElement('td');ptd.colSpan=8;const span=document.createElement('span');span.className='detail-print-summary';ptd.append(span);printRow.append(ptd);
 // Refaz o detalhe quando o usuário abre a edição; nenhuma informação é presumida.
 linhaRecap(tr,r);span.textContent=resumoDias(r);return [tr,det.tr,printRow];}
function renderLinhas(){const body=$('#linhas');body.replaceChildren();for(const r of estado.funcionarios)for(const element of renderItem(r))body.append(element);atualizar();}
function atualizarNomes(){const el=$('#nomes-recentes');el.replaceChildren();for(const nome of [...new Set(estado.funcionarios.map(x=>x.nome.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'))){const op=document.createElement('option');op.value=nome;el.append(op);}}
function atualizar(){salvar();atualizarNomes();let ativos=0,completos=0;for(const r of estado.funcionarios){if(r.nome.trim()||r.entrada||r.semana)ativos++;if((r.nome.trim()||r.entrada)&&L.calculo(r).total!==null)completos++;const row=[...document.querySelectorAll('#linhas tr[data-id]')].find(x=>x.dataset.id===r.id);if(row){linhaRecap(row,r);const printRow=row.nextElementSibling?.nextElementSibling;if(printRow?.classList.contains('print-day-row')){printRow.querySelector('span').textContent=resumoDias(r);printRow.classList.toggle('has-detail',!!r.semana);}const detalhe=row.nextElementSibling;if(detalhe?.classList.contains('details-row')&&!detalhe.hidden){for(const card of detalhe.querySelectorAll('.day-card')){ /* atualiza cards ao mudar o horário */ const d=[...detalhe.querySelectorAll('.day-card')].indexOf(card);const sub=card.querySelector('.day-subtotal');sub.textContent=L.diasNumero(r).includes(d)?'Total: '+L.duracao(L.calculoDia(L.horarioDia(r,d)).minutos):'Folga';}}}}
 $('#contador').textContent=String(ativos);$('#resumo').textContent=completos?`${completos} funcionário(s) com jornada semanal calculada por dia.`:'Informe os horários para calcular a jornada semanal.';renderSimulacao();}
function adicionar(r=null,focus=false){const registro={...empty(),...(r?L.corrigirRegistro(r):{})};estado.funcionarios.push(registro);for(const el of renderItem(registro))$('#linhas').append(el);atualizar();if(focus)document.querySelector(`#linhas tr[data-id="${registro.id}"] input.nome`)?.focus();}
function alternarCenario(c,update=true){estado.cenario=c;for(const h of [42,40]){$('#btn'+h).classList.toggle('selected',c===h);$('#btn'+h).setAttribute('aria-pressed',String(c===h));}$('#duracao-sim').textContent=L.duracao(c*60/5);if(update)atualizar();}
// Cada funcionário possui dois cenários independentes e pode alternar Semana A/B.
function opcoesDiaAtual(r){return L.diasNumero(r).map(d=>L.DIAS[d]).join(', ')||'—';}
function infoPlano(r,carga){r.simulacoes=r.simulacoes||{};const key=String(carga);r.simulacoes[key]=r.simulacoes[key]||{};return r.simulacoes[key];}
function editarPlano(r,carga,semana,patch){const raiz=infoPlano(r,carga);raiz[semana]={...L.configCenario(r,carga,semana),...patch};atualizar();}
function selectCampo(rotulo,valor,opcoes,atualizarValor,cl=''){
 const wrapper=document.createElement('label');wrapper.className='sim-field '+cl;
 const span=document.createElement('span');span.textContent=rotulo;wrapper.append(span);
 const select=document.createElement('select');for(const [val,texto] of opcoes){const option=document.createElement('option');option.value=String(val);option.textContent=texto;select.append(option);}select.value=String(valor);select.onchange=()=>atualizarValor(select.value);wrapper.append(select);return wrapper;
}
function renderSimulacao(){
 const area=$('#sim-lista');area.replaceChildren();const itens=estado.funcionarios.filter(r=>r.nome.trim()&&L.diasNumero(r).length);
 if(!itens.length){area.innerHTML='<p class="empty">Preencha um funcionário para visualizar a escala e testar horários diferentes.</p>';return;}
 for(const r of itens){
  const carga=estado.cenario,raiz=infoPlano(r,carga),rodizio=!!raiz.rodizio,week=rodizio&&raiz.ativo==='B'?'B':'A',cfg=L.configCenario(r,carga,week),sim=L.cenario(r,carga,week),atual=L.calculo(r);
  const card=document.createElement('article');card.className='sim-item sim-mini';
  const head=document.createElement('div');head.className='sim-mini-head';head.innerHTML=`<div class="sim-name"><strong>${esc(r.nome)}</strong><small>Jornada atual ${L.duracao(atual.total)} · ${atual.dias.length} dia(s)</small></div><div class="sim-status ${sim.diferenca===0?'ok':'attention'}">Proposta ${L.duracao(sim.total)} <small>/ meta ${carga}h</small></div>`;card.append(head);
  const controls=document.createElement('div');controls.className='sim-mini-controls';
  for(let i=0;i<2;i++)controls.append(selectCampo('Folga '+(i+1),cfg.folgas[i],L.DIAS_LONGOS.map((nome,id)=>[id,nome]),value=>{
    const f=cfg.folgas.slice();f[i]=Number(value);if(f[0]===f[1]){notificar('Escolha dois dias de folga diferentes.',true);renderSimulacao();return;}editarPlano(r,carga,week,{folgas:f.sort((a,b)=>a-b)});
  },'sim-off'));
  controls.append(selectCampo('Distribuir',cfg.distribuicao,[['igual','Igual nos 5 dias'],['proporcional','Proporcional ao atual']],value=>editarPlano(r,carga,week,{distribuicao:value}),'sim-method'));
  controls.append(selectCampo('Ajustar automaticamente',cfg.ajuste,[['saida','Modificar a saída'],['entrada','Modificar a entrada'],['ambos','Dividir entrada / saída']],value=>editarPlano(r,carga,week,{ajuste:value}),'sim-method'));
  controls.append(selectCampo('Deslocar todos os horários',cfg.deslocamento,[[-60,'1h mais cedo'],[-30,'30min mais cedo'],[0,'Sem deslocar'],[30,'30min mais tarde'],[60,'1h mais tarde']],value=>editarPlano(r,carga,week,{deslocamento:Number(value)}),'sim-method'));
  card.append(controls);
  const rodizioBar=document.createElement('div');rodizioBar.className='sim-mini-tools';
  const check=document.createElement('label');check.className='rodizio-label';const input=document.createElement('input');input.type='checkbox';input.checked=rodizio;
  input.onchange=()=>{const obj=infoPlano(r,carga);obj.rodizio=input.checked;if(input.checked&&!obj.B)obj.B=JSON.parse(JSON.stringify(L.configCenario(r,carga,'A')));if(!input.checked)obj.ativo='A';atualizar();};
  check.append(input,document.createTextNode('Revezamento entre semanas A e B'));rodizioBar.append(check);
  if(rodizio){const switcher=document.createElement('div');switcher.className='small-switch';for(const w of ['A','B']){const b=document.createElement('button');b.type='button';b.className='switch-week '+(week===w?'active':'');b.textContent='Semana '+w;b.onclick=()=>{infoPlano(r,carga).ativo=w;atualizar();};switcher.append(b);}rodizioBar.append(switcher);}
  const restore=document.createElement('button');restore.type='button';restore.className='button tiny outline reset-plan';restore.textContent='Restaurar horários automáticos';restore.onclick=()=>editarPlano(r,carga,week,{manual:{},trocas:{}});rodizioBar.append(restore);card.append(rodizioBar);
  const table=document.createElement('div');table.className='sim-table-scroll';const tab=document.createElement('table');tab.className='sim-edit-table';tab.innerHTML='<thead><tr><th>Dia</th><th>Revezar entrada</th><th>Entrada</th><th>Intervalo início</th><th>Intervalo fim</th><th>Saída</th><th>Horas</th><th aria-label="Restaurar dia"></th></tr></thead>';
  const tbody=document.createElement('tbody');
  for(const d of sim.detalhe){
   const tr=document.createElement('tr');tr.className=d.edicao?'is-custom':'';
   const th=document.createElement('th');th.scope='row';th.textContent=L.DIAS_LONGOS[d.dia];tr.append(th);
   const turnoTd=document.createElement('td');const turno=document.createElement('select');turno.className='sim-turno';turno.setAttribute('aria-label','Revezamento de '+L.DIAS_LONGOS[d.dia]);
   if(d.edicao){const op=document.createElement('option');op.value='manual';op.textContent='Personalizado';turno.append(op);}
   for(const [v,name] of [[0,'Original'],[-60,'−1h'],[-30,'−30min'],[30,'+30min'],[60,'+1h'],[90,'+1h30']]){const op=document.createElement('option');op.value=String(v);op.textContent=name;turno.append(op);}
   turno.value=d.edicao?'manual':String(cfg.trocas?.[String(d.dia)]??0);
   turno.onchange=()=>{const trocas={...cfg.trocas,[String(d.dia)]:Number(turno.value)},manual={...cfg.manual};delete manual[String(d.dia)];editarPlano(r,carga,week,{trocas,manual});};turnoTd.append(turno);tr.append(turnoTd);
   for(const [chave,etiqueta] of [['entrada','Entrada'],['intervalo_inicio','Início intervalo'],['intervalo_fim','Fim intervalo'],['saida','Saída']]){
    const td=document.createElement('td');const inp=document.createElement('input');inp.type='text';inp.inputMode='numeric';inp.className='sim-time';inp.maxLength=5;inp.placeholder='hh:mm';inp.value=d[chave]||'';inp.setAttribute('list','horas-brasil');inp.setAttribute('aria-label',etiqueta+' '+L.DIAS_LONGOS[d.dia]+' de '+r.nome);
    inp.onchange=()=>{const val=L.normalizarHora(inp.value);if(inp.value.trim()&&!val){inp.classList.add('invalid');notificar('Horário inválido. Use 07:30 ou 18:00.',true);return;}const manual={...cfg.manual};manual[String(d.dia)]={entrada:d.entrada,intervalo_inicio:d.intervalo_inicio,intervalo_fim:d.intervalo_fim,saida:d.saida,[chave]:val};editarPlano(r,carga,week,{manual});};td.append(inp);tr.append(td);
   }
   const tdtotal=document.createElement('td');tdtotal.className='sim-day-total';tdtotal.textContent=L.duracao(d.minutos);tr.append(tdtotal);
   const tdrestore=document.createElement('td');const btn=document.createElement('button');btn.type='button';btn.className='day-reset';btn.title='Restaurar este dia';btn.textContent='↺';btn.disabled=!d.edicao&&!cfg.trocas?.[String(d.dia)];btn.onclick=()=>{const manual={...cfg.manual},trocas={...cfg.trocas};delete manual[String(d.dia)];delete trocas[String(d.dia)];editarPlano(r,carga,week,{manual,trocas});};tdrestore.append(btn);tr.append(tdrestore);tbody.append(tr);
  }
  tab.append(tbody);table.append(tab);card.append(table);
  const foot=document.createElement('div');foot.className='sim-mini-bottom';const status=document.createElement('div');status.innerHTML=`<strong>${L.duracao(sim.total)} / ${carga}h</strong> <span class="${sim.diferenca===0?'positive':'negative'}">${sim.diferenca===0?'✓ Meta atingida':sim.diferenca===null?'Horários inválidos':(sim.diferenca>0?'+':'−')+L.duracao(Math.abs(sim.diferenca))+' da meta'}</span><span class="off-days">Folgas: ${sim.folgas.map(x=>L.DIAS[x]).join(' e ')}</span>`;foot.append(status);card.append(foot);
  if(sim.alertas.length){const alerta=document.createElement('details');alerta.className='sim-notes';const summary=document.createElement('summary');summary.textContent=sim.alertas.length+' observação(ões) para conferir';alerta.append(summary);const ul=document.createElement('ul');for(const a of sim.alertas){const li=document.createElement('li');li.textContent=a;ul.append(li);}alerta.append(ul);card.append(alerta);}
  area.append(card);
 }
}

// O parser local atualizado mantém os resultados consistentes mesmo quando há um servidor Rust conectado.
async function interpretar(){const texto=$('#frase').value.trim();if(!texto){notificar('Digite um funcionário e o horário.',true);return;}const valor=L.interpretarLocal(texto);if(!valor.nome&&!valor.dias&&!valor.entrada){notificar('Não consegui interpretar. Experimente um dos modelos disponíveis.',true);return;}
 // Reutiliza linha totalmente vazia para não criar fichas desnecessárias.
 const novo={...empty(),...valor,id:novoId()};delete novo.entendido;delete novo.avisos;
 const blank=estado.funcionarios.length===1&&!(estado.funcionarios[0].nome||estado.funcionarios[0].entrada||estado.funcionarios[0].semana);
 if(blank){estado.funcionarios[0]={...novo};renderLinhas();}else adicionar(novo);
 $('#frase').value='';notificar('Horário interpretado. '+(valor.semana?'Detectei diferenças entre os dias. Clique em “Horários por dia” para conferir. ':'')+(valor.avisos?.join(' ')||''));}
function preset(nome){const modelos={
 misto44:{dias:'seg-sex',entrada:'07:30',intervalo_inicio:'12:00',intervalo_fim:'13:30',saida:'18:00',semana:Object.fromEntries([...Array(5)].map((_,i)=>[i,i===4?{entrada:'08:00',intervalo_inicio:'12:00',intervalo_fim:'14:00',saida:'18:00'}:{entrada:'07:30',intervalo_inicio:'12:00',intervalo_fim:'13:30',saida:'18:00'}]))},
 segsex40:{dias:'seg-sex',entrada:'08:00',intervalo_inicio:'12:00',intervalo_fim:'13:00',saida:'17:00'},
 segsab:{dias:'seg-sab',entrada:'08:00',intervalo_inicio:'12:00',intervalo_fim:'13:00',saida:'17:00'},
 tersab:{dias:'ter-sab',entrada:'09:00',intervalo_inicio:'13:00',intervalo_fim:'14:00',saida:'18:00'},
 comercio44:{dias:'seg-sab',entrada:'08:00',intervalo_inicio:'12:00',intervalo_fim:'13:00',saida:'17:00',semana:Object.fromEntries([...Array(6)].map((_,i)=>[i,i===5?{entrada:'08:00',intervalo_inicio:'',intervalo_fim:'',saida:'12:00'}:{entrada:'08:00',intervalo_inicio:'12:00',intervalo_fim:'13:00',saida:'17:00'}]))},
 '42horas':{dias:'seg-sex',entrada:'08:00',intervalo_inicio:'12:00',intervalo_fim:'13:00',saida:'17:24'},
 quadom:{dias:'qua-dom',entrada:'10:00',intervalo_inicio:'14:00',intervalo_fim:'15:00',saida:'19:00'}};
 const novo={...empty(),...modelos[nome]};const primeiro=estado.funcionarios.length===1&&!(estado.funcionarios[0].nome||estado.funcionarios[0].entrada||estado.funcionarios[0].semana);
 if(primeiro){estado.funcionarios[0]=novo;renderLinhas();}else adicionar(novo,true);
 notificar('Modelo adicionado. Informe o nome do funcionário e confira os horários.');}
function exportar(){const blob=new Blob([JSON.stringify({...estado,versao:3,exportado_em:new Date().toISOString()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`linhares-escala5x2-${new Date().toISOString().slice(0,10)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
async function importar(e){const file=e.target.files?.[0];if(!file)return;try{if(file.size>500000)throw Error('Arquivo muito grande.');const data=JSON.parse(await file.text());if(!Array.isArray(data.funcionarios)||data.funcionarios.length>150)throw Error('Formato inválido.');if(!confirm('Substituir as informações desta ficha?'))return;
 const campos=['nome','dias','dias_personalizados','entrada','intervalo_inicio','intervalo_fim','saida','distribuicao'];
 const reg=r=>{const novo=empty();for(const k of campos)novo[k]=String(r[k]||'').slice(0,100);if(r.semana&&typeof r.semana==='object'&&!Array.isArray(r.semana)){novo.semana={};for(let d=0;d<7;d++)if(r.semana[d]){novo.semana[d]={};for(const k of ['entrada','intervalo_inicio','intervalo_fim','saida'])novo.semana[d][k]=L.normalizarHora(String(r.semana[d][k]||''));}}if(Array.isArray(r.folgasSim)&&r.folgasSim.length===2)novo.folgasSim=r.folgasSim.map(Number);if(r.simulacoes&&typeof r.simulacoes==='object'&&!Array.isArray(r.simulacoes)){novo.simulacoes={};for(const k of ['40','42']){const source=r.simulacoes[k];if(!source||typeof source!=='object')continue;novo.simulacoes[k]={rodizio:!!source.rodizio,ativo:source.ativo==='B'?'B':'A'};for(const w of ['A','B'])if(source[w]&&typeof source[w]==='object'){const conf=source[w];const dest={};if(Array.isArray(conf.folgas)&&conf.folgas.length===2)dest.folgas=conf.folgas.map(Number);if(['igual','proporcional'].includes(conf.distribuicao))dest.distribuicao=conf.distribuicao;if(['saida','entrada','ambos'].includes(conf.ajuste))dest.ajuste=conf.ajuste;dest.deslocamento=Number(conf.deslocamento)||0;dest.trocas={};for(const [dia,valor] of Object.entries(conf.trocas||{}))if(/^[0-6]$/.test(dia)&&Math.abs(Number(valor))<=120)dest.trocas[dia]=Number(valor);dest.manual={};for(const [dia,h] of Object.entries(conf.manual||{}))if(/^[0-6]$/.test(dia)&&h&&typeof h==='object'){dest.manual[dia]={};for(const key of ['entrada','intervalo_inicio','intervalo_fim','saida'])dest.manual[dia][key]=L.normalizarHora(String(h[key]||''));}novo.simulacoes[k][w]=dest;}}}return novo;};
 estado={empresa:String(data.empresa||'').slice(0,110),funcionamento:String(data.funcionamento||'').slice(0,120),domingo:data.domingo==='sim'?'sim':'nao',observacoes:String(data.observacoes||'').slice(0,600),funcionarios:data.funcionarios.map(reg),cenario:data.cenario===40?40:42};if(!estado.funcionarios.length)estado.funcionarios=[empty()];preencherCabecalho();renderLinhas();notificar('Dados importados. Revise as jornadas específicas.');}catch(err){notificar('Importação não concluída: '+err.message,true);}finally{e.target.value='';}}
// Relatório A4 paisagem: uma ficha por funcionário, por cenário e por semana.
function linhaRelatorio(h,off){if(off)return ['Folga','Folga','Folga','—'];return [h.entrada||'—',h.intervalo_inicio&&h.intervalo_fim?h.intervalo_inicio+' – '+h.intervalo_fim:'—',h.saida||'—',L.duracao(L.calculoDia(h).minutos)];}
function construirRelatorio(tipos){
 const print=$('#print-report');print.replaceChildren();
 const cadastrados=estado.funcionarios.filter(r=>r.nome.trim()&&L.diasNumero(r).length);
 for(const r of cadastrados){for(const carga of tipos){const raiz=infoPlano(r,carga),weeks=raiz.rodizio?['A','B']:['A'];
  for(const week of weeks){
   const sim=L.cenario(r,carga,week),atual=L.calculo(r),propostos=new Map(sim.detalhe.map(d=>[d.dia,d]));
   const pagina=document.createElement('section');pagina.className='report-sheet';
   const title=document.createElement('div');title.className='report-header';title.innerHTML=`<div class="report-logo"><div class="report-initials">LI</div><div><strong>LINHARES</strong><span>INTELIGÊNCIA CONTÁBIL</span></div></div><div class="report-title"><strong>PROPOSTA DE JORNADA 5x2</strong><span>Simulação para análise • ${new Intl.DateTimeFormat('pt-BR').format(new Date())}</span></div>`;pagina.append(title);
   const empresa=document.createElement('div');empresa.className='report-ident';empresa.innerHTML=`<div><small>EMPRESA</small><strong>${esc(estado.empresa||'Não informada')}</strong></div><div><small>FUNCIONÁRIO</small><strong>${esc(r.nome)}</strong></div><div><small>CENÁRIO</small><strong>${carga}h semanais${raiz.rodizio?' · Semana '+week:''}</strong></div>`;pagina.append(empresa);
   const totals=document.createElement('div');totals.className='report-totals';totals.innerHTML=`<div><small>JORNADA ATUAL</small><strong>${L.duracao(atual.total)}</strong><span>${atual.dias.length} dia(s) trabalhados</span></div><div><small>JORNADA PROPOSTA</small><strong>${L.duracao(sim.total)}</strong><span>Meta: ${carga}h · 5 dias</span></div><div><small>FOLGAS PROPOSTAS</small><strong>${esc(sim.folgas.map(x=>L.DIAS_LONGOS[x]).join(' e '))}</strong><span>${sim.diferenca===0?'Carga semanal atingida':sim.diferenca===null?'Conferir horários':'Diferença de '+L.duracao(Math.abs(sim.diferenca))+' '+(sim.diferenca>0?'acima':'abaixo')+' da meta'}</span></div>`;pagina.append(totals);
   const table=document.createElement('table');table.className='report-comparison';
   table.innerHTML='<thead><tr><th rowspan="2" class="day-col">DIA</th><th colspan="4" class="current-group">HORÁRIO ATUAL</th><th colspan="4" class="proposal-group">HORÁRIO PROPOSTO</th></tr><tr><th>Entrada</th><th>Intervalo</th><th>Saída</th><th>Horas</th><th>Entrada</th><th>Intervalo</th><th>Saída</th><th>Horas</th></tr></thead>';
   const tbody=document.createElement('tbody');for(let d=0;d<7;d++){
    const atualAtivo=L.diasNumero(r).includes(d),novo=propostos.get(d),celulasAtuais=linhaRelatorio(L.horarioDia(r,d),!atualAtivo),celulasNovas=novo?linhaRelatorio(novo,false):linhaRelatorio({},true);
    const tr=document.createElement('tr');tr.className=!novo?'report-off':'';const name=document.createElement('th');name.scope='row';name.textContent=L.DIAS_LONGOS[d];tr.append(name);
    for(const [i,val] of [...celulasAtuais,...celulasNovas].entries()){const td=document.createElement('td');td.textContent=val;if(i===3||i===7)td.className='report-hours';tr.append(td);}tbody.append(tr);
   }
   const finalRow=document.createElement('tr');finalRow.className='report-total-row';finalRow.innerHTML=`<th scope="row">TOTAL</th><td colspan="3">Horas efetivamente trabalhadas na semana</td><td class="report-hours">${L.duracao(atual.total)}</td><td colspan="3">Horas propostas nos cinco dias</td><td class="report-hours">${L.duracao(sim.total)}</td>`;tbody.append(finalRow);table.append(tbody);pagina.append(table);
   const warnings=document.createElement('div');warnings.className='report-warnings';const obs=sim.alertas.filter(x=>!x.startsWith('Há horários alterados'));
   warnings.innerHTML=`<strong>Observações para validação:</strong><p>${esc(obs.length?obs.join(' • '):'Jornada simulada. Conferir condições de funcionamento, CCT e folgas antes de aprovar.')}</p>`;pagina.append(warnings);
   const footer=document.createElement('div');footer.className='report-footer';footer.innerHTML='<p><strong>Documento de estudo, não é alteração contratual.</strong> Conferir a EC 141/2026, a CLT, a convenção/acordo coletivo, os descansos e a viabilidade operacional. Os horários originais permanecem inalterados no sistema.</p><span>LINHARES INTELIGÊNCIA CONTÁBIL · Confiança para estarmos juntos, parceria para irmos além.</span>';pagina.append(footer);
   print.append(pagina);
  }
 }}
 return print.childElementCount;
}
function imprimirSimulacao(ambos=false){
 const total=construirRelatorio(ambos?[42,40]:[estado.cenario]);if(!total){notificar('Informe nome e dias de pelo menos um funcionário para imprimir.',true);return;}
 document.body.classList.add('print-sim');window.print();
}

function prepararImpressao(){const faltantes=Math.max(0,15-estado.funcionarios.length);for(let i=0;i<faltantes;i++){const tr=document.createElement('tr');tr.className='print-blank';for(let j=0;j<8;j++)tr.append(document.createElement('td'));$('#linhas').append(tr);}}
const removerImpressao=()=>document.querySelectorAll('.print-blank').forEach(x=>x.remove());
document.addEventListener('DOMContentLoaded',()=>{
 preencherCabecalho();for(const k of ['empresa','funcionamento','domingo','observacoes'])for(const evt of ['input','change'])$('#'+k).addEventListener(evt,()=>{estado[k]=$(`#${k}`).value;salvar();});renderLinhas();
 $('#interpretar').onclick=interpretar;$('#frase').onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))interpretar();};
 $('#exemplo').onclick=()=>{$('#frase').value='Maria, segunda a quinta, 07:30 às 12:00 e 13:30 às 18:00; sexta, 08:00 às 12:00 e 14:00 às 18:00';$('#frase').focus();};
 document.querySelectorAll('.example-chip').forEach(b=>b.onclick=()=>{$('#frase').value=b.dataset.example;$('#frase').focus();});
 document.querySelectorAll('.preset').forEach(b=>b.onclick=()=>preset(b.dataset.preset));
 $('#adicionar').onclick=()=>adicionar(null,true);$('#adicionar2').onclick=()=>adicionar(null,true);
 $('#replicar').onclick=()=>{const ultimo=[...estado.funcionarios].reverse().find(r=>L.calculo(r).total!==null);if(!ultimo){notificar('Preencha primeiro um horário válido.',true);return;}adicionar({...JSON.parse(JSON.stringify(ultimo)),nome:'',id:novoId(),folgasSim:null},true);notificar('Horários copiados. Digite o nome do novo funcionário.');};
 $('#btn42').onclick=()=>alternarCenario(42);$('#btn40').onclick=()=>alternarCenario(40);
 $('#exportar').onclick=exportar;$('#importar').onchange=importar;
 $('#limpar').onclick=()=>{if(!confirm('Apagar os dados desta ficha?'))return;estado=novoEstado();preencherCabecalho();renderLinhas();$('#frase').value='';$('#mensagem').hidden=true;};
 $('#imprimir').onclick=()=>{document.body.classList.remove('print-sim');prepararImpressao();window.print();setTimeout(removerImpressao,2000);};
 $('#imprimir-sim').onclick=()=>imprimirSimulacao(false);$('#imprimir-ambos').onclick=()=>imprimirSimulacao(true);window.addEventListener('afterprint',()=>{removerImpressao();document.body.classList.remove('print-sim');});
});
})();
