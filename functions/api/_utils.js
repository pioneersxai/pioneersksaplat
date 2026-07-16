/* ============================================================
   _utils.js — أدوات مشتركة للـ API (لا يُوجَّه كمسار — يبدأ بـ _)
   BE-P1 · منصّة العمل الذكية
   ============================================================ */

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }
  });
}

/* ---------- تشفير كلمات المرور: PBKDF2-SHA256 (Web Crypto) ---------- */
const ITERATIONS = 100000;

function b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function unb64(s) {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

export async function hashPassword(password, saltB64) {
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256
  );
  return { salt: b64(salt), hash: b64(bits) };
}

export async function verifyPassword(password, saltB64, expectedHash) {
  const { hash } = await hashPassword(password, saltB64);
  return hash === expectedHash;
}

/* ---------- الجلسات ---------- */
export function newToken() {
  const a = crypto.getRandomValues(new Uint8Array(32));
  return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function sessionCookie(token, maxAgeSeconds) {
  return 'session=' + token +
    '; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=' + maxAgeSeconds;
}

export function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const m = header.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : null;
}

/* يعيد بيانات المستخدم الحالي من الجلسة — أو null */
export async function getUser(request, env) {
  const token = getCookie(request, 'session');
  if (!token) return null;
  const row = await env.DB.prepare(
    "SELECT e.id, e.name, e.username, e.role, e.active " +
    "FROM sessions s JOIN employees e ON e.id = s.employee_id " +
    "WHERE s.token = ?1 AND s.expires_at > datetime('now') AND e.active = 1"
  ).bind(token).first();
  return row || null;
}
