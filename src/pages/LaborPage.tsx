import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
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
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Slider from '@mui/material/Slider';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import EngineeringIcon from '@mui/icons-material/Engineering';
import { useAuth, canRecordPoints, isStudentRole } from '../lib/auth';
import { supabase, type Profile, type LaborEvaluation } from '../lib/supabase';

const todayStr = () => new Date().toISOString().slice(0, 10);

/** Creates/updates/removes the matching competition-point log for one evaluation. */
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

export default function LaborPage() {
  const { profile } = useAuth();
  const canManage = canRecordPoints(profile);

  const [students, setStudents] = useState<Profile[]>([]);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const [evaluations, setEvaluations] = useState<LaborEvaluation[]>([]);

  const [evalStudent, setEvalStudent] = useState('');
  const [evalDate, setEvalDate] = useState(todayStr());
  const [evalScore, setEvalScore] = useState(8);
  const [evalOnTime, setEvalOnTime] = useState(true);
  const [evalPoints, setEvalPoints] = useState('0');
  const [evalNotes, setEvalNotes] = useState('');
  const [savingEval, setSavingEval] = useState(false);

  const loadStudents = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    if (data) setStudents((data as Profile[]).filter(isStudentRole));
  }, []);

  const loadEvaluations = useCallback(async () => {
    const { data } = await supabase
      .from('labor_evaluations')
      .select('*, student:profiles!labor_evaluations_student_id_fkey(*), evaluator:profiles!labor_evaluations_evaluator_id_fkey(full_name)')
      .order('evaluation_date', { ascending: false })
      .limit(30);
    if (data) setEvaluations(data as unknown as LaborEvaluation[]);
  }, []);

  useEffect(() => { loadStudents(); }, [loadStudents]);
  useEffect(() => { loadEvaluations(); }, [loadEvaluations]);

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
      loadEvaluations();
    }
    setSavingEval(false);
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>Đánh giá Lao động</Typography>
        <Typography variant="body2" color="text.secondary">Chấm điểm hoàn thành công việc lao động cho từng học sinh</Typography>
      </Box>

      {canManage && (
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <EngineeringIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>Thêm đánh giá</Typography>
            </Stack>

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
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Lịch sử đánh giá lao động</Typography>
          <TableContainer className="mobile-card-table" sx={{ maxHeight: { sm: 420 } }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Ngày</TableCell>
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
                    <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>Chưa có đánh giá</TableCell>
                  </TableRow>
                ) : (
                  evaluations
                    .filter((ev) => canManage || ev.student_id === profile?.id)
                    .map((ev) => (
                      <TableRow key={ev.id} hover>
                        <TableCell data-label="Ngày"><Typography variant="caption">{new Date(ev.evaluation_date).toLocaleDateString('vi-VN')}</Typography></TableCell>
                        <TableCell data-label="Học sinh">{ev.student?.full_name || '-'}</TableCell>
                        <TableCell data-label="Mức hoàn thành">
                          <Chip size="small" label={ev.completion_score} color={ev.completion_score >= 7 ? 'success' : ev.completion_score >= 5 ? 'warning' : 'error'} sx={{ fontWeight: 700, height: 22 }} />
                        </TableCell>
                        <TableCell data-label="Đúng giờ">
                          <Chip size="small" label={ev.on_time ? 'Đạt' : 'Không'} color={ev.on_time ? 'success' : 'error'} variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                        </TableCell>
                        <TableCell data-label="Điểm">
                          {ev.points !== 0 ? (
                            <Chip size="small" label={ev.points > 0 ? `+${ev.points}` : ev.points} color={ev.points > 0 ? 'success' : 'error'} sx={{ fontWeight: 700, height: 22, fontSize: '0.7rem' }} />
                          ) : '-'}
                        </TableCell>
                        <TableCell data-label="Ghi chú"><Typography variant="caption" color="text.secondary">{ev.notes || '-'}</Typography></TableCell>
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
