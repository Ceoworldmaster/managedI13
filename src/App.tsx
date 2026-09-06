import { useState, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { getTheme } from './theme';
import { ThemeModeProvider, useThemeMode } from './lib/themeMode';
import { AuthProvider, useAuth, hasRole, canRecordPoints } from './lib/auth';
import { WeekProvider, useWeek } from './lib/weekContext';
import Layout, { type PageKey } from './components/Layout';
import ChangePasswordDialog from './components/ChangePasswordDialog';
import LoginPage from './pages/LoginPage';
import SelectWeekPage from './pages/SelectWeekPage';
import DashboardPage from './pages/DashboardPage';
import PointsPage from './pages/PointsPage';
import ReportsPage from './pages/ReportsPage';
import DormPage from './pages/DormPage';
import LaborPage from './pages/LaborPage';
import SignaturesPage from './pages/SignaturesPage';
import AccountsPage from './pages/AccountsPage';
import RequestsPage from './pages/RequestsPage';

function AppContent() {
  const { session, profile, loading } = useAuth();
  const { hasChosenWeek, loading: weeksLoading } = useWeek();
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!session || !profile) {
    return <LoginPage />;
  }

  // Right after login, every page needs a working week — gate the rest of
  // the app behind an explicit week choice instead of letting each page
  // default/guess independently.
  if (weeksLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!hasChosenWeek) {
    return <SelectWeekPage />;
  }

  // Role-based page access control
  const canAccessPage = (page: PageKey): boolean => {
    switch (page) {
      case 'dashboard': return true;
      case 'points': return canRecordPoints(profile);
      case 'reports': return hasRole(profile, 'gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep', 'lop_pho_van_nghe', 'lop_pho_lao_dong', 'truong_phong_ktx', 'to_truong');
      case 'dorm': return hasRole(profile, 'gvcn', 'truong_phong_ktx');
      case 'labor': return true;
      case 'signatures': return hasRole(profile, 'gvcn', 'hoc_sinh');
      case 'accounts': return hasRole(profile, 'gvcn');
      case 'requests': return true;
      default: return false;
    }
  };

  // Redirect to dashboard if current page not accessible
  const effectivePage = canAccessPage(currentPage) ? currentPage : 'dashboard';

  const renderPage = () => {
    switch (effectivePage) {
      case 'dashboard': return <DashboardPage />;
      case 'points': return <PointsPage />;
      case 'reports': return <ReportsPage />;
      case 'dorm': return <DormPage />;
      case 'labor': return <LaborPage />;
      case 'signatures': return <SignaturesPage />;
      case 'accounts': return <AccountsPage />;
      case 'requests': return <RequestsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <>
      <Layout currentPage={effectivePage} onNavigate={setCurrentPage}>
        {renderPage()}
      </Layout>
      <ChangePasswordDialog />
    </>
  );
}

function ThemedApp() {
  const { mode } = useThemeMode();
  const theme = useMemo(() => getTheme(mode), [mode]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <WeekProvider>
          <AppContent />
        </WeekProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <ThemeModeProvider>
      <ThemedApp />
    </ThemeModeProvider>
  );
}

export default App;
