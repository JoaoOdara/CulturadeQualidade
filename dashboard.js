/**
 * ODARA — Dashboard Analítico v3
 * Painel Cultural de Segurança do Produto & Qualidade · FSSC 22000 v6
 */

const MOCK = {
  totalRespondents: 127,
  completionRate: 87,
  overallScore: 3.82,
  byAudience: {
    internos:      { n:68,  score:3.71, label:'Colaboradores' },
    liderancas:    { n:22,  score:4.01, label:'Lideranças' },
    fornecedores:  { n:19,  score:3.88, label:'Fornecedores' },
    distribuidores:{ n:18,  score:3.94, label:'Distribuidores' },
  },
  dimensionScores: {
    'Liderança e prioridade':    { geral:3.9, internos:3.7, liderancas:4.2 },
    'Comunicação e clareza':     { geral:3.6, internos:3.4, liderancas:3.8 },
    'Competência e treinamento': { geral:3.5, internos:3.3, liderancas:3.7 },
    'Disciplina operacional':    { geral:3.8, internos:3.7, liderancas:4.0 },
    'Higiene e comportamento':   { geral:3.2, internos:3.0, liderancas:3.9 },
    'Reporte e aprendizagem':    { geral:3.1, internos:2.9, liderancas:3.4 },
    'Cultura do time':           { geral:4.1, internos:3.9, liderancas:4.3 },
  },
  distribution: { 1:5, 2:10, 3:18, 4:38, 5:29 },
  questionScores: [
    { id:'I16', dim:'Reporte e aprendizagem',    text:'Me sinto à vontade para apontar falhas sem medo de represália',       score:2.9, byArea:{Produção:2.7,Qualidade:3.4,Logística:2.8,Comercial:3.1,Adm:3.0} },
    { id:'I15', dim:'Higiene e comportamento',   text:'Comunicaria à supervisão se estivesse com sintoma de doença',         score:3.0, byArea:{Produção:2.8,Qualidade:3.6,Logística:3.0,Comercial:3.2,Adm:3.1} },
    { id:'I18', dim:'Reporte e aprendizagem',    text:'Aprendo sobre erros e ocorrências de outras áreas da empresa',        score:3.1, byArea:{Produção:2.9,Qualidade:3.7,Logística:3.0,Comercial:3.3,Adm:3.1} },
    { id:'I09', dim:'Competência e treinamento', text:'Conheço os alergênicos e sei evitar contaminação cruzada',            score:3.2, byArea:{Produção:3.0,Qualidade:4.0,Logística:3.1,Comercial:3.2,Adm:3.3} },
    { id:'I14', dim:'Higiene e comportamento',   text:'Mantenho higiene pessoal mesmo quando não estou sendo observado',     score:3.2, byArea:{Produção:3.0,Qualidade:3.9,Logística:3.2,Comercial:3.3,Adm:3.2} },
    { id:'I19', dim:'Reporte e aprendizagem',    text:'Ações corretivas após desvios costumam funcionar de verdade',         score:3.4, byArea:{Produção:3.2,Qualidade:3.9,Logística:3.3,Comercial:3.5,Adm:3.4} },
    { id:'I17', dim:'Reporte e aprendizagem',    text:'A causa real de um desvio é investigada e tratada',                  score:3.5, byArea:{Produção:3.3,Qualidade:4.0,Logística:3.4,Comercial:3.6,Adm:3.5} },
    { id:'I11b',dim:'Disciplina operacional',    text:'Registros e controles são feitos completos e no momento certo',      score:3.6, byArea:{Produção:3.5,Qualidade:4.1,Logística:3.5,Comercial:3.7,Adm:3.6} },
    { id:'I07', dim:'Competência e treinamento', text:'Treinamentos me preparam de fato para agir com segurança e qualidade',score:3.7, byArea:{Produção:3.5,Qualidade:4.2,Logística:3.6,Comercial:3.8,Adm:3.7} },
    { id:'I04', dim:'Comunicação e clareza',     text:'Sei exatamente quais controles críticos se aplicam ao meu trabalho', score:3.9, byArea:{Produção:3.7,Qualidade:4.3,Logística:3.8,Comercial:4.0,Adm:3.9} },
    { id:'I01', dim:'Liderança e prioridade',    text:'Qualidade e segurança são prioridades reais nas decisões do dia a dia',score:3.9,byArea:{Produção:3.7,Qualidade:4.3,Logística:3.8,Comercial:4.0,Adm:3.9} },
    { id:'I13', dim:'Disciplina operacional',    text:'Entendo por que os controles críticos são importantes',              score:4.0, byArea:{Produção:3.8,Qualidade:4.4,Logística:3.9,Comercial:4.1,Adm:4.0} },
    { id:'I20', dim:'Cultura do time',           text:'Meu time ajuda a manter o padrão correto',                          score:4.1, byArea:{Produção:4.0,Qualidade:4.5,Logística:4.0,Comercial:4.2,Adm:4.1} },
    { id:'I22', dim:'Cultura do time',           text:'Tenho orgulho do padrão que a Odara entrega ao mercado',            score:4.3, byArea:{Produção:4.1,Qualidade:4.6,Logística:4.2,Comercial:4.4,Adm:4.3} },
  ],
  heatmapData: {
    areas: ['Produção','Qualidade','Logística','Comercial','Adm'],
    dimensions: [
      { name:'Liderança',   full:'Liderança e prioridade',    scores:[3.7,4.3,3.6,4.0,3.9] },
      { name:'Comunicação', full:'Comunicação e clareza',     scores:[3.4,4.0,3.5,3.8,3.6] },
      { name:'Competência', full:'Competência e treinamento', scores:[3.3,4.1,3.2,3.5,3.7] },
      { name:'Disciplina',  full:'Disciplina operacional',    scores:[3.9,4.2,3.7,3.6,3.8] },
      { name:'Higiene',     full:'Higiene e comportamento',   scores:[3.0,4.0,3.1,3.4,3.2] },
      { name:'Reporte',     full:'Reporte e aprendizagem',    scores:[2.9,3.7,3.0,3.2,3.3] },
      { name:'Cultura',     full:'Cultura do time',           scores:[4.0,4.4,3.8,4.1,4.2] },
    ]
  },
  respondentProfiles: {
    turnos: ['Manhã','Tarde','Noite','Administrativo'],
    tempos: ['< 6 meses','6m–2 anos','2–5 anos','> 5 anos'],
    niveis: ['Operacional','Administrativo','Supervisor','Gerente/Diretor'],
  },
  verbatim: [
    { type:'strengths', audience:'Colaborador · Produção', text:'A liderança sempre reforça que qualidade vem antes do volume. Isso faz diferença no dia a dia.' },
    { type:'strengths', audience:'Liderança · Qualidade',  text:'A equipe de qualidade está muito mais presente na linha. As pessoas sabem que podem recorrer.' },
    { type:'strengths', audience:'Distribuidor · Sul',     text:'A consistência do produto melhorou muito nos últimos 6 meses. Menos devoluções.' },
    { type:'weaknesses',audience:'Colaborador · Produção', text:'A gente não fica sabendo quando algo dá errado em outra área. Informação não circula.' },
    { type:'weaknesses',audience:'Colaborador · Logística',text:'Os registros estão sendo feitos às pressas no final do turno. Não é o momento certo.' },
    { type:'weaknesses',audience:'Fornecedor · Matéria-prima',text:'Quando há não conformidade, o retorno da Odara demora mais do que deveria.' },
    { type:'actions',   audience:'Colaborador · Produção', text:'Fazer um mural de desvios resolvidos mostrando o aprendizado. Motivaria mais o time.' },
    { type:'actions',   audience:'Liderança · Produção',   text:'Criar 15 min semanais de DDS focado em um ponto crítico diferente a cada semana.' },
    { type:'actions',   audience:'Fornecedor · Embalagem', text:'Canal de WhatsApp direto com o time de qualidade para resolver dúvidas rápido.' },
  ]
};

