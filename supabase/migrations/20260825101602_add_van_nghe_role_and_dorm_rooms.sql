/*
# Add "Lớp phó Văn nghệ" role + real KTX dorm room list

## Overview
1. Adds a new role `lop_pho_van_nghe` (Lớp phó Văn nghệ) to the user_role enum,
   alongside the existing `lop_pho_lao_dong` (Lớp phó Lao động).
2. Replaces the placeholder dorm rooms (P.201-P.204) with the class's actual
   KTX rooms: 23 Nam, 35 Nam, 42 Nam, 3NCV, 35 Nữ, 2 Nữ.

## Important Notes
- ALTER TYPE ... ADD VALUE must be committed before the new enum value can be
  referenced elsewhere, so this runs as its own migration file.
- Old placeholder rooms are only removed if nothing references them
  (no profile or inspection points at them), so this is safe to re-run.
*/

-- ============ NEW ROLE ============
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'lop_pho_van_nghe';

-- ============ REAL DORM ROOMS ============
INSERT INTO public.dorm_rooms (room_number, building) VALUES
  ('23 Nam', 'Nam'),
  ('35 Nam', 'Nam'),
  ('42 Nam', 'Nam'),
  ('3NCV', 'NCV'),
  ('35 Nữ', 'Nữ'),
  ('2 Nữ', 'Nữ')
ON CONFLICT (room_number) DO NOTHING;

-- Remove old placeholder rooms only if unused
DELETE FROM public.dorm_rooms r
WHERE r.room_number IN ('P.201', 'P.202', 'P.203', 'P.204')
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.dorm_room_id = r.id)
  AND NOT EXISTS (SELECT 1 FROM public.dorm_inspections di WHERE di.dorm_room_id = r.id);
