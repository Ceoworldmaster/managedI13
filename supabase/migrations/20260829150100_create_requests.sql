/*
# Requests ("Đơn từ & Đề xuất")

## Overview
Lets every account (any role) submit a request — xin về nhà, xin nghỉ học,
đề xuất, nghị quyết, or another kind of đơn — to be reviewed and
approved/rejected by the homeroom teacher (gvcn), who acts as the admin
account in this app.

## New Table
**requests**
- requester_id: who submitted it (any authenticated profile).
- request_type: 've_nha' | 'nghi_hoc' | 'de_xuat' | 'nghi_quyet' | 'khac'.
- title, content: subject and body of the request.
- date_from / date_to: optional date range (used for về nhà / nghỉ học).
- status: 'pending' | 'approved' | 'rejected'.
- reviewer_id, review_note, reviewed_at: filled in by gvcn on decision.

## Security (RLS)
- Any authenticated user can insert a request as themselves.
- A user can read their own requests; gvcn can read all.
- A user can delete (withdraw) their own request while still pending.
- Only gvcn can update a request's status/review fields.
*/

CREATE TABLE IF NOT EXISTS public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('ve_nha', 'nghi_hoc', 'de_xuat', 'nghi_quyet', 'khac')),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  date_from DATE,
  date_to DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- ============ RLS: REQUESTS ============
DROP POLICY IF EXISTS "insert_requests" ON public.requests;
CREATE POLICY "insert_requests" ON public.requests FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "select_requests" ON public.requests;
CREATE POLICY "select_requests" ON public.requests FOR SELECT
  TO authenticated
  USING (
    requester_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn')
  );

DROP POLICY IF EXISTS "review_requests" ON public.requests;
CREATE POLICY "review_requests" ON public.requests FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gvcn'));

DROP POLICY IF EXISTS "withdraw_own_pending_request" ON public.requests;
CREATE POLICY "withdraw_own_pending_request" ON public.requests FOR DELETE
  TO authenticated
  USING (requester_id = auth.uid() AND status = 'pending');

CREATE INDEX IF NOT EXISTS idx_requests_requester ON public.requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests (status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON public.requests (created_at DESC);
