/**
 * ODARA — Configuração Central v6
 * ─────────────────────────────────────────────────────────────
 * EDITE APENAS ESTE ARQUIVO para configurar o sistema.
 * Não é necessário alterar nenhum outro arquivo.
 */

// ── Prazo de coleta ──────────────────────────────────────────
// Após esta data o formulário é bloqueado automaticamente.
// Formato ISO 8601 com fuso: 'YYYY-MM-DDTHH:MM:SS-03:00'
window.ODARA_DEADLINE = new Date('2026-04-24T23:59:59-03:00');

// ── Senha do painel analítico ────────────────────────────────
window.ODARA_PASSWORD = 'odara2026';

// ── Supabase ─────────────────────────────────────────────────
// 1. Acesse supabase.com → seu projeto → Settings → API
// 2. Copie "Project URL" e "anon public" key abaixo
window.SUPABASE_URL      = 'https://SEU_PROJETO.supabase.co';
window.SUPABASE_ANON_KEY = 'SUA_ANON_KEY_AQUI';

// ── NÃO EDITAR ABAIXO ────────────────────────────────────────

window.isDeadlinePassed = function () {
  return new Date() > window.ODARA_DEADLINE;
};

window.supabaseConfigured = function () {
  return (
    window.SUPABASE_URL &&
    !window.SUPABASE_URL.includes('SEU_PROJETO') &&
    window.SUPABASE_ANON_KEY &&
    !window.SUPABASE_ANON_KEY.includes('SUA_ANON')
  );
};

window.sbFetch = async function (path, opts = {}) {
  const url = window.SUPABASE_URL + '/rest/v1' + path;
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'apikey': window.SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + window.SUPABASE_ANON_KEY,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

window.sbInsert = async function (table, data) {
  return window.sbFetch('/' + table, {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(data),
  });
};

window.sbSelect = async function (path) {
  return window.sbFetch(path);
};

window.sbPatch = async function (path, data) {
  return window.sbFetch(path, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(data),
  });
};

window.sbDelete = async function (path) {
  return window.sbFetch(path, { method: 'DELETE' });
};
