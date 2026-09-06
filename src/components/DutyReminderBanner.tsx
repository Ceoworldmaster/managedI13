import { useEffect, useState, useCallback } from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useAuth } from '../lib/auth';
import { supabase, DUTY_AREA_LABELS, type DutySchedule } from '../lib/supabase';
import type { PageKey } from './Layout';

const NOTIFIED_KEY = 'class11i_notified_duty_dates';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function getNotifiedSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}
function markNotified(key: string) {
  try {
    const set = getNotifiedSet();
    set.add(key);
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

interface Props {
  onNavigate: (page: PageKey) => void;
}

/**
 * Shows an in-app banner (and, if the user has granted permission, a
 * browser notification) when the signed-in student/cán bộ has duty
 * ("trực nhật") today or tomorrow. Reads duty_schedule_students so it only
 * surfaces shifts the current user is actually assigned to.
 */
export default function DutyReminderBanner({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [upcoming, setUpcoming] = useState<DutySchedule[]>([]);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(
    typeof Notification !== 'undefined' ? Notification.permission : null,
  );

  const load = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('duty_schedule_students')
      .select('duty_schedule:duty_schedules(*, team:teams(*), dorm_room:dorm_rooms(*))')
      .eq('student_id', profile.id);

    if (!data) return;
    const today = todayStr();
    const tomorrow = tomorrowStr();
    const shifts = (data as unknown as { duty_schedule: DutySchedule }[])
      .map((r) => r.duty_schedule)
      .filter((s) => s && (s.duty_date === today || s.duty_date === tomorrow) && s.status === 'chua_truc');
    setUpcoming(shifts);

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const notified = getNotifiedSet();
      shifts.forEach((s) => {
        const key = `${s.id}-${s.duty_date}`;
        if (!notified.has(key)) {
          const when = s.duty_date === today ? 'hôm nay' : 'ngày mai';
          new Notification('Nhắc lịch trực — Lớp 11I', {
            body: `Bạn có lịch trực ${DUTY_AREA_LABELS[s.area]} ${when}${s.description ? ': ' + s.description : ''}.`,
          });
          markNotified(key);
        }
      });
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  };

  if (upcoming.length === 0) return null;

  const today = todayStr();

  return (
    <Box sx={{ mb: 2 }}>
      <Alert
        severity="info"
        icon={<NotificationsActiveIcon fontSize="inherit" />}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            {notifPermission === 'default' && (
              <Button color="inherit" size="small" onClick={requestPermission}>
                Bật thông báo
              </Button>
            )}
            <Button color="inherit" size="small" onClick={() => onNavigate('labor')}>
              Xem lịch
            </Button>
          </Stack>
        }
      >
        <AlertTitle sx={{ fontWeight: 700 }}>Nhắc lịch trực</AlertTitle>
        {upcoming.map((s) => (
          <Box key={s.id} component="span" sx={{ display: 'block' }}>
            Bạn có lịch trực <b>{DUTY_AREA_LABELS[s.area]}</b>{' '}
            {s.duty_date === today ? 'hôm nay' : 'ngày mai'} ({s.duty_date})
            {s.description ? ` — ${s.description}` : ''}.
          </Box>
        ))}
      </Alert>
    </Box>
  );
}
