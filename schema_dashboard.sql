-- ============================================================
-- schema_dashboard.sql — لوحة الإحصائيات + المهام اليومية
-- submitted_at: لحظة إرسال المخرَج للمراجعة (لقياس سرعة الإنجاز)
-- dept_targets: الهدف اليومي لكل قسم (يضبطه المالك من اللوحة)
-- ملاحظة D1 Console: يُلصق السطر المجمَّع الخالي من التعليقات مرة واحدة
-- ============================================================
ALTER TABLE outputs ADD COLUMN submitted_at TEXT;
CREATE TABLE IF NOT EXISTS dept_targets (role TEXT PRIMARY KEY, daily_target INTEGER NOT NULL DEFAULT 3);
INSERT OR IGNORE INTO dept_targets (role, daily_target) VALUES ('reception',3),('marketing',3),('social',3),('website',3),('stores',3),('hr',3),('accounting',3);
