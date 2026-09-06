/*
# Fix storage RLS for request attachments

## Problem
The 'request-attachments' bucket was created with RLS enabled (the default
for storage.objects) but no policy was added for it, so every upload was
rejected with "new row violates row-level security policy" even though the
request_attachments table policies were fine — the failure happens one
layer earlier, in Supabase Storage itself.

## Fix
Add explicit storage.objects policies scoped to this bucket:
- Any authenticated user can upload (INSERT) into it — files are uploaded
  under a path starting with the uploader's own user id.
- Any authenticated user can read (SELECT) files in it — actual visibility
  of a request (and therefore its file_url) is already restricted by the
  requests/request_attachments table policies, so this only controls
  whether the file bytes can be fetched once a URL is known.
- A user can delete their own uploaded files (path starts with their id);
  gvcn can delete any file in this bucket for moderation.
*/

DROP POLICY IF EXISTS "insert_request_attachment_files" ON storage.objects;
CREATE POLICY "insert_request_attachment_files" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'request-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "read_request_attachment_files" ON storage.objects;
CREATE POLICY "read_request_attachment_files" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'request-attachments');

DROP POLICY IF EXISTS "delete_request_attachment_files" ON storage.objects;
CREATE POLICY "delete_request_attachment_files" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'request-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
    )
  );

-- The app opens attachment links directly (new browser tab, no auth
-- header attached), so the bucket must be public for those links to
-- actually load — the SELECT policy above only covers authenticated
-- API/client access, not plain URL fetches. Who can see a file's URL at
-- all is still gated by the requests/request_attachments table RLS.
UPDATE storage.buckets SET public = true WHERE id = 'request-attachments';
