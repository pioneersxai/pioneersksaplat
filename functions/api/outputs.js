/* ============================================================
   /api/outputs — طابور مراجعة المخرجات (أدمن فقط) · BE-P3
   GET: المعلّق + آخر المحسوم
   POST {action:'decide', id, state:'approved'|'returned'}
   لا اعتماد تلقائي أبداً — GOV-HUMAN-REVIEW
   ============================================================ */
import { json, requireAdmin } from './_utils.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'no_db' }, 500);
  const g = await requireAdmin(request, env);
  if (g.error) return g.error;

  const { results } = await env.DB.prepare(
    "SELECT o.id, o.task_id, o.content, o.state, o.created_at, e.name AS emp_name " +
    "FROM outputs o JOIN employees e ON e.id = o.employee_id " +
    "ORDER BY CASE o.state WHEN 'pending' THEN 0 ELSE 1 END, o.id DESC LIMIT 60"
  ).all();
  return json({ ok: true, outputs: results });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'no_db' }, 500);
  const g = await requireAdmin(request, env);
  if (g.error) return g.error;

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }

  if (body.action === 'decide') {
    const state = body.state;
    if (state !== 'approved' && state !== 'returned') return json({ error: 'bad_state' }, 400);
    await env.DB.prepare('UPDATE outputs SET state = ?1 WHERE id = ?2').bind(state, body.id).run();
    return json({ ok: true });
  }

  return json({ error: 'bad_action' }, 400);
}
