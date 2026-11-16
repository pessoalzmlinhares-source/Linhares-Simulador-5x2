/* Motor de regras local: perfis de horários brasileiros por dia, sem dependências. */
(function(root){'use strict';
const DIAS=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
const DIAS_LONGOS=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const MAPA={'seg-sex':[0,1,2,3,4],'seg-sab':[0,1,2,3,4,5],'ter-sab':[1,2,3,4,5],'qua-dom':[2,3,4,5,6],'seg-dom':[0,1,2,3,4,5,6]};
const NORMAL=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const vazio=()=>({entrada:'',intervalo_inicio:'',intervalo_fim:'',saida:''});
function parseHora(s){const m=String(s||'').trim().match(/^(\d{1,2})(?:[:h](\d{1,2}))?h?$/i);if(!m)return null;const a=Number(m[1]),b=Number(m[2]||0);return a>=0&&a<24&&b>=0&&b<60?a*60+b:null;}
function hora(m){m=((m%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
function normalizarHora(s){const n=parseHora(s);return n===null?'':hora(n);}
function duracao(m){return m===null||!Number.isFinite(m)||m<0?'—':Math.floor(m/60)+'h'+String(m%60).padStart(2,'0');}
const nomes={seg:0,segunda:0,ter:1,terca:1,qua:2,quarta:2,qui:3,quinta:3,sex:4,sexta:4,sab:5,sabado:5,dom:6,domingo:6};
function listaDias(s){return [...new Set((NORMAL(s).match(/\b(?:seg|segunda|ter|terca|qua|quarta|qui|quinta|sex|sexta|sab|sabado|dom|domingo)\b/g)||[]).map(d=>nomes[d]))].sort((a,b)=>a-b);}
function diasNumero(r){if(r.dias!=='personalizado')return MAPA[r.dias]?.slice()||[];return listaDias(r.dias_personalizados||'');}
function horarioDia(r,d){return r.semana && r.semana[d]? {...vazio(),...r.semana[d]}: {entrada:r.entrada||'',intervalo_inicio:r.intervalo_inicio||'',intervalo_fim:r.intervalo_fim||'',saida:r.saida||''};}
function corrigirRegistro(r){const base={nome:'',dias:'',dias_personalizados:'',entrada:'',intervalo_inicio:'',intervalo_fim:'',saida:'',semana:null,folgasSim:null,distribuicao:'igual',simulacoes:{}};return {...base,...r,semana:r?.semana&&typeof r.semana==='object'&&!Array.isArray(r.semana)?r.semana:null,simulacoes:r?.simulacoes&&typeof r.simulacoes==='object'&&!Array.isArray(r.simulacoes)?r.simulacoes:{}};}
function calculoDia(h){const ent=parseHora(h.entrada),sai=parseHora(h.saida),p1=h.intervalo_inicio,p2=h.intervalo_fim,avisos=[];
 if(ent===null||sai===null)return {minutos:null,pausa:null,avisos:['Entrada ou saída não informada.']};
 const bruto=(sai-ent+1440)%1440;
 if(!bruto)return {minutos:null,pausa:null,avisos:['Entrada e saída iguais.']};
 let pausa=0;if(Boolean(p1)!==Boolean(p2))return {minutos:null,pausa:null,avisos:['Intervalo incompleto.']};
 if(p1&&p2){const ini=parseHora(p1),fim=parseHora(p2);if(ini===null||fim===null||fim<=ini)return {minutos:null,pausa:null,avisos:['Intervalo inválido.']};pausa=fim-ini; if(pausa>=bruto)return {minutos:null,pausa:null,avisos:['Intervalo maior que a jornada.']};}
 const minutos=bruto-pausa;
 if(minutos>480)avisos.push('Acima de 8h/dia: avaliar acordo/convenção coletiva e regras de compensação.');
 if(minutos>360 && pausa<60)avisos.push('Intervalo inferior a 1h em jornada superior a 6h: conferir CLT e norma coletiva.');
 if(minutos>240 && minutos<=360 && pausa<15)avisos.push('Conferir intervalo mínimo de 15 minutos para jornada de 4h a 6h.');
 if(minutos>600)avisos.push('Jornada superior a 10h: verificar possível irregularidade.');
 return {minutos,pausa,avisos};}
function calculo(r){const dias=diasNumero(r),avisos=[],detalhe=[],n=r.nome||'';let total=0,completo=true;
 if(!n.trim())avisos.push('Informe o nome.');if(!dias.length)avisos.push('Selecione os dias de trabalho.');
 for(const d of dias){const h=horarioDia(r,d),res=calculoDia(h);detalhe.push({dia:d,horario:h,...res});if(res.minutos===null)completo=false;else total+=res.minutos;for(const a of res.avisos)avisos.push(DIAS[d]+': '+a);}
 if(dias.length>5)avisos.push('Escala com mais de cinco dias: estudar migração para 5x2.');
 if(total>2640)avisos.push('Carga atual acima de 44h semanais: revisar registros.');
 return {total:completo&&dias.length?total:null,dias,detalhe,avisos,diario:detalhe.length&&detalhe.every(x=>x.minutos===detalhe[0].minutos)?detalhe[0].minutos:null};}
function escolherFolgas(r){const ativos=diasNumero(r),fora=DIAS.map((_,i)=>i).filter(i=>!ativos.includes(i));
 if(Array.isArray(r.folgasSim)&&r.folgasSim.length===2&&r.folgasSim[0]!==r.folgasSim[1]&&r.folgasSim.every(x=>Number.isInteger(x)&&x>=0&&x<7))return r.folgasSim.slice().sort();
 let folgas=[...fora];for(const d of [6,5,0,4,3,2,1])if(folgas.length<2&&!folgas.includes(d))folgas.push(d);
 return folgas.slice(0,2).sort();}
function distribuir(minutos,quantidades,modo){const q=quantidades.length;let valores=[];
 if(modo==='proporcional'&&quantidades.every(x=>x!==null&&x>0)){const soma=quantidades.reduce((a,b)=>a+b,0);valores=quantidades.map(x=>minutos*x/soma);}else valores=Array(q).fill(minutos/q);
 const piso=valores.map(Math.floor);let resto=minutos-piso.reduce((a,b)=>a+b,0);const ordem=valores.map((x,i)=>({i,fracao:x-piso[i]})).sort((a,b)=>b.fracao-a.fracao||a.i-b.i);
 for(let i=0;i<resto;i++)piso[ordem[i].i]++;return piso;}
/* V3 — simulações separadas por carga e por semana, com horários alteráveis.
   Nada altera a jornada original. A alteração manual substitui apenas a linha escolhida. */
function configCenario(r,carga,semana='A'){
 const root=r?.simulacoes?.[String(carga)]||{},raw=root?.[semana]||{};
 const folgas=Array.isArray(raw.folgas)&&raw.folgas.length===2&&raw.folgas[0]!==raw.folgas[1]&&raw.folgas.every(x=>Number.isInteger(x)&&x>=0&&x<7)?raw.folgas.slice().sort((a,b)=>a-b):escolherFolgas(r);
 return {folgas,distribuicao:['igual','proporcional'].includes(raw.distribuicao)?raw.distribuicao:(r.distribuicao||'igual'),ajuste:['saida','entrada','ambos'].includes(raw.ajuste)?raw.ajuste:'saida',deslocamento:Number.isFinite(Number(raw.deslocamento))?Math.max(-120,Math.min(120,Number(raw.deslocamento))):0,trocas:raw.trocas&&typeof raw.trocas==='object'?raw.trocas:{},manual:raw.manual&&typeof raw.manual==='object'?raw.manual:{}};
}
function calcularBase(r,carga,semana='A'){
 const cfg=configCenario(r,carga,semana),dias=DIAS.map((_,i)=>i).filter(d=>!cfg.folgas.includes(d));
 const originais=diasNumero(r),baseOriginal=originais.find(d=>calculoDia(horarioDia(r,d)).minutos!==null);
 const fallback=baseOriginal===undefined?vazio():horarioDia(r,baseOriginal);
 const horarios=dias.map(d=>{const h=horarioDia(r,d),c=calculoDia(h);return c.minutos===null?{h:fallback,referencia:true}:{h,referencia:!originais.includes(d)};});
 const pesos=horarios.map(x=>calculoDia(x.h).minutos);
 const metas=distribuir(carga*60,pesos,cfg.distribuicao);
 const detalhe=dias.map((dia,i)=>{
  const {h,referencia}=horarios[i],orig=calculoDia(h);
  let inicio=parseHora(h.entrada),fim=parseHora(h.saida),p1=h.intervalo_inicio?parseHora(h.intervalo_inicio):null,p2=h.intervalo_fim?parseHora(h.intervalo_fim):null;
  if(inicio===null||fim===null||orig.minutos===null)return {dia,entrada:'',intervalo_inicio:'',intervalo_fim:'',saida:'',minutos:null,meta:metas[i],referencia:true,edicao:false,ajusteDia:0};
  const diferenca=metas[i]-orig.minutos;
  if(cfg.ajuste==='saida')fim+=diferenca;
  else if(cfg.ajuste==='entrada')inicio-=diferenca;
  else {const deltaEntrada=-Math.trunc(diferenca/2);inicio+=deltaEntrada;fim+=diferenca+deltaEntrada;}
  const turno=Number(cfg.trocas?.[String(dia)]??0),offset=cfg.deslocamento+turno;
  inicio+=offset;fim+=offset;
  if(p1!==null)p1+=offset;
  if(p2!==null)p2+=offset;
  const raw={entrada:hora(inicio),intervalo_inicio:p1===null?'':hora(p1),intervalo_fim:p2===null?'':hora(p2),saida:hora(fim)};
  const edit=cfg.manual?.[String(dia)];const hFinal=edit?{...raw,...edit}:raw;
  return {dia,...hFinal,minutos:calculoDia(hFinal).minutos,meta:metas[i],referencia,edicao:!!edit,ajusteDia:turno};
 });
 return {cfg,detalhe,dias,originais};
}
function cenario(r,carga,semana='A'){
 const {cfg,detalhe,dias,originais}=calcularBase(r,carga,semana);
 const valido=detalhe.every(x=>x.minutos!==null),total=valido?detalhe.reduce((n,x)=>n+x.minutos,0):null;
 const alertas=[];
 if(originais.length!==5)alertas.push('A escala original tem '+originais.length+' dias: confirmar cobertura, folgas e transição para 5x2.');
 if(detalhe.some(x=>x.referencia))alertas.push('Há horário de outro dia usado como referência: confira a nova escala.');
 if(detalhe.some(x=>x.minutos===null))alertas.push('Existem horários incompletos ou inválidos.');
 for(const x of detalhe){
   if(x.minutos===null)continue;
   if(x.minutos>480)alertas.push('Dias com mais de 8h exigem análise do acordo/convenção coletiva aplicável.');
   if(x.minutos>600)alertas.push('Jornada superior a 10h em um dos dias: revisar antes de aprovar.');
   const calc=calculoDia(x);if(calc.avisos.some(a=>a.includes('Intervalo')))alertas.push('Conferir intervalos conforme a CLT e norma coletiva.');
 }
 if(total!==null&&total!==carga*60)alertas.push('Total diferente da meta: '+duracao(total)+' de '+carga+'h. Ajuste os horários ou restaure os valores automáticos.');
 if(detalhe.some(x=>x.edicao))alertas.push('Há horários alterados manualmente nesta proposta.');
 return {carga,dias,folgas:cfg.folgas,detalhe,total,meta:carga*60,diferenca:total===null?null:total-carga*60,alertas:[...new Set(alertas)]};
}
const DAY='(?:segunda|terca|quarta|quinta|sexta|sabado|domingo|seg|ter|qua|qui|sex|sab|dom)';
const RXGROUP=new RegExp('\\b('+DAY+')(?:\\s*(?:a|ate|-)\\s*('+DAY+'))?\\b','g');
const RXFAIXA=/\b(?:das?\s*)?(\d{1,2})(?:[:h](\d{1,2}))?\s*h?\s*(?:as|ate|a|-)\s*(\d{1,2})(?:[:h](\d{1,2}))?\s*h?\b/g;
function identificarFaixas(s){const a=[];for(const m of s.matchAll(RXFAIXA)){
 const ini=normalizarHora(m[1]+':'+String(Number(m[2]||0)).padStart(2,'0'));
 const fim=normalizarHora(m[3]+':'+String(Number(m[4]||0)).padStart(2,'0'));
 if(ini&&fim){const contexto=s.slice(Math.max(0,m.index-20),m.index);a.push({ini,fim,pos:m.index,pausa:/\b(?:almoco|intervalo|pausa)\b/.test(contexto)});}}
 return a;}
function montarHorario(faixas){if(!faixas.length)return null;
 if(faixas.length===1)return {entrada:faixas[0].ini,saida:faixas[0].fim,intervalo_inicio:'',intervalo_fim:''};
 const pausa=faixas.find(f=>f.pausa);if(pausa){const jornada=faixas.find(f=>f!==pausa);if(jornada)return {entrada:jornada.ini,saida:jornada.fim,intervalo_inicio:pausa.ini,intervalo_fim:pausa.fim};}
 const ordenadas=[...faixas].sort((a,b)=>parseHora(a.ini)-parseHora(b.ini));
 if(ordenadas.length>=2&&parseHora(ordenadas[0].fim)<=parseHora(ordenadas[1].ini))return {entrada:ordenadas[0].ini,intervalo_inicio:ordenadas[0].fim,intervalo_fim:ordenadas[1].ini,saida:ordenadas[1].fim};
 return {entrada:ordenadas[0].ini,saida:ordenadas[0].fim,intervalo_inicio:ordenadas[1].ini,intervalo_fim:ordenadas[1].fim};}
function interpretarLocal(texto){const original=String(texto||'').trim(),s=NORMAL(original).replace(/[.](?=\s|$)/g,'');
 const saida={entendido:false,nome:'',dias:'',dias_personalizados:'',entrada:'',intervalo_inicio:'',intervalo_fim:'',saida:'',semana:null,avisos:[]};
 const candidato=original.split(/[,;\n]/)[0].trim().replace(/^funcion[aá]ri[oa]\s*:/i,'');
 if(candidato.length<=70&&!/\d/.test(candidato)&&!new RegExp('^(?:'+DAY+'|horario|das?\\s)', 'i').test(NORMAL(candidato)))saida.nome=candidato;
 const grupos=[...s.matchAll(RXGROUP)].map(m=>({pos:m.index,fim:m.index+m[0].length,dias:(()=>{
 const ini=nomes[m[1]],fim=m[2]===undefined?ini:nomes[m[2]];
 if(fim<ini)return [];return Array.from({length:fim-ini+1},(_,i)=>ini+i);})()})).filter(g=>g.dias.length);
 let mapa={};
 for(let i=0;i<grupos.length;i++){const g=grupos[i];const segmento=s.slice(g.fim,grupos[i+1]?.pos??s.length);const faixas=identificarFaixas(segmento);const horas=montarHorario(faixas);if(horas)for(const d of g.dias)mapa[d]=horas;}
 // Fallback quando a frase só informa uma faixa após um grupo, sem quebra por dia.
 const keys=Object.keys(mapa).map(Number).sort((a,b)=>a-b);
 if(keys.length){const mesmos=keys.every(d=>JSON.stringify(mapa[d])===JSON.stringify(mapa[keys[0]]));
   const codigo=Object.entries(MAPA).find(([,v])=>JSON.stringify(v)===JSON.stringify(keys));
   saida.dias=codigo?.[0]||'personalizado';saida.dias_personalizados=saida.dias==='personalizado'?keys.map(d=>DIAS[d].toLowerCase()).join(', '):'';
   Object.assign(saida,mapa[keys[0]]);
   if(!mesmos){saida.semana=mapa;saida.avisos.push('Identificados horários diferentes por dia; confira os detalhes na tabela.');}
 }else{const faixas=identificarFaixas(s);const horas=montarHorario(faixas);if(horas)Object.assign(saida,horas);if(!grupos.length)saida.avisos.push('Informe os dias de trabalho.');else saida.avisos.push('Confira as faixas de horário.');}
 if(!saida.nome)saida.avisos.push('Confira o nome.');if(!saida.dias)saida.avisos.push('Confira os dias trabalhados.');
 if(!saida.entrada||!saida.saida)saida.avisos.push('Informe entrada e saída.');
 if(!saida.intervalo_inicio&&!saida.intervalo_fim)saida.avisos.push('Sem intervalo identificado; confira a necessidade legal.');
 saida.entendido=!!(saida.nome&&saida.dias&&saida.entrada&&saida.saida);return saida;}
const api={DIAS,DIAS_LONGOS,MAPA,NORMAL,parseHora,hora,normalizarHora,duracao,listaDias,diasNumero,horarioDia,corrigirRegistro,calculoDia,calculo,cenario,configCenario,calcularBase,escolherFolgas,interpretarLocal};
root.EscalaLogic=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
