/* ── ODARA DASHBOARD v6 — Sistema zerado, pronto para uso ── */
'use strict';

// ══════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════
// Auth é feito via redirect no HTML — não precisa de authCheck aqui

// ══════════════════════════════════════════════
// ESTADO GLOBAL — começa vazio
// ══════════════════════════════════════════════
let DATA = null;   // preenchido pelo Supabase
let dbOk = false;
let heatSel = null;
let heatFilterAud = '';
let actions = [];

const C = { y:'#FFB81D', r:'#EE2737', p:'#0C0C0C', g:'#565555' };

const DIM_NAMES = [
  'Liderança e prioridade',
  'Comunicação e clareza',
  'Competência e treinamento',
  'Disciplina operacional',
  'Higiene e comportamento',
  'Reporte e aprendizagem',
  'Cultura do time',
];

const DIM_RECS = {
  'Reporte e aprendizagem':    'Sensibilização sobre cultura justa. Garantir resposta visível da liderança a reportes recebidos.',
  'Higiene e comportamento':   'Observação cruzada de higiene. Revisar acesso a EPIs e pias. Reforçar em DDS semanal.',
  'Competência e treinamento': 'Mapear gaps por função. Priorizar treinamento de alergênicos e BPF.',
  'Comunicação e clareza':     'Revisar quadros de comunicação. Verificar se procedimentos críticos estão visíveis nos postos.',
  'Liderança e prioridade':    'Alinhar com supervisão sobre papel modelo. Incluir indicadores de qualidade nas reuniões.',
  'Disciplina operacional':    'Revisar viabilidade dos procedimentos na rotina real. Criar verificação cruzada de registros.',
  'Cultura do time':           'Compartilhar casos de sucesso. Criar momento de reconhecimento de comportamentos corretos.',
};

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  try { initDashboard(); } catch(e) { console.error('Init error:', e); }
});

async function initDashboard() {
  try {
  document.getElementById('topbar-date').textContent =
    'Gerado em ' + new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

  updateSbIndicator('checking');

  const ok = await loadFromSupabase();
  dbOk = ok;
  updateSbIndicator(ok ? 'connected' : 'disconnected');

  renderOverview();
  renderDimTable();
  renderHeatmap();
  renderVerbatim('all');
  renderStrategicInsights();
  renderActions();
  renderInterpretationTable();
  updateBadge();
  } catch(e) { console.error('Dashboard init error:', e); }
}

// ══════════════════════════════════════════════
// SUPABASE STATUS INDICATOR
// ══════════════════════════════════════════════
function updateSbIndicator(state) {
  const dot   = document.getElementById('sb-dot-db');
  const label = document.getElementById('sb-label-db');
  if (!dot || !label) return;

  const map = {
    checking:     { cls:'checking',     text:'Conectando…' },
    connected:    { cls:'connected',    text:'Banco conectado' },
    disconnected: { cls:'disconnected', text:'Sem conexão — modo demo' },
  };
  const s = map[state] || map.disconnected;
  dot.className   = 'sb-dot ' + s.cls;
  label.textContent = s.text;
  label.className   = 'sb-label ' + s.cls;
}

// ══════════════════════════════════════════════
// CARREGAR DADOS DO SUPABASE
// ══════════════════════════════════════════════
async function loadFromSupabase() {
  if (!window.supabaseConfigured || !window.supabaseConfigured()) return false;

  try {
    // 1. Respondentes por tipo
    const respondents = await window.sbSelect(
      '/respondents?select=id,survey_type,submitted_at'
    );

    // 2. Scores por dimensão (via view)
    const dimRows = await window.sbSelect(
      '/dimension_scores?select=survey_type,dimension,avg_score,respondent_count'
    );

    // 3. Respostas individuais para distribuição
    const responses = await window.sbSelect(
      '/responses?select=value_numeric,survey_type&value_numeric=not.is.null'
    );

    // 4. Respostas abertas
    const openResp = await window.sbSelect(
      '/responses?select=value,question_id,survey_type&value=not.is.null&value_numeric=is.null&limit=100'
    );

    // 5. Ações
    const sbActions = await window.sbSelect(
      '/action_plans?select=*&order=created_at.desc'
    );

    // ── Processar respondentes ──
    const audCounts = { internos:0, liderancas:0, fornecedores:0, distribuidores:0 };
    (respondents || []).forEach(r => { if (audCounts[r.survey_type] !== undefined) audCounts[r.survey_type]++; });
    const total = (respondents || []).length;

    // ── Processar scores por dimensão ──
    const dims = {};
    DIM_NAMES.forEach(d => { dims[d] = { geral:null, internos:null, liderancas:null }; });

    (dimRows || []).forEach(row => {
      const d = row.dimension;
      if (!dims[d]) dims[d] = {};
      const key = row.survey_type === 'internos' ? 'internos'
               : row.survey_type === 'liderancas' ? 'liderancas' : null;
      const sc = parseFloat(row.avg_score);
      if (key) dims[d][key] = isNaN(sc) ? null : sc;
    });

    // Calcular geral = média dos públicos disponíveis
    Object.keys(dims).forEach(d => {
      const vals = [dims[d].internos, dims[d].liderancas].filter(v => v !== null && !isNaN(v));
      dims[d].geral = vals.length ? parseFloat((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)) : null;
    });

    // Score geral global
    const allNums = (responses || []).map(r => parseFloat(r.value_numeric)).filter(v => !isNaN(v) && v>=1 && v<=5);
    const overallScore = allNums.length ? parseFloat((allNums.reduce((a,b)=>a+b,0)/allNums.length).toFixed(2)) : null;

    // Distribuição
    const dist = [0,0,0,0,0];
    allNums.forEach(v => { const i=Math.round(v)-1; if(i>=0&&i<5) dist[i]++; });
    const distPct = dist.map(n => allNums.length ? parseFloat(((n/allNums.length)*100).toFixed(1)) : 0);

    // Score por público
    const audScores = { internos:null, liderancas:null, fornecedores:null, distribuidores:null };
    (['internos','liderancas','fornecedores','distribuidores']).forEach(k => {
      const nums=(responses||[]).filter(r=>r.survey_type===k).map(r=>parseFloat(r.value_numeric)).filter(v=>!isNaN(v)&&v>=1&&v<=5);
      audScores[k] = nums.length ? parseFloat((nums.reduce((a,b)=>a+b,0)/nums.length).toFixed(2)) : null;
    });

    // Verbatim — pegar respostas abertas (ids que terminam em I24/I25/I26 etc)
    const verbatim = (openResp || [])
      .filter(r => r.value && r.value.length > 10)
      .slice(0, 30)
      .map(r => ({
        type: r.question_id && (r.question_id.includes('24')||r.question_id.includes('13'))
              ? 'strengths'
              : r.question_id && (r.question_id.includes('25')||r.question_id.includes('14'))
              ? 'weaknesses' : 'actions',
        aud: r.survey_type || 'Respondente',
        txt: r.value
      }));

    // Ações
    if (sbActions && sbActions.length > 0) {
      actions = sbActions.map(a => ({
        id: String(a.id), dim: a.dimension, pri: a.priority,
        title: a.title, desc: a.description || '', owner: a.owner || '',
        deadline: a.deadline || '', expected: a.expected_result || '',
        status: a.status, pct: a.progress_pct || 0,
      }));
    }

    DATA = { total, audCounts, audScores, dims, overallScore, distPct, verbatim };
    return true;
  } catch (e) {
    console.warn('[Odara] Supabase:', e.message);
    return false;
  }
}

