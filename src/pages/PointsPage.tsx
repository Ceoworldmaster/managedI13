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
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import DeleteIcon from '@mui/icons-material/Delete';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useAuth, isStudentRole } from '../lib/auth';
import { supabase, type Profile, type Rule, type PointLog, type AcademicWeek } from '../lib/supabase';

export default function PointsPage() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Profile[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [, setWeeks] = useState<AcademicWeek[]>([]);
  const [currentWeek, setCurrentWeek] = useState<AcademicWeek | null>(null);
  const [pointLogs, setPointLogs] = useState<PointLog[]>([]);

  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedRule, setSelectedRule] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const loadRefData = useCallback(async () => {
    const [studentsRes, rulesRes, weeksRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('rules').select('*').eq('is_active', true).order('title'),
      supabase.from('academic_weeks').select('*').order('week_number'),
    ]);

    if (studentsRes.data) setStudents((studentsRes.data as Profile[]).filter(isStudentRole));
    if (rulesRes.data) setRules(rulesRes.data as Rule[]);
    if (weeksRes.data) {
      const list = weeksRes.data as AcademicWeek[];
      setWeeks(list);
      const open = list.find((w) => !w.is_closed);
      setCurrentWeek(open || list[0] || null);
    }
  }, []);

  const loadPointLogs = useCallback(async () => {
    if (!currentWeek) return;
    const { data } = await supabase
      .from('point_logs')
      .select('*, student:profiles!point_logs_student_id_fkey(*), recorder:profiles!point_logs_recorder_id_fkey(full_name), rule:rules(*)')
      .eq('week_id', currentWeek.id)
      .order('created_at', { ascending: false });
    if (data) setPointLogs(data as unknown as PointLog[]);
  }, [currentWeek]);

  useEffect(() => { loadRefData(); }, [loadRefData]);
  useEffect(() => { loadPointLogs(); }, [loadPointLogs]);

  const handleQuickLog = async () => {
    if (!selectedStudent || !selectedRule || !currentWeek || !profile) return;
    const rule = rules.find((r) => r.id === Number(selectedRule));
    if (!rule) return;

    setSubmitting(true);
    const { error } = await supabase.from('point_logs').insert({
      student_id: selectedStudent,
      recorder_id: profile.id,
      week_id: currentWeek.id,
      rule_id: rule.id,
      points: rule.points,
      type: rule.type,
      category: rule.category,
      reason: reason || rule.title,
      status: 'approved',
    });

    if (error) {
      setToast({ open: true, message: 'Lỗi: ' + error.message, severity: 'error' });
    } else {
      const sign = rule.type === 'tru' ? '-' : '+';
      setToast({ open: true, message: `Đã ghi ${sign}${rule.points} điểm cho ${students.find((s) => s.id === selectedStudent)?.full_name}`, severity: 'success' });
      setSelectedStudent('');
      setSelectedRule('');
      setReason('');
      loadPointLogs();
    }
    setSubmitting(false);
  };

  const handleDeleteLog = async (logId: string) => {
    const { error } = await supabase.from('point_logs').delete().eq('id', logId);
    if (error) {
      setToast({ open: true, message: 'Lỗi: ' + error.message, severity: 'error' });
    } else {
      setToast({ open: true, message: 'Đã xóa lượt ghi điểm', severity: 'success' });
      loadPointLogs();
    }
  };

  const violationRules = rules.filter((r) => r.type === 'tru');
  const meritRules = rules.filter((r) => r.type === 'cong');

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>Nhập lỗi &amp; Điểm cộng</Typography>
        <Typography variant="body2" color="text.secondary">
          {currentWeek ? `Tuần ${currentWeek.week_number} (${currentWeek.start_date} - ${currentWeek.end_date})` : 'Chưa có tuần học'}
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
            <EditNoteIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>Ghi điểm nhanh</Typography>
          </Stack>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Học sinh</InputLabel>
                <Select value={selectedStudent} label="Học sinh" onChange={(e) => setSelectedStudent(e.target.value)}>
                  {students.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.full_name} ({s.student_code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Quy định</InputLabel>
                <Select value={selectedRule} label="Quy định" onChange={(e) => setSelectedRule(e.target.value)}>
                  <MenuItem disabled sx={{ fontWeight: 700, fontSize: '0.75rem', opacity: 1 }}>— Lỗi (trừ điểm) —</MenuItem>
                  {violationRules.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={`-${r.points}`} color="error" sx={{ height: 20, fontSize: '0.7rem' }} />
                        <Typography variant="body2">{r.title}</Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                  <MenuItem disabled sx={{ fontWeight: 700, fontSize: '0.75rem', opacity: 1 }}>— Điểm cộng —</MenuItem>
                  {meritRules.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={`+${r.points}`} color="success" sx={{ height: 20, fontSize: '0.7rem' }} />
                        <Typography variant="body2">{r.title}</Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Ghi chú (tùy chọn)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                variant="contained"
                fullWidth
                onClick={handleQuickLog}
                disabled={!selectedStudent || !selectedRule || submitting}
              >
                {submitting ? 'Đang lưu...' : 'Lưu điểm'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Lịch sử ghi điểm (tuần này)
          </Typography>
          <TableContainer sx={{ maxHeight: 500 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Học sinh</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Điểm</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Lý do</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Người ghi</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pointLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      Chưa có lượt ghi điểm
                    </TableCell>
                  </TableRow>
                ) : (
                  pointLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>{log.student?.full_name || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={log.type === 'tru' ? `-${log.points}` : `+${log.points}`}
                          color={log.type === 'tru' ? 'error' : 'success'}
                          sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{log.reason}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{log.recorder?.full_name || '-'}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleDeleteLog(log.id)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
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
