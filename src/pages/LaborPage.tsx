import { useState, useEffect, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Slider from '@mui/material/Slider';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import EngineeringIcon from '@mui/icons-material/Engineering';
import EventNoteIcon from '@mui/icons-material/EventNote';
import GroupsIcon from '@mui/icons-material/Groups';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import { useAuth, canRecordPoints, isStudentRole } from '../lib/auth';
import {
  supabase,
  type Profile,
  type Team,
  type DormRoom,
  type DutySchedule,
  type DutyArea,
  type DutyStatus,
  type LaborEvaluation,
  DUTY_AREA_LABELS,
  DUTY_STATUS_LABELS,
} from '../lib/supabase';

const todayStr = () => new Date().toISOString().slice(0, 10);

interface EvalRow {
  studentId: string;
  fullName: string;
  studentCode: string;
  included: boolean;
  absent: boolean;
  score: number;
  onTime: boolean;
  points: string;
  notes: string;
  existingEvalId?: string;
  existingPointLogId?: string | null;
}

/** Creates/updates/removes the matching competition-point log for one evaluation row. */
async function syncPointLog(
  existingPointLogId: string | null,
  pointsNum: number,
  reason: string,
  studentId: string,
  weekId: number | null,
  recorderId: string,
): Promise<string | null> {
  if (pointsNum === 0) {
    if (existingPointLogId) {
      await supabase.from('point_logs').delete().eq('id', existingPointLogId);
    }
    return null;
  }
  if (!weekId) return existingPointLogId;

  const payload = {
    student_id: studentId,
    recorder_id: recorderId,
    week_id: weekId,
    rule_id: null,
    points: Math.abs(pointsNum),
    type: pointsNum < 0 ? 'tru' : 'cong',
    category: 'lao_dong',
    reason,
    status: 'approved',
  };

  if (existingPointLogId) {
    const { data } = await supabase.from('point_logs').update(payload).eq('id', existingPointLogId).select('id').single();
    return data?.id ?? existingPointLogId;
  }
  const { data } = await supabase.from('point_logs').insert(payload).select('id').single();
  return data?.id ?? null;
}

function scheduleLabel(s: DutySchedule) {
  const place = s.team?.name || s.dorm_room?.room_number || 'Chưa gán tổ/phòng';
  return `${new Date(s.duty_date).toLocaleDateString('vi-VN')} • ${DUTY_AREA_LABELS[s.area]} • ${place}`;
}

export default function LaborPage() {
  const { profile } = useAuth();
  const canManage = canRecordPoints(profile);

  const [students, setStudents] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [dormRooms, setDormRooms] = useState<DormRoom[]>([]);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // ---------- Duty schedule state ----------
  const [schedules, setSchedules] = useState<DutySchedule[]>([]);
  const [dutyDate, setDutyDate] = useState(todayStr());
  const [dutyArea, setDutyArea] = useState<DutyArea>('lop_hoc');
  const [dutyTeam, setDutyTeam] = useState('');
  const [dutyRoom, setDutyRoom] = useState('');
  const [dutyDescription, setDutyDescription] = useState('');
  const [dutyStudentIds, setDutyStudentIds] = useState<string[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // ---------- Labor evaluation state ----------
  const [evaluations, setEvaluations] = useState<LaborEvaluation[]>([]);
  const [evalCounts, setEvalCounts] = useState<Record<number, number>>({});

  const [evalMode, setEvalMode] = useState<'schedule' | 'manual'>('schedule');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [evalRows, setEvalRows] = useState<EvalRow[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [bulkScore, setBulkScore] = useState(8);
  const [bulkOnTime, setBulkOnTime] = useState(true);
  const [bulkPoints, setBulkPoints] = useState('0');

  // manual (no lượt trực) fallback fields
  const [evalStudent, setEvalStudent] = useState('');
  const [evalDate, setEvalDate] = useState(todayStr());
  const [evalScore, setEvalScore] = useState(8);
  const [evalOnTime, setEvalOnTime] = useState(true);
  const [evalPoints, setEvalPoints] = useState('0');
  const [evalNotes, setEvalNotes] = useState('');

  const [savingEval, setSavingEval] = useState(false);

  const loadRefData = useCallback(async () => {
    const [studentsRes, teamsRes, dormRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('teams').select('*').order('id'),
      supabase.from('dorm_rooms').select('*').order('room_number'),
    ]);
    if (studentsRes.data) setStudents((studentsRes.data as Profile[]).filter(isStudentRole));
    if (teamsRes.data) setTeams(teamsRes.data as Team[]);
    if (dormRes.data) setDormRooms(dormRes.data as DormRoom[]);
  }, []);

  const loadSchedules = useCallback(async () => {
    const { data } = await supabase
      .from('duty_schedules')
      .select('*, team:teams(*), dorm_room:dorm_rooms(*), members:duty_schedule_students(student:profiles(*))')
      .order('duty_date', { ascending: false })
      .limit(30);
    if (data) setSchedules(data as unknown as DutySchedule[]);
  }, []);

  const loadEvaluations = useCallback(async () => {
    const { data } = await supabase
      .from('labor_evaluations')
      .select('*, student:profiles!labor_evaluations_student_id_fkey(*), evaluator:profiles!labor_evaluations_evaluator_id_fkey(full_name), duty_schedule:duty_schedules(*, team:teams(*), dorm_room:dorm_rooms(*))')
      .order('evaluation_date', { ascending: false })
      .limit(30);
    if (data) setEvaluations(data as unknown as LaborEvaluation[]);
  }, []);

  // Counts evaluated students per shift across ALL evaluations (not just the
  // 30 most recent), so the "Đã chấm" indicator stays accurate.
  const loadEvalCounts = useCallback(async () => {
    const { data } = await supabase.from('labor_evaluations').select('duty_schedule_id').not('duty_schedule_id', 'is', null);
    if (data) {
      const map: Record<number, number> = {};
      (data as { duty_schedule_id: number }[]).forEach((row) => {
        map[row.duty_schedule_id] = (map[row.duty_schedule_id] || 0) + 1;
      });
      setEvalCounts(map);
    }
  }, []);

  useEffect(() => { loadRefData(); }, [loadRefData]);
  useEffect(() => { loadSchedules(); }, [loadSchedules]);
  useEffect(() => { loadEvaluations(); }, [loadEvaluations]);
  useEffect(() => { loadEvalCounts(); }, [loadEvalCounts]);

  const refreshAll = () => {
    loadSchedules();
    loadEvaluations();
    loadEvalCounts();
  };

  const resetScheduleForm = () => {
    setDutyDate(todayStr());
    setDutyArea('lop_hoc');
    setDutyTeam('');
    setDutyRoom('');
    setDutyDescription('');
    setDutyStudentIds([]);
  };

  const handleCreateSchedule = async () => {
    if (!dutyDate || !profile) return;
    setSavingSchedule(true);

    const { data: created, error } = await supabase
      .from('duty_schedules')
      .insert({
        duty_date: dutyDate,
        area: dutyArea,
        team_id: dutyTeam ? Number(dutyTeam) : null,
        dorm_room_id: dutyArea === 'ktx' && dutyRoom ? Number(dutyRoom) : null,
        description: dutyDescription || null,
        status: 'chua_truc',
        created_by: profile.id,
      })
      .select()
      .single();

    if (error || !created) {
      setToast({ open: true, message: 'Lỗi: ' + (error?.message || 'Không thể tạo lịch trực'), severity: 'error' });
      setSavingSchedule(false);
      return;
    }

    if (dutyStudentIds.length > 0) {
      await supabase.from('duty_schedule_students').insert(
        dutyStudentIds.map((studentId) => ({ duty_schedule_id: created.id, student_id: studentId }))
      );
    }

    setToast({ open: true, message: 'Đã thêm lịch trực', severity: 'success' });
    resetScheduleForm();
    refreshAll();
    setSavingSchedule(false);
  };

  const handleUpdateStatus = async (schedule: DutySchedule, status: DutyStatus) => {
    const { error } = await supabase.from('duty_schedules').update({ status }).eq('id', schedule.id);
    if (error) {
      setToast({ open: true, message: 'Lỗi: ' + error.message, severity: 'error' });
    } else {
      loadSchedules();
    }
  };

  // The roster of a duty shift: explicit members first, otherwise everyone
  // in the assigned team, otherwise everyone in the assigned KTX room. This
  // is what makes multi-student / multi-room shifts show up correctly.
  const getScheduleRoster = useCallback((schedule: DutySchedule): Profile[] => {
    if (schedule.members && schedule.members.length > 0) {
      return schedule.members.map((m) => m.student).filter(Boolean);
    }
    if (schedule.team_id) {
      return students.filter((s) => s.team_id === schedule.team_id);
    }
    if (schedule.area === 'ktx' && schedule.dorm_room_id) {
      return students.filter((s) => s.dorm_room_id === schedule.dorm_room_id);
    }
    return [];
  }, [students]);

  const rosterSource = useCallback((schedule: DutySchedule): string => {
    if (schedule.members && schedule.members.length > 0) return '';
    if (schedule.team_id) return ' (theo tổ)';
    if (schedule.area === 'ktx' && schedule.dorm_room_id) return ' (theo phòng)';
    return '';
  }, []);

  const openScheduleForEval = useCallback(async (schedule: DutySchedule) => {
    setEvalMode('schedule');
    setSelectedScheduleId(String(schedule.id));
    setLoadingRoster(true);

    const roster = getScheduleRoster(schedule);
    const { data: existingRows } = await supabase
      .from('labor_evaluations')
      .select('*')
      .eq('duty_schedule_id', schedule.id);
    const existingList = (existingRows as LaborEvaluation[] | null) || [];

    const rows: EvalRow[] = roster.map((s) => {
      const existing = existingList.find((e) => e.student_id === s.id);
      return {
        studentId: s.id,
        fullName: s.full_name,
        studentCode: s.student_code,
        included: true,
        absent: false,
        score: existing?.completion_score ?? bulkScore,
        onTime: existing?.on_time ?? bulkOnTime,
        points: String(existing?.points ?? 0),
        notes: existing?.notes ?? '',
        existingEvalId: existing?.id,
        existingPointLogId: existing?.point_log_id ?? null,
      };
    });
    setEvalRows(rows);
    setLoadingRoster(false);
  }, [getScheduleRoster, bulkScore, bulkOnTime]);

  const handleScheduleSelectChange = (value: string) => {
    setSelectedScheduleId(value);
    if (!value) {
      setEvalRows([]);
      return;
    }
    const schedule = schedules.find((s) => String(s.id) === value);
    if (schedule) openScheduleForEval(schedule);
  };

  const updateRow = (studentId: string, patch: Partial<EvalRow>) => {
    setEvalRows((rows) => rows.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r)));
  };

  const toggleAbsent = (studentId: string, absent: boolean) => {
    setEvalRows((rows) => rows.map((r) => {
      if (r.studentId !== studentId) return r;
      if (absent) return { ...r, absent, score: 1, onTime: false, notes: r.notes || 'Vắng trực' };
      return { ...r, absent, score: bulkScore, notes: r.notes === 'Vắng trực' ? '' : r.notes };
    }));
  };

  const applyBulkToAll = () => {
    setEvalRows((rows) => rows.map((r) => (r.absent ? r : { ...r, score: bulkScore, onTime: bulkOnTime, points: bulkPoints })));
  };

  const selectedSchedule = useMemo(
    () => schedules.find((s) => String(s.id) === selectedScheduleId) || null,
    [schedules, selectedScheduleId]
  );

  const handleSaveScheduleEvaluations = async () => {
    if (!profile || !selectedSchedule) return;
    const includedRows = evalRows.filter((r) => r.included);
    if (includedRows.length === 0) return;
    setSavingEval(true);

    const needsWeek = includedRows.some((r) => Number(r.points) !== 0 || r.existingPointLogId);
    let weekId: number | null = null;
    if (needsWeek) {
      const { data: weekData } = await supabase
        .from('academic_weeks')
        .select('id')
        .eq('is_closed', false)
        .order('week_number')
        .limit(1)
        .maybeSingle();
      weekId = weekData?.id ?? null;
    }

    let errorMsg = '';
    for (const row of includedRows) {
      const pointsNum = Number(row.points) || 0;
      const pointLogId = await syncPointLog(
        row.existingPointLogId ?? null,
        pointsNum,
        row.notes || 'Đánh giá lao động',
        row.studentId,
        weekId,
        profile.id,
      );

      const payload = {
        duty_schedule_id: selectedSchedule.id,
        student_id: row.studentId,
        evaluator_id: profile.id,
        evaluation_date: selectedSchedule.duty_date,
        completion_score: row.score,
        on_time: row.onTime,
        points: pointsNum,
        notes: row.notes || null,
        point_log_id: pointLogId,
      };

      const { error } = row.existingEvalId
        ? await supabase.from('labor_evaluations').update(payload).eq('id', row.existingEvalId)
        : await supabase.from('labor_evaluations').insert(payload);
      if (error) errorMsg = error.message;
    }

    const allAbsent = includedRows.every((r) => r.absent);
    const anyPresent = includedRows.some((r) => !r.absent);
    const newStatus: DutyStatus = allAbsent ? 'vang_truc' : anyPresent ? 'da_truc' : selectedSchedule.status;
    if (newStatus !== selectedSchedule.status) {
      await supabase.from('duty_schedules').update({ status: newStatus }).eq('id', selectedSchedule.id);
    }

    if (errorMsg) {
      setToast({ open: true, message: 'Có lỗi khi lưu: ' + errorMsg, severity: 'error' });
    } else {
      setToast({ open: true, message: `Đã lưu đánh giá cho ${includedRows.length} học sinh`, severity: 'success' });
    }
    setSelectedScheduleId('');
    setEvalRows([]);
    refreshAll();
    setSavingEval(false);
  };

  const resetEvalForm = () => {
    setEvalStudent('');
    setEvalDate(todayStr());
    setEvalScore(8);
    setEvalOnTime(true);
    setEvalPoints('0');
    setEvalNotes('');
  };

  const handleCreateEvaluation = async () => {
    if (!evalStudent || !profile) return;
    setSavingEval(true);

    const pointsNum = Number(evalPoints) || 0;
    let weekId: number | null = null;
    if (pointsNum !== 0) {
      const { data: weekData } = await supabase
        .from('academic_weeks')
        .select('id')
        .eq('is_closed', false)
        .order('week_number')
        .limit(1)
        .maybeSingle();
      weekId = weekData?.id ?? null;
      if (!weekId) {
        setToast({ open: true, message: 'Không có tuần học đang mở, điểm thi đua sẽ không được ghi', severity: 'error' });
      }
    }

    const pointLogId = await syncPointLog(null, pointsNum, evalNotes || 'Đánh giá lao động', evalStudent, weekId, profile.id);

    const { error } = await supabase.from('labor_evaluations').insert({
      duty_schedule_id: null,
      student_id: evalStudent,
      evaluator_id: profile.id,
      evaluation_date: evalDate,
      completion_score: evalScore,
      on_time: evalOnTime,
      points: pointsNum,
      notes: evalNotes || null,
      point_log_id: pointLogId,
    });

    if (error) {
      setToast({ open: true, message: 'Lỗi: ' + error.message, severity: 'error' });
    } else {
      setToast({ open: true, message: 'Đã lưu đánh giá lao động', severity: 'success' });
      resetEvalForm();
      refreshAll();
    }
    setSavingEval(false);
  };

  const statusColor = (status: DutyStatus) => (status === 'da_truc' ? 'success' : status === 'vang_truc' ? 'error' : 'default');

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>Lao động & Lịch trực</Typography>
        <Typography variant="body2" color="text.secondary">Ghi lịch trực nhật lớp/KTX và đánh giá kết quả lao động theo từng lượt trực</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* ---------- Lịch trực ---------- */}
        <Grid size={{ xs: 12, md: canManage ? 5 : 12 }}>
          {canManage && (
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                  <EventNoteIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>Thêm lịch trực</Typography>
                </Stack>
                <Stack spacing={2}>
                  <TextField
                    fullWidth size="small" type="date" label="Ngày trực"
                    value={dutyDate} onChange={(e) => setDutyDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <ToggleButtonGroup
                    exclusive fullWidth size="small" value={dutyArea}
                    onChange={(_, v) => v && setDutyArea(v)}
                  >
                    <ToggleButton value="lop_hoc">{DUTY_AREA_LABELS.lop_hoc}</ToggleButton>
                    <ToggleButton value="ktx">{DUTY_AREA_LABELS.ktx}</ToggleButton>
                  </ToggleButtonGroup>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tổ trực</InputLabel>
                    <Select value={dutyTeam} label="Tổ trực" onChange={(e) => setDutyTeam(e.target.value)}>
                      <MenuItem value="">Không chọn tổ</MenuItem>
                      {teams.map((t) => <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                  {dutyArea === 'ktx' && (
                    <FormControl fullWidth size="small">
                      <InputLabel>Phòng KTX</InputLabel>
                      <Select value={dutyRoom} label="Phòng KTX" onChange={(e) => setDutyRoom(e.target.value)}>
                        <MenuItem value="">Không chọn phòng</MenuItem>
                        {dormRooms.map((r) => <MenuItem key={r.id} value={String(r.id)}>{r.room_number}</MenuItem>)}
                      </Select>
                    </FormControl>
                  )}
                  <FormControl fullWidth size="small">
                    <InputLabel>Học sinh trực (tuỳ chọn)</InputLabel>
                    <Select
                      multiple
                      value={dutyStudentIds}
                      label="Học sinh trực (tuỳ chọn)"
                      onChange={(e) => setDutyStudentIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                      renderValue={(selected) => (selected as string[]).map((id) => students.find((s) => s.id === id)?.full_name).filter(Boolean).join(', ')}
                    >
                      {students.map((s) => (
                        <MenuItem key={s.id} value={s.id}>{s.full_name} ({s.student_code})</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary">
                    Nếu không chọn học sinh cụ thể, cả tổ (hoặc cả phòng KTX) đã chọn ở trên sẽ được tính là người trực lượt này.
                  </Typography>
                  <TextField
                    fullWidth size="small" label="Mô tả (tuỳ chọn)"
                    value={dutyDescription} onChange={(e) => setDutyDescription(e.target.value)}
                  />
                  <Button variant="contained" onClick={handleCreateSchedule} disabled={!dutyDate || savingSchedule}>
                    {savingSchedule ? 'Đang lưu...' : 'Thêm lịch trực'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: canManage ? 7 : 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Lịch trực gần đây</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Một ngày có thể có nhiều lượt trực (nhiều tổ/phòng) — mỗi dòng dưới đây là một lượt trực riêng.
              </Typography>
              <TableContainer sx={{ maxHeight: 420 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'background.default' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Ngày</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Khu vực</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Tổ / Phòng</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Học sinh trực</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Đã chấm</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                      {canManage && <TableCell sx={{ fontWeight: 600 }} align="right">Chấm</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {schedules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canManage ? 7 : 6} align="center" sx={{ py: 3, color: 'text.secondary' }}>Chưa có lịch trực</TableCell>
                      </TableRow>
                    ) : (
                      schedules.map((s) => {
                        const roster = getScheduleRoster(s);
                        const gradedCount = evalCounts[s.id] || 0;
                        return (
                          <TableRow key={s.id} hover selected={String(s.id) === selectedScheduleId}>
                            <TableCell><Typography variant="caption">{new Date(s.duty_date).toLocaleDateString('vi-VN')}</Typography></TableCell>
                            <TableCell>{DUTY_AREA_LABELS[s.area]}</TableCell>
                            <TableCell>{s.team?.name || s.dorm_room?.room_number || '-'}</TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {roster.length > 0 ? `${roster.map((m) => m.full_name).join(', ')}${rosterSource(s)}` : 'Chưa gán học sinh'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {roster.length > 0 ? (
                                <Chip
                                  size="small"
                                  label={`${gradedCount}/${roster.length}`}
                                  color={gradedCount === 0 ? 'default' : gradedCount >= roster.length ? 'success' : 'warning'}
                                  sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                                />
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {canManage ? (
                                <Select
                                  size="small"
                                  value={s.status}
                                  onChange={(e) => handleUpdateStatus(s, e.target.value as DutyStatus)}
                                  sx={{ height: 26, fontSize: '0.75rem' }}
                                >
                                  {(Object.keys(DUTY_STATUS_LABELS) as DutyStatus[]).map((st) => (
                                    <MenuItem key={st} value={st} sx={{ fontSize: '0.75rem' }}>{DUTY_STATUS_LABELS[st]}</MenuItem>
                                  ))}
                                </Select>
                              ) : (
                                <Chip size="small" label={DUTY_STATUS_LABELS[s.status]} color={statusColor(s.status)} sx={{ height: 22, fontSize: '0.7rem' }} />
                              )}
                            </TableCell>
                            {canManage && (
                              <TableCell align="right">
                                <Tooltip title="Chấm lao động cho lượt trực này">
                                  <span>
                                    <IconButton size="small" color="primary" disabled={roster.length === 0} onClick={() => openScheduleForEval(s)}>
                                      <EngineeringIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ---------- Đánh giá lao động ---------- */}
      {canManage && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <EngineeringIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>Đánh giá lao động</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Chấm điểm phải dựa trên lượt trực trong ngày để không nhầm lẫn khi nhiều học sinh hoặc phòng KTX cùng trực một ngày.
            </Typography>

            <ToggleButtonGroup
              exclusive size="small" value={evalMode}
              onChange={(_, v) => {
                if (!v) return;
                setEvalMode(v);
                if (v === 'manual') { setSelectedScheduleId(''); setEvalRows([]); }
              }}
              sx={{ mb: 3 }}
            >
              <ToggleButton value="schedule">
                <GroupsIcon fontSize="small" sx={{ mr: 1 }} /> Theo lượt trực
              </ToggleButton>
              <ToggleButton value="manual">Thủ công (không theo lượt trực)</ToggleButton>
            </ToggleButtonGroup>

            {evalMode === 'schedule' ? (
              <Stack spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Lượt trực cần chấm</InputLabel>
                  <Select
                    value={selectedScheduleId}
                    label="Lượt trực cần chấm"
                    onChange={(e) => handleScheduleSelectChange(e.target.value)}
                  >
                    <MenuItem value="">-- Chọn lượt trực --</MenuItem>
                    {schedules.map((s) => {
                      const rosterLen = getScheduleRoster(s).length;
                      return (
                        <MenuItem key={s.id} value={String(s.id)} disabled={rosterLen === 0}>
                          {scheduleLabel(s)} — {rosterLen > 0 ? `${rosterLen} HS` : 'chưa gán HS'}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                {selectedScheduleId && !loadingRoster && evalRows.length > 0 && (
                  <>
                    <Divider />
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                      <Box sx={{ minWidth: 220 }}>
                        <Typography variant="body2" fontWeight={500} gutterBottom>
                          Mức hoàn thành mặc định: <Chip size="small" label={bulkScore} color={bulkScore >= 7 ? 'success' : bulkScore >= 5 ? 'warning' : 'error'} sx={{ fontWeight: 700 }} />
                        </Typography>
                        <Slider value={bulkScore} onChange={(_, v) => setBulkScore(v as number)} min={1} max={10} marks valueLabelDisplay="auto" size="small" />
                      </Box>
                      <FormControlLabel
                        control={<Switch checked={bulkOnTime} onChange={(e) => setBulkOnTime(e.target.checked)} />}
                        label="Đúng giờ"
                      />
                      <TextField
                        size="small" type="number" label="Điểm thi đua +/-" sx={{ width: 160 }}
                        value={bulkPoints} onChange={(e) => setBulkPoints(e.target.value)}
                        helperText="Âm để trừ điểm"
                      />
                      <Button startIcon={<PlaylistAddCheckIcon />} variant="outlined" size="small" onClick={applyBulkToAll}>
                        Áp dụng cho tất cả
                      </Button>
                    </Stack>

                    <TableContainer sx={{ maxHeight: 420 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'background.default' }}>
                            <TableCell padding="checkbox"></TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Học sinh</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Vắng trực</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Mức hoàn thành</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Đúng giờ</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Điểm +/-</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Ghi chú</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {evalRows.map((row) => (
                            <TableRow key={row.studentId} hover>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  size="small" checked={row.included}
                                  onChange={(e) => updateRow(row.studentId, { included: e.target.checked })}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{row.fullName}</Typography>
                                <Typography variant="caption" color="text.secondary">{row.studentCode}</Typography>
                                {row.existingEvalId && (
                                  <Chip size="small" label="Đã chấm trước đó - sửa lại" variant="outlined" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                                )}
                              </TableCell>
                              <TableCell>
                                <Switch size="small" checked={row.absent} onChange={(e) => toggleAbsent(row.studentId, e.target.checked)} disabled={!row.included} />
                              </TableCell>
                              <TableCell sx={{ minWidth: 90 }}>
                                <TextField
                                  type="number" size="small" value={row.score} disabled={!row.included || row.absent}
                                  onChange={(e) => updateRow(row.studentId, { score: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })}
                                  inputProps={{ min: 1, max: 10, style: { width: 48 } }}
                                />
                              </TableCell>
                              <TableCell>
                                <Switch size="small" checked={row.onTime} disabled={!row.included || row.absent} onChange={(e) => updateRow(row.studentId, { onTime: e.target.checked })} />
                              </TableCell>
                              <TableCell sx={{ minWidth: 90 }}>
                                <TextField
                                  type="number" size="small" value={row.points} disabled={!row.included}
                                  onChange={(e) => updateRow(row.studentId, { points: e.target.value })}
                                  inputProps={{ style: { width: 56 } }}
                                />
                              </TableCell>
                              <TableCell sx={{ minWidth: 160 }}>
                                <TextField
                                  size="small" value={row.notes} disabled={!row.included}
                                  onChange={(e) => updateRow(row.studentId, { notes: e.target.value })}
                                  fullWidth placeholder="Ghi chú"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Button
                      variant="contained" onClick={handleSaveScheduleEvaluations}
                      disabled={savingEval || evalRows.filter((r) => r.included).length === 0}
                    >
                      {savingEval ? 'Đang lưu...' : `Lưu đánh giá cho lượt trực (${evalRows.filter((r) => r.included).length} học sinh)`}
                    </Button>
                  </>
                )}

                {selectedScheduleId && !loadingRoster && evalRows.length === 0 && (
                  <Alert severity="warning">Lượt trực này chưa có học sinh nào — hãy gán tổ, phòng KTX hoặc chọn học sinh cụ thể khi tạo lịch trực.</Alert>
                )}
              </Stack>
            ) : (
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Học sinh</InputLabel>
                    <Select value={evalStudent} label="Học sinh" onChange={(e) => setEvalStudent(e.target.value)}>
                      {students.map((s) => (
                        <MenuItem key={s.id} value={s.id}>{s.full_name} ({s.student_code})</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <TextField
                    fullWidth size="small" type="date" label="Ngày đánh giá"
                    value={evalDate} onChange={(e) => setEvalDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Typography variant="body2" fontWeight={500} gutterBottom>
                    Mức hoàn thành: <Chip size="small" label={evalScore} color={evalScore >= 7 ? 'success' : evalScore >= 5 ? 'warning' : 'error'} sx={{ fontWeight: 700 }} />
                  </Typography>
                  <Slider value={evalScore} onChange={(_, v) => setEvalScore(v as number)} min={1} max={10} marks valueLabelDisplay="auto" size="small" />
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <FormControlLabel
                    control={<Switch checked={evalOnTime} onChange={(e) => setEvalOnTime(e.target.checked)} />}
                    label="Đúng giờ"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <TextField
                    fullWidth size="small" type="number" label="Điểm thi đua +/-"
                    value={evalPoints} onChange={(e) => setEvalPoints(e.target.value)}
                    helperText="Âm để trừ điểm"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 8 }}>
                  <TextField
                    fullWidth size="small" label="Ghi chú (tuỳ chọn)"
                    value={evalNotes} onChange={(e) => setEvalNotes(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Button fullWidth variant="contained" onClick={handleCreateEvaluation} disabled={!evalStudent || savingEval}>
                    {savingEval ? 'Đang lưu...' : 'Lưu đánh giá'}
                  </Button>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Lịch sử đánh giá lao động</Typography>
          <TableContainer sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Ngày</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Lượt trực</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Học sinh</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Mức hoàn thành</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Đúng giờ</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Điểm</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Ghi chú</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {evaluations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>Chưa có đánh giá</TableCell>
                  </TableRow>
                ) : (
                  evaluations
                    .filter((ev) => canManage || ev.student_id === profile?.id)
                    .map((ev) => (
                      <TableRow key={ev.id} hover>
                        <TableCell><Typography variant="caption">{new Date(ev.evaluation_date).toLocaleDateString('vi-VN')}</Typography></TableCell>
                        <TableCell>
                          {ev.duty_schedule ? (
                            <Chip
                              size="small"
                              label={`${DUTY_AREA_LABELS[ev.duty_schedule.area]} - ${ev.duty_schedule.team?.name || ev.duty_schedule.dorm_room?.room_number || ''}`}
                              variant="outlined"
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          ) : (
                            <Chip size="small" label="Thủ công" color="default" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                          )}
                        </TableCell>
                        <TableCell>{ev.student?.full_name || '-'}</TableCell>
                        <TableCell>
                          <Chip size="small" label={ev.completion_score} color={ev.completion_score >= 7 ? 'success' : ev.completion_score >= 5 ? 'warning' : 'error'} sx={{ fontWeight: 700, height: 22 }} />
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={ev.on_time ? 'Đạt' : 'Không'} color={ev.on_time ? 'success' : 'error'} variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                        </TableCell>
                        <TableCell>
                          {ev.points !== 0 ? (
                            <Chip size="small" label={ev.points > 0 ? `+${ev.points}` : ev.points} color={ev.points > 0 ? 'success' : 'error'} sx={{ fontWeight: 700, height: 22, fontSize: '0.7rem' }} />
                          ) : '-'}
                        </TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{ev.notes || '-'}</Typography></TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
