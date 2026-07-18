/* ============================================================
   /api/minds — منظومة العقول · المرحلة 2: العقول والتوريث
   (ALL_GOV_Dev-Schema: جدولا minds و mind_files + access_logs)

   القواعد المنفَّذة حرفياً من أمر الشغل:
   - الهرم: central → dept → role (+ حقل surface).
   - الكتابة في mind_files: المالك فقط — هذا هو «التحكم في الداتا».
   - منطق القراءة: العقل يقرأ فقط (المربوط له) ∩ (status = Active).
   - اشتقاق افتراضي للربط من inherits_to + override يدوي.
   - كل قراءة تُسجَّل في access_logs.
   ============================================================ */
import { json, requireAdmin } from './_utils.js';

const LAYERS = ['central', 'dept', 'role'];

/* تطبيع رمز التوريث إلى معرّف عقل: 'dept:MKT' → 'dept-MKT' */
function tokenToMindId(token) {
  return String(token).trim().replace(':', '-');
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'no_db' }, 500);
  const g = await requireAdmin(request, env);
  if (g.error) return g.error;
  const url = new URL(request.url);

  /* ---- سجل الوصول (آخر 100) ---- */
  if (url.searchParams.get('logs') === '1') {
    const { results } = await env.DB.prepare(
      'SELECT l.id, l.mind_id, l.actor, l.action, l.at, f.name AS file_name ' +
      'FROM access_logs l LEFT JOIN files f ON f.id = l.file_id ' +
      'ORDER BY l.id DESC LIMIT 100'
    ).all();
    return json({ ok: true, logs: results });
  }

  /* ---- قراءة عقل: (المربوط) ∩ (Active) + تسجيل القراءة ---- */
  const readMind = url.searchParams.get('read');
  if (readMind) {
    const mind = await env.DB.prepare('SELECT id, name FROM minds WHERE id = ?1').bind(readMind).first();
    if (!mind) return json({ error: 'no_mind' }, 404);

    const { results } = await env.DB.prepare(
      "SELECT f.id, f.name, f.stage, f.stage_version, f.layer, f.inherits_to, f.surface_sensitivity, f.parent_decision, f.updated_at " +
      "FROM mind_files mf JOIN files f ON f.id = mf.file_id " +
      "WHERE mf.mind_id = ?1 AND f.status = 'Active' ORDER BY f.layer, f.name"
    ).bind(readMind).all();

    /* تسجيل كل قراءة (أمر الشغل م2/5) */
    if (results.length) {
      const stmt = env.DB.prepare(
        'INSERT INTO access_logs (mind_id, actor, file_id, action) VALUES (?1, ?2, ?3, ?4)'
      );
      await env.DB.batch(results.map(f => stmt.bind(readMind, g.user.username, f.id, 'read')));
    }

    return json({ ok: true, mind: mind.id, files: results });
  }

  /* ---- قائمة العقول مع عدد ملفات كل عقل ---- */
  const { results } = await env.DB.prepare(
    'SELECT m.id, m.name, m.layer, m.parent_mind_id, m.surface, ' +
    "(SELECT COUNT(*) FROM mind_files mf JOIN files f ON f.id = mf.file_id WHERE mf.mind_id = m.id AND f.status = 'Active') AS active_files " +
    'FROM minds m ORDER BY CASE m.layer WHEN \'central\' THEN 0 WHEN \'dept\' THEN 1 ELSE 2 END, m.id'
  ).all();
  return json({ ok: true, minds: results });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'no_db' }, 500);
  const g = await requireAdmin(request, env); /* الكتابة: المالك فقط */
  if (g.error) return g.error;

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }

  /* ===== إنشاء عقل ===== */
  if (body.action === 'create_mind') {
    const id = (body.id || '').trim();
    const name = (body.name || '').trim();
    const layer = body.layer || '';
    const parent = (body.parent_mind_id || '').trim() || null;
    const surface = (body.surface || '-').trim() || '-';

    if (!/^[a-zA-Z0-9_-]{2,50}$/.test(id)) return json({ error: 'bad_id', msg: 'معرّف العقل: أحرف إنجليزية/أرقام/شرطة (مثل central · dept-MKT · role-seo)' }, 400);
    if (!name) return json({ error: 'missing_name', msg: 'اسم العقل مطلوب' }, 400);
    if (LAYERS.indexOf(layer) === -1) return json({ error: 'bad_layer', msg: 'الطبقة: central / dept / role فقط' }, 400);
    if (layer !== 'central' && !parent) return json({ error: 'missing_parent', msg: 'عقل ' + layer + ' يحتاج أباً في الهرم (م6/ب2: التوريث هابط)' }, 400);
    if (parent) {
      const p = await env.DB.prepare('SELECT id, layer FROM minds WHERE id = ?1').bind(parent).first();
      if (!p) return json({ error: 'no_parent', msg: 'العقل الأب غير موجود: ' + parent }, 400);
      if (layer === 'dept' && p.layer !== 'central') return json({ error: 'bad_hierarchy', msg: 'عقل قسم أبوه المركزي فقط' }, 400);
      if (layer === 'role' && p.layer !== 'dept') return json({ error: 'bad_hierarchy', msg: 'عقل دور أبوه عقل قسم فقط' }, 400);
    }
    const exists = await env.DB.prepare('SELECT id FROM minds WHERE id = ?1').bind(id).first();
    if (exists) return json({ error: 'mind_exists', msg: 'المعرّف مستخدم' }, 409);

    await env.DB.prepare(
      'INSERT INTO minds (id, name, layer, parent_mind_id, surface) VALUES (?1, ?2, ?3, ?4, ?5)'
    ).bind(id, name, layer, parent, surface).run();
    return json({ ok: true, id });
  }

  /* ===== ربط/فك يدوي (override المالك) ===== */
  if (body.action === 'link' || body.action === 'unlink') {
    if (!body.mind_id || !body.file_id) return json({ error: 'missing' }, 400);
    if (body.action === 'link') {
      await env.DB.prepare(
        'INSERT OR IGNORE INTO mind_files (mind_id, file_id, granted_by) VALUES (?1, ?2, ?3)'
      ).bind(body.mind_id, body.file_id, g.user.username).run();
    } else {
      await env.DB.prepare(
        'DELETE FROM mind_files WHERE mind_id = ?1 AND file_id = ?2'
      ).bind(body.mind_id, body.file_id).run();
    }
    return json({ ok: true });
  }

  /* ===== الاشتقاق الافتراضي من inherits_to (أمر الشغل م2/4) =====
     'all' → كل العقول · 'dept:MKT' → dept-MKT + أدواره · 'role:xx' → عقل الدور · '-' → لا ربط */
  if (body.action === 'auto_link') {
    const file = await env.DB.prepare('SELECT id, inherits_to FROM files WHERE id = ?1').bind(body.file_id).first();
    if (!file) return json({ error: 'no_file' }, 404);

    let tokens;
    try { tokens = JSON.parse(file.inherits_to); } catch (e) { tokens = [String(file.inherits_to)]; }

    const { results: allMinds } = await env.DB.prepare('SELECT id, layer, parent_mind_id FROM minds').all();
    const target = new Set();

    for (const t of tokens) {
      const tok = String(t).trim();
      if (tok === '-' || tok === '') continue;
      if (tok === 'all') { allMinds.forEach(m => target.add(m.id)); continue; }
      const mid = tokenToMindId(tok);
      const mind = allMinds.find(m => m.id === mid);
      if (mind) {
        target.add(mind.id);
        /* التوريث هابط: القسم يورّث أدواره */
        if (mind.layer === 'dept') {
          allMinds.filter(m => m.parent_mind_id === mind.id).forEach(m => target.add(m.id));
        }
      }
    }

    if (target.size) {
      const stmt = env.DB.prepare('INSERT OR IGNORE INTO mind_files (mind_id, file_id, granted_by) VALUES (?1, ?2, ?3)');
      await env.DB.batch([...target].map(mid => stmt.bind(mid, file.id, 'auto:' + g.user.username)));
    }
    return json({ ok: true, linked: [...target] });
  }

  return json({ error: 'bad_action' }, 400);
}
