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

const DIM_LID_NAMES = [
  'Contexto e prioridade',
  'Minha prática de liderança',
  'Minha equipe',
  'Sistemas e ferramentas',
];

const DIM_FORN_NAMES = [
  'Especificações e alinhamento',
  'Gestão de mudanças',
  'Rastreabilidade e documentação',
  'Tratamento de não conformidades',
  'Gestão do relacionamento',
  'Confiança',
];

const DIM_DIST_NAMES = [
  'Consistência do produto','Integridade e identificação','Informações do produto',
  'Segurança percebida','Serviço logístico','Documentação',
  'Tratamento de ocorrências','Comunicação','Rastreabilidade',
  'Confiança','Melhoria contínua','Recomendação (NPS de qualidade)',
];

const ALL_DIM_NAMES = [...new Set([...DIM_NAMES, ...DIM_LID_NAMES, ...DIM_FORN_NAMES, ...DIM_DIST_NAMES])];

// Volume esperado — carregado do Supabase (tabela dashboard_config)
let EXPECTED_RESPONSES = { internos: 30, liderancas: 8, fornecedores: 10, distribuidores: 10 };
let EXPECTED_TOTAL = Object.values(EXPECTED_RESPONSES).reduce((a,b)=>a+b,0);

async function loadExpectedFromSupabase() {
  if (!window.supabaseConfigured || !window.supabaseConfigured()) return;
  try {
    const rows = await window.sbSelect('/dashboard_config?select=key,value');
    if (rows && rows.length) {
      rows.forEach(r => {
        const k = r.key.replace('expected_', '');
        if (EXPECTED_RESPONSES[k] !== undefined) EXPECTED_RESPONSES[k] = parseInt(r.value) || EXPECTED_RESPONSES[k];
      });
      EXPECTED_TOTAL = Object.values(EXPECTED_RESPONSES).reduce((a,b)=>a+b,0);
      console.info('[Odara] Config carregada do Supabase:', EXPECTED_RESPONSES);
    }
  } catch (e) {
    console.warn('[Odara] Tabela dashboard_config não encontrada, usando defaults. Rode o config_update.sql.');
  }
}

async function saveExpectedToSupabase() {
  if (!window.supabaseConfigured || !window.supabaseConfigured()) return;
  try {
    for (const k of ['internos','liderancas','fornecedores','distribuidores']) {
      await window.sbFetch('/dashboard_config?key=eq.expected_' + k, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ value: String(EXPECTED_RESPONSES[k]), updated_at: new Date().toISOString() })
      });
    }
  } catch (e) { console.warn('[Odara] Erro ao salvar config:', e.message); }
}

function saveExpected() {
  EXPECTED_TOTAL = Object.values(EXPECTED_RESPONSES).reduce((a,b)=>a+b,0);
  saveExpectedToSupabase();
}
window.saveExpected = saveExpected;

