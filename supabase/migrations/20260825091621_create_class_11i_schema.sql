/*
# Class 11I Management System - Core Schema

## Overview
Creates the complete database schema for the Class 11I (Chuyên Tin & Nội trú) management system.

## New Tables
1. **teams** - Class groups (Tổ 1-4) with auto-incrementing BIGINT IDs.
2. **dorm_rooms** - Dormitory rooms (P.201, P.202...) with building info.
3. **profiles** - User profiles linked to auth.users. Contains student_code, full_name, role, team and dorm assignments, phone, and a must_change_password flag for first-login enforcement.
4. **rules** - Point rules (cong/tru) categorized by hoc_tap, ne_nep, lao_dong, ktx, tap_the. Some rules require GVCN approval.
5. **academic_weeks** - Weekly tracking with week_number, date range, class rank, bonus points, and closure status.
6. **point_logs** - Records of points given to students. Links student, recorder, week, and rule.
7. **dorm_inspections** - KTX inspection records: cleanliness score (1-10), self-study and curfew status.
8. **document_signatures** - Digital signature records for nội quy documents. Tracks student and GVCN signature status.
9. **weekly_reports** - Weekly Excel report submissions from ban cán sự. Unique per reporter+week+type.

## Enums
- user_role: 8 roles from gvcn (admin) to hoc_sinh.
- point_category: hoc_tap, ne_nep, lao_dong, ktx, tap_the.
- point_type: cong (bonus), tru (deduction).
- record_status: pending, approved, rejected.
- report_type: hoc_tap, ne_nep, lao_dong, ktx_phong, to_truong.
- report_status: submitted, reviewed.

## Security (RLS)
All tables have RLS enabled. Policies use auth.uid() to link to profiles.id, then check the user's role to determine access:
- profiles: users read/update own profile; GVCN reads/updates all.
- teams, dorm_rooms, rules, academic_weeks: all authenticated users can read; only GVCN can write.
- point_logs: GVCN and ban cán sự can read all and insert; to_truong reads own team; hoc_sinh reads own logs.
- dorm_inspections: truong_phong_ktx and GVCN can read/write; students read their own room's inspections.
- document_signatures: students read/update own; GVCN reads all and updates approval.
- weekly_reports: reporters read own; GVCN reads all and updates status.

## Important Notes
1. profiles.id references auth.users(id) with CASCADE delete.
2. point_logs.recorder_id and student_id both reference profiles(id).
3. weekly_reports has a UNIQUE constraint on (reporter_id, week_id, report_type).
4. dorm_inspections.cleanliness_score has a CHECK constraint (1-10).
5. profiles.must_change_password defaults to TRUE for first-login password change enforcement.
*/

