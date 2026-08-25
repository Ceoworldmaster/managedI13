/*
# Storage policies for excel-reports & signed-documents

## Overview
The original schema created the `excel-reports` and `signed-documents`
storage buckets but never added any RLS policies on `storage.objects` for
them. Supabase Storage enables RLS by default, so with zero policies every
insert (upload) was rejected with "new row violates row-level security
policy" — the app's Reports and Signatures pages could never actually save a
file.

This adds:
1. Policies letting an authenticated user upload/read/delete files under
   their own folder (files are stored as `<user_id>/...`), and letting GVCN
   read/manage everything.
2. Marks both buckets public so `getPublicUrl()` (already used by the
   frontend) actually resolves — RLS above still governs who may upload,
   update, or delete.
*/

UPDATE storage.buckets SET public = true WHERE id IN ('excel-reports', 'signed-documents');

-- ============ excel-reports ============
DROP POLICY IF EXISTS "excel_reports_insert_own" ON storage.objects;
CREATE POLICY "excel_reports_insert_own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'excel-reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "excel_reports_read" ON storage.objects;
CREATE POLICY "excel_reports_read" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'excel-reports'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
    )
  );

DROP POLICY IF EXISTS "excel_reports_delete" ON storage.objects;
CREATE POLICY "excel_reports_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'excel-reports'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
    )
  );

-- ============ signed-documents ============
DROP POLICY IF EXISTS "signed_documents_insert_own" ON storage.objects;
CREATE POLICY "signed_documents_insert_own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'signed-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "signed_documents_read" ON storage.objects;
CREATE POLICY "signed_documents_read" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'signed-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
    )
  );

DROP POLICY IF EXISTS "signed_documents_delete" ON storage.objects;
CREATE POLICY "signed_documents_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'signed-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
    )
  );
