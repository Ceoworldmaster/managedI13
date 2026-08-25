/*
# Seed Reference Data for Class 11I

## Overview
Populates reference tables with initial data for the class management system.

## Data Inserted
1. **teams**: 4 class groups (Tổ 1-4).
2. **dorm_rooms**: 4 dormitory rooms (P.201-P.204) in KTX Nam building.
3. **rules**: 16 common point rules across all categories (hoc_tap, ne_nep, lao_dong, ktx, tap_the) with cong/tru types.
4. **academic_weeks**: 3 initial weeks with date ranges.

## Important Notes
1. Uses ON CONFLICT DO NOTHING for idempotency.
2. Rules marked requires_gvcn_approval=true for serious violations (Vô lễ, Đánh nhau).
3. Week 1 is the current active week; weeks 2-3 are upcoming.
*/

INSERT INTO public.teams (name) VALUES
  ('Tổ 1'), ('Tổ 2'), ('Tổ 3'), ('Tổ 4')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.dorm_rooms (room_number, building) VALUES
  ('P.201', 'KTX Nam'),
  ('P.202', 'KTX Nam'),
  ('P.203', 'KTX Nam'),
  ('P.204', 'KTX Nam')
ON CONFLICT (room_number) DO NOTHING;

INSERT INTO public.rules (title, category, type, points, requires_gvcn_approval) VALUES
  -- Học tập
  ('Phát biểu xây dựng bài', 'hoc_tap', 'cong', 2, false),
  ('Giải bài tập trên bảng', 'hoc_tap', 'cong', 1, false),
  ('Không làm bài tập về nhà', 'hoc_tap', 'tru', 3, false),
  ('Kiểm tra miệng dưới 5 điểm', 'hoc_tap', 'tru', 5, false),
  -- Nề nếp
  ('Đi muộn', 'ne_nep', 'tru', 2, false),
  ('Không mặc đồng phục', 'ne_nep', 'tru', 3, false),
  ('Vô lễ với giáo viên', 'ne_nep', 'tru', 20, true),
  ('Ăn uống trong lớp', 'ne_nep', 'tru', 2, false),
  -- Lao động
  ('Trực nhật tốt', 'lao_dong', 'cong', 3, false),
  ('Không trực nhật', 'lao_dong', 'tru', 5, false),
  ('Trực nhật xuất sắc', 'lao_dong', 'cong', 5, false),
  -- KTX
  ('Vệ sinh phòng sạch', 'ktx', 'cong', 3, false),
  ('Dùng điện thoại giờ tự học', 'ktx', 'tru', 10, false),
  ('Về trễ giờ quy định', 'ktx', 'tru', 5, false),
  -- Tập thể
  ('Tham gia hoạt động tập thể', 'tap_the', 'cong', 3, false),
  ('Lớp đạt danh hiệu thi đua', 'tap_the', 'cong', 10, false)
ON CONFLICT DO NOTHING;

INSERT INTO public.academic_weeks (week_number, start_date, end_date, class_rank, class_bonus_points, is_closed) VALUES
  (1, '2026-08-17', '2026-08-23', NULL, 0, false),
  (2, '2026-08-24', '2026-08-30', NULL, 0, false),
  (3, '2026-08-31', '2026-09-06', NULL, 0, false)
ON CONFLICT (week_number) DO NOTHING;
