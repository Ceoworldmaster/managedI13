/*
# Request attachments

## Overview
Lets a request ("đơn từ") include one or more attached files — Word
documents, PDFs, or images (e.g. a scanned permission slip, a photo of
proof) — for the reviewer (gvcn) to see alongside the request.

## New Table
**request_attachments** - one row per uploaded file, linked to its request.

## Security (RLS)
- A user can insert/select/delete attachments only on a request they own,
  or on any request if they are gvcn (read for review; delete for
  moderation). Deleting the parent request cascades to its attachments.

## Storage
Adds a private 'request-attachments' bucket, following the same pattern
already used for 'signed-documents' and 'excel-reports'.
*/

CREATE TABLE IF NOT EXISTS public.request_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.request_attachments ENABLE ROW LEVEL SECURITY;

-- ============ RLS: REQUEST ATTACHMENTS ============
DROP POLICY IF EXISTS "insert_request_attachments" ON public.request_attachments;
CREATE POLICY "insert_request_attachments" ON public.request_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND r.requester_id = auth.uid())
  );

DROP POLICY IF EXISTS "select_request_attachments" ON public.request_attachments;
CREATE POLICY "select_request_attachments" ON public.request_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id
      AND (r.requester_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn'))
    )
  );

DROP POLICY IF EXISTS "delete_request_attachments" ON public.request_attachments;
CREATE POLICY "delete_request_attachments" ON public.request_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id
      AND (
        (r.requester_id = auth.uid() AND r.status = 'pending')
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_request_attachments_request ON public.request_attachments (request_id);

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public) VALUES ('request-attachments', 'request-attachments', false) ON CONFLICT DO NOTHING;
