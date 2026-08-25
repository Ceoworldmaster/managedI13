import { useState, useEffect, useCallback, type ReactNode } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { supabase, type Profile, type PointLog, CATEGORY_LABELS } from '../lib/supabase';

interface StudentDetailDialogProps {
  student: Profile | null;
  onClose: () => void;
}

function LogSection({
  title,
  icon,
  items,
  color,
  emptyText,
  sign,
}: {
  title: string;
  icon: ReactNode;
  items: PointLog[];
  color: 'error' | 'success';
  emptyText: string;
  sign: '+' | '-';
}) {
  const total = items.reduce((sum, l) => sum + Math.abs(l.points), 0);

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        {icon}
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
        <Chip size="small" label={`${items.length} lượt`} color={color} variant="outlined" sx={{ fontWeight: 600 }} />
        {total > 0 && (
          <Chip size="small" label={`${sign}${total} điểm`} color={color} sx={{ fontWeight: 700 }} />
        )}
      </Stack>
      <TableContainer sx={{ maxHeight: 260, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              <TableCell sx={{ fontWeight: 600 }}>Ngày</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Nội dung</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Danh mục</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Điểm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 2.5, color: 'text.secondary' }}>
                  <Typography variant="caption">{emptyText}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((l) => (
                <TableRow key={l.id} hover>
                  <TableCell>
                    <Typography variant="caption">{new Date(l.created_at).toLocaleDateString('vi-VN')}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{l.reason}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {CATEGORY_LABELS[l.category]}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      size="small"
                      label={`${sign}${l.points}`}
                      color={color}
                      sx={{ fontWeight: 700, height: 22, fontSize: '0.7rem' }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default function StudentDetailDialog({ student, onClose }: StudentDetailDialogProps) {
  const [logs, setLogs] = useState<PointLog[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = useCallback(async (studentId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('point_logs')
      .select('*, rule:rules(*)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    setLogs((data as unknown as PointLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (student) {
      loadLogs(student.id);
    } else {
      setLogs([]);
    }
  }, [student, loadLogs]);

  const violations = logs.filter((l) => l.type === 'tru');
  const merits = logs.filter((l) => l.type === 'cong');
  const violationTotal = violations.reduce((sum, l) => sum + Math.abs(l.points), 0);
  const meritTotal = merits.reduce((sum, l) => sum + l.points, 0);
  const netScore = 100 + meritTotal - violationTotal;

  return (
    <Dialog open={!!student} onClose={onClose} maxWidth="sm" fullWidth>
      {student && (
        <>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {student.full_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Mã HS: {student.student_code}
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <Stack spacing={3}>
                <Chip
                  label={`Điểm thi đua hiện tại: ${netScore}`}
                  color={netScore >= 100 ? 'success' : netScore >= 85 ? 'warning' : 'error'}
                  sx={{ fontWeight: 700, alignSelf: 'flex-start' }}
                />

                <LogSection
                  title="Lỗi vi phạm"
                  icon={<ReportProblemIcon color="error" fontSize="small" />}
                  items={violations}
                  color="error"
                  emptyText="Chưa có lỗi vi phạm nào"
                  sign="-"
                />

                <Divider />

                <LogSection
                  title="Điểm cộng"
                  icon={<ThumbUpAltIcon color="success" fontSize="small" />}
                  items={merits}
                  color="success"
                  emptyText="Chưa có điểm cộng nào"
                  sign="+"
                />
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose}>Đóng</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