// ══════════════════════════════════════════════
// EMPTY STATE helper
// ══════════════════════════════════════════════
function emptyState(msg = 'Nenhum dado disponível ainda.<br>As respostas aparecerão aqui conforme os formulários forem enviados.') {
  return `<div class="empty-state">${msg}</div>`;
}

// ══════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════
function renderOverview() {
  const d = DATA;

  // KPIs
  document.getElementById('kv-resp').textContent  = d ? d.total  : '0';
  document.getElementById('kv-score').textContent = d && d.overallScore ? d.overallScore.toFixed(2) : '—';
  document.getElementById('kv-comp').textContent  = d && d.total ? '—' : '—';
  document.getElementById('kv-crit').textContent  = d ? Object.values(d.dims).filter(s=>s.geral!==null&&s.geral<3.5).length : '—';
  document.getElementById('kv-mat').textContent   = d && d.overallScore ? matLabel(d.overallScore) : '—';

  if (!d || d.total === 0) {
    document.getElementById('radar-wrap').innerHTML  = emptyState();
    document.getElementById('dist-wrap').innerHTML   = emptyState();
    document.getElementById('dimbar-wrap').innerHTML = emptyState();
    document.getElementById('seg-grid').innerHTML    = emptyState('Segmentação disponível após as primeiras respostas.');
    document.getElementById('ins-grid').innerHTML    = emptyState('Insights gerados automaticamente quando houver dados suficientes.');
    return;
  }

  initRadarChart();
  initDistChart();
  initDimBarChart();
  renderSegmented();
  renderInsights();
}

function initRadarChart() {
  const container = document.getElementById('radar-wrap');
  const hasDims = DATA && Object.values(DATA.dims).some(d => d.geral !== null);
  if (!hasDims) { container.innerHTML = emptyState(); return; }
  container.innerHTML = '<canvas id="radarChart"></canvas>';

  const ks = DIM_NAMES.filter(k => DATA.dims[k]);
  const geral = ks.map(d => DATA.dims[d].geral || 0);
  const lids  = ks.map(d => DATA.dims[d].liderancas || 0);

  new Chart(document.getElementById('radarChart'), {
    type: 'radar',
    data: {
      labels: ks.map(d => { const p=d.split(' e '); return p.length>1?[p[0]+' e',p[1]]:[d]; }),
      datasets: [
        { label:'Geral', data:geral, borderColor:C.y, backgroundColor:'rgba(255,184,29,.12)',
          borderWidth:3, pointBackgroundColor:C.y, pointRadius:7, pointHoverRadius:9,
          pointBorderColor:'#fff', pointBorderWidth:2 },
        { label:'Lideranças', data:lids, borderColor:C.r, backgroundColor:'rgba(238,39,55,.07)',
          borderWidth:2, borderDash:[5,4], pointBackgroundColor:C.r, pointRadius:5,
          pointBorderColor:'#fff', pointBorderWidth:1.5 },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:true,
      scales:{ r:{ min:1, max:5,
        ticks:{ stepSize:1, font:{size:10,family:'Barlow'}, color:C.g, backdropColor:'transparent' },
        grid:{ color:'rgba(255,184,29,.12)', lineWidth:1.5 },
        angleLines:{ color:'rgba(255,184,29,.1)' },
        pointLabels:{ font:{size:11.5,weight:'600',family:'Barlow'}, color:C.p }
      }},
      plugins:{ legend:{ position:'bottom', labels:{
        font:{size:11,family:'Barlow'}, padding:20, color:C.p,
        usePointStyle:true, pointStyleWidth:13
      }}}
    }
  });
}

function initDistChart() {
  const container = document.getElementById('dist-wrap');
  if (!DATA || !DATA.distPct || DATA.distPct.every(v=>v===0)) { container.innerHTML = emptyState(); return; }
  container.innerHTML = '<canvas id="distChart"></canvas>';

  const labels = ['1 — Discordo totalmente','2 — Discordo','3 — Neutro','4 — Concordo','5 — Concordo totalmente'];
  const colors = ['#C0392B','#E67E22','#F39C12','#27AE60','#1E8449'];
  new Chart(document.getElementById('distChart'), {
    type:'bar',
    data:{ labels, datasets:[{
      data: DATA.distPct,
      backgroundColor: colors.map(c=>c+'CC'),
      borderColor: colors, borderWidth:1.5, borderRadius:3, borderSkipped:false
    }]},
    options:{
      indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{callbacks:{label:c=>c.parsed.x.toFixed(1)+'%'}} },
      scales:{
        x:{ max:60, grid:{color:'rgba(12,12,12,.04)'}, ticks:{callback:v=>v+'%',font:{size:10},color:C.g} },
        y:{ grid:{display:false}, ticks:{font:{size:10,weight:'500'},color:C.p} }
      }
    }
  });
}

