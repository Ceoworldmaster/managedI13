/*
# Add academic weeks 4-36 (full 36-week school year)

## Overview
The original seed data only created 3 academic weeks (weeks 1-3). This
migration inserts weeks 4 through 36 so the system covers the entire
school year. Each week is 7 days, continuing from week 3's end date
(2026-08-30 + 1 = 2026-08-31 start for week 4).

## Data
- Inserts weeks 4-36 into academic_weeks.
- All weeks start with is_closed=false, class_rank=NULL, class_bonus_points=0.
- Uses ON CONFLICT (week_number) DO NOTHING for idempotency.

## Important Notes
1. Safe to re-run — ON CONFLICT skips existing weeks.
2. Week numbering is sequential from 1 to 36.
3. No schema changes — only data insertion.
*/

INSERT INTO public.academic_weeks (week_number, start_date, end_date, class_rank, class_bonus_points, is_closed)
SELECT
  i,
  (DATE '2026-08-17' + (i - 1) * 7)::DATE,
  (DATE '2026-08-17' + (i - 1) * 7 + 6)::DATE,
  NULL,
  0,
  false
FROM generate_series(4, 36) AS i
ON CONFLICT (week_number) DO NOTHING;