let heatSelected = null;
let heatFilters  = { turno:'', tempo:'', nivel:'' };

let actionPlan = JSON.parse(localStorage.getItem('odara_actions')||'null') || [
  { id:'a1', dimension:'Reporte e aprendizagem', priority:'Alta',
    title:'Implantar cultura de reporte sem punição',
    desc:'Criar protocolo explícito que reportar desvios é comportamento valorizado. Comunicar em DDS e fixar nos postos.',
    owner:'Gerência de Qualidade', deadline:'2025-08-30', expected:'Score Reporte de 3.1 para ≥ 3.5', status:'progress', progress:40 },
  { id:'a2', dimension:'Higiene e comportamento', priority:'Alta',
    title:'Verificação comportamental (peer observation)',
    desc:'Implantar checklist de higiene por observação cruzada. Incluir alergênicos.',
    owner:'Qualidade + Supervisores', deadline:'2025-07-31', expected:'Score Higiene de 3.2 para ≥ 3.6', status:'open', progress:0 },
  { id:'a3', dimension:'Competência e treinamento', priority:'Média',
    title:'Treinamento: alergênicos e contaminação cruzada',
    desc:'Módulo prático 2h para toda a produção sobre alergênicos nos produtos Odara.',
    owner:'P&D + Qualidade', deadline:'2025-09-15', expected:'Score I09 de 3.2 para ≥ 3.8', status:'open', progress:0 },
];

