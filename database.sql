-- ============================================================
-- ODARA — Script SQL para Supabase (PostgreSQL)
-- Pesquisa de Cultura da Qualidade & Segurança · FSSC 22000
-- Versão: 2025.1
-- ============================================================

-- ============================================================
-- EXTENSÕES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELA: surveys (versões da pesquisa)
-- ============================================================
CREATE TABLE surveys (
  id           TEXT PRIMARY KEY,             -- ex: 'internos_v2', 'liderancas_v2'
  version      TEXT NOT NULL,                -- ex: '2025.1'
  title        TEXT NOT NULL,
  audience     TEXT NOT NULL,                -- internos | liderancas | fornecedores | distribuidores
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  is_active    BOOLEAN DEFAULT TRUE,
  metadata     JSONB DEFAULT '{}'::jsonb     -- configurações extras
);

-- Dados iniciais
INSERT INTO surveys (id, version, title, audience) VALUES
  ('internos_v2',      '2025.1', 'Pesquisa de Cultura — Versão Interna (Geral)', 'internos'),
  ('liderancas_v2',    '2025.1', 'Pesquisa de Cultura — Versão Lideranças',      'liderancas'),
  ('fornecedores_v2',  '2025.1', 'Pesquisa de Cultura — Versão Fornecedores',    'fornecedores'),
  ('distribuidores_v2','2025.1', 'Pesquisa de Cultura — Distribuidores/Clientes','distribuidores');