function initDimBarChart() {
  const container = document.getElementById('dimbar-wrap');
  const hasData = DATA && Object.values(DATA.dims).some(d => d.internos !== null || d.liderancas !== null);
  if (!hasData) { container.innerHTML = emptyState(); return; }
  container.innerHTML = '<canvas id="dimBarChart"></canvas>';

  const ks = DIM_NAMES;
  new Chart(document.getElementById('dimBarChart'), {
    type:'bar',
    data:{ labels: ks.map(d=>d.split(' ')[0]), datasets:[
      { label:'Colaboradores', data:ks.map(d=>DATA.dims[d]?.internos||0), backgroundColor:C.y+'BB', borderColor:C.y, borderWidth:1.5, borderRadius:3 },
      { label:'Lideranças',    data:ks.map(d=>DATA.dims[d]?.liderancas||0), backgroundColor:C.p+'99', borderColor:C.p, borderWidth:1.5, borderRadius:3 },
    ]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'top', labels:{font:{size:10,family:'Barlow'},padding:10,color:C.p,usePointStyle:true,pointStyleWidth:10} } },
      scales:{
        y:{ min:1, max:5, grid:{color:'rgba(255,184,29,.08)'}, ticks:{font:{size:9.5},color:C.g} },
        x:{ grid:{display:false}, ticks:{font:{size:9},color:C.p} }
      }
    }
  });
}

function renderSegmented() {
  const el = document.getElementById('seg-grid');
  if (!DATA || DATA.total === 0) { el.innerHTML = emptyState('Segmentação disponível após as primeiras respostas.'); return; }

  const AUD = [
    { key:'internos',       label:'👷 Colaboradores',    color:'#FFB81D',  note:null },
    { key:'liderancas',     label:'🏆 Lideranças',        color:'#EE2737',  note:null },
    { key:'fornecedores',   label:'🤝 Fornecedores',      color:'#27AE60',  note:'em construção' },
    { key:'distribuidores', label:'🏪 Distribuidores',    color:'#3498DB',  note:'em construção' },
  ];

  el.innerHTML = AUD.map(a => {
    const n  = DATA.audCounts[a.key] || 0;
    const sc = DATA.audScores[a.key];

    if (a.note) {
      // Em construção — mostrar card vazio elegante
      return `<div class="seg-card seg-wip">
        <div class="sg-hdr">
          <div><div class="sg-lbl" style="color:${a.color};opacity:.5;">${a.label}</div><div class="sg-n">${n} respondentes</div></div>
          <div class="wip-badge">Em construção</div>
        </div>
        <div class="wip-msg">Dimensões específicas para ${a.label.split(' ').slice(1).join(' ')} serão habilitadas na próxima versão da pesquisa.</div>
      </div>`;
    }

    if (sc === null || n === 0) {
      return `<div class="seg-card"><div class="sg-hdr">
        <div><div class="sg-lbl" style="color:${a.color}">${a.label}</div><div class="sg-n">${n} respondentes</div></div>
        <div style="font-size:10px;color:var(--g);">Sem dados</div>
      </div>${emptyState('Aguardando respostas.')}</div>`;
    }

    const { cls } = scoreClass(sc);
    const bars = DIM_NAMES.map(d => {
      const dsc = DATA.dims[d]?.[a.key];
      if (dsc === null || dsc === undefined) return '';
      const pct = ((dsc-1)/4)*100;
      const bc  = dsc<3.0?'#C0392B':dsc<3.5?'#E67E22':dsc<4.5?a.color:'#27AE60';
      return `<div class="bar-row">
        <span class="bar-lbl">${d.split(' ')[0]}</span>
        <div class="bar-trk"><div class="bar-fill" style="width:${pct}%;background:${bc}"></div></div>
        <span class="bar-val" style="color:${bc}">${dsc.toFixed(1)}</span>
      </div>`;
    }).join('');

    return `<div class="seg-card">
      <div class="sg-hdr">
        <div><div class="sg-lbl" style="color:${a.color}">${a.label}</div><div class="sg-n">${n} respondentes</div></div>
        <div><div class="sg-sc" style="color:${a.color}">${sc.toFixed(2)}</div><span class="pill ${cls}" style="font-size:7.5px;">${matLabel(sc)}</span></div>
      </div>
      <div class="seg-bars">${bars}</div>
    </div>`;
  }).join('');
}