const C = { y:'#FFB81D', yl:'rgba(255,184,29,0.18)', r:'#EE2737', p:'#0C0C0C', g:'#565555' };

// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('topbar-date').textContent =
    'Coleta: ' + new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const lr = JSON.parse(localStorage.getItem('odara_responses')||'[]');
  if(lr.length) MOCK.totalRespondents += lr.length;
  document.getElementById('kpi-respondents').textContent = MOCK.totalRespondents;

  initOverview();
  renderInsights();
  renderDimTable();
  renderHeatmap();
  renderVerbatim('all');
  renderActions();
  updateBadge();
});

const TITLES = { overview:'Visão Geral', dimensions:'Dimensões', heatmap:'Heatmap de Gaps', verbatim:'Respostas Abertas', actions:'Plano de Ação' };

function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
  document.getElementById('content-'+id).classList.add('active');
  document.getElementById('tab-'+id).classList.add('active');
  document.getElementById('tab-title').textContent = TITLES[id];
}

// ============================================================
// OVERVIEW
// ============================================================
function initOverview() {
  document.getElementById('kpi-score').textContent     = MOCK.overallScore.toFixed(2);
  document.getElementById('kpi-completion').textContent = MOCK.completionRate+'%';
  const crits = Object.values(MOCK.dimensionScores).filter(d=>d.geral<3.5).length;
  document.getElementById('kpi-critical').textContent   = crits;
  document.getElementById('kpi-maturity').textContent   = matLabel(MOCK.overallScore);
  radarChart();
  distributionChart();
  renderSegmentedScores();
}

function radarChart() {
  const dims  = Object.keys(MOCK.dimensionScores);
  const geral = dims.map(d=>MOCK.dimensionScores[d].geral);
  const lids  = dims.map(d=>MOCK.dimensionScores[d].liderancas);
  new Chart(document.getElementById('radarChart'),{
    type:'radar',
    data:{
      labels: dims.map(d=>{ const p=d.split(' e '); return p.length>1?[p[0]+' e',p[1]]:[d]; }),
      datasets:[
        { label:'Geral (todos)',data:geral,borderColor:C.y,backgroundColor:'rgba(255,184,29,0.12)',
          borderWidth:3,pointBackgroundColor:C.y,pointRadius:7,pointHoverRadius:9,pointBorderColor:'#fff',pointBorderWidth:2 },
        { label:'Lideranças',   data:lids, borderColor:C.r,backgroundColor:'rgba(238,39,55,0.07)',
          borderWidth:2,borderDash:[5,4],pointBackgroundColor:C.r,pointRadius:5,pointBorderColor:'#fff',pointBorderWidth:1.5 },
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:true,
      scales:{r:{
        min:1,max:5,
        ticks:{stepSize:1,font:{size:10,family:'Barlow'},color:C.g,backdropColor:'transparent'},
        grid:{color:'rgba(255,184,29,0.12)',lineWidth:1.5},
        angleLines:{color:'rgba(255,184,29,0.1)',lineWidth:1},
        pointLabels:{font:{size:12,weight:'600',family:'Barlow'},color:C.p}
      }},
      plugins:{
        legend:{position:'bottom',labels:{font:{size:12,family:'Barlow'},padding:24,color:C.p,
          usePointStyle:true,pointStyleWidth:14}}
      }
    }
  });
}

function distributionChart() {
  const labels=['1 — Discordo totalmente','2 — Discordo','3 — Neutro','4 — Concordo','5 — Concordo totalmente'];
  const data=Object.values(MOCK.distribution);
  const colors=['#C0392B','#E67E22','#F39C12','#27AE60','#1E8449'];
  new Chart(document.getElementById('distributionChart'),{
    type:'bar',
    data:{labels,datasets:[{data,backgroundColor:colors.map(c=>c+'CC'),borderColor:colors,borderWidth:1.5,borderRadius:4,borderSkipped:false}]},
    options:{
      indexAxis:'y',responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>ctx.parsed.x+'%'}}},
      scales:{
        x:{max:50,grid:{color:'rgba(12,12,12,0.05)'},ticks:{callback:v=>v+'%',font:{size:11},color:C.g}},
        y:{grid:{display:false},ticks:{font:{size:11,weight:'500'},color:C.p}}
      }
    }
  });
}

