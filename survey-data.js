/**
 * ODARA — Dados da Pesquisa de Cultura da Qualidade
 * Gerado a partir de pesquisa_cultura_qualidade_odara_v2.xlsx
 * Versão: 2025.1
 */

const SURVEY_DATA = {

  // ============================================================
  // VERSÃO INTERNOS / GERAL
  // ============================================================
  internos: {
    id: 'internos_v2',
    title: 'Pesquisa de Cultura — Versão Interna (Geral)',
    tag: 'Colaborador',
    intro: 'Esta pesquisa é anônima e tem duração estimada de 8 minutos. Seu objetivo é entender como a cultura de qualidade e segurança de alimentos é vivida no dia a dia da Odara. Não há respostas certas ou erradas — queremos sua percepção real.',
    sections: [
      {
        id: 'seg_internos',
        title: 'Identificação',
        desc: 'Essas informações permitem análise por segmento. Nenhuma resposta individual será identificada.',
        questions: [
          { id: 'SEG1', text: 'Público respondente', type: 'select', required: true,
            options: ['Operacional', 'Administrativo'] },
          { id: 'SEG2', text: 'Área / setor', type: 'select', required: true,
            options: ['Produção', 'Qualidade', 'Logística', 'Comercial', 'Administrativo', 'Manutenção', 'Outro'] },
          { id: 'SEG3', text: 'Turno', type: 'select', required: true,
            options: ['Manhã', 'Tarde', 'Noite', 'Administrativo'] },
          { id: 'SEG4', text: 'Tempo de empresa', type: 'select', required: true,
            options: ['Menos de 6 meses', '6 meses a 2 anos', '2 a 5 anos', 'Mais de 5 anos'] },
        ]
      },
      {
        id: 'dim_lideranca',
        title: 'Liderança e Prioridade',
        desc: 'Avalie como a liderança demonstra comprometimento com qualidade e segurança de alimentos.',
        questions: [
          { id: 'I01', dimension: 'Liderança e prioridade',
            text: 'Na Odara, qualidade e segurança de alimentos são prioridades reais nas decisões do dia a dia — não apenas discurso.',
            type: 'likert', required: true },
          { id: 'I02', dimension: 'Liderança e prioridade',
            text: 'Minha liderança direta dá o exemplo quando o assunto é cumprir padrões e procedimentos.',
            type: 'likert', required: true },
          { id: 'I03', dimension: 'Liderança e prioridade',
            text: 'Quando há conflito entre prazo, custo e qualidade/segurança, a decisão tomada pela liderança protege o produto e o consumidor.',
            type: 'likert', required: true },
        ]
      },
      {
        id: 'dim_comunicacao',
        title: 'Comunicação e Clareza',
        desc: 'Avalie a clareza das informações e canais de comunicação sobre qualidade.',
        questions: [
          { id: 'I04', dimension: 'Comunicação e clareza',
            text: 'Eu sei exatamente quais regras e controles críticos se aplicam ao meu trabalho.',
            type: 'likert', required: true },
          { id: 'I05', dimension: 'Comunicação e clareza',
            text: 'Quando há mudança de processo, produto ou rotina, sou informado(a) antes de executar a atividade.',
            type: 'likert', required: true },
          { id: 'I06', dimension: 'Comunicação e clareza',
            text: 'Eu sei a quem recorrer imediatamente quando tenho dúvida sobre qualidade ou segurança de alimentos.',
            type: 'likert', required: true },
        ]
      },
      {
        id: 'dim_competencia',
        title: 'Competência e Treinamento',
        desc: 'Avalie a qualidade dos treinamentos e o preparo para atividades críticas.',
        questions: [
          { id: 'I07', dimension: 'Competência e treinamento',
            text: 'Os treinamentos que recebi me preparam de fato para executar minhas atividades com segurança e qualidade.',
            type: 'likert', required: true },
          { id: 'I08', dimension: 'Competência e treinamento',
            text: 'Pessoas novas ou remanejadas recebem orientação adequada antes de assumir atividades que envolvem risco ao produto.',
            type: 'likert', required: true },
          { id: 'I09', dimension: 'Competência e treinamento', badge: '★ PPR Crítico',
            text: 'Conheço os alergênicos presentes nos produtos da Odara e sei o que fazer para evitar contaminação cruzada.',
            type: 'likert', required: true },
        ]
      },
      {
        id: 'dim_disciplina',
        title: 'Disciplina Operacional',
        desc: 'Avalie a praticabilidade dos padrões e o cumprimento no dia a dia.',
        questions: [
          { id: 'I10', dimension: 'Disciplina operacional',
            text: 'Os padrões e procedimentos definidos são viáveis e podem ser cumpridos na prática do dia a dia.',
            type: 'likert', required: true },
          { id: 'I11a', dimension: 'Disciplina operacional',
            text: 'A rotina da minha área favorece o cumprimento das Boas Práticas de Fabricação (BPF).',
            type: 'likert', required: true },
          { id: 'I11b', dimension: 'Disciplina operacional',
            text: 'Os registros e controles operacionais são feitos de forma completa e no momento certo.',
            type: 'likert', required: true },
          { id: 'I12', dimension: 'Disciplina operacional',
            text: 'Quando identifico um problema na minha área (equipamento, limpeza, matéria-prima), reporto ou trato antes de virar um risco maior.',
            type: 'likert', required: true },
          { id: 'I13', dimension: 'Disciplina operacional',
            text: 'Entendo por que os controles críticos da minha área são importantes — não são apenas burocracia.',
            type: 'likert', required: true },
        ]
      },
      {
        id: 'dim_higiene',
        title: 'Higiene e Comportamento',
        desc: 'Avalie práticas de higiene pessoal e comportamento mesmo sem supervisão.',
        questions: [
          { id: 'I14', dimension: 'Higiene e comportamento', badge: '★ Preditor cultural',
            text: 'Mantenho os cuidados de higiene pessoal (lavagem de mãos, uso correto de EPI, estado de saúde) mesmo quando não estou sendo observado(a).',
            type: 'likert', required: true },
          { id: 'I15', dimension: 'Higiene e comportamento', badge: '★ Intenção comportamental',
            text: 'Se me sentisse mal (com sintoma de doença) durante o trabalho, comunicaria à supervisão mesmo sabendo que poderia ser afastado(a).',
            type: 'likert', required: true },
        ]
      },
      {
        id: 'dim_reporte',
        title: 'Reporte e Aprendizagem',
        desc: 'Avalie a cultura de reporte de desvios e o aprendizado organizacional.',
        questions: [
          { id: 'I16', dimension: 'Reporte e aprendizagem',
            text: 'Me sinto à vontade para apontar falhas, desvios ou riscos sem medo de represália ou julgamento.',
            type: 'likert', required: true },
          { id: 'I17', dimension: 'Reporte e aprendizagem',
            text: 'Quando ocorre um desvio, a causa real é investigada e tratada — não apenas o problema imediato.',
            type: 'likert', required: true },
          { id: 'I18', dimension: 'Reporte e aprendizagem',
            text: 'Aprendo sobre erros, reclamações ou ocorrências que aconteceram na empresa — não fico sabendo apenas dos da minha área.',
            type: 'likert', required: true },
          { id: 'I19', dimension: 'Reporte e aprendizagem',
            text: 'As ações corretivas tomadas após um desvio costumam funcionar de verdade e não se repetem.',
            type: 'likert', required: true },
        ]
      },
      {
        id: 'dim_cultura',
        title: 'Cultura do Time',
        desc: 'Avalie o senso de responsabilidade coletiva e orgulho sobre qualidade.',
        questions: [
          { id: 'I20', dimension: 'Cultura do time',
            text: 'Meu time se ajuda mutuamente para manter o padrão correto — inclusive cobrando quando algo está errado.',
            type: 'likert', required: true },
          { id: 'I21', dimension: 'Cultura do time',
            text: 'Sinto que sou pessoalmente responsável pela qualidade e segurança do produto que a Odara entrega.',
            type: 'likert', required: true },
          { id: 'I22', dimension: 'Cultura do time',
            text: 'Tenho orgulho do padrão que a Odara entrega ao mercado.',
            type: 'likert', required: true },
          { id: 'I23', dimension: 'Cultura do time', badge: '★ NPS Interno',
            text: 'Eu recomendaria a Odara como um lugar onde qualidade e segurança são levadas a sério.',
            type: 'likert', required: true },
        ]
      },
      {
        id: 'abertas_internos',
        title: 'Perguntas Abertas',
        desc: 'Suas respostas são anônimas. Seja específico(a) — respostas práticas têm mais impacto.',
        questions: [
          { id: 'I24', dimension: 'Aberta',
            text: 'O que mais fortalece a cultura de qualidade e segurança na Odara hoje?',
            type: 'textarea', required: false, placeholder: 'Compartilhe o que, na sua visão, funciona bem...' },
          { id: 'I25', dimension: 'Aberta',
            text: 'O que mais enfraquece essa cultura? Seja específico(a) se possível.',
            type: 'textarea', required: false, placeholder: 'Compartilhe o que precisa melhorar...' },
          { id: 'I26', dimension: 'Aberta',
            text: 'Qual mudança prática teria maior impacto nos próximos 90 dias? (Uma ação concreta)',
            type: 'textarea', required: false, placeholder: 'Sugira uma ação específica...' },
        ]
      },
    ]
  },

  // ============================================================
  // VERSÃO LIDERANÇAS
  // ============================================================
  liderancas: {
    id: 'liderancas_v2',
    title: 'Pesquisa de Cultura — Versão Lideranças',
    tag: 'Liderança',
    intro: 'Esta pesquisa é anônima e tem duração estimada de 10 minutos. É voltada exclusivamente para supervisores, coordenadores, gerentes e diretoria. As perguntas avaliam tanto sua percepção do contexto organizacional quanto sua própria prática de liderança.',
    sections: [
      {
        id: 'seg_liderancas',
        title: 'Identificação',
        desc: 'Essas informações permitem análise por nível de liderança.',
        questions: [
          { id: 'SEG1', text: 'Nível de liderança', type: 'select', required: true,
            options: ['Supervisor', 'Coordenador', 'Gerente', 'Diretor'] },
          { id: 'SEG2', text: 'Área / setor sob responsabilidade', type: 'select', required: true,
            options: ['Produção', 'Qualidade', 'Logística', 'Comercial', 'Administrativo', 'Múltiplas áreas'] },
          { id: 'SEG3', text: 'Número de liderados diretos (aproximado)', type: 'select', required: true,
            options: ['1 a 5', '6 a 15', '16 a 30', 'Mais de 30'] },
          { id: 'SEG4', text: 'Tempo no cargo atual', type: 'select', required: true,
            options: ['Menos de 1 ano', '1 a 3 anos', '3 a 5 anos', 'Mais de 5 anos'] },
        ]
      },
      {
        id: 'dim_contexto',
        title: 'Contexto e Prioridade',
        desc: 'Avalie o contexto organizacional que você percebe.',
        questions: [
          { id: 'L01', dimension: 'Contexto e prioridade',
            text: 'Na Odara, qualidade e segurança de alimentos são prioridades reais nas decisões estratégicas e operacionais.',
            type: 'likert', required: true },
          { id: 'L02', dimension: 'Contexto e prioridade',
            text: 'Quando há conflito entre prazo, custo e qualidade/segurança, a decisão institucional protege o produto.',
            type: 'likert', required: true },
          { id: 'L03', dimension: 'Contexto e prioridade',
            text: 'Tenho recursos humanos, materiais e de tempo suficientes para sustentar os padrões exigidos.',
            type: 'likert', required: true },
          { id: 'L04', dimension: 'Contexto e prioridade', badge: '★ Avaliação ascendente',
            text: 'A alta direção demonstra, com ações concretas, que cultura de segurança é prioridade — não apenas discurso.',
            type: 'likert', required: true },
        ]
      },
      {
        id: 'dim_pratica_lider',
        title: 'Minha Prática de Liderança',
        desc: 'Avalie honestamente sua própria prática como líder.',
        questions: [
          { id: 'L05', dimension: 'Minha prática de liderança',
            text: 'Estabeleço metas e rotinas que reforçam qualidade e segurança, não apenas produtividade e volume.',
            type: 'likert', required: true },
          { id: 'L06', dimension: 'Minha prática de liderança',
            text: 'Acompanho indicadores e desvios de qualidade com frequência suficiente para agir preventivamente.',
            type: 'likert', required: true },
          { id: 'L07', dimension: 'Minha prática de liderança',
            text: 'Reconheço e valorizo publicamente comportamentos corretos — não apenas aponto erros.',
            type: 'likert', required: true },
          { id: 'L08', dimension: 'Minha prática de liderança',
            text: 'Investigo e trato as causas estruturais dos desvios, não apenas os sintomas imediatos.',
            type: 'likert', required: true },
          { id: 'L09', dimension: 'Minha prática de liderança',
            text: 'Minha equipe sabe claramente o que é inegociável em qualidade e segurança na nossa área.',
            type: 'likert', required: true },
          { id: 'L10', dimension: 'Minha prática de liderança', badge: '★ Comportamento não supervisionado',
            text: 'Dou o exemplo pessoal em higiene, uso de EPI e cumprimento de BPF quando estou na área produtiva.',
            type: 'likert', required: true },
          { id: 'L11', dimension: 'Minha prática de liderança', badge: '★ Cultura de reporte',
            text: 'Crio condições para que minha equipe reporte desvios sem medo de julgamento ou punição.',
            type: 'likert', required: true },
        ]
      },
      {
        id: 'dim_minha_equipe',
        title: 'Minha Equipe',
        desc: 'Avalie a competência e maturidade da sua equipe.',
        questions: [
          { id: 'L12', dimension: 'Minha equipe',
            text: 'Minha equipe entende o propósito dos controles críticos — não os vê apenas como obrigação burocrática.',
            type: 'likert', required: true },
          { id: 'L13', dimension: 'Minha equipe', badge: '★ Capacidade técnica',
            text: 'Minha equipe tem competência técnica suficiente para executar as atividades críticas com segurança.',
            type: 'likert', required: true },
          { id: 'L14', dimension: 'Minha equipe',
            text: 'Os treinamentos disponíveis para minha equipe são suficientes para o nível de complexidade exigido.',
            type: 'likert', required: true },
          { id: 'L15', dimension: 'Minha equipe', badge: '★ Gestão comportamental',
            text: 'Quando identifico desvios de comportamento na equipe, trato de forma estruturada e com acompanhamento.',
            type: 'likert', required: true },
        ]
      },
      {
        id: 'dim_sistemas',
        title: 'Sistemas e Ferramentas',
        desc: 'Avalie a qualidade dos sistemas de gestão disponíveis.',
        questions: [
          { id: 'L16', dimension: 'Sistemas e ferramentas', badge: '★ Sistema documental',
            text: 'Os procedimentos e documentos do SGQ são adequados e úteis como guia de trabalho — não são burocracia vazia.',
            type: 'likert', required: true },
          { id: 'L17', dimension: 'Sistemas e ferramentas',
            text: 'O sistema de ações corretivas da empresa funciona: problemas registrados são de fato tratados e encerrados.',
            type: 'likert', required: true },
          { id: 'L18', dimension: 'Sistemas e ferramentas', badge: '★ Ciclo de aprendizagem',
            text: 'Os resultados de auditorias, reclamações e desvios são discutidos com minha equipe para aprendizagem.',
            type: 'likert', required: true },
        ]
      },
      {
        id: 'abertas_liderancas',
        title: 'Perguntas Abertas — Liderança',
        desc: 'Suas respostas são essenciais para identificar onde você precisa de apoio.',
        questions: [
          { id: 'L19', dimension: 'Aberta',
            text: 'Qual é o maior obstáculo hoje para sustentar uma cultura forte de qualidade e segurança na sua área?',
            type: 'textarea', required: false, placeholder: 'Descreva o principal obstáculo...' },
          { id: 'L20', dimension: 'Aberta',
            text: 'O que você, como líder, faria diferente nos próximos 90 dias para fortalecer essa cultura?',
            type: 'textarea', required: false, placeholder: 'Ação concreta que você tomaria...' },
          { id: 'L21', dimension: 'Aberta',
            text: 'Que apoio ou recurso você precisaria da empresa para ser um líder mais efetivo em qualidade e segurança?',
            type: 'textarea', required: false, placeholder: 'Treinamento, processo, ferramenta, estrutura...' },
        ]
      },
    ]
  },

  // ============================================================
  // VERSÃO FORNECEDORES
  // ============================================================
  fornecedores: {
    id: 'fornecedores_v2',
    title: 'Pesquisa de Cultura — Versão Fornecedores',
    tag: 'Fornecedor',
    intro: 'Esta pesquisa é confidencial e tem duração estimada de 6 minutos. É destinada a fornecedores críticos da Odara. Seu objetivo é identificar oportunidades de melhoria na interface entre as partes — não é uma avaliação de desempenho.',
    sections: [
      {
        id: 'seg_fornecedores',
        title: 'Identificação',
        desc: 'As respostas individuais NÃO serão vinculadas à empresa respondente na análise.',
        questions: [
          { id: 'SEG1', text: 'Fornecedor / empresa', type: 'text', required: false,
            placeholder: 'Opcional — será anonimizado na análise' },
          { id: 'SEG2', text: 'Categoria de fornecimento', type: 'select', required: true,
            options: ['Matéria-prima', 'Embalagem', 'Serviços', 'Outro'] },
          { id: 'SEG3', text: 'Tempo de relacionamento com a Odara', type: 'select', required: true,
            options: ['Menos de 1 ano', '1 a 3 anos', '3 a 5 anos', 'Mais de 5 anos'] },
          { id: 'SEG4', text: 'Função do respondente', type: 'select', required: true,
            options: ['Qualidade', 'Comercial', 'Logística', 'Diretoria', 'Outro'] },
        ]
      },
      {
        id: 'dim_especificacoes',
        title: 'Especificações e Alinhamento',
        desc: 'Avalie a clareza dos requisitos técnicos da Odara.',
        questions: [
          { id: 'F01', dimension: 'Especificações e alinhamento',
            text: 'As especificações técnicas e critérios de qualidade da Odara são claros e objetivos.',
            type: 'likert', required: true },
          { id: 'F02', dimension: 'Especificações e alinhamento',
            text: 'Existe alinhamento claro sobre os requisitos críticos de segurança, qualidade e conformidade esperados.',
            type: 'likert', required: true },
          { id: 'F03', dimension: 'Especificações e alinhamento',
            text: 'A comunicação com a Odara sobre qualidade, desvios e alterações é ágil e eficaz.',
            type: 'likert', required: true },
        ]
      },
      {
        id: 'dim_gestao_mudancas',
        title: 'Gestão de Mudanças',
        questions: [
          { id: 'F04', dimension: 'Gestão de mudanças',
            text: 'Quando há mudança de processo, formulação, origem ou embalagem, a Odara nos orienta claramente sobre o que comunicar e quando.',
            type: 'likert', required: true },
        ]
      },
      {
        id: 'dim_rastreabilidade',
        title: 'Rastreabilidade e Documentação',
        questions: [
          { id: 'F05', dimension: 'Rastreabilidade e documentação',
            text: 'Os requisitos de rastreabilidade e documentação exigidos pela Odara são proporcionais e factíveis para nossa operação.',
            type: 'likert', required: true },
          { id: 'F06', dimension: 'Rastreabilidade e documentação', badge: '★ Capacidade de recall',
            text: 'Nossa empresa possui e mantém rastreabilidade suficiente para atender uma solicitação de recall ou retirada de produto.',
            type: 'likert', required: true },
        ]
      },
      {
        id: 'dim_nc_fornecedor',
        title: 'Tratamento de Não Conformidades',
        questions: [
          { id: 'F07', dimension: 'Tratamento de não conformidades',
            text: 'Quando ocorre uma não conformidade, o processo de tratamento entre as partes é claro e orientado à causa raiz.',
            type: 'likert', required: true },
          { id: 'F08', dimension: 'Tratamento de não conformidades',
            text: 'Os prazos e condições negociados permitem que nossa empresa atenda os requisitos de qualidade especificados.',
            type: 'likert', required: true },
          { id: 'F09', dimension: 'Tratamento de não conformidades', badge: '★ Feedforward',
            text: 'A Odara nos comunica resultados de análises, reclamações ou devoluções relacionadas ao nosso produto de forma tempestiva.',
            type: 'likert', required: true },
        ]
      },
      {
        id: 'dim_relacionamento',
        title: 'Gestão do Relacionamento e Confiança',
        questions: [
          { id: 'F10', dimension: 'Gestão do relacionamento',
            text: 'A Odara demonstra consistência técnica e profissionalismo na gestão de fornecedores.',
            type: 'likert', required: true },
          { id: 'F11', dimension: 'Gestão do relacionamento',
            text: 'O relacionamento com a Odara favorece melhoria contínua e desenvolvimento mútuo.',
            type: 'likert', required: true },
          { id: 'F12', dimension: 'Confiança',
            text: 'Há confiança mútua no compromisso com qualidade e segurança de alimentos entre nossa empresa e a Odara.',
            type: 'likert', required: true },
        ]
      },
      {
        id: 'abertas_fornecedores',
        title: 'Perguntas Abertas',
        questions: [
          { id: 'F13', text: 'Qual é o principal ponto forte da Odara na gestão da qualidade junto a fornecedores?',
            type: 'textarea', required: false, placeholder: 'O que a Odara faz bem...' },
          { id: 'F14', text: 'Qual é o principal ponto a melhorar nessa interface?',
            type: 'textarea', required: false, placeholder: 'O que pode melhorar...' },
          { id: 'F15', text: 'Que prática ou mudança reduziria risco e retrabalho entre as partes nos próximos 6 meses?',
            type: 'textarea', required: false, placeholder: 'Sugestão prática e acionável...' },
        ]
      },
    ]
  },

  // ============================================================
  // VERSÃO DISTRIBUIDORES / CLIENTES
  // ============================================================
  distribuidores: {
    id: 'distribuidores_v2',
    title: 'Pesquisa de Cultura — Distribuidores / Clientes',
    tag: 'Distribuidor / Cliente',
    intro: 'Esta pesquisa é confidencial e tem duração estimada de 5 minutos. Seu objetivo é entender a percepção de distribuidores e clientes sobre qualidade, segurança e confiabilidade dos produtos Odara.',
    sections: [
      {
        id: 'seg_distrib',
        title: 'Identificação',
        desc: 'As respostas são anônimas e usadas exclusivamente para melhorias de produto e serviço.',
        questions: [
          { id: 'SEG1', text: 'Empresa / cliente / distribuidor', type: 'text', required: false,
            placeholder: 'Opcional' },
          { id: 'SEG2', text: 'Canal', type: 'select', required: true,
            options: ['Distribuidor', 'Varejo', 'Food Service', 'Outro'] },
          { id: 'SEG3', text: 'Região de atuação', type: 'select', required: true,
            options: ['Sul', 'Sudeste', 'Centro-Oeste', 'Nordeste', 'Norte', 'Exterior'] },
          { id: 'SEG4', text: 'Tempo de relacionamento com a Odara', type: 'select', required: true,
            options: ['Menos de 1 ano', '1 a 3 anos', '3 a 5 anos', 'Mais de 5 anos'] },
        ]
      },
      {
        id: 'dim_produto',
        title: 'Produto e Qualidade Percebida',
        desc: 'Avalie a experiência com os produtos Odara.',
        questions: [
          { id: 'D01', dimension: 'Consistência do produto',
            text: 'Os produtos da Odara chegam com padrão consistente de qualidade — sem variações frequentes.',
            type: 'likert', required: true },
          { id: 'D02', dimension: 'Integridade e identificação',
            text: 'A integridade da embalagem e a identificação do produto atendem consistentemente às expectativas.',
            type: 'likert', required: true },
          { id: 'D03', dimension: 'Informações do produto', badge: '★ Alergênicos',
            text: 'As informações de produto (validade, rotulagem, alergênicos, armazenamento) são claras e completas.',
            type: 'likert', required: true },
          { id: 'D04', dimension: 'Segurança percebida', badge: '★ Confiança no produto',
            text: 'Confio que os produtos da Odara são seguros para os consumidores finais.',
            type: 'likert', required: true },
        ]
      },
      {
        id: 'dim_servico',
        title: 'Serviço e Atendimento',
        questions: [
          { id: 'D05', dimension: 'Serviço logístico',
            text: 'As condições de entrega (temperatura, embalagem, prazo) ajudam a preservar a qualidade do produto.',
            type: 'likert', required: true },
          { id: 'D06', dimension: 'Documentação',
            text: 'A documentação e informações de produto fornecidas são adequadas para nossa operação comercial.',
            type: 'likert', required: true },
          { id: 'D07', dimension: 'Tratamento de ocorrências',
            text: 'Quando há reclamação, devolução ou desvio, a Odara responde de forma adequada e dentro de prazo razoável.',
            type: 'likert', required: true },
          { id: 'D08', dimension: 'Comunicação',
            text: 'A comunicação com a Odara sobre qualidade é clara, acessível e resolutiva.',
            type: 'likert', required: true },
        ]
      },
      {
        id: 'dim_confianca_distrib',
        title: 'Confiança e Evolução',
        questions: [
          { id: 'D09', dimension: 'Rastreabilidade',
            text: 'A Odara demonstra capacidade de investigar e rastrear quando há questionamento sobre um produto.',
            type: 'likert', required: true },
          { id: 'D10', dimension: 'Confiança',
            text: 'Há confiança na seriedade com que a Odara trata qualidade e segurança de alimentos.',
            type: 'likert', required: true },
          { id: 'D11', dimension: 'Melhoria contínua',
            text: 'Percebo que a Odara evoluiu na qualidade dos produtos e serviços ao longo do tempo.',
            type: 'likert', required: true },
          { id: 'D12', dimension: 'Recomendação (NPS de qualidade)', badge: '★ NPS Externo',
            text: 'Eu recomendaria a Odara como fornecedor confiável do ponto de vista de qualidade e segurança.',
            type: 'likert', required: true },
        ]
      },
      {
        id: 'abertas_distrib',
        title: 'Perguntas Abertas',
        questions: [
          { id: 'D13', text: 'Qual aspecto mais fortalece sua confiança na Odara como fornecedor?',
            type: 'textarea', required: false, placeholder: 'O que a Odara faz que gera confiança...' },
          { id: 'D14', text: 'Qual aspecto mais compromete sua percepção de qualidade hoje?',
            type: 'textarea', required: false, placeholder: 'O que pode melhorar...' },
          { id: 'D15', text: 'Que melhoria prática traria maior valor para sua operação nos próximos 6 meses?',
            type: 'textarea', required: false, placeholder: 'Sugestão específica...' },
        ]
      },
    ]
  }
};

