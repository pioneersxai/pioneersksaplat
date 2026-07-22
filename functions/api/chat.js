/* ============================================================
   POST /api/chat — محرك المحادثة الذكي · BE-P2
   يجلب تعليمات المهمة من القاعدة (سرّاً) → يستدعي Claude API
   بالمفتاح المشفّر → يحفظ المخرَج بانتظار مراجعة الإدارة.

   بلا مفتاح ANTHROPIC_API_KEY: يعيد demo:true وتستخدم
   الواجهة القوالب التجريبية — لا شيء ينكسر.

   التعليمات (instructions) لا تغادر الخادم أبداً. 🔒
   ============================================================ */
import { json, getUser, classifyCriticality } from './_utils.js';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';       /* موثَّق رسمياً */
const DEFAULT_MODEL = 'claude-haiku-4-5'; /* Alias رسمي — يُبدَّل عبر متغير AI_MODEL */
const MAX_TOKENS = 1024;

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'no_db' }, 500);

  const user = await getUser(request, env);
  if (!user) return json({ error: 'auth' }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }

  const taskId = body.taskId || '';
  const task = await env.DB.prepare(
    'SELECT id, role, enabled, instructions, payload FROM tasks WHERE id = ?1 AND enabled = 1'
  ).bind(taskId).first();
  if (!task) return json({ error: 'no_task' }, 404);

  /* الموظف لا يصل إلا لمهام قسمه — الأدمن يصل للكل */
  if (user.role !== 'admin' && task.role !== user.role) return json({ error: 'forbidden' }, 403);

  /* بلا مفتاح → الوضع التجريبي يتكفل بالعرض */
  if (!env.ANTHROPIC_API_KEY) return json({ ok: true, demo: true });

  const payload = JSON.parse(task.payload);

  /* ---------- بناء الرسائل ---------- */
  let messages;
  if (Array.isArray(body.messages) && body.messages.length) {
    /* متابعة حوار قائم — التاريخ يأتي من الواجهة (بلا تعليمات) */
    messages = body.messages
      .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-20); /* حد أقصى للتاريخ */
  } else {
    /* أول توليد — من بيانات الـ Schema المكتملة */
    const data = body.data || {};
    const lines = [];
    for (let i = 0; i < payload.fields.length; i++) {
      const f = payload.fields[i];
      lines.push('- ' + f.ar + ': ' + (data[f.k] || '—'));
    }
    messages = [{
      role: 'user',
      content: 'أكمل الموظف «' + user.name + '» بيانات مهمة «' + payload.ar[0] + '» التالية:\n' +
        lines.join('\n') + '\n\nنفّذ المهمة الآن وفق تعليماتك.'
    }];
  }

  /* ---------- System Prompt: تعليمات الإدارة (السرية) + ضوابط عامة ---------- */
  const system =
    'أنت مساعد عمل داخلي في منصّة موظفي الشركة. التزم حرفياً بتعليمات الإدارة التالية لهذه المهمة:\n' +
    '<تعليمات_الإدارة>\n' + task.instructions + '\n</تعليمات_الإدارة>\n\n' +
    'ضوابط إلزامية عامة:\n' +
    '1) أجب بالعربية (مع المصطلحات التقنية بالإنجليزية عند الحاجة) ما لم تنص التعليمات على غير ذلك.\n' +
    '2) مخرَجك مسودة تخضع لمراجعة الإدارة قبل أي استخدام — لا تدّعِ أنه نهائي.\n' +
    '3) ممنوع منعاً باتاً في أي محتوى موجّه للعملاء استخدام: «مضمون» · «100%» · «نهائي» · «دائم» · «يعالج» · «يزيل». استخدم بدلاً منها: «تحسين» · «مساعدة» · «تقليل» · «تحت إشراف طبي».\n' +
    '4) لا تختلق أرقاماً أو أسعاراً أو ادعاءات — إن نقصك شيء اطلبه من الموظف.\n' +
    '5) كن مختصراً وعملياً — الموظف في بيئة عمل.';

  /* ---------- استدعاء Claude ---------- */
  let resp;
  try {
    resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': API_VERSION,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: env.AI_MODEL || DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        system: system,
        messages: messages
      })
    });
  } catch (e) {
    return json({ error: 'ai_unreachable' }, 502);
  }

  if (!resp.ok) {
    const errText = await resp.text();
    /* لا نمرر تفاصيل حساسة — رمز فقط، والنص في سجل الخادم */
    console.log('Claude API error', resp.status, errText.slice(0, 300));
    return json({ error: 'ai_error', status: resp.status }, 502);
  }

  const result = await resp.json();
  let content = '';
  if (result.content && result.content.length) {
    for (let i = 0; i < result.content.length; i++) {
      if (result.content[i].type === 'text') content += result.content[i].text;
    }
  }
  if (!content) return json({ error: 'ai_empty' }, 502);

  /* ---------- دورة المخرَج (المرحلة 4) ----------
     أول توليد → مسودة Draft (مع تصنيف criticality آلي).
     متابعة حوار بـ outputId → المسودة تُحدَّث لآخر نسخة —
     الموظف يرسلها للمراجعة بزر «إرسال للمراجعة» (POST /api/outputs submit). */
  let outputId = null;
  const outputType = (payload.output_type || (task.role === 'website' ? 'site-page' : 'doc'));
  const cls = classifyCriticality(content, outputType);

  if (body.store) {
    const r = await env.DB.prepare(
      'INSERT INTO outputs (employee_id, task_id, content, state, status, criticality, crit_reasons, output_type) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)'
    ).bind(user.id, task.id, content, 'pending', 'Draft', cls.criticality, cls.reasons.join(' · ') || null, outputType).run();
    outputId = r.meta.last_row_id;
  } else if (body.outputId) {
    /* تحديث المسودة القائمة بآخر نسخة — للمالك نفسه وما دامت Draft */
    const own = await env.DB.prepare(
      "SELECT id FROM outputs WHERE id = ?1 AND employee_id = ?2 AND status = 'Draft'"
    ).bind(body.outputId, user.id).first();
    if (own) {
      await env.DB.prepare(
        'UPDATE outputs SET content = ?1, criticality = ?2, crit_reasons = ?3 WHERE id = ?4'
      ).bind(content, cls.criticality, cls.reasons.join(' · ') || null, own.id).run();
      outputId = own.id;
    }
  }

  /* نعيد التاريخ كاملاً حتى تتابع الواجهة الحوار */
  const history = messages.concat([{ role: 'assistant', content: content }]);
  return json({ ok: true, demo: false, content: content, outputId: outputId, history: history });
}
