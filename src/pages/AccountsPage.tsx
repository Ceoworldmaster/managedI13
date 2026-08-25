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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { supabase, type Profile, type Team, type DormRoom, type UserRole, ROLE_LABELS } from '../lib/supabase';

const ROLES: UserRole[] = ['gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep', 'lop_pho_van_nghe', 'lop_pho_lao_dong', 'to_truong', 'truong_phong_ktx', 'hoc_sinh'];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [dormRooms, setDormRooms] = useState<DormRoom[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    email: '', password: '', full_name: '', student_code: '', role: 'hoc_sinh' as UserRole,
    team_id: '', dorm_room_id: '', phone_number: '',
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({ open: false, message: '', severity: 'success' });

  const loadAccounts = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    if (data) setAccounts(data as Profile[]);
  }, []);

  useEffect(() => {
    loadAccounts();
    supabase.from('teams').select('*').order('id').then(({ data }) => { if (data) setTeams(data as Team[]); });
    supabase.from('dorm_rooms').select('*').order('room_number').then(({ data }) => { if (data) setDormRooms(data as DormRoom[]); });
  }, [loadAccounts]);

  const handleCreate = async () => {
    setLoading(true);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/create-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        users: [{
          email: newAccount.email,
          password: newAccount.password,
          full_name: newAccount.full_name,
          student_code: newAccount.student_code,
          role: newAccount.role,
          team_id: newAccount.team_id ? Number(newAccount.team_id) : null,
          dorm_room_id: newAccount.dorm_room_id ? Number(newAccount.dorm_room_id) : null,
          phone_number: newAccount.phone_number || null,
        }],
      }),
    });

    const result = await response.json();

    if (response.ok && result.results?.[0]?.success) {
      setToast({ open: true, message: `Đã tạo tài khoản cho ${newAccount.full_name}`, severity: 'success' });
      setCreateOpen(false);
      setNewAccount({ email: '', password: '', full_name: '', student_code: '', role: 'hoc_sinh', team_id: '', dorm_room_id: '', phone_number: '' });
      loadAccounts();
    } else {
      setToast({ open: true, message: 'Lỗi: ' + (result.results?.[0]?.error || result.error || 'Không thể tạo tài khoản'), severity: 'error' });
    }
    setLoading(false);
  };

  const handleResetPassword = async (acc: Profile) => {
    setToast({ open: true, message: `Chức năng reset mật khẩu cần edge function mở rộng. Vui lòng liên hệ admin để đặt lại mật khẩu cho ${acc.full_name}.`, severity: 'warning' });
  };

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Quản lý tài khoản</Typography>
          <Typography variant="body2" color="text.secondary">Tạo và quản lý tài khoản lớp</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Tạo tài khoản mới
        </Button>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell sx={{ fontWeight: 600}}>Họ tên</TableCell>
                  <TableCell sx={{ fontWeight: 600}}>Mã HS</TableCell>
                  <TableCell sx={{ fontWeight: 600}}>Vai trò</TableCell>
                  <TableCell sx={{ fontWeight: 600}}>Tổ</TableCell>
                  <TableCell sx={{ fontWeight: 600}}>Phòng KTX</TableCell>
                  <TableCell sx={{ fontWeight: 600}}>Đổi mật khẩu</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      Chưa có tài khoản nào
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((acc) => (
                    <TableRow key={acc.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{acc.full_name}</Typography>
                      </TableCell>
                      <TableCell>{acc.student_code}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={ROLE_LABELS[acc.role]}
                          color={acc.role === 'gvcn' ? 'primary' : 'default'}
                          variant={acc.role === 'gvcn' ? 'filled' : 'outlined'}
                          sx={{ height: 22, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        {teams.find((t) => t.id === acc.team_id)?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {dormRooms.find((r) => r.id === acc.dorm_room_id)?.room_number || '-'}
                      </TableCell>
                      <TableCell>
                        {acc.must_change_password ? (
                          <Chip size="small" label="Cần đổi" color="warning" sx={{ height: 22, fontSize: '0.7rem' }} />
                        ) : (
                          <Chip size="small" label="Đã đổi" color="success" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleResetPassword(acc)} title="Reset mật khẩu">
                          <RefreshIcon fontSize="small" />
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

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAddIcon color="primary" />
          Tạo tài khoản mới
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField fullWidth size="small" label="Họ tên" value={newAccount.full_name}
                  onChange={(e) => setNewAccount({ ...newAccount, full_name: e.target.value })} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth size="small" label="Mã học sinh" value={newAccount.student_code}
                  onChange={(e) => setNewAccount({ ...newAccount, student_code: e.target.value })} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth size="small" label="Email" type="email" value={newAccount.email}
                  onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth size="small" label="Mật khẩu" value={newAccount.password}
                  onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })} />
              </Grid>
              <Grid size={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Vai trò</InputLabel>
                  <Select value={newAccount.role} label="Vai trò" onChange={(e) => setNewAccount({ ...newAccount, role: e.target.value as UserRole })}>
                    {ROLES.map((r) => (
                      <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={6}>
                <TextField fullWidth size="small" label="Số điện thoại" value={newAccount.phone_number}
                  onChange={(e) => setNewAccount({ ...newAccount, phone_number: e.target.value })} />
              </Grid>
              <Grid size={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tổ</InputLabel>
                  <Select value={newAccount.team_id} label="Tổ" onChange={(e) => setNewAccount({ ...newAccount, team_id: e.target.value })}>
                    <MenuItem value="">Không</MenuItem>
                    {teams.map((t) => <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Phòng KTX</InputLabel>
                  <Select value={newAccount.dorm_room_id} label="Phòng KTX" onChange={(e) => setNewAccount({ ...newAccount, dorm_room_id: e.target.value })}>
                    <MenuItem value="">Không</MenuItem>
                    {dormRooms.map((r) => <MenuItem key={r.id} value={String(r.id)}>{r.room_number}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setCreateOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!newAccount.email || !newAccount.password || !newAccount.full_name || !newAccount.student_code || loading}>
            {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
