import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import { alpha } from '@mui/material/styles';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import InboxIcon from '@mui/icons-material/Inbox';
import EventRangeIcon from '@mui/icons-material/DateRange';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HomeIcon from '@mui/icons-material/Home';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import GavelIcon from '@mui/icons-material/Gavel';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import { useAuth, hasRole } from '../lib/auth';
import {
  supabase,
  type DocumentSignature,
  type Profile,
  type ClassRequest,
  type RequestAttachment,
  type RequestType,
  REQUEST_TYPE_LABELS,
} from '../lib/supabase';

const NOI_QUY_DOC_URL = 'https://docs.google.com/document/d/example/export?format=pdf';

// Visual identity per request type: a small icon + accent color, used on
// avatars, chips, and the card's accent border in the approval queue.
const REQUEST_TYPE_META: Record<RequestType, { icon: typeof HomeIcon; color: string }> = {
  ve_nha: { icon: HomeIcon, color: '#0EA5E9' },
  nghi_hoc: { icon: EventBusyIcon, color: '#F59E0B' },
  de_xuat: { icon: LightbulbIcon, color: '#8B5CF6' },
  nghi_quyet: { icon: GavelIcon, color: '#1E3A5F' },
  khac: { icon: DriveFileRenameOutlineIcon, color: '#64748B' },
};

function fileExt(name: string) {
  return (name.split('.').pop() || '').toLowerCase();
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
    <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75} sx={{ mt: 1 }}>
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
          sx={{ height: 24, fontSize: '0.72rem', maxWidth: 240, borderRadius: 1.5 }}
        />
      ))}
    </Stack>
  );
}

