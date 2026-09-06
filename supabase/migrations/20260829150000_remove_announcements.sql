/*
# Remove announcements ("Bảng tin lớp")

## Overview
The class announcement board feature has been removed from the app. This
migration drops its tables, policies, and indexes. No other table
references announcements, so this is safe to drop outright.
*/

DROP POLICY IF EXISTS "read_announcement_reads" ON public.announcement_reads;
DROP POLICY IF EXISTS "insert_announcement_reads" ON public.announcement_reads;
DROP POLICY IF EXISTS "read_announcements" ON public.announcements;
DROP POLICY IF EXISTS "insert_announcements" ON public.announcements;
DROP POLICY IF EXISTS "update_announcements" ON public.announcements;
DROP POLICY IF EXISTS "delete_announcements" ON public.announcements;

DROP TABLE IF EXISTS public.announcement_reads;
DROP TABLE IF EXISTS public.announcements;
