/* ============================================================
   /api/employees — إدارة الموظفين (أدمن فقط) · BE-P3
   GET: قائمة الموظفين
   POST {action:'create'|'update'}: إضافة / تعديل (دور · حالة · كلمة مرور)
   ============================================================ */
import { json, requireAdmin, hashPassword } from './_utils.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'no_db' }, 500);
  const g = await requireAdmin(request, env);
  if (g.error) return g.error;

  const { results } = await env.DB.prepare(
    'SELECT id, name, username, role, active, created_at FROM employees ORDER BY id'
  ).all();
  return json({ ok: true, employees: results });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'no_db' }, 500);
  const g = await requireAdmin(request, env);
  if (g.error) return g.error;
  const admin = g.user;

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }

  /* ---------- إضافة موظف ---------- */
  if (body.action === 'create') {
    const name = (body.name || '').trim();
    const username = (body.username || '').trim().toLowerCase();
    const password = body.password || '';
    const role = body.role || '';
    const ROLES = ['reception', 'marketing', 'social', 'website', 'stores', 'hr', 'accounting', 'admin'];

    if (name.length < 2) return json({ error: 'name_short' }, 400);
    if (!/^[a-z0-9_.-]{3,30}$/.test(username)) return json({ error: 'bad_username' }, 400);
    if (password.length < 8) return json({ error: 'password_short' }, 400);
    if (ROLES.indexOf(role) === -1) return json({ error: 'bad_role' }, 400);

    const exists = await env.DB.prepare('SELECT id FROM employees WHERE username = ?1').bind(username).first();
    if (exists) return json({ error: 'username_taken' }, 409);

    const { salt, hash } = await hashPassword(password);
    const r = await env.DB.prepare(
      'INSERT INTO employees (name, username, pass_salt, pass_hash, role, active) VALUES (?1, ?2, ?3, ?4, ?5, 1)'
    ).bind(name, username, salt, hash, role).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }

  /* ---------- تعديل موظف ---------- */
  if (body.action === 'update') {
    const id = body.id;
    if (!id) return json({ error: 'missing_id' }, 400);

    /* حماية: الأدمن لا يستطيع إيقاف نفسه */
    if (id === admin.id && body.active === 0) return json({ error: 'cannot_disable_self' }, 400);

    if (body.role !== undefined) {
      await env.DB.prepare('UPDATE employees SET role = ?1 WHERE id = ?2').bind(body.role, id).run();
    }
    if (body.active !== undefined) {
      await env.DB.prepare('UPDATE employees SET active = ?1 WHERE id = ?2').bind(body.active ? 1 : 0, id).run();
      if (!body.active) {
        await env.DB.prepare('DELETE FROM sessions WHERE employee_id = ?1').bind(id).run();
      }
    }
    if (body.password) {
      if (body.password.length < 8) return json({ error: 'password_short' }, 400);
      const { salt, hash } = await hashPassword(body.password);
      await env.DB.prepare('UPDATE employees SET pass_salt = ?1, pass_hash = ?2 WHERE id = ?3')
        .bind(salt, hash, id).run();
    }
    return json({ ok: true });
  }

  return json({ error: 'bad_action' }, 400);
}