function renderInsights() {
  const el = document.getElementById('ins-grid');
  if (!DATA || !DATA.dims) { el.innerHTML = emptyState(); return; }

  const ins = [];
  Object.entries(DATA.dims).forEach(([dim, sc]) => {
    if (sc.geral === null) return;
    if      (sc.geral < 3.0) ins.push({type:'critical', t:`⚠️ Crítico: ${dim}`, b:`Score ${sc.geral.toFixed(1)} — Zona de risco. Ação imediata necessária.`});
    else if (sc.geral < 3.5) ins.push({type:'warning',  t:`📌 Atenção: ${dim}`, b:`Score ${sc.geral.toFixed(1)} — Plano de intervenção de 90 dias sugerido.`});
    if (sc.internos && sc.liderancas && (sc.liderancas - sc.internos) > 0.7)
      ins.push({type:'warning', t:`📊 Gap: ${dim}`, b:`Lideranças ${sc.liderancas.toFixed(1)} vs Colaboradores ${sc.internos.toFixed(1)} — desconexão de percepção.`});
    if (sc.geral >= 4.0)
      ins.push({type:'positive', t:`✅ Força: ${dim}`, b:`Score ${sc.geral.toFixed(1)} — Cultura consolidada. Replicar práticas para outras áreas.`});
  });

  if (ins.length === 0) { el.innerHTML = emptyState('Insights gerados automaticamente quando houver dados suficientes.'); return; }
  el.innerHTML = ins.slice(0,6).map(i =>
    `<div class="ins ${i.type}"><div class="ins-t">${i.t}</div>${i.b}</div>`
  ).join('');
}

// ══════════════════════════════════════════════
// RESPONDENTES MODAL
// ══════════════════════════════════════════════
function openRespModal() {
  const total = DATA ? DATA.total : 0;
  const AUD = [
    { key:'internos',       label:'Colaboradores',    color:'#FFB81D' },
    { key:'liderancas',     label:'Lideranças',        color:'#EE2737' },
    { key:'fornecedores',   label:'Fornecedores',      color:'#27AE60' },
    { key:'distribuidores', label:'Distribuidores',    color:'#3498DB' },
  ];
  const counts = DATA ? DATA.audCounts : { internos:0,liderancas:0,fornecedores:0,distribuidores:0 };

  document.getElementById('resp-breakdown').innerHTML = total === 0
    ? emptyState('Nenhum respondente ainda.')
    : AUD.map(a => {
        const n   = counts[a.key] || 0;
        const pct = total ? Math.round((n/total)*100) : 0;
        return `<div class="resp-row">
          <span class="resp-label">${a.label}</span>
          <div class="resp-bar-track"><div class="resp-bar-fill" style="width:${pct}%;background:${a.color}"></div></div>
          <span class="resp-val" style="color:${a.color}">${n}</span>
        </div>`;
      }).join('');
  document.getElementById('resp-modal').style.display = 'flex';
}
window.openRespModal = openRespModal;

// ══════════════════════════════════════════════
// DIMENSÕES TABLE
// ══════════════════════════════════════════════
function renderDimTable() {
  const el = document.getElementById('dim-tbody');
  if (!DATA || DATA.total === 0) {
    document.querySelector('#content-dimensions .tbl-card').innerHTML = emptyState('Tabela disponível após as primeiras respostas.');
    return;
  }
  const rows = [];
  DIM_NAMES.forEach(dim => {
    const sc = DATA.dims[dim];
    if (!sc || sc.geral === null) return;
    rows.push({dim, pub:'Geral',         score:sc.geral,     bold:true});
    if (sc.internos  !== null) rows.push({dim:'', pub:'Colaboradores', score:sc.internos});
    if (sc.liderancas!== null) rows.push({dim:'', pub:'Lideranças',    score:sc.liderancas});
  });

  if (!rows.length) { el.innerHTML = `<tr><td colspan="5">${emptyState()}</td></tr>`; return; }

  el.innerHTML = rows.map(r => {
    const { cls, lbl } = scoreClass(r.score);
    return `<tr ${r.bold ? 'style="background:rgba(255,184,29,.04);"' : ''}>
      <td ${r.bold ? 'style="font-weight:700;"' : ''}>${r.dim}</td>
      <td>${r.pub}</td>
      <td><span class="pill ${cls}">${r.score.toFixed(2)}</span></td>
      <td>${lbl}</td>
      <td style="font-size:10px;color:var(--g);">${recAction(r.score)}</td>
    </tr>`;
  }).join('');
}

// ══════════════════════════════════════════════
// HEATMAP — 3 públicos, drill-down à direita
// ══════════════════════════════════════════════
// Estrutura padrão quando não há dados por área (usamos dimensões globais)
function buildHeatmapDataFromDims(audience) {
  if (!DATA || DATA.total === 0) return null;
  const rows = DIM_NAMES.map(d => {
    const sc = DATA.dims[d]?.[audience];
    return { name: d.split(' ')[0], full: d, scores: sc !== null && sc !== undefined ? [sc] : [] };
  }).filter(r => r.scores.length > 0);

  if (!rows.length) return null;
  return { areas: ['Score geral'], rows };
}

function renderHeatmap() {
  buildHmFilters();

  // Internos
  const hmInt = document.getElementById('hm-internos');
  const intData = buildHeatmapDataFromDims('internos');
  hmInt.innerHTML = intData ? buildHmTable(intData, 'internos') : emptyState('Aguardando respostas de colaboradores.');

  // Fornecedores
  const hmFor = document.getElementById('hm-fornecedores');
  hmFor.innerHTML = emptyState('Dimensões específicas de fornecedores em construção.<br>Disponível na próxima versão da pesquisa.');

  // Distribuidores
  const hmDis = document.getElementById('hm-distribuidores');
  hmDis.innerHTML = emptyState('Dimensões específicas de distribuidores em construção.<br>Disponível na próxima versão da pesquisa.');

  renderDrillDown();
}

