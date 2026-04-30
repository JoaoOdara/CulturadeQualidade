/* ── ODARA DASHBOARD v6.8 — Auditoria de qualidade do dado (straight-lining + tempo<90s + filtro audit_status) ── */
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

// ── AUDITORIA DE QUALIDADE DO DADO (v6.8) ────────────────────────────────────
// Thresholds editáveis em tempo real na aba "Auditoria de qualidade"
let AUDIT_THRESHOLDS = {
  minSeconds:   90,    // duração mínima (s) — abaixo disso flag de tempo
  maxVariance:  0.5,   // variância populacional máxima — abaixo disso flag de straight-lining
  minResponsesForVariance: 5, // n mínimo para calcular variância significativa
};
// Quando true, respondentes com audit_status='confirmed' são EXCLUÍDOS de
// todos os cálculos (visão geral, dimensões, heatmap, drill-down, insights).
// O toggle vive na aba de Auditoria.
let EXCLUDE_CONFIRMED = true;
let LAST_AUDIT_SNAPSHOT = null; // cache para a tabela
// ──────────────────────────────────────────────────────────────────────────────

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
  safe(() => renderVerbatim(), 'renderVerbatim');
  safe(renderStrategicInsights, 'renderStrategicInsights');
  safe(renderActions, 'renderActions');
  safe(renderExecutiveSummary, 'renderExecutiveSummary');
  safe(renderInterpretationTable, 'renderInterpretationTable');
  safe(initConfigFields, 'initConfigFields');
  safe(updateBadge, 'updateBadge');
  safe(updateAuditBanner, 'updateAuditBanner');
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
    // 1. Respondentes com segmentação + campos de auditoria (v6.8)
    const allRespondents = await window.sbSelect(
      '/respondents?select=id,survey_type,submitted_at,seg_audience,seg_area,seg_shift,seg_tenure,seg_level,started_at,duration_seconds,audit_status,audit_notes'
    );

    // ── Filtro de auditoria: separa quem fica fora dos cálculos oficiais ──
    const excludedIds = new Set();
    let respondents = allRespondents || [];
    if (EXCLUDE_CONFIRMED) {
      const kept = [];
      respondents.forEach(r => {
        if (r.audit_status === 'confirmed') excludedIds.add(r.id);
        else kept.push(r);
      });
      respondents = kept;
    }
    const excludedCount = excludedIds.size;

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
    //    PAGINAÇÃO: PostgREST tem limite padrão de 1000 rows. Para pesquisas
    //    com muitos respondentes (89 × ~20 perguntas = ~1780 rows) precisamos
    //    buscar em páginas de 1000 até esgotar.
    const responses = [];
    const PAGE_SIZE = 1000;
    let offset = 0;
    let keepPaging = true;
    while (keepPaging) {
      const page = await window.sbSelect(
        '/responses?select=value_numeric,survey_type,question_id,respondent_id' +
        '&value_numeric=not.is.null' +
        '&order=respondent_id.asc' +
        '&limit=' + PAGE_SIZE +
        '&offset=' + offset
      );
      if (!page || !page.length) break;
      responses.push(...page);
      if (page.length < PAGE_SIZE) keepPaging = false;
      else offset += PAGE_SIZE;
      if (offset > 50000) { console.warn('[Odara] Paginação interrompida em 50k rows'); break; }
    }
    console.info('[Odara] Respostas carregadas em', Math.ceil(responses.length/PAGE_SIZE), 'página(s):', responses.length, 'rows');

    // ── Aplicar filtro de auditoria também nas respostas (v6.8) ──
    // Guardamos o conjunto sem filtro para a aba de Auditoria, e o conjunto
    // filtrado é o que alimenta todos os cálculos oficiais abaixo.
    const allResponses = responses.slice();
    const filteredResponses = excludedIds.size
      ? responses.filter(r => !excludedIds.has(r.respondent_id))
      : responses;
    // a partir daqui o restante do código usa `responses` como conjunto oficial:
    responses.length = 0;
    Array.prototype.push.apply(responses, filteredResponses);

    // 4. Respostas abertas — buscar por question_id das abertas diretamente
    const openQids = 'question_id=in.(I24,I25,I26,L19,L20,L21,F13,F14,F15,D13,D14,D15)';
    const openResp = await window.sbSelect(
      '/responses?select=value,question_id,survey_type,respondent_id&' + openQids + '&value=not.is.null&limit=500'
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

    // Verbatim — enriquecer com area via lookup no respondents
    const respAreaMap = {};
    (respondents || []).forEach(r => { respAreaMap[r.id] = r.seg_area || 'Geral'; });
    const OPEN_IDS = new Set(['I24','I25','I26','L19','L20','L21','F13','F14','F15','D13','D14','D15']);
    const verbatim = (openResp || [])
      .filter(r => r.value && r.value.trim().length > 2 && OPEN_IDS.has(r.question_id))
      .map(r => {
        let type = 'actions';
        if (['I24','L19','F13','D13'].includes(r.question_id)) type = 'strengths';
        else if (['I25','L20','F14','D14'].includes(r.question_id)) type = 'weaknesses';
        const audLabel = {internos:'Colaborador',liderancas:'Liderança',fornecedores:'Fornecedor',distribuidores:'Distribuidor'};
        return {
          type,
          aud: audLabel[r.survey_type] || r.survey_type,
          txt: r.value,
          qid: r.question_id,
          survey_type: r.survey_type,
          area: respAreaMap[r.respondent_id] || 'Geral',
        };
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

    DATA = {
      total, audCounts, audScores, dims, overallScore, distPct, verbatim,
      respondents: respondents || [],          // FILTRADO — usado nos cálculos oficiais
      rawResponses: responses || [],           // FILTRADO — usado nos drill-downs
      // Auditoria (v6.8) — sem filtro, para a aba de Auditoria de Qualidade
      allRespondents: allRespondents || [],
      allResponses: allResponses || [],
      excludedCount,                           // quantos confirmed foram excluídos
      excludedIds: Array.from(excludedIds),
    };
    console.info('[Odara] Dados carregados:', total, 'respondentes oficiais,',
      allNums.length, 'respostas numéricas oficiais',
      excludedCount ? `(${excludedCount} excluído(s) por auditoria)` : '');
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
      // Testar se temos respostas brutas associáveis a este público
      // (casa survey_type + respondent_id conhecido)
      const totalAudResp = rawResp.filter(r => r.survey_type === audience).length;
      const validRespCount = rawResp.filter(r =>
        r.survey_type === audience &&
        respArea[r.respondent_id] !== undefined
      ).length;

      console.info(`[Odara] Heatmap ${audience}: ${areas.length} áreas, ${totalAudResp} respostas do público, ${validRespCount} associáveis`);

      if (validRespCount > 0) {
        const enrichedRows = dimList.map(dim => {
          const scoresByArea = {};
          const lowByArea = {};
          areas.forEach(a => { scoresByArea[a] = []; lowByArea[a] = 0; });
          rawResp.forEach(r => {
            if (r.survey_type !== audience || Q_DIM_MAP[r.question_id] !== dim) return;
            const val = parseFloat(r.value_numeric);
            if (isNaN(val) || val < 1 || val > 5) return;
            const area = respArea[r.respondent_id];
            if (!area || !scoresByArea[area]) return;
            scoresByArea[area].push(val);
            if (val <= 2) lowByArea[area]++;
          });
          const scores = areas.map(a => {
            const vals = scoresByArea[a] || [];
            return vals.length ? parseFloat((vals.reduce((x,y)=>x+y,0)/vals.length).toFixed(2)) : null;
          });
          const meta = areas.map(a => ({ n: (scoresByArea[a] || []).length, low: lowByArea[a] || 0 }));
          // Só descarta linha se TODAS as áreas ficaram vazias — mas se temos o score
          // geral em DATA.dims para essa dim, ainda assim queremos mostrá-la
          if (scores.every(s => s === null)) return null;
          return { name: dim.length > 25 ? dim.split(' ')[0] : dim, full: dim, scores, meta };
        }).filter(Boolean);

        // Se o breakdown produziu dados para pelo menos a metade das dimensões, usa ele
        if (enrichedRows.length >= Math.ceil(dimList.length / 2)) {
          console.info(`[Odara] Heatmap ${audience}: breakdown por ${areas.length} áreas (${enrichedRows.length}/${dimList.length} dims)`);
          return { areas, rows: enrichedRows };
        }
        // Caso contrário, cai no fallback de Score geral (abaixo)
        console.warn(`[Odara] Heatmap ${audience}: breakdown por área incompleto (${enrichedRows.length}/${dimList.length}) — usando Score geral`);
      } else {
        console.warn(`[Odara] Heatmap ${audience}: rawResponses não associáveis a respondentes — usando Score geral`);
      }
    }

    // Fallback: Score geral — também enriquecer com lowCount para consistência
    const rawResp = DATA.rawResponses || [];
    const rowsWithMeta = rows.map(row => {
      const vals = rawResp
        .filter(r => r.survey_type === audience && Q_DIM_MAP[r.question_id] === row.full)
        .map(r => parseFloat(r.value_numeric))
        .filter(v => !isNaN(v) && v >= 1 && v <= 5);
      const low = vals.filter(v => v <= 2).length;
      return { ...row, meta: [{ n: vals.length, low }] };
    });
    return { areas: ['Score geral'], rows: rowsWithMeta };
  }

  const rawResp = DATA.rawResponses || [];
  const fallbackRows = dimList.map(dim => {
    const vals = rawResp.filter(r => r.survey_type === audience && Q_DIM_MAP[r.question_id] === dim)
      .map(r => parseFloat(r.value_numeric)).filter(v => !isNaN(v) && v >= 1 && v <= 5);
    if (!vals.length) return null;
    const avg = parseFloat((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2));
    const low = vals.filter(v => v <= 2).length;
    return { name: dim.length > 25 ? dim.split(' ')[0] : dim, full: dim, scores: [avg], meta:[{ n: vals.length, low }] };
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
    const cntLabel = (a !== 'Score geral' && cnt) ? `<div style="font-size:8px;font-weight:500;color:var(--g);margin-top:1px;">${cnt} resp.</div>` : '';
    html += `<th class="hm-th" style="text-align:center;vertical-align:top;">${a}${cntLabel}</th>`;
  });
  html += `</tr></thead><tbody>`;

  data.rows.forEach((row, di) => {
    html += `<tr><td class="hm-dn">${row.name}</td>`;
    row.scores.forEach((sc, ai) => {
      // Célula sem dados — renderizar vazia, não-clicável
      if (sc === null || sc === undefined || isNaN(sc)) {
        html += `<td class="hm-cell hm-empty" style="background:rgba(12,12,12,.03);color:#B0A9A0;cursor:default;"
          title="${row.full} · ${data.areas[ai]}: sem respostas">—</td>`;
        return;
      }
      const bg = heatColor(sc);
      const tc = sc < 3.2 ? '#fff' : '#0C0C0C';
      const isSel = heatSel && heatSel.audience===audience && heatSel.di===di && heatSel.ai===ai;
      // Alerta: ≥2 notas baixas ou (≥1 nota baixa com todas sendo baixas)
      const cellMeta = (row.meta && row.meta[ai]) ? row.meta[ai] : null;
      const alertCell = cellMeta && (
        cellMeta.low >= 2 ||
        (cellMeta.low >= 1 && cellMeta.n >= 2 && cellMeta.low === cellMeta.n)
      );
      const alertMark = alertCell ? `<span class="hm-alert" title="${cellMeta.low} de ${cellMeta.n} respostas ≤ 2">!</span>` : '';
      const alertTitle = alertCell ? ` · ⚠️ ${cellMeta.low} nota(s) ≤ 2` : '';
      html += `<td class="hm-cell${isSel?' hm-sel':''}${alertCell?' hm-alert-cell':''}" style="background:${bg};color:${tc};"
        onclick="selectHmCell('${audience}',${di},${ai},'${row.full}','${data.areas[ai]}',${sc})"
        title="${row.full} · ${data.areas[ai]}: ${sc.toFixed(1)} (${matLabel(sc)})${alertTitle}">${sc.toFixed(1)}${alertMark}</td>`;
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

// ── Análise léxica de verbatim ──
// Stopwords PT-BR + domínio
const VB_STOPWORDS = new Set([
  'a','o','e','é','de','do','da','em','um','uma','para','por','com','sem','que','se','na','no','as','os',
  'nos','nas','dos','das','ou','mas','como','mais','menos','muito','pouco','não','sim','já','só','também',
  'sempre','nunca','aqui','ali','lá','isso','isto','aquilo','esse','essa','este','esta','aquele','aquela',
  'meu','minha','seu','sua','nosso','nossa','todo','toda','todos','todas','outro','outra','outros','outras',
  'ser','estar','ter','fazer','ir','vir','poder','dever','querer','saber','ver','dar','pegar','colocar',
  'aí','ao','à','às','aos','pra','pro','num','numa','nuns','numas','dum','duma','duns','dumas','e/ou',
  'então','porque','quando','onde','quem','qual','cada','deve','pode','ficar','haver','então','assim',
  'bem','tudo','tal','cerca','tanto','tão','eu','ele','ela','nós','vós','vocês','você','nosso','nossas',
  'coisa','coisas','gente','pessoa','pessoas','sobre','até','desde','sobre','enquanto','embora','porém',
  'durante','entre','antes','depois','agora','hoje','ontem','amanhã','parece','acho','talvez','apenas',
  'algo','alguém','alguma','algum','algumas','alguns','nenhum','nenhuma','vezes','vez','certa','certo',
  'dia','dias','mês','mes','ano','anos','hora','horas','área','areas','areas','odara',
]);

// Mapeamento de temas → palavras-chave (radicais/prefixos)
const VB_THEMES = [
  { key:'treinamento',     label:'Treinamento & Capacitação', icon:'🎓', color:'#3498DB',
    keywords:['treina','curso','capacit','aprend','ensina','instru','qualific','palestr','workshop','educ'] },
  { key:'lideranca',       label:'Liderança & Gestão',        icon:'🏆', color:'#EE2737',
    keywords:['lider','gestor','chefe','superior','supervisor','gerent','dire','comando','exempl'] },
  { key:'comunicacao',     label:'Comunicação & Feedback',    icon:'💬', color:'#9B59B6',
    keywords:['comuni','inform','aviso','reuni','feedback','ouvi','escut','diálog','dialog','conver','transp'] },
  { key:'higiene',         label:'Higiene & BPF',             icon:'🧼', color:'#27AE60',
    keywords:['higien','limp','sanit','mãos','maos','unha','cabelo','epi','luva','touc','avental','bata','desinfet'] },
  { key:'processo',        label:'Processos & Padrões',       icon:'📋', color:'#FFB81D',
    keywords:['process','procediment','pop','padrão','padrao','rotina','checklist','instru','manual','fluxo'] },
  { key:'equipamento',     label:'Equipamentos & Infraestrutura', icon:'⚙️', color:'#7F8C8D',
    keywords:['equipa','máquin','maquin','ferrament','utensil','manuten','instala','infra','calibra','prevent'] },
  { key:'reporte',         label:'Reporte & Sugestões',       icon:'🔔', color:'#E67E22',
    keywords:['report','denun','sugest','ideia','opini','sugerir','falar','levant','problema','alerta','anonim'] },
  { key:'pressao',         label:'Pressão & Ritmo',           icon:'⏱️', color:'#C0392B',
    keywords:['pressão','pressao','correri','apress','rapidez','urgent','sobrecarg','estress','prazo','ritmo'] },
  { key:'qualidade',       label:'Qualidade & NC',            icon:'✅', color:'#27AE60',
    keywords:['qualidade','defeito','falha','retrabalh','nc','não conforme','nao conforme','rejei','refu','desvio'] },
  { key:'rastreabilidade', label:'Rastreabilidade',           icon:'🔍', color:'#16A085',
    keywords:['rastrea','lote','código','codigo','registr','identifi','recall'] },
  { key:'alergenicos',     label:'Alergênicos',               icon:'⚠️', color:'#E74C3C',
    keywords:['alergên','alergen','alérgi','alergi','glúten','gluten','leite','ovo','soja'] },
  { key:'produto',         label:'Produto & Receita',         icon:'🍪', color:'#D4A017',
    keywords:['produto','alfajor','receita','ingredient','matéria','materia','formula','sabor','aparênc','aparenc'] },
  { key:'cultura',         label:'Cultura & Ambiente',        icon:'🤝', color:'#8E44AD',
    keywords:['cultura','ambient','respeit','clima','relaç','relac','parceri','integra','engajam','envolv','mottv','motiva'] },
  { key:'fornecedores',    label:'Fornecedores',              icon:'📦', color:'#2980B9',
    keywords:['fornecedor','matéria-prima','materia-prima','insumo','homolog','embalagem','transport','recebi'] },
  { key:'fraude_defesa',   label:'Food Fraud & Defense',      icon:'🛡️', color:'#34495E',
    keywords:['fraude','adulter','defesa','defens','taccp','vaccp','vulner','autentic','integrid'] },
];

// Léxicos de sentimento
const VB_POSITIVE = new Set([
  'bom','boa','bons','boas','ótim','otim','excelent','melhor','perfeit','satisf','competent','eficient',
  'funcional','funciona','gosto','gostei','parabéns','parabens','positiv','forte','consist','organiz',
  'claro','comprometi','dedica','valoriz','bem','adequ','apropri','seguro','confi','cuidad','atencion',
  'rápid','rapid','ágil','agil','prátic','pratic','fácil','facil','tranquil','colabor','envolv','engaj',
]);
const VB_NEGATIVE = new Set([
  'ruim','ruins','fraco','fraca','fracos','fracas','péssim','pessim','falt','falha','problem','erro',
  'dificul','pior','insatisf','incompet','ineficient','demor','lent','confus','desorgan','falho',
  'perdi','descuid','negligen','descaso','desrespeit','preocup','risc','medo','receio','crítica','critic',
  'frustra','reclama','insuficient','deficient','obsolet','antigu','caro','caros','complicad',
]);

function analyzeVerbatim(list) {
  if (!list || !list.length) return null;

  const totalResp = list.length;
  const allText = list.map(v => (v.txt || '').toLowerCase()).join(' ');
  const totalChars = allText.length;

  // Tokenização simples: remove pontuação, split em whitespace
  const tokens = allText
    .replace(/[.,;:!?()\[\]{}"'`«»\/\\\-–—_]+/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !VB_STOPWORDS.has(t) && !/^\d+$/.test(t));

  const avgWords = Math.round(tokens.length / totalResp);

  // Top termos (lemas simples: reduz "treinamentos" → "treinamento" por corte)
  const termCount = {};
  tokens.forEach(t => { termCount[t] = (termCount[t] || 0) + 1; });
  const topTerms = Object.entries(termCount)
    .filter(([t, n]) => n >= 2) // só termos recorrentes
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  // Bigramas (termos adjacentes sem stopwords no meio)
  const bigramCount = {};
  list.forEach(v => {
    const words = (v.txt || '').toLowerCase()
      .replace(/[.,;:!?()\[\]{}"'`«»\/\\\-–—_]+/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 3 && !VB_STOPWORDS.has(t) && !/^\d+$/.test(t));
    for (let i = 0; i < words.length - 1; i++) {
      const bg = words[i] + ' ' + words[i + 1];
      bigramCount[bg] = (bigramCount[bg] || 0) + 1;
    }
  });
  const topBigrams = Object.entries(bigramCount)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Temas: para cada tema, contar respostas que contêm ao menos uma keyword
  const themeStats = VB_THEMES.map(th => {
    const matches = list.filter(v => {
      const t = (v.txt || '').toLowerCase();
      return th.keywords.some(kw => t.includes(kw));
    });
    return {
      ...th,
      count: matches.length,
      pct: totalResp ? Math.round((matches.length / totalResp) * 100) : 0,
      samples: matches.slice(0, 3).map(v => ({
        qid: v.qid, aud: v.aud, area: v.area, txt: v.txt, type: v.type,
      })),
      // split por sentimento dentro do tema
      positiveCount: matches.filter(v => v.type === 'strengths').length,
      negativeCount: matches.filter(v => v.type === 'weaknesses').length,
      actionCount: matches.filter(v => v.type === 'actions').length,
    };
  }).filter(th => th.count > 0).sort((a, b) => b.count - a.count);

  // Sentimento: contar tokens que batem com listas positivas/negativas (prefixo)
  let posHits = 0, negHits = 0;
  const checkSentiment = (token, set) => {
    for (const w of set) {
      if (token.startsWith(w)) return true;
    }
    return false;
  };
  tokens.forEach(t => {
    if (checkSentiment(t, VB_POSITIVE)) posHits++;
    else if (checkSentiment(t, VB_NEGATIVE)) negHits++;
  });
  const sentimentTotal = posHits + negHits || 1;
  const posScore = Math.round((posHits / sentimentTotal) * 100);
  const negScore = Math.round((negHits / sentimentTotal) * 100);

  // Breakdown por tipo
  const byType = { strengths: 0, weaknesses: 0, actions: 0 };
  list.forEach(v => { byType[v.type] = (byType[v.type] || 0) + 1; });

  // Breakdown por público
  const byAud = {};
  list.forEach(v => { byAud[v.aud] = (byAud[v.aud] || 0) + 1; });

  return {
    totalResp, totalChars, avgWords,
    uniqueTerms: Object.keys(termCount).length,
    topTerms, topBigrams,
    themeStats,
    posHits, negHits, posScore, negScore, sentimentTotal: posHits + negHits,
    byType, byAud,
  };
}

// Estado dos filtros de verbatim
let vbState = { type: 'all', audience: 'all', area: 'all' };

function filterVbType(type, btn) {
  document.querySelectorAll('.vb-btn-type').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  vbState.type = type;
  renderVerbatim();
}
function filterVbAud(audience) {
  vbState.audience = audience;
  // Ao mudar público, resetar área (já que áreas dependem do público)
  vbState.area = 'all';
  renderVerbatim();
}
function filterVbArea(area) {
  vbState.area = area;
  renderVerbatim();
}
window.filterVbType = filterVbType;
window.filterVbAud = filterVbAud;
window.filterVbArea = filterVbArea;

// Compat: antigo filterVb chamado pelos botões (tipo)
function filterVb(type, btn) { filterVbType(type, btn); }
window.filterVb = filterVb;

function renderVerbatim(_compatArg) {
  const el = document.getElementById('verbatim-list');
  if (!el) return;
  const vb = (DATA && DATA.verbatim) ? DATA.verbatim : [];

  // Aplicar filtros em cadeia
  let list = vb.slice();
  if (vbState.type !== 'all') list = list.filter(v => v.type === vbState.type);
  if (vbState.audience !== 'all') list = list.filter(v => v.survey_type === vbState.audience);
  if (vbState.area !== 'all') list = list.filter(v => v.area === vbState.area);

  console.info(`[Odara] Verbatim: ${vb.length} total → ${list.length} (tipo:${vbState.type}, pub:${vbState.audience}, área:${vbState.area})`);

  // ── Construir dropdowns de filtros dinâmicos ──
  const audCounts = {};
  vb.forEach(v => { audCounts[v.survey_type] = (audCounts[v.survey_type] || 0) + 1; });
  const AUD_LBL = { internos:'Colaboradores', liderancas:'Lideranças', fornecedores:'Fornecedores', distribuidores:'Distribuidores' };

  const audOptions = ['<option value="all">Todos os públicos (' + vb.length + ')</option>']
    .concat(
      Object.entries(audCounts).sort((a, b) => b[1] - a[1])
        .map(([k, n]) => `<option value="${k}"${vbState.audience === k ? ' selected' : ''}>${AUD_LBL[k] || k} (${n})</option>`)
    ).join('');

  // Áreas depende do público atual
  const areaSource = vbState.audience === 'all' ? vb : vb.filter(v => v.survey_type === vbState.audience);
  const areaCounts = {};
  areaSource.forEach(v => { areaCounts[v.area] = (areaCounts[v.area] || 0) + 1; });
  const areaOptions = ['<option value="all">Todas as áreas (' + areaSource.length + ')</option>']
    .concat(
      Object.entries(areaCounts).sort((a, b) => b[1] - a[1])
        .map(([a, n]) => `<option value="${a}"${vbState.area === a ? ' selected' : ''}>${a} (${n})</option>`)
    ).join('');

  const filterBarHtml = `
    <div class="vb-filters-adv">
      <div class="vb-fl-grp">
        <label>Público:</label>
        <select class="hm-sel" onchange="filterVbAud(this.value)">${audOptions}</select>
      </div>
      <div class="vb-fl-grp">
        <label>Área:</label>
        <select class="hm-sel" onchange="filterVbArea(this.value)">${areaOptions}</select>
      </div>
      ${(vbState.type !== 'all' || vbState.audience !== 'all' || vbState.area !== 'all')
        ? `<button class="hm-rst" onclick="vbState={type:'all',audience:'all',area:'all'};document.querySelectorAll('.vb-btn-type').forEach(b=>b.classList.remove('active'));document.querySelector('.vb-btn-type[data-type=all]')?.classList.add('active');renderVerbatim();">× Limpar filtros</button>`
        : ''}
    </div>
  `;

  // ── Análise ──
  const analysis = analyzeVerbatim(list);
  const analysisHtml = analysis ? buildVerbatimAnalysis(analysis) : '';

  // ── Empty state ──
  if (!list.length) {
    el.innerHTML = filterBarHtml + emptyState(
      vb.length
        ? 'Nenhuma resposta bate com os filtros aplicados. Ajuste os filtros acima.'
        : 'Nenhuma resposta aberta registrada ainda. Aparecerão aqui quando os respondentes preencherem as perguntas abertas (I24–I26, L19–L21, F13–F15, D13–D15).'
    );
    return;
  }

  // Agrupar por question_id para exibição
  const byQ = {};
  list.forEach(v => {
    const qid = v.qid || 'outros';
    if (!byQ[qid]) byQ[qid] = [];
    byQ[qid].push(v);
  });

  const ORDER = ['I24','I25','I26','L19','L20','L21','F13','F14','F15','D13','D14','D15'];
  const qids = Object.keys(byQ).sort((a, b) => {
    const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  const typeStyle = {
    strengths:  { ico:'💪', lbl:'Ponto Forte',     color:'#27AE60', bg:'rgba(39,174,96,.05)',  border:'#27AE60' },
    weaknesses: { ico:'⚠️', lbl:'Ponto Fraco',      color:'#E67E22', bg:'rgba(230,126,34,.05)', border:'#E67E22' },
    actions:    { ico:'⚡', lbl:'Sugestão de Ação', color:'#3498DB', bg:'rgba(52,152,219,.05)', border:'#3498DB' },
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
          <span style="color:var(--g);">📍 ${v.area}</span>
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
        <span style="font-size:9.5px;color:var(--g);background:rgba(255,255,255,.7);padding:2px 8px;border-radius:10px;font-weight:600;">${items.length} resposta${items.length > 1 ? 's' : ''}</span>
      </div>
      <div style="padding-left:8px;">${itemsHtml}</div>
    </div>`;
  }).join('');

  el.innerHTML = filterBarHtml + analysisHtml + `<div style="font-size:9.5px;color:var(--g);margin-bottom:14px;">Exibindo ${list.length} resposta(s) em ${qids.length} pergunta(s)</div>${groupsHtml}`;
}

function buildVerbatimAnalysis(A) {
  if (!A || !A.totalResp) return '';

  // KPIs
  const kpis = `
    <div class="vb-ana-kpis">
      <div class="vb-kpi"><div class="vb-kv">${A.totalResp}</div><div class="vb-kl">respostas</div></div>
      <div class="vb-kpi"><div class="vb-kv">${A.avgWords}</div><div class="vb-kl">palavras / resposta</div></div>
      <div class="vb-kpi"><div class="vb-kv">${A.uniqueTerms}</div><div class="vb-kl">termos únicos</div></div>
      <div class="vb-kpi"><div class="vb-kv">${A.themeStats.length}</div><div class="vb-kl">temas detectados</div></div>
    </div>
  `;

  // Sentimento
  const sentHtml = A.sentimentTotal > 3 ? `
    <div class="vb-sent">
      <div class="vb-sent-lbl">Sinal de sentimento:</div>
      <div class="vb-sent-bar">
        <div class="vb-sent-pos" style="width:${A.posScore}%">${A.posScore > 15 ? A.posScore + '% positivo' : ''}</div>
        <div class="vb-sent-neg" style="width:${A.negScore}%">${A.negScore > 15 ? A.negScore + '% negativo' : ''}</div>
      </div>
      <div class="vb-sent-note">Baseado em ${A.sentimentTotal} ocorrências de termos afetivos. Sinal indicativo, não substitui leitura.</div>
    </div>
  ` : '';

  // Temas (grid de cards)
  const themesHtml = A.themeStats.length ? `
    <div class="vb-ana-section-h">Temas emergentes por frequência</div>
    <div class="vb-themes">
      ${A.themeStats.map(th => `
        <div class="vb-theme" style="border-left-color:${th.color};">
          <div class="vb-theme-hdr">
            <span class="vb-theme-ico">${th.icon}</span>
            <div class="vb-theme-t">${th.label}</div>
            <span class="vb-theme-n" style="color:${th.color};">${th.count}</span>
          </div>
          <div class="vb-theme-pct">${th.pct}% das respostas</div>
          <div class="vb-theme-mix">
            ${th.positiveCount ? `<span class="vb-chip pos">💪 ${th.positiveCount}</span>` : ''}
            ${th.negativeCount ? `<span class="vb-chip neg">⚠️ ${th.negativeCount}</span>` : ''}
            ${th.actionCount ? `<span class="vb-chip act">⚡ ${th.actionCount}</span>` : ''}
          </div>
          ${th.samples.length ? `<div class="vb-theme-sample">"${(th.samples[0].txt || '').substring(0, 120)}${(th.samples[0].txt || '').length > 120 ? '…' : ''}"<span style="color:var(--g);font-style:normal;"> — ${th.samples[0].aud}, ${th.samples[0].area}</span></div>` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

  // Top termos + bigramas
  const maxTerm = A.topTerms.length ? A.topTerms[0][1] : 1;
  const termsHtml = A.topTerms.length ? `
    <div class="vb-terms-col">
      <div class="vb-ana-section-h small">Termos mais frequentes</div>
      <div class="vb-term-list">
        ${A.topTerms.slice(0, 12).map(([t, n]) => `
          <div class="vb-term-row">
            <span class="vb-term">${t}</span>
            <div class="vb-term-bar"><div class="vb-term-fill" style="width:${Math.round((n / maxTerm) * 100)}%"></div></div>
            <span class="vb-term-n">${n}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const maxBg = A.topBigrams.length ? A.topBigrams[0][1] : 1;
  const bigramsHtml = A.topBigrams.length ? `
    <div class="vb-terms-col">
      <div class="vb-ana-section-h small">Expressões recorrentes (bigramas)</div>
      <div class="vb-term-list">
        ${A.topBigrams.slice(0, 10).map(([t, n]) => `
          <div class="vb-term-row">
            <span class="vb-term" style="font-style:italic;">"${t}"</span>
            <div class="vb-term-bar"><div class="vb-term-fill" style="width:${Math.round((n / maxBg) * 100)}%;background:#9B59B6;"></div></div>
            <span class="vb-term-n">${n}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  return `
    <div class="vb-analysis">
      <div class="vb-ana-hdr">
        <div class="vb-ana-ico">📊</div>
        <div>
          <div class="vb-ana-t">Análise Automática das Respostas</div>
          <div class="vb-ana-s">Contagem de temas, termos e sinal de sentimento. Use como apoio à leitura, não substitui análise qualitativa.</div>
        </div>
      </div>
      ${kpis}
      ${sentHtml}
      ${themesHtml}
      <div class="vb-terms-grid">
        ${termsHtml}
        ${bigramsHtml}
      </div>
    </div>
  `;
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
    </div>

    <div class="is-card full">
      <div class="is-title">📋 Cardápio de Ações — Estratégico · Tático · Operacional <span class="is-tag strategic">NORMATIVO</span></div>
      <div class="menu-intro">
        Recomendações técnicas estruturadas em <strong>3 horizontes de ação</strong>, alinhadas ao FSSC 22000 v6 (req. 2.5.8), ISO 22000:2018 e PAS 320:2023.
        Cada item cita a cláusula normativa correspondente. <strong>Clique em "+ Plano de Ação"</strong> para adicionar diretamente ao seu plano com prazo e prioridade pré-definidos.
        ${critDims.length ? `Exibindo prioritariamente as <strong>${critDims.filter(c => ACTION_MENU[c.dim]).length} dimensões críticas</strong> identificadas.` : 'Exibindo todas as dimensões do modelo.'}
      </div>
      ${buildActionMenuHtml(critDims.length ? critDims : null)}
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

// ══════════════════════════════════════════════════════════════
// CARDÁPIO DE AÇÕES — Estratégico / Tático / Operacional
// Baseado em: FSSC 22000 v6 (req. 2.5.8), ISO 22000:2018, GFSI Guiding
// Questions (julho/2023), PAS 320:2023
// ══════════════════════════════════════════════════════════════
const ACTION_MENU = {
  'Liderança e prioridade': {
    pillar:'D1 · Liderança',
    strategic: [
      { t:'Declaração pública de "qualidade não se negocia"', d:'Carta anual da Diretoria com compromisso explícito publicado em quadros, intranet e canais externos. Incorporar no sistema de metas corporativas.', ref:'FSSC 22000 v6 req. 2.5.8 · ISO 22000 cl. 5.1' },
      { t:'Política de Cultura de Qualidade & Segurança dos Alimentos', d:'Documento formal aprovado pela alta direção definindo valores, comportamentos esperados e indicadores culturais. Revisão anual.', ref:'ISO 22000 cl. 5.2 · PAS 320 §6.3' },
      { t:'Inclusão de FSQ Culture nos OKRs da Diretoria', d:'Metas individuais de C-level atreladas a score cultural, conclusão de ações e participação em gemba walks.', ref:'GFSI Guiding Questions §1' },
    ],
    tactical: [
      { t:'Gemba walks semanais', d:'Gerência e supervisão percorrem a fábrica 1x/semana com roteiro de observação cultural. Ata padronizada e ações registradas.', ref:'ISO 22000 cl. 9.3 · PAS 320 §7.2' },
      { t:'Reunião mensal FSQ com diretoria', d:'15-30 min com ata formal. Pauta fixa: NC recentes, reclamações, progresso do plano de ação, KPIs culturais.', ref:'ISO 22000 cl. 9.1.2' },
      { t:'Protocolo de decisão em conflito prazo × qualidade', d:'Matriz RACI com critérios objetivos. Toda decisão pró-prazo em detrimento da qualidade deve ser documentada e revisada.', ref:'ISO 22000 cl. 5.3.1' },
      { t:'Avaliação 360° de liderança em FSQ', d:'Subordinados avaliam líderes nos comportamentos FSQ 1x/ano. Resultados alimentam PDI dos líderes.', ref:'PAS 320 §8.4' },
    ],
    operational: [
      { t:'Abertura visível de turno pela liderança', d:'Supervisor abre o turno com 3 min de comunicação FSQ: alerta do dia, reforço de comportamento, reconhecimento.', ref:'FSSC 22000 v6 · ISO 22000 cl. 7.4' },
      { t:'Resposta em 48h a reportes', d:'Toda não-conformidade ou quase-acidente reportado recebe resposta visível da liderança em até 48h, mesmo que seja "estamos analisando".', ref:'ISO 22000 cl. 8.9.1' },
      { t:'Quadro de compromisso da liderança', d:'Placa física na entrada com foto, nome e "meu compromisso com qualidade" de cada líder. Atualização trimestral.', ref:'PAS 320 §7.2' },
      { t:'Reconhecimento semanal de comportamento positivo', d:'Ritual formal de 5 min no DDS para reconhecer colaborador que demonstrou comportamento exemplar em FSQ.', ref:'GFSI Guiding Questions §3' },
    ],
  },
  'Comunicação e clareza': {
    pillar:'D1/D2 · Comunicação',
    strategic: [
      { t:'Plano de Comunicação Cultural plurianual', d:'Matriz de comunicação por público (interno, fornecedor, distribuidor), canal, frequência e responsável. Revisão anual.', ref:'FSSC 22000 v6 req. 2.5.8 · ISO 22000 cl. 7.4' },
      { t:'Tradução e adaptação dos materiais críticos', d:'Todos os POPs, cartazes e treinamentos acessíveis a todos os colaboradores no idioma e nível de letramento adequados.', ref:'GFSI Guiding Questions §1' },
    ],
    tactical: [
      { t:'Matriz de comunicação FSQ formal', d:'Documento que define: quem comunica o quê, para quem, por qual canal, com que frequência. Inclui gestão de mudanças.', ref:'ISO 22000 cl. 7.4 · cl. 6.3' },
      { t:'Canal estruturado de escuta', d:'Caixa de sugestões física + formulário digital + "15 min com o gerente" semanais. Todo reporte tem tratativa visível.', ref:'PAS 320 §7.4' },
      { t:'Reunião operacional diária de qualidade', d:'Stand-up de 10 min com produção, qualidade, manutenção. Pauta: incidentes do dia anterior, riscos do dia.', ref:'ISO 22000 cl. 9.1.2' },
    ],
    operational: [
      { t:'Quadros visuais atualizados', d:'Painéis de área com indicadores FSQ, NCs recentes, ações em curso. Atualização semanal pela própria equipe.', ref:'ISO 22000 cl. 7.4' },
      { t:'DDS temático por dimensão', d:'Diálogo Diário de Segurança de 5-10 min focado numa dimensão cultural por semana, rotacionando ao longo do ano.', ref:'PAS 320 §7.5' },
      { t:'"Você sabia?" impresso no contracheque', d:'Mini-pílula de FSQ mensal (1 fato + 1 comportamento esperado) anexa ao holerite.', ref:'FSSC 22000 v6 req. 2.5.8' },
    ],
  },
  'Competência e treinamento': {
    pillar:'D2 · Treinamento',
    strategic: [
      { t:'Trilha de desenvolvimento FSQ por função', d:'Matriz de competências por cargo com conteúdos, cargas horárias e critérios de avaliação. Integrada ao onboarding.', ref:'ISO 22000 cl. 7.2 · FSSC 22000 v6 req. 2.5.8' },
      { t:'Programa de embaixadores internos de qualidade', d:'Seleção, formação avançada e certificação de colaboradores-chave para multiplicar FSQ nos turnos.', ref:'PAS 320 §7.5' },
    ],
    tactical: [
      { t:'Matriz de treinamento com validade e reciclagem', d:'Planilha viva com: quem foi treinado, em quê, quando, próxima reciclagem. Alertas automáticos de vencimento.', ref:'ISO 22000 cl. 7.2 · cl. 7.3' },
      { t:'Avaliação de eficácia de treinamento', d:'Não basta aplicar treinamento — verificar mudança de comportamento em campo 30-60 dias depois.', ref:'ISO 22000 cl. 7.2 d)' },
      { t:'On-the-job training com padrinho', d:'Todo novo colaborador tem padrinho qualificado nas primeiras 30-60 dias, com checklist de acompanhamento.', ref:'ISO 22000 cl. 7.2' },
      { t:'Módulo obrigatório de Alergênicos', d:'Capacitação prática de 2h para toda a produção cobrindo glúten, leite, ovo, soja. Certificação interna com prova.', ref:'Codex CXC 1-1969 · ANVISA RDC 26/2015' },
    ],
    operational: [
      { t:'Integração com conteúdo FSQ robusto', d:'Todo novo colaborador (inclusive temporário) recebe mínimo 4h de FSQ antes de entrar na produção.', ref:'ISO 22000 cl. 7.2 · cl. 7.3' },
      { t:'Micro-reciclagens de 10 min', d:'Ao invés de reciclagem anual de 4h, quinzenal de 10 min no DDS sobre um tema específico.', ref:'PAS 320 §7.5' },
      { t:'Visual management de competências', d:'Quadro por área mostrando quem está habilitado a operar cada posto com código de cores (verde/amarelo/vermelho).', ref:'ISO 22000 cl. 7.2' },
    ],
  },
  'Disciplina operacional': {
    pillar:'D3 · Conformidade',
    strategic: [
      { t:'Política de disciplina justa (Just Culture)', d:'Documento que diferencia erro humano (apoio), negligência (coaching) e imprudência deliberada (sanção). Aprovado por RH + Diretoria.', ref:'PAS 320 §7.3 · FSSC 22000 v6' },
      { t:'KPIs de disciplina operacional no painel executivo', d:'% aderência a POPs, reincidência de NCs, tempo médio de correção entram nos relatórios mensais para diretoria.', ref:'ISO 22000 cl. 9.1.2' },
    ],
    tactical: [
      { t:'Auditoria interna layered (multi-nível)', d:'Operador se auto-audita diário · supervisor audita semanal · gerente audita mensal · qualidade audita trimestral. Checklists diferentes por nível.', ref:'ISO 22000 cl. 9.2' },
      { t:'Revisão de POPs com quem executa', d:'Todo POP revisado 1x/ano em workshop com operadores reais da atividade. POP "de papel" que não reflete a prática = falha.', ref:'ISO 22000 cl. 7.5.2' },
      { t:'Programa formal de CAPA (corretivas/preventivas)', d:'Todo desvio abre CAPA com prazo, responsável e verificação de eficácia em 30-60 dias.', ref:'ISO 22000 cl. 8.9.3 · cl. 10.1' },
    ],
    operational: [
      { t:'Checklist visual no posto', d:'Lista de verificação plastificada em cada posto crítico. Operador marca e assina no início/fim do turno.', ref:'ISO 22000 cl. 7.5.2' },
      { t:'"Parada por qualidade" autorizada', d:'Qualquer colaborador autorizado a parar a linha ao identificar desvio FSQ sem retaliação. Regra escrita e divulgada.', ref:'PAS 320 §7.3' },
      { t:'Revisão pós-turno de 5 min', d:'Supervisor checa 3 pontos-chave do turno com operador antes da saída. Registro em planilha simples.', ref:'ISO 22000 cl. 9.1' },
    ],
  },
  'Higiene e comportamento': {
    pillar:'D3 · BPF',
    strategic: [
      { t:'Programa formal de Higiene & BPF com patrocínio executivo', d:'Diretoria participa pessoalmente da abertura anual e do relatório trimestral de indicadores BPF.', ref:'Codex CXC 1-1969 · RDC 275/2002' },
      { t:'Monitoramento ambiental robusto', d:'Programa baseado em zoneamento (zonas 1 a 4) com amostragem, limites e tendências. Revisão anual dos pontos críticos.', ref:'ISO 22000 cl. 8.5.3 · FSSC 22000 v6' },
    ],
    tactical: [
      { t:'Peer observation semanal (BBSO)', d:'Colaboradores observam colegas em higiene/EPI/comportamento com ficha. Resultado anonimizado vira tema de DDS.', ref:'PAS 320 §7.5' },
      { t:'Validação de eficácia de higienização', d:'Validação por swab (ATP/microbiológico) em pontos críticos pós-limpeza. Limites definidos. Ação quando fora.', ref:'ISO 22000 cl. 8.5.3' },
      { t:'Índice de aderência a EPIs por turno', d:'Indicador diário medido por observação estruturada. Meta, acompanhamento e reconhecimento do turno melhor.', ref:'RDC 275/2002 · BPF' },
    ],
    operational: [
      { t:'Estações de higiene abastecidas e visíveis', d:'Pia, sabonete antisséptico, papel toalha e álcool 70% sempre cheios. Verificação por turno com responsável designado.', ref:'Codex CXC 1-1969 §VII' },
      { t:'Espelhos nos vestiários com checklist visual', d:'Check pessoal com ilustração: unhas, cabelo, barba, adornos, uniforme. Antes de entrar na produção.', ref:'RDC 275/2002 · BPF' },
      { t:'Inspeção diária das 5S', d:'Auditoria visual rápida de 10 min no início de turno. Fotos do antes/depois dos não-conformes.', ref:'ISO 22000 cl. 8.2' },
    ],
  },
  'Reporte e aprendizagem': {
    pillar:'D4 · Near-miss & NCs',
    strategic: [
      { t:'Política de não-punição por reporte de boa-fé', d:'Documento assinado pela diretoria garantindo que quem reporta problema FSQ não sofre retaliação. Comunicado a todos.', ref:'PAS 320 §7.4 · FSSC 22000 v6' },
      { t:'Análise anual de tendências de reportes', d:'Relatório que cruza tipos de NC × áreas × período × causa raiz. Entra na análise crítica da direção.', ref:'ISO 22000 cl. 9.3 · cl. 10.3' },
    ],
    tactical: [
      { t:'Programa formal de near-miss', d:'Meta de reporte (ex: 1 near-miss/colaborador/mês). Quem mais reporta é reconhecido. Alta taxa = cultura saudável.', ref:'ISO 22000 cl. 8.9.1 · PAS 320 §7.4' },
      { t:'Análise de causa raiz padronizada', d:'Todo desvio significativo passa por 5 Porquês ou Ishikawa com time multidisciplinar. Ação ataca a causa, não o sintoma.', ref:'ISO 22000 cl. 8.9.3 · cl. 10.2' },
      { t:'Ciclo de feedback 48h-7d-30d', d:'Quem reportou recebe: ack em 48h, tratativa em 7d, resolução em 30d. Falha de feedback mata o programa.', ref:'ISO 22000 cl. 7.4.3' },
    ],
    operational: [
      { t:'Cartão físico simples de reporte', d:'Cartão de 3 campos (o que vi, onde, quando) disponível em todos os postos. Caixa coletora por área.', ref:'PAS 320 §7.4' },
      { t:'QR code para reporte via celular', d:'QR nos quadros de área abre formulário simples no celular pessoal. Anonimato opcional.', ref:'FSSC 22000 v6 req. 2.5.8' },
      { t:'Mural "O que aprendemos esta semana"', d:'Toda sexta, 1 caso real de near-miss/NC resolvida é contado em 1 página visual no mural.', ref:'ISO 22000 cl. 7.4.2' },
    ],
  },
  'Cultura do time': {
    pillar:'D5 · Engajamento',
    strategic: [
      { t:'Pesquisa cultural anual com devolutiva obrigatória', d:'Esta pesquisa vira ritual anual. Devolutiva por área em até 60 dias com plano de ação visível.', ref:'FSSC 22000 v6 req. 2.5.8 · PAS 320 §10' },
      { t:'Comitê de Cultura multifuncional', d:'Grupo com representantes de cada área (não só liderança) que se reúne mensalmente e leva demandas para decisão.', ref:'PAS 320 §6.3' },
      { t:'Modelo de maturidade cultural (5 níveis)', d:'Adotar formalmente modelo PAS 320 (doubt → know → follow → involve → embed) como referência de evolução.', ref:'PAS 320 §4' },
    ],
    tactical: [
      { t:'Reconhecimento estruturado mensal', d:'Programa formal com critérios, indicações, premiação não-monetária (folga, vaga de estacionamento, almoço com diretor).', ref:'PAS 320 §7.5' },
      { t:'Rotação cultural entre áreas', d:'Job shadowing trimestral — colaborador passa 1 turno acompanhando outra área. Amplia visão sistêmica.', ref:'PAS 320 §7.2' },
      { t:'Pulse survey trimestral (8 perguntas)', d:'Mini-pesquisa rápida entre ciclos anuais para monitorar tendência. Resultado devolvido em 15 dias.', ref:'FSSC 22000 v6 req. 2.5.8' },
    ],
    operational: [
      { t:'Celebração de marcos FSQ', d:'Atingiu 100 dias sem NC? Bolo e fotos. Marco cultural reforça comportamento positivo.', ref:'PAS 320 §7.5' },
      { t:'Onboarding com "dia cultural"', d:'Novo colaborador tem 1 dia dedicado a conhecer a cultura: vídeo de abertura do CEO, visita guiada, almoço com time.', ref:'ISO 22000 cl. 7.3' },
      { t:'Rituais de abertura/fechamento de turno', d:'Pequenos rituais que marcam início/fim com foco em qualidade: briefing, reconhecimento, aprendizado do dia.', ref:'PAS 320 §7.5' },
    ],
  },
  // Lideranças (versão adaptada — foco em quem lidera)
  'Visão estratégica': {
    pillar:'L1 · Lideranças',
    strategic: [
      { t:'Alinhamento da estratégia FSQ com a estratégia de negócio', d:'Plano estratégico plurianual onde FSQ é um dos pilares explícitos, não um apêndice. Apresentado em reunião anual da diretoria.', ref:'FSSC 22000 v6 · ISO 22000 cl. 4.1' },
      { t:'Roadmap de maturidade cultural 3-5 anos', d:'Definir nível atual (via esta pesquisa) e projetar meta anual. Ciclos de investimento alinhados ao roadmap.', ref:'PAS 320 §6' },
    ],
    tactical: [
      { t:'KPI de maturidade cultural no scorecard', d:'Score cultural (desta pesquisa) vira indicador oficial no BSC/OKR corporativo.', ref:'ISO 22000 cl. 9.1' },
      { t:'Benchmarking externo semestral', d:'Visitas técnicas, participação em fóruns GFSI/FSSC, estudos comparativos. Traz ideias frescas.', ref:'PAS 320 §6.5' },
    ],
    operational: [
      { t:'Comunicação mensal da estratégia', d:'Mensagem da liderança pelo menos 1x/mês conectando o dia-a-dia com a visão estratégica de FSQ.', ref:'ISO 22000 cl. 7.4' },
    ],
  },
  'Gestão de pessoas': {
    pillar:'L2 · Lideranças',
    strategic: [
      { t:'Política de desenvolvimento de líderes FSQ', d:'Todo líder (supervisão para cima) tem PDI com competências FSQ explícitas. Investimento anual mínimo.', ref:'ISO 22000 cl. 7.2' },
    ],
    tactical: [
      { t:'1-on-1 mensal com pauta FSQ', d:'Líder e subordinado direto têm 30 min/mês com 1 pergunta fixa sobre FSQ: "o que está te incomodando em qualidade?"', ref:'PAS 320 §7.2' },
      { t:'Feedback estruturado em comportamentos', d:'Feedback não é "você é bom/ruim" — é "quando você fez X, gerou Y; recomendo fazer Z". Padronizar o framework.', ref:'PAS 320 §7.5' },
    ],
    operational: [
      { t:'Elogio em público, correção em privado', d:'Regra simples e divulgada. Corrige-se em particular, reconhece-se no grupo.', ref:'Boas práticas de liderança' },
    ],
  },
  // Fornecedores
  'Relacionamento com fornecedores': {
    pillar:'F · Fornecedores',
    strategic: [
      { t:'Programa formal de homologação e monitoramento', d:'Critérios objetivos de entrada, classificação (A/B/C) e auditorias periódicas baseadas em risco.', ref:'FSSC 22000 v6 · ISO 22000 cl. 7.1.6' },
      { t:'Plano de Food Fraud Prevention (VACCP)', d:'Avaliação de vulnerabilidade de cada matéria-prima crítica. Plano de mitigação aprovado pela direção.', ref:'FSSC 22000 v6 req. 2.5.4 · PAS 96' },
    ],
    tactical: [
      { t:'Reuniões trimestrais de performance', d:'Call com top-10 fornecedores mostrando: % entrega no prazo, % conformidade, NCs, oportunidades.', ref:'ISO 22000 cl. 7.1.6' },
      { t:'Acordo Técnico de Qualidade por fornecedor', d:'Documento com especificações, laudos exigidos, plano de amostragem, plano de ação em caso de desvio.', ref:'ISO 22000 cl. 7.1.6 · cl. 8.1' },
    ],
    operational: [
      { t:'Feedback de recebimento em 48h', d:'Toda não-conformidade de recebimento é comunicada ao fornecedor em até 48h com evidência fotográfica.', ref:'ISO 22000 cl. 8.9.3' },
    ],
  },
  'Relacionamento com distribuidores': {
    pillar:'D · Distribuidores',
    strategic: [
      { t:'Plano de Food Defense (TACCP)', d:'Avaliação de ameaças intencionais na cadeia logística. Plano de segurança de transporte e armazenagem.', ref:'FSSC 22000 v6 req. 2.5.3 · PAS 96' },
    ],
    tactical: [
      { t:'Especificação logística formal', d:'Acordo escrito sobre temperatura, tempo, integridade, laudos. Assinado em 2 vias.', ref:'ISO 22000 cl. 8.2' },
      { t:'Auditoria logística anual', d:'Visita técnica anual aos principais distribuidores para verificar condições de armazenagem.', ref:'ISO 22000 cl. 9.2' },
    ],
    operational: [
      { t:'Registro de temperatura em cada expedição', d:'Data logger ou registro manual. Análise semanal de tendências.', ref:'ISO 22000 cl. 8.5.3' },
    ],
  },
};

// Renderiza o cardápio. Se `critDims` é passado, mostra só dimensões críticas.
// Se null, mostra todas.
function buildActionMenuHtml(critDims) {
  const targetDims = critDims && critDims.length
    ? critDims.map(c => c.dim).filter(d => ACTION_MENU[d])
    : Object.keys(ACTION_MENU);

  if (!targetDims.length) {
    return `<div class="menu-empty">Nenhuma dimensão específica selecionada para o cardápio.</div>`;
  }

  const statusFor = (dim) => {
    const sc = DATA && DATA.dims && DATA.dims[dim];
    if (!sc) return { lbl:'', bg:'' };
    const vals = ['internos','liderancas','fornecedores','distribuidores']
      .map(k => sc[k]).filter(v => v !== null && v !== undefined);
    if (!vals.length) return { lbl:'', bg:'' };
    const min = Math.min(...vals);
    if (min < 2.5)  return { lbl:'⚠ Em Risco · '+min.toFixed(1),      bg:'background:rgba(238,39,55,.13);color:#EE2737;' };
    if (min < 3.5)  return { lbl:'⚠ Frágil · '+min.toFixed(1),        bg:'background:rgba(230,126,34,.13);color:#E67E22;' };
    if (min < 4.5)  return { lbl:'Em Desenv. · '+min.toFixed(1),      bg:'background:rgba(255,184,29,.16);color:#9A7010;' };
    return           { lbl:'Consolidada · '+min.toFixed(1),           bg:'background:rgba(39,174,96,.13);color:#27AE60;' };
  };

  const escape = (s) => String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;');

  return targetDims.map(dim => {
    const m = ACTION_MENU[dim];
    const st = statusFor(dim);
    const buildLevel = (lv, items, tag, horizon) => `
      <div class="menu-lv ${lv}">
        <div class="menu-lv-hdr">
          <span class="menu-lv-tag">${tag}</span>
          <span class="menu-lv-horizon">${horizon}</span>
        </div>
        ${items.map(i => `
          <div class="menu-item">
            <div class="menu-item-ref">${i.ref}</div>
            <div class="menu-item-t">${i.t}</div>
            <div class="menu-item-d">${i.d}</div>
            <button class="menu-add-btn" onclick="addFromMenu('${escape(dim)}','${escape(i.t)}','${escape(i.d)}','${lv}')">+ Plano de Ação</button>
          </div>
        `).join('')}
      </div>
    `;
    return `
      <div class="menu-dim">
        <div class="menu-dim-hdr">
          <div class="menu-dim-ico">📋</div>
          <div class="menu-dim-t">${dim}<span style="font-size:9px;font-weight:600;color:var(--g);display:block;letter-spacing:0;text-transform:none;margin-top:1px;">${m.pillar}</span></div>
          ${st.lbl ? `<span class="menu-dim-status" style="${st.bg}">${st.lbl}</span>` : ''}
        </div>
        <div class="menu-levels">
          ${buildLevel('strategic', m.strategic, 'Estratégico', 'Diretoria · 12+ meses')}
          ${buildLevel('tactical',  m.tactical,  'Tático',      'Gerencial · 3-12 meses')}
          ${buildLevel('operational', m.operational, 'Operacional', 'Chão · 0-3 meses')}
        </div>
      </div>
    `;
  }).join('');
}

// Handler do botão "+ Plano de Ação" do cardápio
function addFromMenu(dim, title, desc, level) {
  // Prioridade inferida do nível
  const pri = level === 'strategic' ? 'Alta' : level === 'tactical' ? 'Média' : 'Baixa';
  const prazoDias = level === 'strategic' ? 365 : level === 'tactical' ? 90 : 30;
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + prazoDias);
  const deadlineStr = deadline.toISOString().split('T')[0];

  const newAction = {
    id: 'menu-' + Date.now(),
    dim: dim,
    pri: pri,
    title: title,
    desc: desc,
    owner: '',
    deadline: deadlineStr,
    expected: 'Mensurável em ' + (level === 'strategic' ? '12 meses' : level === 'tactical' ? '3-6 meses' : '30 dias'),
    status: 'open',
    pct: 0,
  };
  actions.unshift(newAction);

  // Persistir se houver Supabase
  if (typeof saveActionToSupabase === 'function') {
    try { saveActionToSupabase(newAction); } catch(e) { console.warn('[Odara] Não conseguiu salvar no Supabase:', e); }
  }
  localStorage.setItem('odara_actions', JSON.stringify(actions));

  renderActions && renderActions();
  updateBadge && updateBadge();

  // Feedback visual
  if (typeof showExportStatus === 'function') {
    showExportStatus('✅ Ação "' + (title.length > 40 ? title.substring(0, 40) + '…' : title) + '" adicionada ao plano!', 'success');
  } else {
    alert('Ação adicionada ao plano!');
  }
}
window.addFromMenu = addFromMenu;

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

  // Filtrar conforme critérios:
  // (a) ≥2 notas ≤ 2 OU (≥1 nota ≤ 2 com 100% das respostas baixas e amostra ≥ 2)
  // (b) média < 3.5
  // (c) amostra ≥ 2 (aceita setores pequenos como 2 Varejo)
  const audLabels = { internos:'Colaboradores', liderancas:'Lideranças', fornecedores:'Fornecedores', distribuidores:'Distribuidores' };
  const points = [];
  Object.values(agg).forEach(item => {
    if (item.vals.length < 2) return;
    const avg = item.vals.reduce((a,b)=>a+b,0) / item.vals.length;
    if (avg >= 3.5) return;
    // Critério relaxado: ≥2 lowCount OU (lowCount ≥ 1 E todas as notas são baixas)
    const allLow = item.lowCount === item.vals.length;
    if (item.lowCount < 2 && !allLow) return;
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

  return points.slice(0, 20); // top 20 pontos focados (antes: 12)
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


// ════════════════════════════════════════════════════════════════════════════
// AUDITORIA DE QUALIDADE DO DADO (v6.8)
// ════════════════════════════════════════════════════════════════════════════
// Marcadores implementados:
//   - Tempo de resposta < AUDIT_THRESHOLDS.minSeconds   → flag `speed`
//   - Variância das Likert < AUDIT_THRESHOLDS.maxVariance → flag `straightlining`
//
// Marcador adiado para próximo ciclo:
//   - Acquiescence via I25 invertida — exige instrumento v3 (próxima onda)
//
// Decisão final do auditor é registrada em respondents.audit_status:
//   pending (default) | cleared (mantém nos scores) | confirmed (exclui)
// ════════════════════════════════════════════════════════════════════════════

// Calcula estatísticas e flags de cada respondente, retornando map id → snapshot.
function computeAuditSnapshot(allRespondents, allResponses, thresholds) {
  // Indexa respostas Likert por respondent_id
  const byResp = {};
  (allResponses || []).forEach(r => {
    const v = parseFloat(r.value_numeric);
    if (isNaN(v) || v < 1 || v > 5) return;
    if (!byResp[r.respondent_id]) byResp[r.respondent_id] = [];
    byResp[r.respondent_id].push(v);
  });

  const out = {};
  (allRespondents || []).forEach(r => {
    const vals = byResp[r.id] || [];
    const n = vals.length;
    let mean = null, variance = null, mode = null, modeCount = 0, agreePct = null;

    if (n > 0) {
      mean = vals.reduce((a,b) => a+b, 0) / n;
      variance = vals.reduce((a,b) => a + Math.pow(b - mean, 2), 0) / n;
      // moda
      const counts = {};
      vals.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
      Object.entries(counts).forEach(([v, c]) => {
        if (c > modeCount) { mode = parseFloat(v); modeCount = c; }
      });
      // % concordância (≥4)
      agreePct = vals.filter(v => v >= 4).length / n;
    }

    // Flags
    const flags = { speed: false, straightlining: false, anyFlag: false };
    // Tempo: só dispara quando duration_seconds existe e é menor que o limite
    if (r.duration_seconds !== null && r.duration_seconds !== undefined &&
        r.duration_seconds < thresholds.minSeconds) {
      flags.speed = true;
    }
    // Straight-lining: precisa de n mínimo para ter variância significativa
    if (n >= thresholds.minResponsesForVariance && variance !== null &&
        variance < thresholds.maxVariance) {
      flags.straightlining = true;
    }
    flags.anyFlag = flags.speed || flags.straightlining;

    out[r.id] = {
      id: r.id,
      survey_type: r.survey_type,
      seg_area: r.seg_area || '',
      submitted_at: r.submitted_at,
      duration_seconds: r.duration_seconds,
      audit_status: r.audit_status || 'pending',
      audit_notes: r.audit_notes || '',
      n, mean, variance, mode, modeCount, agreePct,
      flags,
    };
  });
  return out;
}

function renderAuditPanel() {
  const root = document.getElementById('content-audit');
  if (!root) return;
  if (!DATA || !DATA.allRespondents) {
    root.innerHTML = emptyState('Carregando dados de auditoria…');
    return;
  }

  const snapshot = computeAuditSnapshot(DATA.allRespondents, DATA.allResponses, AUDIT_THRESHOLDS);
  LAST_AUDIT_SNAPSHOT = snapshot;
  const arr = Object.values(snapshot);

  // KPIs
  const total       = arr.length;
  const flagged     = arr.filter(s => s.flags.anyFlag).length;
  const flaggedSpeed = arr.filter(s => s.flags.speed).length;
  const flaggedSL    = arr.filter(s => s.flags.straightlining).length;
  const pending     = arr.filter(s => s.audit_status === 'pending').length;
  const cleared     = arr.filter(s => s.audit_status === 'cleared').length;
  const confirmed   = arr.filter(s => s.audit_status === 'confirmed').length;

  // KPIs visíveis para o auditor
  const kpisHTML = `
    <div class="audit-kpis">
      <div class="aud-kpi"><div class="aud-kpi-v">${total}</div><div class="aud-kpi-l">Total de respondentes</div></div>
      <div class="aud-kpi"><div class="aud-kpi-v">${flagged}</div><div class="aud-kpi-l">Com pelo menos um flag</div></div>
      <div class="aud-kpi"><div class="aud-kpi-v" style="color:#E67E22">${flaggedSL}</div><div class="aud-kpi-l">Flag de straight-lining</div></div>
      <div class="aud-kpi"><div class="aud-kpi-v" style="color:#3498DB">${flaggedSpeed}</div><div class="aud-kpi-l">Flag de tempo &lt;${AUDIT_THRESHOLDS.minSeconds}s</div></div>
      <div class="aud-kpi"><div class="aud-kpi-v" style="color:#27AE60">${cleared}</div><div class="aud-kpi-l">Auditados — válidos</div></div>
      <div class="aud-kpi"><div class="aud-kpi-v" style="color:#C0392B">${confirmed}</div><div class="aud-kpi-l">Auditados — descartados</div></div>
      <div class="aud-kpi"><div class="aud-kpi-v" style="color:#565555">${pending}</div><div class="aud-kpi-l">Pendentes de revisão</div></div>
    </div>`;

  // Controles (thresholds + toggle de exclusão)
  const ctrlHTML = `
    <div class="audit-ctrl card">
      <div class="chdr"><div class="ct">⚙️ Controles de auditoria</div>
        <div class="cs">Ajuste os limiares e o filtro aplicado aos cálculos oficiais. As mudanças são salvas no Supabase quando você marca um respondente.</div>
      </div>
      <div class="audit-ctrl-grid">
        <div>
          <label>Variância máxima (straight-lining)</label>
          <input type="number" id="aud-th-var" min="0" max="2" step="0.1" value="${AUDIT_THRESHOLDS.maxVariance}">
          <small>Variância populacional das Likert. Padrão 0.5 (pega "4-4-4-4" e "4-5-4-5").</small>
        </div>
        <div>
          <label>Tempo mínimo de resposta (segundos)</label>
          <input type="number" id="aud-th-time" min="0" max="600" step="10" value="${AUDIT_THRESHOLDS.minSeconds}">
          <small>Aplicável apenas aos registros com tempo capturado. Os 98 da onda atual não têm tempo registrado — só vale para a próxima onda.</small>
        </div>
        <div>
          <label>Mín. de respostas Likert para calcular variância</label>
          <input type="number" id="aud-th-n" min="2" max="20" step="1" value="${AUDIT_THRESHOLDS.minResponsesForVariance}">
          <small>Evita falsos positivos em respondentes com poucas respostas.</small>
        </div>
        <div>
          <button class="btn-afs" onclick="applyAuditThresholds()">Aplicar limiares</button>
        </div>
      </div>
      <div class="audit-toggle">
        <label class="aud-switch">
          <input type="checkbox" id="aud-exclude" ${EXCLUDE_CONFIRMED ? 'checked' : ''} onchange="toggleExcludeConfirmed(this.checked)">
          <span>Excluir respondentes confirmados como inválidos do cálculo dos scores oficiais</span>
        </label>
        <small>Quando ativado, todos os painéis (visão geral, dimensões, heatmap, drill-down, insights) recalculam ignorando os ${confirmed} respondentes marcados como <code>confirmed</code>. Estado atual: <strong>${EXCLUDE_CONFIRMED ? 'ATIVO' : 'desativado'}</strong>.</small>
      </div>
    </div>`;

  // Tabela
  const filterMode = (window.__auditFilterMode || 'all'); // all | flagged | pending
  const list = arr
    .filter(s => {
      if (filterMode === 'flagged') return s.flags.anyFlag;
      if (filterMode === 'pending') return s.audit_status === 'pending';
      return true;
    })
    .sort((a,b) => {
      // ordenar: flagados primeiro, depois pending, depois por variância asc
      const aScore = (a.flags.anyFlag ? 0 : 10) + (a.audit_status === 'pending' ? 0 : 5);
      const bScore = (b.flags.anyFlag ? 0 : 10) + (b.audit_status === 'pending' ? 0 : 5);
      if (aScore !== bScore) return aScore - bScore;
      return (a.variance ?? 99) - (b.variance ?? 99);
    });

  const audLabel = { internos:'Colaborador', liderancas:'Liderança', fornecedores:'Fornecedor', distribuidores:'Distribuidor' };

  const rowsHTML = list.map(s => {
    const flagBadges = [
      s.flags.straightlining ? '<span class="aud-flag aud-flag-sl">straight-lining</span>' : '',
      s.flags.speed          ? '<span class="aud-flag aud-flag-sp">tempo &lt;'+AUDIT_THRESHOLDS.minSeconds+'s</span>' : '',
    ].filter(Boolean).join(' ') || '<span class="aud-noflag">—</span>';

    const dur = (s.duration_seconds === null || s.duration_seconds === undefined)
      ? '<span style="color:#aaa">não capturado</span>'
      : (s.duration_seconds + 's');

    const stCls = s.audit_status === 'confirmed' ? 'st-confirmed'
                : s.audit_status === 'cleared'   ? 'st-cleared'
                : 'st-pending';
    const stLabel = s.audit_status === 'confirmed' ? '🔴 Descartado'
                  : s.audit_status === 'cleared'   ? '🟢 Válido'
                  : '⚪ Pendente';

    const meanTxt    = s.mean !== null    ? s.mean.toFixed(2)    : '—';
    const varTxt     = s.variance !== null ? s.variance.toFixed(2) : '—';
    const modeTxt    = s.mode !== null    ? s.mode.toFixed(0)    : '—';
    const agreeTxt   = s.agreePct !== null ? Math.round(s.agreePct*100) + '%' : '—';
    const idShort    = s.id.length > 24 ? s.id.slice(0,8)+'…'+s.id.slice(-8) : s.id;

    return `
      <tr class="${s.flags.anyFlag ? 'aud-row-flagged' : ''}">
        <td class="aud-id" title="${s.id}">${idShort}</td>
        <td>${audLabel[s.survey_type] || s.survey_type}</td>
        <td>${s.seg_area || '—'}</td>
        <td style="text-align:center">${s.n}</td>
        <td style="text-align:center">${meanTxt}</td>
        <td style="text-align:center"><strong>${varTxt}</strong></td>
        <td style="text-align:center">${modeTxt} (${s.modeCount}×)</td>
        <td style="text-align:center">${agreeTxt}</td>
        <td>${dur}</td>
        <td>${flagBadges}</td>
        <td><span class="aud-status ${stCls}">${stLabel}</span></td>
        <td class="aud-actions">
          <button class="aud-btn aud-btn-clear" onclick="setAuditStatus('${s.id}','cleared')" title="Marcar como válido (mantém nos scores)">✓</button>
          <button class="aud-btn aud-btn-confirm" onclick="setAuditStatus('${s.id}','confirmed')" title="Confirmar como inválido (exclui dos scores)">✗</button>
          <button class="aud-btn aud-btn-pending" onclick="setAuditStatus('${s.id}','pending')" title="Voltar para pendente">↺</button>
        </td>
      </tr>`;
  }).join('');

  const tableHTML = `
    <div class="card audit-table-wrap">
      <div class="chdr">
        <div class="ct">📋 Respondentes</div>
        <div class="cs">Variância baixa = padrão de respostas pouco variável. Concordância alta sem variação merece inspeção. Clique nos botões para registrar a decisão de auditoria.</div>
      </div>
      <div class="audit-filter">
        <button class="aud-fbtn ${filterMode==='all'?'active':''}" onclick="setAuditFilter('all')">Todos (${total})</button>
        <button class="aud-fbtn ${filterMode==='flagged'?'active':''}" onclick="setAuditFilter('flagged')">Apenas flagados (${flagged})</button>
        <button class="aud-fbtn ${filterMode==='pending'?'active':''}" onclick="setAuditFilter('pending')">Apenas pendentes (${pending})</button>
      </div>
      <div class="audit-table-scroll">
        <table class="audit-table">
          <thead>
            <tr>
              <th>ID</th><th>Público</th><th>Setor</th>
              <th>n Likert</th><th>Média</th><th>Variância</th>
              <th>Moda</th><th>% Concordância</th><th>Duração</th>
              <th>Flags</th><th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>${rowsHTML || '<tr><td colspan="12" style="text-align:center;padding:24px;color:#999">Nenhum registro neste filtro.</td></tr>'}</tbody>
        </table>
      </div>
    </div>`;

  // Nota sobre acquiescence
  const noteHTML = `
    <div class="audit-note">
      <strong>Nota metodológica · ciclo 2026-H1.</strong>
      O detector de <em>acquiescence bias</em> via item Likert invertido (I25)
      foi adiado para o próximo ciclo (out/2026), quando o instrumento será
      atualizado para a versão v3.0. Nesta onda, o controle equivalente é a
      inspeção manual da combinação <em>média alta + variância baixa + concordância ≥ 90%</em>
      na tabela acima — esses respondentes podem ser marcados manualmente como
      descartados ainda que não disparem os flags automáticos.
      O detector de <em>tempo &lt; ${AUDIT_THRESHOLDS.minSeconds}s</em> só passa a valer
      a partir da próxima onda, quando o front-end começa a capturar a duração
      da resposta. Os ${total} registros desta onda têm <code>duration_seconds = NULL</code>.
    </div>`;

  root.innerHTML = kpisHTML + ctrlHTML + tableHTML + noteHTML;
}
window.renderAuditPanel = renderAuditPanel;

function setAuditFilter(mode) {
  window.__auditFilterMode = mode;
  renderAuditPanel();
}
window.setAuditFilter = setAuditFilter;

function applyAuditThresholds() {
  const v = parseFloat(document.getElementById('aud-th-var').value);
  const t = parseInt(document.getElementById('aud-th-time').value, 10);
  const n = parseInt(document.getElementById('aud-th-n').value, 10);
  if (!isNaN(v) && v >= 0) AUDIT_THRESHOLDS.maxVariance = v;
  if (!isNaN(t) && t >= 0) AUDIT_THRESHOLDS.minSeconds = t;
  if (!isNaN(n) && n >= 2) AUDIT_THRESHOLDS.minResponsesForVariance = n;
  renderAuditPanel();
}
window.applyAuditThresholds = applyAuditThresholds;

async function setAuditStatus(respondentId, newStatus) {
  if (!['pending','cleared','confirmed'].includes(newStatus)) return;
  if (!window.supabaseConfigured || !window.supabaseConfigured()) {
    alert('Supabase não configurado.'); return;
  }
  // Confirmação extra para ação destrutiva
  if (newStatus === 'confirmed' && !confirm('Marcar este respondente como INVÁLIDO? As respostas dele serão excluídas dos scores oficiais.')) return;

  try {
    await window.sbPatch('/respondents?id=eq.' + encodeURIComponent(respondentId), {
      audit_status: newStatus,
      audit_updated_at: new Date().toISOString(),
    });
    // Atualizar localmente para feedback imediato
    if (DATA && DATA.allRespondents) {
      const r = DATA.allRespondents.find(x => x.id === respondentId);
      if (r) r.audit_status = newStatus;
    }
    // Recarregar dados oficiais (aplicando o novo filtro)
    const ok = await loadFromSupabase();
    dbOk = ok;
    // Re-render painéis afetados
    const safe = (fn, name) => { try { fn(); } catch(e) { console.error('[Odara] Erro em ' + name + ':', e); } };
    safe(renderOverview, 'renderOverview');
    safe(renderDimTable, 'renderDimTable');
    safe(renderHeatmap, 'renderHeatmap');
    safe(() => renderVerbatim(), 'renderVerbatim');
    safe(renderStrategicInsights, 'renderStrategicInsights');
    safe(renderInterpretationTable, 'renderInterpretationTable');
    safe(renderAuditPanel, 'renderAuditPanel');
    safe(updateAuditBanner, 'updateAuditBanner');
  } catch (e) {
    console.error('[Odara] Erro ao atualizar audit_status:', e);
    alert('Erro ao salvar: ' + e.message);
  }
}
window.setAuditStatus = setAuditStatus;

async function toggleExcludeConfirmed(checked) {
  EXCLUDE_CONFIRMED = !!checked;
  const ok = await loadFromSupabase();
  dbOk = ok;
  const safe = (fn, name) => { try { fn(); } catch(e) { console.error('[Odara] Erro em ' + name + ':', e); } };
  safe(renderOverview, 'renderOverview');
  safe(renderDimTable, 'renderDimTable');
  safe(renderHeatmap, 'renderHeatmap');
  safe(() => renderVerbatim(), 'renderVerbatim');
  safe(renderStrategicInsights, 'renderStrategicInsights');
  safe(renderInterpretationTable, 'renderInterpretationTable');
  safe(renderAuditPanel, 'renderAuditPanel');
  safe(updateAuditBanner, 'updateAuditBanner');
}
window.toggleExcludeConfirmed = toggleExcludeConfirmed;

// Banner discreto no topo do dashboard quando há exclusões ativas
function updateAuditBanner() {
  let banner = document.getElementById('audit-banner');
  const n = (DATA && DATA.excludedCount) || 0;
  if (!banner) {
    const tb = document.querySelector('.topbar');
    if (!tb) return;
    banner = document.createElement('div');
    banner.id = 'audit-banner';
    banner.className = 'audit-banner';
    tb.parentNode.insertBefore(banner, tb.nextSibling);
  }
  if (n > 0 && EXCLUDE_CONFIRMED) {
    banner.style.display = 'block';
    banner.innerHTML = `🛡️ Filtro de auditoria ativo · ${n} respondente(s) excluído(s) dos scores oficiais. <a href="javascript:showTab('audit')">Ver painel de auditoria →</a>`;
  } else {
    banner.style.display = 'none';
  }
}
window.updateAuditBanner = updateAuditBanner;

// ════════════════════════════════════════════════════════════════════════════

const TITLES = {
  overview:'Visão Geral', dimensions:'Dimensões', heatmap:'Heatmap de Gaps',
  verbatim:'Respostas Abertas', insights:'Insights Estratégicos',
  actions:'Plano de Ação', executive:'Resumo Executivo',
  interpretation:'Tabela de Interpretação',
  audit:'Auditoria de Qualidade',
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
  // Re-renderizar auditoria sempre que abrir (snapshot fresh)
  if (id === 'audit') { try { renderAuditPanel(); } catch(e) { console.error('Erro renderAuditPanel:', e); } }
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
