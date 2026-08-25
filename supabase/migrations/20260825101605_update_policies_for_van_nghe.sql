/*
# Update existing RLS policies to include "lop_pho_van_nghe"

## Overview
The original point_logs and weekly_reports policies were written against the
role list before `lop_pho_van_nghe` existed. This re-creates those policies
so the new Lớp phó Văn nghệ role has the same ban-cán-sự level access as the
other lớp phó roles (recording points, submitting reports).
*/

DROP POLICY IF EXISTS "read_point_logs" ON public.point_logs;
CREATE POLICY "read_point_logs" ON public.point_logs FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep', 'lop_pho_van_nghe', 'lop_pho_lao_dong', 'to_truong', 'truong_phong_ktx')
    )
  );

DROP POLICY IF EXISTS "insert_point_logs" ON public.point_logs;
CREATE POLICY "insert_point_logs" ON public.point_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    recorder_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep', 'lop_pho_van_nghe', 'lop_pho_lao_dong', 'to_truong', 'truong_phong_ktx')
    )
  );

DROP POLICY IF EXISTS "insert_weekly_reports" ON public.weekly_reports;
CREATE POLICY "insert_weekly_reports" ON public.weekly_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep', 'lop_pho_van_nghe', 'lop_pho_lao_dong', 'truong_phong_ktx', 'to_truong')
    )
  );