function buildHmFilters() {
  const el = document.getElementById('hm-filters-bar');
  if (!el) return;
  el.innerHTML = `
    <span class="hm-fl">Público:</span>
    <select class="hm-sel" onchange="heatFilterAud=this.value;renderHeatmap()">
      <option value="">Todos</option>
      <option value="internos">Internos</option>
      <option value="fornecedores">Fornecedores</option>
      <option value="distribuidores">Distribuidores</option>
    </select>
    <button class="hm-rst" onclick="heatFilterAud='';document.querySelector('.hm-sel').value='';renderHeatmap()">↺ Limpar</button>
    <span style="font-size:9px;color:var(--g);margin-left:4px;">👈 Clique em um quadrado para análise detalhada →</span>`;
}

function buildHmTable(data, audience) {
  let html = `<table class="hm-tbl"><thead><tr><th class="hm-th">Dimensão</th>`;
  data.areas.forEach(a => html += `<th class="hm-th" style="text-align:center;">${a}</th>`);
  html += `</tr></thead><tbody>`;

  data.rows.forEach((row, di) => {
    html += `<tr><td class="hm-dn">${row.name}</td>`;
    row.scores.forEach((sc, ai) => {
      const bg = heatColor(sc);
      const tc = sc < 3.2 ? '#fff' : '#0C0C0C';
      const isSel = heatSel && heatSel.audience===audience && heatSel.di===di && heatSel.ai===ai;
      html += `<td class="hm-cell${isSel?' hm-sel':''}" style="background:${bg};color:${tc};"
        onclick="selectHmCell('${audience}',${di},${ai},'${row.full}','${data.areas[ai]}',${sc})"
        title="${row.full}: ${sc.toFixed(1)}">
        <strong>${sc.toFixed(1)}</strong>
        <span class="hm-sub">${matLabel(sc).split(' ')[0]}</span>
      </td>`;
    });
    html += `</tr>`;
  });
  return html + `</tbody></table>`;
}

function selectHmCell(audience, di, ai, dimFull, area, score) {
  if (heatSel && heatSel.audience===audience && heatSel.di===di && heatSel.ai===ai) {
    heatSel = null; renderHeatmap(); renderDrillDown(); return;
  }
  heatSel = { audience, di, ai, dim: dimFull, area, score };
  renderHeatmap();
  renderDrillDown();
}
window.selectHmCell = selectHmCell;
window.renderHeatmap = renderHeatmap;
window.renderDrillDown = renderDrillDown;

function renderDrillDown() {
  const el = document.getElementById('hm-drilldown');
  if (!el) return;
  if (!heatSel) {
    el.innerHTML = `<div class="dd-hint">👈 Clique em qualquer célula do heatmap para ver análise detalhada, perguntas específicas e recomendações de ação.</div>`;
    return;
  }

  const { dim, area, score, audience } = heatSel;
  const { cls } = scoreClass(score);
  const audLabel = { internos:'Internos', fornecedores:'Fornecedores', distribuidores:'Distribuidores' }[audience] || audience;

  el.innerHTML = `<div class="dd-card">
    <div class="dd-hdr">
      <div class="dd-bc">📍 ${audLabel} · ${area} · ${dim}</div>
      <div class="dd-sl">
        <span class="dd-big ${cls}">${score.toFixed(1)}</span>
        <span class="pill ${cls}" style="font-size:8.5px;">${matLabel(score)}</span>
      </div>
    </div>
    <div class="dd-body">
      <div>
        <div class="dd-st">⚡ Recomendação de Ação</div>
        <div class="da-list">
          ${score < 3.5 ? `<div class="da da-crit">
            <div class="da-t">Intervenção prioritária</div>
            <div class="da-b">Score ${score.toFixed(1)} — Zona de intervenção. Envolver liderança direta e definir plano em 30 dias.</div>
            <button class="da-add" onclick="addFromDd('${dim}','${area}','Intervenção prioritária — ${dim}')">+ Adicionar ao plano</button>
          </div>` : ''}
          <div class="da da-info">
            <div class="da-t">${dim}</div>
            <div class="da-b">${DIM_RECS[dim] || 'Revisar práticas e procedimentos com a equipe.'}</div>
            <button class="da-add" onclick="addFromDd(this)" data-dim="${dim}" data-area="${area}" data-rec="${(DIM_RECS[dim] || dim).substring(0,55).replace(/"/g,'')}">+ Adicionar ao plano</button>
          </div>
        </div>
      </div>
      <div>
        <div class="dd-st">📊 Contexto — Escala de Maturidade</div>
        ${interpRow(score)}
      </div>
    </div>
    <div style="padding:10px 18px 14px;display:flex;justify-content:flex-end;">
      <button class="dd-close-btn" onclick="heatSel=null;renderHeatmap();renderDrillDown()">✕ Fechar análise</button>
    </div>
  </div>`;
}

function interpRow(score) {
  const { cls } = scoreClass(score);
  return `<div style="font-size:11px;color:var(--p);line-height:1.7;">
    Score <strong>${score.toFixed(1)}</strong> =
    <span class="pill ${cls}">${matLabel(score)}</span><br>
    <span style="color:var(--g);font-size:10px;">${recAction(score)}</span>
  </div>`;
}

function addFromDd(btn) {
  var dim = btn.dataset.dim;
  var area = btn.dataset.area;
  var title = btn.dataset.rec;
  const a = {
    id: 'a' + Date.now(), dim, pri: 'Alta',
    title: ('[' + area + '] ' + title).substring(0, 80),
    desc: 'Gerada via heatmap — Dimensão: ' + dim + ' · Área: ' + area + '.',
    owner: 'A definir', deadline: '', expected: '', status: 'open', pct: 0,
  };
  actions.unshift(a);
  sbSaveAction(a);
  updateBadge();
  alert('✅ Ação adicionada ao Plano de Ação!\nAcesse a aba "Plano de Ação" para completar os detalhes.');
}
window.addFromDd = addFromDd;

