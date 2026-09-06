import { useState, useEffect, useCallback } from 'react';
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
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import HomeIcon from '@mui/icons-material/Home';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import GavelIcon from '@mui/icons-material/Gavel';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import { useAuth } from '../lib/auth';
import {
  supabase,
  type ClassRequest,
  type RequestType,
  type RequestStatus,
  type RequestAttachment,
  REQUEST_TYPE_LABELS,
  REQUEST_STATUS_LABELS,
} from '../lib/supabase';

const todayStr = () => new Date().toISOString().slice(0, 10);
const REQUEST_TYPES = Object.keys(REQUEST_TYPE_LABELS) as RequestType[];

// Types where a date range (nghỉ từ ngày -> đến ngày) is meaningful.
const DATE_RANGE_TYPES: RequestType[] = ['ve_nha', 'nghi_hoc'];

// File uploads on a request: Word documents, PDFs, or images only.
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'];
const MAX_FILE_SIZE_MB = 15;
const MAX_FILES = 5;

// Visual identity per request type: a small icon + accent color, reused
// across the submit form and the status table.
const REQUEST_TYPE_META: Record<RequestType, { icon: typeof HomeIcon; color: string }> = {
  ve_nha: { icon: HomeIcon, color: '#0EA5E9' },
  nghi_hoc: { icon: EventBusyIcon, color: '#F59E0B' },
  de_xuat: { icon: LightbulbIcon, color: '#8B5CF6' },
  nghi_quyet: { icon: GavelIcon, color: '#1E3A5F' },
  khac: { icon: DriveFileRenameOutlineIcon, color: '#64748B' },
};

const STATUS_META: Record<RequestStatus, { color: 'success' | 'error' | 'warning'; icon: typeof CheckCircleIcon }> = {
  approved: { color: 'success', icon: CheckCircleIcon },
  rejected: { color: 'error', icon: CancelIcon },
  pending: { color: 'warning', icon: HourglassTopIcon },
};

function fileExt(name: string) {
  return (name.split('.').pop() || '').toLowerCase();
}

function isAllowedFile(file: File) {
  return ALLOWED_EXTENSIONS.includes(fileExt(file.name));
}

function AttachmentIcon({ fileType, fileName }: { fileType: string; fileName: string }) {
  const ext = fileExt(fileName);
  if (fileType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext)) {
    return <ImageIcon fontSize="inherit" />;
  }
  if (ext === 'pdf') return <PictureAsPdfIcon fontSize="inherit" />;
  return <DescriptionIcon fontSize="inherit" />;
}

function AttachmentList({ attachments }: { attachments?: RequestAttachment[] }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" rowGap={0.5} sx={{ mt: 0.5 }}>
      {attachments.map((a) => (
        <Chip
          key={a.id}
          size="small"
          variant="outlined"
          icon={<AttachmentIcon fileType={a.file_type} fileName={a.file_name} />}
          label={a.file_name}
          clickable
          component="a"
          href={a.file_url}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ height: 22, fontSize: '0.7rem', maxWidth: 220 }}
        />
      ))}
    </Stack>
  );
}