// Escala Likert padrão
const LIKERT_LABELS = {
  1: 'Discordo totalmente',
  2: 'Discordo',
  3: 'Neutro',
  4: 'Concordo',
  5: 'Concordo totalmente'
};

// Dimensões e seus mapeamentos para o painel
const DIMENSIONS_MAP = {
  'Liderança e prioridade':    { color: '#D4A853', icon: '🏆' },
  'Contexto e prioridade':     { color: '#D4A853', icon: '🏆' },
  'Comunicação e clareza':     { color: '#8B6914', icon: '💬' },
  'Competência e treinamento': { color: '#B8860B', icon: '🎓' },
  'Disciplina operacional':    { color: '#CD853F', icon: '⚙️' },
  'Higiene e comportamento':   { color: '#A0522D', icon: '🧼' },
  'Reporte e aprendizagem':    { color: '#6B4423', icon: '📊' },
  'Cultura do time':           { color: '#4A2E12', icon: '🤝' },
  'Minha prática de liderança':{ color: '#D4A853', icon: '👔' },
  'Minha equipe':              { color: '#8B6914', icon: '👷' },
  'Sistemas e ferramentas':    { color: '#B8860B', icon: '🔧' },
  'Especificações e alinhamento': { color: '#D4A853', icon: '📋' },
  'Rastreabilidade e documentação': { color: '#8B6914', icon: '🔍' },
  'Tratamento de não conformidades': { color: '#A0522D', icon: '⚠️' },
  'Gestão do relacionamento':  { color: '#6B4423', icon: '🤝' },
  'Consistência do produto':   { color: '#D4A853', icon: '✅' },
  'Confiança':                 { color: '#4A2E12', icon: '🔒' },
};
