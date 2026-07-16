/* ============================================================
   POST /api/setup — الإعداد الأول (مرة واحدة فقط)
   ينشئ حساب الأدمن + يزرع المهام الافتراضية في D1
   يتعطل نهائياً بمجرد وجود أي مستخدم في القاعدة
   ============================================================ */
import { json, hashPassword } from './_utils.js';
import { DEFAULT_TASKS } from './_seed.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'no_db' }, 500);

  /* حماية: يعمل فقط والقاعدة فارغة */
  const row = await env.DB.prepare('SELECT COUNT(*) AS c FROM employees').first();
  if (row.c > 0) return json({ error: 'already_setup' }, 403);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }

  const name = (body.name || '').trim();
  const username = (body.username || '').trim().toLowerCase();
  const password = body.password || '';

  if (name.length < 2) return json({ error: 'name_short' }, 400);
  if (!/^[a-z0-9_.-]{3,30}$/.test(username)) return json({ error: 'bad_username' }, 400);
  if (password.length < 8) return json({ error: 'password_short' }, 400);

  const { salt, hash } = await hashPassword(password);
  await env.DB.prepare(
    'INSERT INTO employees (name, username, pass_salt, pass_hash, role, active) VALUES (?1, ?2, ?3, ?4, ?5, 1)'
  ).bind(name, username, salt, hash, 'admin').run();

  /* زرع المهام الافتراضية (إن لم تكن مزروعة) */
  const t = await env.DB.prepare('SELECT COUNT(*) AS c FROM tasks').first();
  if (t.c === 0) {
    const stmt = env.DB.prepare(
      'INSERT INTO tasks (id, role, enabled, instructions, payload) VALUES (?1, ?2, 1, ?3, ?4)'
    );
    const batch = DEFAULT_TASKS.map(task =>
      stmt.bind(task.id, task.role, task.instructions, JSON.stringify(task.payload))
    );
    await env.DB.batch(batch);
  }

  return json({ ok: true, seeded: DEFAULT_TASKS.length });
}
