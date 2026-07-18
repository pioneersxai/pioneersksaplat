/* ============================================================
   /api/minds-files — منظومة العقول · المرحلة 1
   جدول files بالترويسة-9 (ALL_GOV_Dev-Schema — ترجمة D1)

   القواعد المنفَّذة حرفياً من أمر الشغل:
   - Validation صارم: رفض أي إدخال بحقل ترويسة ناقص — برسالة تسمّي الحقل.
     الفراغ المقصود يُكتب '-' صراحة.
   - تعديل حقول الترويسة (status·supersedes·layer·inherits_to·
     surface_sensitivity·parent_decision·stage): حساب المالك (admin) فقط.
   - قراءة العقول (readable=1) = Active فقط — الأرشيف Superseded
     يظهر للمالك في تبويب الأرشيف فقط.
   🔒 GOV-SEC: فلتر البوابة يُضاف في المرحلة 3 — حتى حينها
   ممنوع إدخال أي بيانات حقيقية (بيانات الاختبار وهمية دائماً).
   ============================================================ */
import { json, getUser, requireAdmin, gateScan } from './_utils.js';

/* الحقول التسعة الإلزامية + المحتوى — بأسمائها الحرفية من السكيما */
const HEADER_FIELDS = [
  ['name', 'الاسم (نظام التسمية §14)'],
  ['stage', 'الحالة (T1/T2/T3/Final/V)'],
  ['status', 'حالة السريان (Active/Superseded/Gap)'],
  ['supersedes', 'يلغي (والفراغ المقصود = -)'],
  ['layer', 'الطبقة (central / dept:XX / role:XX)'],
  ['inherits_to', 'يورَّث إلى (والفراغ المقصود = -)'],
  ['surface_sensitivity', 'حساسية السطح (0-public / 1-surface / 2-internal-no-output)'],
  ['parent_decision', 'القرار الأم (والفراغ المقصود = -)'],
  ['content', 'محتوى الملف']
];

const STAGES = ['T1', 'T2', 'T3', 'Final', 'V'];
const STATUSES = ['Active', 'Superseded', 'Gap'];
const SENSITIVITIES = ['0-public', '1-surface', '2-internal-no-output'];
/* الدرجة 3-blocked ليست قيمة تخزين — فلتر بوابة (م5) · تُرفض هنا صراحة */

/* حقول الترويسة التي تعديلها صلاحية المالك فقط (أمر الشغل م1/3) */
const OWNER_ONLY_FIELDS = ['stage', 'stage_version', 'status', 'supersedes', 'layer', 'inherits_to', 'surface_sensitivity', 'surface_scope', 'parent_decision'];

function normList(v) {
  /* يقبل نصاً 'all' أو مصفوفة — يخزَّن JSON نصياً (ترجمة text[] → JSON) */
  if (Array.isArray(v)) return v.length ? JSON.stringify(v) : '';
  if (typeof v === 'string' && v.trim() !== '') return JSON.stringify([v.trim()]);
  return '';
}

function validate(body) {
  for (const [f, label] of HEADER_FIELDS) {
    const v = body[f];
    const empty = v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
    if (empty) {
      return { error: 'missing_field', field: f, msg: 'إدخال مرفوض — حقل الترويسة ناقص: «' + label + '». الفراغ المقصود يُكتب - صراحة.' };
    }
  }
  if (STAGES.indexOf(body.stage) === -1) return { error: 'bad_stage', msg: 'قيمة stage غير صحيحة — المسموح: ' + STAGES.join(' / ') };
  if (STATUSES.indexOf(body.status) === -1) return { error: 'bad_status', msg: 'قيمة status غير صحيحة — المسموح: ' + STATUSES.join(' / ') };
  if (body.surface_sensitivity === '3-blocked') return { error: 'blocked_sensitivity', msg: 'الدرجة 3 (خارج المنظومة) قيمة منع إدخال لا تخزين — هذا المحتوى لا يدخل المنظومة أصلاً (م5).' };
  if (SENSITIVITIES.indexOf(body.surface_sensitivity) === -1) return { error: 'bad_sensitivity', msg: 'قيمة الحساسية غير صحيحة — المسموح: ' + SENSITIVITIES.join(' / ') };
  return null;
}

/* ---------- GET: قوائم ----------
   ?readable=1 → قراءة العقول: Active فقط (بلا محتوى الأرشيف)
   ?scope=archive → الأرشيف Superseded (أدمن فقط)
   ?id=... → ملف واحد كامل (أدمن فقط في المرحلة 1) */