export default function SignaturesPage() {
  const { profile } = useAuth();
  const isGvcn = hasRole(profile, 'gvcn');
  const isStudent = hasRole(profile, 'hoc_sinh');
  const [signatures, setSignatures] = useState<DocumentSignature[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // ---------- Đơn chờ duyệt (chỉ GVCN) ----------
  const [pendingRequests, setPendingRequests] = useState<ClassRequest[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const loadPendingRequests = useCallback(async () => {
    if (!isGvcn) return;
    const { data, error } = await supabase
      .from('requests')
      .select('*, requester:profiles!requests_requester_id_fkey(*), attachments:request_attachments(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (!error && data) setPendingRequests(data as unknown as ClassRequest[]);
  }, [isGvcn]);

  const handleReviewRequest = async (id: string, status: 'approved' | 'rejected') => {
    if (!profile) return;
    setReviewingId(id);
    const { error } = await supabase
      .from('requests')
      .update({
        status,
        reviewer_id: profile.id,
        review_note: reviewNotes[id]?.trim() || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      setToast({ open: true, message: 'Lỗi: ' + error.message, severity: 'error' });
    } else {
      setToast({ open: true, message: status === 'approved' ? 'Đã duyệt đơn' : 'Đã từ chối đơn', severity: 'success' });
      loadPendingRequests();
    }
    setReviewingId(null);
  };

  const loadSignatures = useCallback(async () => {
    if (!profile) return;
    let query = supabase
      .from('document_signatures')
      .select('*, student:profiles!document_signatures_student_id_fkey(full_name, student_code)')
      .order('created_at', { ascending: false });
    if (!isGvcn) {
      query = query.eq('student_id', profile.id);
    }
    const { data } = await query;
    if (data) setSignatures(data as unknown as DocumentSignature[]);
  }, [profile, isGvcn]);

  useEffect(() => {
    loadSignatures();
    if (isGvcn) {
      supabase.from('profiles').select('*').eq('role', 'hoc_sinh').order('full_name').then(({ data }) => {
        if (data) setAllProfiles(data as Profile[]);
      });
      loadPendingRequests();
    }
  }, [loadSignatures, isGvcn, loadPendingRequests]);

  const handleUploadSigned = async () => {
    if (!file || !profile) return;
    setLoading(true);

    const fileName = `${profile.id}/signed_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('signed-documents')
      .upload(fileName, file);

    if (uploadError) {
      setToast({ open: true, message: 'Lỗi upload: ' + uploadError.message, severity: 'error' });
      setLoading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('signed-documents').getPublicUrl(fileName);

    // Check if a record already exists for this student
    const existing = signatures.find((s) => s.student_id === profile.id);

    if (existing) {
      const { error } = await supabase.from('document_signatures').update({
        signed_pdf_url: urlData.publicUrl,
        is_signed_by_student: true,
        signed_at: new Date().toISOString(),
      }).eq('id', existing.id);

      if (error) {
        setToast({ open: true, message: 'Lỗi: ' + error.message, severity: 'error' });
      } else {
        setToast({ open: true, message: 'Đã tải lên bản ký số thành công!', severity: 'success' });
        setFile(null);
        loadSignatures();
      }
    } else {
      const { error } = await supabase.from('document_signatures').insert({
        student_id: profile.id,
        document_name: 'Nội quy & Mục tiêu Lớp 11I',
        file_url: NOI_QUY_DOC_URL,
        signed_pdf_url: urlData.publicUrl,
        is_signed_by_student: true,
        signed_at: new Date().toISOString(),
      });

      if (error) {
        setToast({ open: true, message: 'Lỗi: ' + error.message, severity: 'error' });
      } else {
        setToast({ open: true, message: 'Đã tải lên bản ký số thành công!', severity: 'success' });
        setFile(null);
        loadSignatures();
      }
    }
    setLoading(false);
  };

  const handleApprove = async (sigId: string) => {
    const { error } = await supabase.from('document_signatures').update({
      is_signed_by_gvcn: true,
    }).eq('id', sigId);

    if (error) {
      setToast({ open: true, message: 'Lỗi: ' + error.message, severity: 'error' });
    } else {
      setToast({ open: true, message: 'Đã xác nhận ký duyệt!', severity: 'success' });
      loadSignatures();
    }
  };

  const mySignature = signatures.find((s) => s.student_id === profile?.id);

  // Student view
  if (isStudent) {
    return (
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Ký số hồ sơ nội quy</Typography>
          <Typography variant="body2" color="text.secondary">Tải nội quy, ký số và nộp bản PDF</Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <DownloadIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>Bước 1: Tải nội quy</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Tải file "Nội quy & Mục tiêu Lớp 11I.pdf" về máy, đọc kỹ và ký số.
                </Typography>
                <Button variant="outlined" startIcon={<DownloadIcon />} href={NOI_QUY_DOC_URL} target="_blank">
                  Tải nội quy (PDF)
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <UploadFileIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>Bước 2: Nộp bản đã ký</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Tải lên bản PDF đã ký số cá nhân.
                </Typography>
                <Stack spacing={2}>
                  <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                    {file ? file.name : 'Chọn file PDF'}
                    <input type="file" hidden accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </Button>
                  <Button variant="contained" onClick={handleUploadSigned} disabled={!file || loading}
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}>
                    {loading ? 'Đang tải...' : 'Nộp bản ký số'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Trạng thái ký số</Typography>
            {mySignature ? (
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip
                  icon={<CheckCircleIcon />}
                  label={mySignature.is_signed_by_student ? 'Đã ký số' : 'Chưa ký'}
                  color={mySignature.is_signed_by_student ? 'success' : 'default'}
                />
                <Chip
                  label={mySignature.is_signed_by_gvcn ? 'GVCN đã duyệt' : 'Chờ GVCN duyệt'}
                  color={mySignature.is_signed_by_gvcn ? 'success' : 'warning'}
                />
                {mySignature.signed_pdf_url && (
                  <Button size="small" startIcon={<DownloadIcon />} onClick={() => window.open(mySignature.signed_pdf_url as string, '_blank')}>
                    Xem bản đã ký
                  </Button>
                )}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Bạn chưa nộp bản ký số nào.
              </Typography>
            )}
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

  // GVCN view: overview table
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>Quản lý ký số hồ sơ</Typography>
        <Typography variant="body2" color="text.secondary">Duyệt đơn từ và tổng hợp trạng thái ký số của học sinh</Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: pendingRequests.length ? 2.5 : 1 }}>
            <Box
              sx={{
                width: 36, height: 36, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: (t) => alpha(t.palette.warning.main, t.palette.mode === 'dark' ? 0.24 : 0.14),
                color: 'warning.main',
              }}
            >
              <AssignmentTurnedInIcon fontSize="small" />
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>Đơn chờ duyệt</Typography>
              <Typography variant="caption" color="text.secondary">Đơn từ và đề xuất của học sinh đang chờ giáo viên chủ nhiệm xử lý</Typography>
            </Box>
            {pendingRequests.length > 0 && (
              <Chip
                size="small"
                label={`${pendingRequests.length} đơn`}
                sx={{
                  fontWeight: 700, height: 26,
                  bgcolor: (t) => alpha(t.palette.warning.main, t.palette.mode === 'dark' ? 0.24 : 0.14),
                  color: 'warning.main',
                }}
              />
            )}
          </Stack>

          {pendingRequests.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center', py: 5, borderRadius: 3,
                border: '1px dashed', borderColor: 'divider',
                color: 'text.secondary',
              }}
            >
              <InboxIcon sx={{ fontSize: 36, mb: 1, opacity: 0.5 }} />
              <Typography variant="body2">Không có đơn nào đang chờ duyệt.</Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {pendingRequests.map((r) => {
                const meta = REQUEST_TYPE_META[r.request_type];
                const TypeIcon = meta.icon;
                const initials = (r.requester?.full_name || '?').trim().charAt(0).toUpperCase();
                return (
                  <Box
                    key={r.id}
                    sx={{
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderLeft: '4px solid',
                      borderLeftColor: meta.color,
                      p: { xs: 1.75, sm: 2.25 },
                      bgcolor: 'background.paper',
                      transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
                      '&:hover': { boxShadow: (t) => t.palette.mode === 'dark' ? '0 2px 10px rgba(0,0,0,0.35)' : '0 2px 10px rgba(15,23,42,0.06)' },
                    }}
                  >
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ width: 38, height: 38, bgcolor: alpha(meta.color, 0.16), color: meta.color, fontWeight: 700, fontSize: '0.9rem' }}>
                          {initials}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700} lineHeight={1.3}>
                            {r.requester?.full_name || 'Học sinh'}
                          </Typography>
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'text.secondary' }}>
                            <ScheduleIcon sx={{ fontSize: 13 }} />
                            <Typography variant="caption">{new Date(r.created_at).toLocaleString('vi-VN')}</Typography>
                          </Stack>
                        </Box>
                      </Stack>
                      <Chip
                        size="small"
                        icon={<TypeIcon sx={{ fontSize: '15px !important', color: `${meta.color} !important` }} />}
                        label={REQUEST_TYPE_LABELS[r.request_type]}
                        sx={{
                          fontWeight: 600, height: 26, borderRadius: 1.5,
                          bgcolor: alpha(meta.color, 0.12), color: meta.color,
                        }}
                      />
                    </Stack>

                    <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1.5 }}>{r.title}</Typography>

                    {r.date_from && r.date_to && (
                      <Chip
                        size="small"
                        variant="outlined"
                        icon={<EventRangeIcon sx={{ fontSize: '14px !important' }} />}
                        label={`${new Date(r.date_from).toLocaleDateString('vi-VN')} → ${new Date(r.date_to).toLocaleDateString('vi-VN')}`}
                        sx={{ mt: 1, height: 24, fontSize: '0.72rem', borderRadius: 1.5 }}
                      />
                    )}

                    <Box
                      sx={{
                        mt: 1.25, p: 1.5, borderRadius: 2,
                        bgcolor: (t) => alpha(t.palette.text.primary, t.palette.mode === 'dark' ? 0.06 : 0.035),
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary' }}>{r.content}</Typography>
                    </Box>
                    <AttachmentList attachments={r.attachments} />

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }} alignItems={{ sm: 'center' }}>
                      <TextField
                        size="small" fullWidth label="Ghi chú duyệt (tuỳ chọn)"
                        value={reviewNotes[r.id] || ''}
                        onChange={(e) => setReviewNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      />
                      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                        <Tooltip title="Duyệt đơn">
                          <span>
                            <Button
                              variant="contained" color="success" size="small"
                              startIcon={<CheckCircleIcon />}
                              disabled={reviewingId === r.id}
                              onClick={() => handleReviewRequest(r.id, 'approved')}
                              sx={{ boxShadow: 'none' }}
                            >
                              Duyệt
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip title="Từ chối đơn">
                          <span>
                            <Button
                              variant="outlined" color="error" size="small"
                              startIcon={<CancelIcon />}
                              disabled={reviewingId === r.id}
                              onClick={() => handleReviewRequest(r.id, 'rejected')}
                            >
                              Từ chối
                            </Button>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Tổng hợp ký số</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'Đã ký số', value: signatures.filter((s) => s.is_signed_by_student).length, color: 'success', icon: CheckCircleIcon },
              { label: 'Chờ duyệt', value: signatures.filter((s) => s.is_signed_by_student && !s.is_signed_by_gvcn).length, color: 'warning', icon: PendingActionsIcon },
              { label: 'Đã duyệt', value: signatures.filter((s) => s.is_signed_by_gvcn).length, color: 'primary', icon: HowToRegIcon },
              { label: 'Chưa nộp', value: allProfiles.length - signatures.length, color: 'error', icon: PersonOffIcon },
            ].map((stat) => (
              <Grid key={stat.label} size={{ xs: 6, md: 3 }}>
                <Stack
                  direction="row" spacing={1.5} alignItems="center"
                  sx={{
                    p: 2, borderRadius: 3,
                    bgcolor: (t) => alpha(t.palette[stat.color as 'success' | 'warning' | 'primary' | 'error'].main, t.palette.mode === 'dark' ? 0.16 : 0.1),
                  }}
                >
                  <Box
                    sx={{
                      width: 34, height: 34, borderRadius: 2, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: 'background.paper', color: `${stat.color}.main`,
                    }}
                  >
                    <stat.icon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={700} color={`${stat.color}.main`} lineHeight={1.1}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                  </Box>
                </Stack>
              </Grid>
            ))}
          </Grid>

          <TableContainer className="mobile-card-table">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell sx={{ fontWeight: 600}}>Học sinh</TableCell>
                  <TableCell sx={{ fontWeight: 600}}>Mã HS</TableCell>
                  <TableCell sx={{ fontWeight: 600}}>Ký số</TableCell>
                  <TableCell sx={{ fontWeight: 600}}>Duyệt GVCN</TableCell>
                  <TableCell sx={{ fontWeight: 600}}>Ngày ký</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      Chưa có học sinh
                    </TableCell>
                  </TableRow>
                ) : (
                  allProfiles.map((p) => {
                    const sig = signatures.find((s) => s.student_id === p.id);
                    return (
                      <TableRow key={p.id} hover>
                        <TableCell data-label="Học sinh">
                          <Stack direction="row" spacing={1.25} alignItems="center">
                            <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', fontWeight: 700, bgcolor: 'primary.main' }}>
                              {p.full_name.trim().charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="body2" fontWeight={500}>{p.full_name}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell data-label="Mã HS">{p.student_code}</TableCell>
                        <TableCell data-label="Ký số">
                          {sig?.is_signed_by_student ? (
                            <Chip size="small" icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />} label="Đã ký" color="success" sx={{ height: 24, fontSize: '0.7rem', borderRadius: 1.5 }} />
                          ) : (
                            <Chip size="small" label="Chưa ký" color="default" variant="outlined" sx={{ height: 24, fontSize: '0.7rem', borderRadius: 1.5 }} />
                          )}
                        </TableCell>
                        <TableCell data-label="Duyệt GVCN">
                          {sig?.is_signed_by_gvcn ? (
                            <Chip size="small" icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />} label="Đã duyệt" color="success" sx={{ height: 24, fontSize: '0.7rem', borderRadius: 1.5 }} />
                          ) : sig?.is_signed_by_student ? (
                            <Button size="small" variant="outlined" color="success" startIcon={<CheckCircleIcon />}
                              onClick={() => handleApprove(sig.id)}>
                              Duyệt
                            </Button>
                          ) : (
                            <Chip size="small" label="-" color="default" variant="outlined" sx={{ height: 24, fontSize: '0.7rem', borderRadius: 1.5 }} />
                          )}
                        </TableCell>
                        <TableCell data-label="Ngày ký">
                          <Typography variant="caption">
                            {sig?.signed_at ? new Date(sig.signed_at).toLocaleDateString('vi-VN') : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {sig?.signed_pdf_url && (
                            <Tooltip title="Xem bản đã ký">
                              <IconButton size="small" onClick={() => window.open(sig.signed_pdf_url as string, '_blank')}>
                                <DownloadIcon fontSize="small" />
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
