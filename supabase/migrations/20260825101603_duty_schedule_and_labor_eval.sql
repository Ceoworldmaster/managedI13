/*
# Duty Schedule + Labor Evaluation

## Overview
Adds two related features requested for the class management upgrade:
1. **duty_schedules** / **duty_schedule_students** - a duty roster ("lịch trực")
   for class-cleaning or KTX-room duty, assignable to a team and/or specific
   students, with a completion status.
2. **labor_evaluations** - a structured labor evaluation ("đánh giá lao động")
   that can optionally link back to a duty schedule entry, scores a student's
   completion (1-10) and attitude, and optionally awards/deducts competition
   points by writing a matching row into point_logs.

## Security (RLS)
- duty_schedules / duty_schedule_students: all authenticated users can read;
  ban cán sự roles (gvcn, lớp trưởng, các lớp phó, tổ trưởng, trưởng phòng KTX)
  can create/update/delete.
- labor_evaluations: same roles can read all + insert/update/delete; a student
  can read evaluations about themselves.
*/

DO $$ BEGIN
  CREATE TYPE public.duty_area AS ENUM ('lop_hoc', 'ktx');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.duty_status AS ENUM ('chua_truc', 'da_truc', 'vang_truc');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ DUTY SCHEDULES ============
CREATE TABLE IF NOT EXISTS public.duty_schedules (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  duty_date DATE NOT NULL,
  area public.duty_area NOT NULL DEFAULT 'lop_hoc',
  team_id BIGINT REFERENCES public.teams(id),
  dorm_room_id BIGINT REFERENCES public.dorm_rooms(id),
  description TEXT,
  status public.duty_status NOT NULL DEFAULT 'chua_truc',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.duty_schedule_students (
  duty_schedule_id BIGINT NOT NULL REFERENCES public.duty_schedules(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (duty_schedule_id, student_id)
);

-- ============ LABOR EVALUATIONS ============
CREATE TABLE IF NOT EXISTS public.labor_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duty_schedule_id BIGINT REFERENCES public.duty_schedules(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES public.profiles(id),
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completion_score INT NOT NULL CHECK (completion_score BETWEEN 1 AND 10),
  on_time BOOLEAN NOT NULL DEFAULT TRUE,
  points INT NOT NULL DEFAULT 0,
  notes TEXT,
  point_log_id UUID REFERENCES public.point_logs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_duty_schedules_date ON public.duty_schedules(duty_date);
CREATE INDEX IF NOT EXISTS idx_duty_schedules_team ON public.duty_schedules(team_id);
CREATE INDEX IF NOT EXISTS idx_duty_schedule_students_student ON public.duty_schedule_students(student_id);
CREATE INDEX IF NOT EXISTS idx_labor_evaluations_student ON public.labor_evaluations(student_id);
CREATE INDEX IF NOT EXISTS idx_labor_evaluations_date ON public.labor_evaluations(evaluation_date);

-- ============ RLS: DUTY SCHEDULES ============
ALTER TABLE public.duty_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_duty_schedules" ON public.duty_schedules;
CREATE POLICY "read_duty_schedules" ON public.duty_schedules FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "write_duty_schedules" ON public.duty_schedules;
CREATE POLICY "write_duty_schedules" ON public.duty_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep', 'lop_pho_lao_dong', 'lop_pho_van_nghe', 'to_truong', 'truong_phong_ktx')
    )
  );

DROP POLICY IF EXISTS "update_duty_schedules" ON public.duty_schedules;
CREATE POLICY "update_duty_schedules" ON public.duty_schedules FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  );

DROP POLICY IF EXISTS "delete_duty_schedules" ON public.duty_schedules;
CREATE POLICY "delete_duty_schedules" ON public.duty_schedules FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  );

-- ============ RLS: DUTY SCHEDULE STUDENTS ============
ALTER TABLE public.duty_schedule_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_duty_schedule_students" ON public.duty_schedule_students;
CREATE POLICY "read_duty_schedule_students" ON public.duty_schedule_students FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "write_duty_schedule_students" ON public.duty_schedule_students;
CREATE POLICY "write_duty_schedule_students" ON public.duty_schedule_students FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep', 'lop_pho_lao_dong', 'lop_pho_van_nghe', 'to_truong', 'truong_phong_ktx')
    )
  );

DROP POLICY IF EXISTS "delete_duty_schedule_students" ON public.duty_schedule_students;
CREATE POLICY "delete_duty_schedule_students" ON public.duty_schedule_students FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep', 'lop_pho_lao_dong', 'lop_pho_van_nghe', 'to_truong', 'truong_phong_ktx')
    )
  );

-- ============ RLS: LABOR EVALUATIONS ============
ALTER TABLE public.labor_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_labor_evaluations" ON public.labor_evaluations;
CREATE POLICY "read_labor_evaluations" ON public.labor_evaluations FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep', 'lop_pho_lao_dong', 'lop_pho_van_nghe', 'to_truong', 'truong_phong_ktx')
    )
  );

DROP POLICY IF EXISTS "insert_labor_evaluations" ON public.labor_evaluations;
CREATE POLICY "insert_labor_evaluations" ON public.labor_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (
    evaluator_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep', 'lop_pho_lao_dong', 'lop_pho_van_nghe', 'to_truong', 'truong_phong_ktx')
    )
  );

DROP POLICY IF EXISTS "update_labor_evaluations" ON public.labor_evaluations;
CREATE POLICY "update_labor_evaluations" ON public.labor_evaluations FOR UPDATE
  TO authenticated
  USING (
    evaluator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  )
  WITH CHECK (
    evaluator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  );

DROP POLICY IF EXISTS "delete_labor_evaluations" ON public.labor_evaluations;
CREATE POLICY "delete_labor_evaluations" ON public.labor_evaluations FOR DELETE
  TO authenticated
  USING (
    evaluator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  );