export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'no_db' }, 500);
  const url = new URL(request.url);

  /* مسار قراءة العقول — Active حصراً (سيستخدمه منطق العقول في المرحلة 2) */
  if (url.searchParams.get('readable') === '1') {
    const user = await getUser(request, env);
    if (!user) return json({ error: 'auth' }, 401);
    const { results } = await env.DB.prepare(
      "SELECT id, name, stage, stage_version, status, layer, inherits_to, surface_sensitivity, surface_scope, parent_decision, updated_at FROM files WHERE status = 'Active' ORDER BY layer, name"
    ).all();
    return json({ ok: true, files: results });
  }

  const g = await requireAdmin(request, env);
  if (g.error) return g.error;

  /* ---- حوادث البوابة (أدمن) ---- */
  if (url.searchParams.get('incidents') === '1') {
    const { results } = await env.DB.prepare(
      'SELECT id, what_entered, seen_by, remediation, resolved, created_at FROM incidents ORDER BY id DESC LIMIT 50'
    ).all();
    return json({ ok: true, incidents: results });
  }

  const id = url.searchParams.get('id');
  if (id) {
    const row = await env.DB.prepare('SELECT * FROM files WHERE id = ?1').bind(id).first();
    if (!row) return json({ error: 'not_found' }, 404);
    return json({ ok: true, file: row });
  }

  const scope = url.searchParams.get('scope') === 'archive' ? 'Superseded' : 'Active';
  const { results } = await env.DB.prepare(
    'SELECT id, name, created_at, updated_at, stage, stage_version, status, supersedes, layer, inherits_to, surface_sensitivity, surface_scope, parent_decision, source_of, length(content) AS content_len FROM files WHERE status = ?1 ORDER BY layer, name'
  ).bind(scope).all();
  return json({ ok: true, scope, files: results });
}

