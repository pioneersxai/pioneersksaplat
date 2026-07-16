/* ============================================================
   GET /api/tasks — مهام القسم الخاص بالمستخدم المسجَّل
   ⚠️ الـ payload فقط يُرسَل — التعليمات (instructions) لا تغادر الخادم أبداً
   ============================================================ */
import { json, getUser } from './_utils.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'no_db' }, 500);

  const user = await getUser(request, env);
  if (!user) return json({ error: 'auth' }, 401);

  const q = (user.role === 'admin')
    ? env.DB.prepare('SELECT id, role, payload FROM tasks WHERE enabled = 1 ORDER BY role')
    : env.DB.prepare('SELECT id, role, payload FROM tasks WHERE enabled = 1 AND role = ?1').bind(user.role);

  const { results } = await q.all();
  const tasks = results.map(r => {
    const p = JSON.parse(r.payload);
    p.id = r.id;
    return p;
  });

  return json({ ok: true, role: user.role, tasks });
}
