-- Error reports the game sends on its own (kind 'error'). `fingerprint` groups repeats of one error.
ALTER TABLE escalation_feedback DROP CONSTRAINT IF EXISTS escalation_feedback_kind_check;
ALTER TABLE escalation_feedback ADD CONSTRAINT escalation_feedback_kind_check
  CHECK (kind IN ('fun', 'hard', 'broken', 'note', 'error'));
ALTER TABLE escalation_feedback ADD COLUMN IF NOT EXISTS fingerprint TEXT;
CREATE INDEX IF NOT EXISTS escalation_feedback_fingerprint ON escalation_feedback (fingerprint, created_at)
  WHERE fingerprint IS NOT NULL;
