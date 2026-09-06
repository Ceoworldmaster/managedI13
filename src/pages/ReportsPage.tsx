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
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import { useAuth, canSubmitReports, hasRole } from '../lib/auth';
import { supabase, type AcademicWeek, type WeeklyReport, type ReportType, type Profile, REPORT_TYPE_LABELS } from '../lib/supabase';
import WeekSelector from '../components/WeekSelector';

const REPORT_TYPES: ReportType[] = ['hoc_tap', 'ne_nep', 'lao_dong', 'ktx_phong', 'to_truong'];

export default function ReportsPage() {
  const { profile } = useAuth();
  const isGvcn = hasRole(profile, 'gvcn');
  const [weeks, setWeeks] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedWeekIdForSelector, setSelectedWeekIdForSelector] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<ReportType>('hoc_tap');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    (async () => {
      const { data: weeksData } = await supabase.from('academic_weeks').select('*').order('week_number');
      if (weeksData) {
        const weekList = weeksData as AcademicWeek[];
        setWeeks(weekList);
        const open = weekList.find((w) => !w.is_closed);
        const initial = open || weekList[0];
        setSelectedWeek(String(initial?.id || ''));
        setSelectedWeekIdForSelector(initial?.id ?? null);
      }
      if (isGvcn) {
        const { data: profilesData } = await supabase.from('profiles').select('*').order('full_name');
        if (profilesData) setAllProfiles(profilesData as Profile[]);
      }
    })();
  }, [isGvcn]);

  const loadReports = useCallback(async () => {
    if (!profile) return;
    let query = supabase
      .from('weekly_reports')
      .select('*, reporter:profiles!weekly_reports_reporter_id_fkey(full_name, student_code, role), week:academic_weeks(*)')
      .order('submitted_at', { ascending: false });
    if (!isGvcn) {
      query = query.eq('reporter_id', profile.id);
    }
    const { data } = await query;
    if (data) setReports(data as unknown as WeeklyReport[]);
  }, [profile, isGvcn]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleSubmit = async () => {
    if (!file || !selectedWeek || !profile) return;
    setLoading(true);

    const weekId = Number(selectedWeek);
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile.id}/${selectedWeek}/${selectedType}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('excel-reports')
      .upload(fileName, file);

    if (uploadError) {
      setToast({ open: true, message: 'Lỗi upload: ' + uploadError.message, severity: 'error' });
      setLoading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('excel-reports').getPublicUrl(fileName);

    const { error } = await supabase.from('weekly_reports').insert({
      reporter_id: profile.id,
      week_id: weekId,
      report_type: selectedType,
      file_name: file.name,
      file_url: urlData.publicUrl,
      notes: notes || null,
      status: 'submitted',
    });

    if (error) {
      setToast({ open: true, message: 'Lỗi: ' + error.message, severity: 'error' });
    } else {
      setToast({ open: true, message: 'Nộp báo cáo thành công!', severity: 'success' });
      setFile(null);
      setNotes('');
      loadReports();
    }
    setLoading(false);
  };

  const handleReview = async (reportId: string) => {
    const { error } = await supabase.from('weekly_reports').update({ status: 'reviewed' }).eq('id', reportId);
    if (error) {
      setToast({ open: true, message: 'Lỗi: ' + error.message, severity: 'error' });
    } else {
      setToast({ open: true, message: 'Đã đánh dấu đã duyệt', severity: 'success' });
      loadReports();
    }
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  // GVCN view: progress overview table
  if (isGvcn) {
    const reporters = allProfiles.filter((p) => canSubmitReports(p));
    const weekId = Number(selectedWeek);

    return (
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Báo cáo Excel hàng tuần</Typography>
          <Typography variant="body2" color="text.secondary">Tổng hợp tiến độ nộp báo cáo của ban cán sự</Typography>
        </Box>

        {weeks.length > 0 && selectedWeekIdForSelector && (
          <WeekSelector
            weeks={weeks}
            selectedWeekId={selectedWeekIdForSelector}
            onChange={(id) => { setSelectedWeekIdForSelector(id); setSelectedWeek(String(id)); }}
          />
        )}

        <Card>
          <CardContent>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 640 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'background.default' }}>
                    <TableCell sx={{ fontWeight: 600}}>Cán sự</TableCell>
                    <TableCell sx={{ fontWeight: 600}}>Vai trò</TableCell>
                    {REPORT_TYPES.map((rt) => (
                      <TableCell key={rt} sx={{ fontWeight: 600}}>{REPORT_TYPE_LABELS[rt]}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reporters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        Chưa có cán sự
                      </TableCell>
                    </TableRow>
                  ) : (
                    reporters.map((r) => {
                      const roleLabels: Record<string, string> = {
                        lop_truong: 'Lớp trưởng', lop_pho_hoc_tap: 'LP Học tập',
                        lop_pho_ne_nep: 'LP Nề nếp', lop_pho_van_nghe: 'LP Văn nghệ', lop_pho_lao_dong: 'LP Lao động',
                        truong_phong_ktx: 'Trưởng KTX', to_truong: 'Tổ trưởng',
                      };
                      return (
                        <TableRow key={r.id} hover>
                          <TableCell>{r.full_name}</TableCell>
                          <TableCell>
                            <Typography variant="caption">{roleLabels[r.role] || r.role}</Typography>
                          </TableCell>
                          {REPORT_TYPES.map((rt) => {
                            const report = reports.find((rep) =>
                              rep.reporter_id === r.id && rep.week_id === weekId && rep.report_type === rt
                            );
                            return (
                              <TableCell key={rt}>
                                {report ? (
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip
                                      size="small"
                                      label={report.status === 'reviewed' ? 'Đã duyệt' : 'Đã nộp'}
                                      color={report.status === 'reviewed' ? 'success' : 'info'}
                                      sx={{ height: 22, fontSize: '0.7rem' }}
                                    />
                                    <IconButton size="small" onClick={() => handleDownload(report.file_url)}>
                                      <DownloadIcon fontSize="small" />
                                    </IconButton>
                                    {report.status !== 'reviewed' && (
                                      <IconButton size="small" onClick={() => handleReview(report.id)} color="success">
                                        <CheckCircleIcon fontSize="small" />
                                      </IconButton>
                                    )}
                                  </Stack>
                                ) : (
                                  <Chip size="small" label="Chưa nộp" color="default" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })
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

  // Cán sự view: submit form + own reports list
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>Nộp báo cáo Excel</Typography>
        <Typography variant="body2" color="text.secondary">Tải lên file báo cáo hàng tuần (.xlsx, .xls)</Typography>
      </Box>

      {weeks.length > 0 && selectedWeekIdForSelector && (
        <WeekSelector
          weeks={weeks}
          selectedWeekId={selectedWeekIdForSelector}
          onChange={(id) => { setSelectedWeekIdForSelector(id); setSelectedWeek(String(id)); }}
        />
      )}

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Tuần học</InputLabel>
                <Select value={selectedWeek} label="Tuần học" onChange={(e) => setSelectedWeek(e.target.value)}>
                  {weeks.map((w) => (
                    <MenuItem key={w.id} value={String(w.id)}>Tuần {w.week_number}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Loại báo cáo</InputLabel>
                <Select value={selectedType} label="Loại báo cáo" onChange={(e) => setSelectedType(e.target.value as ReportType)}>
                  {REPORT_TYPES.map((rt) => (
                    <MenuItem key={rt} value={rt}>{REPORT_TYPE_LABELS[rt]}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Button variant="outlined" component="label" fullWidth startIcon={<UploadFileIcon />} size="medium">
                {file ? file.name : 'Chọn file Excel'}
                <input type="file" hidden accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </Button>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Button variant="contained" fullWidth onClick={handleSubmit} disabled={!file || !selectedWeek || loading}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}>
                {loading ? 'Đang nộp...' : 'Nộp báo cáo'}
              </Button>
            </Grid>
          </Grid>
          <TextField
            fullWidth
            size="small"
            label="Ghi chú (tùy chọn)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Báo cáo đã nộp</Typography>
          <TableContainer className="mobile-card-table">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell sx={{ fontWeight: 600}}>Tuần</TableCell>
                  <TableCell sx={{ fontWeight: 600}}>Loại</TableCell>
                  <TableCell sx={{ fontWeight: 600}}>File</TableCell>
                  <TableCell sx={{ fontWeight: 600}}>Trạng thái</TableCell>
                  <TableCell sx={{ fontWeight: 600}}>Ngày nộp</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      Chưa nộp báo cáo nào
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell data-label="Tuần">{r.week?.week_number ? `Tuần ${r.week.week_number}` : '-'}</TableCell>
                      <TableCell data-label="Loại">{REPORT_TYPE_LABELS[r.report_type]}</TableCell>
                      <TableCell data-label="File">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <DescriptionIcon fontSize="small" color="action" />
                          <Typography variant="caption">{r.file_name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell data-label="Trạng thái">
                        <Chip
                          size="small"
                          label={r.status === 'reviewed' ? 'Đã duyệt' : 'Đã nộp'}
                          color={r.status === 'reviewed' ? 'success' : 'info'}
                          sx={{ height: 22, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell data-label="Ngày nộp">
                        <Typography variant="caption">{new Date(r.submitted_at).toLocaleDateString('vi-VN')}</Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleDownload(r.file_url)}>
                          <DownloadIcon fontSize="small" />
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
