/* ============================================================
   /api/outputs — دورة حياة المخرَج والمراجعة · المرحلة 4
   الحالات: Draft → Pending-Review → Approved / Rejected(+سبب إلزامي)

   القواعد المنفَّذة حرفياً من أمر الشغل (م4):
   1. criticality · reviewed_by · reviewed_at · reject_reason
   2. الفترة الانتقالية (60 يوماً من Go-Live): كل مخرَج → Pending إلزامياً
      (وما قبل Go-Live يعامَل انتقالياً — أشدّ لا أخفّ)
   3. بعدها: critical → Pending دائماً · normal → اعتماد آلي + عيّنة
      عشوائية للمراجعة (نسبة قابلة للضبط · افتراضي 20%)
   4. critical تلقائياً: لقب/اعتماد طبي · نمط الفلتر اللغوي ·
      سطح سعودي عام · نوع صفحة موقع/متجر (classifyCriticality)
   5. لا تصدير لأي مخرَج غير Approved (مسار ?export)
   6. شاشة المالك: عداد Pending + اعتماد/رفض بسبب إلزامي
   ============================================================ */
import { json, getUser, requireAdmin, classifyCriticality, getLifecycle } from './_utils.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'no_db' }, 500);
  const url = new URL(request.url);

  const user = await getUser(request, env);
  if (!user) return json({ error: 'auth' }, 401);

  /* ---- بوابة التصدير (القاعدة 5): Approved فقط ---- */
  const expId = url.searchParams.get('export');
  if (expId) {
    const row = await env.DB.prepare('SELECT * FROM outputs WHERE id = ?1').bind(expId).first();
    if (!row) return json({ error: 'not_found' }, 404);
    if (user.role !== 'admin' && row.employee_id !== user.id) return json({ error: 'forbidden' }, 403);
    if (row.status !== 'Approved') {
      return json({ error: 'not_approved', msg: 'لا تصدير/نشر/إرسال لأي مخرَج غير معتمد — حالته الآن: ' + row.status }, 403);
    }
    return json({ ok: true, output: { id: row.id, task_id: row.task_id, content: row.content, status: row.status, reviewed_by: row.reviewed_by, reviewed_at: row.reviewed_at } });
  }

  /* ---- الموظف: مخرجاتي فقط (بلا محتوى الآخرين) ---- */
  if (url.searchParams.get('mine') === '1') {
    const { results } = await env.DB.prepare(
      'SELECT id, task_id, status, criticality, crit_reasons, sampled, reject_reason, reviewed_at, created_at FROM outputs WHERE employee_id = ?1 ORDER BY id DESC LIMIT 30'
    ).bind(user.id).all();
    return json({ ok: true, outputs: results });
  }

  /* ---- شاشة المالك: القائمة + العداد + وضع الدورة ---- */
  const g = await requireAdmin(request, env);
  if (g.error) return g.error;

  const lc = await getLifecycle(env);
  const { results } = await env.DB.prepare(
    "SELECT o.id, o.task_id, o.content, o.status, o.criticality, o.crit_reasons, o.sampled, o.reject_reason, o.reviewed_by, o.reviewed_at, o.created_at, e.name AS emp_name " +
    "FROM outputs o JOIN employees e ON e.id = o.employee_id " +
    "ORDER BY CASE o.status WHEN 'Pending-Review' THEN 0 WHEN 'Draft' THEN 1 ELSE 2 END, o.id DESC LIMIT 80"
  ).all();
  const pc = await env.DB.prepare("SELECT COUNT(*) AS c FROM outputs WHERE status = 'Pending-Review'").first();
  return json({ ok: true, outputs: results, pending: pc.c, lifecycle: lc });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'no_db' }, 500);

  const user = await getUser(request, env);
  if (!user) return json({ error: 'auth' }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }

  /* ===== الموظف: إرسال مسودته للدورة (Draft → …) ===== */
  if (body.action === 'submit') {
    const row = await env.DB.prepare('SELECT * FROM outputs WHERE id = ?1').bind(body.id).first();
    if (!row) return json({ error: 'not_found' }, 404);
    if (row.employee_id !== user.id && user.role !== 'admin') return json({ error: 'forbidden' }, 403);
    if (row.status !== 'Draft') return json({ error: 'not_draft', msg: 'المخرَج ليس مسودة — حالته: ' + row.status }, 400);

    /* إعادة التصنيف على المحتوى النهائي وقت الإرسال */
    const cls = classifyCriticality(row.content, row.output_type);
    const lc = await getLifecycle(env);

    let status = 'Pending-Review';
    let sampled = 0;
    let reviewedBy = null, reviewedAt = null;

    if (lc.mode === 'post' && cls.criticality === 'normal') {
      /* بعد الفترة: normal → اعتماد آلي + عيّنة عشوائية للمراجعة */
      if (Math.random() < lc.rate) {
        status = 'Pending-Review'; sampled = 1;
      } else {
        status = 'Approved';
        reviewedBy = 'اعتماد آلي (ما بعد الفترة الانتقالية)';
        reviewedAt = new Date().toISOString();
      }
    }
    /* الانتقالية (أو critical في أي وقت): Pending-Review إلزامياً — لا مسار آخر */

    await env.DB.prepare(
      'UPDATE outputs SET status = ?1, criticality = ?2, crit_reasons = ?3, sampled = ?4, reviewed_by = ?5, reviewed_at = ?6, reject_reason = NULL WHERE id = ?7'
    ).bind(status, cls.criticality, cls.reasons.join(' · ') || null, sampled, reviewedBy, reviewedAt, row.id).run();

    return json({ ok: true, status, criticality: cls.criticality, reasons: cls.reasons, sampled: sampled === 1, mode: lc.mode });
  }

  /* ===== من هنا: المالك فقط ===== */
  const g = await requireAdmin(request, env);
  if (g.error) return g.error;

  /* ---- قرار المراجعة: اعتماد / رفض بسبب إلزامي ---- */
  if (body.action === 'decide') {
    const row = await env.DB.prepare('SELECT id, status FROM outputs WHERE id = ?1').bind(body.id).first();
    if (!row) return json({ error: 'not_found' }, 404);
    if (row.status !== 'Pending-Review') return json({ error: 'not_pending', msg: 'القرار على المخرجات Pending-Review فقط — حالته: ' + row.status }, 400);

    const decision = body.decision;
    if (decision !== 'Approved' && decision !== 'Rejected') return json({ error: 'bad_decision' }, 400);

    /* الرفض بلا سبب → غير ممكن (شرط قبول م4) */
    const reason = String(body.reason || '').trim();
    if (decision === 'Rejected' && !reason) {
      return json({ error: 'reason_required', msg: 'الرفض بلا سبب غير ممكن — اكتب سبب الرفض ليصل للموظف.' }, 400);
    }

    await env.DB.prepare(
      'UPDATE outputs SET status = ?1, reviewed_by = ?2, reviewed_at = ?3, reject_reason = ?4 WHERE id = ?5'
    ).bind(decision, g.user.username, new Date().toISOString(), decision === 'Rejected' ? reason : null, body.id).run();
    return json({ ok: true });
  }

  /* ---- تفعيل Go-Live (مرة واحدة — يبدأ عدّاد الـ60 يوماً) ---- */
  if (body.action === 'golive') {
    const lc = await getLifecycle(env);
    if (lc.goLive) return json({ error: 'already_live', msg: 'Go-Live مفعَّل منذ: ' + lc.goLive }, 400);
    const now = new Date().toISOString();
    await env.DB.prepare("UPDATE settings SET value = ?1 WHERE key = 'go_live_date'").bind(now).run();
    return json({ ok: true, go_live_date: now });
  }

  /* ---- ضبط الإعدادات (نسبة العيّنة · مدة الانتقالية) ---- */
  if (body.action === 'set_setting') {
    const key = body.key;
    if (key !== 'normal_sample_rate' && key !== 'transition_days') return json({ error: 'bad_key' }, 400);
    const v = String(body.value || '').trim();
    if (key === 'normal_sample_rate') {
      const f = parseFloat(v);
      if (isNaN(f) || f < 0 || f > 1) return json({ error: 'bad_value', msg: 'النسبة بين 0 و 1 (مثال 0.2 = 20%)' }, 400);
    }
    if (key === 'transition_days') {
      const n = parseInt(v, 10);
      if (isNaN(n) || n < 0 || n > 365) return json({ error: 'bad_value', msg: 'المدة بالأيام (0–365)' }, 400);
    }
    await env.DB.prepare('UPDATE settings SET value = ?1 WHERE key = ?2').bind(v, key).run();
    return json({ ok: true });
  }

  return json({ error: 'bad_action' }, 400);
}
