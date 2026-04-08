/**
 * ODARA — Configuração Central
 * Edite este arquivo para alterar prazo, senha e conexão Supabase
 */

// ── Prazo de coleta ──────────────────────────────────────────
// Após esta data, o formulário é bloqueado automaticamente
window.ODARA_DEADLINE = new Date('2026-04-24T23:59:59-03:00');

// ── Senha do painel ──────────────────────────────────────────
window.ODARA_PASSWORD = 'odara';

// ── Supabase ─────────────────────────────────────────────────
// Cole aqui as credenciais do seu projeto Supabase
// Settings → API → Project URL e anon/public key
window.SUPABASE_URL      = 'khqbimmcibutfrfmkoxr';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocWJpbW1jaWJ1dGZyZm1rb3hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTY1NjUsImV4cCI6MjA4OTkzMjU2NX0.w3vRAPhiU7Zavgkiv-ldjbHc_UJeGH9ck2tq_YN6MBo';

// ── Utilitário: prazo expirado? ──────────────────────────────
window.isDeadlinePassed = function() {
  return new Date() > window.ODARA_DEADLINE;
};

// ── Supabase helpers ─────────────────────────────────────────
window.sbFetch = async function(path, opts = {}) {
  const url = window.SUPABASE_URL + '/rest/v1' + path;
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'apikey': window.SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + window.SUPABASE_ANON_KEY,
      ...(opts.headers || {})
    }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

window.sbInsert = async function(table, data, opts = {}) {
  return window.sbFetch('/' + table, {
    method: 'POST',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify(data),
    ...opts
  });
};

window.sbSelect = async function(path) {
  return window.sbFetch(path);
};
