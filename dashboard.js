/* ── ODARA DASHBOARD v5 ── */
'use strict';

// ══════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════
function authCheck() {
  const v  = document.getElementById('auth-in').value;
  const pw = window.ODARA_PASSWORD || 'odara';
  if (v === pw) {
    sessionStorage.setItem('odara_auth','1');
    document.getElementById('auth-ov').style.display  = 'none';
    document.getElementById('sidebar').style.display  = 'flex';
    document.getElementById('main-area').style.display= 'block';
    initDashboard();
  } else {
    document.getElementById('auth-err').textContent = 'Senha incorreta. Tente novamente.';
    document.getElementById('auth-in').value = '';
    document.getElementById('auth-in').focus();
  }
}
window.authCheck = authCheck;

// ══════════════════════════════════════════════
// DADOS — carregados do Supabase ou fallback dummy
// ══════════════════════════════════════════════
const DUMMY = {
  totalRespondents: 127,
  completionRate: 87,
  overallScore: 3.82,
  byAudience: {
    internos:      { n:68,  score:3.71, label:'Colaboradores',    color:'#FFB81D' },
    liderancas:    { n:22,  score:4.01, label:'Lideranças',        color:'#EE2737' },
    fornecedores:  { n:19,  score:3.88, label:'Fornecedores',      color:'#27AE60' },
    distribuidores:{ n:18,  score:3.94, label:'Distribuidores',    color:'#3498DB' },
  },
  dims: {
    'Liderança e prioridade':    { geral:3.9, internos:3.7, liderancas:4.2 },
    'Comunicação e clareza':     { geral:3.6, internos:3.4, liderancas:3.8 },
    'Competência e treinamento': { geral:3.5, internos:3.3, liderancas:3.7 },
    'Disciplina operacional':    { geral:3.8, internos:3.7, liderancas:4.0 },
    'Higiene e comportamento':   { geral:3.2, internos:3.0, liderancas:3.9 },
    'Reporte e aprendizagem':    { geral:3.1, internos:2.9, liderancas:3.4 },
    'Cultura do time':           { geral:4.1, internos:3.9, liderancas:4.3 },
  },
  distribution: [5,10,18,38,29],
  questions: [
    { id:'I16', dim:'Reporte e aprendizagem',    txt:'Me sinto à vontade para apontar falhas sem medo de represália',       score:2.9, byArea:{Produção:2.7,Qualidade:3.4,Logística:2.8,Comercial:3.1,Adm:3.0} },
    { id:'I15', dim:'Higiene e comportamento',   txt:'Comunicaria à supervisão se estivesse com sintoma de doença',         score:3.0, byArea:{Produção:2.8,Qualidade:3.6,Logística:3.0,Comercial:3.2,Adm:3.1} },
    { id:'I18', dim:'Reporte e aprendizagem',    txt:'Aprendo sobre erros e ocorrências de outras áreas',                   score:3.1, byArea:{Produção:2.9,Qualidade:3.7,Logística:3.0,Comercial:3.3,Adm:3.1} },
    { id:'I09', dim:'Competência e treinamento', txt:'Conheço alergênicos e sei evitar contaminação cruzada',               score:3.2, byArea:{Produção:3.0,Qualidade:4.0,Logística:3.1,Comercial:3.2,Adm:3.3} },
    { id:'I14', dim:'Higiene e comportamento',   txt:'Mantenho higiene pessoal mesmo quando não observado',                 score:3.2, byArea:{Produção:3.0,Qualidade:3.9,Logística:3.2,Comercial:3.3,Adm:3.2} },
    { id:'I19', dim:'Reporte e aprendizagem',    txt:'Ações corretivas costumam funcionar de verdade',                      score:3.4, byArea:{Produção:3.2,Qualidade:3.9,Logística:3.3,Comercial:3.5,Adm:3.4} },
    { id:'I17', dim:'Reporte e aprendizagem',    txt:'A causa real de um desvio é investigada e tratada',                  score:3.5, byArea:{Produção:3.3,Qualidade:4.0,Logística:3.4,Comercial:3.6,Adm:3.5} },
    { id:'I11b',dim:'Disciplina operacional',    txt:'Registros são feitos completos e no momento certo',                  score:3.6, byArea:{Produção:3.5,Qualidade:4.1,Logística:3.5,Comercial:3.7,Adm:3.6} },
    { id:'I07', dim:'Competência e treinamento', txt:'Treinamentos me preparam para agir com segurança e qualidade',       score:3.7, byArea:{Produção:3.5,Qualidade:4.2,Logística:3.6,Comercial:3.8,Adm:3.7} },
    { id:'I04', dim:'Comunicação e clareza',     txt:'Sei quais controles críticos se aplicam ao meu trabalho',            score:3.9, byArea:{Produção:3.7,Qualidade:4.3,Logística:3.8,Comercial:4.0,Adm:3.9} },
    { id:'I01', dim:'Liderança e prioridade',    txt:'Qualidade é prioridade real nas decisões do dia a dia',              score:3.9, byArea:{Produção:3.7,Qualidade:4.3,Logística:3.8,Comercial:4.0,Adm:3.9} },
    { id:'I13', dim:'Disciplina operacional',    txt:'Entendo por que os controles críticos são importantes',              score:4.0, byArea:{Produção:3.8,Qualidade:4.4,Logística:3.9,Comercial:4.1,Adm:4.0} },
    { id:'I20', dim:'Cultura do time',           txt:'Meu time ajuda a manter o padrão correto',                          score:4.1, byArea:{Produção:4.0,Qualidade:4.5,Logística:4.0,Comercial:4.2,Adm:4.1} },
    { id:'I22', dim:'Cultura do time',           txt:'Tenho orgulho do padrão que a Odara entrega ao mercado',            score:4.3, byArea:{Produção:4.1,Qualidade:4.6,Logística:4.2,Comercial:4.4,Adm:4.3} },
  ],
  // 3 heatmaps separados
  heatmaps: {
    internos: {
      areas:['Produção','Qualidade','Logística','Comercial','Adm'],
      rows:[
        { name:'Liderança',   full:'Liderança e prioridade',    scores:[3.7,4.3,3.6,4.0,3.9] },
        { name:'Comunicação', full:'Comunicação e clareza',     scores:[3.4,4.0,3.5,3.8,3.6] },
        { name:'Competência', full:'Competência e treinamento', scores:[3.3,4.1,3.2,3.5,3.7] },
        { name:'Disciplina',  full:'Disciplina operacional',    scores:[3.9,4.2,3.7,3.6,3.8] },
        { name:'Higiene',     full:'Higiene e comportamento',   scores:[3.0,4.0,3.1,3.4,3.2] },
        { name:'Reporte',     full:'Reporte e aprendizagem',    scores:[2.9,3.7,3.0,3.2,3.3] },
        { name:'Cultura',     full:'Cultura do time',           scores:[4.0,4.4,3.8,4.1,4.2] },
      ]
    },
    fornecedores: {
      areas:['Especificações','Rastreabilidade','NCs','Relacionamento','Confiança'],
      rows:[
        { name:'Alinhamento', full:'Especificações e alinhamento',          scores:[3.8,4.1,3.6,4.0,3.9] },
        { name:'Mudanças',    full:'Gestão de mudanças',                    scores:[3.5,3.8,3.4,3.7,3.6] },
        { name:'Docs',        full:'Rastreabilidade e documentação',        scores:[3.7,4.0,3.5,3.8,3.6] },
        { name:'NCs',         full:'Tratamento de não conformidades',       scores:[3.4,3.9,3.3,3.7,3.5] },
        { name:'Relac.',      full:'Gestão do relacionamento',              scores:[3.9,4.2,3.7,4.0,3.8] },
      ]
    },
    distribuidores: {
      areas:['Produto','Logística','Docs','Atendimento','Confiança'],
      rows:[
        { name:'Consistência',full:'Consistência do produto',              scores:[3.9,4.3,3.7,4.1,3.8] },
        { name:'Segurança',   full:'Segurança percebida',                  scores:[4.1,4.5,4.0,4.3,4.2] },
        { name:'Rastreab.',   full:'Rastreabilidade',                      scores:[3.7,4.1,3.6,3.9,3.8] },
        { name:'Serviço',     full:'Serviço logístico',                    scores:[3.6,3.9,3.5,3.8,3.7] },
        { name:'NPS',         full:'Recomendação (NPS de qualidade)',      scores:[4.0,4.4,3.8,4.2,4.1] },
      ]
    }
  },
  verbatim: [
    { type:'strengths', aud:'Colaborador · Produção',     txt:'A liderança sempre reforça que qualidade vem antes do volume. Isso faz diferença no dia a dia.' },
    { type:'strengths', aud:'Liderança · Qualidade',      txt:'A equipe de qualidade está muito mais presente na linha. As pessoas sabem que podem recorrer.' },
    { type:'strengths', aud:'Distribuidor · Sul',         txt:'A consistência do produto melhorou muito nos últimos 6 meses. Menos devoluções.' },
    { type:'weaknesses',aud:'Colaborador · Produção',     txt:'A gente não fica sabendo quando algo dá errado em outra área. Informação não circula.' },
    { type:'weaknesses',aud:'Colaborador · Logística',    txt:'Os registros estão sendo feitos às pressas no final do turno. Não é o momento certo.' },
    { type:'weaknesses',aud:'Fornecedor · Matéria-prima', txt:'Quando há não conformidade, o retorno da Odara demora mais do que deveria.' },
    { type:'actions',   aud:'Colaborador · Produção',     txt:'Mural de desvios resolvidos mostrando o aprendizado. Motivaria mais o time.' },
    { type:'actions',   aud:'Liderança · Produção',       txt:'15 min semanais de DDS focado em um ponto crítico diferente a cada semana.' },
    { type:'actions',   aud:'Fornecedor · Embalagem',     txt:'Canal de WhatsApp direto com qualidade para resolver dúvidas rápido.' },
  ]
};

