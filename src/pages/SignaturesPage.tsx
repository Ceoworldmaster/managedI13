import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
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
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth, hasRole } from '../lib/auth';
import { supabase, type DocumentSignature, type Profile } from '../lib/supabase';

const NOI_QUY_DOC_URL = 'https://docs.google.com/document/d/example/export?format=pdf';

export default function SignaturesPage() {
  const { profile } = useAuth();
  const isGvcn = hasRole(profile, 'gvcn');
  const isStudent = hasRole(profile, 'hoc_sinh');
  const [signatures, setSignatures] = useState<DocumentSignature[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

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
    }
  }, [loadSignatures, isGvcn]);

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
        <Typography variant="body2" color="text.secondary">Tổng hợp trạng thái ký số của học sinh</Typography>
      </Box>

      <Card>
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F0FDF4', borderRadius: 2 }}>
                <Typography variant="h4" fontWeight={700} color="success.main">
                  {signatures.filter((s) => s.is_signed_by_student).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">Đã ký số</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#FFFBEB', borderRadius: 2 }}>
                <Typography variant="h4" fontWeight={700} color="warning.main">
                  {signatures.filter((s) => s.is_signed_by_student && !s.is_signed_by_gvcn).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">Chờ duyệt</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#EFF6FF', borderRadius: 2 }}>
                <Typography variant="h4" fontWeight={700} color="primary.main">
                  {signatures.filter((s) => s.is_signed_by_gvcn).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">Đã duyệt</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#FEF2F2', borderRadius: 2 }}>
                <Typography variant="h4" fontWeight={700} color="error.main">
                  {allProfiles.length - signatures.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">Chưa nộp</Typography>
              </Box>
            </Grid>
          </Grid>

          <TableContainer>
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
                        <TableCell>{p.full_name}</TableCell>
                        <TableCell>{p.student_code}</TableCell>
                        <TableCell>
                          {sig?.is_signed_by_student ? (
                            <Chip size="small" label="Đã ký" color="success" sx={{ height: 22, fontSize: '0.7rem' }} />
                          ) : (
                            <Chip size="small" label="Chưa ký" color="default" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                          )}
                        </TableCell>
                        <TableCell>
                          {sig?.is_signed_by_gvcn ? (
                            <Chip size="small" label="Đã duyệt" color="success" sx={{ height: 22, fontSize: '0.7rem' }} />
                          ) : sig?.is_signed_by_student ? (
                            <Button size="small" variant="outlined" color="success" startIcon={<CheckCircleIcon />}
                              onClick={() => handleApprove(sig.id)}>
                              Duyệt
                            </Button>
                          ) : (
                            <Chip size="small" label="-" color="default" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {sig?.signed_at ? new Date(sig.signed_at).toLocaleDateString('vi-VN') : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {sig?.signed_pdf_url && (
                            <IconButton size="small" onClick={() => window.open(sig.signed_pdf_url as string, '_blank')}>
                              <DownloadIcon fontSize="small" />
                            </IconButton>
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
