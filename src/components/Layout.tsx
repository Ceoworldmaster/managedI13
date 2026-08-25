import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import SchoolIcon from '@mui/icons-material/School';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import EngineeringIcon from '@mui/icons-material/Engineering';
import DrawIcon from '@mui/icons-material/Draw';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth, hasRole } from '../lib/auth';
import { ROLE_LABELS, type UserRole } from '../lib/supabase';

const drawerWidth = 240;

export type PageKey = 'dashboard' | 'points' | 'reports' | 'dorm' | 'labor' | 'signatures' | 'accounts';

interface NavItem {
  key: PageKey;
  label: string;
  icon: ReactNode;
  roles: UserRole[];
}

const ALL_ROLES: UserRole[] = ['gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep', 'lop_pho_van_nghe', 'lop_pho_lao_dong', 'to_truong', 'truong_phong_ktx', 'hoc_sinh'];
const BAN_CAN_SU_ROLES: UserRole[] = ['gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep', 'lop_pho_van_nghe', 'lop_pho_lao_dong', 'truong_phong_ktx', 'to_truong'];

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Tổng quan', icon: <DashboardIcon />, roles: ALL_ROLES },
  { key: 'points', label: 'Nhập lỗi & Điểm cộng', icon: <EditNoteIcon />, roles: BAN_CAN_SU_ROLES },
  { key: 'reports', label: 'Báo cáo Excel', icon: <AssessmentIcon />, roles: BAN_CAN_SU_ROLES },
  { key: 'dorm', label: 'Chấm KTX', icon: <CleaningServicesIcon />, roles: ['gvcn', 'truong_phong_ktx'] },
  { key: 'labor', label: 'Lao động & Lịch trực', icon: <EngineeringIcon />, roles: ALL_ROLES },
  { key: 'signatures', label: 'Ký số Hồ sơ', icon: <DrawIcon />, roles: ['gvcn', 'hoc_sinh'] },
  { key: 'accounts', label: 'Quản lý Tài khoản', icon: <ManageAccountsIcon />, roles: ['gvcn'] },
];

interface LayoutProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  children: ReactNode;
}

export default function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const visibleItems = NAV_ITEMS.filter((item) => hasRole(profile, ...item.roles));

  const handleNav = (page: PageKey) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <SchoolIcon sx={{ color: 'white', fontSize: 20 }} />
        </Box>
        <Box>
          <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>
            Lớp 11I
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Chuyên Tin & Nội trú
          </Typography>
        </Box>
      </Box>
      <Divider />
      <List sx={{ flex: 1, pt: 1 }}>
        {visibleItems.map((item) => (
          <ListItem key={item.key} disablePadding>
            <ListItemButton
              selected={currentPage === item.key}
              onClick={() => handleNav(item.key)}
              sx={{ mx: 1, borderRadius: 2, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: currentPage === item.key ? 'primary.main' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: currentPage === item.key ? 600 : 400 }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          © 2026 Lớp 11I Chuyên Tin
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ px: { xs: 1.5, sm: 2 } }}>
          <IconButton
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 1, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
                {profile?.full_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {profile ? ROLE_LABELS[profile.role] : ''}
              </Typography>
            </Box>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.85rem', fontWeight: 700 }}>
                {profile?.full_name?.charAt(0) || '?'}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={!!anchorEl}
              onClose={() => setAnchorEl(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
              <MenuItem onClick={() => { setAnchorEl(null); signOut(); }}>
                <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
                Đăng xuất
              </MenuItem>
            </Menu>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', borderRight: '1px solid', borderColor: 'divider' },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