// State
let D = DUMMY; // will be replaced by Supabase data if available
let heatSel = null;
let heatFilterAudience = '';
let ci = {}; // chart instances

let actions = [
  { id:'a1', dim:'Reporte e aprendizagem',    pri:'Alta',  title:'Implantar cultura de reporte sem punição', desc:'Criar protocolo explícito que reportar desvios é comportamento valorizado. Comunicar em DDS.', owner:'Gerência de Qualidade',  deadline:'2025-08-30', expected:'Score Reporte de 3.1 → ≥3.5', status:'progress', pct:40 },
  { id:'a2', dim:'Higiene e comportamento',   pri:'Alta',  title:'Verificação comportamental (peer observation)', desc:'Implantar checklist de higiene por observação cruzada. Incluir alergênicos.', owner:'Qualidade + Supervisores',deadline:'2025-07-31', expected:'Score Higiene de 3.2 → ≥3.6', status:'open',     pct:0  },
  { id:'a3', dim:'Competência e treinamento', pri:'Média', title:'Treinamento: alergênicos e contaminação cruzada', desc:'Módulo prático 2h para toda a produção sobre alergênicos nos produtos Odara.', owner:'P&D + Qualidade',        deadline:'2025-09-15', expected:'Score I09 de 3.2 → ≥3.8',   status:'open',     pct:0  },
];

const C = { y:'#FFB81D',yl:'rgba(255,184,29,.15)',r:'#EE2737',p:'#0C0C0C',g:'#565555' };

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('odara_auth')==='1') {
    document.getElementById('auth-ov').style.display  = 'none';
    document.getElementById('sidebar').style.display  = 'flex';
    document.getElementById('main-area').style.display= 'block';
    initDashboard();
  }
});

