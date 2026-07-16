-- ============================================================
-- schema.sql — إنشاء جداول قاعدة D1
-- منصّة العمل الذكية · BE-P1
-- يُلصق محتوى هذا الملف في Console قاعدة D1 مرة واحدة
-- ============================================================

-- الموظفون (كلمات المرور تُخزَّن Hash فقط — لا نص أبداً)
CREATE TABLE IF NOT EXISTS employees (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  username   TEXT NOT NULL UNIQUE,
  pass_salt  TEXT NOT NULL,
  pass_hash  TEXT NOT NULL,
  role       TEXT NOT NULL,              -- reception/marketing/social/website/stores/hr/accounting/admin
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- الجلسات (Login sessions)
CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_exp ON sessions(expires_at);

-- المهام والـ Schemas (payload = تعريف المهمة كاملاً بصيغة JSON)
-- instructions = تعليمات النموذج السرية — لا تُرسَل للمتصفح أبداً
CREATE TABLE IF NOT EXISTS tasks (
  id           TEXT PRIMARY KEY,
  role         TEXT NOT NULL,
  enabled      INTEGER NOT NULL DEFAULT 1,
  instructions TEXT NOT NULL DEFAULT '',
  payload      TEXT NOT NULL,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- مخرجات بانتظار المراجعة (تُستخدم فعلياً في BE-P3)
CREATE TABLE IF NOT EXISTS outputs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  task_id     TEXT NOT NULL,
  content     TEXT NOT NULL,
  state       TEXT NOT NULL DEFAULT 'pending',   -- pending / approved / returned
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_outputs_state ON outputs(state);
