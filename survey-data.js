/* ============================================================
   SURVEY DATA — Odara Pesquisa de Cultura v3.0
   Extraído de pesquisa_cultura_qualidade_odara_v3.xlsx
   ============================================================ */

const SURVEY_DATA = {

  /* ───────── INTERNOS (GERAL) ───────── */
  internos: {
    id: 'internos_v3',
    title: 'Pesquisa de Cultura — Versão Interna (Geral) · v3.0',
    subtitle: 'Colaboradores operacionais e administrativos',
    time: '~10 minutos',
    intro: 'Esta pesquisa é anônima. Seu objetivo é entender como a cultura de qualidade e segurança de alimentos é vivida no dia a dia da Odara. Não há respostas certas ou erradas — queremos sua percepção real. Os resultados serão usados exclusivamente para melhorias internas.',
    segmentation: [
      { id: 'seg_publico', label: 'Público respondente', options: ['Operacional', 'Administrativo'] },
      { id: 'seg_area', label: 'Área / setor', type: 'text' },
      { id: 'seg_turno', label: 'Turno', options: ['Manhã', 'Tarde', 'Noite', 'Administrativo'] },
      { id: 'seg_tempo', label: 'Tempo de empresa', options: ['< 6 meses', '6 meses – 2 anos', '2 – 5 anos', '> 5 anos'] }
    ],
    sections: [
      {
        title: 'Liderança e prioridade',
        dimension: 'D1',
        questions: [
          { id:'I01', text:'Na Odara, qualidade e segurança de alimentos são prioridades reais nas decisões do dia a dia — não apenas discurso.', type:'likert' },
          { id:'I02', text:'Minha liderança direta dá o exemplo quando o assunto é cumprir padrões e procedimentos.', type:'likert' },
          { id:'I03', text:'Quando há conflito entre prazo, custo e qualidade/segurança, a decisão tomada pela liderança protege o produto e o consumidor.', type:'likert' }
        ]
      },
      {
        title: 'Comunicação e clareza',
        dimension: 'D1',
        questions: [
          { id:'I04', text:'Eu sei exatamente quais regras e controles críticos se aplicam ao meu trabalho.', type:'likert' },
          { id:'I05', text:'Quando há mudança de processo, produto ou rotina, sou informado(a) antes de executar a atividade.', type:'likert' },
          { id:'I06', text:'Eu sei a quem recorrer imediatamente quando tenho dúvida sobre qualidade ou segurança de alimentos.', type:'likert' }
        ]
      },
      {
        title: 'Competência e treinamento',
        dimension: 'D2/D3',
        questions: [
          { id:'I07', text:'Os treinamentos que recebi me preparam de fato para executar minhas atividades com segurança e qualidade.', type:'likert' },
          { id:'I08', text:'Pessoas novas ou remanejadas recebem orientação adequada antes de assumir atividades que envolvem risco ao produto.', type:'likert' },
          { id:'I09', text:'Conheço os alergênicos presentes nos produtos da Odara e sei o que fazer para evitar contaminação cruzada.', type:'likert' }
        ]
      },
      {
        title: 'Disciplina operacional',
        dimension: 'D4',
        questions: [
          { id:'I10', text:'Os padrões e procedimentos definidos são viáveis e podem ser cumpridos na prática do dia a dia.', type:'likert' },
          { id:'I11a', text:'A rotina da minha área favorece o cumprimento das Boas Práticas de Fabricação (BPF).', type:'likert' },
          { id:'I11b', text:'Os registros e controles operacionais são feitos de forma completa e no momento certo.', type:'likert' },
          { id:'I12', text:'Quando identifico um problema na minha área (equipamento, limpeza, matéria-prima), reporto ou trato antes de virar um risco maior.', type:'likert' },
          { id:'I13', text:'Entendo por que os controles críticos da minha área são importantes — não são apenas burocracia.', type:'likert' }
        ]
      },
      {
        title: 'Higiene e comportamento',
        dimension: 'D2',
        questions: [
          { id:'I14', text:'Mantenho os cuidados de higiene pessoal (lavagem de mãos, uso correto de EPI, estado de saúde) mesmo quando não estou sendo observado(a).', type:'likert' },
          { id:'I15', text:'Se me sentisse mal (com sintoma de doença) durante o trabalho, comunicaria à supervisão mesmo sabendo que poderia ser afastado(a).', type:'likert' }
        ]
      },
      {
        title: 'Reporte e aprendizagem',
        dimension: 'D2/D4/D5',
        questions: [
          { id:'I16', text:'Me sinto à vontade para apontar falhas, desvios ou riscos sem medo de represália ou julgamento.', type:'likert' },
          { id:'I17', text:'Quando ocorre um desvio, a causa real é investigada e tratada — não apenas o problema imediato.', type:'likert' },
          { id:'I18', text:'Aprendo sobre erros, reclamações ou ocorrências que aconteceram na empresa — não fico sabendo apenas dos da minha área.', type:'likert' },
          { id:'I19', text:'As ações corretivas tomadas após um desvio costumam funcionar de verdade e não se repetem.', type:'likert' }
        ]
      },
      {
        title: 'Cultura do time',
        dimension: 'D2',
        questions: [
          { id:'I20', text:'Meu time se ajuda mutuamente para manter o padrão correto — inclusive cobrando quando algo está errado.', type:'likert' },
          { id:'I21', text:'Sinto que sou pessoalmente responsável pela qualidade e segurança do produto que a Odara entrega.', type:'likert' },
          { id:'I22', text:'Tenho orgulho do padrão que a Odara entrega ao mercado.', type:'likert' },
          { id:'I23', text:'Eu recomendaria a Odara como um lugar onde qualidade e segurança são levadas a sério.', type:'likert' },
          { id:'I24', text:'Na Odara, comportamentos corretos de qualidade e segurança são reconhecidos e valorizados — não apenas os erros são notados.', type:'likert' }
        ]
      },
      {
        title: 'Novos indicadores v3',
        dimension: 'D1/D3/D5',
        questions: [
          { id:'I25', text:'Consigo cumprir todos os padrões de qualidade e segurança mesmo nos momentos de maior pressão de produção.', type:'likert', inverted: true, note: '⚠ Pergunta invertida: score baixo = risco cultural' },
          { id:'I26', text:'Sei identificar situações que poderiam representar adulteração intencional, sabotagem ou acesso não autorizado ao produto ou processo.', type:'likert' },
          { id:'I27', text:'As condições físicas da minha área (limpeza, organização, layout, equipamentos) facilitam — e não dificultam — o cumprimento dos padrões de qualidade.', type:'likert' },
          { id:'I28', text:'Quando há mudança de processo, novo procedimento ou situação inesperada, consigo adaptar minha rotina sem comprometer a qualidade ou segurança.', type:'likert' }
        ]
      },
      {
        title: 'Perguntas abertas',
        dimension: 'Aberta',
        questions: [
          { id:'I29', text:'O que mais fortalece a cultura de qualidade e segurança na Odara hoje?', type:'open' },
          { id:'I30', text:'O que mais enfraquece essa cultura? Seja específico(a) se possível.', type:'open' },
          { id:'I31', text:'Qual mudança prática teria maior impacto nos próximos 90 dias? (Uma ação concreta)', type:'open' }
        ]
      }
    ]
  },

  /* ───────── LIDERANÇAS ───────── */
  liderancas: {
    id: 'liderancas_v3',
    title: 'Pesquisa de Cultura — Versão Lideranças · v3.0',
    subtitle: 'Supervisores · Coordenadores · Gerentes · Diretoria',
    time: '~12 minutos',
    intro: 'Esta pesquisa é anônima. Seu objetivo é entender como a cultura de qualidade e segurança de alimentos é vivida no dia a dia da Odara. Não há respostas certas ou erradas — queremos sua percepção real. Os resultados serão usados exclusivamente para melhorias internas.',
    segmentation: [
      { id: 'seg_nivel', label: 'Nível de liderança', options: ['Supervisor', 'Coordenador', 'Gerente', 'Diretor'] },
      { id: 'seg_area', label: 'Área / setor sob responsabilidade', type: 'text' },
      { id: 'seg_liderados', label: 'Número de liderados diretos (aproximado)', type: 'text' },
      { id: 'seg_tempo_cargo', label: 'Tempo no cargo atual', options: ['< 6 meses', '6 meses – 2 anos', '2 – 5 anos', '> 5 anos'] }
    ],
    sections: [
      {
        title: 'Contexto e prioridade',
        dimension: 'D1',
        questions: [
          { id:'L01', text:'Na Odara, qualidade e segurança de alimentos são prioridades reais nas decisões estratégicas e operacionais.', type:'likert' },
          { id:'L02', text:'Quando há conflito entre prazo, custo e qualidade/segurança, a decisão institucional protege o produto.', type:'likert' },
          { id:'L03', text:'Tenho recursos humanos, materiais e de tempo suficientes para sustentar os padrões exigidos.', type:'likert' },
          { id:'L04', text:'A alta direção demonstra, com ações concretas, que cultura de segurança é prioridade — não apenas discurso.', type:'likert' }
        ]
      },
      {
        title: 'Minha prática de liderança',
        dimension: 'D2/D4/D5',
        questions: [
          { id:'L05', text:'Estabeleço metas e rotinas que reforçam qualidade e segurança, não apenas produtividade e volume.', type:'likert' },
          { id:'L06', text:'Acompanho indicadores e desvios de qualidade com frequência suficiente para agir preventivamente.', type:'likert' },
          { id:'L07', text:'Reconheço e valorizo publicamente comportamentos corretos — não apenas aponto erros.', type:'likert' },
          { id:'L08', text:'Investigo e trato as causas estruturais dos desvios, não apenas os sintomas imediatos.', type:'likert' },
          { id:'L09', text:'Minha equipe sabe claramente o que é inegociável em qualidade e segurança na nossa área.', type:'likert' },
          { id:'L10', text:'Dou o exemplo pessoal em higiene, uso de EPI e cumprimento de BPF quando estou na área produtiva.', type:'likert' },
          { id:'L11', text:'Crio condições para que minha equipe reporte desvios sem medo de julgamento ou punição.', type:'likert' }
        ]
      },
      {
        title: 'Minha equipe',
        dimension: 'D2/D3',
        questions: [
          { id:'L12', text:'Minha equipe entende o propósito dos controles críticos — não os vê apenas como obrigação burocrática.', type:'likert' },
          { id:'L13', text:'Minha equipe tem competência técnica suficiente para executar as atividades críticas com segurança.', type:'likert' },
          { id:'L14', text:'Os treinamentos disponíveis para minha equipe são suficientes para o nível de complexidade exigido.', type:'likert' },
          { id:'L15', text:'Quando identifico desvios de comportamento na equipe, trato de forma estruturada e com acompanhamento.', type:'likert' }
        ]
      },
      {
        title: 'Sistemas e ferramentas',
        dimension: 'D4/D5',
        questions: [
          { id:'L16', text:'Os procedimentos e documentos do SGQ são adequados e úteis como guia de trabalho — não são burocracia vazia.', type:'likert' },
          { id:'L17', text:'O sistema de ações corretivas da empresa funciona: problemas registrados são de fato tratados e encerrados.', type:'likert' },
          { id:'L18', text:'Os resultados de auditorias, reclamações e desvios são discutidos com minha equipe para aprendizagem.', type:'likert' }
        ]
      },
      {
        title: 'Novos indicadores v3',
        dimension: 'D3/D5',
        questions: [
          { id:'L19', text:'Nossa área tem controles ativos para Food Defense — acesso restrito, vigilância e integridade do produto estão formalmente gerenciados.', type:'likert' },
          { id:'L20', text:'Uso informações de near misses, quase-desvios e tendências para agir preventivamente — antes de o problema ocorrer.', type:'likert' }
        ]
      },
      {
        title: 'Perguntas abertas',
        dimension: 'Aberta',
        questions: [
          { id:'L21', text:'Qual é o maior obstáculo hoje para sustentar uma cultura forte de qualidade e segurança na sua área?', type:'open' },
          { id:'L22', text:'O que você, como líder, faria diferente nos próximos 90 dias para fortalecer essa cultura?', type:'open' },
          { id:'L23', text:'Que apoio ou recurso você precisaria da empresa para ser um líder mais efetivo em qualidade e segurança?', type:'open' }
        ]
      }
    ]
  },

  /* ───────── FORNECEDORES ───────── */
  fornecedores: {
    id: 'fornecedores_v3',
    title: 'Pesquisa de Cultura — Versão Fornecedores · v3.0',
    subtitle: 'Fornecedores críticos e parceiros de cadeia',
    time: '~6 minutos',
    intro: 'Esta pesquisa é confidencial e tem duração estimada de 6 minutos. É destinada a fornecedores críticos da Odara. Seu objetivo é identificar oportunidades de melhoria na interface entre as partes. As respostas individuais NÃO serão vinculadas à empresa respondente na análise.',
    segmentation: [
      { id: 'seg_empresa', label: 'Fornecedor / empresa', type: 'text' },
      { id: 'seg_categoria', label: 'Categoria de fornecimento', options: ['Matéria-prima', 'Embalagem', 'Serviços', 'Outro'] },
      { id: 'seg_tempo_rel', label: 'Tempo de relacionamento com a Odara', options: ['< 1 ano', '1 – 3 anos', '3 – 5 anos', '> 5 anos'] },
      { id: 'seg_funcao', label: 'Função do respondente', options: ['Qualidade', 'Comercial', 'Logística', 'Outro'] }
    ],
    sections: [
      {
        title: 'Especificações e alinhamento',
        dimension: 'D1',
        questions: [
          { id:'F01', text:'As especificações técnicas e critérios de qualidade da Odara são claros e objetivos.', type:'likert' },
          { id:'F02', text:'Existe alinhamento claro sobre os requisitos críticos de segurança, qualidade e conformidade esperados.', type:'likert' },
          { id:'F03', text:'A comunicação com a Odara sobre qualidade, desvios e alterações é ágil e eficaz.', type:'likert' },
          { id:'F04', text:'Quando há mudança de processo, formulação, origem ou embalagem, a Odara nos orienta claramente sobre o que comunicar e quando.', type:'likert' }
        ]
      },
      {
        title: 'Rastreabilidade e documentação',
        dimension: 'D4',
        questions: [
          { id:'F05', text:'Os requisitos de rastreabilidade e documentação exigidos pela Odara são proporcionais e factíveis para nossa operação.', type:'likert' },
          { id:'F06', text:'Nossa empresa possui e mantém rastreabilidade suficiente para atender uma solicitação de recall ou retirada de produto.', type:'likert' }
        ]
      },
      {
        title: 'Tratamento de não conformidades',
        dimension: 'D1/D4',
        questions: [
          { id:'F07', text:'Quando ocorre uma não conformidade, o processo de tratamento entre as partes é claro e orientado à causa raiz.', type:'likert' },
          { id:'F08', text:'Os prazos e condições negociados permitem que nossa empresa atenda os requisitos de qualidade especificados.', type:'likert' },
          { id:'F09', text:'A Odara nos comunica resultados de análises, reclamações ou devoluções relacionadas ao nosso produto de forma tempestiva.', type:'likert' }
        ]
      },
      {
        title: 'Gestão do relacionamento e confiança',
        dimension: 'D2/D5',
        questions: [
          { id:'F10', text:'A Odara demonstra consistência técnica e profissionalismo na gestão de fornecedores.', type:'likert' },
          { id:'F11', text:'O relacionamento com a Odara favorece melhoria contínua e desenvolvimento mútuo.', type:'likert' },
          { id:'F12', text:'Há confiança mútua no compromisso com qualidade e segurança de alimentos entre nossa empresa e a Odara.', type:'likert' }
        ]
      },
      {
        title: 'Perguntas abertas',
        dimension: 'Aberta',
        questions: [
          { id:'F13', text:'Qual é o principal ponto forte da Odara na gestão da qualidade junto a fornecedores?', type:'open' },
          { id:'F14', text:'Qual é o principal ponto a melhorar nessa interface?', type:'open' },
          { id:'F15', text:'Que prática ou mudança reduziria risco e retrabalho entre as partes nos próximos 6 meses?', type:'open' }
        ]
      }
    ]
  },

  /* ───────── DISTRIBUIDORES / CLIENTES ───────── */
  distribuidores: {
    id: 'distribuidores_v3',
    title: 'Pesquisa de Cultura — Versão Distribuidores / Clientes · v3.0',
    subtitle: 'Distribuidores, clientes e parceiros comerciais',
    time: '~5 minutos',
    intro: 'Esta pesquisa é confidencial e tem duração estimada de 5 minutos. Seu objetivo é entender a percepção de distribuidores e clientes sobre qualidade, segurança e confiabilidade dos produtos Odara. As respostas são anônimas e serão usadas exclusivamente para melhorias.',
    segmentation: [
      { id: 'seg_empresa', label: 'Empresa / cliente / distribuidor', type: 'text' },
      { id: 'seg_canal', label: 'Canal', options: ['Distribuidor', 'Varejo', 'Food Service', 'Outro'] },
      { id: 'seg_regiao', label: 'Região de atuação', type: 'text' },
      { id: 'seg_tempo_rel', label: 'Tempo de relacionamento com a Odara', options: ['< 1 ano', '1 – 3 anos', '3 – 5 anos', '> 5 anos'] }
    ],
    sections: [
      {
        title: 'Produto e qualidade percebida',
        dimension: 'D3/D4',
        questions: [
          { id:'D01', text:'Os produtos da Odara chegam com padrão consistente de qualidade — sem variações frequentes.', type:'likert' },
          { id:'D02', text:'A integridade da embalagem e a identificação do produto atendem consistentemente às expectativas.', type:'likert' },
          { id:'D03', text:'As informações de produto (validade, rotulagem, alergênicos, armazenamento) são claras e completas.', type:'likert' },
          { id:'D04', text:'Confio que os produtos da Odara são seguros para os consumidores finais.', type:'likert' }
        ]
      },
      {
        title: 'Serviço e documentação',
        dimension: 'D4',
        questions: [
          { id:'D05', text:'As condições de entrega (temperatura, embalagem, prazo) ajudam a preservar a qualidade do produto.', type:'likert' },
          { id:'D06', text:'A documentação e informações de produto fornecidas são adequadas para nossa operação comercial.', type:'likert' }
        ]
      },
      {
        title: 'Tratamento de ocorrências e comunicação',
        dimension: 'D1/D4/D5',
        questions: [
          { id:'D07', text:'Quando há reclamação, devolução ou desvio, a Odara responde de forma adequada e dentro de prazo razoável.', type:'likert' },
          { id:'D08', text:'A comunicação com a Odara sobre qualidade é clara, acessível e resolutiva.', type:'likert' },
          { id:'D09', text:'A Odara demonstra capacidade de investigar e rastrear quando há questionamento sobre um produto.', type:'likert' }
        ]
      },
      {
        title: 'Confiança e melhoria contínua',
        dimension: 'D2/D5',
        questions: [
          { id:'D10', text:'Há confiança na seriedade com que a Odara trata qualidade e segurança de alimentos.', type:'likert' },
          { id:'D11', text:'Percebo que a Odara evoluiu na qualidade dos produtos e serviços ao longo do tempo.', type:'likert' },
          { id:'D12', text:'Eu recomendaria a Odara como fornecedor confiável do ponto de vista de qualidade e segurança.', type:'likert' }
        ]
      },
      {
        title: 'Perguntas abertas',
        dimension: 'Aberta',
        questions: [
          { id:'D13', text:'Qual aspecto mais fortalece sua confiança na Odara como fornecedor?', type:'open' },
          { id:'D14', text:'Qual aspecto mais compromete sua percepção de qualidade hoje?', type:'open' },
          { id:'D15', text:'Que melhoria prática traria maior valor para sua operação nos próximos 6 meses?', type:'open' }
        ]
      }
    ]
  }
};

/* Dimensões GFSI para o painel */
const DIMENSIONS = {
  D1: { label: 'Liderança e prioridade', gfsi: 'D1 – Vision and Mission' },
  D2: { label: 'Pessoas e competência', gfsi: 'D2 – People' },
  D3: { label: 'Perigos e riscos', gfsi: 'D3 – Hazards and Risks' },
  D4: { label: 'Consistência e disciplina', gfsi: 'D4 – Consistency' },
  D5: { label: 'Adaptabilidade e aprendizagem', gfsi: 'D5 – Adaptability' }
};

/* Deadline config */
const SURVEY_DEADLINE = new Date('2026-04-24T23:59:59');
