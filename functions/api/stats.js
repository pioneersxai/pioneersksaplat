/* ============================================================
   /api/stats — إحصائيات لوحة الأدمن (أدمن فقط)
   اليوم يُحسب بتوقيت الرياض (UTC+3) — date(ts,'+3 hours')

   GET → kpi اليوم · أهداف الأقسام وإنجازها · اتجاه 7 أيام ·
         توزيع الحالات · لوحة أسرع الموظفين (7 أيام) ·
         اكتمال المهام اليومية لكل قسم
   POST {action:'set_target', role, daily_target} → ضبط هدف قسم
   ============================================================ */
import { json, requireAdmin } from './_utils.js';

const ROLES = ['reception', 'marketing', 'social', 'website', 'stores', 'hr', 'accounting'];

function riyadhDate(offsetDays) {
  const d = new Date(Date.now() + 3 * 3600e3 + (offsetDays || 0) * 86400e3);
  return d.toISOString().slice(0, 10);
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'no_db' }, 500);
  const g = await requireAdmin(request, env);
  if (g.error) return g.error;

  const today = riyadhDate(0);

  /* ---- 1) اليوم لكل قسم: مُرسَل + معتمد ---- */
  const subToday = await env.DB.prepare(
    "SELECT e.role AS role, COUNT(*) AS n FROM outputs o JOIN employees e ON e.id = o.employee_id " +
    "WHERE o.submitted_at IS NOT NULL AND date(o.submitted_at, '+3 hours') = ?1 GROUP BY e.role"
  ).bind(today).all();
  const appToday = await env.DB.prepare(
    "SELECT e.role AS role, COUNT(*) AS n FROM outputs o JOIN employees e ON e.id = o.employee_id " +
    "WHERE o.status = 'Approved' AND o.reviewed_at IS NOT NULL AND date(o.reviewed_at, '+3 hours') = ?1 GROUP BY e.role"
  ).bind(today).all();

  /* ---- 2) الأهداف اليومية ---- */
  const tg = await env.DB.prepare('SELECT role, daily_target FROM dept_targets').all();
  const targets = {};
  for (const r of (tg.results || [])) targets[r.role] = r.daily_target;

  const submittedByRole = {}, approvedByRole = {};
  for (const r of (subToday.results || [])) submittedByRole[r.role] = r.n;
  for (const r of (appToday.results || [])) approvedByRole[r.role] = r.n;

  const depts = ROLES.map(role => ({
    role,
    target: targets[role] != null ? targets[role] : 3,
    submitted_today: submittedByRole[role] || 0,
    approved_today: approvedByRole[role] || 0
  }));

  /* ---- 3) اتجاه آخر 7 أيام (مُرسَل · معتمد) ---- */
  const from = riyadhDate(-6);
  const trendSub = await env.DB.prepare(
    "SELECT date(submitted_at, '+3 hours') AS d, COUNT(*) AS n FROM outputs " +
    "WHERE submitted_at IS NOT NULL AND date(submitted_at, '+3 hours') >= ?1 GROUP BY d"
  ).bind(from).all();
  const trendApp = await env.DB.prepare(
    "SELECT date(reviewed_at, '+3 hours') AS d, COUNT(*) AS n FROM outputs " +
    "WHERE status = 'Approved' AND reviewed_at IS NOT NULL AND date(reviewed_at, '+3 hours') >= ?1 GROUP BY d"
  ).bind(from).all();
  const sMap = {}, aMap = {};
  for (const r of (trendSub.results || [])) sMap[r.d] = r.n;
  for (const r of (trendApp.results || [])) aMap[r.d] = r.n;
  const trend = [];
  for (let i = -6; i <= 0; i++) {
    const d = riyadhDate(i);
    trend.push({ date: d, submitted: sMap[d] || 0, approved: aMap[d] || 0 });
  }

  /* ---- 4) توزيع الحالات (الإجمالي الحالي) ---- */
  const st = await env.DB.prepare('SELECT status, COUNT(*) AS n FROM outputs GROUP BY status').all();
  const statuses = { Draft: 0, 'Pending-Review': 0, Approved: 0, Rejected: 0 };
  for (const r of (st.results || [])) if (statuses[r.status] != null) statuses[r.status] = r.n;

  /* ---- 5) لوحة الموظفين (آخر 7 أيام): الإنجاز والسرعة والاعتماد ---- */
  const lb = await env.DB.prepare(
    "SELECT e.id, e.name, e.role, COUNT(*) AS submitted, " +
    "ROUND(AVG((julianday(o.submitted_at) - julianday(o.created_at)) * 1440), 1) AS avg_minutes, " +
    "SUM(CASE WHEN o.status = 'Approved' THEN 1 ELSE 0 END) AS approved, " +
    "SUM(CASE WHEN o.status = 'Rejected' THEN 1 ELSE 0 END) AS rejected " +
    "FROM outputs o JOIN employees e ON e.id = o.employee_id " +
    "WHERE o.submitted_at IS NOT NULL AND date(o.submitted_at, '+3 hours') >= ?1 AND e.role <> 'admin' " +
    "GROUP BY e.id ORDER BY submitted DESC, avg_minutes ASC LIMIT 10"
  ).bind(from).all();

  /* ---- 6) المهام اليومية اليوم: المكتمل مقابل المتوقع لكل قسم ----
     المتوقع = عدد المهام اليومية المفعّلة للقسم × موظفيه النشطين
     المكتمل = أزواج (موظف، مهمة يومية) أُرسلت اليوم (مرة واحدة لكل زوج) */
  const dailyTasks = await env.DB.prepare(
    "SELECT id, role FROM tasks WHERE enabled = 1 AND json_extract(payload, '$.daily') = 1"
  ).all();
  const empCount = await env.DB.prepare(
    "SELECT role, COUNT(*) AS n FROM employees WHERE active = 1 AND role <> 'admin' GROUP BY role"
  ).all();
  const dTasksByRole = {}, dTaskIds = [];
  for (const t of (dailyTasks.results || [])) {
    dTasksByRole[t.role] = (dTasksByRole[t.role] || 0) + 1;
    dTaskIds.push(t.id);
  }
  const empByRole = {};
  for (const r of (empCount.results || [])) empByRole[r.role] = r.n;

  let doneByRole = {};
  if (dTaskIds.length) {
    const ph = dTaskIds.map((_, i) => '?' + (i + 2)).join(',');
    const done = await env.DB.prepare(
      "SELECT e.role AS role, COUNT(DISTINCT o.employee_id || '·' || o.task_id) AS n " +
      "FROM outputs o JOIN employees e ON e.id = o.employee_id " +
      "WHERE o.submitted_at IS NOT NULL AND date(o.submitted_at, '+3 hours') = ?1 AND o.task_id IN (" + ph + ") GROUP BY e.role"
    ).bind(today, ...dTaskIds).all();
    for (const r of (done.results || [])) doneByRole[r.role] = r.n;
  }
  const dailyMissions = ROLES.map(role => ({
    role,
    tasks: dTasksByRole[role] || 0,
    employees: empByRole[role] || 0,
    expected: (dTasksByRole[role] || 0) * (empByRole[role] || 0),
    done: doneByRole[role] || 0
  }));

  /* ---- 7) KPI اليوم ---- */
  const totSub = depts.reduce((a, d) => a + d.submitted_today, 0);
  const totApp = depts.reduce((a, d) => a + d.approved_today, 0);
  const fastest = (lb.results || []).filter(r => r.avg_minutes != null)
    .sort((a, b) => a.avg_minutes - b.avg_minutes)[0] || null;

  return json({
    ok: true, today,
    kpi: {
      submitted_today: totSub,
      approved_today: totApp,
      pending_now: statuses['Pending-Review'],
      fastest_name: fastest ? fastest.name : null,
      fastest_minutes: fastest ? fastest.avg_minutes : null
    },
    depts, trend, statuses,
    leaderboard: lb.results || [],
    daily_missions: dailyMissions
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'no_db' }, 500);
  const g = await requireAdmin(request, env);
  if (g.error) return g.error;

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }

  if (body.action === 'set_target') {
    if (ROLES.indexOf(body.role) === -1) return json({ error: 'bad_role' }, 400);
    const n = parseInt(body.daily_target, 10);
    if (isNaN(n) || n < 0 || n > 100) return json({ error: 'bad_value', msg: 'الهدف اليومي بين 0 و 100' }, 400);
    await env.DB.prepare(
      'INSERT INTO dept_targets (role, daily_target) VALUES (?1, ?2) ON CONFLICT(role) DO UPDATE SET daily_target = ?2'
    ).bind(body.role, n).run();
    return json({ ok: true });
  }

  return json({ error: 'bad_action' }, 400);
}