const DIM_RECS = {
  'Reporte e aprendizagem':    'Sensibilização sobre cultura justa. Garantir resposta visível da liderança a reportes recebidos.',
  'Higiene e comportamento':   'Observação cruzada de higiene. Revisar acesso a EPIs e pias. Reforçar em DDS semanal.',
  'Competência e treinamento': 'Mapear gaps por função. Priorizar treinamento de alergênicos e BPF.',
  'Comunicação e clareza':     'Revisar quadros de comunicação. Verificar se procedimentos críticos estão visíveis nos postos.',
  'Liderança e prioridade':    'Alinhar com supervisão sobre papel modelo. Incluir indicadores de qualidade nas reuniões.',
  'Disciplina operacional':    'Revisar viabilidade dos procedimentos na rotina real. Criar verificação cruzada de registros.',
  'Cultura do time':           'Compartilhar casos de sucesso. Criar momento de reconhecimento de comportamentos corretos.',
  'Contexto e prioridade':     'Alinhar expectativas entre alta direção e liderança intermediária. Revisar alocação de recursos.',
  'Minha prática de liderança':'Autoavaliação com feedback 360°. Acompanhar presença da liderança na linha.',
  'Minha equipe':              'Revisão de competências técnicas por função. Plano de capacitação individualizado.',
  'Sistemas e ferramentas':    'Revisar utilidade real dos documentos do SGQ. Simplificar registros sem perder controle.',
  'Especificações e alinhamento':'Revisar clareza das especificações técnicas enviadas aos fornecedores.',
  'Gestão de mudanças':        'Comunicar mudanças com antecedência mínima. Estabelecer protocolo formal de change management.',
  'Rastreabilidade e documentação':'Padronizar formatos de certificados e laudos. Automatizar onde possível.',
  'Tratamento de não conformidades':'Acelerar ciclo de resposta a desvios. Dar feedback sobre ações tomadas.',
  'Gestão do relacionamento':  'Estabelecer reuniões periódicas de alinhamento. Desenvolver fornecedores estratégicos.',
  'Confiança':                 'Construir histórico de performance. Reconhecer parceiros de excelência.',
  'Consistência do produto':   'Monitorar variabilidade por lote. Investigar causas de inconsistência.',
  'Integridade e identificação':'Revisar embalagem e rotulagem. Garantir rastreabilidade até o ponto de venda.',
  'Informações do produto':    'Disponibilizar fichas técnicas atualizadas. Melhorar acesso a informações.',
  'Segurança percebida':       'Comunicar controles de qualidade aos clientes. Transparência gera confiança.',
  'Serviço logístico':         'Monitorar integridade na cadeia de frio/transporte. Avaliar embalagem secundária.',
  'Documentação':              'Simplificar documentos comerciais. Garantir acesso digital.',
  'Tratamento de ocorrências': 'Reduzir tempo de resposta a reclamações. Implementar tracking de ocorrências.',
  'Comunicação':               'Estabelecer canal direto e ágil com distribuidores.',
  'Rastreabilidade':           'Garantir rastreabilidade completa lote-a-lote até distribuidor.',
  'Melhoria contínua':         'Compartilhar roadmap de melhorias com distribuidores. Co-criar soluções.',
  'Recomendação (NPS de qualidade)':'Monitorar NPS periodicamente. Agir sobre detratores.',
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

  // Carregar config do Supabase
  await loadExpectedFromSupabase();

  renderOverview();
  renderDimTable();
  renderHeatmap();
  renderVerbatim('all');
  renderStrategicInsights();
  renderActions();
  renderInterpretationTable();
  initConfigFields();
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
// ── Mapeamento question_id → dimension (fallback client-side) ──
const Q_DIM_MAP = {
  // Internos
  'I01':'Liderança e prioridade','I02':'Liderança e prioridade','I03':'Liderança e prioridade',
  'I04':'Comunicação e clareza','I05':'Comunicação e clareza','I06':'Comunicação e clareza',
  'I07':'Competência e treinamento','I08':'Competência e treinamento','I09':'Competência e treinamento',
  'I10':'Disciplina operacional','I11a':'Disciplina operacional','I11b':'Disciplina operacional',
  'I12':'Disciplina operacional','I13':'Disciplina operacional',
  'I14':'Higiene e comportamento','I15':'Higiene e comportamento',
  'I16':'Reporte e aprendizagem','I17':'Reporte e aprendizagem','I18':'Reporte e aprendizagem','I19':'Reporte e aprendizagem',
  'I20':'Cultura do time','I21':'Cultura do time','I22':'Cultura do time','I23':'Cultura do time',
  // Lideranças
  'L01':'Contexto e prioridade','L02':'Contexto e prioridade','L03':'Contexto e prioridade','L04':'Contexto e prioridade',
  'L05':'Minha prática de liderança','L06':'Minha prática de liderança','L07':'Minha prática de liderança',
  'L08':'Minha prática de liderança','L09':'Minha prática de liderança','L10':'Minha prática de liderança','L11':'Minha prática de liderança',
  'L12':'Minha equipe','L13':'Minha equipe','L14':'Minha equipe','L15':'Minha equipe',
  'L16':'Sistemas e ferramentas','L17':'Sistemas e ferramentas','L18':'Sistemas e ferramentas',
  // Fornecedores
  'F01':'Especificações e alinhamento','F02':'Especificações e alinhamento','F03':'Especificações e alinhamento',
  'F04':'Gestão de mudanças',
  'F05':'Rastreabilidade e documentação','F06':'Rastreabilidade e documentação',
  'F07':'Tratamento de não conformidades','F08':'Tratamento de não conformidades','F09':'Tratamento de não conformidades',
  'F10':'Gestão do relacionamento','F11':'Gestão do relacionamento',
  'F12':'Confiança',
  // Distribuidores
  'D01':'Consistência do produto','D02':'Integridade e identificação','D03':'Informações do produto',
  'D04':'Segurança percebida','D05':'Serviço logístico','D06':'Documentação',
  'D07':'Tratamento de ocorrências','D08':'Comunicação','D09':'Rastreabilidade',
  'D10':'Confiança','D11':'Melhoria contínua','D12':'Recomendação (NPS de qualidade)',
};

// Textos das perguntas para drill-down no heatmap
const Q_TEXT_MAP = {
  'I01':'Qualidade e segurança são prioridades reais nas decisões do dia a dia',
  'I02':'Liderança direta dá o exemplo em padrões e procedimentos',
  'I03':'Em conflito prazo/custo vs qualidade, a decisão protege o produto',
  'I04':'Sei quais regras e controles críticos se aplicam ao meu trabalho',
  'I05':'Sou informado(a) antes de mudanças de processo/produto/rotina',
  'I06':'Sei a quem recorrer quando tenho dúvida sobre qualidade',
  'I07':'Treinamentos me preparam para executar com segurança e qualidade',
  'I08':'Pessoas novas recebem orientação adequada antes de atividades de risco',
  'I09':'Conheço os alergênicos e sei evitar contaminação cruzada',
  'I10':'Padrões e procedimentos são viáveis na prática do dia a dia',
  'I11a':'Rotina favorece cumprimento das BPF',
  'I11b':'Registros e controles são feitos de forma completa e no momento certo',
  'I12':'Reporto ou trato problemas antes de virar risco maior',
  'I13':'Entendo por que os controles críticos são importantes',
  'I14':'Mantenho higiene pessoal mesmo sem ser observado(a)',
  'I15':'Comunicaria sintoma de doença à supervisão mesmo com risco de afastamento',
  'I16':'Me sinto à vontade para apontar falhas sem medo de represália',
  'I17':'A causa real dos desvios é investigada e tratada',
  'I18':'Aprendo sobre erros e ocorrências que aconteceram na empresa',
  'I19':'Ações corretivas costumam funcionar de verdade',
  'I20':'Meu time se ajuda para manter o padrão correto',
  'I21':'Sinto responsabilidade pessoal pela qualidade do produto',
  'I22':'Tenho orgulho do padrão que a Odara entrega',
  'I23':'Recomendaria a Odara como lugar onde qualidade é levada a sério',
  'L01':'Qualidade e segurança são prioridades reais nas decisões estratégicas',
  'L02':'Em conflito prazo/custo, a decisão institucional protege o produto',
  'L03':'Tenho recursos suficientes para sustentar os padrões exigidos',
  'L04':'Alta direção demonstra com ações que cultura de segurança é prioridade',
  'L05':'Estabeleço metas que reforçam qualidade, não apenas produtividade',
  'L06':'Acompanho indicadores e desvios com frequência para agir preventivamente',
  'L07':'Reconheço comportamentos corretos, não apenas aponto erros',
  'L08':'Investigo causas estruturais dos desvios, não apenas sintomas',
  'L09':'Minha equipe sabe o que é inegociável em qualidade',
  'L10':'Dou exemplo pessoal em higiene, EPI e BPF na área produtiva',
  'L11':'Crio condições para reporte sem medo de punição',
  'L12':'Equipe entende propósito dos controles, não vê como burocracia',
  'L13':'Equipe tem competência técnica para atividades críticas',
  'L14':'Treinamentos são suficientes para o nível de complexidade',
  'L15':'Trato desvios de comportamento de forma estruturada',
  'L16':'Procedimentos do SGQ são adequados e úteis como guia',
  'L17':'Sistema de ações corretivas funciona de fato',
  'L18':'Resultados de auditorias e desvios são discutidos com a equipe',
  'F01':'Especificações e critérios da Odara são claros e objetivos',
  'F02':'Alinhamento claro sobre requisitos de segurança e qualidade',
  'F03':'Comunicação sobre qualidade e desvios é ágil e eficaz',
  'F04':'Odara orienta com antecedência sobre mudanças de processo',
  'F05':'Requisitos de rastreabilidade são proporcionais e claros',
  'F06':'Empresa possui rastreabilidade para atender solicitação da Odara',
  'F07':'Processo de tratamento de NC entre as partes é claro',
  'F08':'Prazos permitem atender requisitos de qualidade',
  'F09':'Odara comunica resultados de análises e reclamações',
  'F10':'Odara demonstra consistência e profissionalismo na gestão',
  'F11':'Relacionamento favorece melhoria contínua',
  'F12':'Confiança mútua no compromisso com qualidade',
  'D01':'Produtos chegam com padrão consistente de qualidade',
  'D02':'Integridade da embalagem e identificação atendem consistentemente',
  'D03':'Informações de produto são completas e confiáveis',
  'D04':'Confio que os produtos são seguros para consumidores',
  'D05':'Condições de entrega preservam a qualidade',
  'D06':'Documentação fornecida é adequada para operação',
  'D07':'Odara responde adequadamente a reclamações e desvios',
  'D08':'Comunicação sobre qualidade é clara e resolutiva',
  'D09':'Odara demonstra capacidade de rastreabilidade',
  'D10':'Confiança na seriedade da Odara com qualidade',
  'D11':'Odara evoluiu na qualidade ao longo do tempo',
  'D12':'Recomendaria a Odara como fornecedor confiável',
};

async function loadFromSupabase() {
  if (!window.supabaseConfigured || !window.supabaseConfigured()) return false;

  try {
    // 1. Respondentes com segmentação
    const respondents = await window.sbSelect(
      '/respondents?select=id,survey_type,submitted_at,seg_audience,seg_area,seg_shift,seg_tenure,seg_level'
    );

    // 2. Tentar a view dimension_scores
    let dimRows = null;
    try {
      dimRows = await window.sbSelect(
        '/dimension_scores?select=survey_type,dimension,avg_score,respondent_count'
      );
    } catch (viewErr) {
      console.warn('[Odara] View dimension_scores indisponível, usando fallback client-side:', viewErr.message);
    }

    // 3. Todas as respostas numéricas + question_id + respondent_id
    const responses = await window.sbSelect(
      '/responses?select=value_numeric,survey_type,question_id,respondent_id&value_numeric=not.is.null'
    );

    // 4. Respostas abertas — buscar por question_id das abertas diretamente
    const openQids = 'question_id=in.(I24,I25,I26,L19,L20,L21,F13,F14,F15,D13,D14,D15)';
    const openResp = await window.sbSelect(
      '/responses?select=value,question_id,survey_type&' + openQids + '&value=not.is.null&limit=500'
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
    ALL_DIM_NAMES.forEach(d => { dims[d] = { geral:null, internos:null, liderancas:null, fornecedores:null, distribuidores:null }; });

    if (dimRows && dimRows.length > 0) {
      // ✅ Caminho feliz: view funciona, tabela questions está populada
      dimRows.forEach(row => {
        const d = row.dimension;
        if (!dims[d]) dims[d] = { geral:null, internos:null, liderancas:null, fornecedores:null, distribuidores:null };
        const key = row.survey_type;
        if (key && dims[d][key] !== undefined) {
          const sc = parseFloat(row.avg_score);
          dims[d][key] = isNaN(sc) ? null : sc;
        }
      });
    } else {
      // 🔄 Fallback: calcular dimensões client-side usando Q_DIM_MAP
      console.info('[Odara] Calculando dimensões client-side (rode o seed_and_fix.sql para ativar a view)');
      const buckets = {};
      (responses || []).forEach(r => {
        const dim = Q_DIM_MAP[r.question_id];
        if (!dim) return;
        if (!buckets[dim]) buckets[dim] = { internos:[], liderancas:[], fornecedores:[], distribuidores:[] };
        const val = parseFloat(r.value_numeric);
        if (isNaN(val) || val < 1 || val > 5) return;
        if (buckets[dim][r.survey_type]) buckets[dim][r.survey_type].push(val);
      });
      Object.entries(buckets).forEach(([dim, data]) => {
        if (!dims[dim]) dims[dim] = { geral:null, internos:null, liderancas:null, fornecedores:null, distribuidores:null };
        ['internos','liderancas','fornecedores','distribuidores'].forEach(k => {
          if (data[k] && data[k].length) dims[dim][k] = parseFloat((data[k].reduce((a,b)=>a+b,0)/data[k].length).toFixed(2));
        });
      });
    }

    // Calcular geral = média de todos os públicos disponíveis para cada dimensão
    Object.keys(dims).forEach(d => {
      const vals = ['internos','liderancas','fornecedores','distribuidores']
        .map(k => dims[d][k]).filter(v => v !== null && v !== undefined && !isNaN(v));
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

    // Verbatim — filtrar apenas perguntas abertas reais (excluir segmentação SEG*)
    const OPEN_IDS = new Set(['I24','I25','I26','L19','L20','L21','F13','F14','F15','D13','D14','D15']);
    const verbatim = (openResp || [])
      .filter(r => r.value && r.value.trim().length > 2 && OPEN_IDS.has(r.question_id))
      .map(r => {
        let type = 'actions';
        if (['I24','L19','F13','D13'].includes(r.question_id)) type = 'strengths';
        else if (['I25','L20','F14','D14'].includes(r.question_id)) type = 'weaknesses';
        const audLabel = {internos:'Colaborador',liderancas:'Liderança',fornecedores:'Fornecedor',distribuidores:'Distribuidor'};
        return { type, aud: audLabel[r.survey_type] || r.survey_type, txt: r.value };
      });

    // Ações
    if (sbActions && sbActions.length > 0) {
      actions = sbActions.map(a => ({
        id: String(a.id), dim: a.dimension, pri: a.priority,
        title: a.title, desc: a.description || '', owner: a.owner || '',
        deadline: a.deadline || '', expected: a.expected_result || '',
        status: a.status, pct: a.progress_pct || 0,
      }));
    }

    DATA = { total, audCounts, audScores, dims, overallScore, distPct, verbatim, respondents: respondents || [], rawResponses: responses || [] };
    console.info('[Odara] Dados carregados:', total, 'respondentes,', allNums.length, 'respostas numéricas');
    return true;
  } catch (e) {
    console.warn('[Odara] Supabase erro:', e.message);
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
  const completionPct = d && d.total ? Math.min(100, Math.round((d.total / EXPECTED_TOTAL) * 100)) : 0;
  document.getElementById('kv-comp').textContent  = d && d.total ? completionPct + '%' : '—';
  document.getElementById('kv-crit').textContent  = d ? Object.values(d.dims).filter(s=>s.geral!==null&&s.geral<3.5).length : '—';
  document.getElementById('kv-mat').textContent   = d && d.overallScore ? matLabel(d.overallScore) : '—';

  if (!d || d.total === 0) {
    document.getElementById('radar-wrap').innerHTML  = emptyState();
    document.getElementById('dist-wrap').innerHTML   = emptyState();
    document.getElementById('seg-grid').innerHTML    = emptyState('Segmentação disponível após as primeiras respostas.');
    document.getElementById('ins-grid').innerHTML    = emptyState('Insights gerados automaticamente quando houver dados suficientes.');
    return;
  }

  initRadarChart('geral');
  initDistChart();
  renderSegmented();
  renderInsights();
}

// Estado do radar
let radarChartInstance = null;
let radarFilter = 'geral';

function initRadarChart(audience) {
  radarFilter = audience || 'geral';
  const container = document.getElementById('radar-wrap');
  const scoreEl = document.getElementById('radar-score');
  const filterEl = document.getElementById('radar-filters');

  // Botões de filtro
  const btns = [
    { key:'geral', label:'Geral', color:C.y },
    { key:'internos', label:'👷 Colaboradores', color:'#FFB81D' },
    { key:'liderancas', label:'🏆 Lideranças', color:'#EE2737' },
    { key:'fornecedores', label:'🤝 Fornecedores', color:'#27AE60' },
    { key:'distribuidores', label:'🏪 Distribuidores', color:'#3498DB' },
  ];
  if (filterEl) {
    filterEl.innerHTML = btns.map(b =>
      `<button class="rf-btn ${radarFilter===b.key?'active':''}" onclick="initRadarChart('${b.key}')">${b.label}</button>`
    ).join('');
  }

  // Determinar dimensões e dados com base no filtro
  let dimList, dataVals, chartColor, chartBg, score;
  const dimMap = { internos:DIM_NAMES, liderancas:DIM_LID_NAMES, fornecedores:DIM_FORN_NAMES, distribuidores:DIM_DIST_NAMES };

  if (audience === 'geral') {
    // Geral = todas as dimensões de internos com score geral
    dimList = DIM_NAMES.filter(d => DATA.dims[d] && DATA.dims[d].geral !== null);
    dataVals = dimList.map(d => DATA.dims[d].geral);
    chartColor = C.y; chartBg = 'rgba(255,184,29,.12)';
    score = DATA.overallScore;
  } else {
    dimList = (dimMap[audience] || DIM_NAMES).filter(d => DATA.dims[d] && DATA.dims[d][audience] !== null);
    dataVals = dimList.map(d => DATA.dims[d][audience]);
    const colorMap = { internos:C.y, liderancas:C.r, fornecedores:'#27AE60', distribuidores:'#3498DB' };
    chartColor = colorMap[audience] || C.y;
    chartBg = chartColor + '1F';
    score = DATA.audScores[audience];
  }

  // Score display
  if (scoreEl) {
    scoreEl.innerHTML = score ? `<span style="color:${audience==='geral'?C.y:(audience==='liderancas'?C.r:audience==='fornecedores'?'#27AE60':audience==='distribuidores'?'#3498DB':C.y)}">${score.toFixed(2)}</span><div style="font-size:9px;font-weight:500;color:var(--g);margin-top:2px;">${matLabel(score)}</div>` : '—';
  }

  if (!dimList.length) { container.innerHTML = emptyState('Sem dados para este público.'); return; }

  // Destruir chart anterior
  if (radarChartInstance) { radarChartInstance.destroy(); radarChartInstance = null; }
  container.innerHTML = '<canvas id="radarChart"></canvas>';

  radarChartInstance = new Chart(document.getElementById('radarChart'), {
    type: 'radar',
    data: {
      labels: dimList.map(d => { const p=d.split(' e '); return p.length>1?[p[0]+' e',p[1]]:[d]; }),
      datasets: [{
        label: audience === 'geral' ? 'Geral' : btns.find(b=>b.key===audience)?.label || audience,
        data: dataVals,
        borderColor: chartColor,
        backgroundColor: chartColor + '28',
        borderWidth: 3.5,
        pointBackgroundColor: chartColor,
        pointRadius: 8, pointHoverRadius: 10,
        pointBorderColor: '#fff', pointBorderWidth: 2.5
      }]
    },
    options: {
      responsive:true, maintainAspectRatio:true,
      scales:{ r:{ min:1, max:5,
        ticks:{ stepSize:1, font:{size:10,family:'Barlow',weight:'600'}, color:'#0C0C0C', backdropColor:'rgba(255,255,255,.7)', backdropPadding:3 },
        grid:{ color:'rgba(12,12,12,.1)', lineWidth:1.5 },
        angleLines:{ color:'rgba(12,12,12,.08)' },
        pointLabels:{ font:{size:12,weight:'700',family:'Barlow'}, color:'#0C0C0C' }
      }},
      plugins:{ legend:{ display:false } }
    }
  });
}
window.initRadarChart = initRadarChart;

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

// Bar chart removido — redundante com o radar filtrado

function renderSegmented() {
  const el = document.getElementById('seg-grid');
  if (!DATA || DATA.total === 0) { el.innerHTML = emptyState('Segmentação disponível após as primeiras respostas.'); return; }

  const AUD = [
    { key:'internos',       label:'👷 Colaboradores',    color:'#FFB81D',  dims: DIM_NAMES },
    { key:'liderancas',     label:'🏆 Lideranças',        color:'#EE2737',  dims: DIM_LID_NAMES },
    { key:'fornecedores',   label:'🤝 Fornecedores',      color:'#27AE60',  dims: DIM_FORN_NAMES },
    { key:'distribuidores', label:'🏪 Distribuidores',    color:'#3498DB',  dims: DIM_DIST_NAMES },
  ];

  el.innerHTML = AUD.map(a => {
    const n  = DATA.audCounts[a.key] || 0;
    const sc = DATA.audScores[a.key];

    if (sc === null || n === 0) {
      return `<div class="seg-card"><div class="sg-hdr">
        <div><div class="sg-lbl" style="color:${a.color}">${a.label}</div><div class="sg-n">${n} respondentes</div></div>
        <div style="font-size:10px;color:var(--g);">Sem dados</div>
      </div>${emptyState('Aguardando respostas.')}</div>`;
    }

    const { cls } = scoreClass(sc);
    const dimList = a.dims;
    const bars = dimList.map(d => {
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

function openScoreModal() {
  if (!DATA) return;
  const AUD = [
    { key:'internos', label:'Colaboradores', color:'#FFB81D' },
    { key:'liderancas', label:'Lideranças', color:'#EE2737' },
    { key:'fornecedores', label:'Fornecedores', color:'#27AE60' },
    { key:'distribuidores', label:'Distribuidores', color:'#3498DB' },
  ];
  const overall = DATA.overallScore;
  let html = `<div style="text-align:center;margin-bottom:16px;">
    <div style="font-family:var(--fc);font-size:42px;font-weight:700;color:var(--y);">${overall ? overall.toFixed(2) : '—'}</div>
    <div style="font-size:10px;color:var(--g);">Média ponderada de todas as respostas Likert (1–5)</div>
    ${overall ? `<span class="pill ${scoreClass(overall).cls}" style="margin-top:6px;display:inline-block;">${matLabel(overall)}</span>` : ''}
  </div>
  <div style="font-size:10px;font-weight:700;color:var(--p);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;">Score por público</div>`;
  AUD.forEach(a => {
    const sc = DATA.audScores[a.key];
    const n = DATA.audCounts[a.key] || 0;
    html += `<div class="resp-row" style="margin-bottom:8px;">
      <span class="resp-label">${a.label} <span style="color:var(--g);font-weight:400;">(${n})</span></span>
      <div class="resp-bar-track"><div class="resp-bar-fill" style="width:${sc?((sc-1)/4)*100:0}%;background:${a.color}"></div></div>
      <span class="resp-val" style="color:${a.color};min-width:35px;">${sc ? sc.toFixed(2) : '—'}</span>
    </div>`;
  });
  html += `<div style="margin-top:12px;padding:8px 10px;background:rgba(255,184,29,.05);border-radius:3px;font-size:9.5px;color:var(--g);line-height:1.5;">
    <strong>Cálculo:</strong> Média aritmética de todas as respostas numéricas (Likert 1–5) de cada público. O score geral é a média de todas as respostas combinadas.
  </div>`;
  document.getElementById('score-breakdown').innerHTML = html;
  document.getElementById('score-modal').style.display = 'flex';
}
window.openScoreModal = openScoreModal;

function openCompModal() {
  if (!DATA) return;
  const AUD = [
    { key:'internos', label:'Colaboradores', color:'#FFB81D', expected: EXPECTED_RESPONSES.internos },
    { key:'liderancas', label:'Lideranças', color:'#EE2737', expected: EXPECTED_RESPONSES.liderancas },
    { key:'fornecedores', label:'Fornecedores', color:'#27AE60', expected: EXPECTED_RESPONSES.fornecedores },
    { key:'distribuidores', label:'Distribuidores', color:'#3498DB', expected: EXPECTED_RESPONSES.distribuidores },
  ];
  const totalPct = Math.min(100, Math.round((DATA.total / EXPECTED_TOTAL) * 100));
  let html = `<div style="text-align:center;margin-bottom:16px;">
    <div style="font-family:var(--fc);font-size:42px;font-weight:700;color:${totalPct>=80?'#27AE60':totalPct>=50?'#E67E22':'#C0392B'};">${totalPct}%</div>
    <div style="font-size:10px;color:var(--g);">${DATA.total} de ${EXPECTED_TOTAL} respostas esperadas</div>
  </div>
  <div style="font-size:10px;font-weight:700;color:var(--p);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;">Conclusão por público</div>`;
  AUD.forEach(a => {
    const n = DATA.audCounts[a.key] || 0;
    const pct = Math.min(100, Math.round((n / a.expected) * 100));
    html += `<div class="resp-row" style="margin-bottom:8px;">
      <span class="resp-label">${a.label}</span>
      <div class="resp-bar-track"><div class="resp-bar-fill" style="width:${pct}%;background:${a.color}"></div></div>
      <span class="resp-val" style="color:${a.color};min-width:55px;">${n}/${a.expected}</span>
    </div>`;
  });
  html += `<div style="margin-top:12px;padding:8px 10px;background:rgba(255,184,29,.05);border-radius:3px;font-size:9.5px;color:var(--g);line-height:1.5;">
    <strong>Meta:</strong> Colaboradores ${EXPECTED_RESPONSES.internos} · Lideranças ${EXPECTED_RESPONSES.liderancas} · Fornecedores ${EXPECTED_RESPONSES.fornecedores} · Distribuidores ${EXPECTED_RESPONSES.distribuidores} = <strong>${EXPECTED_TOTAL} total</strong>.<br>
    Ajuste os valores em <code>EXPECTED_RESPONSES</code> no dashboard.js.
  </div>`;
  document.getElementById('comp-breakdown').innerHTML = html;
  document.getElementById('comp-modal').style.display = 'flex';
}
window.openCompModal = openCompModal;

function openCritModal() {
  if (!DATA) return;
  const AUD_LABELS = { internos:'Colaboradores', liderancas:'Lideranças', fornecedores:'Fornecedores', distribuidores:'Distribuidores' };
  const crits = [];
  Object.entries(DATA.dims).forEach(([dim, sc]) => {
    ['internos','liderancas','fornecedores','distribuidores'].forEach(k => {
      if (sc[k] !== null && sc[k] !== undefined && sc[k] < 3.5) {
        crits.push({ dim, pub: AUD_LABELS[k], score: sc[k], key: k });
      }
    });
  });
  crits.sort((a,b) => a.score - b.score);

  let html;
  if (!crits.length) {
    html = '<div style="text-align:center;padding:20px;"><div style="font-size:32px;margin-bottom:8px;">🎉</div><div style="font-size:12px;color:var(--g);">Nenhuma dimensão crítica. Todas acima de 3.5!</div></div>';
  } else {
    const colorMap = { internos:'#FFB81D', liderancas:'#EE2737', fornecedores:'#27AE60', distribuidores:'#3498DB' };
    html = `<div style="font-size:10px;color:var(--g);margin-bottom:12px;">${crits.length} dimensão(ões) abaixo do limiar 3.5</div>`;
    html += crits.map(c => {
      const { cls, lbl } = scoreClass(c.score);
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;background:rgba(238,39,55,.03);border-left:3px solid ${colorMap[c.key]};border-radius:0 3px 3px 0;">
        <div style="flex:1;">
          <div style="font-weight:700;font-size:12px;">${c.dim}</div>
          <div style="font-size:10px;color:var(--g);">${c.pub}</div>
        </div>
        <span class="pill ${cls}">${c.score.toFixed(2)}</span>
        <span style="font-size:9px;color:var(--g);">${lbl}</span>
      </div>`;
    }).join('');
    html += `<div style="margin-top:12px;padding:8px 10px;background:rgba(238,39,55,.04);border-radius:3px;font-size:9.5px;color:var(--g);line-height:1.5;">
      <strong>Critério:</strong> Qualquer dimensão com score médio &lt; 3.5 em qualquer público é classificada como crítica (Em Risco ou Frágil).
    </div>`;
  }
  document.getElementById('crit-breakdown').innerHTML = html;
  document.getElementById('crit-modal').style.display = 'flex';
}
window.openCritModal = openCritModal;

// ══════════════════════════════════════════════
// DIMENSÕES TABLE with filters and sorting
// ══════════════════════════════════════════════
let dimTableData = [];
let dimSortKey = null;
let dimSortAsc = true;
let dimFilterPub = '';
let dimFilterMat = '';

function buildDimTableData() {
  dimTableData = [];
  if (!DATA || DATA.total === 0) return;
  function addRows(dimList, audienceKey, audienceLabel) {
    dimList.forEach(dim => {
      const sc = DATA.dims[dim];
      if (!sc || sc[audienceKey] === null || sc[audienceKey] === undefined) return;
      dimTableData.push({ dim, pub: audienceLabel, pubKey: audienceKey, score: sc[audienceKey], mat: matLabel(sc[audienceKey]) });
    });
  }
  addRows(DIM_NAMES, 'internos', 'Colaboradores');
  addRows(DIM_LID_NAMES, 'liderancas', 'Lideranças');
  addRows(DIM_FORN_NAMES, 'fornecedores', 'Fornecedores');
  addRows(DIM_DIST_NAMES, 'distribuidores', 'Distribuidores');
}

function renderDimFilters() {
  const el = document.getElementById('dim-filters');
  if (!el) return;
  const pubs = [...new Set(dimTableData.map(r => r.pub))];
  const mats = [...new Set(dimTableData.map(r => r.mat))];
  el.innerHTML = `
    <select class="rf-btn" style="padding:5px 10px;" onchange="dimFilterPub=this.value;renderDimTableFiltered()">
      <option value="">Todos os públicos</option>
      ${pubs.map(p => `<option value="${p}" ${dimFilterPub===p?'selected':''}>${p}</option>`).join('')}
    </select>
    <select class="rf-btn" style="padding:5px 10px;" onchange="dimFilterMat=this.value;renderDimTableFiltered()">
      <option value="">Todas as maturidades</option>
      ${mats.map(m => `<option value="${m}" ${dimFilterMat===m?'selected':''}>${m}</option>`).join('')}
    </select>
    <button class="rf-btn" onclick="dimFilterPub='';dimFilterMat='';dimSortKey=null;renderDimFilters();renderDimTableFiltered()">↺ Limpar</button>
  `;
}

function sortDimTable(key) {
  if (dimSortKey === key) { dimSortAsc = !dimSortAsc; }
  else { dimSortKey = key; dimSortAsc = true; }
  renderDimTableFiltered();
}
window.sortDimTable = sortDimTable;

function renderDimTableFiltered() {
  let rows = [...dimTableData];
  if (dimFilterPub) rows = rows.filter(r => r.pub === dimFilterPub);
  if (dimFilterMat) rows = rows.filter(r => r.mat === dimFilterMat);
  if (dimSortKey) {
    const keyMap = { dim:'dim', pub:'pub', score:'score', mat:'mat' };
    const k = keyMap[dimSortKey] || 'score';
    rows.sort((a,b) => {
      const va = k==='score' ? a[k] : String(a[k]);
      const vb = k==='score' ? b[k] : String(b[k]);
      if (va < vb) return dimSortAsc ? -1 : 1;
      if (va > vb) return dimSortAsc ? 1 : -1;
      return 0;
    });
  }
  const el = document.getElementById('dim-tbody');
  if (!rows.length) { el.innerHTML = `<tr><td colspan="5">${emptyState('Nenhuma dimensão encontrada com os filtros selecionados.')}</td></tr>`; return; }
  el.innerHTML = rows.map(r => {
    const { cls, lbl } = scoreClass(r.score);
    return `<tr style="background:rgba(255,184,29,.04);">
      <td style="font-weight:600;">${r.dim}</td>
      <td>${r.pub}</td>
      <td><span class="pill ${cls}">${r.score.toFixed(2)}</span></td>
      <td>${lbl}</td>
      <td style="font-size:10px;color:var(--g);">${DIM_RECS[r.dim] || recAction(r.score)}</td>
    </tr>`;
  }).join('');
}

function renderDimTable() {
  buildDimTableData();
  renderDimFilters();
  renderDimTableFiltered();
}

// ══════════════════════════════════════════════
// HEATMAP — por público, com drill-down por pergunta
// ══════════════════════════════════════════════
function buildHeatmapData(audience) {
  if (!DATA || DATA.total === 0) return null;
  const dimMap = { internos:DIM_NAMES, liderancas:DIM_LID_NAMES, fornecedores:DIM_FORN_NAMES, distribuidores:DIM_DIST_NAMES };
  const dimList = dimMap[audience] || DIM_NAMES;

  // Tentar primeiro via dados agregados (DATA.dims) — funciona sempre se a view existe
  const rows = dimList.map(d => {
    const sc = DATA.dims[d]?.[audience];
    if (sc === null || sc === undefined) return null;
    return { name: d.length > 25 ? d.split(' ')[0] : d, full: d, scores: [sc] };
  }).filter(Boolean);

  if (rows.length) {
    console.info(`[Odara] Heatmap ${audience}: ${rows.length} dimensões via DATA.dims`);

    // Tentar enriquecer com breakdown por área
    const respArea = {};
    (DATA.respondents || []).forEach(r => {
      if (r.survey_type === audience) respArea[r.id] = r.seg_area || 'Geral';
    });
    const areas = [...new Set(Object.values(respArea))].filter(Boolean).sort();

    // Se tem mais de 1 área, fazer breakdown
    if (areas.length > 1) {
      const rawResp = DATA.rawResponses || [];
      const enrichedRows = dimList.map(dim => {
        const scoresByArea = {};
        areas.forEach(a => { scoresByArea[a] = []; });
        rawResp.forEach(r => {
          if (r.survey_type !== audience || Q_DIM_MAP[r.question_id] !== dim) return;
          const val = parseFloat(r.value_numeric);
          if (isNaN(val) || val < 1 || val > 5) return;
          const area = respArea[r.respondent_id] || 'Geral';
          if (!scoresByArea[area]) scoresByArea[area] = [];
          scoresByArea[area].push(val);
        });
        const scores = areas.map(a => {
          const vals = scoresByArea[a] || [];
          return vals.length ? parseFloat((vals.reduce((x,y)=>x+y,0)/vals.length).toFixed(2)) : null;
        });
        if (scores.every(s => s === null)) return null;
        return { name: dim.length > 25 ? dim.split(' ')[0] : dim, full: dim, scores };
      }).filter(Boolean);

      if (enrichedRows.length) {
        console.info(`[Odara] Heatmap ${audience}: breakdown por ${areas.length} áreas`);
        return { areas, rows: enrichedRows };
      }
    }

    return { areas: ['Score geral'], rows };
  }

  // Se não tem dados nos dims agregados, tentar via rawResponses direto
  const rawResp = DATA.rawResponses || [];
  const fallbackRows = dimList.map(dim => {
    const vals = rawResp.filter(r => r.survey_type === audience && Q_DIM_MAP[r.question_id] === dim)
      .map(r => parseFloat(r.value_numeric)).filter(v => !isNaN(v) && v >= 1 && v <= 5);
    if (!vals.length) return null;
    const avg = parseFloat((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2));
    return { name: dim.length > 25 ? dim.split(' ')[0] : dim, full: dim, scores: [avg] };
  }).filter(Boolean);

  if (fallbackRows.length) {
    console.info(`[Odara] Heatmap ${audience}: ${fallbackRows.length} dimensões via rawResponses`);
    return { areas: ['Score geral'], rows: fallbackRows };
  }

  console.info(`[Odara] Heatmap ${audience}: sem dados`);
  return null;
}

function renderHeatmap() {
  const panels = [
    { key:'internos',       id:'hm-internos',       label:'👷 Colaboradores',  color:'#FFB81D' },
    { key:'liderancas',     id:'hm-liderancas',      label:'🏆 Lideranças',     color:'#EE2737', dynamic:true },
    { key:'fornecedores',   id:'hm-fornecedores',    label:'🤝 Fornecedores',   color:'#27AE60' },
    { key:'distribuidores', id:'hm-distribuidores',   label:'🏪 Distribuidores', color:'#3498DB' },
  ];

  panels.forEach(p => {
    let el = document.getElementById(p.id);

    // Criar painel dinâmico para lideranças se não existe
    if (!el && p.dynamic) {
      const parent = document.getElementById('hm-internos').parentElement;
      el = document.createElement('div');
      el.id = p.id;
      el.style.marginTop = '16px';
      const next = document.getElementById('hm-fornecedores');
      if (next) parent.insertBefore(el, next);
      else parent.appendChild(el);
    }
    if (!el) return;

    const data = buildHeatmapData(p.key);
    if (data) {
      el.innerHTML = `<h4 style="font-size:11px;font-weight:700;margin-bottom:8px;color:${p.color};">${p.label}</h4>` + buildHmTable(data, p.key);
    } else {
      const n = DATA ? (DATA.audCounts[p.key] || 0) : 0;
      el.innerHTML = emptyState(n > 0
        ? `${n} respondente(s) registrado(s), mas sem respostas numéricas processadas. Verifique se as respostas foram gravadas corretamente.`
        : `Aguardando respostas de ${p.label.replace(/[^\w\s]/g,'').trim().toLowerCase()}.`);
    }
  });

  renderDrillDown();
}

function buildHmFilters() {
  const el = document.getElementById('hm-filters-bar');
  if (!el) return;
  el.innerHTML = `<span style="font-size:9px;color:var(--g);">Clique em qualquer nota para ver as perguntas que compõem a dimensão →</span>`;
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
    el.innerHTML = `<div class="dd-hint">👈 Clique em qualquer nota no heatmap para ver quais perguntas puxam o score para baixo e as recomendações de ação.</div>`;
    return;
  }

  const { dim, area, score, audience } = heatSel;
  const { cls } = scoreClass(score);
  const audLabels = { internos:'Colaboradores', liderancas:'Lideranças', fornecedores:'Fornecedores', distribuidores:'Distribuidores' };

  // Buscar perguntas da dimensão com scores individuais
  const qIds = Object.entries(Q_DIM_MAP).filter(([,d]) => d === dim).map(([id]) => id);
  const qScores = qIds.map(qid => {
    const vals = (DATA.rawResponses || [])
      .filter(r => r.question_id === qid && r.survey_type === audience)
      .map(r => parseFloat(r.value_numeric))
      .filter(v => !isNaN(v) && v >= 1 && v <= 5);
    const avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length) : null;
    return { qid, avg, count: vals.length };
  }).filter(q => q.avg !== null).sort((a,b) => a.avg - b.avg);

  // Separar perguntas em "gaps" (< score da dimensão) e "fortes"
  const gapQs = qScores.filter(q => q.avg < score);
  const allQs = qScores;

  let qListHtml;
  if (allQs.length) {
    qListHtml = '';
    if (gapQs.length) {
      qListHtml += `<div style="font-size:9px;font-weight:700;color:#C0392B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">🔻 Perguntas que puxam o score para baixo</div>`;
      qListHtml += gapQs.map(q => buildQRow(q, true)).join('');
      qListHtml += `<div style="border-top:1px solid rgba(12,12,12,.08);margin:10px 0;"></div>`;
    }
    const restQs = allQs.filter(q => !gapQs.includes(q));
    if (restQs.length) {
      qListHtml += `<div style="font-size:9px;font-weight:700;color:var(--g);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Demais perguntas</div>`;
      qListHtml += restQs.map(q => buildQRow(q, false)).join('');
    }
  } else {
    qListHtml = '<div style="font-size:10px;color:var(--g);padding:8px;">Sem respostas individuais disponíveis. O score foi calculado via dados agregados.</div>';
  }

  el.innerHTML = `<div class="dd-card">
    <div class="dd-hdr">
      <div class="dd-bc">📍 ${audLabels[audience] || audience} · ${dim}</div>
      <div class="dd-sl">
        <span class="dd-big ${cls}">${score.toFixed(1)}</span>
        <span class="pill ${cls}" style="font-size:8.5px;">${matLabel(score)}</span>
      </div>
    </div>
    <div class="dd-body">
      <div>
        <div class="dd-st">📋 Análise por pergunta (${allQs.length})</div>
        <div style="max-height:360px;overflow-y:auto;">${qListHtml}</div>
      </div>
      <div>
        <div class="dd-st">⚡ Recomendação</div>
        <div class="da-list">
          ${score < 3.5 ? `<div class="da da-crit">
            <div class="da-t">⚠️ Intervenção prioritária</div>
            <div class="da-b">Score ${score.toFixed(1)} — Zona de intervenção. Definir plano em 30 dias com liderança direta.</div>
          </div>` : `<div class="da da-info">
            <div class="da-t">✅ Dimensão acima do limiar</div>
            <div class="da-b">Score ${score.toFixed(1)} — ${score >= 4.5 ? 'Cultura consolidada. Manter e replicar.' : 'Em desenvolvimento. Fortalecer com ações pontuais.'}</div>
          </div>`}
          <div class="da da-info" style="margin-top:6px;">
            <div class="da-b" style="font-size:10px;">${DIM_RECS[dim] || recAction(score)}</div>
            <button class="da-add" onclick="addFromDd(this)" data-dim="${dim}" data-area="${area}" data-rec="${(DIM_RECS[dim] || dim).substring(0,55).replace(/"/g,'')}">+ Adicionar ao plano de ação</button>
          </div>
        </div>
      </div>
    </div>
    <div style="padding:10px 18px 14px;display:flex;justify-content:flex-end;">
      <button class="dd-close-btn" onclick="heatSel=null;renderHeatmap();renderDrillDown()">✕ Fechar</button>
    </div>
  </div>`;
}

function buildQRow(q, isGap) {
  const qsc = scoreClass(q.avg);
  const text = Q_TEXT_MAP[q.qid] || q.qid;
  const bg = isGap ? 'rgba(238,39,55,.04)' : 'transparent';
  const border = isGap ? 'border-left:3px solid #EE2737;' : 'border-left:3px solid transparent;';
  return `<div class="dq-row" style="background:${bg};${border}padding-left:8px;margin-bottom:4px;border-radius:0 3px 3px 0;">
    <div class="dq-id" style="font-weight:700;min-width:32px;color:${isGap?'#C0392B':'var(--g)'};">${q.qid}</div>
    <div class="dq-text" style="flex:1;font-size:10px;line-height:1.4;">${text}</div>
    <div style="display:flex;align-items:center;gap:4px;min-width:80px;justify-content:flex-end;">
      <div style="width:40px;height:4px;background:rgba(12,12,12,.08);border-radius:2px;overflow:hidden;">
        <div style="width:${((q.avg-1)/4)*100}%;height:100%;background:${heatColor(q.avg)};border-radius:2px;"></div>
      </div>
      <span class="pill ${qsc.cls}" style="font-size:8px;min-width:30px;text-align:center;">${q.avg.toFixed(1)}</span>
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
  console.info(`[Odara] Verbatim: ${vb.length} total, mostrando ${list.length} (filtro: ${type})`);

  el.innerHTML = list.length
    ? `<div style="font-size:9px;color:var(--g);margin-bottom:10px;">${list.length} resposta(s) aberta(s)</div>` +
      list.map(v => `<div class="vb-card">
        <div class="vb-meta"><span>${ico[v.type]||'💬'} ${lbl[v.type]||'Comentário'}</span><span>👤 ${v.aud}</span></div>
        <div class="vb-txt">"${v.txt}"</div>
      </div>`).join('')
    : emptyState('Nenhuma resposta aberta registrada ainda. As respostas aparecerão aqui quando os respondentes preencherem as perguntas abertas (I24–I26, L19–L21, F13–F15, D13–D15).');
}

// ══════════════════════════════════════════════
// INSIGHTS ESTRATÉGICOS
// ══════════════════════════════════════════════
function renderStrategicInsights() {
  const el = document.getElementById('strategic-insights');
  if (!DATA || !el) {
    if (el) el.innerHTML = `<div class="is-card full">${emptyState('Insights estratégicos gerados automaticamente após o início da coleta de respostas.')}</div>`;
    return;
  }
  if (DATA.total === 0) {
    el.innerHTML = `<div class="is-card full">${emptyState('Insights estratégicos gerados automaticamente após o início da coleta de respostas.')}</div>`;
    return;
  }

  // Dimensões críticas de TODOS os públicos
  const critDims = Object.entries(DATA.dims)
    .filter(([, sc]) => {
      const anyScore = ['internos','liderancas','fornecedores','distribuidores'].some(k => sc[k] !== null && sc[k] !== undefined);
      const lowestScore = ['internos','liderancas','fornecedores','distribuidores']
        .map(k => sc[k]).filter(v => v !== null && v !== undefined);
      return anyScore && lowestScore.length > 0 && Math.min(...lowestScore) < 3.5;
    })
    .map(([dim, sc]) => {
      const scores = ['internos','liderancas','fornecedores','distribuidores'].map(k => sc[k]).filter(v => v !== null);
      return { dim, minScore: Math.min(...scores), avgScore: scores.reduce((a,b)=>a+b,0)/scores.length };
    })
    .sort((a, b) => a.minScore - b.minScore);

  // Forças — dimensões com score alto em qualquer público
  const strongDims = [];
  Object.entries(DATA.dims).forEach(([dim, sc]) => {
    ['internos','liderancas','fornecedores','distribuidores'].forEach(k => {
      if (sc[k] !== null && sc[k] !== undefined && sc[k] >= 4.0) {
        const audLabels = {internos:'Colaboradores',liderancas:'Lideranças',fornecedores:'Fornecedores',distribuidores:'Distribuidores'};
        strongDims.push({ dim, score: sc[k], pub: audLabels[k] });
      }
    });
  });
  strongDims.sort((a,b) => b.score - a.score);

  // Gaps entre públicos
  const gaps = [];
  DIM_NAMES.forEach(dim => {
    const sc = DATA.dims[dim];
    if (sc && sc.internos !== null && sc.liderancas !== null) {
      const diff = Math.abs(sc.liderancas - sc.internos);
      if (diff > 0.5) gaps.push({ dim, internos: sc.internos, liderancas: sc.liderancas, diff });
    }
  });

  // Summary stats
  const totalDims = Object.entries(DATA.dims).filter(([,sc]) => 
    ['internos','liderancas','fornecedores','distribuidores'].some(k => sc[k] !== null)
  ).length;

  el.innerHTML = `
    <div class="is-card">
      <div class="is-title">📈 Resumo da Coleta <span class="is-tag cause">STATUS</span></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:8px;">
        <div style="text-align:center;"><div style="font-family:var(--fc);font-size:22px;font-weight:700;color:var(--y);">${DATA.total}</div><div style="font-size:9px;color:var(--g);">Respondentes</div></div>
        <div style="text-align:center;"><div style="font-family:var(--fc);font-size:22px;font-weight:700;color:var(--p);">${DATA.overallScore ? DATA.overallScore.toFixed(1) : '—'}</div><div style="font-size:9px;color:var(--g);">Score Geral</div></div>
        <div style="text-align:center;"><div style="font-family:var(--fc);font-size:22px;font-weight:700;color:#27AE60;">${totalDims}</div><div style="font-size:9px;color:var(--g);">Dimensões avaliadas</div></div>
        <div style="text-align:center;"><div style="font-family:var(--fc);font-size:22px;font-weight:700;color:${critDims.length?'#C0392B':'#27AE60'};">${critDims.length}</div><div style="font-size:9px;color:var(--g);">Dimensões críticas</div></div>
      </div>
    </div>
    <div class="is-card">
      <div class="is-title">🚨 Dimensões Críticas (< 3.5) <span class="is-tag priority">PRIORITÁRIO</span></div>
      ${critDims.length
        ? critDims.map((item, i) => `<div class="problem-item">
            <div class="prob-num">${i+1}</div>
            <div class="prob-body">
              <div class="prob-title">${item.dim}</div>
              <div class="prob-desc">${DIM_RECS[item.dim]||'Dimensão abaixo do limiar. Requer intervenção estruturada.'}</div>
              <span class="prob-score">Score mínimo ${item.minScore.toFixed(1)} — ${matLabel(item.minScore)}</span>
            </div>
          </div>`).join('')
        : '<div style="font-size:11px;color:var(--g);padding:8px 0;">Nenhuma dimensão crítica — todas acima de 3.5.</div>'
      }
    </div>
    ${gaps.length ? `<div class="is-card">
      <div class="is-title">📊 Gaps de Percepção <span class="is-tag cause">ATENÇÃO</span></div>
      ${gaps.map(g => `<div class="cause-item">
        <div class="cause-dot"></div>
        <div class="cause-text"><strong>${g.dim}</strong>: Lideranças ${g.liderancas.toFixed(1)} vs Colaboradores ${g.internos.toFixed(1)} (gap ${g.diff.toFixed(1)})</div>
      </div>`).join('')}
    </div>` : ''}
    ${strongDims.length ? `<div class="is-card">
      <div class="is-title">✅ Pontos Fortes <span class="is-tag strategic">REPLICAR</span></div>
      ${strongDims.slice(0,8).map(s => `<div class="strat-item">
        <div class="strat-icon">🏆</div>
        <div><div class="strat-title">${s.dim} — ${s.score.toFixed(1)} <span style="font-weight:400;font-size:10px;color:var(--g);">(${s.pub})</span></div>
        <div class="strat-desc">${DIM_RECS[s.dim] || 'Manter e replicar boas práticas.'}</div></div>
      </div>`).join('')}
    </div>` : ''}
    <div class="is-card full">
      <div class="is-title">🚀 Recomendações Estratégicas <span class="is-tag strategic">PLANO DE AÇÃO</span></div>
      ${[
        { icon:'📊', title:'Devolutiva para as Equipes', desc:'Apresentar resultados por área em até 30 dias após encerramento.', h:'Urgente' },
        { icon:'🎯', title:'Programa de Cultura Justa', desc:'Protocolo de não-punição por reporte. Liderança responde visivelmente em até 48h.', h:'0–60 dias' },
        { icon:'🧼', title:'Rotina de Observação de Higiene', desc:'Peer observation semanal por turnos com checklist.', h:'30–90 dias' },
        { icon:'🎓', title:'Módulo de Alergênicos', desc:'Treinamento prático 2h para toda a produção. Certificação interna.', h:'60 dias' },
        { icon:'📢', title:'DDS Estruturado por Dimensão', desc:'15 min semanais por turno, rotacionando dimensões. Líder conduz, qualidade apoia.', h:'Contínuo' },
      ].map(s => `<div class="strat-item">
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

  let dimSummary = '';
  if (DATA && DATA.total > 0) {
    const allDims = Object.entries(DATA.dims).filter(([,sc]) => {
      return ['internos','liderancas','fornecedores','distribuidores'].some(k => sc[k] !== null && sc[k] !== undefined);
    });
    if (allDims.length) {
      dimSummary = `
      <div style="margin-top:18px;">
        <h4 style="font-family:var(--fc);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">Classificação atual por dimensão</h4>
        <table class="dtbl" style="font-size:11px;">
          <thead><tr><th>Dimensão</th><th>Público</th><th>Score</th><th>Maturidade</th></tr></thead>
          <tbody>${allDims.map(([dim, sc]) => {
            const rows = [];
            if (sc.internos !== null) rows.push(`<tr><td>${dim}</td><td>Colaboradores</td><td>${sc.internos.toFixed(2)}</td><td><span class="pill ${scoreClass(sc.internos).cls}">${matLabel(sc.internos)}</span></td></tr>`);
            if (sc.liderancas !== null) rows.push(`<tr><td>${dim}</td><td>Lideranças</td><td>${sc.liderancas.toFixed(2)}</td><td><span class="pill ${scoreClass(sc.liderancas).cls}">${matLabel(sc.liderancas)}</span></td></tr>`);
            if (sc.fornecedores !== null) rows.push(`<tr><td>${dim}</td><td>Fornecedores</td><td>${sc.fornecedores.toFixed(2)}</td><td><span class="pill ${scoreClass(sc.fornecedores).cls}">${matLabel(sc.fornecedores)}</span></td></tr>`);
            if (sc.distribuidores !== null) rows.push(`<tr><td>${dim}</td><td>Distribuidores</td><td>${sc.distribuidores.toFixed(2)}</td><td><span class="pill ${scoreClass(sc.distribuidores).cls}">${matLabel(sc.distribuidores)}</span></td></tr>`);
            return rows.join('');
          }).join('')}</tbody>
        </table>
      </div>`;
    }
  }

  el.innerHTML = `
    <table class="dtbl interp-tbl">
      <thead><tr><th>Score</th><th>Maturidade Cultural</th><th>O que significa</th><th>Ação Recomendada</th></tr></thead>
      <tbody>
        <tr style="background:rgba(192,57,43,.06);"><td><span class="pill critical">&lt; 2.5</span></td><td><strong style="color:#C0392B;">🔴 Em Risco</strong></td><td style="font-size:10px;">Cultura inexistente ou disfuncional. Risco direto à segurança do produto.</td><td style="font-size:10px;"><strong>Ação imediata.</strong> Plano de crise 30 dias.</td></tr>
        <tr style="background:rgba(230,126,34,.05);"><td><span class="pill fragile">2.5 – 3.4</span></td><td><strong style="color:#E67E22;">🟡 Frágil</strong></td><td style="font-size:10px;">Cultura presente mas inconsistente. Vulnerável a pressões de prazo.</td><td style="font-size:10px;"><strong>Plano 90 dias.</strong> Auditoria comportamental.</td></tr>
        <tr style="background:rgba(255,184,29,.05);"><td><span class="pill dev">3.5 – 4.4</span></td><td><strong style="color:#9A7010;">🟠 Em Desenvolvimento</strong></td><td style="font-size:10px;">Cultura positiva em consolidação. Lacunas pontuais.</td><td style="font-size:10px;"><strong>Fortalecer.</strong> Treinamentos focados + reconhecimento.</td></tr>
        <tr style="background:rgba(39,174,96,.05);"><td><span class="pill ok">4.5 – 5.0</span></td><td><strong style="color:#27AE60;">🟢 Consolidada</strong></td><td style="font-size:10px;">Cultura robusta e autossustentável. Benchmarkável.</td><td style="font-size:10px;"><strong>Manter e replicar.</strong></td></tr>
      </tbody>
    </table>
    <div style="margin-top:12px;padding:10px 14px;background:rgba(255,184,29,.06);border-left:3px solid var(--y);border-radius:2px;font-size:10.5px;color:var(--g);line-height:1.6;">
      <strong style="color:var(--p);">Referência metodológica:</strong> GFSI Guidance Document on Food Safety Culture (2021) + FSSC 22000 v6. Score = média aritmética Likert 1–5 por dimensão.
    </div>
    ${dimSummary}`;
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
  config:'Configuração',
};
function showTab(id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('active'));
  document.getElementById('content-' + id).classList.add('active');
  document.getElementById('tab-' + id).classList.add('active');
  document.getElementById('tab-title').textContent = TITLES[id];
  var sb = document.getElementById('sidebar'); if(sb) sb.classList.remove('sb-open');
  window.scrollTo(0,0);
}
window.showTab = showTab;

// ══════════════════════════════════════════════
// CSV EXPORT
// ══════════════════════════════════════════════
function exportCSV() {
  const rows = [['Dimensão','Público','Score','Maturidade']];
  if (DATA && DATA.dims) {
    Object.entries(DATA.dims).forEach(([dim, sc]) => {
      if (sc.internos   !== null) rows.push([dim,'Colaboradores',sc.internos,matLabel(sc.internos)]);
      if (sc.liderancas !== null) rows.push([dim,'Lideranças',sc.liderancas,matLabel(sc.liderancas)]);
      if (sc.fornecedores !== null) rows.push([dim,'Fornecedores',sc.fornecedores,matLabel(sc.fornecedores)]);
      if (sc.distribuidores !== null) rows.push([dim,'Distribuidores',sc.distribuidores,matLabel(sc.distribuidores)]);
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

// ══════════════════════════════════════════════
// CONFIGURAÇÃO
// ══════════════════════════════════════════════
function saveConfig() {
  EXPECTED_RESPONSES.internos = parseInt(document.getElementById('cfg-internos').value) || 30;
  EXPECTED_RESPONSES.liderancas = parseInt(document.getElementById('cfg-liderancas').value) || 8;
  EXPECTED_RESPONSES.fornecedores = parseInt(document.getElementById('cfg-fornecedores').value) || 10;
  EXPECTED_RESPONSES.distribuidores = parseInt(document.getElementById('cfg-distribuidores').value) || 10;
  saveExpected();
  document.getElementById('cfg-total').textContent = 'Total esperado: ' + EXPECTED_TOTAL + ' respondentes';
  document.getElementById('cfg-msg').textContent = '💾 Salvando no Supabase...';
  saveExpectedToSupabase().then(() => {
    document.getElementById('cfg-msg').textContent = '✅ Configuração salva no Supabase!';
    renderOverview();
    setTimeout(() => { const m = document.getElementById('cfg-msg'); if(m) m.textContent=''; }, 3000);
  });
}
window.saveConfig = saveConfig;

function initConfigFields() {
  ['internos','liderancas','fornecedores','distribuidores'].forEach(k => {
    const el = document.getElementById('cfg-'+k);
    if (el) el.value = EXPECTED_RESPONSES[k];
  });
  const totalEl = document.getElementById('cfg-total');
  if (totalEl) totalEl.textContent = 'Total esperado: ' + EXPECTED_TOTAL + ' respondentes';
}
