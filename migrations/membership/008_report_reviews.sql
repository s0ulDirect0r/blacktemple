-- Keep resolved reviews; only an open review is deduplicated per reporter/target.
ALTER TABLE temple_reports DROP CONSTRAINT IF EXISTS temple_reports_reporter_id_target_kind_target_id_key;
ALTER TABLE temple_reports ADD COLUMN content_version INTEGER CHECK(content_version > 0);
-- Historical reports intentionally retain NULL: their original version is unknown.
CREATE UNIQUE INDEX temple_reports_one_open_review
  ON temple_reports(reporter_id,target_kind,target_id) WHERE status='open';