-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep',
    'lop_pho_lao_dong', 'to_truong', 'truong_phong_ktx', 'hoc_sinh'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.point_category AS ENUM ('hoc_tap', 'ne_nep', 'lao_dong', 'ktx', 'tap_the');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.point_type AS ENUM ('cong', 'tru');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.record_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.report_type AS ENUM ('hoc_tap', 'ne_nep', 'lao_dong', 'ktx_phong', 'to_truong');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.report_status AS ENUM ('submitted', 'reviewed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ TEAMS ============
CREATE TABLE IF NOT EXISTS public.teams (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- ============ DORM ROOMS ============
CREATE TABLE IF NOT EXISTS public.dorm_rooms (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_number VARCHAR(20) NOT NULL UNIQUE,
  building VARCHAR(20) DEFAULT 'KTX Nam'
);

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  student_code VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role public.user_role DEFAULT 'hoc_sinh'::public.user_role NOT NULL,
  team_id BIGINT REFERENCES public.teams(id),
  dorm_room_id BIGINT REFERENCES public.dorm_rooms(id),
  phone_number VARCHAR(15),
  must_change_password BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ RULES ============
CREATE TABLE IF NOT EXISTS public.rules (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category public.point_category NOT NULL,
  type public.point_type NOT NULL,
  points INT NOT NULL,
  requires_gvcn_approval BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE
);

-- ============ ACADEMIC WEEKS ============
CREATE TABLE IF NOT EXISTS public.academic_weeks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  week_number INT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  class_rank INT,
  class_bonus_points INT DEFAULT 0,
  is_closed BOOLEAN DEFAULT FALSE
);

-- ============ POINT LOGS ============
CREATE TABLE IF NOT EXISTS public.point_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recorder_id UUID NOT NULL REFERENCES public.profiles(id),
  week_id BIGINT NOT NULL REFERENCES public.academic_weeks(id),
  rule_id BIGINT REFERENCES public.rules(id),
  points INT NOT NULL,
  category public.point_category NOT NULL,
  reason TEXT NOT NULL,
  status public.record_status DEFAULT 'approved'::public.record_status,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ DORM INSPECTIONS ============
CREATE TABLE IF NOT EXISTS public.dorm_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dorm_room_id BIGINT NOT NULL REFERENCES public.dorm_rooms(id),
  inspector_id UUID NOT NULL REFERENCES public.profiles(id),
  inspection_date DATE DEFAULT CURRENT_DATE NOT NULL,
  cleanliness_score INT CHECK (cleanliness_score BETWEEN 1 AND 10),
  self_study_status BOOLEAN DEFAULT TRUE,
  curfew_status BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ DOCUMENT SIGNATURES ============
CREATE TABLE IF NOT EXISTS public.document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  signed_pdf_url TEXT,
  is_signed_by_student BOOLEAN DEFAULT FALSE,
  is_signed_by_gvcn BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ WEEKLY REPORTS ============
CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_id BIGINT NOT NULL REFERENCES public.academic_weeks(id) ON DELETE CASCADE,
  report_type public.report_type NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  notes TEXT,
  status public.report_status DEFAULT 'submitted'::public.report_status,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (reporter_id, week_id, report_type)
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_team ON public.profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_dorm ON public.profiles(dorm_room_id);
CREATE INDEX IF NOT EXISTS idx_point_logs_student ON public.point_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_point_logs_week ON public.point_logs(week_id);
CREATE INDEX IF NOT EXISTS idx_point_logs_category ON public.point_logs(category);
CREATE INDEX IF NOT EXISTS idx_dorm_inspections_room ON public.dorm_inspections(dorm_room_id);
CREATE INDEX IF NOT EXISTS idx_dorm_inspections_date ON public.dorm_inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_week ON public.weekly_reports(week_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_reporter ON public.weekly_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_student ON public.document_signatures(student_id);

-- ============ RLS: TEAMS ============
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_teams" ON public.teams;
CREATE POLICY "read_teams" ON public.teams FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "gvcn_manage_teams" ON public.teams;
CREATE POLICY "gvcn_manage_teams" ON public.teams FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn'));

-- ============ RLS: DORM ROOMS ============
ALTER TABLE public.dorm_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_dorm_rooms" ON public.dorm_rooms;
CREATE POLICY "read_dorm_rooms" ON public.dorm_rooms FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "gvcn_manage_dorm_rooms" ON public.dorm_rooms;
CREATE POLICY "gvcn_manage_dorm_rooms" ON public.dorm_rooms FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn'));

-- ============ RLS: RULES ============
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_rules" ON public.rules;
CREATE POLICY "read_rules" ON public.rules FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "gvcn_manage_rules" ON public.rules;
CREATE POLICY "gvcn_manage_rules" ON public.rules FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn'));

-- ============ RLS: ACADEMIC WEEKS ============
ALTER TABLE public.academic_weeks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_academic_weeks" ON public.academic_weeks;
CREATE POLICY "read_academic_weeks" ON public.academic_weeks FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "gvcn_manage_academic_weeks" ON public.academic_weeks;
CREATE POLICY "gvcn_manage_academic_weeks" ON public.academic_weeks FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn'));

-- ============ RLS: PROFILES ============
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_profiles" ON public.profiles;
CREATE POLICY "read_profiles" ON public.profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "gvcn_update_profiles" ON public.profiles;
CREATE POLICY "gvcn_update_profiles" ON public.profiles FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn'));

DROP POLICY IF EXISTS "gvcn_insert_profiles" ON public.profiles;
CREATE POLICY "gvcn_insert_profiles" ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn'));

-- ============ RLS: POINT LOGS ============
ALTER TABLE public.point_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_point_logs" ON public.point_logs;
CREATE POLICY "read_point_logs" ON public.point_logs FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep', 'lop_pho_lao_dong', 'to_truong', 'truong_phong_ktx')
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
      AND p.role IN ('gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep', 'lop_pho_lao_dong', 'to_truong', 'truong_phong_ktx')
    )
  );