export default function RequestsPage() {
  const { profile } = useAuth();

  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // ---------- Submit form ----------
  const [type, setType] = useState<RequestType>('ve_nha');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // ---------- Lists ----------
  const [requests, setRequests] = useState<ClassRequest[]>([]);

  const loadRequests = useCallback(async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from('requests')
      .select('*, requester:profiles!requests_requester_id_fkey(*), reviewer:profiles!requests_reviewer_id_fkey(full_name), attachments:request_attachments(*)')
      .eq('requester_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error && data) setRequests(data as unknown as ClassRequest[]);
  }, [profile]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const resetForm = () => {
    setType('ve_nha');
    setTitle('');
    setContent('');
    setDateFrom(todayStr());
    setDateTo(todayStr());
    setFiles([]);
  };

  const handleFilesSelected = (selected: FileList | null) => {
    if (!selected) return;
    const incoming = Array.from(selected);
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const f of incoming) {
      if (!isAllowedFile(f)) {
        rejected.push(`${f.name} (không đúng định dạng)`);
      } else if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        rejected.push(`${f.name} (vượt quá ${MAX_FILE_SIZE_MB}MB)`);
      } else {
        accepted.push(f);
      }
    }
    setFiles((prev) => {
      const merged = [...prev, ...accepted].slice(0, MAX_FILES);
      return merged;
    });
    if (rejected.length > 0) {
      setToast({ open: true, message: 'Không thể thêm: ' + rejected.join(', '), severity: 'error' });
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!profile || !title.trim() || !content.trim()) return;
    setSubmitting(true);

    const { data: created, error } = await supabase
      .from('requests')
      .insert({
        requester_id: profile.id,
        request_type: type,
        title: title.trim(),
        content: content.trim(),
        date_from: DATE_RANGE_TYPES.includes(type) ? dateFrom : null,
        date_to: DATE_RANGE_TYPES.includes(type) ? dateTo : null,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !created) {
      setToast({ open: true, message: 'Lỗi: ' + (error?.message || 'Không thể gửi đơn'), severity: 'error' });
      setSubmitting(false);
      return;
    }

    let uploadErrorMsg = '';
    for (const file of files) {
      const ext = fileExt(file.name);
      const path = `${profile.id}/${created.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('request-attachments').upload(path, file);
      if (uploadError) {
        uploadErrorMsg = uploadError.message;
        continue;
      }
      const { data: urlData } = supabase.storage.from('request-attachments').getPublicUrl(path);
      await supabase.from('request_attachments').insert({
        request_id: created.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type || ext,
      });
    }

    if (uploadErrorMsg) {
      setToast({ open: true, message: 'Đã gửi đơn nhưng có tệp đính kèm lỗi: ' + uploadErrorMsg, severity: 'error' });
    } else {
      setToast({ open: true, message: 'Đã gửi đơn, vui lòng chờ giáo viên chủ nhiệm phê duyệt', severity: 'success' });
    }
    resetForm();
    loadRequests();
    setSubmitting(false);
  };

  const handleWithdraw = async (id: string) => {
    const { error } = await supabase.from('requests').delete().eq('id', id);
    if (error) {
      setToast({ open: true, message: 'Lỗi: ' + error.message, severity: 'error' });
    } else {
      setToast({ open: true, message: 'Đã thu hồi đơn', severity: 'success' });
      loadRequests();
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>Đơn từ & Đề xuất</Typography>
        <Typography variant="body2" color="text.secondary">
          Gửi đơn xin về nhà, xin nghỉ học, đề xuất hoặc nghị quyết lên giáo viên chủ nhiệm để phê duyệt. Việc duyệt đơn được thực hiện ở trang Ký hồ sơ.
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <AssignmentIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>Gửi đơn mới</Typography>
          </Stack>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Loại đơn</InputLabel>
                <Select value={type} label="Loại đơn" onChange={(e) => setType(e.target.value as RequestType)}>
                  {REQUEST_TYPES.map((t) => {
                    const TypeIcon = REQUEST_TYPE_META[t].icon;
                    return (
                      <MenuItem key={t} value={t}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TypeIcon sx={{ fontSize: 18, color: REQUEST_TYPE_META[t].color }} />
                          <span>{REQUEST_TYPE_LABELS[t]}</span>
                        </Stack>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 9 }}>
              <TextField
                fullWidth size="small" label="Tiêu đề"
                value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Xin về nhà cuối tuần / Đề xuất đổi lịch sinh hoạt lớp"
              />
            </Grid>

            {DATE_RANGE_TYPES.includes(type) && (
              <>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth size="small" type="date" label="Từ ngày"
                    value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth size="small" type="date" label="Đến ngày"
                    value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth multiline minRows={3} label="Nội dung / Lý do"
                value={content} onChange={(e) => setContent(e.target.value)}
                placeholder="Trình bày lý do, nội dung đề xuất hoặc nghị quyết..."
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" rowGap={1}>
                <Button
                  component="label" variant="outlined" size="small"
                  startIcon={<AttachFileIcon />}
                  disabled={files.length >= MAX_FILES}
                >
                  Đính kèm tệp (PDF, Word, ảnh)
                  <input
                    type="file" hidden multiple
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={(e) => { handleFilesSelected(e.target.files); e.target.value = ''; }}
                  />
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Tối đa {MAX_FILES} tệp, mỗi tệp không quá {MAX_FILE_SIZE_MB}MB
                </Typography>
              </Stack>
              {files.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1} sx={{ mt: 1 }}>
                  {files.map((f, i) => (
                    <Chip
                      key={`${f.name}-${i}`}
                      size="small"
                      icon={<AttachmentIcon fileType={f.type} fileName={f.name} />}
                      label={f.name}
                      onDelete={() => removeFile(i)}
                      sx={{ maxWidth: 240 }}
                    />
                  ))}
                </Stack>
              )}
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button
                variant="contained" onClick={handleSubmit}
                disabled={submitting || !title.trim() || !content.trim()}
              >
                {submitting ? 'Đang gửi...' : 'Gửi đơn'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" rowGap={1}>
            <Typography variant="h6" fontWeight={700}>Đơn của tôi</Typography>
            {requests.length > 0 && (
              <Chip size="small" label={`${requests.length} đơn`} sx={{ fontWeight: 600, height: 24 }} />
            )}
          </Stack>
          <TableContainer className="mobile-card-table" sx={{ maxHeight: { sm: 460 } }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Ngày gửi</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Loại đơn</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Tiêu đề</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Người duyệt</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      <AssignmentIcon sx={{ fontSize: 32, mb: 1, opacity: 0.4, display: 'block', mx: 'auto' }} />
                      Bạn chưa gửi đơn nào
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((r) => {
                    const typeMeta = REQUEST_TYPE_META[r.request_type];
                    const TypeIcon = typeMeta.icon;
                    const statusMeta = STATUS_META[r.status];
                    const StatusIcon = statusMeta.icon;
                    return (
                      <TableRow key={r.id} hover>
                        <TableCell data-label="Ngày gửi"><Typography variant="caption">{new Date(r.created_at).toLocaleDateString('vi-VN')}</Typography></TableCell>
                        <TableCell data-label="Loại đơn">
                          <Chip
                            size="small"
                            icon={<TypeIcon sx={{ fontSize: '14px !important', color: `${typeMeta.color} !important` }} />}
                            label={REQUEST_TYPE_LABELS[r.request_type]}
                            sx={{ height: 24, fontSize: '0.7rem', fontWeight: 600, borderRadius: 1.5, bgcolor: alpha(typeMeta.color, 0.12), color: typeMeta.color }}
                          />
                        </TableCell>
                        <TableCell data-label="Tiêu đề">
                          <Typography variant="body2" fontWeight={500}>{r.title}</Typography>
                          {r.review_note && (
                            <Typography variant="caption" color="text.secondary">Ghi chú: {r.review_note}</Typography>
                          )}
                          <AttachmentList attachments={r.attachments} />
                        </TableCell>
                        <TableCell data-label="Trạng thái">
                          <Chip
                            size="small"
                            icon={<StatusIcon sx={{ fontSize: '14px !important' }} />}
                            label={REQUEST_STATUS_LABELS[r.status]}
                            color={statusMeta.color}
                            sx={{ height: 24, fontSize: '0.7rem', fontWeight: 700, borderRadius: 1.5 }}
                          />
                        </TableCell>
                        <TableCell data-label="Người duyệt">{r.reviewer?.full_name || '-'}</TableCell>
                        <TableCell align="right" data-label="Thao tác">
                          {r.status === 'pending' && r.requester_id === profile?.id && (
                            <Tooltip title="Thu hồi đơn">
                              <IconButton size="small" color="error" onClick={() => handleWithdraw(r.id)}>
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
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
