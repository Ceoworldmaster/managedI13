/*
# point_logs: explicit cong/tru type

## Overview
point_logs previously relied entirely on its (optional) linked rule to know
whether a row was a bonus (cong) or a deduction (tru). Manually-created
entries with no rule_id — such as the new labor evaluation feature — had no
way to record a deduction. This adds an explicit `type` column, backfills it
from the linked rule for existing rows, and defaults new rule-less rows to
'cong'.
*/

ALTER TABLE public.point_logs ADD COLUMN IF NOT EXISTS type public.point_type;

UPDATE public.point_logs pl
SET type = r.type
FROM public.rules r
WHERE pl.rule_id = r.id AND pl.type IS NULL;

UPDATE public.point_logs SET type = 'cong' WHERE type IS NULL;

ALTER TABLE public.point_logs ALTER COLUMN type SET DEFAULT 'cong';
ALTER TABLE public.point_logs ALTER COLUMN type SET NOT NULL;
