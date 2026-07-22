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

  /* المهام اليومية: هل أرسل الموظف مخرَجها اليوم؟ (توقيت الرياض +3) */
  const today = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
  const doneRows = await env.DB.prepare(
    "SELECT DISTINCT task_id FROM outputs WHERE employee_id = ?1 AND submitted_at IS NOT NULL AND date(submitted_at, '+3 hours') = ?2"
  ).bind(user.id, today).all();
  const doneSet = {};
  for (const r of (doneRows.results || [])) doneSet[r.task_id] = true;

  const tasks = results.map(r => {
    const p = JSON.parse(r.payload);
    p.id = r.id;
    p.daily = p.daily === 1 || p.daily === true;
    p.done_today = !!doneSet[r.id];
    return p;
  });

  return json({ ok: true, role: user.role, tasks });
}