/* ---------- POST: إنشاء / تعديل ترويسة / تغيير حالة ---------- */
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'no_db' }, 500);

  /* كل عمليات الكتابة في المرحلة 1: المالك فقط.
     موظف يحاول → 403 (شرط قبول م1) */
  const g = await requireAdmin(request, env);
  if (g.error) return g.error;

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }

  /* ===== حوادث البوابة: تعليم كمُعالَج ===== */
  if (body.action === 'resolve_incident') {
    if (!body.id) return json({ error: 'missing_id' }, 400);
    await env.DB.prepare(
      'UPDATE incidents SET resolved = 1, remediation = ?1 WHERE id = ?2'
    ).bind(body.remediation || 'روجعت — لا سر حقيقياً', body.id).run();
    return json({ ok: true });
  }

  /* ===== استيراد حزمة معتمدة (تحميل ملفات العقول) =====
     كل ملف: يُفحص بالبوابة (التجاوز الجماعي بقرار المالك يُسجَّل لكل ملف) ·
     Supersession آلي · ربط صريح بالعقول حسب تعليمات التحميل (link_to). */
  if (body.action === 'import_bundle') {
    if (!Array.isArray(body.files) || !body.files.length) return json({ error: 'empty_bundle' }, 400);
    if (body.files.length > 60) return json({ error: 'too_many' }, 400);

    const report = [];
    for (const item of body.files) {
      const r = { name: item.name || '؟' };
      const v = validate(item);
      if (v) { r.ok = false; r.msg = v.msg; report.push(r); continue; }

      const hits = gateScan(String(item.name) + '\n' + String(item.content));
      if (hits.length && !body.gate_override) {
        r.ok = false; r.msg = 'gate_blocked: ' + hits.map(h => h.type).join('،');
        report.push(r); continue;
      }
      if (hits.length) {
        await env.DB.prepare(
          'INSERT INTO access_logs (mind_id, actor, file_id, action) VALUES (NULL, ?1, NULL, ?2)'
        ).bind(g.user.username, 'gate-override(bundle): ' + String(item.name).slice(0, 80)).run();
      }

      const fid = crypto.randomUUID();
      const sup = normList(item.supersedes) || '["-"]';
      const inh = normList(item.inherits_to);
      await env.DB.prepare(
        'INSERT INTO files (id, name, stage, stage_version, status, supersedes, layer, inherits_to, surface_sensitivity, surface_scope, parent_decision, source_of, content) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)'
      ).bind(
        fid, String(item.name).trim(), item.stage, (item.stage_version || '-'), item.status,
        sup, String(item.layer).trim(), inh, item.surface_sensitivity,
        (item.surface_scope || '-'), String(item.parent_decision).trim(), null, String(item.content)
      ).run();

      /* Supersession آلي */
      let superseded = 0;
      try {
        for (const ref of JSON.parse(sup)) {
          if (ref && ref !== '-') {
            const u = await env.DB.prepare(
              "UPDATE files SET status = 'Superseded', updated_at = date('now') WHERE name = ?1 AND status = 'Active' AND id <> ?2"
            ).bind(ref.split('§')[0], fid).run();
            superseded += (u.meta.changes || 0);
          }
        }
      } catch (e) { }

      /* الربط الصريح حسب تعليمات التحميل */
      let linked = [];
      if (Array.isArray(item.link_to)) {
        for (const mid of item.link_to) {
          const m = await env.DB.prepare('SELECT id FROM minds WHERE id = ?1').bind(mid).first();
          if (m) {
            await env.DB.prepare(
              'INSERT OR IGNORE INTO mind_files (mind_id, file_id, granted_by) VALUES (?1, ?2, ?3)'
            ).bind(mid, fid, 'bundle:' + g.user.username).run();
            linked.push(mid);
          }
        }
      }

      r.ok = true; r.id = fid; r.superseded = superseded; r.linked = linked;
      if (hits.length) r.overridden = hits.map(h => h.type + '(' + h.masked + ')');
      report.push(r);
    }
    return json({ ok: true, report });
  }

  /* ===== إنشاء ملف ===== */
  if (body.action === 'create') {
    const v = validate(body);
    if (v) return json(v, 400);

    /* 🔒 فلتر البوابة (المرحلة 3): فحص آلي قبل أي إدخال —
       اصطياد → تعليق الرفع + تسجيل حادثة + تنبيه المالك.
       التجاوز فقط بتأكيد صريح من المالك (gate_override) ويُسجَّل. */
    if (!body.gate_override) {
      const hits = gateScan(String(body.name) + '\n' + String(body.content));
      if (hits.length) {
        await env.DB.prepare(
          'INSERT INTO incidents (what_entered, seen_by, remediation, resolved) VALUES (?1, ?2, ?3, 0)'
        ).bind(
          'محاولة رفع مُعلَّقة: «' + String(body.name).slice(0, 80) + '» — اصطياد: ' +
          hits.map(h => h.type + ' (' + h.masked + ')').join(' · '),
          JSON.stringify([g.user.username]),
          null
        ).run();
        return json({
          error: 'gate_blocked',
          hits,
          msg: '🔒 فلتر البوابة علّق الرفع — اصطاد: ' + hits.map(h => h.type + ' (' + h.masked + ')').join(' · ') +
            '. سُجّلت حادثة. إن كنت متأكداً أن هذا ليس سراً حقيقياً (مثل تواريخ أو مصطلحات في نص معتمد) أكّد التجاوز.'
        }, 422);
      }
    } else {
      /* تجاوز موثَّق بقرار المالك */
      await env.DB.prepare(
        'INSERT INTO access_logs (mind_id, actor, file_id, action) VALUES (NULL, ?1, NULL, ?2)'
      ).bind(g.user.username, 'gate-override: ' + String(body.name).slice(0, 80)).run();
    }

    const id = crypto.randomUUID();
    const supersedes = normList(body.supersedes);
    const inherits = normList(body.inherits_to);
    if (!inherits) return json({ error: 'missing_field', field: 'inherits_to', msg: 'إدخال مرفوض — حقل الترويسة ناقص: «يورَّث إلى». الفراغ المقصود يُكتب - صراحة.' }, 400);

    await env.DB.prepare(
      'INSERT INTO files (id, name, stage, stage_version, status, supersedes, layer, inherits_to, surface_sensitivity, surface_scope, parent_decision, source_of, content) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)'
    ).bind(
      id, String(body.name).trim(), body.stage,
      (body.stage_version || '-'), body.status,
      supersedes || '["-"]', String(body.layer).trim(), inherits,
      body.surface_sensitivity, (body.surface_scope || '-'),
      String(body.parent_decision).trim(), (body.source_of || null),
      String(body.content)
    ).run();

    /* Supersession: الملفات المذكورة في supersedes تتحول Superseded آلياً */
    let superseded = 0;
    try {
      const list = JSON.parse(supersedes || '[]');
      for (const ref of list) {
        if (ref && ref !== '-') {
          const r = await env.DB.prepare(
            "UPDATE files SET status = 'Superseded', updated_at = date('now') WHERE name = ?1 AND status = 'Active' AND id <> ?2"
          ).bind(ref.split('§')[0], id).run();
          superseded += (r.meta.changes || 0);
        }
      }
    } catch (e) { /* مرجع جزئي بصيغة غير اسمية — يُدار يدوياً */ }

    return json({ ok: true, id, superseded });
  }

  /* ===== تعديل حقول الترويسة (المالك فقط — وصلنا هنا بعد requireAdmin) ===== */
  if (body.action === 'update_header') {
    if (!body.id) return json({ error: 'missing_id' }, 400);
    const row = await env.DB.prepare('SELECT id FROM files WHERE id = ?1').bind(body.id).first();
    if (!row) return json({ error: 'not_found' }, 404);

    const sets = [];
    const vals = [];
    let n = 1;
    for (const f of OWNER_ONLY_FIELDS) {
      if (body[f] !== undefined) {
        let v = body[f];
        if (f === 'supersedes' || f === 'inherits_to') v = normList(v) || '["-"]';
        if (f === 'status' && STATUSES.indexOf(v) === -1) return json({ error: 'bad_status' }, 400);
        if (f === 'surface_sensitivity' && SENSITIVITIES.indexOf(v) === -1) return json({ error: 'bad_sensitivity' }, 400);
        sets.push(f + ' = ?' + n); vals.push(v); n++;
      }
    }
    if (body.content !== undefined) { sets.push('content = ?' + n); vals.push(String(body.content)); n++; }
    if (!sets.length) return json({ error: 'nothing_to_update' }, 400);

    sets.push("updated_at = date('now')");
    vals.push(body.id);
    await env.DB.prepare('UPDATE files SET ' + sets.join(', ') + ' WHERE id = ?' + n).bind(...vals).run();
    return json({ ok: true });
  }

  return json({ error: 'bad_action' }, 400);
}