async function sbSaveAction(a) {
  if (!window.supabaseConfigured || !window.supabaseConfigured()) return;
  try {
    await window.sbInsert('action_plans', {
      dimension: a.dim, title: a.title, description: a.desc,
      owner: a.owner, priority: a.pri,
      deadline: a.deadline || null, expected_result: a.expected,
      status: a.status, progress_pct: a.pct,
    });
  } catch (e) { console.warn('Erro ao salvar ação:', e.message); }
}

// ══════════════════════════════════════════════
// VERBATIM
// ══════════════════════════════════════════════
function filterVb(type, btn) {
  document.querySelectorAll('.vb-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderVerbatim(type);
}
window.filterVb = filterVb;

function renderVerbatim(type) {
  const el  = document.getElementById('verbatim-list');
  const ico = { strengths:'💪', weaknesses:'⚠️', actions:'⚡' };
  const lbl = { strengths:'Ponto Forte', weaknesses:'Ponto Fraco', actions:'Sugestão de Ação' };
  const vb  = (DATA && DATA.verbatim) ? DATA.verbatim : [];
  const list = type === 'all' ? vb : vb.filter(v => v.type === type);

  el.innerHTML = list.length
    ? list.map(v => `<div class="vb-card">
        <div class="vb-meta"><span>${ico[v.type]||'💬'} ${lbl[v.type]||'Comentário'}</span><span>👤 ${v.aud}</span></div>
        <div class="vb-txt">"${v.txt}"</div>
      </div>`).join('')
    : emptyState('Respostas abertas aparecerão aqui conforme os formulários forem preenchidos.');
}

// ══════════════════════════════════════════════
// INSIGHTS ESTRATÉGICOS
// ══════════════════════════════════════════════
function renderStrategicInsights() {
  const el = document.getElementById('strategic-insights');
  if (!DATA || DATA.total === 0 || !el) {
    if (el) el.innerHTML = `<div class="is-card full">${emptyState('Insights estratégicos gerados automaticamente após o início da coleta de respostas.')}</div>`;
    return;
  }

  const critDims = Object.entries(DATA.dims)
    .filter(([, sc]) => sc.geral !== null && sc.geral < 3.5)
    .sort((a, b) => a[1].geral - b[1].geral);

  const probDescMap = {
    'Reporte e aprendizagem':    'Colaboradores evitam reportar desvios por receio de consequências. O ciclo de aprendizagem organizacional está comprometido.',
    'Higiene e comportamento':   'Comportamentos de higiene dependem de supervisão. Quando não observados, colaboradores relaxam práticas críticas de BPF.',
    'Competência e treinamento': 'Gaps de conhecimento sobre alergênicos e procedimentos críticos. Treinamentos não se traduzem em mudança comportamental.',
    'Comunicação e clareza':     'Colaboradores não têm clareza sobre controles críticos de sua área. Comunicações chegam tarde ou incompletas.',
    'Disciplina operacional':    'Registros realizados fora do momento correto, comprometendo rastreabilidade. Procedimentos percebidos como burocracia.',
    'Liderança e prioridade':    'Percepção de que decisões priorizam prazo e custo sobre qualidade em momentos de pressão.',
    'Cultura do time':           'Baixa cooperação horizontal. Cada colaborador age individualmente, sem cobrar o outro ou se sentir responsável pelo produto.',
  };

  const strategics = [
    { icon:'🎯', title:'Programa de Cultura Justa', desc:'Protocolo explícito de não-punição por reporte. Toda liderança responde visivelmente a cada reporte em até 48h.', h:'0–60 dias' },
    { icon:'🧼', title:'Rotina de Observação de Higiene', desc:'Peer observation semanal por turnos com checklist. Foco em comportamento autônomo, não supervisionado.', h:'30–90 dias' },
    { icon:'🎓', title:'Módulo de Alergênicos', desc:'Treinamento prático 2h para toda a produção. Simulação de contaminação cruzada. Certificação interna.', h:'60 dias' },
    { icon:'📢', title:'DDS Estruturado por Dimensão', desc:'15 minutos semanais por turno, rotacionando as 7 dimensões. Líder conduz, qualidade apoia.', h:'Contínuo' },
    { icon:'📊', title:'Devolutiva para as Equipes', desc:'Apresentar resultados por área em até 30 dias após encerramento. Sem devolutiva, engajamento cai nas próximas rodadas.', h:'Urgente' },
  ];

  el.innerHTML = `
    <div class="is-card">
      <div class="is-title">🚨 Problemas Prioritários <span class="is-tag priority">PRIORITÁRIO</span></div>
      ${critDims.length
        ? critDims.map(([dim, sc], i) => `<div class="problem-item">
            <div class="prob-num">${i+1}</div>
            <div class="prob-body">
              <div class="prob-title">${dim}</div>
              <div class="prob-desc">${probDescMap[dim]||'Dimensão abaixo do limiar de desenvolvimento.'}</div>
              <span class="prob-score">Score ${sc.geral.toFixed(1)} — ${matLabel(sc.geral)}</span>
            </div>
          </div>`).join('')
        : '<div style="font-size:11px;color:var(--g);">Nenhuma dimensão crítica — ótimo sinal!</div>'
      }
    </div>
    <div class="is-card">
      <div class="is-title">🔍 Causas Potenciais a Validar <span class="is-tag cause">HIPÓTESES</span></div>
      ${[
        'Cultura de punição implícita — colaboradores reportam mas não recebem resposta visível da liderança.',
        'Lacuna de formação comportamental — treinamentos focam em procedimentos, não em atitudes autônomas.',
        'Gap de comunicação vertical — lideranças percebem cultura mais positiva do que colaboradores operacionais.',
        'Sobrecarga de registros — preenchimentos fora do momento correto indicam processo não integrado à rotina.',
        'Conhecimento de alergênicos insuficiente — risco regulatório direto para confeitaria com múltiplos alérgenos.',
      ].map(c => `<div class="cause-item"><div class="cause-dot"></div><div class="cause-text">${c}</div></div>`).join('')}
    </div>
    <div class="is-card full">
      <div class="is-title">🚀 Recomendações Estratégicas <span class="is-tag strategic">PLANO DE AÇÃO</span></div>
      ${strategics.map(s => `<div class="strat-item">
        <div class="strat-icon">${s.icon}</div>
        <div><div class="strat-title">${s.title}</div><div class="strat-desc">${s.desc}</div>
        <span class="strat-horizon">⏱ ${s.h}</span></div>
      </div>`).join('')}
    </div>`;
}

// ══════════════════════════════════════════════
// TABELA DE INTERPRETAÇÃO
// ══════════════════════════════════════════════
function renderInterpretationTable() {
  const el = document.getElementById('interp-table-content');
  if (!el) return;

  el.innerHTML = `
    <table class="dtbl interp-tbl">
      <thead><tr>
        <th>Score</th>
        <th>Maturidade Cultural</th>
        <th>O que significa</th>
        <th>Ação Recomendada</th>
      </tr></thead>
      <tbody>
        <tr style="background:rgba(192,57,43,.06);">
          <td><span class="pill critical">&lt; 2.5</span></td>
          <td><strong style="color:#C0392B;">🔴 Em Risco</strong></td>
          <td style="font-size:10px;">Cultura inexistente ou disfuncional. Comportamentos seguros não são praticados, mesmo com supervisão. Risco direto à segurança do produto e à certificação.</td>
          <td style="font-size:10px;"><strong>Ação imediata.</strong> Envolvimento da alta direção. Diagnóstico aprofundado. Plano de crise 30 dias.</td>
        </tr>
        <tr style="background:rgba(230,126,34,.05);">
          <td><span class="pill fragile">2.5 – 3.4</span></td>
          <td><strong style="color:#E67E22;">🟡 Frágil</strong></td>
          <td style="font-size:10px;">Cultura presente mas inconsistente. Comportamentos corretos dependem de supervisão ou convicção individual. Vulnerável a pressões de prazo e custo.</td>
          <td style="font-size:10px;"><strong>Intervenção estruturada.</strong> Plano de ação 90 dias. Auditoria comportamental. Capacitação de lideranças.</td>
        </tr>
        <tr style="background:rgba(255,184,29,.05);">
          <td><span class="pill dev">3.5 – 4.4</span></td>
          <td><strong style="color:#9A7010;">🟠 Em Desenvolvimento</strong></td>
          <td style="font-size:10px;">Cultura positiva em consolidação. A maioria age corretamente na maioria das situações. Existem lacunas pontuais que ainda precisam de atenção.</td>
          <td style="font-size:10px;"><strong>Fortalecer.</strong> Treinamentos focados nas lacunas. Reconhecimento de boas práticas. Monitoramento semestral.</td>
        </tr>
        <tr style="background:rgba(39,174,96,.05);">
          <td><span class="pill ok">4.5 – 5.0</span></td>
          <td><strong style="color:#27AE60;">🟢 Consolidada</strong></td>
          <td style="font-size:10px;">Cultura robusta e autossustentável. Comportamentos seguros são internalizados e praticados de forma autônoma. Benchmarkável para o setor.</td>
          <td style="font-size:10px;"><strong>Manter e replicar.</strong> Documentar boas práticas. Usar como referência interna. Monitorar para não regredir.</td>
        </tr>
      </tbody>
    </table>
    <div style="margin-top:12px;padding:10px 14px;background:rgba(255,184,29,.06);border-left:3px solid var(--y);border-radius:2px;font-size:10.5px;color:var(--g);line-height:1.6;">
      <strong style="color:var(--p);">Referência metodológica:</strong> Escala baseada no GFSI Guidance Document on Food Safety Culture (2021) e nos referenciais de culture maturity da FSSC 22000 v6. Score calculado como média aritmética das respostas Likert 1–5 por dimensão. N/A excluído do cálculo.
    </div>`;
}

// ══════════════════════════════════════════════
// ACTIONS CRUD
// ══════════════════════════════════════════════
function renderActions() {
  updateBadge();
  const el = document.getElementById('act-list');
  if (!el) return;

  el.innerHTML = actions.length
    ? actions.map(a => {
        const emoji = a.status==='done'?'✅':a.status==='progress'?'🔄':'⭕';
        const ptag  = a.pri==='Alta'?'at-h':a.pri==='Crítica'?'at-c':'at-m';
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
      }).join('')
    : emptyState('Nenhuma ação registrada. Clique em "+ Nova Ação" para começar.');
}

function cycleStatus(id) {
  const a = actions.find(x => x.id === id); if (!a) return;
  const nxt = { open:'progress', progress:'done', done:'open' };
  a.status = nxt[a.status];
  a.pct    = { open:0, progress:50, done:100 }[a.status];
  sbUpdateAction(a);
  renderActions();
}

async function sbUpdateAction(a) {
  if (!window.supabaseConfigured || !window.supabaseConfigured()) return;
  try {
    await window.sbPatch('/action_plans?id=eq.' + a.id, { status: a.status, progress_pct: a.pct });
  } catch (e) { console.warn('Erro ao atualizar ação:', e.message); }
}

function openNewAction() { document.getElementById('act-form').style.display = 'block'; }
function closeNewAction() { document.getElementById('act-form').style.display = 'none'; }
window.openNewAction = openNewAction;
window.closeNewAction = closeNewAction;

function saveNewAction() {
  const desc = document.getElementById('new-desc').value.trim();
  if (!desc) { alert('Descreva a ação.'); return; }
  const a = {
    id: 'a' + Date.now(),
    dim:      document.getElementById('new-dim').value,
    pri:      document.getElementById('new-priority').value,
    title:    desc.substring(0, 80), desc,
    owner:    document.getElementById('new-owner').value || 'A definir',
    deadline: document.getElementById('new-deadline').value,
    expected: document.getElementById('new-expected').value,
    status: 'open', pct: 0,
  };
  actions.unshift(a);
  sbSaveAction(a);
  closeNewAction();
  renderActions();
  ['new-owner','new-deadline','new-desc','new-expected'].forEach(id => document.getElementById(id).value = '');
}
window.saveNewAction = saveNewAction;

function openEdit(id) {
  const a = actions.find(x => x.id === id); if (!a) return;
  document.getElementById('edit-id').value       = a.id;
  document.getElementById('edit-dim').value      = a.dim;
  document.getElementById('edit-owner').value    = a.owner    || '';
  document.getElementById('edit-deadline').value = a.deadline || '';
  document.getElementById('edit-priority').value = a.pri;
  document.getElementById('edit-status').value   = a.status;
  document.getElementById('edit-desc').value     = a.desc;
  document.getElementById('edit-expected').value = a.expected || '';
  document.getElementById('edit-modal').style.display = 'flex';
}

function closeEdit(e) {
  if (!e || e.target === document.getElementById('edit-modal'))
    document.getElementById('edit-modal').style.display = 'none';
}

function saveEdit() {
  const id = document.getElementById('edit-id').value;
  const a  = actions.find(x => x.id === id); if (!a) return;
  a.dim      = document.getElementById('edit-dim').value;
  a.owner    = document.getElementById('edit-owner').value;
  a.deadline = document.getElementById('edit-deadline').value;
  a.pri      = document.getElementById('edit-priority').value;
  a.status   = document.getElementById('edit-status').value;
  a.pct      = { open:0, progress:50, done:100 }[a.status];
  a.desc     = document.getElementById('edit-desc').value;
  a.expected = document.getElementById('edit-expected').value;
  a.title    = a.desc.substring(0, 80);
  sbUpdateAction(a);
  document.getElementById('edit-modal').style.display = 'none';
  renderActions();
}

function deleteAction(id) {
  if (!confirm('Apagar esta ação?')) return;
  actions = actions.filter(x => x.id !== id);
  if (window.supabaseConfigured && window.supabaseConfigured())
    window.sbDelete('/action_plans?id=eq.' + id).catch(() => {});
  renderActions();
}

function updateBadge() {
  const el = document.getElementById('actions-badge');
  if (el) el.textContent = actions.filter(a => a.status !== 'done').length;
}

window.cycleStatus  = cycleStatus;
window.openEdit     = openEdit;
window.closeEdit    = closeEdit;
window.saveEdit     = saveEdit;
window.deleteAction = deleteAction;

// ══════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════
const TITLES = {
  overview:'Visão Geral', dimensions:'Dimensões', heatmap:'Heatmap de Gaps',
  verbatim:'Respostas Abertas', insights:'Insights Estratégicos',
  actions:'Plano de Ação', interpretation:'Tabela de Interpretação',
};
function showTab(id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('active'));
  document.getElementById('content-' + id).classList.add('active');
  document.getElementById('tab-' + id).classList.add('active');
  document.getElementById('tab-title').textContent = TITLES[id];
}
window.showTab = showTab;

