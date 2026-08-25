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
import HotelIcon from '@mui/icons-material/Hotel';
import { useAuth } from '../lib/auth';
import { supabase, type DormRoom, type DormInspection } from '../lib/supabase';

export default function DormPage() {
  const { profile } = useAuth();
  const [rooms, setRooms] = useState<DormRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [score, setScore] = useState(8);
  const [selfStudy, setSelfStudy] = useState(true);
  const [curfew, setCurfew] = useState(true);
  const [notes, setNotes] = useState('');
  const [inspections, setInspections] = useState<DormInspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('dorm_rooms').select('*').order('room_number');
      if (data) {
        setRooms(data as DormRoom[]);
        setSelectedRoom(String((data[0] as DormRoom)?.id || ''));
      }
    })();
  }, []);

  const loadInspections = useCallback(async () => {
    const { data } = await supabase
      .from('dorm_inspections')
      .select('*, dorm_room:dorm_rooms(*), inspector:profiles!dorm_inspections_inspector_id_fkey(full_name)')
      .order('inspection_date', { ascending: false })
      .limit(30);
    if (data) setInspections(data as unknown as DormInspection[]);
  }, []);

  useEffect(() => { loadInspections(); }, [loadInspections]);

  const handleSubmit = async () => {
    if (!selectedRoom || !profile) return;
    setLoading(true);
    const { error } = await supabase.from('dorm_inspections').insert({
      dorm_room_id: Number(selectedRoom),
      inspector_id: profile.id,
      cleanliness_score: score,
      self_study_status: selfStudy,
      curfew_status: curfew,
      notes: notes || null,
    });
    if (error) {
      setToast({ open: true, message: 'Lỗi: ' + error.message, severity: 'error' });
    } else {
      setToast({ open: true, message: 'Đã chấm điểm KTX thành công!', severity: 'success' });
      setNotes('');
      setScore(8);
      setSelfStudy(true);
      setCurfew(true);
      loadInspections();
    }
    setLoading(false);
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>Chấm vệ sinh KTX</Typography>
        <Typography variant="body2" color="text.secondary">Đánh giá vệ sinh phòng, giờ tự học và giờ ngủ</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                <HotelIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>Form chấm điểm</Typography>
              </Stack>

              <Stack spacing={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Phòng KTX</InputLabel>
                  <Select value={selectedRoom} label="Phòng KTX" onChange={(e) => setSelectedRoom(e.target.value)}>
                    {rooms.map((r) => (
                      <MenuItem key={r.id} value={String(r.id)}>
                        {r.room_number} - {r.building}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box>
                  <Typography variant="body2" fontWeight={500} gutterBottom>
                    Điểm vệ sinh: <Chip size="small" label={score} color={score >= 7 ? 'success' : score >= 5 ? 'warning' : 'error'} sx={{ fontWeight: 700 }} />
                  </Typography>
                  <Slider
                    value={score}
                    onChange={(_, v) => setScore(v as number)}
                    min={1}
                    max={10}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>

                <Box>
                  <FormControlLabel
                    control={<Switch checked={selfStudy} onChange={(e) => setSelfStudy(e.target.checked)} />}
                    label="Tự học đúng giờ"
                  />
                  <FormControlLabel
                    control={<Switch checked={curfew} onChange={(e) => setCurfew(e.target.checked)} />}
                    label="Ngủ đúng quy định"
                  />
                </Box>

                <TextField
                  fullWidth
                  size="small"
                  label="Ghi chú (tùy chọn)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  multiline
                  rows={2}
                />

                <Button variant="contained" onClick={handleSubmit} disabled={!selectedRoom || loading}>
                  {loading ? 'Đang lưu...' : 'Lưu chấm điểm'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Lịch sử chấm điểm</Typography>
              <TableContainer sx={{ maxHeight: 500 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'background.default' }}>
                      <TableCell sx={{ fontWeight: 600}}>Phòng</TableCell>
                      <TableCell sx={{ fontWeight: 600}}>Ngày</TableCell>
                      <TableCell sx={{ fontWeight: 600}}>Vệ sinh</TableCell>
                      <TableCell sx={{ fontWeight: 600}}>Tự học</TableCell>
                      <TableCell sx={{ fontWeight: 600}}>Giờ ngủ</TableCell>
                      <TableCell sx={{ fontWeight: 600}}>Ghi chú</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inspections.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          Chưa có chấm điểm
                        </TableCell>
                      </TableRow>
                    ) : (
                      inspections.map((insp) => (
                        <TableRow key={insp.id} hover>
                          <TableCell>{insp.dorm_room?.room_number || '-'}</TableCell>
                          <TableCell>
                            <Typography variant="caption">{new Date(insp.inspection_date).toLocaleDateString('vi-VN')}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={insp.cleanliness_score}
                              color={insp.cleanliness_score >= 7 ? 'success' : insp.cleanliness_score >= 5 ? 'warning' : 'error'}
                              sx={{ fontWeight: 700, height: 22, fontSize: '0.75rem' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={insp.self_study_status ? 'Đạt' : 'Không'}
                              color={insp.self_study_status ? 'success' : 'error'}
                              variant="outlined"
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={insp.curfew_status ? 'Đạt' : 'Không'}
                              color={insp.curfew_status ? 'success' : 'error'}
                              variant="outlined"
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">{insp.notes || '-'}</Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
