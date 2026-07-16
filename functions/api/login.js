/* ============================================================
   POST /api/login — تسجيل الدخول
   يتحقق من كلمة المرور (PBKDF2) وينشئ جلسة 30 يوماً بكوكي HttpOnly
   ============================================================ */
import { json, verifyPassword, newToken, sessionCookie } from './_utils.js';

const SESSION_DAYS = 30;

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'no_db' }, 500);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }

  const username = (body.username || '').trim().toLowerCase();
  const password = body.password || '';
  if (!username || !password) return json({ error: 'missing' }, 400);

  const user = await env.DB.prepare(
    'SELECT id, name, username, pass_salt, pass_hash, role, active FROM employees WHERE username = ?1'
  ).bind(username).first();

  /* رسالة واحدة عامة — لا نكشف أيهما الخطأ (أمان) */
  if (!user || !user.active) return json({ error: 'invalid' }, 401);
  const ok = await verifyPassword(password, user.pass_salt, user.pass_hash);
  if (!ok) return json({ error: 'invalid' }, 401);

  const token = newToken();
  await env.DB.prepare(
    "INSERT INTO sessions (token, employee_id, expires_at) VALUES (?1, ?2, datetime('now', '+' || ?3 || ' days'))"
  ).bind(token, user.id, SESSION_DAYS).run();

  /* تنظيف الجلسات المنتهية (صيانة خفيفة مع كل دخول) */
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();

  return json(
    { ok: true, user: { name: user.name, username: user.username, role: user.role } },
    200,
    { 'Set-Cookie': sessionCookie(token, SESSION_DAYS * 86400) }
  );
}