function renderSegmentedScores() {
  const container = document.getElementById('segmented-scores');
  if(!container) return;
  const dims = Object.keys(MOCK.dimensionScores);
  const aud = [
    { key:'internos',       label:'👷 Colaboradores',   color:'#FFB81D' },
    { key:'liderancas',     label:'🏆 Lideranças',       color:'#EE2737' },
    { key:'fornecedores',   label:'🤝 Fornecedores',     color:'#27AE60' },
    { key:'distribuidores', label:'🏪 Distribuidores',   color:'#3498DB' },
  ];
  container.innerHTML = aud.map(a => {
    const info = MOCK.byAudience[a.key];
    const {cls,lbl} = scoreClass(info.score);
    return `<div class="seg-card">
      <div class="seg-header">
        <div>
          <div class="seg-label" style="color:${a.color}">${a.label}</div>
          <div class="seg-n">${info.n} respondentes</div>
        </div>
        <div class="seg-score-block">
          <div class="seg-score" style="color:${a.color}">${info.score.toFixed(2)}</div>
          <span class="score-pill ${cls}" style="font-size:9px;">${lbl.replace(/🔴|🟡|🟠|🟢/g,'').trim()}</span>
        </div>
      </div>
      <div class="seg-bars">
        ${dims.map(d=>{
          const sc = MOCK.dimensionScores[d][a.key];
          if(sc==null) return '';
          const pct=((sc-1)/4)*100;
          const bc=sc<3.0?'#C0392B':sc<3.5?'#E67E22':sc<4.5?a.color:'#27AE60';
          const dShort=d.split(' ')[0];
          return `<div class="seg-bar-row">
            <span class="seg-bar-label">${dShort}</span>
            <div class="seg-bar-track"><div class="seg-bar-fill" style="width:${pct}%;background:${bc};"></div></div>
            <span class="seg-bar-val" style="color:${bc}">${sc.toFixed(1)}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// INSIGHTS
// ============================================================
function renderInsights() {
  const ins=[];
  Object.entries(MOCK.dimensionScores).forEach(([dim,sc])=>{
    if(sc.geral<3.0) ins.push({type:'critical',title:`⚠️ Crítico: ${dim}`,body:`Score ${sc.geral.toFixed(1)} — Zona de risco. Ação imediata com envolvimento da alta direção.`});
    else if(sc.geral<3.5) ins.push({type:'warning',title:`📌 Atenção: ${dim}`,body:`Score ${sc.geral.toFixed(1)} — Plano de intervenção de 90 dias sugerido.`});
  });
  Object.entries(MOCK.dimensionScores).forEach(([dim,sc])=>{
    if(sc.internos&&sc.liderancas){
      const gap=sc.liderancas-sc.internos;
      if(gap>0.7) ins.push({type:'warning',title:`📊 Gap: ${dim}`,body:`Lideranças ${sc.liderancas.toFixed(1)} vs Colaboradores ${sc.internos.toFixed(1)} (Δ ${gap.toFixed(1)}). Alinhar expectativas.`});
    }
  });
  Object.entries(MOCK.dimensionScores).forEach(([dim,sc])=>{
    if(sc.geral>=4.0) ins.push({type:'positive',title:`✅ Ponto forte: ${dim}`,body:`Score ${sc.geral.toFixed(1)} — Cultura consolidada. Replicar práticas para outras áreas.`});
  });
  document.getElementById('insights-grid').innerHTML=ins.slice(0,6).map(i=>
    `<div class="insight-card ${i.type}"><div class="insight-title">${i.title}</div><div>${i.body}</div></div>`
  ).join('');
}

// ============================================================
// DIMENSÕES TABLE
// ============================================================
function renderDimTable() {
  const rows=[];
  Object.entries(MOCK.dimensionScores).forEach(([dim,sc])=>{
    rows.push({dim,pub:'Geral',score:sc.geral,bold:true});
    rows.push({dim,pub:'Colaboradores',score:sc.internos});
    rows.push({dim,pub:'Lideranças',score:sc.liderancas});
  });
  document.getElementById('dim-table-body').innerHTML=rows.map(r=>{
    const {cls,lbl}=scoreClass(r.score);
    return `<tr ${r.bold?'style="background:rgba(255,184,29,0.04);"':''}>
      <td ${r.bold?'style="font-weight:700;"':''}>${r.bold?r.dim:''}</td>
      <td>${r.pub}</td>
      <td><span class="score-pill ${cls}">${r.score.toFixed(2)}</span></td>
      <td>${lbl}</td>
      <td style="font-size:11px;color:var(--g);">${recAction(r.score)}</td>
    </tr>`;
  }).join('');
}

// ============================================================
// HEATMAP + FILTROS + DRILL-DOWN
// ============================================================
function renderHeatmap() {
  buildHeatmapFilters();
  buildHeatmapTable();
  renderDrillDown();
}

function buildHeatmapFilters() {
  const el=document.getElementById('heatmap-filters');
  if(!el) return;
  const p=MOCK.respondentProfiles;
  el.innerHTML=`
    <div class="hm-filter-group">
      <label class="hm-filter-label">Turno</label>
      <select class="hm-filter-sel" onchange="heatFilters.turno=this.value;buildHeatmapTable()">
        <option value="">Todos</option>${p.turnos.map(t=>`<option>${t}</option>`).join('')}
      </select>
    </div>
    <div class="hm-filter-group">
      <label class="hm-filter-label">Tempo de empresa</label>
      <select class="hm-filter-sel" onchange="heatFilters.tempo=this.value;buildHeatmapTable()">
        <option value="">Todos</option>${p.tempos.map(t=>`<option>${t}</option>`).join('')}
      </select>
    </div>
    <div class="hm-filter-group">
      <label class="hm-filter-label">Nível</label>
      <select class="hm-filter-sel" onchange="heatFilters.nivel=this.value;buildHeatmapTable()">
        <option value="">Todos</option>${p.niveis.map(t=>`<option>${t}</option>`).join('')}
      </select>
    </div>
    <button class="hm-reset-btn" onclick="resetHeatFilters()">↺ Limpar</button>`;
}

function resetHeatFilters() {
  heatFilters={turno:'',tempo:'',nivel:''};
  document.querySelectorAll('.hm-filter-sel').forEach(s=>s.value='');
  buildHeatmapTable();
}

function buildHeatmapTable() {
  const {areas,dimensions}=MOCK.heatmapData;
  const filtered=(heatFilters.turno||heatFilters.tempo||heatFilters.nivel);
  const mult=filtered?0.94:1; // simulate filter variance

  let html=`<table class="heatmap-table">
    <thead><tr><th class="hm-dim-header">Dimensão</th>`;
  areas.forEach(a=>html+=`<th>${a}</th>`);
  html+=`</tr></thead><tbody>`;

  dimensions.forEach((dim,di)=>{
    html+=`<tr><td class="hm-dim-name">${dim.name}</td>`;
    dim.scores.forEach((raw,ai)=>{
      const sc=+(raw*mult).toFixed(1);
      const bg=heatColor(sc);
      const tc=sc<3.2?'#fff':'#0C0C0C';
      const isSel=heatSelected&&heatSelected.di===di&&heatSelected.ai===ai;
      html+=`<td class="hm-cell${isSel?' hm-selected':''}" style="background:${bg};color:${tc};"
        onclick="selectHeatCell(${di},${ai},'${dim.full}','${areas[ai]}',${sc})" title="Clique para detalhes">
        <strong>${sc.toFixed(1)}</strong>
        <span class="hm-sub">${matLabel(sc).split(' ')[0]}</span>
      </td>`;
    });
    html+=`</tr>`;
  });

  html+=`</tbody></table>`;
  document.getElementById('heatmap-container').innerHTML=html;
}

function selectHeatCell(di,ai,dimFull,area,score) {
  if(heatSelected&&heatSelected.di===di&&heatSelected.ai===ai) {
    heatSelected=null; buildHeatmapTable(); renderDrillDown(); return;
  }
  heatSelected={di,ai,dim:dimFull,area,score};
  buildHeatmapTable();
  renderDrillDown();
}

function renderDrillDown() {
  const el=document.getElementById('heatmap-drilldown');
  if(!el) return;
  if(!heatSelected) {
    el.innerHTML=`<div class="drilldown-hint">👆 Clique em qualquer célula do heatmap para ver as perguntas específicas, scores e recomendações de ação para aquela área.</div>`;
    return;
  }

  const {dim,area,score}=heatSelected;
  const qs=MOCK.questionScores.filter(q=>q.dim===dim)
    .map(q=>({...q,areaScore:q.byArea[area]||q.score}))
    .sort((a,b)=>a.areaScore-b.areaScore);

  const {cls}=scoreClass(score);
  const dimRecs={
    'Reporte e aprendizagem':'Sensibilização sobre cultura justa (just culture). Garantir resposta visível da liderança a reportes.',
    'Higiene e comportamento':'Observação cruzada de higiene. Revisar acesso a EPIs e pias. Reforçar em DDS.',
    'Competência e treinamento':'Mapear gaps por função. Priorizar treinamento de alergênicos e BPF.',
    'Comunicação e clareza':'Revisar quadros de comunicação. Verificar se procedimentos críticos estão visíveis nos postos.',
    'Liderança e prioridade':'Alinhar com supervisão sobre papel modelo. Incluir indicadores de qualidade nas reuniões.',
    'Disciplina operacional':'Revisar viabilidade dos procedimentos na rotina real. Criar verificação cruzada de registros.',
    'Cultura do time':'Compartilhar casos de sucesso. Criar momento de reconhecimento de comportamentos corretos no shift.',
  };

  el.innerHTML=`<div class="drilldown-card">
    <div class="drilldown-header">
      <div>
        <div class="drilldown-breadcrumb">📍 ${area} · ${dim}</div>
        <div class="drilldown-score-line">
          <span class="drilldown-score-big ${cls}">${score.toFixed(1)}</span>
          <span class="score-pill ${cls}" style="font-size:10px;">${matLabel(score)}</span>
        </div>
      </div>
      <button class="drilldown-close" onclick="heatSelected=null;buildHeatmapTable();renderDrillDown()">✕ Fechar</button>
    </div>
    <div class="drilldown-body">
      <div class="drilldown-section">
        <div class="drilldown-sec-title">📋 Perguntas — ${area}</div>
        <div class="drilldown-questions">
          ${qs.length?qs.map(q=>{
            const sc=q.areaScore;
            const bc=sc<3.0?'#C0392B':sc<3.5?'#E67E22':sc<4.5?'#FFB81D':'#27AE60';
            const pct=((sc-1)/4)*100;
            return `<div class="dq-row">
              <span class="dq-id">${q.id}</span>
              <span class="dq-text">${q.text}</span>
              <div class="dq-bar-wrap">
                <div class="dq-bar-track"><div class="dq-bar-fill" style="width:${pct}%;background:${bc}"></div></div>
                <span class="dq-score" style="color:${bc}">${sc.toFixed(1)}</span>
              </div>
            </div>`;
          }).join(''):`<div style="color:var(--g);font-size:12px;padding:8px 0;">Perguntas desta dimensão são compartilhadas entre todos os públicos — exibindo dados gerais.</div>`}
        </div>
      </div>
      <div class="drilldown-section">
        <div class="drilldown-sec-title">⚡ Recomendações de ação — ${area}</div>
        <div class="drilldown-actions-list">
          ${score<3.5?`<div class="da-card da-critical">
            <div class="da-title">Intervenção prioritária em ${area}</div>
            <div class="da-body">Score ${score.toFixed(1)} exige atenção imediata. Realizar diagnóstico presencial, envolver supervisão direta e definir plano de ação em 30 dias.</div>
            <button class="da-add-btn" onclick="addActionFromDrilldown('${dim}','${area}','Intervenção prioritária em ${area} — ${dim}')">+ Adicionar ao plano</button>
          </div>`:''}
          <div class="da-card da-info">
            <div class="da-title">${dim} — Ação específica</div>
            <div class="da-body">${dimRecs[dim]||'Revisar práticas e procedimentos da área com a equipe.'}</div>
            <button class="da-add-btn" onclick="addActionFromDrilldown('${dim}','${area}','${(dimRecs[dim]||'Ação para '+dim).substring(0,60).replace(/'/g,\`'\`)}')">+ Adicionar ao plano</button>
          </div>
          ${qs.filter(q=>q.areaScore<3.5).length?`<div class="da-card da-warning">
            <div class="da-title">${qs.filter(q=>q.areaScore<3.5).length} pergunta(s) abaixo do limiar</div>
            <div class="da-body">Endereçar em treinamento ou DDS: ${qs.filter(q=>q.areaScore<3.5).slice(0,2).map(q=>`"${q.text.substring(0,48)}..." (${q.areaScore.toFixed(1)})`).join('; ')}.</div>
            <button class="da-add-btn" onclick="addActionFromDrilldown('${dim}','${area}','Treinamento focado nos itens críticos de ${area}')">+ Adicionar ao plano</button>
          </div>`:''}
        </div>
      </div>
    </div>
  </div>`;

  el.scrollIntoView({behavior:'smooth',block:'start'});
}

function addActionFromDrilldown(dim,area,title) {
  actionPlan.unshift({
    id:'a'+Date.now(), dimension:dim, priority:'Alta',
    title: `[${area}] ${title}`.substring(0,80),
    desc:`Ação gerada via drill-down do heatmap — Dimensão: ${dim} · Área: ${area}.`,
    owner:'A definir', deadline:'', expected:'', status:'open', progress:0
  });
  persist(); updateBadge();
  alert('✅ Ação adicionada ao Plano de Ação!\n\nAcesse a aba "Plano de Ação" para completar os detalhes.');
}

// ============================================================
// VERBATIM
// ============================================================
function filterVerbatim(type,btn) {
  document.querySelectorAll('.verbatim-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); renderVerbatim(type);
}

function renderVerbatim(type) {
  const ico={strengths:'💪',weaknesses:'⚠️',actions:'⚡'};
  const lbls={strengths:'Ponto Forte',weaknesses:'Ponto Fraco',actions:'Sugestão de Ação'};
  const list=type==='all'?MOCK.verbatim:MOCK.verbatim.filter(v=>v.type===type);
  document.getElementById('verbatim-list').innerHTML=list.map(v=>`
    <div class="verbatim-card">
      <div class="verbatim-meta"><span>${ico[v.type]||'💬'} ${lbls[v.type]}</span><span>👤 ${v.audience}</span></div>
      <div class="verbatim-text">"${v.text}"</div>
    </div>`).join('');
}

// ============================================================
// PLANO DE AÇÕES
// ============================================================
function renderActions() {
  updateBadge();
  const el=document.getElementById('actions-list'); if(!el) return;
  el.innerHTML=actionPlan.map(a=>{
    const ptag=a.priority==='Alta'?'tag-high':a.priority==='Crítica'?'tag-critical':'tag-medium';
    const emoji=a.status==='done'?'✅':a.status==='progress'?'🔄':'⭕';
    return `<div class="action-card" id="ac-${a.id}">
      <button class="action-status-btn ${a.status}" onclick="cycleStatus('${a.id}')" title="Mudar status">${emoji}</button>
      <div class="action-body">
        <div class="action-title">${a.title}</div>
        <div class="action-meta">👤 ${a.owner||'—'} · 📅 ${fmtDate(a.deadline)}</div>
        <div class="action-desc">${a.desc}</div>
        <div class="action-tags">
          <span class="action-tag ${ptag}">${a.priority}</span>
          <span class="action-tag tag-dim">${a.dimension}</span>
          ${a.status==='done'?'<span class="action-tag tag-done">✅ Concluída</span>':''}
        </div>
        <div class="action-progress-bar"><div class="action-progress-fill" style="width:${a.progress||0}%"></div></div>
        ${a.expected?`<div style="font-size:11px;color:var(--g);margin-top:6px;">🎯 ${a.expected}</div>`:''}
      </div>
      <div class="action-actions">
        <button class="btn-edit-action" onclick="openEdit('${a.id}')" title="Editar">✏️</button>
        <button class="btn-del-action"  onclick="deleteAction('${a.id}')" title="Apagar">🗑️</button>
      </div>
    </div>`;
  }).join('')||'<div style="color:var(--g);font-size:13px;padding:20px 0;">Nenhuma ação registrada.</div>';
}

function cycleStatus(id) {
  const a=actionPlan.find(x=>x.id===id); if(!a)return;
  const nxt={open:'progress',progress:'done',done:'open'};
  a.status=nxt[a.status]; a.progress={open:0,progress:50,done:100}[a.status];
  persist(); renderActions();
}

function openNewAction() { document.getElementById('action-form').style.display='block'; }
function closeNewAction() { document.getElementById('action-form').style.display='none'; }

function saveNewAction() {
  const desc=document.getElementById('new-action-desc').value.trim();
  if(!desc){alert('Descreva a ação.');return;}
  actionPlan.unshift({
    id:'a'+Date.now(),
    dimension:document.getElementById('new-dimension').value,
    priority: document.getElementById('new-priority').value,
    title:desc.substring(0,80), desc,
    owner:document.getElementById('new-owner').value||'A definir',
    deadline:document.getElementById('new-deadline').value,
    expected:document.getElementById('new-expected').value,
    status:'open', progress:0
  });
  persist(); closeNewAction(); renderActions();
  ['new-owner','new-deadline','new-action-desc','new-expected'].forEach(id=>document.getElementById(id).value='');
}

function openEdit(id) {
  const a=actionPlan.find(x=>x.id===id); if(!a)return;
  ['id','dimension','owner','deadline','priority','status','desc','expected'].forEach(f=>{
    const el=document.getElementById('edit-'+f); if(el) el.value=a[f]||'';
  });
  document.getElementById('edit-modal').style.display='flex';
}

function closeEditModal(e) {
  if(!e||e.target===document.getElementById('edit-modal'))
    document.getElementById('edit-modal').style.display='none';
}

function saveEdit() {
  const id=document.getElementById('edit-id').value;
  const a=actionPlan.find(x=>x.id===id); if(!a)return;
  a.dimension=document.getElementById('edit-dimension').value;
  a.owner    =document.getElementById('edit-owner').value;
  a.deadline =document.getElementById('edit-deadline').value;
  a.priority =document.getElementById('edit-priority').value;
  a.status   =document.getElementById('edit-status').value;
  a.progress ={open:0,progress:50,done:100}[a.status];
  a.desc     =document.getElementById('edit-desc').value;
  a.expected =document.getElementById('edit-expected').value;
  a.title    =a.desc.substring(0,80);
  persist(); document.getElementById('edit-modal').style.display='none'; renderActions();
}

function deleteAction(id) {
  if(!confirm('Apagar esta ação?'))return;
  actionPlan=actionPlan.filter(x=>x.id!==id);
  persist(); renderActions();
}

function persist() { localStorage.setItem('odara_actions',JSON.stringify(actionPlan)); }
function updateBadge() { const el=document.getElementById('actions-badge'); if(el) el.textContent=actionPlan.filter(a=>a.status!=='done').length; }

// ============================================================
// EXPORT + UTILS
// ============================================================
function exportCSV() {
  const rows=[['Dimensão','Público','Score','Maturidade']];
  Object.entries(MOCK.dimensionScores).forEach(([dim,sc])=>{
    rows.push([dim,'Geral',sc.geral,matLabel(sc.geral)]);
    rows.push([dim,'Colaboradores',sc.internos,matLabel(sc.internos)]);
    rows.push([dim,'Lideranças',sc.liderancas,matLabel(sc.liderancas)]);
  });
  const blob=new Blob(['\uFEFF'+rows.map(r=>r.join(';')).join('\n')],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`odara_cultura_${new Date().toISOString().split('T')[0]}.csv`; a.click();
}

function heatColor(s){
  if(s<2.5)return'#C0392B'; if(s<3.0)return'#E74C3C';
  if(s<3.5)return'#E67E22'; if(s<4.0)return'#F1C40F';
  if(s<4.5)return'#82C53A'; return'#27AE60';
}
function matLabel(s){ if(s<2.5)return'Em Risco'; if(s<3.5)return'Frágil'; if(s<4.5)return'Em Desenvolvimento'; return'Consolidada'; }
function scoreClass(s){
  if(s<2.5)return{cls:'critical',lbl:'🔴 Em Risco'}; if(s<3.5)return{cls:'fragile',lbl:'🟡 Frágil'};
  if(s<4.5)return{cls:'dev',lbl:'🟠 Em Desenvolvimento'}; return{cls:'ok',lbl:'🟢 Consolidada'};
}
function recAction(s){ if(s<2.5)return'Ação imediata'; if(s<3.5)return'Plano 90 dias'; if(s<4.5)return'Fortalecer · Treinar'; return'Manter · Replicar'; }
function fmtDate(d){ if(!d)return'Sem prazo'; return new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}); }

window.showTab=showTab; window.filterVerbatim=filterVerbatim;
window.openNewAction=openNewAction; window.closeNewAction=closeNewAction; window.saveNewAction=saveNewAction;
window.openEdit=openEdit; window.closeEditModal=closeEditModal; window.saveEdit=saveEdit;
window.deleteAction=deleteAction; window.cycleStatus=cycleStatus; window.exportCSV=exportCSV;
window.selectHeatCell=selectHeatCell; window.resetHeatFilters=resetHeatFilters;
window.addActionFromDrilldown=addActionFromDrilldown; window.renderDrillDown=renderDrillDown;
window.buildHeatmapTable=buildHeatmapTable;
