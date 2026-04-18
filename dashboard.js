/* ── ODARA DASHBOARD v6.3 — Breakdown por área + verbatim agrupado + insights focados ── */
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

  // Cada render é isolado — uma falha não derruba as demais abas
  const safe = (fn, name) => { try { fn(); } catch(e) { console.error('[Odara] Erro em ' + name + ':', e); } };
  safe(renderOverview, 'renderOverview');
  safe(renderDimTable, 'renderDimTable');
  safe(renderHeatmap, 'renderHeatmap');
  safe(() => renderVerbatim('all'), 'renderVerbatim');
  safe(renderStrategicInsights, 'renderStrategicInsights');
  safe(renderActions, 'renderActions');
  safe(renderExecutiveSummary, 'renderExecutiveSummary');
  safe(renderInterpretationTable, 'renderInterpretationTable');
  safe(initConfigFields, 'initConfigFields');
  safe(updateBadge, 'updateBadge');
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

    // Calcular geral
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

    // Verbatim
    const OPEN_IDS = new Set(['I24','I25','I26','L19','L20','L21','F13','F14','F15','D13','D14','D15']);
    const verbatim = (openResp || [])
      .filter(r => r.value && r.value.trim().length > 2 && OPEN_IDS.has(r.question_id))
      .map(r => {
        let type = 'actions';
        if (['I24','L19','F13','D13'].includes(r.question_id)) type = 'strengths';
        else if (['I25','L20','F14','D14'].includes(r.question_id)) type = 'weaknesses';
        const audLabel = {internos:'Colaborador',liderancas:'Liderança',fornecedores:'Fornecedor',distribuidores:'Distribuidor'};
        return { type, aud: audLabel[r.survey_type] || r.survey_type, txt: r.value, qid: r.question_id, survey_type: r.survey_type };
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

  let dimList, dataVals, chartColor, chartBg, score;
  const dimMap = { internos:DIM_NAMES, liderancas:DIM_LID_NAMES, fornecedores:DIM_FORN_NAMES, distribuidores:DIM_DIST_NAMES };

  if (audience === 'geral') {
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

  if (scoreEl) {
    scoreEl.innerHTML = score ? `<span style="color:${audience==='geral'?C.y:(audience==='liderancas'?C.r:audience==='fornecedores'?'#27AE60':audience==='distribuidores'?'#3498DB':C.y)}">${score.toFixed(2)}</span><div style="font-size:9px;font-weight:500;color:var(--g);margin-top:2px;">${matLabel(score)}</div>` : '—';
  }

  if (!dimList.length) { container.innerHTML = emptyState('Sem dados para este público.'); return; }

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

function renderSegmented() {
  const el = document.getElementById('seg-grid');
  if (!DATA || DATA.total === 0) { el.innerHTML = emptyState('Segmentação disponível após as primeiras respostas.'); return; }

  const AUD = [
    { key:'internos',       label:'👷 Colaboradores',    color:'#FFB81D',  dims: DIM_NAMES },
    { key:'liderancas',     label:'🏆 Lideranças',        color:'#EE2737',  dims: DIM_LID_NAMES },
    { key:'fornecedores',   label:'🤝 Fornecedores',      color:'#27AE60',  dims: DIM_FORN_NAMES },
    { key:'distribuidores', label:'🏪 Distribuidores',    color:'#3498DB',  dims: DIM_DIST_NAMES },
  ];

  // Contar respondentes por área dentro de cada público
  const areaByAud = {};
  (DATA.respondents || []).forEach(r => {
    if (!areaByAud[r.survey_type]) areaByAud[r.survey_type] = {};
    const area = r.seg_area || 'Geral';
    areaByAud[r.survey_type][area] = (areaByAud[r.survey_type][area] || 0) + 1;
  });

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

    // Breakdown por área do público
    const areasMap = areaByAud[a.key] || {};
    const areaEntries = Object.entries(areasMap).sort((x,y) => y[1] - x[1]);
    const areasHtml = areaEntries.length ? `
      <div style="margin-top:8px;padding-top:8px;border-top:1px dashed rgba(12,12,12,.08);">
        <div style="font-size:8.5px;font-weight:700;color:var(--g);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Respondentes por área</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${areaEntries.map(([area, count]) => `
            <span style="font-size:9.5px;padding:2px 7px;background:${a.color}1A;border:1px solid ${a.color}33;border-radius:10px;color:var(--p);">
              ${area} <strong style="color:${a.color};">${count}</strong>
            </span>`).join('')}
        </div>
      </div>` : '';

    return `<div class="seg-card">
      <div class="sg-hdr">
        <div><div class="sg-lbl" style="color:${a.color}">${a.label}</div><div class="sg-n">${n} respondentes</div></div>
        <div><div class="sg-sc" style="color:${a.color}">${sc.toFixed(2)}</div><span class="pill ${cls}" style="font-size:7.5px;">${matLabel(sc)}</span></div>
      </div>
      <div class="seg-bars">${bars}</div>
      ${areasHtml}
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
    Ajuste os valores na aba Configuração.
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

  const rows = dimList.map(d => {
    const sc = DATA.dims[d]?.[audience];
    if (sc === null || sc === undefined) return null;
    return { name: d.length > 25 ? d.split(' ')[0] : d, full: d, scores: [sc] };
  }).filter(Boolean);

  if (rows.length) {
    console.info(`[Odara] Heatmap ${audience}: ${rows.length} dimensões via DATA.dims`);

    const respArea = {};
    (DATA.respondents || []).forEach(r => {
      if (r.survey_type === audience) respArea[r.id] = r.seg_area || 'Geral';
    });
    const areas = [...new Set(Object.values(respArea))].filter(Boolean).sort();

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
    { key:'liderancas',     id:'hm-liderancas',      label:'🏆 Lideranças',     color:'#EE2737' },
    { key:'fornecedores',   id:'hm-fornecedores',    label:'🤝 Fornecedores',   color:'#27AE60' },
    { key:'distribuidores', id:'hm-distribuidores',   label:'🏪 Distribuidores', color:'#3498DB' },
  ];

  panels.forEach(p => {
    const el = document.getElementById(p.id);
    if (!el) return;

    const data = buildHeatmapData(p.key);
    if (data) {
      el.innerHTML = `<h4 style="font-size:11px;font-weight:700;margin-bottom:8px;color:${p.color};">${p.label}</h4>` + buildHmTable(data, p.key);
    } else {
      const n = DATA ? (DATA.audCounts[p.key] || 0) : 0;
      el.innerHTML = emptyState(n > 0
        ? `${n} respondente(s) registrado(s), mas sem respostas numéricas. Verifique a coleta.`
        : `Aguardando respostas de ${p.label.replace(/[^\w\sà-ú]/gi,'').trim().toLowerCase()}.`);
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
  // Contar respondentes por área deste público
  const areaCounts = {};
  (DATA.respondents || []).forEach(r => {
    if (r.survey_type === audience) {
      const a = r.seg_area || 'Geral';
      areaCounts[a] = (areaCounts[a] || 0) + 1;
    }
  });

  let html = `<table class="hm-tbl"><thead><tr><th class="hm-th">Dimensão</th>`;
  data.areas.forEach(a => {
    const cnt = areaCounts[a];
    const cntLabel = (a !== 'Score geral' && cnt) ? `<div style="font-size:8.5px;font-weight:500;color:var(--g);margin-top:2px;">${cnt} respondente${cnt>1?'s':''}</div>` : '';
    html += `<th class="hm-th" style="text-align:center;vertical-align:top;">${a}${cntLabel}</th>`;
  });
  html += `</tr></thead><tbody>`;

  data.rows.forEach((row, di) => {
    html += `<tr><td class="hm-dn">${row.name}</td>`;
    row.scores.forEach((sc, ai) => {
      // Célula sem dados — renderizar vazia, não-clicável
      if (sc === null || sc === undefined || isNaN(sc)) {
        html += `<td class="hm-cell hm-empty" style="background:rgba(12,12,12,.03);color:#B0A9A0;cursor:default;"
          title="${row.full} · ${data.areas[ai]}: sem respostas">
          <strong style="font-weight:400;">—</strong>
          <span class="hm-sub" style="opacity:.6;">sem dados</span>
        </td>`;
        return;
      }
      const bg = heatColor(sc);
      const tc = sc < 3.2 ? '#fff' : '#0C0C0C';
      const isSel = heatSel && heatSel.audience===audience && heatSel.di===di && heatSel.ai===ai;
      html += `<td class="hm-cell${isSel?' hm-sel':''}" style="background:${bg};color:${tc};"
        onclick="selectHmCell('${audience}',${di},${ai},'${row.full}','${data.areas[ai]}',${sc})"
        title="${row.full} · ${data.areas[ai]}: ${sc.toFixed(1)}">
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

// ══════════════════════════════════════════════
// DRILL-DOWN — v6.1: filtrado por setor/área
// ══════════════════════════════════════════════
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

  // ── Build respondent→area lookup (mesma lógica do heatmap) ──
  const respArea = {};
  (DATA.respondents || []).forEach(r => {
    if (r.survey_type === audience) respArea[r.id] = r.seg_area || 'Geral';
  });
  const hasAreaFilter = area && area !== 'Score geral' && area !== 'Geral';

  // Buscar perguntas da dimensão
  const qIds = Object.entries(Q_DIM_MAP).filter(([,d]) => d === dim).map(([id]) => id);

  const qScores = qIds.map(qid => {
    // Todas as respostas deste público para esta pergunta
    const allAudVals = (DATA.rawResponses || [])
      .filter(r => r.question_id === qid && r.survey_type === audience)
      .map(r => ({ val: parseFloat(r.value_numeric), rid: r.respondent_id }))
      .filter(r => !isNaN(r.val) && r.val >= 1 && r.val <= 5);

    // Média geral do público (todos os setores)
    const allVals = allAudVals.map(r => r.val);
    const avgGeral = allVals.length ? (allVals.reduce((a,b)=>a+b,0)/allVals.length) : null;

    // Média filtrada pelo setor/área clicado
    let avgArea = avgGeral;
    let countArea = allVals.length;
    if (hasAreaFilter) {
      const areaVals = allAudVals
        .filter(r => (respArea[r.rid] || 'Geral') === area)
        .map(r => r.val);
      avgArea = areaVals.length ? (areaVals.reduce((a,b)=>a+b,0)/areaVals.length) : null;
      countArea = areaVals.length;
    }

    return { qid, avg: avgArea, avgGeral, count: countArea, countGeral: allVals.length };
  }).filter(q => q.avg !== null).sort((a,b) => a.avg - b.avg);

  // Separar perguntas em "gaps" (< score da dimensão) e "demais"
  const gapQs = qScores.filter(q => q.avg < score);
  const allQs = qScores;

  let qListHtml;
  if (allQs.length) {
    qListHtml = '';
    if (gapQs.length) {
      qListHtml += `<div style="font-size:9px;font-weight:700;color:#C0392B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">🔻 Perguntas que puxam o score para baixo</div>`;
      qListHtml += gapQs.map(q => buildQRow(q, true, hasAreaFilter)).join('');
      qListHtml += `<div style="border-top:1px solid rgba(12,12,12,.08);margin:10px 0;"></div>`;
    }
    const restQs = allQs.filter(q => !gapQs.includes(q));
    if (restQs.length) {
      qListHtml += `<div style="font-size:9px;font-weight:700;color:var(--g);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Demais perguntas</div>`;
      qListHtml += restQs.map(q => buildQRow(q, false, hasAreaFilter)).join('');
    }
  } else {
    qListHtml = '<div style="font-size:10px;color:var(--g);padding:8px;">Sem respostas individuais disponíveis para esta combinação de dimensão e área.</div>';
  }

  const areaLabel = hasAreaFilter ? ` · ${area}` : '';

  el.innerHTML = `<div class="dd-card">
    <div class="dd-hdr">
      <div class="dd-bc">📍 ${audLabels[audience] || audience}${areaLabel} · ${dim}</div>
      <div class="dd-sl">
        <span class="dd-big ${cls}">${score.toFixed(1)}</span>
        <span class="pill ${cls}" style="font-size:8.5px;">${matLabel(score)}</span>
      </div>
    </div>
    <div class="dd-body">
      <div>
        <div class="dd-st">📋 Análise por pergunta (${allQs.length})</div>
        ${hasAreaFilter ? `<div style="font-size:9px;color:var(--g);margin-bottom:8px;padding:4px 8px;background:rgba(255,184,29,.06);border-radius:3px;">📌 Filtrando por <strong>${area}</strong> · Média geral do público entre parênteses</div>` : ''}
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

function buildQRow(q, isGap, showGeral) {
  const qsc = scoreClass(q.avg);
  const text = Q_TEXT_MAP[q.qid] || q.qid;
  const bg = isGap ? 'rgba(238,39,55,.04)' : 'transparent';
  const border = isGap ? 'border-left:3px solid #EE2737;' : 'border-left:3px solid transparent;';
  // Mostrar média geral entre parênteses quando filtrando por área
  const geralTag = (showGeral && q.avgGeral !== null && q.avgGeral !== q.avg)
    ? `<span style="font-size:7.5px;color:var(--g);margin-left:3px;" title="Média geral de todos os respondentes deste público">(geral ${q.avgGeral.toFixed(1)})</span>`
    : '';
  return `<div class="dq-row" style="background:${bg};${border}padding-left:8px;margin-bottom:4px;border-radius:0 3px 3px 0;">
    <div class="dq-id" style="font-weight:700;min-width:32px;color:${isGap?'#C0392B':'var(--g)'};">${q.qid}</div>
    <div class="dq-text" style="flex:1;font-size:10px;line-height:1.4;">${text}</div>
    <div style="display:flex;align-items:center;gap:4px;min-width:100px;justify-content:flex-end;">
      <div style="width:40px;height:4px;background:rgba(12,12,12,.08);border-radius:2px;overflow:hidden;">
        <div style="width:${((q.avg-1)/4)*100}%;height:100%;background:${heatColor(q.avg)};border-radius:2px;"></div>
      </div>
      <span class="pill ${qsc.cls}" style="font-size:8px;min-width:30px;text-align:center;">${q.avg.toFixed(1)}</span>
      ${geralTag}
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
// Textos das perguntas abertas (verbatim)
const OPEN_Q_TEXT = {
  'I24':'O que está funcionando bem em qualidade e segurança dos alimentos?',
  'I25':'O que mais precisa melhorar em qualidade e segurança dos alimentos?',
  'I26':'Que sugestão você daria para fortalecer a cultura de qualidade?',
  'L19':'O que está consolidado em cultura de qualidade na sua área?',
  'L20':'Qual a maior fragilidade atual de cultura de qualidade na sua área?',
  'L21':'Que ação estratégica você priorizaria nos próximos 90 dias?',
  'F13':'O que a Odara faz bem como cliente em qualidade?',
  'F14':'O que poderia ser melhorado no relacionamento com a Odara?',
  'F15':'Que sugestão você daria para fortalecer essa parceria?',
  'D13':'O que a Odara faz bem como fornecedora em qualidade?',
  'D14':'O que poderia ser melhorado no fornecimento da Odara?',
  'D15':'Que sugestão você daria para fortalecer a relação?',
};

function filterVb(type, btn) {
  document.querySelectorAll('.vb-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderVerbatim(type);
}
window.filterVb = filterVb;

function renderVerbatim(type) {
  const el  = document.getElementById('verbatim-list');
  const vb  = (DATA && DATA.verbatim) ? DATA.verbatim : [];
  const list = type === 'all' ? vb : vb.filter(v => v.type === type);
  console.info(`[Odara] Verbatim: ${vb.length} total, mostrando ${list.length} (filtro: ${type})`);

  if (!list.length) {
    el.innerHTML = emptyState('Nenhuma resposta aberta registrada ainda. As respostas aparecerão aqui quando os respondentes preencherem as perguntas abertas (I24–I26, L19–L21, F13–F15, D13–D15).');
    return;
  }

  // Agrupar por question_id
  const byQ = {};
  list.forEach(v => {
    const qid = v.qid || 'outros';
    if (!byQ[qid]) byQ[qid] = [];
    byQ[qid].push(v);
  });

  // Ordem estável por tipo/público
  const ORDER = ['I24','I25','I26','L19','L20','L21','F13','F14','F15','D13','D14','D15'];
  const qids = Object.keys(byQ).sort((a,b) => {
    const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  const typeStyle = {
    strengths:   { ico:'💪', lbl:'Ponto Forte',        color:'#27AE60', bg:'rgba(39,174,96,.05)',  border:'#27AE60' },
    weaknesses:  { ico:'⚠️', lbl:'Ponto Fraco',         color:'#E67E22', bg:'rgba(230,126,34,.05)', border:'#E67E22' },
    actions:     { ico:'⚡', lbl:'Sugestão de Ação',    color:'#3498DB', bg:'rgba(52,152,219,.05)', border:'#3498DB' },
  };

  const audColor = { Colaborador:'#FFB81D', Liderança:'#EE2737', Fornecedor:'#27AE60', Distribuidor:'#3498DB' };

  const groupsHtml = qids.map(qid => {
    const items = byQ[qid];
    const t = items[0].type;
    const s = typeStyle[t] || typeStyle.actions;
    const qText = OPEN_Q_TEXT[qid] || 'Pergunta ' + qid;

    const itemsHtml = items.map(v => `
      <div class="vb-card" style="border-left:3px solid ${audColor[v.aud] || '#999'};margin-bottom:6px;">
        <div class="vb-meta" style="justify-content:flex-end;">
          <span style="color:${audColor[v.aud] || '#999'};font-weight:600;">👤 ${v.aud}</span>
        </div>
        <div class="vb-txt">"${v.txt}"</div>
      </div>
    `).join('');

    return `<div style="margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:${s.bg};border-left:4px solid ${s.border};border-radius:3px 3px 0 0;margin-bottom:8px;">
        <span style="font-size:16px;">${s.ico}</span>
        <div style="flex:1;">
          <div style="font-size:8.5px;font-weight:700;color:${s.color};text-transform:uppercase;letter-spacing:.5px;">${s.lbl} · ${qid}</div>
          <div style="font-size:11.5px;font-weight:600;color:var(--p);line-height:1.4;margin-top:1px;">${qText}</div>
        </div>
        <span style="font-size:9.5px;color:var(--g);background:rgba(255,255,255,.7);padding:2px 8px;border-radius:10px;font-weight:600;">${items.length} resposta${items.length>1?'s':''}</span>
      </div>
      <div style="padding-left:8px;">${itemsHtml}</div>
    </div>`;
  }).join('');

  el.innerHTML = `<div style="font-size:9.5px;color:var(--g);margin-bottom:14px;">${list.length} resposta(s) aberta(s) em ${qids.length} pergunta(s)</div>${groupsHtml}`;
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

  const gaps = [];
  DIM_NAMES.forEach(dim => {
    const sc = DATA.dims[dim];
    if (sc && sc.internos !== null && sc.liderancas !== null) {
      const diff = Math.abs(sc.liderancas - sc.internos);
      if (diff > 0.5) gaps.push({ dim, internos: sc.internos, liderancas: sc.liderancas, diff });
    }
  });

  const totalDims = Object.entries(DATA.dims).filter(([,sc]) => 
    ['internos','liderancas','fornecedores','distribuidores'].some(k => sc[k] !== null)
  ).length;

  // ── PONTOS DE ATENÇÃO FOCADOS — por pergunta × setor ──
  const focusedPoints = detectFocusedAttention();

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
    ${focusedPoints.length ? `<div class="is-card full">
      <div class="is-title">🎯 Pontos de Atenção Focados <span class="is-tag priority">AÇÃO DIRIGIDA</span></div>
      <div style="font-size:10px;color:var(--g);margin-bottom:12px;line-height:1.5;">
        Perguntas com média &lt; 3.5 em um setor específico <strong>e</strong> pelo menos 2 notas baixas (≤ 2). Ação recomendada focada no público/área exato, não em toda a dimensão.
      </div>
      ${focusedPoints.map(fp => buildFocusedCard(fp)).join('')}
    </div>` : ''}
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
// PONTOS DE ATENÇÃO FOCADOS — detecção por pergunta × setor
// ══════════════════════════════════════════════
// Mapa pergunta → sugestão de ação focada. Quando a pergunta puxa score num setor
// específico, a recomendação é dirigida ao público exato, não à dimensão inteira.
const Q_FOCUSED_ACTION = {
  // Internos — liderança
  'I01':{ icon:'🎯', theme:'Prioridade de qualidade', action:'Reforçar nas reuniões de turno o princípio "qualidade não se negocia". Revisar casos recentes onde prazo/custo prevaleceu.' },
  'I02':{ icon:'👤', theme:'Exemplo da liderança', action:'Coaching pontual da liderança da área. Observação comportamental cruzada (liderança auditando liderança).' },
  'I03':{ icon:'⚖️', theme:'Decisão em conflito', action:'Criar protocolo formal de escalada para conflitos prazo×qualidade. Tornar decisão visível ao time.' },
  // Internos — comunicação
  'I04':{ icon:'📋', theme:'Clareza de regras', action:'Revisão dos quadros operacionais. Simplificar procedimentos críticos em linguagem direta. Aplicar teste de compreensão.' },
  'I05':{ icon:'📢', theme:'Aviso de mudanças', action:'Implementar "minuto de qualidade" antes de cada mudança de setup/produto. Checklist de comunicação da mudança.' },
  'I06':{ icon:'🔗', theme:'Rede de referência', action:'Publicar mapa visual de quem procurar por tipo de dúvida (alergênico, processo, higiene, etc.).' },
  // Internos — competência
  'I07':{ icon:'🎓', theme:'Eficácia do treinamento', action:'Auditar efetividade dos treinamentos da área. Refazer com método prático (hands-on, simulação, demonstração).' },
  'I08':{ icon:'🔰', theme:'Integração de novos', action:'Buddy system na área com profissional sênior. Checklist de liberação antes de atividade crítica.' },
  'I09':{ icon:'⚠️', theme:'Alergênicos', action:'Módulo prático de alergênicos focado na área — 2h com demonstração de contaminação cruzada. Certificação interna obrigatória.' },
  // Internos — disciplina
  'I10':{ icon:'⚙️', theme:'Viabilidade do procedimento', action:'Revisar o procedimento com quem executa. Se inviável, redesenhar. Se viável, remover obstáculos (material, tempo, layout).' },
  'I11a':{ icon:'🧼', theme:'BPF na rotina', action:'Observação comportamental diária na área (15min/turno). Feedback imediato sem punição. Reforço positivo.' },
  'I11b':{ icon:'📝', theme:'Registros em tempo real', action:'Revisar ergonomia e timing dos registros. Digitalizar onde possível. Tornar registro parte do fluxo, não extra.' },
  'I12':{ icon:'🚨', theme:'Reporte precoce', action:'Criar canal simples de reporte (QR code / app). Celebrar quem reporta. Resposta visível da liderança em 48h.' },
  'I13':{ icon:'❓', theme:'Entendimento do "porquê"', action:'DDS semanal na área explicando o impacto real de cada controle (caso de contaminação, recall, etc.).' },
  // Internos — higiene
  'I14':{ icon:'🧽', theme:'Higiene pessoal', action:'Peer observation na área (colega observa colega). Cultura justa — sem denúncia, com orientação.' },
  'I15':{ icon:'🤒', theme:'Reporte de sintomas', action:'Protocolo anti-represália explícito. Cobertura garantida para afastamento. Comunicar caso a caso como "vitória de cultura".' },
  // Internos — aprendizagem
  'I16':{ icon:'🗣️', theme:'Voz sem medo', action:'Sessão de cultura justa com liderança da área. Protocolo de como liderança responde a reporte.' },
  'I17':{ icon:'🔍', theme:'Investigação real', action:'Aplicar método 5 Porquês nos próximos desvios da área. Publicar causa raiz e ação tomada.' },
  'I18':{ icon:'📚', theme:'Aprendizado compartilhado', action:'Criar mural "O que aprendemos" na área. Atualizar mensalmente com casos reais.' },
  'I19':{ icon:'✅', theme:'Eficácia das ações', action:'Auditoria de aderência após 30/60/90 dias das ações corretivas. Se não funcionou, reabrir investigação.' },
  // Internos — cultura
  'I20':{ icon:'🤝', theme:'Suporte mútuo', action:'Reconhecer publicamente momentos de ajuda entre colegas. Criar indicador informal de "colaboração" no time.' },
  'I21':{ icon:'💯', theme:'Responsabilidade pessoal', action:'Atribuir ownership claro por zona/etapa. Cada pessoa responsável por seu output, com autoridade para parar.' },
  'I22':{ icon:'🏆', theme:'Orgulho do padrão', action:'Comunicar resultados positivos (auditorias, certificações, feedbacks de cliente) à área de forma visível.' },
  'I23':{ icon:'📣', theme:'Recomendação', action:'Engajar advocacia interna. Perguntar a quem deu nota alta: "o que você contaria para um novo colega?"' },
  // Lideranças
  'L01':{ icon:'🎯', theme:'Prioridade estratégica', action:'Revisar pauta das reuniões de liderança — qualidade deve estar em todas, não apenas em crises.' },
  'L02':{ icon:'⚖️', theme:'Decisão institucional', action:'Documentar 3 decisões recentes de prazo×qualidade e compartilhar no fórum de liderança.' },
  'L03':{ icon:'💰', theme:'Recursos', action:'Mapear gap de recursos por liderança. Priorizar investimento para quem sinalizou restrição crítica.' },
  'L04':{ icon:'👔', theme:'Exemplo da alta direção', action:'Alta direção presente na linha semanalmente. Ações visíveis, não apenas comunicados.' },
  'L05':{ icon:'📊', theme:'Metas equilibradas', action:'Revisar sistema de metas — incluir indicadores de qualidade com mesmo peso que produtividade.' },
  'L06':{ icon:'📉', theme:'Acompanhamento de indicadores', action:'Dashboard diário/semanal de indicadores de qualidade por área, revisado pela liderança.' },
  'L07':{ icon:'🌟', theme:'Reconhecimento', action:'Programa formal de reconhecimento de comportamentos corretos, não apenas de resultados.' },
  'L08':{ icon:'🔬', theme:'Causa raiz', action:'Treinamento de liderança em métodos de investigação (Ishikawa, 5 Porquês, análise sistêmica).' },
  'L09':{ icon:'🚫', theme:'Inegociável claro', action:'Publicar lista de "inegociáveis" de qualidade. Cada liderança valida com sua equipe.' },
  'L10':{ icon:'🧼', theme:'Exemplo em BPF', action:'Liderança da área deve usar EPI e seguir BPF visivelmente, sem exceções hierárquicas.' },
  'L11':{ icon:'🛡️', theme:'Cultura de reporte', action:'Política formal anti-retaliação. Casos recentes discutidos em fórum de liderança.' },
  'L12':{ icon:'💡', theme:'Propósito dos controles', action:'Liderança treina equipe no "porquê" de cada controle com casos reais da indústria.' },
  'L13':{ icon:'🎓', theme:'Competência técnica', action:'Mapa de competências por função. Plano individual de desenvolvimento para gaps críticos.' },
  'L14':{ icon:'📚', theme:'Suficiência de treinamento', action:'Revisar matriz de treinamento. Pode haver necessidade de módulos adicionais ou reciclagem.' },
  'L15':{ icon:'⚖️', theme:'Tratamento de desvios', action:'Protocolo escrito de como liderança aborda desvio comportamental — cultura justa, não punição reflexa.' },
  'L16':{ icon:'📋', theme:'SGQ útil', action:'Revisão do SGQ com liderança — simplificar o que é burocracia, reforçar o que é controle real.' },
  'L17':{ icon:'🔁', theme:'Ações corretivas', action:'Auditar ciclo de ações corretivas. Se não fecham ou não resolvem, redesenhar o sistema.' },
  'L18':{ icon:'🗣️', theme:'Discussão com equipe', action:'Pauta fixa em reunião de equipe — últimos desvios, auditorias, aprendizados.' },
  // Fornecedores / Distribuidores
  'F01':{ icon:'📄', theme:'Especificações', action:'Revisar clareza das specs enviadas a este fornecedor. Sessão técnica conjunta se necessário.' },
  'F02':{ icon:'🎯', theme:'Alinhamento de requisitos', action:'Reunião de alinhamento específica com este fornecedor sobre requisitos de qualidade críticos.' },
  'F03':{ icon:'📡', theme:'Comunicação', action:'Definir canal direto e SLA de resposta para questões de qualidade com este fornecedor.' },
  'F04':{ icon:'🔄', theme:'Gestão de mudanças', action:'Protocolo formal de comunicação de mudanças com antecedência mínima.' },
  'F05':{ icon:'📍', theme:'Rastreabilidade', action:'Revisar requisitos de rastreabilidade — garantir que são proporcionais e claros para este fornecedor.' },
  'F06':{ icon:'🏷️', theme:'Capacidade de rastreio', action:'Diagnóstico técnico da rastreabilidade deste fornecedor. Plano de apoio se necessário.' },
  'F07':{ icon:'⚠️', theme:'Tratamento de NC', action:'Fluxo documentado de tratamento de não conformidades entre as partes.' },
  'F08':{ icon:'⏱️', theme:'Prazos realistas', action:'Rever prazos acordados — verificar se permitem execução com qualidade.' },
  'F09':{ icon:'📊', theme:'Feedback de análises', action:'Reportar resultados de análises e reclamações sistematicamente a este fornecedor.' },
  'F10':{ icon:'🤝', theme:'Gestão do relacionamento', action:'Revisar cadência e qualidade das interações. Investir em relacionamento estratégico.' },
  'F11':{ icon:'📈', theme:'Melhoria contínua', action:'Pauta de melhoria conjunta. Indicadores compartilhados de evolução.' },
  'F12':{ icon:'🤲', theme:'Confiança', action:'Reforçar consistência de processos. Reconhecer performance quando consolidada.' },
  'D01':{ icon:'⚖️', theme:'Consistência', action:'Monitoramento de variabilidade lote-a-lote. Comunicar melhorias ao distribuidor.' },
  'D02':{ icon:'📦', theme:'Integridade de embalagem', action:'Revisar embalagem secundária e condições de transporte para este destino.' },
  'D03':{ icon:'📑', theme:'Informações do produto', action:'Pacote de informações técnicas completo e acessível ao distribuidor.' },
  'D04':{ icon:'🛡️', theme:'Segurança percebida', action:'Comunicar controles de qualidade de forma transparente ao distribuidor.' },
  'D05':{ icon:'🚚', theme:'Logística', action:'Revisar cadeia de frio/transporte para este distribuidor. Avaliar pontos críticos.' },
  'D06':{ icon:'📋', theme:'Documentação', action:'Simplificar e digitalizar documentação fornecida ao distribuidor.' },
  'D07':{ icon:'🔔', theme:'Tratamento de ocorrências', action:'SLA definido para resposta a ocorrências. Tracking visível pelo distribuidor.' },
  'D08':{ icon:'💬', theme:'Comunicação', action:'Canal direto e ágil com este distribuidor para questões de qualidade.' },
  'D09':{ icon:'🔍', theme:'Rastreabilidade', action:'Garantir rastreabilidade completa lote-a-lote demonstrável ao distribuidor.' },
  'D10':{ icon:'🤝', theme:'Confiança', action:'Construir histórico de performance. Comunicar melhorias e investimentos.' },
  'D11':{ icon:'📈', theme:'Melhoria contínua', action:'Compartilhar roadmap de melhorias. Co-criar soluções com este distribuidor.' },
  'D12':{ icon:'📣', theme:'NPS de qualidade', action:'Entender detratores. Plano de reversão para este distribuidor.' },
};

function detectFocusedAttention() {
  if (!DATA || !DATA.rawResponses || !DATA.respondents) return [];

  // Lookup respondent_id → {area, survey_type}
  const respMeta = {};
  DATA.respondents.forEach(r => {
    respMeta[r.id] = { area: r.seg_area || 'Geral', survey_type: r.survey_type };
  });

  // Agregação: {qid + audience + area} → {vals:[], lowCount:int}
  const agg = {};
  DATA.rawResponses.forEach(r => {
    const val = parseFloat(r.value_numeric);
    if (isNaN(val) || val < 1 || val > 5) return;
    const meta = respMeta[r.respondent_id];
    if (!meta) return;
    const key = `${r.question_id}|${meta.survey_type}|${meta.area}`;
    if (!agg[key]) agg[key] = { qid: r.question_id, audience: meta.survey_type, area: meta.area, vals: [], lowCount: 0 };
    agg[key].vals.push(val);
    if (val <= 2) agg[key].lowCount++;
  });

  // Filtrar: média < 3.5 E pelo menos 2 notas ≤ 2
  const audLabels = { internos:'Colaboradores', liderancas:'Lideranças', fornecedores:'Fornecedores', distribuidores:'Distribuidores' };
  const points = [];
  Object.values(agg).forEach(item => {
    if (item.vals.length < 3) return; // amostra muito pequena para conclusão
    const avg = item.vals.reduce((a,b)=>a+b,0) / item.vals.length;
    if (avg >= 3.5) return; // média acima do limiar
    if (item.lowCount < 2) return; // poucas notas ruins individuais
    points.push({
      qid: item.qid,
      audience: item.audience,
      audienceLabel: audLabels[item.audience] || item.audience,
      area: item.area,
      avg,
      count: item.vals.length,
      lowCount: item.lowCount,
      dim: Q_DIM_MAP[item.qid] || '—',
      qText: Q_TEXT_MAP[item.qid] || item.qid,
      action: Q_FOCUSED_ACTION[item.qid] || { icon:'⚡', theme:'Ação focada', action:'Diagnóstico presencial e plano específico para esta combinação.' },
    });
  });

  // Ordenar por severidade: menor média primeiro, depois maior lowCount
  points.sort((a,b) => {
    if (a.avg !== b.avg) return a.avg - b.avg;
    return b.lowCount - a.lowCount;
  });

  return points.slice(0, 12); // top 12 pontos focados
}

function buildFocusedCard(fp) {
  const { cls } = scoreClass(fp.avg);
  const audColorMap = { internos:'#FFB81D', liderancas:'#EE2737', fornecedores:'#27AE60', distribuidores:'#3498DB' };
  const audColor = audColorMap[fp.audience] || '#999';
  const lowPct = Math.round((fp.lowCount / fp.count) * 100);

  return `<div style="border:1px solid rgba(238,39,55,.15);border-left:4px solid ${audColor};border-radius:3px;padding:12px 14px;margin-bottom:10px;background:rgba(255,255,255,.5);">
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
      <span style="font-size:20px;">${fp.action.icon}</span>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:2px;">
          <span style="font-size:8.5px;font-weight:700;color:${audColor};background:${audColor}1A;padding:2px 7px;border-radius:10px;text-transform:uppercase;letter-spacing:.4px;">${fp.audienceLabel}</span>
          <span style="font-size:8.5px;font-weight:700;color:var(--p);background:rgba(12,12,12,.06);padding:2px 7px;border-radius:10px;">${fp.area}</span>
          <span style="font-size:8.5px;color:var(--g);">${fp.qid} · ${fp.dim}</span>
        </div>
        <div style="font-size:11.5px;font-weight:700;color:var(--p);line-height:1.35;">${fp.action.theme}</div>
        <div style="font-size:10.5px;color:var(--g);font-style:italic;margin-top:2px;line-height:1.4;">"${fp.qText}"</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <span class="pill ${cls}" style="font-size:9px;">${fp.avg.toFixed(1)}</span>
      </div>
    </div>
    <div style="font-size:10.5px;color:var(--p);line-height:1.5;padding:8px 10px;background:rgba(255,184,29,.06);border-radius:3px;margin-bottom:8px;">
      <strong>Ação focada:</strong> ${fp.action.action}
    </div>
    <div style="display:flex;align-items:center;gap:10px;font-size:9.5px;color:var(--g);">
      <span>📊 <strong style="color:#C0392B;">${fp.lowCount} de ${fp.count}</strong> responderam ≤ 2 (${lowPct}%)</span>
      <span style="flex:1;"></span>
      <button class="da-add" style="font-size:9px;padding:4px 10px;" onclick="addFocusedToPlan('${fp.qid}','${fp.audience}','${fp.area.replace(/'/g,"\\'")}','${fp.action.theme.replace(/'/g,"\\'")}','${fp.dim.replace(/'/g,"\\'")}')">+ Adicionar ao plano</button>
    </div>
  </div>`;
}

function addFocusedToPlan(qid, audience, area, theme, dim) {
  const audLabels = { internos:'Colaboradores', liderancas:'Lideranças', fornecedores:'Fornecedores', distribuidores:'Distribuidores' };
  const audLabel = audLabels[audience] || audience;
  const a = {
    id: 'a' + Date.now(),
    dim,
    pri: 'Alta',
    title: `[${audLabel}/${area}] ${theme}`.substring(0, 80),
    desc: `Ponto focado detectado · Pergunta ${qid} · Público: ${audLabel} · Área: ${area} · Ação dirigida, não genérica à dimensão.`,
    owner: 'A definir',
    deadline: '',
    expected: '',
    status: 'open',
    pct: 0,
  };
  actions.unshift(a);
  sbSaveAction(a);
  updateBadge();
  alert('✅ Ação focada adicionada ao Plano de Ação!\nAcesse a aba "Plano de Ação" para definir responsável e prazo.');
}
window.addFocusedToPlan = addFocusedToPlan;

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

// ══════════════════════════════════════════════════════════════
// RESUMO EXECUTIVO — aesthetic editorial + export PPTX/PDF
// ══════════════════════════════════════════════════════════════

// Paleta Odara (usada nos exports)
const ODARA_COLORS = {
  yellow:'FFB81D', red:'EE2737', cream:'FFF8EA', black:'0C0C0C',
  gray:'565555', lightGray:'ECEADC', white:'FFFFFF',
  green:'27AE60', orange:'E67E22', darkYellow:'9A7010',
};

function buildExecutiveData() {
  if (!DATA || DATA.total === 0) return null;

  const AUD_LABELS = { internos:'Colaboradores', liderancas:'Lideranças', fornecedores:'Fornecedores', distribuidores:'Distribuidores' };

  // Dimensões críticas (min score < 3.5 em algum público)
  const critDims = Object.entries(DATA.dims)
    .map(([dim, sc]) => {
      const scores = ['internos','liderancas','fornecedores','distribuidores']
        .map(k => ({ aud: k, label: AUD_LABELS[k], score: sc[k] }))
        .filter(x => x.score !== null && x.score !== undefined);
      if (!scores.length) return null;
      const worst = scores.reduce((a,b) => a.score < b.score ? a : b);
      return { dim, worstScore: worst.score, worstAud: worst.label, allScores: scores };
    })
    .filter(x => x && x.worstScore < 3.5)
    .sort((a,b) => a.worstScore - b.worstScore);

  // Pontos de atenção focados (reaproveita lógica já implementada)
  const focused = (typeof detectFocusedAttention === 'function') ? detectFocusedAttention() : [];

  // Pontos fortes (score ≥ 4.0 em algum público)
  const strongDims = [];
  Object.entries(DATA.dims).forEach(([dim, sc]) => {
    ['internos','liderancas','fornecedores','distribuidores'].forEach(k => {
      if (sc[k] !== null && sc[k] !== undefined && sc[k] >= 4.0) {
        strongDims.push({ dim, score: sc[k], pub: AUD_LABELS[k] });
      }
    });
  });
  strongDims.sort((a,b) => b.score - a.score);

  // Gaps de percepção
  const gaps = [];
  DIM_NAMES.forEach(dim => {
    const sc = DATA.dims[dim];
    if (sc && sc.internos !== null && sc.liderancas !== null) {
      const diff = Math.abs(sc.liderancas - sc.internos);
      if (diff > 0.5) gaps.push({ dim, internos: sc.internos, liderancas: sc.liderancas, diff });
    }
  });
  gaps.sort((a,b) => b.diff - a.diff);

  // Taxa de conclusão
  const completionPct = DATA.total ? Math.min(100, Math.round((DATA.total / EXPECTED_TOTAL) * 100)) : 0;

  // Respondentes por público e por área
  const audBreakdown = [];
  ['internos','liderancas','fornecedores','distribuidores'].forEach(k => {
    const n = DATA.audCounts[k] || 0;
    const expected = EXPECTED_RESPONSES[k] || 0;
    const pct = expected ? Math.min(100, Math.round((n / expected) * 100)) : 0;
    audBreakdown.push({ key: k, label: AUD_LABELS[k], count: n, expected, pct });
  });
  const areaBreakdown = {};
  (DATA.respondents || []).forEach(r => {
    const audLabel = AUD_LABELS[r.survey_type] || r.survey_type;
    if (!areaBreakdown[audLabel]) areaBreakdown[audLabel] = {};
    const a = r.seg_area || 'Geral';
    areaBreakdown[audLabel][a] = (areaBreakdown[audLabel][a] || 0) + 1;
  });

  // Plano de ação
  const planStats = {
    total: actions.length,
    open: actions.filter(a => a.status === 'open').length,
    progress: actions.filter(a => a.status === 'progress').length,
    done: actions.filter(a => a.status === 'done').length,
    high: actions.filter(a => a.pri === 'Alta' || a.pri === 'Crítica').length,
  };

  // Discussão (sumário executivo em prosa)
  const discussion = buildExecutiveDiscussion({
    total: DATA.total, overallScore: DATA.overallScore, critDims, focused, strongDims, gaps, completionPct
  });

  return {
    total: DATA.total,
    overallScore: DATA.overallScore,
    matLabel: DATA.overallScore ? matLabel(DATA.overallScore) : '—',
    completionPct,
    critDimsCount: critDims.length,
    critDims,
    focused: focused.slice(0, 5),
    strongDims: strongDims.slice(0, 5),
    gaps: gaps.slice(0, 4),
    audBreakdown,
    areaBreakdown,
    planStats,
    actions: actions.slice(0, 8), // top 8 para o resumo
    discussion,
    generatedAt: new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' }),
  };
}

function buildExecutiveDiscussion(d) {
  const parts = [];
  // Participação
  if (d.completionPct >= 80) parts.push(`A pesquisa alcançou <strong>${d.completionPct}% da meta de participação</strong> com ${d.total} respondentes, base robusta para análise.`);
  else if (d.completionPct >= 50) parts.push(`A pesquisa alcançou <strong>${d.completionPct}% da meta de participação</strong> com ${d.total} respondentes — cobertura parcial que permite análise exploratória com ressalvas.`);
  else parts.push(`A pesquisa capturou ${d.total} respondentes (${d.completionPct}% da meta). A amostra ainda é limitada; leituras devem ser interpretadas como sinais iniciais.`);

  // Score geral
  if (d.overallScore !== null) {
    const s = d.overallScore.toFixed(1);
    if (d.overallScore >= 4.5) parts.push(`O score geral ficou em <strong>${s}</strong>, classificação <strong>Consolidada</strong> — cultura robusta.`);
    else if (d.overallScore >= 3.5) parts.push(`O score geral ficou em <strong>${s}</strong>, classificação <strong>Em Desenvolvimento</strong> — cultura positiva com lacunas a fortalecer.`);
    else if (d.overallScore >= 2.5) parts.push(`O score geral ficou em <strong>${s}</strong>, classificação <strong>Frágil</strong> — cultura presente mas inconsistente.`);
    else parts.push(`O score geral ficou em <strong>${s}</strong>, classificação <strong>Em Risco</strong> — requer ação imediata.`);
  }

  // Principal ponto de atenção
  if (d.critDims.length) {
    const worst = d.critDims[0];
    parts.push(`A dimensão mais crítica é <strong>${worst.dim}</strong>, com score mínimo ${worst.worstScore.toFixed(1)} em ${worst.worstAud}.`);
  }
  if (d.focused.length) {
    parts.push(`Foram identificados <strong>${d.focused.length} pontos de atenção focados</strong> — perguntas específicas com baixa performance em setores determinados, permitindo ação dirigida em vez de intervenção generalizada.`);
  }

  // Pontos fortes
  if (d.strongDims.length) {
    parts.push(`No lado positivo, <strong>${d.strongDims.length} dimensões</strong> apresentaram scores ≥ 4.0, representando práticas a replicar.`);
  }

  return parts.join(' ');
}

function renderExecutiveSummary() {
  const el = document.getElementById('exec-content');
  if (!el) return;

  const E = buildExecutiveData();
  if (!E) {
    el.innerHTML = `<div class="exec-empty">
      <div style="font-size:28px;margin-bottom:12px;">📑</div>
      <div style="font-size:14px;font-weight:700;color:var(--p);margin-bottom:6px;">Resumo Executivo aguardando dados</div>
      <div>O resumo é gerado automaticamente após o início da coleta de respostas. Compila os resultados, insights e plano de ação num formato pronto para apresentação à diretoria.</div>
    </div>`;
    return;
  }

  const scoreClass_ = scoreClass(E.overallScore || 0);

  // Hero + export buttons
  let html = `
    <div class="exec-hero">
      <div class="exec-tag">Relatório para a Diretoria · ${E.generatedAt}</div>
      <h1>Pesquisa de Cultura de<br>Segurança do Produto <em>&amp;</em> Qualidade</h1>
      <div class="exec-lede">
        Consolidação dos resultados, dos principais achados e do plano de ação para acompanhamento pela liderança executiva.
        Metodologia alinhada ao GFSI Guidance Document on Food Safety Culture e FSSC 22000 v6.
      </div>
      <div class="exec-hero-actions">
        <button class="btn-export primary" onclick="exportExecutivePPTX()" id="btn-exp-pptx">📊 Exportar PPTX</button>
        <button class="btn-export secondary" onclick="exportExecutivePDF()" id="btn-exp-pdf">📄 Exportar PDF</button>
      </div>
    </div>
  `;

  // Editorial stats
  html += `
    <div class="exec-stats">
      <div class="exec-stat">
        <div class="exec-stat-lbl">Participação</div>
        <div class="exec-stat-val accent">${E.total}</div>
        <div class="exec-stat-sub">respondentes · ${E.completionPct}% da meta</div>
      </div>
      <div class="exec-stat">
        <div class="exec-stat-lbl">Score Geral</div>
        <div class="exec-stat-val">${E.overallScore ? E.overallScore.toFixed(2) : '—'}</div>
        <div class="exec-stat-sub">${E.matLabel}</div>
      </div>
      <div class="exec-stat">
        <div class="exec-stat-lbl">Dimensões Críticas</div>
        <div class="exec-stat-val ${E.critDimsCount?'alert':'good'}">${E.critDimsCount}</div>
        <div class="exec-stat-sub">abaixo do limiar 3.5</div>
      </div>
      <div class="exec-stat">
        <div class="exec-stat-lbl">Ações no Plano</div>
        <div class="exec-stat-val accent">${E.planStats.total}</div>
        <div class="exec-stat-sub">${E.planStats.done} concluídas · ${E.planStats.progress} em curso</div>
      </div>
    </div>
  `;

  // Section 1 — Discussão
  html += `
    <div class="exec-section">
      <div class="exec-section-head">
        <div class="exec-section-num">01</div>
        <div class="exec-section-h">Sumário Executivo</div>
        <div class="exec-section-kicker">Panorama geral</div>
      </div>
      <div class="exec-callout">
        <div class="exec-callout-lbl">Discussão dos resultados</div>
        <div class="exec-callout-txt">${E.discussion}</div>
      </div>
    </div>
  `;

  // Section 2 — Participação
  if (E.audBreakdown.length) {
    const audHtml = E.audBreakdown.map(a => `
      <div class="exec-item">
        <div class="exec-item-top">
          <div class="exec-item-t">${a.label}</div>
          <span style="font-family:var(--fc);font-size:17px;font-weight:700;color:var(--p);">${a.count}<span style="color:var(--g);font-size:12px;font-weight:400;">/${a.expected}</span></span>
        </div>
        <div class="exec-item-d">${a.pct}% da meta alcançada</div>
      </div>
    `).join('');
    html += `
      <div class="exec-section">
        <div class="exec-section-head">
          <div class="exec-section-num">02</div>
          <div class="exec-section-h">Participação</div>
          <div class="exec-section-kicker">Quem respondeu</div>
        </div>
        <div class="exec-grid cols-2">${audHtml}</div>
      </div>
    `;
  }

  // Section 3 — Dimensões críticas
  if (E.critDims.length) {
    const critHtml = E.critDims.slice(0, 6).map(c => {
      const sc = scoreClass(c.worstScore);
      return `<div class="exec-item crit">
        <div class="exec-item-top">
          <div class="exec-item-t">${c.dim}</div>
          <span class="pill ${sc.cls}">${c.worstScore.toFixed(1)}</span>
        </div>
        <div class="exec-item-d">${DIM_RECS[c.dim] || 'Dimensão requer intervenção estruturada.'}</div>
        <div class="exec-item-meta"><span>Pior público: ${c.worstAud}</span></div>
      </div>`;
    }).join('');
    html += `
      <div class="exec-section">
        <div class="exec-section-head">
          <div class="exec-section-num">03</div>
          <div class="exec-section-h">Dimensões Críticas</div>
          <div class="exec-section-kicker">Onde atuar primeiro</div>
        </div>
        <div class="exec-grid cols-2">${critHtml}</div>
      </div>
    `;
  }

  // Section 4 — Pontos focados
  if (E.focused.length) {
    const focHtml = E.focused.map(f => `<div class="exec-item warn">
      <div class="exec-item-top">
        <div class="exec-item-t">${f.action.icon} ${f.action.theme}</div>
        <span class="pill ${scoreClass(f.avg).cls}">${f.avg.toFixed(1)}</span>
      </div>
      <div class="exec-item-d">${f.action.action}</div>
      <div class="exec-item-meta">
        <span>👥 ${f.audienceLabel}</span>
        <span>📍 ${f.area}</span>
        <span>${f.qid} · ${f.dim}</span>
        <span>${f.lowCount}/${f.count} notas ≤ 2</span>
      </div>
    </div>`).join('');
    html += `
      <div class="exec-section">
        <div class="exec-section-head">
          <div class="exec-section-num">04</div>
          <div class="exec-section-h">Pontos de Atenção Focados</div>
          <div class="exec-section-kicker">Ação dirigida por pergunta × setor</div>
        </div>
        <div class="exec-grid">${focHtml}</div>
      </div>
    `;
  }

  // Section 5 — Pontos fortes
  if (E.strongDims.length) {
    const strongHtml = E.strongDims.map(s => `<div class="exec-item good">
      <div class="exec-item-top">
        <div class="exec-item-t">${s.dim}</div>
        <span class="pill ok">${s.score.toFixed(1)}</span>
      </div>
      <div class="exec-item-meta"><span>Público: ${s.pub}</span></div>
    </div>`).join('');
    html += `
      <div class="exec-section">
        <div class="exec-section-head">
          <div class="exec-section-num">05</div>
          <div class="exec-section-h">Pontos Fortes</div>
          <div class="exec-section-kicker">O que replicar</div>
        </div>
        <div class="exec-grid cols-2">${strongHtml}</div>
      </div>
    `;
  }

  // Section 6 — Plano de ação
  const actHtml = E.actions.length
    ? E.actions.map(a => {
        const statusLbl = a.status === 'done' ? '✅ Concluída' : a.status === 'progress' ? '🔄 Em andamento' : '⭕ Aberta';
        return `<div class="exec-item ${a.pri==='Alta'||a.pri==='Crítica'?'crit':''}">
          <div class="exec-item-top">
            <div class="exec-item-t">${a.title}</div>
            <span class="pill ${a.pri==='Alta'||a.pri==='Crítica'?'critical':'dev'}">${a.pri}</span>
          </div>
          <div class="exec-item-d">${a.desc || 'Sem descrição detalhada.'}</div>
          <div class="exec-item-meta">
            <span>${statusLbl}</span>
            <span>👤 ${a.owner || 'A definir'}</span>
            <span>📅 ${fmtDate(a.deadline)}</span>
            <span>📊 ${a.dim}</span>
          </div>
        </div>`;
      }).join('')
    : `<div class="exec-empty" style="grid-column:1/-1;">Nenhuma ação registrada ainda. Use a aba "Plano de Ação" para adicionar ações de melhoria baseadas nos achados.</div>`;
  html += `
    <div class="exec-section">
      <div class="exec-section-head">
        <div class="exec-section-num">06</div>
        <div class="exec-section-h">Plano de Ação</div>
        <div class="exec-section-kicker">${E.planStats.total} ação(ões) · ${E.planStats.done} concluída(s) · ${E.planStats.progress} em curso</div>
      </div>
      <div class="exec-grid">${actHtml}</div>
    </div>
  `;

  // Section 7 — Próximos passos
  html += `
    <div class="exec-section">
      <div class="exec-section-head">
        <div class="exec-section-num">07</div>
        <div class="exec-section-h">Próximos Passos</div>
        <div class="exec-section-kicker">Roadmap</div>
      </div>
      <div class="exec-timeline">
        <div class="exec-tl-step done">
          <div class="exec-tl-phase">Concluído</div>
          <div class="exec-tl-date">Coleta</div>
          <div class="exec-tl-desc">${E.total} respondentes participaram da pesquisa.</div>
        </div>
        <div class="exec-tl-step now">
          <div class="exec-tl-phase">Agora</div>
          <div class="exec-tl-date">Devolutiva</div>
          <div class="exec-tl-desc">Apresentar resultados por área em até 30 dias. Envolver liderança direta.</div>
        </div>
        <div class="exec-tl-step next">
          <div class="exec-tl-phase">Próximo</div>
          <div class="exec-tl-date">Execução</div>
          <div class="exec-tl-desc">Implementar plano de ação com acompanhamento trimestral de indicadores.</div>
        </div>
        <div class="exec-tl-step next">
          <div class="exec-tl-phase">Horizonte</div>
          <div class="exec-tl-date">Nova pesquisa</div>
          <div class="exec-tl-desc">Reaplicar para medir evolução e ajustar plano de ação.</div>
        </div>
      </div>
    </div>
  `;

  html += `<div class="exec-footnote">Este resumo executivo compila automaticamente os resultados, insights estratégicos e plano de ação registrados no painel. Os dados refletem as respostas disponíveis no banco neste momento — ao atualizar as ações ou receber novas respostas, reabra esta aba para ver a versão mais recente.</div>`;

  el.innerHTML = html;
}
window.renderExecutiveSummary = renderExecutiveSummary;

// ══════════════════════════════════════════════════════════════
// EXPORT PPTX — 10 slides com cores Odara
// ══════════════════════════════════════════════════════════════
function showExportStatus(msg, type) {
  const el = document.getElementById('exec-export-status');
  if (!el) return;
  el.className = type || '';
  el.textContent = msg;
  setTimeout(() => el.classList.add('show'), 10);
  if (type === 'success' || type === 'error') {
    setTimeout(() => el.classList.remove('show'), 4000);
  }
}
function hideExportStatus() {
  const el = document.getElementById('exec-export-status');
  if (el) el.classList.remove('show');
}

function dimFixedSize(size) {
  // Helper para limitar texto
  return (txt, max) => {
    txt = String(txt || '');
    return txt.length > max ? txt.substring(0, max - 1) + '…' : txt;
  };
}

async function exportExecutivePPTX() {
  if (typeof PptxGenJS === 'undefined') {
    showExportStatus('⚠️ Biblioteca de exportação não carregou. Recarregue a página.', 'error');
    return;
  }
  const E = buildExecutiveData();
  if (!E) {
    showExportStatus('⚠️ Sem dados para gerar apresentação. Aguarde respostas.', 'error');
    return;
  }

  const btn = document.getElementById('btn-exp-pptx');
  if (btn) btn.disabled = true;
  showExportStatus('⏳ Gerando PPTX…');

  try {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE'; // 13.33 × 7.5 in
    pptx.title = 'Odara — Resumo Executivo · Cultura de Qualidade';
    pptx.author = 'Odara Alfajores';
    pptx.company = 'Odara Alfajores';

    const Y = '#' + ODARA_COLORS.yellow;
    const R = '#' + ODARA_COLORS.red;
    const K = '#' + ODARA_COLORS.black;
    const G = '#' + ODARA_COLORS.gray;
    const CR = '#' + ODARA_COLORS.cream;
    const W = '#' + ODARA_COLORS.white;
    const GR = '#' + ODARA_COLORS.green;

    // Helper: add footer to every content slide
    const addFooter = (slide, pageNum) => {
      slide.addShape(pptx.ShapeType.rect, { x:0, y:7.2, w:13.33, h:0.3, fill:{ color:K } });
      slide.addText('ODARA · Pesquisa de Cultura de Qualidade · ' + E.generatedAt, {
        x:0.4, y:7.2, w:10, h:0.3, fontSize:9, color:Y, fontFace:'Arial', valign:'middle'
      });
      slide.addText(pageNum + ' / 10', {
        x:12.2, y:7.2, w:0.9, h:0.3, fontSize:9, color:Y, fontFace:'Arial', align:'right', valign:'middle'
      });
    };

    // Helper: header band
    const addHeader = (slide, kicker, title) => {
      slide.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:0.12, fill:{ color:Y } });
      slide.addText(kicker, {
        x:0.5, y:0.3, w:12, h:0.3, fontSize:10, color:G, fontFace:'Arial',
        bold:true, charSpacing:3
      });
      slide.addText(title, {
        x:0.5, y:0.6, w:12, h:0.7, fontSize:28, color:K, fontFace:'Arial',
        bold:true
      });
      // Underline
      slide.addShape(pptx.ShapeType.rect, { x:0.5, y:1.35, w:1.2, h:0.05, fill:{ color:Y } });
    };

    // ── SLIDE 1: Capa ──
    const s1 = pptx.addSlide();
    s1.background = { color:K };
    // Yellow accent circle
    s1.addShape(pptx.ShapeType.ellipse, { x:10.5, y:-2, w:5.5, h:5.5, fill:{ color:Y, transparency:85 }, line:{ type:'none' } });
    s1.addShape(pptx.ShapeType.ellipse, { x:-1.5, y:5, w:3.5, h:3.5, fill:{ color:R, transparency:92 }, line:{ type:'none' } });
    s1.addText('ODARA', { x:0.5, y:0.5, w:5, h:0.5, fontSize:18, color:W, fontFace:'Arial', bold:true, charSpacing:12 });
    s1.addShape(pptx.ShapeType.rect, { x:0.5, y:1.1, w:0.8, h:0.05, fill:{ color:Y } });
    s1.addText('RELATÓRIO PARA A DIRETORIA', {
      x:0.5, y:2.2, w:12, h:0.4, fontSize:11, color:Y, fontFace:'Arial', bold:true, charSpacing:6
    });
    s1.addText([
      { text:'Pesquisa de Cultura de\n', options:{ fontSize:44, color:W, bold:true, fontFace:'Arial' } },
      { text:'Segurança do Produto ', options:{ fontSize:44, color:W, bold:true, fontFace:'Arial' } },
      { text:'&', options:{ fontSize:44, color:Y, bold:true, fontFace:'Arial' } },
      { text:' Qualidade', options:{ fontSize:44, color:W, bold:true, fontFace:'Arial' } },
    ], { x:0.5, y:2.7, w:12.3, h:2.2, valign:'top' });
    s1.addText('Consolidação dos resultados, principais achados e plano de ação.\nMetodologia alinhada ao GFSI Guidance Document on Food Safety Culture e FSSC 22000 v6.', {
      x:0.5, y:5.2, w:10, h:1, fontSize:14, color:'#BDB5A5', fontFace:'Arial'
    });
    s1.addText(E.generatedAt, {
      x:0.5, y:6.5, w:12, h:0.4, fontSize:12, color:Y, fontFace:'Arial', bold:true
    });

    // ── SLIDE 2: Sumário Executivo ──
    const s2 = pptx.addSlide();
    s2.background = { color:W };
    addHeader(s2, '01 · PANORAMA GERAL', 'Sumário Executivo');
    // 4 big numbers
    const stats = [
      { lbl:'Participação', val:String(E.total), sub:E.completionPct+'% da meta', color:Y },
      { lbl:'Score Geral', val:E.overallScore?E.overallScore.toFixed(2):'—', sub:E.matLabel, color:K },
      { lbl:'Dim. Críticas', val:String(E.critDimsCount), sub:'abaixo de 3.5', color:E.critDimsCount?R:GR },
      { lbl:'Ações no Plano', val:String(E.planStats.total), sub:E.planStats.done+' concluídas', color:Y },
    ];
    stats.forEach((s, i) => {
      const x = 0.5 + i * 3.15;
      s2.addShape(pptx.ShapeType.rect, { x, y:1.7, w:3, h:1.8, fill:{ color:CR }, line:{ color:'#E0D8C0', width:1 } });
      s2.addText(s.lbl.toUpperCase(), { x:x+0.15, y:1.8, w:2.7, h:0.3, fontSize:9, color:G, bold:true, fontFace:'Arial', charSpacing:2 });
      s2.addText(s.val, { x:x+0.15, y:2.1, w:2.7, h:0.9, fontSize:48, color:s.color, bold:true, fontFace:'Arial' });
      s2.addText(s.sub, { x:x+0.15, y:3.05, w:2.7, h:0.3, fontSize:10, color:G, fontFace:'Arial' });
    });
    // Discussion (texto sem HTML)
    const discussionText = E.discussion.replace(/<\/?strong>/g, '').replace(/<br\s*\/?>/g, '\n');
    s2.addShape(pptx.ShapeType.rect, { x:0.5, y:3.9, w:12.3, h:2.7, fill:{ color:'#FFF8EA' }, line:{ color:Y, width:3 } });
    s2.addText('DISCUSSÃO DOS RESULTADOS', { x:0.8, y:4.05, w:12, h:0.3, fontSize:10, color:'#9A7010', bold:true, fontFace:'Arial', charSpacing:3 });
    s2.addText(discussionText, { x:0.8, y:4.4, w:11.7, h:2.1, fontSize:13, color:K, fontFace:'Arial', valign:'top', paraSpaceAfter:4 });
    addFooter(s2, 2);

    // ── SLIDE 3: Participação ──
    const s3 = pptx.addSlide();
    s3.background = { color:W };
    addHeader(s3, '02 · QUEM RESPONDEU', 'Participação');
    // Tabela de públicos
    const audRows = [[
      { text:'Público', options:{ bold:true, fill:{ color:K }, color:Y, fontSize:11 } },
      { text:'Respondentes', options:{ bold:true, fill:{ color:K }, color:Y, fontSize:11, align:'center' } },
      { text:'Meta', options:{ bold:true, fill:{ color:K }, color:Y, fontSize:11, align:'center' } },
      { text:'% Alcançado', options:{ bold:true, fill:{ color:K }, color:Y, fontSize:11, align:'center' } },
    ]];
    E.audBreakdown.forEach((a, i) => {
      audRows.push([
        { text:a.label, options:{ bold:true, fontSize:12 } },
        { text:String(a.count), options:{ fontSize:12, align:'center' } },
        { text:String(a.expected), options:{ fontSize:12, align:'center', color:G } },
        { text:a.pct+'%', options:{ fontSize:12, align:'center', bold:true, color:a.pct>=80?GR:a.pct>=50?'#E67E22':R } },
      ]);
    });
    s3.addTable(audRows, {
      x:0.5, y:1.7, w:6.3, h:2.5, colW:[2.5,1.3,1.2,1.3],
      fontFace:'Arial', border:{ type:'solid', color:'#E0D8C0', pt:1 }
    });

    // Áreas por público (lateral)
    s3.addText('RESPONDENTES POR ÁREA', { x:7.2, y:1.7, w:5.5, h:0.3, fontSize:10, color:G, bold:true, fontFace:'Arial', charSpacing:2 });
    let areaY = 2.05;
    Object.entries(E.areaBreakdown).forEach(([audLbl, areas]) => {
      const topAreas = Object.entries(areas).sort((a,b)=>b[1]-a[1]).slice(0,5);
      if (!topAreas.length || areaY > 6.5) return;
      s3.addText(audLbl, { x:7.2, y:areaY, w:5.5, h:0.3, fontSize:11, color:K, bold:true, fontFace:'Arial' });
      areaY += 0.3;
      const txt = topAreas.map(([a,n]) => `${a}: ${n}`).join(' · ');
      s3.addText(txt, { x:7.2, y:areaY, w:5.5, h:0.35, fontSize:10, color:G, fontFace:'Arial' });
      areaY += 0.5;
    });

    addFooter(s3, 3);

    // ── SLIDE 4: Score e Maturidade ──
    const s4 = pptx.addSlide();
    s4.background = { color:W };
    addHeader(s4, '03 · MATURIDADE CULTURAL', 'Score Geral & Classificação');
    const scVal = E.overallScore ? E.overallScore.toFixed(2) : '—';
    const scColor = E.overallScore >= 4.5 ? GR : E.overallScore >= 3.5 ? Y : E.overallScore >= 2.5 ? '#E67E22' : R;
    // Big score
    s4.addShape(pptx.ShapeType.rect, { x:0.5, y:1.8, w:5.5, h:4.5, fill:{ color:K }, line:{ type:'none' } });
    s4.addText('SCORE GERAL (1–5)', { x:0.5, y:2.1, w:5.5, h:0.3, fontSize:10, color:Y, bold:true, align:'center', fontFace:'Arial', charSpacing:3 });
    s4.addText(scVal, { x:0.5, y:2.7, w:5.5, h:2, fontSize:150, color:scColor, bold:true, align:'center', fontFace:'Arial' });
    s4.addText(E.matLabel, { x:0.5, y:5, w:5.5, h:0.5, fontSize:18, color:W, bold:true, align:'center', fontFace:'Arial' });
    s4.addText('Escala: <2.5 Em Risco · 2.5–3.4 Frágil · 3.5–4.4 Em Desenvolvimento · 4.5+ Consolidada', {
      x:0.5, y:5.6, w:5.5, h:0.4, fontSize:8, color:'#999', align:'center', fontFace:'Arial'
    });

    // Score por público (lado direito)
    s4.addText('SCORE POR PÚBLICO', { x:6.3, y:1.9, w:6.5, h:0.3, fontSize:10, color:G, bold:true, fontFace:'Arial', charSpacing:2 });
    let pubY = 2.3;
    const audScoreRows = [];
    E.audBreakdown.forEach(a => {
      const sc = DATA.audScores[a.key];
      if (sc === null || sc === undefined) return;
      audScoreRows.push({ label:a.label, score:sc, count:a.count });
    });
    audScoreRows.forEach(row => {
      const sCls = scoreClass(row.score);
      const sColor = row.score >= 4.5 ? GR : row.score >= 3.5 ? Y : row.score >= 2.5 ? '#E67E22' : R;
      s4.addText(row.label, { x:6.3, y:pubY, w:3, h:0.4, fontSize:13, color:K, bold:true, fontFace:'Arial', valign:'middle' });
      s4.addText('(' + row.count + ')', { x:9.3, y:pubY, w:0.7, h:0.4, fontSize:10, color:G, fontFace:'Arial', valign:'middle' });
      // Bar
      s4.addShape(pptx.ShapeType.rect, { x:10.1, y:pubY+0.12, w:1.8, h:0.15, fill:{ color:'#EEE' }, line:{ type:'none' } });
      s4.addShape(pptx.ShapeType.rect, { x:10.1, y:pubY+0.12, w:1.8 * ((row.score-1)/4), h:0.15, fill:{ color:sColor }, line:{ type:'none' } });
      s4.addText(row.score.toFixed(2), { x:12, y:pubY, w:0.8, h:0.4, fontSize:13, color:sColor, bold:true, fontFace:'Arial', valign:'middle' });
      pubY += 0.7;
    });

    addFooter(s4, 4);

    // ── SLIDE 5: Dimensões Críticas ──
    const s5 = pptx.addSlide();
    s5.background = { color:W };
    addHeader(s5, '04 · ONDE ATUAR PRIMEIRO', 'Dimensões Críticas');
    if (E.critDims.length) {
      const critRows = [[
        { text:'Dimensão', options:{ bold:true, fill:{ color:K }, color:Y, fontSize:11 } },
        { text:'Score', options:{ bold:true, fill:{ color:K }, color:Y, fontSize:11, align:'center' } },
        { text:'Pior Público', options:{ bold:true, fill:{ color:K }, color:Y, fontSize:11 } },
        { text:'Ação Recomendada', options:{ bold:true, fill:{ color:K }, color:Y, fontSize:11 } },
      ]];
      E.critDims.slice(0, 7).forEach(c => {
        const scColor = c.worstScore < 2.5 ? R : '#E67E22';
        critRows.push([
          { text:c.dim, options:{ bold:true, fontSize:11 } },
          { text:c.worstScore.toFixed(1), options:{ align:'center', bold:true, color:scColor, fontSize:13 } },
          { text:c.worstAud, options:{ fontSize:10, color:G } },
          { text:(DIM_RECS[c.dim] || 'Intervenção estruturada.').substring(0, 90), options:{ fontSize:10 } },
        ]);
      });
      s5.addTable(critRows, {
        x:0.5, y:1.7, w:12.3, h:5,
        colW:[3.3, 1.0, 2.2, 5.8],
        fontFace:'Arial', border:{ type:'solid', color:'#E0D8C0', pt:1 },
        rowH:0.6
      });
    } else {
      s5.addShape(pptx.ShapeType.rect, { x:2, y:3, w:9.3, h:2, fill:{ color:'#EAF7EC' }, line:{ color:GR, width:2 } });
      s5.addText('✓', { x:2, y:3.1, w:9.3, h:0.8, fontSize:40, color:GR, bold:true, align:'center', fontFace:'Arial' });
      s5.addText('Nenhuma dimensão crítica identificada. Todas acima de 3.5.', {
        x:2, y:4.1, w:9.3, h:0.6, fontSize:16, color:K, bold:true, align:'center', fontFace:'Arial'
      });
    }
    addFooter(s5, 5);

    // ── SLIDE 6: Pontos de Atenção Focados ──
    const s6 = pptx.addSlide();
    s6.background = { color:W };
    addHeader(s6, '05 · AÇÃO DIRIGIDA POR SETOR', 'Pontos de Atenção Focados');
    if (E.focused.length) {
      s6.addText('Perguntas específicas com baixa performance em setores determinados — permitem intervenção dirigida em vez de ação generalizada.', {
        x:0.5, y:1.5, w:12.3, h:0.4, fontSize:11, color:G, fontFace:'Arial', italic:true
      });
      let fpY = 2.05;
      E.focused.slice(0, 5).forEach(f => {
        // Card
        s6.addShape(pptx.ShapeType.rect, { x:0.5, y:fpY, w:12.3, h:0.95, fill:{ color:'#FFFBF0' }, line:{ color:'#E0D8C0', width:1 } });
        // Side bar
        s6.addShape(pptx.ShapeType.rect, { x:0.5, y:fpY, w:0.12, h:0.95, fill:{ color:'#E67E22' }, line:{ type:'none' } });
        // Theme
        s6.addText((f.action.icon||'⚡') + ' ' + f.action.theme, { x:0.8, y:fpY+0.05, w:7.5, h:0.35, fontSize:13, color:K, bold:true, fontFace:'Arial' });
        // Meta tags
        s6.addText(f.audienceLabel + ' · ' + f.area + ' · ' + f.qid, { x:0.8, y:fpY+0.4, w:7.5, h:0.25, fontSize:9, color:G, fontFace:'Arial', bold:true, charSpacing:1 });
        // Action
        s6.addText((f.action.action || '').substring(0, 150), { x:0.8, y:fpY+0.62, w:9.3, h:0.3, fontSize:10, color:K, fontFace:'Arial' });
        // Score pill
        const scColor = f.avg < 2.5 ? R : '#E67E22';
        s6.addShape(pptx.ShapeType.rect, { x:10.5, y:fpY+0.2, w:0.9, h:0.5, fill:{ color:scColor }, line:{ type:'none' } });
        s6.addText(f.avg.toFixed(1), { x:10.5, y:fpY+0.2, w:0.9, h:0.5, fontSize:20, color:W, bold:true, align:'center', valign:'middle', fontFace:'Arial' });
        // Low count
        s6.addText(f.lowCount + '/' + f.count, { x:11.5, y:fpY+0.2, w:1.2, h:0.25, fontSize:11, color:R, bold:true, fontFace:'Arial', align:'center' });
        s6.addText('notas ≤ 2', { x:11.5, y:fpY+0.45, w:1.2, h:0.25, fontSize:8, color:G, fontFace:'Arial', align:'center' });
        fpY += 1.02;
      });
    } else {
      s6.addText('Nenhum ponto focado identificado com os critérios atuais (média < 3.5 E pelo menos 2 notas ≤ 2 em um setor específico).', {
        x:2, y:3.5, w:9.3, h:0.8, fontSize:14, color:G, align:'center', fontFace:'Arial', italic:true
      });
    }
    addFooter(s6, 6);

    // ── SLIDE 7: Pontos Fortes ──
    const s7 = pptx.addSlide();
    s7.background = { color:W };
    addHeader(s7, '06 · O QUE REPLICAR', 'Pontos Fortes');
    if (E.strongDims.length) {
      s7.addText('Dimensões com score ≥ 4.0 representam cultura consolidada — práticas a preservar e replicar para outras áreas/públicos.', {
        x:0.5, y:1.5, w:12.3, h:0.4, fontSize:11, color:G, fontFace:'Arial', italic:true
      });
      let strY = 2.05;
      E.strongDims.slice(0, 6).forEach(s => {
        s7.addShape(pptx.ShapeType.rect, { x:0.5, y:strY, w:12.3, h:0.75, fill:{ color:'#EAF7EC' }, line:{ color:GR, width:1 } });
        s7.addShape(pptx.ShapeType.rect, { x:0.5, y:strY, w:0.12, h:0.75, fill:{ color:GR }, line:{ type:'none' } });
        s7.addText('🏆 ' + s.dim, { x:0.8, y:strY+0.1, w:7.5, h:0.35, fontSize:13, color:K, bold:true, fontFace:'Arial' });
        s7.addText(s.pub, { x:0.8, y:strY+0.4, w:7.5, h:0.3, fontSize:10, color:G, fontFace:'Arial' });
        s7.addShape(pptx.ShapeType.rect, { x:10.8, y:strY+0.15, w:0.9, h:0.45, fill:{ color:GR }, line:{ type:'none' } });
        s7.addText(s.score.toFixed(1), { x:10.8, y:strY+0.15, w:0.9, h:0.45, fontSize:20, color:W, bold:true, align:'center', valign:'middle', fontFace:'Arial' });
        strY += 0.82;
      });
    } else {
      s7.addText('Ainda não há dimensões com score ≥ 4.0. Foco em consolidar a cultura nas dimensões em desenvolvimento.', {
        x:2, y:3.5, w:9.3, h:0.8, fontSize:14, color:G, align:'center', fontFace:'Arial', italic:true
      });
    }
    addFooter(s7, 7);

    // ── SLIDE 8: Plano de Ação (overview) ──
    const s8 = pptx.addSlide();
    s8.background = { color:W };
    addHeader(s8, '07 · STATUS DO PLANO', 'Plano de Ação');
    // Stats strip
    const pStats = [
      { lbl:'Total', val:E.planStats.total, color:K },
      { lbl:'Abertas', val:E.planStats.open, color:G },
      { lbl:'Em curso', val:E.planStats.progress, color:Y },
      { lbl:'Concluídas', val:E.planStats.done, color:GR },
      { lbl:'Prioridade alta', val:E.planStats.high, color:R },
    ];
    pStats.forEach((p, i) => {
      const x = 0.5 + i * 2.52;
      s8.addShape(pptx.ShapeType.rect, { x, y:1.7, w:2.4, h:1.2, fill:{ color:CR }, line:{ color:'#E0D8C0', width:1 } });
      s8.addText(p.lbl.toUpperCase(), { x:x+0.1, y:1.78, w:2.2, h:0.3, fontSize:9, color:G, bold:true, fontFace:'Arial', charSpacing:2 });
      s8.addText(String(p.val), { x:x+0.1, y:2.1, w:2.2, h:0.7, fontSize:36, color:p.color, bold:true, fontFace:'Arial' });
    });

    // Top ações
    if (E.actions.length) {
      const actRows = [[
        { text:'Ação', options:{ bold:true, fill:{ color:K }, color:Y, fontSize:11 } },
        { text:'Pri.', options:{ bold:true, fill:{ color:K }, color:Y, fontSize:11, align:'center' } },
        { text:'Responsável', options:{ bold:true, fill:{ color:K }, color:Y, fontSize:11 } },
        { text:'Prazo', options:{ bold:true, fill:{ color:K }, color:Y, fontSize:11, align:'center' } },
        { text:'Status', options:{ bold:true, fill:{ color:K }, color:Y, fontSize:11, align:'center' } },
      ]];
      E.actions.slice(0, 6).forEach(a => {
        const stLbl = a.status === 'done' ? '✅' : a.status === 'progress' ? '🔄' : '⭕';
        const priColor = (a.pri === 'Alta' || a.pri === 'Crítica') ? R : (a.pri === 'Média' ? Y : G);
        actRows.push([
          { text:(a.title || '').substring(0, 70), options:{ fontSize:10, bold:true } },
          { text:a.pri, options:{ fontSize:9, align:'center', color:priColor, bold:true } },
          { text:a.owner || 'A definir', options:{ fontSize:9, color:G } },
          { text:fmtDate(a.deadline), options:{ fontSize:9, align:'center', color:G } },
          { text:stLbl, options:{ fontSize:14, align:'center' } },
        ]);
      });
      s8.addTable(actRows, {
        x:0.5, y:3.2, w:12.3, h:3.5,
        colW:[5.5, 1.2, 2.3, 1.8, 1.5],
        fontFace:'Arial', border:{ type:'solid', color:'#E0D8C0', pt:1 },
        rowH:0.5
      });
    } else {
      s8.addShape(pptx.ShapeType.rect, { x:2, y:4, w:9.3, h:1.5, fill:{ color:CR }, line:{ color:'#E0D8C0', width:1 } });
      s8.addText('Nenhuma ação registrada ainda.\nPróximo passo: consolidar achados em ações específicas.', {
        x:2, y:4, w:9.3, h:1.5, fontSize:13, color:G, align:'center', valign:'middle', fontFace:'Arial', italic:true
      });
    }
    addFooter(s8, 8);

    // ── SLIDE 9: Gaps de Percepção ──
    const s9 = pptx.addSlide();
    s9.background = { color:W };
    addHeader(s9, '08 · LIDERANÇAS vs COLABORADORES', 'Gaps de Percepção');
    if (E.gaps.length) {
      s9.addText('Diferença > 0.5 pontos entre a percepção da liderança e dos colaboradores. Indica desconexão de percepção a ser reconciliada.', {
        x:0.5, y:1.5, w:12.3, h:0.4, fontSize:11, color:G, fontFace:'Arial', italic:true
      });
      let gY = 2.05;
      E.gaps.slice(0, 5).forEach(g => {
        s9.addShape(pptx.ShapeType.rect, { x:0.5, y:gY, w:12.3, h:0.9, fill:{ color:W }, line:{ color:'#E0D8C0', width:1 } });
        s9.addShape(pptx.ShapeType.rect, { x:0.5, y:gY, w:0.12, h:0.9, fill:{ color:Y }, line:{ type:'none' } });
        s9.addText(g.dim, { x:0.8, y:gY+0.1, w:6, h:0.7, fontSize:14, color:K, bold:true, fontFace:'Arial', valign:'middle' });
        // Colaboradores
        s9.addText('Colaboradores', { x:7, y:gY+0.15, w:1.8, h:0.25, fontSize:9, color:G, fontFace:'Arial', align:'center' });
        s9.addText(g.internos.toFixed(1), { x:7, y:gY+0.38, w:1.8, h:0.45, fontSize:20, color:Y, bold:true, fontFace:'Arial', align:'center' });
        // Arrow
        s9.addText('→', { x:8.8, y:gY+0.25, w:0.6, h:0.5, fontSize:22, color:G, fontFace:'Arial', align:'center' });
        // Lideranças
        s9.addText('Lideranças', { x:9.4, y:gY+0.15, w:1.8, h:0.25, fontSize:9, color:G, fontFace:'Arial', align:'center' });
        s9.addText(g.liderancas.toFixed(1), { x:9.4, y:gY+0.38, w:1.8, h:0.45, fontSize:20, color:R, bold:true, fontFace:'Arial', align:'center' });
        // Gap
        s9.addText('GAP', { x:11.4, y:gY+0.15, w:1.2, h:0.25, fontSize:9, color:G, fontFace:'Arial', align:'center' });
        s9.addText(g.diff.toFixed(1), { x:11.4, y:gY+0.38, w:1.2, h:0.45, fontSize:20, color:K, bold:true, fontFace:'Arial', align:'center' });
        gY += 0.97;
      });
    } else {
      s9.addShape(pptx.ShapeType.rect, { x:2, y:3, w:9.3, h:2, fill:{ color:'#EAF7EC' }, line:{ color:GR, width:2 } });
      s9.addText('✓', { x:2, y:3.1, w:9.3, h:0.8, fontSize:40, color:GR, bold:true, align:'center', fontFace:'Arial' });
      s9.addText('Liderança e colaboradores com percepções alinhadas.\nNenhum gap > 0.5 identificado.', {
        x:2, y:4.1, w:9.3, h:0.9, fontSize:14, color:K, align:'center', fontFace:'Arial'
      });
    }
    addFooter(s9, 9);

    // ── SLIDE 10: Próximos Passos ──
    const s10 = pptx.addSlide();
    s10.background = { color:W };
    addHeader(s10, '09 · ROADMAP', 'Próximos Passos');
    // Timeline
    const steps = [
      { phase:'CONCLUÍDO', title:'Coleta', desc:E.total + ' respondentes participaram da pesquisa.', color:GR, bg:'#EAF7EC' },
      { phase:'AGORA', title:'Devolutiva', desc:'Apresentar resultados por área em até 30 dias. Envolver liderança direta.', color:Y, bg:'#FFF8EA' },
      { phase:'PRÓXIMO', title:'Execução', desc:'Implementar plano de ação com acompanhamento trimestral de indicadores.', color:K, bg:CR },
      { phase:'HORIZONTE', title:'Nova Pesquisa', desc:'Reaplicar em Outubro/2026 para medir evolução e ajustar plano.', color:G, bg:W },
    ];
    steps.forEach((st, i) => {
      const x = 0.5 + i * 3.15;
      s10.addShape(pptx.ShapeType.rect, { x, y:2, w:3, h:4, fill:{ color:st.bg }, line:{ color:'#E0D8C0', width:1 } });
      s10.addShape(pptx.ShapeType.rect, { x, y:2, w:3, h:0.12, fill:{ color:st.color }, line:{ type:'none' } });
      s10.addText(st.phase, { x:x+0.2, y:2.3, w:2.6, h:0.3, fontSize:9, color:st.color, bold:true, fontFace:'Arial', charSpacing:2 });
      s10.addText(st.title, { x:x+0.2, y:2.7, w:2.6, h:0.8, fontSize:22, color:K, bold:true, fontFace:'Arial' });
      s10.addText(st.desc, { x:x+0.2, y:3.8, w:2.6, h:2, fontSize:11, color:G, fontFace:'Arial', valign:'top' });
    });

    // Call to action
    s10.addShape(pptx.ShapeType.rect, { x:0.5, y:6.3, w:12.3, h:0.7, fill:{ color:K }, line:{ type:'none' } });
    s10.addText('Este relatório é dinâmico. Ao atualizar ações no painel, reexporte para a versão mais recente.', {
      x:0.5, y:6.3, w:12.3, h:0.7, fontSize:12, color:Y, align:'center', valign:'middle', fontFace:'Arial', italic:true
    });
    addFooter(s10, 10);

    // Download
    const fname = 'odara_resumo_executivo_' + new Date().toISOString().split('T')[0] + '.pptx';
    await pptx.writeFile({ fileName: fname });
    showExportStatus('✅ PPTX exportado!', 'success');
  } catch (e) {
    console.error('Erro ao gerar PPTX:', e);
    showExportStatus('⚠️ Erro ao gerar PPTX: ' + e.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}
window.exportExecutivePPTX = exportExecutivePPTX;

// ══════════════════════════════════════════════════════════════
// EXPORT PDF — mesmo conteúdo em 10 páginas
// ══════════════════════════════════════════════════════════════
async function exportExecutivePDF() {
  if (typeof window.jspdf === 'undefined' || !window.jspdf.jsPDF) {
    showExportStatus('⚠️ Biblioteca de PDF não carregou. Recarregue a página.', 'error');
    return;
  }
  const E = buildExecutiveData();
  if (!E) {
    showExportStatus('⚠️ Sem dados para gerar PDF. Aguarde respostas.', 'error');
    return;
  }

  const btn = document.getElementById('btn-exp-pdf');
  if (btn) btn.disabled = true;
  showExportStatus('⏳ Gerando PDF…');

  try {
    const { jsPDF } = window.jspdf;
    // Formato landscape, dimensões em mm. A4 landscape: 297 × 210
    const pdf = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });
    const W = 297, H = 210;

    // Colors em RGB
    const Y = [255, 184, 29];
    const R = [238, 39, 55];
    const K = [12, 12, 12];
    const G = [86, 85, 85];
    const CR = [255, 248, 234];
    const GR = [39, 174, 96];
    const OR = [230, 126, 34];
    const LG = [224, 216, 192];
    const WH = [255, 255, 255];

    const setFill = (c) => pdf.setFillColor(c[0], c[1], c[2]);
    const setDraw = (c) => pdf.setDrawColor(c[0], c[1], c[2]);
    const setText = (c) => pdf.setTextColor(c[0], c[1], c[2]);

    const addFooter = (pageNum) => {
      setFill(K); pdf.rect(0, H-8, W, 8, 'F');
      setText(Y); pdf.setFontSize(8); pdf.setFont('helvetica','normal');
      pdf.text('ODARA · Pesquisa de Cultura de Qualidade · ' + E.generatedAt, 10, H-3);
      pdf.text(pageNum + ' / 10', W-20, H-3, { align:'right' });
    };

    const addHeader = (kicker, title) => {
      setFill(Y); pdf.rect(0, 0, W, 2, 'F');
      setText(G); pdf.setFontSize(8); pdf.setFont('helvetica','bold');
      pdf.text(kicker, 10, 10);
      setText(K); pdf.setFontSize(22); pdf.setFont('helvetica','bold');
      pdf.text(title, 10, 20);
      setFill(Y); pdf.rect(10, 23, 20, 1, 'F');
    };

    // Wrap helper
    const wrapText = (text, maxWidth, fontSize) => {
      pdf.setFontSize(fontSize);
      return pdf.splitTextToSize(String(text || ''), maxWidth);
    };

    // ── PAGE 1: Capa ──
    setFill(K); pdf.rect(0, 0, W, H, 'F');
    // Yellow circle decoration
    setFill(Y); pdf.setGState && pdf.setGState(new pdf.GState({opacity:0.15}));
    pdf.circle(W-20, -10, 60, 'F');
    pdf.setGState && pdf.setGState(new pdf.GState({opacity:0.08}));
    setFill(R);
    pdf.circle(-10, H+10, 40, 'F');
    pdf.setGState && pdf.setGState(new pdf.GState({opacity:1}));
    // Logo
    setText(WH); pdf.setFontSize(14); pdf.setFont('helvetica','bold');
    pdf.text('ODARA', 15, 20, { charSpace:3 });
    setFill(Y); pdf.rect(15, 23, 10, 0.8, 'F');
    // Tag
    setText(Y); pdf.setFontSize(9); pdf.setFont('helvetica','bold');
    pdf.text('RELATÓRIO PARA A DIRETORIA', 15, 60, { charSpace:2 });
    // Title
    setText(WH); pdf.setFontSize(32); pdf.setFont('helvetica','bold');
    pdf.text('Pesquisa de Cultura de', 15, 85);
    pdf.text('Segurança do Produto', 15, 98);
    setText(Y); pdf.text('&', 117, 98);
    setText(WH); pdf.text(' Qualidade', 122, 98);
    // Lede
    setText([189, 181, 165]); pdf.setFontSize(11); pdf.setFont('helvetica','normal');
    const ledeLines = wrapText('Consolidação dos resultados, principais achados e plano de ação. Metodologia alinhada ao GFSI Guidance Document on Food Safety Culture e FSSC 22000 v6.', W-30, 11);
    pdf.text(ledeLines, 15, 120);
    // Date
    setText(Y); pdf.setFontSize(11); pdf.setFont('helvetica','bold');
    pdf.text(E.generatedAt, 15, 195);

    // ── PAGE 2: Sumário executivo ──
    pdf.addPage();
    setFill(WH); pdf.rect(0, 0, W, H, 'F');
    addHeader('01 · PANORAMA GERAL', 'Sumário Executivo');
    // 4 stats boxes
    const stats = [
      { lbl:'PARTICIPAÇÃO', val:String(E.total), sub:E.completionPct+'% da meta', color:Y },
      { lbl:'SCORE GERAL', val:E.overallScore?E.overallScore.toFixed(2):'—', sub:E.matLabel, color:K },
      { lbl:'DIM. CRÍTICAS', val:String(E.critDimsCount), sub:'abaixo de 3.5', color:E.critDimsCount?R:GR },
      { lbl:'AÇÕES NO PLANO', val:String(E.planStats.total), sub:E.planStats.done+' concluídas', color:Y },
    ];
    stats.forEach((s, i) => {
      const x = 10 + i * 69;
      setFill(CR); setDraw(LG); pdf.rect(x, 36, 65, 38, 'FD');
      setText(G); pdf.setFontSize(8); pdf.setFont('helvetica','bold');
      pdf.text(s.lbl, x+3, 42, { charSpace:1 });
      setText(s.color); pdf.setFontSize(34); pdf.setFont('helvetica','bold');
      pdf.text(s.val, x+3, 60);
      setText(G); pdf.setFontSize(9); pdf.setFont('helvetica','normal');
      pdf.text(s.sub, x+3, 70);
    });
    // Discussion box
    const discText = E.discussion.replace(/<\/?strong>/g, '').replace(/<br\s*\/?>/g, '\n');
    setFill([255, 248, 234]); setDraw(Y); pdf.setLineWidth(0.8);
    pdf.rect(10, 85, W-20, 100, 'FD');
    setText([154, 112, 16]); pdf.setFontSize(9); pdf.setFont('helvetica','bold');
    pdf.text('DISCUSSÃO DOS RESULTADOS', 15, 93, { charSpace:2 });
    setText(K); pdf.setFontSize(11); pdf.setFont('helvetica','normal');
    const discLines = wrapText(discText, W-30, 11);
    pdf.text(discLines, 15, 103);
    pdf.setLineWidth(0.2);
    addFooter(2);

    // ── PAGE 3: Participação ──
    pdf.addPage();
    setFill(WH); pdf.rect(0, 0, W, H, 'F');
    addHeader('02 · QUEM RESPONDEU', 'Participação');
    // Table
    let rowY = 45;
    setFill(K); pdf.rect(10, rowY, 140, 10, 'F');
    setText(Y); pdf.setFontSize(10); pdf.setFont('helvetica','bold');
    pdf.text('PÚBLICO', 13, rowY+7);
    pdf.text('RESP.', 80, rowY+7, { align:'center' });
    pdf.text('META', 105, rowY+7, { align:'center' });
    pdf.text('% META', 130, rowY+7, { align:'center' });
    rowY += 10;
    E.audBreakdown.forEach((a, i) => {
      setFill(i%2 ? WH : [250, 248, 240]); pdf.rect(10, rowY, 140, 10, 'F');
      setText(K); pdf.setFont('helvetica','bold'); pdf.setFontSize(11);
      pdf.text(a.label, 13, rowY+7);
      pdf.setFont('helvetica','normal');
      pdf.text(String(a.count), 80, rowY+7, { align:'center' });
      setText(G);
      pdf.text(String(a.expected), 105, rowY+7, { align:'center' });
      const pctColor = a.pct >= 80 ? GR : a.pct >= 50 ? OR : R;
      setText(pctColor); pdf.setFont('helvetica','bold');
      pdf.text(a.pct+'%', 130, rowY+7, { align:'center' });
      rowY += 10;
    });
    setDraw(LG); pdf.rect(10, 45, 140, rowY-45);

    // Áreas por público
    setText(G); pdf.setFontSize(9); pdf.setFont('helvetica','bold');
    pdf.text('RESPONDENTES POR ÁREA', 160, 50, { charSpace:1 });
    let aY = 58;
    Object.entries(E.areaBreakdown).forEach(([audLbl, areas]) => {
      if (aY > 180) return;
      const topAreas = Object.entries(areas).sort((a,b)=>b[1]-a[1]).slice(0,4);
      if (!topAreas.length) return;
      setText(K); pdf.setFontSize(10); pdf.setFont('helvetica','bold');
      pdf.text(audLbl, 160, aY);
      aY += 5;
      setText(G); pdf.setFontSize(9); pdf.setFont('helvetica','normal');
      const areaLines = wrapText(topAreas.map(([a,n]) => a+': '+n).join(' · '), W-170, 9);
      pdf.text(areaLines, 160, aY);
      aY += areaLines.length * 4.5 + 6;
    });
    addFooter(3);

    // ── PAGE 4: Score Maturidade ──
    pdf.addPage();
    setFill(WH); pdf.rect(0, 0, W, H, 'F');
    addHeader('03 · MATURIDADE CULTURAL', 'Score Geral & Classificação');
    // Big score box
    setFill(K); pdf.rect(10, 40, 120, 145, 'F');
    setText(Y); pdf.setFontSize(10); pdf.setFont('helvetica','bold');
    pdf.text('SCORE GERAL (1–5)', 70, 55, { align:'center', charSpace:2 });
    const sc = E.overallScore ? E.overallScore.toFixed(2) : '—';
    const scColor = E.overallScore >= 4.5 ? GR : E.overallScore >= 3.5 ? Y : E.overallScore >= 2.5 ? OR : R;
    setText(scColor); pdf.setFontSize(110); pdf.setFont('helvetica','bold');
    pdf.text(sc, 70, 125, { align:'center' });
    setText(WH); pdf.setFontSize(16); pdf.setFont('helvetica','bold');
    pdf.text(E.matLabel, 70, 145, { align:'center' });
    setText([150, 150, 150]); pdf.setFontSize(7); pdf.setFont('helvetica','normal');
    pdf.text('<2.5 Em Risco · 2.5–3.4 Frágil · 3.5–4.4 Em Desenvolvimento · 4.5+ Consolidada', 70, 175, { align:'center' });

    // Right side: score por público
    setText(G); pdf.setFontSize(9); pdf.setFont('helvetica','bold');
    pdf.text('SCORE POR PÚBLICO', 140, 46, { charSpace:1 });
    let pY = 56;
    E.audBreakdown.forEach(a => {
      const sc = DATA.audScores[a.key];
      if (sc === null || sc === undefined) return;
      const sColor = sc >= 4.5 ? GR : sc >= 3.5 ? Y : sc >= 2.5 ? OR : R;
      setText(K); pdf.setFontSize(11); pdf.setFont('helvetica','bold');
      pdf.text(a.label, 140, pY);
      setText(G); pdf.setFontSize(8); pdf.setFont('helvetica','normal');
      pdf.text('(' + a.count + ')', 140, pY+5);
      // Bar
      setFill([238, 238, 238]); pdf.rect(180, pY-3, 80, 5, 'F');
      setFill(sColor); pdf.rect(180, pY-3, 80 * ((sc-1)/4), 5, 'F');
      setText(sColor); pdf.setFontSize(13); pdf.setFont('helvetica','bold');
      pdf.text(sc.toFixed(2), 275, pY);
      pY += 16;
    });
    addFooter(4);

    // ── PAGE 5: Dimensões críticas ──
    pdf.addPage();
    setFill(WH); pdf.rect(0, 0, W, H, 'F');
    addHeader('04 · ONDE ATUAR PRIMEIRO', 'Dimensões Críticas');
    if (E.critDims.length) {
      // Tabela
      let rY = 40;
      setFill(K); pdf.rect(10, rY, W-20, 10, 'F');
      setText(Y); pdf.setFontSize(9); pdf.setFont('helvetica','bold');
      pdf.text('DIMENSÃO', 13, rY+7);
      pdf.text('SCORE', 115, rY+7, { align:'center' });
      pdf.text('PIOR PÚBLICO', 145, rY+7);
      pdf.text('AÇÃO RECOMENDADA', 200, rY+7);
      rY += 10;
      E.critDims.slice(0, 8).forEach((c, i) => {
        const rowH = 14;
        setFill(i%2 ? WH : [250, 248, 240]);
        pdf.rect(10, rY, W-20, rowH, 'F');
        setText(K); pdf.setFont('helvetica','bold'); pdf.setFontSize(10);
        const dimLines = wrapText(c.dim, 95, 10);
        pdf.text(dimLines.slice(0, 2), 13, rY+6);
        const scColor = c.worstScore < 2.5 ? R : OR;
        setText(scColor); pdf.setFontSize(13); pdf.setFont('helvetica','bold');
        pdf.text(c.worstScore.toFixed(1), 115, rY+8, { align:'center' });
        setText(G); pdf.setFontSize(9); pdf.setFont('helvetica','normal');
        pdf.text(c.worstAud, 145, rY+8);
        setText(K); pdf.setFontSize(9);
        const recLines = wrapText((DIM_RECS[c.dim] || 'Intervenção estruturada.'), W-215, 9);
        pdf.text(recLines.slice(0, 2), 200, rY+5);
        rY += rowH;
      });
      setDraw(LG); pdf.rect(10, 40, W-20, rY-40);
    } else {
      setFill([234, 247, 236]); setDraw(GR); pdf.setLineWidth(1);
      pdf.rect(40, 80, W-80, 50, 'FD');
      setText(GR); pdf.setFontSize(36); pdf.setFont('helvetica','bold');
      pdf.text('✓', W/2, 105, { align:'center' });
      setText(K); pdf.setFontSize(14); pdf.setFont('helvetica','bold');
      pdf.text('Nenhuma dimensão crítica identificada.', W/2, 118, { align:'center' });
      setText(G); pdf.setFontSize(11); pdf.setFont('helvetica','normal');
      pdf.text('Todas acima de 3.5.', W/2, 125, { align:'center' });
      pdf.setLineWidth(0.2);
    }
    addFooter(5);

    // ── PAGE 6: Pontos focados ──
    pdf.addPage();
    setFill(WH); pdf.rect(0, 0, W, H, 'F');
    addHeader('05 · AÇÃO DIRIGIDA POR SETOR', 'Pontos de Atenção Focados');
    if (E.focused.length) {
      setText(G); pdf.setFontSize(9); pdf.setFont('helvetica','italic');
      pdf.text('Perguntas específicas com baixa performance em setores determinados.', 10, 32);
      pdf.setFont('helvetica','normal');
      let fY = 40;
      E.focused.slice(0, 5).forEach(f => {
        setFill([255, 251, 240]); setDraw(LG);
        pdf.rect(10, fY, W-20, 28, 'FD');
        setFill(OR); pdf.rect(10, fY, 2, 28, 'F');
        setText(K); pdf.setFontSize(12); pdf.setFont('helvetica','bold');
        const tLines = wrapText((f.action.icon || '⚡') + ' ' + f.action.theme, 180, 12);
        pdf.text(tLines[0] || '', 15, fY+7);
        setText(G); pdf.setFontSize(8); pdf.setFont('helvetica','bold');
        pdf.text(f.audienceLabel + ' · ' + f.area + ' · ' + f.qid, 15, fY+13, { charSpace:0.5 });
        setText(K); pdf.setFontSize(9); pdf.setFont('helvetica','normal');
        const aLines = wrapText(f.action.action || '', 210, 9);
        pdf.text(aLines.slice(0, 2), 15, fY+19);
        // Score pill
        const scColor = f.avg < 2.5 ? R : OR;
        setFill(scColor); pdf.rect(235, fY+5, 20, 12, 'F');
        setText(WH); pdf.setFontSize(14); pdf.setFont('helvetica','bold');
        pdf.text(f.avg.toFixed(1), 245, fY+14, { align:'center' });
        // Low count
        setText(R); pdf.setFontSize(10); pdf.setFont('helvetica','bold');
        pdf.text(f.lowCount + '/' + f.count, 270, fY+12, { align:'center' });
        setText(G); pdf.setFontSize(7); pdf.setFont('helvetica','normal');
        pdf.text('notas ≤ 2', 270, fY+17, { align:'center' });
        fY += 31;
      });
    } else {
      setText(G); pdf.setFontSize(12); pdf.setFont('helvetica','italic');
      pdf.text('Nenhum ponto focado identificado com os critérios atuais.', W/2, 100, { align:'center' });
      pdf.setFontSize(10);
      pdf.text('(média < 3.5 E pelo menos 2 notas ≤ 2 em um setor específico)', W/2, 108, { align:'center' });
    }
    addFooter(6);

    // ── PAGE 7: Pontos fortes ──
    pdf.addPage();
    setFill(WH); pdf.rect(0, 0, W, H, 'F');
    addHeader('06 · O QUE REPLICAR', 'Pontos Fortes');
    if (E.strongDims.length) {
      setText(G); pdf.setFontSize(9); pdf.setFont('helvetica','italic');
      pdf.text('Dimensões com score ≥ 4.0 — cultura consolidada, práticas a replicar.', 10, 32);
      pdf.setFont('helvetica','normal');
      let sY = 40;
      E.strongDims.slice(0, 7).forEach(s => {
        setFill([234, 247, 236]); setDraw(GR);
        pdf.rect(10, sY, W-20, 18, 'FD');
        setFill(GR); pdf.rect(10, sY, 2, 18, 'F');
        setText(K); pdf.setFontSize(13); pdf.setFont('helvetica','bold');
        pdf.text('🏆 ' + s.dim, 15, sY+8);
        setText(G); pdf.setFontSize(10); pdf.setFont('helvetica','normal');
        pdf.text(s.pub, 15, sY+14);
        setFill(GR); pdf.rect(255, sY+4, 20, 10, 'F');
        setText(WH); pdf.setFontSize(13); pdf.setFont('helvetica','bold');
        pdf.text(s.score.toFixed(1), 265, sY+11, { align:'center' });
        sY += 21;
      });
      pdf.setLineWidth(0.2);
    } else {
      setText(G); pdf.setFontSize(12); pdf.setFont('helvetica','italic');
      pdf.text('Ainda não há dimensões com score ≥ 4.0.', W/2, 100, { align:'center' });
    }
    addFooter(7);

    // ── PAGE 8: Plano de ação ──
    pdf.addPage();
    setFill(WH); pdf.rect(0, 0, W, H, 'F');
    addHeader('07 · STATUS DO PLANO', 'Plano de Ação');
    // Stats strip
    const pStats = [
      { lbl:'TOTAL', val:E.planStats.total, color:K },
      { lbl:'ABERTAS', val:E.planStats.open, color:G },
      { lbl:'EM CURSO', val:E.planStats.progress, color:Y },
      { lbl:'CONCLUÍDAS', val:E.planStats.done, color:GR },
      { lbl:'PRIORIDADE ALTA', val:E.planStats.high, color:R },
    ];
    pStats.forEach((p, i) => {
      const x = 10 + i * 55;
      setFill(CR); setDraw(LG);
      pdf.rect(x, 36, 52, 22, 'FD');
      setText(G); pdf.setFontSize(7); pdf.setFont('helvetica','bold');
      pdf.text(p.lbl, x+2, 42, { charSpace:0.5 });
      setText(p.color); pdf.setFontSize(26); pdf.setFont('helvetica','bold');
      pdf.text(String(p.val), x+2, 56);
    });

    // Ações
    if (E.actions.length) {
      let aY = 68;
      setFill(K); pdf.rect(10, aY, W-20, 8, 'F');
      setText(Y); pdf.setFontSize(9); pdf.setFont('helvetica','bold');
      pdf.text('AÇÃO', 13, aY+5.5);
      pdf.text('PRI.', 160, aY+5.5, { align:'center' });
      pdf.text('RESPONSÁVEL', 190, aY+5.5);
      pdf.text('PRAZO', 245, aY+5.5, { align:'center' });
      pdf.text('STATUS', 275, aY+5.5, { align:'center' });
      aY += 8;
      E.actions.slice(0, 7).forEach((a, i) => {
        const rowH = 12;
        setFill(i%2 ? WH : [250, 248, 240]);
        pdf.rect(10, aY, W-20, rowH, 'F');
        setText(K); pdf.setFontSize(9); pdf.setFont('helvetica','bold');
        const tLines = wrapText(a.title || '', 140, 9);
        pdf.text(tLines[0] || '', 13, aY+7);
        const priColor = (a.pri === 'Alta' || a.pri === 'Crítica') ? R : (a.pri === 'Média' ? Y : G);
        setText(priColor); pdf.setFontSize(9);
        pdf.text(a.pri || '—', 160, aY+7, { align:'center' });
        setText(G); pdf.setFontSize(9); pdf.setFont('helvetica','normal');
        pdf.text((a.owner || 'A definir').substring(0, 22), 190, aY+7);
        pdf.text(fmtDate(a.deadline), 245, aY+7, { align:'center' });
        const stLbl = a.status === 'done' ? 'Concluída' : a.status === 'progress' ? 'Em curso' : 'Aberta';
        const stColor = a.status === 'done' ? GR : a.status === 'progress' ? Y : G;
        setText(stColor); pdf.setFont('helvetica','bold');
        pdf.text(stLbl, 275, aY+7, { align:'center' });
        aY += rowH;
      });
      setDraw(LG); pdf.rect(10, 68, W-20, aY-68);
    } else {
      setFill(CR); setDraw(LG); pdf.rect(40, 90, W-80, 30, 'FD');
      setText(G); pdf.setFontSize(11); pdf.setFont('helvetica','italic');
      pdf.text('Nenhuma ação registrada ainda.', W/2, 103, { align:'center' });
      pdf.text('Próximo passo: consolidar achados em ações específicas.', W/2, 110, { align:'center' });
    }
    addFooter(8);

    // ── PAGE 9: Gaps ──
    pdf.addPage();
    setFill(WH); pdf.rect(0, 0, W, H, 'F');
    addHeader('08 · LIDERANÇAS vs COLABORADORES', 'Gaps de Percepção');
    if (E.gaps.length) {
      setText(G); pdf.setFontSize(9); pdf.setFont('helvetica','italic');
      pdf.text('Diferença > 0.5 pontos entre liderança e colaboradores. Indica desconexão de percepção.', 10, 32);
      pdf.setFont('helvetica','normal');
      let gY = 40;
      E.gaps.slice(0, 5).forEach(g => {
        setFill(WH); setDraw(LG);
        pdf.rect(10, gY, W-20, 22, 'FD');
        setFill(Y); pdf.rect(10, gY, 2, 22, 'F');
        setText(K); pdf.setFontSize(13); pdf.setFont('helvetica','bold');
        const dimLines = wrapText(g.dim, 130, 13);
        pdf.text(dimLines[0] || '', 15, gY+13);
        // Colaboradores
        setText(G); pdf.setFontSize(8); pdf.setFont('helvetica','normal');
        pdf.text('Colaboradores', 170, gY+7, { align:'center' });
        setText(Y); pdf.setFontSize(16); pdf.setFont('helvetica','bold');
        pdf.text(g.internos.toFixed(1), 170, gY+17, { align:'center' });
        // Arrow
        setText(G); pdf.setFontSize(14); pdf.setFont('helvetica','normal');
        pdf.text('→', 198, gY+14, { align:'center' });
        // Lideranças
        setText(G); pdf.setFontSize(8);
        pdf.text('Lideranças', 225, gY+7, { align:'center' });
        setText(R); pdf.setFontSize(16); pdf.setFont('helvetica','bold');
        pdf.text(g.liderancas.toFixed(1), 225, gY+17, { align:'center' });
        // Gap
        setText(G); pdf.setFontSize(8); pdf.setFont('helvetica','normal');
        pdf.text('GAP', 270, gY+7, { align:'center' });
        setText(K); pdf.setFontSize(16); pdf.setFont('helvetica','bold');
        pdf.text(g.diff.toFixed(1), 270, gY+17, { align:'center' });
        gY += 25;
      });
    } else {
      setFill([234, 247, 236]); setDraw(GR); pdf.setLineWidth(1);
      pdf.rect(40, 80, W-80, 50, 'FD');
      setText(GR); pdf.setFontSize(36); pdf.setFont('helvetica','bold');
      pdf.text('✓', W/2, 105, { align:'center' });
      setText(K); pdf.setFontSize(13); pdf.setFont('helvetica','bold');
      pdf.text('Liderança e colaboradores com percepções alinhadas.', W/2, 118, { align:'center' });
      setText(G); pdf.setFontSize(10); pdf.setFont('helvetica','normal');
      pdf.text('Nenhum gap > 0.5 identificado.', W/2, 125, { align:'center' });
      pdf.setLineWidth(0.2);
    }
    addFooter(9);

    // ── PAGE 10: Próximos passos ──
    pdf.addPage();
    setFill(WH); pdf.rect(0, 0, W, H, 'F');
    addHeader('09 · ROADMAP', 'Próximos Passos');
    const steps = [
      { phase:'CONCLUÍDO', title:'Coleta', desc:E.total + ' respondentes participaram.', color:GR, bg:[234, 247, 236] },
      { phase:'AGORA', title:'Devolutiva', desc:'Apresentar resultados por área em até 30 dias.', color:Y, bg:[255, 248, 234] },
      { phase:'PRÓXIMO', title:'Execução', desc:'Implementar plano de ação com acompanhamento trimestral.', color:K, bg:CR },
      { phase:'HORIZONTE', title:'Nova Pesquisa', desc:'Reaplicar em Out/2026 para medir evolução.', color:G, bg:WH },
    ];
    steps.forEach((st, i) => {
      const x = 10 + i * 69.5;
      setFill(st.bg); setDraw(LG);
      pdf.rect(x, 40, 66, 110, 'FD');
      setFill(st.color); pdf.rect(x, 40, 66, 2, 'F');
      setText(st.color); pdf.setFontSize(8); pdf.setFont('helvetica','bold');
      pdf.text(st.phase, x+3, 50, { charSpace:1 });
      setText(K); pdf.setFontSize(18); pdf.setFont('helvetica','bold');
      pdf.text(st.title, x+3, 65);
      setText(G); pdf.setFontSize(10); pdf.setFont('helvetica','normal');
      const dLines = wrapText(st.desc, 60, 10);
      pdf.text(dLines, x+3, 78);
    });
    // CTA
    setFill(K); pdf.rect(10, 165, W-20, 15, 'F');
    setText(Y); pdf.setFontSize(10); pdf.setFont('helvetica','italic');
    pdf.text('Este relatório é dinâmico. Ao atualizar ações no painel, reexporte para a versão mais recente.', W/2, 175, { align:'center' });
    addFooter(10);

    const fname = 'odara_resumo_executivo_' + new Date().toISOString().split('T')[0] + '.pdf';
    pdf.save(fname);
    showExportStatus('✅ PDF exportado!', 'success');
  } catch (e) {
    console.error('Erro ao gerar PDF:', e);
    showExportStatus('⚠️ Erro ao gerar PDF: ' + e.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}
window.exportExecutivePDF = exportExecutivePDF;


const TITLES = {
  overview:'Visão Geral', dimensions:'Dimensões', heatmap:'Heatmap de Gaps',
  verbatim:'Respostas Abertas', insights:'Insights Estratégicos',
  actions:'Plano de Ação', executive:'Resumo Executivo',
  interpretation:'Tabela de Interpretação',
  config:'Configuração',
};
function showTab(id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('active'));
  document.getElementById('content-' + id).classList.add('active');
  document.getElementById('tab-' + id).classList.add('active');
  document.getElementById('tab-title').textContent = TITLES[id];
  var sb = document.getElementById('sidebar'); if(sb) sb.classList.remove('sb-open');
  // Re-renderizar resumo executivo sempre que abrir (para refletir mudanças no plano de ação)
  if (id === 'executive') { try { renderExecutiveSummary(); } catch(e) { console.error('Erro renderExecutive:', e); } }
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
