/* ============================================================
   GET /api/me — من أنا؟
   الواجهة تستخدمه لاكتشاف: وضع حي؟ يحتاج إعداداً أول؟ مسجَّل دخول؟
   ============================================================ */
import { json, getUser } from './_utils.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ live: false, error: 'no_db' }, 200);

  try {
    const user = await getUser(request, env);
    if (user) {
      return json({ live: true, user: { name: user.name, username: user.username, role: user.role } });
    }
    const row = await env.DB.prepare('SELECT COUNT(*) AS c FROM employees').first();
    return json({ live: true, user: null, needSetup: row.c === 0 }, 200);
  } catch (e) {
    /* القاعدة مربوطة لكن الجداول غير منشأة بعد */
    return json({ live: false, error: 'db_not_ready' }, 200);
  }
}
