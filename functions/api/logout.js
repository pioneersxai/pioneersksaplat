/* ============================================================
   POST /api/logout — إنهاء الجلسة وحذفها من القاعدة
   ============================================================ */
import { json, getCookie, sessionCookie } from './_utils.js';

export async function onRequestPost({ request, env }) {
  const token = getCookie(request, 'session');
  if (token && env.DB) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?1').bind(token).run();
  }
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
}