async function initDashboard() {
  document.getElementById('topbar-date').textContent =
    'Coleta: '+new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'});

  // Try load from Supabase
  await loadFromSupabase();

  initOverview();
  initDimTable();
  initHeatmap();
  renderVerbatim('all');
  renderStrategicInsights();
  renderActions();
  updateBadge();
}

async function loadFromSupabase() {
  const U = window.SUPABASE_URL || '';
  const K = window.SUPABASE_ANON_KEY || '';
  if (!U || !K || U.includes('SEU_PROJETO')) return; // still dummy

  try {
    // Load aggregated scores per dimension via view
    const dimScores = await window.sbSelect('/dimension_scores?select=*');
    if (dimScores && dimScores.length > 0) {
      // Rebuild D.dims from Supabase
      const rebuilt = {};
      dimScores.forEach(row => {
        const d = row.dimension;
        if (!rebuilt[d]) rebuilt[d] = {};
        const key = row.survey_type === 'internos' ? 'internos' :
                    row.survey_type === 'liderancas' ? 'liderancas' : 'geral';
        rebuilt[d][key] = parseFloat(row.avg_score);
      });
      // Compute geral as average of all
      Object.keys(rebuilt).forEach(d => {
        const vals = Object.values(rebuilt[d]).filter(v => !isNaN(v));
        if (vals.length) rebuilt[d].geral = parseFloat((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2));
      });
      if (Object.keys(rebuilt).length > 0) D.dims = rebuilt;
    }

    // Load respondent counts
    const respondents = await window.sbSelect('/respondents?select=survey_type');
    if (respondents && respondents.length > 0) {
      D.totalRespondents = respondents.length;
      const counts = { internos:0, liderancas:0, fornecedores:0, distribuidores:0 };
      respondents.forEach(r => { if (counts[r.survey_type] !== undefined) counts[r.survey_type]++; });
      Object.keys(D.byAudience).forEach(k => { D.byAudience[k].n = counts[k] || 0; });

      // Recalc overall score from Supabase responses
      const resp = await window.sbSelect('/responses?select=value_numeric&value_numeric=not.is.null');
      if (resp && resp.length > 0) {
        const nums = resp.map(r=>parseFloat(r.value_numeric)).filter(v=>!isNaN(v)&&v>=1&&v<=5);
        if (nums.length) D.overallScore = parseFloat((nums.reduce((a,b)=>a+b,0)/nums.length).toFixed(2));
      }
    }

    // Load actions from Supabase
    const sbActions = await window.sbSelect('/action_plans?select=*&order=created_at.desc');
    if (sbActions && sbActions.length > 0) {
      actions = sbActions.map(a => ({
        id:       String(a.id),
        dim:      a.dimension,
        pri:      a.priority,
        title:    a.title,
        desc:     a.description || '',
        owner:    a.owner || '',
        deadline: a.deadline || '',
        expected: a.expected_result || '',
        status:   a.status,
        pct:      a.progress_pct || 0,
      }));
    }

    console.log('[Odara] Dados carregados do Supabase com sucesso.');
  } catch(e) {
    console.warn('[Odara] Supabase indisponível, usando dados de demonstração.', e.message);
  }
}

// ══════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════
const TITLES = { overview:'Visão Geral', dimensions:'Dimensões', heatmap:'Heatmap de Gaps',
                 verbatim:'Respostas Abertas', insights:'Insights Estratégicos', actions:'Plano de Ação' };
function showTab(id) {
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('active'));
  document.getElementById('content-'+id).classList.add('active');
  document.getElementById('tab-'+id).classList.add('active');
  document.getElementById('tab-title').textContent = TITLES[id];
}
window.showTab = showTab;

// ══════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════
function initOverview() {
  document.getElementById('kv-resp').textContent  = D.totalRespondents;
  document.getElementById('kv-score').textContent = D.overallScore.toFixed(2);
  document.getElementById('kv-comp').textContent  = D.completionRate+'%';
  const crits = Object.values(D.dims).filter(d=>d.geral<3.5).length;
  document.getElementById('kv-crit').textContent  = crits;
  document.getElementById('kv-mat').textContent   = matLabel(D.overallScore);

  radarChart(); distChart(); dimBarChart();
  renderSegmented(); renderInsights();
}

function radarChart() {
  const ks=Object.keys(D.dims);
  new Chart(document.getElementById('radarChart'),{
    type:'radar',
    data:{
      labels:ks.map(d=>{const p=d.split(' e ');return p.length>1?[p[0]+' e',p[1]]:[d];}),
      datasets:[
        {label:'Geral (todos)',data:ks.map(d=>D.dims[d].geral),borderColor:C.y,backgroundColor:'rgba(255,184,29,.12)',borderWidth:3,pointBackgroundColor:C.y,pointRadius:7,pointHoverRadius:9,pointBorderColor:'#fff',pointBorderWidth:2},
        {label:'Lideranças',   data:ks.map(d=>D.dims[d].liderancas),borderColor:C.r,backgroundColor:'rgba(238,39,55,.07)',borderWidth:2,borderDash:[5,4],pointBackgroundColor:C.r,pointRadius:5,pointBorderColor:'#fff',pointBorderWidth:1.5},
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:true,
      scales:{r:{min:1,max:5,ticks:{stepSize:1,font:{size:10,family:'Barlow'},color:C.g,backdropColor:'transparent'},grid:{color:'rgba(255,184,29,.12)',lineWidth:1.5},angleLines:{color:'rgba(255,184,29,.1)'},pointLabels:{font:{size:11.5,weight:'600',family:'Barlow'},color:C.p}}},
      plugins:{legend:{position:'bottom',labels:{font:{size:11,family:'Barlow'},padding:20,color:C.p,usePointStyle:true,pointStyleWidth:13}}}
    }
  });
}

function distChart() {
  const labels=['1 — Discordo totalmente','2 — Discordo','3 — Neutro','4 — Concordo','5 — Concordo totalmente'];
  const colors=['#C0392B','#E67E22','#F39C12','#27AE60','#1E8449'];
  new Chart(document.getElementById('distChart'),{
    type:'bar',
    data:{labels,datasets:[{data:D.distribution,backgroundColor:colors.map(c=>c+'CC'),borderColor:colors,borderWidth:1.5,borderRadius:3,borderSkipped:false}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.parsed.x+'%'}}},
      scales:{x:{max:50,grid:{color:'rgba(12,12,12,.04)'},ticks:{callback:v=>v+'%',font:{size:10},color:C.g}},y:{grid:{display:false},ticks:{font:{size:10,weight:'500'},color:C.p}}}
    }
  });
}

