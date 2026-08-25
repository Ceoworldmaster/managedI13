import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import theme from './theme';
import { AuthProvider, useAuth, hasRole, canRecordPoints } from './lib/auth';
import Layout, { type PageKey } from './components/Layout';
import ChangePasswordDialog from './components/ChangePasswordDialog';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PointsPage from './pages/PointsPage';
import ReportsPage from './pages/ReportsPage';
import DormPage from './pages/DormPage';
import LaborPage from './pages/LaborPage';
import SignaturesPage from './pages/SignaturesPage';
import AccountsPage from './pages/AccountsPage';

function AppContent() {
  const { session, profile, loading } = useAuth();
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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
