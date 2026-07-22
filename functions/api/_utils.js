/* ============================================================
   _utils.js — أدوات مشتركة للـ API (لا يُوجَّه كمسار — يبدأ بـ _)
   BE-P1 · منصّة العمل الذكية
   ============================================================ */

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }
  });
}

/* ---------- تشفير كلمات المرور: PBKDF2-SHA256 (Web Crypto) ---------- */
const ITERATIONS = 100000;

function b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function unb64(s) {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

export async function hashPassword(password, saltB64) {
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256
  );
  return { salt: b64(salt), hash: b64(bits) };
}

export async function verifyPassword(password, saltB64, expectedHash) {
  const { hash } = await hashPassword(password, saltB64);
  return hash === expectedHash;
}

/* ---------- الجلسات ---------- */
export function newToken() {
  const a = crypto.getRandomValues(new Uint8Array(32));
  return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function sessionCookie(token, maxAgeSeconds) {
  return 'session=' + token +
    '; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=' + maxAgeSeconds;
}

export function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const m = header.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : null;
}

/* ============================================================
   فلتر بوابة GOV-SEC (المرحلة 3 — م5 الجزء 3 ق2)
   الفحص الآلي: أنماط أرقام طويلة + كلمات مفتاحية → تعليق الرفع.
   «الآلي شبكة والبشري صياد» — لا يغني عن Checklist الواجهة.
   ============================================================ */
const GATE_KEYWORDS = [
  'ترخيص', 'سجل تجاري', 'رقم اعتماد', 'رقم الاعتماد',
  'password', 'api key', 'api_key', 'apikey', 'token', 'secret',
  'sk-ant', 'كلمة مرور', 'كلمة المرور', 'باسورد'
];

export function gateScan(text) {
  const hits = [];
  const t = String(text || '');

  /* أرقام طويلة متسلسلة (7+ خانات — أرقام التراخيص/السجلات) */
  const nums = t.match(/\d{7,}/g) || [];
  for (const n of nums.slice(0, 5)) {
    hits.push({ type: 'رقم طويل (' + n.length + ' خانة)', masked: n.slice(0, 2) + '••••' + n.slice(-2) });
  }

  const low = t.toLowerCase();
  for (const kw of GATE_KEYWORDS) {
    if (low.indexOf(kw.toLowerCase()) !== -1) {
      hits.push({ type: 'كلمة مفتاحية', masked: kw });
    }
  }
  return hits;
}

/* يتحقق أن المستخدم الحالي أدمن — يعيد المستخدم أو Response خطأ */
export async function requireAdmin(request, env) {
  const user = await getUser(request, env);
  if (!user) return { error: json({ error: 'auth' }, 401) };
  if (user.role !== 'admin') return { error: json({ error: 'forbidden' }, 403) };
  return { user };
}

/* يعيد بيانات المستخدم الحالي من الجلسة — أو null */
export async function getUser(request, env) {
  const token = getCookie(request, 'session');
  if (!token) return null;
  const row = await env.DB.prepare(
    "SELECT e.id, e.name, e.username, e.role, e.active " +
    "FROM sessions s JOIN employees e ON e.id = s.employee_id " +
    "WHERE s.token = ?1 AND s.expires_at > datetime('now') AND e.active = 1"
  ).bind(token).first();
  return row || null;
}

/* ============================================================
   المرحلة 4 — دورة حياة المخرَج (أمر الشغل م4 + TechSpecs بند 4)
   ============================================================ */

/* التصنيف critical تلقائياً (م4/المهمة 4) إذا احتوى المخرَج:
   لقباً/اعتماداً طبياً · نمطاً من الفلتر اللغوي (م4/ب2) ·
   وسم سطح سعودي عام · نوع «صفحة موقع/متجر» */
const CRIT_LANG_FILTER = ['مضمون', '100%', '١٠٠٪', 'نهائي', 'دائم', 'يعالج', 'يزيل'];
const CRIT_MEDICAL = [
  'دكتور', 'دكتورة', 'طبيب', 'طبيبة', 'استشاري', 'أخصائي', 'اخصائي',
  'بورد', 'زمالة', 'اعتماد طبي', 'ترخيص طبي', 'scfhs', 'cbahi', 'سباهي', 'gahar', 'جهار'
];
const CRIT_OUTPUT_TYPES = ['site-page', 'store-page'];
const CRIT_SURFACE_TAG = 'سطح:سعودي-عام';

export function classifyCriticality(content, outputType) {
  const reasons = [];
  const t = String(content || '');
  const low = t.toLowerCase();

  if (CRIT_OUTPUT_TYPES.indexOf(String(outputType || '')) !== -1) {
    reasons.push('نوع صفحة موقع/متجر');
  }
  if (low.indexOf(CRIT_SURFACE_TAG) !== -1 || low.indexOf('saudi-public') !== -1) {
    reasons.push('سطح سعودي عام');
  }
  for (const w of CRIT_LANG_FILTER) {
    if (low.indexOf(w.toLowerCase()) !== -1) { reasons.push('فلتر لغوي: «' + w + '»'); break; }
  }
  for (const w of CRIT_MEDICAL) {
    if (low.indexOf(w.toLowerCase()) !== -1) { reasons.push('لقب/اعتماد طبي: «' + w + '»'); break; }
  }

  return {
    criticality: reasons.length ? 'critical' : 'normal',
    reasons
  };
}

/* قراءة إعدادات الدورة (settings) وتحديد الوضع الحالي:
   - go_live_date فارغ → الفترة الانتقالية سارية (ما قبل Go-Live أشدّ لا أخفّ)
   - الآن < go_live + transition_days → انتقالية (كل مخرَج Pending)
   - بعدها → post: critical=Pending دائماً · normal=اعتماد آلي + عيّنة */
export async function getLifecycle(env) {
  const { results } = await env.DB.prepare('SELECT key, value FROM settings').all();
  const s = {};
  for (const r of (results || [])) s[r.key] = r.value;
  const days = parseInt(s.transition_days || '60', 10);
  const rate = parseFloat(s.normal_sample_rate || '0.2');
  const goLive = (s.go_live_date || '').trim();

  if (!goLive) {
    return { mode: 'transition', phase: 'pre-golive', goLive: null, days, rate, daysLeft: null };
  }
  const end = new Date(goLive).getTime() + days * 86400000;
  const now = Date.now();
  if (now < end) {
    return {
      mode: 'transition', phase: 'transition', goLive, days, rate,
      daysLeft: Math.ceil((end - now) / 86400000)
    };
  }
  return { mode: 'post', phase: 'post', goLive, days, rate, daysLeft: 0 };
}