// ══════════════════════════════════════════════
// CSV EXPORT
// ══════════════════════════════════════════════
function exportCSV() {
  const rows = [['Dimensão','Público','Score','Maturidade']];
  if (DATA && DATA.dims) {
    Object.entries(DATA.dims).forEach(([dim, sc]) => {
      if (sc.geral !== null) rows.push([dim,'Geral',sc.geral,matLabel(sc.geral)]);
      if (sc.internos   !== null) rows.push([dim,'Colaboradores',sc.internos,matLabel(sc.internos)]);
      if (sc.liderancas !== null) rows.push([dim,'Lideranças',sc.liderancas,matLabel(sc.liderancas)]);
    });
  }
  const blob = new Blob(['\uFEFF' + rows.map(r => r.join(';')).join('\n')], { type:'text/csv;charset=utf-8;' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `odara_cultura_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}
window.exportCSV = exportCSV;

// ══════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════
function heatColor(s) {
  if (s<2.5) return '#C0392B'; if (s<3.0) return '#E74C3C';
  if (s<3.5) return '#E67E22'; if (s<4.0) return '#F1C40F';
  if (s<4.5) return '#82C53A'; return '#27AE60';
}
function matLabel(s) {
  if (s<2.5) return 'Em Risco'; if (s<3.5) return 'Frágil';
  if (s<4.5) return 'Em Desenvolvimento'; return 'Consolidada';
}
function scoreClass(s) {
  if (s<2.5) return { cls:'critical', lbl:'🔴 Em Risco' };
  if (s<3.5) return { cls:'fragile',  lbl:'🟡 Frágil' };
  if (s<4.5) return { cls:'dev',      lbl:'🟠 Em Desenvolvimento' };
  return           { cls:'ok',       lbl:'🟢 Consolidada' };
}
function recAction(s) {
  if (s<2.5) return 'Ação imediata · Alta direção';
  if (s<3.5) return 'Plano 90 dias · Auditoria comportamental';
  if (s<4.5) return 'Fortalecer · Treinamento · Reconhecimento';
  return 'Manter · Replicar boas práticas';
}
function fmtDate(d) {
  if (!d) return 'Sem prazo';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
}