function dimBarChart() {
  const ks=Object.keys(D.dims);
  new Chart(document.getElementById('dimBarChart'),{
    type:'bar',
    data:{labels:ks.map(d=>d.split(' ')[0]),datasets:[
      {label:'Colaboradores',data:ks.map(d=>D.dims[d].internos),backgroundColor:C.y+'BB',borderColor:C.y,borderWidth:1.5,borderRadius:3},
      {label:'Lideranças',   data:ks.map(d=>D.dims[d].liderancas),backgroundColor:C.p+'99',borderColor:C.p,borderWidth:1.5,borderRadius:3},
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:'top',labels:{font:{size:10,family:'Barlow'},padding:10,color:C.p,usePointStyle:true,pointStyleWidth:10}}},
      scales:{y:{min:1,max:5,grid:{color:'rgba(255,184,29,.08)'},ticks:{font:{size:9.5},color:C.g}},x:{grid:{display:false},ticks:{font:{size:9},color:C.p}}}
    }
  });
}

function renderSegmented() {
  const ks=Object.keys(D.dims);
  document.getElementById('seg-grid').innerHTML=Object.entries(D.byAudience).map(([key,aud])=>{
    const {cls}=scoreClass(aud.score);
    return `<div class="seg-card">
      <div class="sg-hdr">
        <div><div class="sg-lbl" style="color:${aud.color}">${aud.label}</div><div class="sg-n">${aud.n} respondentes</div></div>
        <div><div class="sg-sc" style="color:${aud.color}">${aud.score.toFixed(2)}</div><span class="pill ${cls}" style="font-size:7.5px;">${matLabel(aud.score)}</span></div>
      </div>
      ${ks.map(d=>{
        const sc=D.dims[d][key];if(sc==null)return'';
        const pct=((sc-1)/4)*100;
        const bc=sc<3.0?'#C0392B':sc<3.5?'#E67E22':sc<4.5?aud.color:'#27AE60';
        return `<div class="bar-row">
          <span class="bar-lbl">${d.split(' ')[0]}</span>
          <div class="bar-trk"><div class="bar-fill" style="width:${pct}%;background:${bc}"></div></div>
          <span class="bar-val" style="color:${bc}">${sc.toFixed(1)}</span>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');
}

function renderInsights() {
  const ins=[];
  Object.entries(D.dims).forEach(([dim,sc])=>{
    if(sc.geral<3.0) ins.push({type:'critical',t:`⚠️ Crítico: ${dim}`,b:`Score ${sc.geral.toFixed(1)} — Zona de risco. Ação imediata necessária.`});
    else if(sc.geral<3.5) ins.push({type:'warning',t:`📌 Atenção: ${dim}`,b:`Score ${sc.geral.toFixed(1)} — Plano de 90 dias sugerido.`});
    if(sc.internos&&sc.liderancas&&(sc.liderancas-sc.internos)>0.7)
      ins.push({type:'warning',t:`📊 Gap: ${dim}`,b:`Lideranças ${sc.liderancas.toFixed(1)} vs Colaboradores ${sc.internos.toFixed(1)} — desconexão de percepção.`});
    if(sc.geral>=4.0) ins.push({type:'positive',t:`✅ Força: ${dim}`,b:`Score ${sc.geral.toFixed(1)} — Replicar práticas para outras áreas.`});
  });
  document.getElementById('ins-grid').innerHTML=ins.slice(0,6).map(i=>
    `<div class="ins ${i.type}"><div class="ins-t">${i.t}</div>${i.b}</div>`
  ).join('');
}

// ══════════════════════════════════════════════
// RESPONDENTES MODAL
// ══════════════════════════════════════════════
function openRespModal() {
  const total=D.totalRespondents||1;
  document.getElementById('resp-breakdown').innerHTML=Object.entries(D.byAudience).map(([key,aud])=>{
    const pct=Math.round((aud.n/total)*100);
    return `<div class="resp-row">
      <span class="resp-label">${aud.label}</span>
      <div class="resp-bar-track"><div class="resp-bar-fill" style="width:${pct}%;background:${aud.color};"></div></div>
      <span class="resp-val" style="color:${aud.color}">${aud.n}</span>
    </div>`;
  }).join('');
  document.getElementById('resp-modal').style.display='flex';
}
window.openRespModal=openRespModal;

// ══════════════════════════════════════════════
// DIMENSÕES TABLE
// ══════════════════════════════════════════════
function initDimTable() {
  const rows=[];
  Object.entries(D.dims).forEach(([dim,sc])=>{
    rows.push({dim,pub:'Geral',score:sc.geral,bold:true});
    rows.push({dim,pub:'Colaboradores',score:sc.internos});
    rows.push({dim,pub:'Lideranças',score:sc.liderancas});
  });
  document.getElementById('dim-tbody').innerHTML=rows.map(r=>{
    const {cls,lbl}=scoreClass(r.score);
    return `<tr ${r.bold?'style="background:rgba(255,184,29,.04);"':''}>
      <td ${r.bold?'style="font-weight:700;"':''}>${r.bold?r.dim:''}</td>
      <td>${r.pub}</td><td><span class="pill ${cls}">${r.score.toFixed(2)}</span></td>
      <td>${lbl}</td><td style="font-size:10px;color:var(--g);">${recAction(r.score)}</td>
    </tr>`;
  }).join('');
}

// ══════════════════════════════════════════════
// HEATMAP — 3 públicos, drill-down à direita
// ══════════════════════════════════════════════
function initHeatmap() {
  buildHmFilters();
  buildAllHeatmaps();
  renderDrillDown();
}

function buildHmFilters() {
  document.getElementById('hm-filters-bar').innerHTML=`
    <span class="hm-fl">Filtrar público:</span>
    <select class="hm-sel" onchange="heatFilterAudience=this.value;buildAllHeatmaps()">
      <option value="">Todos</option>
      <option value="internos">Internos</option>
      <option value="fornecedores">Fornecedores</option>
      <option value="distribuidores">Distribuidores</option>
    </select>
    <button class="hm-rst" onclick="heatFilterAudience='';document.querySelector('.hm-sel').value='';buildAllHeatmaps()">↺ Limpar</button>
    <span style="font-size:9px;color:var(--g);margin-left:4px;">Clique em qualquer célula para análise detalhada →</span>`;
}

function buildAllHeatmaps() {
  const targets=['internos','fornecedores','distribuidores'];
  targets.forEach(key=>{
    const el=document.getElementById('hm-'+key);
    if(!el)return;
    if(heatFilterAudience && heatFilterAudience!==key){
      el.parentElement.parentElement.style.display='none';
      return;
    }
    el.parentElement.parentElement.style.display='';
    el.innerHTML=buildHmTable(D.heatmaps[key],key);
  });
}

function buildHmTable(data, audience) {
  let html=`<table class="hm-tbl"><thead><tr><th class="hm-th">Dimensão</th>`;
  data.areas.forEach(a=>html+=`<th class="hm-th" style="text-align:center;">${a}</th>`);
  html+=`</tr></thead><tbody>`;
  data.rows.forEach((row,di)=>{
    html+=`<tr><td class="hm-dn">${row.name}</td>`;
    row.scores.forEach((sc,ai)=>{
      const bg=heatColor(sc);
      const tc=sc<3.2?'#fff':'#0C0C0C';
      const isSel=heatSel&&heatSel.audience===audience&&heatSel.di===di&&heatSel.ai===ai;
      html+=`<td class="hm-cell${isSel?' hm-sel':''}" style="background:${bg};color:${tc};"
        onclick="selectHmCell('${audience}',${di},${ai},'${row.full}','${data.areas[ai]}',${sc})"
        title="${row.full} · ${data.areas[ai]}: ${sc.toFixed(1)}">
        <strong>${sc.toFixed(1)}</strong>
        <span class="hm-sub">${matLabel(sc).split(' ')[0]}</span>
      </td>`;
    });
    html+=`</tr>`;
  });
  return html+`</tbody></table>`;
}
window.buildAllHeatmaps=buildAllHeatmaps;

function selectHmCell(audience, di, ai, dimFull, area, score) {
  if(heatSel&&heatSel.audience===audience&&heatSel.di===di&&heatSel.ai===ai){
    heatSel=null; buildAllHeatmaps(); renderDrillDown(); return;
  }
  heatSel={audience,di,ai,dim:dimFull,area,score};
  buildAllHeatmaps();
  renderDrillDown();
}
window.selectHmCell=selectHmCell;

function renderDrillDown() {
  const el=document.getElementById('hm-drilldown');
  if(!el)return;
  if(!heatSel){
    el.innerHTML=`<div class="dd-hint">👈 Clique em qualquer célula do heatmap para ver análise detalhada, perguntas específicas e recomendações de ação para aquela combinação de dimensão e área.</div>`;
    return;
  }
  const{dim,area,score,audience}=heatSel;
  const{cls}=scoreClass(score);
  const qs=D.questions.filter(q=>q.dim===dim)
    .map(q=>({...q,asc:q.byArea[area]||q.score}))
    .sort((a,b)=>a.asc-b.asc);

  const dimRecs={
    'Reporte e aprendizagem':'Sensibilização sobre cultura justa. Garantir resposta visível da liderança a reportes recebidos.',
    'Higiene e comportamento':'Observação cruzada de higiene. Revisar acesso a EPIs e pias. Reforçar em DDS semanal.',
    'Competência e treinamento':'Mapear gaps por função. Priorizar treinamento de alergênicos e BPF.',
    'Comunicação e clareza':'Revisar quadros de comunicação. Verificar se procedimentos críticos estão visíveis nos postos.',
    'Liderança e prioridade':'Alinhar com supervisão sobre papel modelo. Incluir indicadores de qualidade nas reuniões.',
    'Disciplina operacional':'Revisar viabilidade dos procedimentos na rotina real. Criar verificação cruzada de registros.',
    'Cultura do time':'Compartilhar casos de sucesso. Criar momento de reconhecimento de comportamentos corretos.',
  };

  const audLabel={'internos':'Internos','fornecedores':'Fornecedores','distribuidores':'Distribuidores'}[audience]||audience;

  el.innerHTML=`<div class="dd-card">
    <div class="dd-hdr">
      <div class="dd-bc">📍 ${audLabel} · ${area} · ${dim}</div>
      <div class="dd-sl">
        <span class="dd-big ${cls}">${score.toFixed(1)}</span>
        <span class="pill ${cls}" style="font-size:8.5px;">${matLabel(score)}</span>
      </div>
    </div>
    <div class="dd-body">
      <div>
        <div class="dd-st">📋 Perguntas — ${area}</div>
        ${qs.length?qs.map(q=>{
          const sc=q.asc;
          const bc=sc<3.0?'#C0392B':sc<3.5?'#E67E22':sc<4.5?'#FFB81D':'#27AE60';
          const pct=((sc-1)/4)*100;
          return `<div class="dq-row">
            <span class="dq-id">${q.id}</span>
            <span class="dq-txt">${q.txt}</span>
            <div class="dq-bw"><div class="dq-bt"><div class="dq-bf" style="width:${pct}%;background:${bc}"></div></div>
            <span class="dq-sc" style="color:${bc}">${sc.toFixed(1)}</span></div>
          </div>`;
        }).join(''):`<div style="font-size:10px;color:var(--g);padding:6px 0;">Perguntas compartilhadas entre públicos — dados gerais aplicáveis.</div>`}
      </div>
      <div>
        <div class="dd-st">⚡ Recomendações — ${area}</div>
        <div class="da-list">
          ${score<3.5?`<div class="da da-crit">
            <div class="da-t">Intervenção prioritária — ${area}</div>
            <div class="da-b">Score ${score.toFixed(1)} exige atenção imediata. Diagnóstico presencial, envolver supervisão e plano de ação em 30 dias.</div>
            <button class="da-add" onclick="addFromDd('${dim}','${area}','Intervenção prioritária — ${dim} · ${area}')">+ Adicionar ao plano</button>
          </div>`:''}
          <div class="da da-info">
            <div class="da-t">${dim}</div>
            <div class="da-b">${dimRecs[dim]||'Revisar práticas e procedimentos com a equipe.'}</div>
            <button class="da-add" onclick="addFromDd('${dim}','${area}','${(dimRecs[dim]||'Ação para '+dim).substring(0,55).replace(/'/g,"\\'")}')">+ Adicionar ao plano</button>
          </div>
          ${qs.filter(q=>q.asc<3.5).length?`<div class="da da-warn">
            <div class="da-t">${qs.filter(q=>q.asc<3.5).length} pergunta(s) abaixo do limiar</div>
            <div class="da-b">${qs.filter(q=>q.asc<3.5).slice(0,2).map(q=>`"${q.txt.substring(0,45)}..." (${q.asc.toFixed(1)})`).join('; ')}.</div>
            <button class="da-add" onclick="addFromDd('${dim}','${area}','Treinamento focado nos itens críticos — ${area}')">+ Adicionar ao plano</button>
          </div>`:''}
        </div>
      </div>
    </div>
    <div style="padding:10px 18px 14px;display:flex;justify-content:flex-end;">
      <button class="dd-close-btn" onclick="heatSel=null;buildAllHeatmaps();renderDrillDown()">✕ Fechar análise</button>
    </div>
  </div>`;
}
window.renderDrillDown=renderDrillDown;

function addFromDd(dim,area,title){
  actions.unshift({
    id:'a'+Date.now(),dim,pri:'Alta',
    title:`[${area}] ${title}`.substring(0,80),
    desc:`Gerada via heatmap — Dimensão: ${dim} · Área: ${area}.`,
    owner:'A definir',deadline:'',expected:'',status:'open',pct:0
  });
  // Save to Supabase if available
  sbSaveAction(actions[0]);
  updateBadge();
  alert('✅ Ação adicionada ao Plano de Ação!\nAcesse a aba "Plano de Ação" para completar os detalhes.');
}
window.addFromDd=addFromDd;

async function sbSaveAction(a) {
  const U=window.SUPABASE_URL||'',K=window.SUPABASE_ANON_KEY||'';
  if(!U||!K||U.includes('SEU_PROJETO'))return;
  try {
    await window.sbInsert('action_plans',{
      dimension:a.dim, title:a.title, description:a.desc,
      owner:a.owner, priority:a.pri, deadline:a.deadline||null,
      expected_result:a.expected, status:a.status, progress_pct:a.pct
    });
  } catch(e){ console.warn('Erro ao salvar ação:', e.message); }
}

// ══════════════════════════════════════════════
// VERBATIM
// ══════════════════════════════════════════════
function filterVb(type,btn){
  document.querySelectorAll('.vb-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); renderVerbatim(type);
}
window.filterVb=filterVb;

function renderVerbatim(type){
  const ico={strengths:'💪',weaknesses:'⚠️',actions:'⚡'};
  const lbls={strengths:'Ponto Forte',weaknesses:'Ponto Fraco',actions:'Sugestão de Ação'};
  const list=type==='all'?D.verbatim:D.verbatim.filter(v=>v.type===type);
  document.getElementById('verbatim-list').innerHTML=list.map(v=>
    `<div class="vb-card"><div class="vb-meta"><span>${ico[v.type]} ${lbls[v.type]}</span><span>👤 ${v.aud}</span></div><div class="vb-txt">"${v.txt}"</div></div>`
  ).join('');
}

// ══════════════════════════════════════════════
// INSIGHTS ESTRATÉGICOS
// ══════════════════════════════════════════════
function renderStrategicInsights() {
  const el=document.getElementById('strategic-insights');
  if(!el)return;

  // Calcular problemas prioritários baseado nos scores
  const critDims=Object.entries(D.dims)
    .filter(([,sc])=>sc.geral<3.5)
    .sort((a,b)=>a[1].geral-b[1].geral);

  const problems = critDims.map(([dim,sc],i)=>({
    num:i+1, dim, score:sc.geral,
    desc: getProblemDesc(dim),
  }));

  const causas = [
    { text:'Cultura de punição implícita — colaboradores relatam desvios mas não recebem resposta visível da liderança, gerando desincentivo progressivo.', rel:'Reporte e aprendizagem' },
    { text:'Lacuna de formação comportamental — treinamentos focam em procedimentos, mas não em atitudes autônomas de higiene e segurança.', rel:'Higiene e comportamento · Competência' },
    { text:'Gap de comunicação vertical — lideranças percebem cultura mais positiva do que colaboradores operacionais, sugerindo desconexão de realidade.', rel:'Comunicação · Liderança' },
    { text:'Sobrecarga de registros — preenchimentos realizados fora do momento correto indicam processo não integrado à rotina operacional.', rel:'Disciplina operacional' },
    { text:'Conhecimento de alergênicos insuficiente — risco regulatório direto para confeitaria com múltiplos alérgenos declarados.', rel:'Competência e treinamento' },
  ];

  const strategics = [
    { icon:'🎯', title:'Programa de Cultura Justa', desc:'Implantar protocolo explícito de não-punição por reporte. Toda liderança deve responder visivelmente a cada reporte em até 48h.', horizon:'0–60 dias' },
    { icon:'🧼', title:'Rotina de Observação de Higiene', desc:'Peer observation semanal por turnos, com checklist digital. Foco em comportamento autônomo, não supervisionado.', horizon:'30–90 dias' },
    { icon:'🎓', title:'Módulo de Alergênicos', desc:'Treinamento prático 2h para toda a produção. Simulação de contaminação cruzada. Certificação interna por colaborador.', horizon:'60 dias' },
    { icon:'📢', title:'DDS Estruturado por Dimensão', desc:'15 minutos semanais por turno, rotacionando as 7 dimensões. Baseado nos dados da pesquisa. Líder conduz, qualidade apoia.', horizon:'Contínuo' },
    { icon:'📊', title:'Devolutiva para as Equipes', desc:'Apresentar os resultados desta pesquisa por área em até 30 dias. Equipes que não recebem devolutiva perdem engajamento nas rodadas seguintes.', horizon:'Urgente — até 30/04' },
  ];

  el.innerHTML=`
    <div class="is-card">
      <div class="is-title">🚨 Problemas Prioritários <span class="is-tag priority">PRIORITÁRIO</span></div>
      ${problems.length ? problems.map(p=>`<div class="problem-item">
        <div class="prob-num">${p.num}</div>
        <div class="prob-body">
          <div class="prob-title">${p.dim}</div>
          <div class="prob-desc">${p.desc}</div>
          <span class="prob-score">Score ${p.score.toFixed(1)} — ${matLabel(p.score)}</span>
        </div>
      </div>`).join('') : `<div style="font-size:11px;color:var(--g);">Nenhuma dimensão crítica — cultura em desenvolvimento positivo.</div>`}
    </div>

    <div class="is-card">
      <div class="is-title">🔍 Causas Potenciais a Validar <span class="is-tag cause">HIPÓTESES</span></div>
      ${causas.map(c=>`<div class="cause-item">
        <div class="cause-dot"></div>
        <div class="cause-text">${c.text} <em>(${c.rel})</em></div>
      </div>`).join('')}
    </div>

    <div class="is-card full">
      <div class="is-title">🚀 Recomendações Estratégicas <span class="is-tag strategic">PLANO DE AÇÃO</span></div>
      ${strategics.map(s=>`<div class="strat-item">
        <div class="strat-icon">${s.icon}</div>
        <div>
          <div class="strat-title">${s.title}</div>
          <div class="strat-desc">${s.desc}</div>
          <span class="strat-horizon">⏱ ${s.horizon}</span>
        </div>
      </div>`).join('')}
    </div>`;
}

function getProblemDesc(dim){
  const m={
    'Reporte e aprendizagem':'Colaboradores evitam reportar desvios por receio de consequências. O ciclo de aprendizagem organizacional está comprometido — erros se repetem porque não são tratados estruturalmente.',
    'Higiene e comportamento':'Comportamentos de higiene dependem de supervisão direta. Quando não observados, colaboradores relaxam práticas críticas de BPF — risco direto à segurança do produto.',
    'Competência e treinamento':'Gaps de conhecimento sobre alergênicos e procedimentos críticos. Treinamentos existentes não estão se traduzindo em mudança comportamental observável.',
    'Comunicação e clareza':'Colaboradores não têm clareza sobre controles críticos de sua área. Comunicações de mudanças chegam tarde ou incompletas, gerando desvios por desinformação.',
    'Disciplina operacional':'Registros realizados fora do momento correto, comprometendo rastreabilidade. Procedimentos percebidos como burocracia, não como ferramenta de proteção.',
    'Liderança e prioridade':'Percepção de que decisões priorizem prazo e custo sobre qualidade em momentos de pressão. Impacta diretamente a disposição da equipe em seguir padrões.',
    'Cultura do time':'Baixa cooperação horizontal para manutenção de padrões. Cada colaborador age individualmente, sem cobrar o outro ou se sentir responsável pelo produto final.',
  };
  return m[dim]||`Dimensão com score abaixo do limiar de desenvolvimento (3.5). Requer intervenção estruturada.`;
}

// ══════════════════════════════════════════════
// ACTIONS CRUD
// ══════════════════════════════════════════════
function renderActions(){
  updateBadge();
  const el=document.getElementById('act-list');if(!el)return;
  el.innerHTML=actions.map(a=>{
    const emoji=a.status==='done'?'✅':a.status==='progress'?'🔄':'⭕';
    const ptag=a.pri==='Alta'?'at-h':a.pri==='Crítica'?'at-c':'at-m';
    return `<div class="a-card" id="ac-${a.id}">
      <button class="a-sb ${a.status}" onclick="cycleStatus('${a.id}')">${emoji}</button>
      <div class="a-body">
        <div class="a-title">${a.title}</div>
        <div class="a-meta">👤 ${a.owner||'—'} · 📅 ${fmtDate(a.deadline)}</div>
        <div class="a-desc">${a.desc}</div>
        <div class="a-tags">
          <span class="atag ${ptag}">${a.pri}</span>
          <span class="atag at-d">${a.dim}</span>
          ${a.status==='done'?'<span class="atag at-ok">✅ Concluída</span>':''}
        </div>
        <div class="a-pb"><div class="a-pf" style="width:${a.pct||0}%"></div></div>
        ${a.expected?`<div style="font-size:9.5px;color:var(--g);margin-top:4px;">🎯 ${a.expected}</div>`:''}
      </div>
      <div class="a-acts">
        <button class="btn-ae" onclick="openEdit('${a.id}')">✏️</button>
        <button class="btn-ad" onclick="deleteAction('${a.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('')||'<div style="color:var(--g);font-size:11px;padding:14px 0;">Nenhuma ação registrada.</div>';
}

function cycleStatus(id){
  const a=actions.find(x=>x.id===id);if(!a)return;
  const nxt={open:'progress',progress:'done',done:'open'};
  a.status=nxt[a.status];a.pct={open:0,progress:50,done:100}[a.status];
  sbUpdateAction(a); renderActions();
}

async function sbUpdateAction(a){
  const U=window.SUPABASE_URL||'',K=window.SUPABASE_ANON_KEY||'';
  if(!U||!K||U.includes('SEU_PROJETO'))return;
  try{
    await window.sbFetch('/action_plans?id=eq.'+a.id,{
      method:'PATCH',
      headers:{'Prefer':'return=minimal'},
      body:JSON.stringify({status:a.status,progress_pct:a.pct})
    });
  }catch(e){console.warn('Erro ao atualizar ação:',e.message);}
}

function openNewAction(){document.getElementById('act-form').style.display='block';}
function closeNewAction(){document.getElementById('act-form').style.display='none';}
window.openNewAction=openNewAction;window.closeNewAction=closeNewAction;

function saveNewAction(){
  const desc=document.getElementById('new-desc').value.trim();
  if(!desc){alert('Descreva a ação.');return;}
  const a={
    id:'a'+Date.now(),
    dim:   document.getElementById('new-dim').value,
    pri:   document.getElementById('new-priority').value,
    title: desc.substring(0,80),desc,
    owner:   document.getElementById('new-owner').value||'A definir',
    deadline:document.getElementById('new-deadline').value,
    expected:document.getElementById('new-expected').value,
    status:'open',pct:0
  };
  actions.unshift(a);sbSaveAction(a);closeNewAction();renderActions();
  ['new-owner','new-deadline','new-desc','new-expected'].forEach(id=>document.getElementById(id).value='');
}
window.saveNewAction=saveNewAction;

function openEdit(id){
  const a=actions.find(x=>x.id===id);if(!a)return;
  document.getElementById('edit-id').value=a.id;
  document.getElementById('edit-dim').value=a.dim;
  document.getElementById('edit-owner').value=a.owner||'';
  document.getElementById('edit-deadline').value=a.deadline||'';
  document.getElementById('edit-priority').value=a.pri;
  document.getElementById('edit-status').value=a.status;
  document.getElementById('edit-desc').value=a.desc;
  document.getElementById('edit-expected').value=a.expected||'';
  document.getElementById('edit-modal').style.display='flex';
}

function closeEdit(e){
  if(!e||e.target===document.getElementById('edit-modal'))
    document.getElementById('edit-modal').style.display='none';
}

function saveEdit(){
  const id=document.getElementById('edit-id').value;
  const a=actions.find(x=>x.id===id);if(!a)return;
  a.dim=document.getElementById('edit-dim').value;
  a.owner=document.getElementById('edit-owner').value;
  a.deadline=document.getElementById('edit-deadline').value;
  a.pri=document.getElementById('edit-priority').value;
  a.status=document.getElementById('edit-status').value;
  a.pct={open:0,progress:50,done:100}[a.status];
  a.desc=document.getElementById('edit-desc').value;
  a.expected=document.getElementById('edit-expected').value;
  a.title=a.desc.substring(0,80);
  sbUpdateAction(a);
  document.getElementById('edit-modal').style.display='none';
  renderActions();
}

function deleteAction(id){
  if(!confirm('Apagar esta ação?'))return;
  actions=actions.filter(x=>x.id!==id);
  // Delete from Supabase
  const U=window.SUPABASE_URL||'',K=window.SUPABASE_ANON_KEY||'';
  if(U&&K&&!U.includes('SEU_PROJETO'))
    window.sbFetch('/action_plans?id=eq.'+id,{method:'DELETE'}).catch(()=>{});
  renderActions();
}

function updateBadge(){const el=document.getElementById('actions-badge');if(el)el.textContent=actions.filter(a=>a.status!=='done').length;}
window.cycleStatus=cycleStatus;window.openEdit=openEdit;window.closeEdit=closeEdit;window.saveEdit=saveEdit;window.deleteAction=deleteAction;

// ══════════════════════════════════════════════
// EXPORT + UTILS
// ══════════════════════════════════════════════
function exportCSV(){
  const rows=[['Dimensão','Público','Score','Maturidade']];
  Object.entries(D.dims).forEach(([dim,sc])=>{
    rows.push([dim,'Geral',sc.geral,matLabel(sc.geral)]);
    rows.push([dim,'Colaboradores',sc.internos,matLabel(sc.internos)]);
    rows.push([dim,'Lideranças',sc.liderancas,matLabel(sc.liderancas)]);
  });
  const blob=new Blob(['\uFEFF'+rows.map(r=>r.join(';')).join('\n')],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`odara_cultura_${new Date().toISOString().split('T')[0]}.csv`;a.click();
}
window.exportCSV=exportCSV;

function heatColor(s){
  if(s<2.5)return'#C0392B';if(s<3.0)return'#E74C3C';
  if(s<3.5)return'#E67E22';if(s<4.0)return'#F1C40F';
  if(s<4.5)return'#82C53A';return'#27AE60';
}
function matLabel(s){if(s<2.5)return'Em Risco';if(s<3.5)return'Frágil';if(s<4.5)return'Em Desenvolvimento';return'Consolidada';}
function scoreClass(s){
  if(s<2.5)return{cls:'critical',lbl:'🔴 Em Risco'};
  if(s<3.5)return{cls:'fragile', lbl:'🟡 Frágil'};
  if(s<4.5)return{cls:'dev',     lbl:'🟠 Em Desenvolvimento'};
  return         {cls:'ok',      lbl:'🟢 Consolidada'};
}
function recAction(s){if(s<2.5)return'Ação imediata';if(s<3.5)return'Plano 90 dias';if(s<4.5)return'Fortalecer · Treinar';return'Manter · Replicar';}
function fmtDate(d){if(!d)return'Sem prazo';return new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});}