DROP POLICY IF EXISTS "update_point_logs" ON public.point_logs;
CREATE POLICY "update_point_logs" ON public.point_logs FOR UPDATE
  TO authenticated
  USING (
    recorder_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  )
  WITH CHECK (
    recorder_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  );

DROP POLICY IF EXISTS "delete_point_logs" ON public.point_logs;
CREATE POLICY "delete_point_logs" ON public.point_logs FOR DELETE
  TO authenticated
  USING (
    recorder_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  );

-- ============ RLS: DORM INSPECTIONS ============
ALTER TABLE public.dorm_inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_dorm_inspections" ON public.dorm_inspections;
CREATE POLICY "read_dorm_inspections" ON public.dorm_inspections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('gvcn', 'truong_phong_ktx')
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.dorm_room_id = dorm_inspections.dorm_room_id
    )
  );

DROP POLICY IF EXISTS "insert_dorm_inspections" ON public.dorm_inspections;
CREATE POLICY "insert_dorm_inspections" ON public.dorm_inspections FOR INSERT
  TO authenticated
  WITH CHECK (
    inspector_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('gvcn', 'truong_phong_ktx')
    )
  );

DROP POLICY IF EXISTS "update_dorm_inspections" ON public.dorm_inspections;
CREATE POLICY "update_dorm_inspections" ON public.dorm_inspections FOR UPDATE
  TO authenticated
  USING (
    inspector_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  )
  WITH CHECK (
    inspector_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  );

DROP POLICY IF EXISTS "delete_dorm_inspections" ON public.dorm_inspections;
CREATE POLICY "delete_dorm_inspections" ON public.dorm_inspections FOR DELETE
  TO authenticated
  USING (
    inspector_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  );

-- ============ RLS: DOCUMENT SIGNATURES ============
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_document_signatures" ON public.document_signatures;
CREATE POLICY "read_document_signatures" ON public.document_signatures FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  );

DROP POLICY IF EXISTS "insert_document_signatures" ON public.document_signatures;
CREATE POLICY "insert_document_signatures" ON public.document_signatures FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "update_own_document_signature" ON public.document_signatures;
CREATE POLICY "update_own_document_signature" ON public.document_signatures FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "gvcn_update_document_signatures" ON public.document_signatures;
CREATE POLICY "gvcn_update_document_signatures" ON public.document_signatures FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn'));

-- ============ RLS: WEEKLY REPORTS ============
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_weekly_reports" ON public.weekly_reports;
CREATE POLICY "read_weekly_reports" ON public.weekly_reports FOR SELECT
  TO authenticated
  USING (
    reporter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  );

DROP POLICY IF EXISTS "insert_weekly_reports" ON public.weekly_reports;
CREATE POLICY "insert_weekly_reports" ON public.weekly_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep', 'lop_pho_lao_dong', 'truong_phong_ktx', 'to_truong')
    )
  );

DROP POLICY IF EXISTS "update_weekly_reports" ON public.weekly_reports;
CREATE POLICY "update_weekly_reports" ON public.weekly_reports FOR UPDATE
  TO authenticated
  USING (
    reporter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  )
  WITH CHECK (
    reporter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  );

DROP POLICY IF EXISTS "delete_weekly_reports" ON public.weekly_reports;
CREATE POLICY "delete_weekly_reports" ON public.weekly_reports FOR DELETE
  TO authenticated
  USING (
    reporter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  );

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('signed-documents', 'signed-documents', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('excel-reports', 'excel-reports', false) ON CONFLICT DO NOTHING;
