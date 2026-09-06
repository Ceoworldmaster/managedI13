/*
# Announcements ("Bảng tin lớp")

## Overview
Adds a class announcement board so gvcn/ban cán sự can post news, reminders,
and instructions that every member of the class sees on login.

## New Tables
1. **announcements** - title, body, pinned flag, author, timestamps.
2. **announcement_reads** - which student has read which announcement, so the
   UI can show an unread badge per user. One row per (announcement, student).

## Security (RLS)
- announcements: any authenticated user can read. Only gvcn and ban cán sự
  roles (lop_truong, lop_pho_*, to_truong, truong_phong_ktx) can insert;
  only the author or gvcn can update/delete.
- announcement_reads: a user can read/insert only their own read receipts.
*/

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, student_id)
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- ============ RLS: ANNOUNCEMENTS ============
DROP POLICY IF EXISTS "read_announcements" ON public.announcements;
CREATE POLICY "read_announcements" ON public.announcements FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_announcements" ON public.announcements;
CREATE POLICY "insert_announcements" ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep', 'lop_pho_van_nghe', 'lop_pho_lao_dong', 'to_truong', 'truong_phong_ktx')
    )
  );

DROP POLICY IF EXISTS "update_announcements" ON public.announcements;
CREATE POLICY "update_announcements" ON public.announcements FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  )
  WITH CHECK (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  );

DROP POLICY IF EXISTS "delete_announcements" ON public.announcements;
CREATE POLICY "delete_announcements" ON public.announcements FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  );

-- ============ RLS: ANNOUNCEMENT READS ============
DROP POLICY IF EXISTS "read_announcement_reads" ON public.announcement_reads;
CREATE POLICY "read_announcement_reads" ON public.announcement_reads FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "insert_announcement_reads" ON public.announcement_reads;
CREATE POLICY "insert_announcement_reads" ON public.announcement_reads FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_student ON public.announcement_reads (student_id);