-- ============================================================
-- TABELA: dimensions (dimensões culturais)
-- ============================================================
CREATE TABLE dimensions (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  description  TEXT,
  icon         TEXT,                          -- emoji
  color        TEXT,                          -- hex color
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO dimensions (name, description, icon, color) VALUES
  ('Liderança e prioridade',    'Comprometimento e exemplo da liderança',       '🏆', '#D4A853'),
  ('Comunicação e clareza',     'Clareza de regras e canais de comunicação',    '💬', '#8B6914'),
  ('Competência e treinamento', 'Preparo técnico e qualidade dos treinamentos', '🎓', '#B8860B'),
  ('Disciplina operacional',    'Cumprimento de padrões e BPF no dia a dia',    '⚙️', '#CD853F'),
  ('Higiene e comportamento',   'Práticas de higiene e comportamento autônomo', '🧼', '#A0522D'),
  ('Reporte e aprendizagem',    'Cultura de reporte e aprendizado sistêmico',   '📊', '#6B4423'),
  ('Cultura do time',           'Senso de responsabilidade e orgulho coletivo', '🤝', '#4A2E12');

-- ============================================================
-- TABELA: questions (perguntas da pesquisa)
-- ============================================================
CREATE TABLE questions (
  id             TEXT PRIMARY KEY,            -- ex: 'I01', 'L04', 'F06'
  survey_id      TEXT REFERENCES surveys(id),
  dimension_id   INT REFERENCES dimensions(id),
  question_text  TEXT NOT NULL,
  question_type  TEXT NOT NULL,               -- likert | select | text | textarea
  section_title  TEXT,
  display_order  INT DEFAULT 0,
  is_required    BOOLEAN DEFAULT TRUE,
  options        JSONB,                       -- para select e múltipla escolha
  metadata       JSONB DEFAULT '{}'::jsonb,   -- badge, observações, etc
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: respondents (respondentes — anônimos por padrão)
-- ============================================================
CREATE TABLE respondents (
  id             TEXT PRIMARY KEY,            -- UUID gerado no frontend
  survey_id      TEXT REFERENCES surveys(id),
  survey_type    TEXT NOT NULL,
  submitted_at   TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  -- Campos de segmentação (preenchidos pelas respostas de identificação)
  seg_audience   TEXT,                        -- Operacional / Administrativo / Supervisor etc
  seg_area       TEXT,                        -- Produção / Qualidade / Logística etc
  seg_shift      TEXT,                        -- Manhã / Tarde / Noite / Administrativo
  seg_tenure     TEXT,                        -- Tempo de empresa
  seg_level      TEXT,                        -- Nível hierárquico (para lideranças)
  -- Metadados opcionais
  collection_round TEXT,                      -- ex: '2025-H1' para rastrear rodadas
  ip_hash        TEXT,                        -- hash do IP para deduplicação (não identificável)
  user_agent_hash TEXT,
  is_complete    BOOLEAN DEFAULT TRUE,
  metadata       JSONB DEFAULT '{}'::jsonb
);

-- ============================================================
-- TABELA: responses (respostas individuais)
-- ============================================================
CREATE TABLE responses (
  id             BIGSERIAL PRIMARY KEY,
  respondent_id  TEXT REFERENCES respondents(id) ON DELETE CASCADE,
  question_id    TEXT REFERENCES questions(id),
  survey_type    TEXT NOT NULL,
  value          TEXT,                        -- valor bruto (1-5, N/A, ou texto)
  value_numeric  NUMERIC(3,1),               -- null para texto aberto
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: collection_rounds (rodadas de pesquisa)
-- ============================================================
CREATE TABLE collection_rounds (
  id             SERIAL PRIMARY KEY,
  round_code     TEXT NOT NULL UNIQUE,        -- ex: '2025-H1', '2025-H2'
  label          TEXT NOT NULL,               -- ex: 'Junho 2025'
  survey_id      TEXT REFERENCES surveys(id),
  opened_at      TIMESTAMPTZ,
  closed_at      TIMESTAMPTZ,
  target_n       INT,                         -- meta de respondentes
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: action_plans (plano de ação PDCA — ciclo ACT)
-- ============================================================
CREATE TABLE action_plans (
  id             SERIAL PRIMARY KEY,
  dimension      TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  owner          TEXT,
  priority       TEXT DEFAULT 'Média',        -- Alta | Média | Baixa | Crítica
  deadline       DATE,
  expected_result TEXT,
  status         TEXT DEFAULT 'open',         -- open | progress | done | cancelled
  progress_pct   INT DEFAULT 0,               -- 0-100
  trigger_score  NUMERIC(3,2),               -- score que gerou a ação
  collection_round TEXT,
  completed_at   TIMESTAMPTZ,
  evidence       TEXT,                        -- evidência de conclusão
  created_by     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX idx_responses_respondent ON responses(respondent_id);
CREATE INDEX idx_responses_question   ON responses(question_id);
CREATE INDEX idx_responses_survey     ON responses(survey_type);
CREATE INDEX idx_respondents_survey   ON respondents(survey_id, submitted_at);
CREATE INDEX idx_respondents_area     ON respondents(seg_area, seg_audience);
CREATE INDEX idx_action_plans_status  ON action_plans(status, priority);

-- ============================================================
-- VIEW: dimension_scores — scores agregados por dimensão
-- ============================================================
CREATE OR REPLACE VIEW dimension_scores AS
SELECT
  r.survey_type,
  rsp.seg_area,
  rsp.seg_audience,
  q.section_title AS dimension,
  COUNT(DISTINCT rsp.id)                               AS respondent_count,
  ROUND(AVG(r.value_numeric)::NUMERIC, 2)              AS avg_score,
  ROUND(STDDEV(r.value_numeric)::NUMERIC, 2)           AS std_score,
  MIN(r.value_numeric)                                  AS min_score,
  MAX(r.value_numeric)                                  AS max_score,
  COUNT(CASE WHEN r.value_numeric < 3.5 THEN 1 END)   AS below_threshold,
  ROUND(
    COUNT(CASE WHEN r.value_numeric < 3.5 THEN 1 END)::NUMERIC /
    NULLIF(COUNT(r.value_numeric), 0) * 100, 1
  ) AS pct_below_threshold
FROM responses r
JOIN respondents rsp ON r.respondent_id = rsp.id
JOIN questions q     ON r.question_id   = q.id
WHERE r.value_numeric IS NOT NULL        -- excluir N/A e texto aberto
GROUP BY r.survey_type, rsp.seg_area, rsp.seg_audience, q.section_title;

-- ============================================================
-- VIEW: question_scores — scores por pergunta
-- ============================================================
CREATE OR REPLACE VIEW question_scores AS
SELECT
  r.question_id,
  q.question_text,
  q.section_title AS dimension,
  r.survey_type,
  COUNT(r.value_numeric)                  AS n,
  ROUND(AVG(r.value_numeric)::NUMERIC, 2) AS avg_score,
  ROUND(STDDEV(r.value_numeric)::NUMERIC, 2) AS std_score,
  COUNT(CASE WHEN r.value_numeric = 1 THEN 1 END) AS score_1,
  COUNT(CASE WHEN r.value_numeric = 2 THEN 1 END) AS score_2,
  COUNT(CASE WHEN r.value_numeric = 3 THEN 1 END) AS score_3,
  COUNT(CASE WHEN r.value_numeric = 4 THEN 1 END) AS score_4,
  COUNT(CASE WHEN r.value_numeric = 5 THEN 1 END) AS score_5,
  COUNT(CASE WHEN r.value = 'N/A'     THEN 1 END) AS score_na
FROM responses r
JOIN questions q ON r.question_id = q.id
GROUP BY r.question_id, q.question_text, q.section_title, r.survey_type;

-- ============================================================
-- FUNCTION: get_dashboard_summary — para o frontend do dashboard
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_summary()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalRespondents', (SELECT COUNT(*) FROM respondents),
    'overallScore',     (
      SELECT ROUND(AVG(value_numeric)::NUMERIC, 2)
      FROM responses
      WHERE value_numeric IS NOT NULL
    ),
    'completionRate', (
      SELECT ROUND(
        COUNT(CASE WHEN is_complete THEN 1 END)::NUMERIC /
        NULLIF(COUNT(*), 0) * 100, 0
      )
      FROM respondents
    ),
    'dimensionScores', (
      SELECT json_object_agg(
        dimension,
        json_build_object('geral', avg_score)
      )
      FROM dimension_scores
      WHERE survey_type = 'internos'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS
ALTER TABLE respondents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys       ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_plans  ENABLE ROW LEVEL SECURITY;

-- Política: qualquer pessoa pode INSERIR respondentes e respostas (anônimo)
CREATE POLICY "insert_respondents" ON respondents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "insert_responses" ON responses
  FOR INSERT WITH CHECK (true);

-- Política: leitura pública de perguntas e pesquisas (para o formulário)
CREATE POLICY "read_questions" ON questions
  FOR SELECT USING (true);

CREATE POLICY "read_surveys" ON surveys
  FOR SELECT USING (true);

-- Política: leitura e escrita de action_plans para usuários autenticados
CREATE POLICY "manage_actions" ON action_plans
  FOR ALL USING (auth.role() = 'authenticated');

-- Política: leitura de respondentes/respostas apenas para autenticados
CREATE POLICY "read_respondents" ON respondents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "read_responses" ON responses
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- FUNÇÃO: atualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER action_plans_updated_at
  BEFORE UPDATE ON action_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- COMENTÁRIOS (documentação inline)
-- ============================================================
COMMENT ON TABLE surveys      IS 'Versões das pesquisas de cultura da qualidade — FSSC 22000';
COMMENT ON TABLE respondents  IS 'Respondentes anônimos — sem identificação individual';
COMMENT ON TABLE responses    IS 'Respostas individuais por pergunta e respondente';
COMMENT ON TABLE questions    IS 'Banco de perguntas por versão da pesquisa';
COMMENT ON TABLE dimensions   IS 'Dimensões culturais alinhadas ao modelo GFSI/FSSC';
COMMENT ON TABLE action_plans IS 'Plano de ação PDCA — ciclo ACT baseado nos resultados';
COMMENT ON VIEW  dimension_scores IS 'Scores agregados por dimensão, área e público';
COMMENT ON VIEW  question_scores  IS 'Score médio e distribuição por pergunta';
