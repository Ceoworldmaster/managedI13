import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env file.');
}

// ============ "Ghi nhớ đăng nhập" (remember login) ============
// When remembered, the session is kept in localStorage (survives closing the
// browser/tab). When not remembered, it's kept in sessionStorage (cleared as
// soon as the tab is closed). The preference itself is always stored in
// localStorage so it's known before the auth client reads/writes a session.
const REMEMBER_ME_KEY = 'class11i_remember_me';

export function getRememberMe(): boolean {
  try {
    return localStorage.getItem(REMEMBER_ME_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setRememberMe(remember: boolean) {
  try {
    localStorage.setItem(REMEMBER_ME_KEY, remember ? 'true' : 'false');
    // Clear any stale session copy in the storage we're no longer using so
    // a leftover token can't be picked up later.
    const other = remember ? window.sessionStorage : window.localStorage;
    Object.keys(other)
      .filter((k) => k.startsWith('sb-'))
      .forEach((k) => other.removeItem(k));
  } catch {
    // ignore (e.g. storage disabled)
  }
}

const rememberAwareStorage = {
  getItem: (key: string) => (getRememberMe() ? window.localStorage : window.sessionStorage).getItem(key),
  setItem: (key: string, value: string) => (getRememberMe() ? window.localStorage : window.sessionStorage).setItem(key, value),
  removeItem: (key: string) => (getRememberMe() ? window.localStorage : window.sessionStorage).removeItem(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: rememberAwareStorage,
  },
});

export type UserRole =
  | 'gvcn'
  | 'lop_truong'
  | 'lop_pho_hoc_tap'
  | 'lop_pho_ne_nep'
  | 'lop_pho_van_nghe'
  | 'lop_pho_lao_dong'
  | 'to_truong'
  | 'truong_phong_ktx'
  | 'hoc_sinh';

export type DutyArea = 'lop_hoc' | 'ktx';
export type DutyStatus = 'chua_truc' | 'da_truc' | 'vang_truc';

export type PointCategory = 'hoc_tap' | 'ne_nep' | 'lao_dong' | 'ktx' | 'tap_the';
export type PointType = 'cong' | 'tru';
export type RecordStatus = 'pending' | 'approved' | 'rejected';
export type ReportType = 'hoc_tap' | 'ne_nep' | 'lao_dong' | 'ktx_phong' | 'to_truong';
export type ReportStatus = 'submitted' | 'reviewed';

export interface Profile {
  id: string;
  student_code: string;
  full_name: string;
  role: UserRole;
  team_id: number | null;
  dorm_room_id: number | null;
  phone_number: string | null;
  must_change_password: boolean;
  created_at: string;
}

export interface Team {
  id: number;
  name: string;
}

export interface DormRoom {
  id: number;
  room_number: string;
  building: string;
}

export interface Rule {
  id: number;
  title: string;
  category: PointCategory;
  type: PointType;
  points: number;
  requires_gvcn_approval: boolean;
  is_active: boolean;
}

export interface AcademicWeek {
  id: number;
  week_number: number;
  start_date: string;
  end_date: string;
  class_rank: number | null;
  class_bonus_points: number;
  is_closed: boolean;
}

export interface PointLog {
  id: string;
  student_id: string;
  recorder_id: string;
  week_id: number;
  rule_id: number | null;
  points: number;
  type: PointType;
  category: PointCategory;
  reason: string;
  status: RecordStatus;
  created_at: string;
  student?: Profile;
  recorder?: Profile;
  rule?: Rule | null;
  week?: AcademicWeek;
}

export interface DormInspection {
  id: string;
  dorm_room_id: number;
  inspector_id: string;
  inspection_date: string;
  cleanliness_score: number;
  self_study_status: boolean;
  curfew_status: boolean;
  notes: string | null;
  created_at: string;
  dorm_room?: DormRoom;
  inspector?: Profile;
}

export interface DocumentSignature {
  id: string;
  student_id: string;
  document_name: string;
  file_url: string;
  signed_pdf_url: string | null;
  is_signed_by_student: boolean;
  is_signed_by_gvcn: boolean;
  signed_at: string | null;
  created_at: string;
  student?: Profile;
}

export interface DutySchedule {
  id: number;
  duty_date: string;
  area: DutyArea;
  team_id: number | null;
  dorm_room_id: number | null;
  description: string | null;
  status: DutyStatus;
  created_by: string | null;
  created_at: string;
  team?: Team | null;
  dorm_room?: DormRoom | null;
  members?: { student: Profile }[];
}

export interface LaborEvaluation {
  id: string;
  duty_schedule_id: number | null;
  student_id: string;
  evaluator_id: string;
  evaluation_date: string;
  completion_score: number;
  on_time: boolean;
  points: number;
  notes: string | null;
  point_log_id: string | null;
  created_at: string;
  student?: Profile;
  evaluator?: Profile;
  duty_schedule?: DutySchedule | null;
}

export interface WeeklyReport {
  id: string;
  reporter_id: string;
  week_id: number;
  report_type: ReportType;
  file_name: string;
  file_url: string;
  notes: string | null;
  status: ReportStatus;
  submitted_at: string;
  reporter?: Profile;
  week?: AcademicWeek;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  gvcn: 'Giáo viên chủ nhiệm',
  lop_truong: 'Lớp trưởng',
  lop_pho_hoc_tap: 'Lớp phó Học tập',
  lop_pho_ne_nep: 'Lớp phó Nề nếp',
  lop_pho_van_nghe: 'Lớp phó Văn nghệ',
  lop_pho_lao_dong: 'Lớp phó Lao động',
  to_truong: 'Tổ trưởng',
  truong_phong_ktx: 'Trưởng phòng KTX',
  hoc_sinh: 'Học sinh',
};

export const DUTY_AREA_LABELS: Record<DutyArea, string> = {
  lop_hoc: 'Lớp học',
  ktx: 'Phòng KTX',
};

export const DUTY_STATUS_LABELS: Record<DutyStatus, string> = {
  chua_truc: 'Chưa trực',
  da_truc: 'Đã trực',
  vang_truc: 'Vắng trực',
};

export const CATEGORY_LABELS: Record<PointCategory, string> = {
  hoc_tap: 'Học tập',
  ne_nep: 'Nề nếp',
  lao_dong: 'Lao động',
  ktx: 'KTX',
  tap_the: 'Tập thể',
};

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  hoc_tap: 'Học tập',
  ne_nep: 'Nề nếp',
  lao_dong: 'Lao động',
  ktx_phong: 'Vệ sinh KTX phòng',
  to_truong: 'Tổ trưởng',
};
