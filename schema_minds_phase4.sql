-- ============================================================
-- schema_minds_phase4.sql — المرحلة 4: دورة حياة المخرَج
-- ترقية جدول outputs القائم + جدول settings (الفترة الانتقالية)
-- ملاحظة D1 Console: يُلصق السطر المجمَّع الخالي من التعليقات (يُسلَّم في الشات)
-- CHECK (رفض بلا سبب) يُطبَّق في طبقة الـAPI — ترجمة قيود Postgres
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT OR IGNORE INTO settings (key, value) VALUES ('go_live_date',''),('transition_days','60'),('normal_sample_rate','0.2');
ALTER TABLE outputs ADD COLUMN status TEXT NOT NULL DEFAULT 'Draft';
ALTER TABLE outputs ADD COLUMN criticality TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE outputs ADD COLUMN crit_reasons TEXT;
ALTER TABLE outputs ADD COLUMN sampled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE outputs ADD COLUMN output_type TEXT NOT NULL DEFAULT 'doc';
ALTER TABLE outputs ADD COLUMN reviewed_by TEXT;
ALTER TABLE outputs ADD COLUMN reviewed_at TEXT;
ALTER TABLE outputs ADD COLUMN reject_reason TEXT;
UPDATE outputs SET status = CASE state WHEN 'pending' THEN 'Pending-Review' WHEN 'approved' THEN 'Approved' WHEN 'returned' THEN 'Rejected' ELSE 'Draft' END;
UPDATE outputs SET reject_reason = 'مرحل من النظام القديم (أعيد للموظف قبل تفعيل سبب الرفض الإلزامي)' WHERE status = 'Rejected' AND reject_reason IS NULL;
CREATE INDEX IF NOT EXISTS idx_outputs_status ON outputs(status);
