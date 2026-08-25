/*
# Labor evaluation uniqueness per duty shift

## Overview
Grading of labor ("chấm lao động") must be tied to a specific duty shift
("lượt trực") rather than a free-floating date + student pair. This makes
that constraint explicit at the database level: a given student can have at
most one labor_evaluations row per duty_schedules row. The app now edits
(upserts) the existing row instead of creating a duplicate when a shift is
re-graded.

Evaluations that are NOT linked to a shift (duty_schedule_id IS NULL, used
for rare ad-hoc/manual grading) are not constrained by this index.
*/

CREATE UNIQUE INDEX IF NOT EXISTS idx_labor_evaluations_unique_per_shift
  ON public.labor_evaluations (duty_schedule_id, student_id)
  WHERE duty_schedule_id IS NOT NULL;
