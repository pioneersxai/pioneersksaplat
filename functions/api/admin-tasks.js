/* ============================================================
   /api/admin-tasks — إدارة المهام والـ Schemas (أدمن فقط) · BE-P3
   GET: كل المهام شاملة التعليمات السرية
   POST {action:'save'}: حفظ/إنشاء مهمة (Upsert)
   POST {action:'toggle'}: تفعيل/تعطيل
   ============================================================ */
import { json, requireAdmin } from './_utils.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'no_db' }, 500);
  const g = await requireAdmin(request, env);
  if (g.error) return g.error;

  const { results } = await env.DB.prepare(
    'SELECT id, role, enabled, instructions, payload, updated_at FROM tasks ORDER BY role, id'
  ).all();
  const tasks = results.map(r => ({
    id: r.id, role: r.role, enabled: !!r.enabled,
    instructions: r.instructions,
    payload: JSON.parse(r.payload),
    updated_at: r.updated_at
  }));
  return json({ ok: true, tasks });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'no_db' }, 500);
  const g = await requireAdmin(request, env);
  if (g.error) return g.error;

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }

  if (body.action === 'save') {
    const id = (body.id || '').trim();
    const role = body.role || '';
    const instructions = body.instructions || '';
    const payload = body.payload;
    const enabled = body.enabled === false ? 0 : 1;

    if (!/^[a-z0-9_-]{2,50}$/.test(id)) return json({ error: 'bad_id' }, 400);
    if (!role) return json({ error: 'bad_role' }, 400);
    if (!payload || !payload.fields || !payload.fields.length) return json({ error: 'no_fields' }, 400);

    await env.DB.prepare(
      "INSERT INTO tasks (id, role, enabled, instructions, payload, updated_at) " +
      "VALUES (?1, ?2, ?3, ?4, ?5, datetime('now')) " +
      "ON CONFLICT(id) DO UPDATE SET role = ?2, enabled = ?3, instructions = ?4, payload = ?5, updated_at = datetime('now')"
    ).bind(id, role, enabled, instructions, JSON.stringify(payload)).run();

    return json({ ok: true });
  }

  if (body.action === 'toggle') {
    await env.DB.prepare('UPDATE tasks SET enabled = ?1 WHERE id = ?2')
      .bind(body.enabled ? 1 : 0, body.id).run();
    return json({ ok: true });
  }

  return json({ error: 'bad_action' }, 400);
}
