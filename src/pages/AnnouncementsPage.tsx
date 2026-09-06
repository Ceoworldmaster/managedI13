import { useState, useEffect, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CampaignIcon from '@mui/icons-material/Campaign';
import { useAuth, hasRole } from '../lib/auth';
import { supabase, ROLE_LABELS, type Announcement } from '../lib/supabase';

const POSTER_ROLES = ['gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep', 'lop_pho_van_nghe', 'lop_pho_lao_dong', 'to_truong', 'truong_phong_ktx'] as const;

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

export default function AnnouncementsPage() {
  const { profile } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const canPost = hasRole(profile, ...POSTER_ROLES);

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('announcements')
      .select('*, author:profiles(*), reads:announcement_reads(student_id)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setItems(data as unknown as Announcement[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Mark everything visible as read for the current user (fire and forget).
  useEffect(() => {
    if (!profile || items.length === 0) return;
    const unread = items.filter((a) => !a.reads?.some((r) => r.student_id === profile.id));
    if (unread.length === 0) return;
    supabase
      .from('announcement_reads')
      .upsert(unread.map((a) => ({ announcement_id: a.id, student_id: profile.id })), { onConflict: 'announcement_id,student_id' })
      .then(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, profile?.id]);

  const openNew = () => {
    setEditing(null);
    setTitle('');
    setBody('');
    setPinned(false);
    setDialogOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setTitle(a.title);
    setBody(a.body);
    setPinned(a.is_pinned);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!profile || !title.trim() || !body.trim()) return;
    setSubmitting(true);
    if (editing) {
      const { error } = await supabase
        .from('announcements')
        .update({ title: title.trim(), body: body.trim(), is_pinned: pinned, updated_at: new Date().toISOString() })
        .eq('id', editing.id);
      if (error) setToast({ open: true, message: 'Lỗi: ' + error.message, severity: 'error' });
      else setToast({ open: true, message: 'Đã cập nhật thông báo', severity: 'success' });
    } else {
      const { error } = await supabase.from('announcements').insert({
        author_id: profile.id,
        title: title.trim(),
        body: body.trim(),
        is_pinned: pinned,
      });
      if (error) setToast({ open: true, message: 'Lỗi: ' + error.message, severity: 'error' });
      else setToast({ open: true, message: 'Đã đăng thông báo', severity: 'success' });
    }
    setSubmitting(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) setToast({ open: true, message: 'Lỗi: ' + error.message, severity: 'error' });
    else {
      setToast({ open: true, message: 'Đã xóa thông báo', severity: 'success' });
      load();
    }
  };

  const canEdit = (a: Announcement) => profile && (a.author_id === profile.id || hasRole(profile, 'gvcn'));

  const sorted = useMemo(() => items, [items]);

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Bảng tin lớp</Typography>
          <Typography variant="body2" color="text.secondary">
            Thông báo, nhắc nhở và hướng dẫn chung cho cả lớp
          </Typography>
        </Box>
        {canPost && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} fullWidth={isMobile}>
            Đăng thông báo
          </Button>
        )}
      </Stack>

      {!loading && sorted.length === 0 && (
        <Card>
          <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <CampaignIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">Chưa có thông báo nào</Typography>
          </CardContent>
        </Card>
      )}

      <Stack spacing={2}>
        {sorted.map((a) => (
          <Card key={a.id} sx={{ borderLeft: a.is_pinned ? '4px solid' : 'none', borderColor: 'warning.main' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.85rem', flexShrink: 0 }}>
                    {a.author?.full_name?.charAt(0) || '?'}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="subtitle1" fontWeight={700}>{a.title}</Typography>
                      {a.is_pinned && <PushPinIcon fontSize="small" color="warning" />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {a.author?.full_name} · {a.author ? ROLE_LABELS[a.author.role] : ''} · {timeAgo(a.created_at)}
                    </Typography>
                  </Box>
                </Stack>
                {canEdit(a) && (
                  <Stack direction="row" spacing={0.5} flexShrink={0}>
                    <IconButton size="small" onClick={() => openEdit(a)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(a.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </Stack>
                )}
              </Stack>
              <Typography variant="body2" sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>
                {a.body}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>{editing ? 'Sửa thông báo' : 'Đăng thông báo mới'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Tiêu đề" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} />
            <TextField label="Nội dung" fullWidth multiline minRows={4} value={body} onChange={(e) => setBody(e.target.value)} />
            <Chip
              icon={pinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
              label={pinned ? 'Đã ghim lên đầu' : 'Ghim lên đầu bảng tin'}
              color={pinned ? 'warning' : 'default'}
              variant={pinned ? 'filled' : 'outlined'}
              onClick={() => setPinned((p) => !p)}
              sx={{ alignSelf: 'flex-start' }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleSave} disabled={!title.trim() || !body.trim() || submitting}>
            {submitting ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
