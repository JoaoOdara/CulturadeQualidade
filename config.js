/**
 * ODARA — Configuração Central v6
 * ─────────────────────────────────────────────────────────────
 * EDITE APENAS ESTE ARQUIVO para configurar o sistema.
 * Não é necessário alterar nenhum outro arquivo.
 */

// ── Prazo de coleta ──────────────────────────────────────────
window.ODARA_DEADLINE = new Date('2026-04-24T23:59:59-03:00');

// ── Senha do painel analítico ────────────────────────────────
window.ODARA_PASSWORD = 'odara2026';

// ── Supabase ─────────────────────────────────────────────────
window.SUPABASE_URL      = 'https://khqbimmcibutfrfmkoxr.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocWJpbW1jaWJ1dGZyZm1rb3hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTY1NjUsImV4cCI6MjA4OTkzMjU2NX0.w3vRAPhiU7Zavgkiv-ldjbHc_UJeGH9ck2tq_YN6MBo';

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
  var url = window.SUPABASE_URL + '/rest/v1' + path;
  var res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'apikey': window.SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + window.SUPABASE_ANON_KEY,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    var err = await res.text();
    throw new Error('Supabase ' + res.status + ': ' + err);
  }
  var text = await res.text();
  return text ? JSON.parse(text) : null;
};

window.sbInsert = function (table, data) {
  return window.sbFetch('/' + table, {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(data),
  });
};

window.sbSelect = function (path) {
  return window.sbFetch(path);
};

window.sbPatch = function (path, data) {
  return window.sbFetch(path, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(data),
  });
};

window.sbDelete = function (path) {
  return window.sbFetch(path, { method: 'DELETE' });
};
