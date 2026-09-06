import { createTheme, responsiveFontSizes, type PaletteMode } from '@mui/material/styles';

const lightPalette = {
  mode: 'light' as PaletteMode,
  primary: { main: '#1E3A5F', light: '#2C5282', dark: '#15294A', contrastText: '#FFFFFF' },
  secondary: { main: '#475569', light: '#64748B', dark: '#334155', contrastText: '#FFFFFF' },
  success: { main: '#16A34A', light: '#22C55E', dark: '#15803D', contrastText: '#FFFFFF' },
  error: { main: '#DC2626', light: '#EF4444', dark: '#B91C1C', contrastText: '#FFFFFF' },
  warning: { main: '#F59E0B', light: '#FBBF24', dark: '#D97706', contrastText: '#FFFFFF' },
  info: { main: '#0EA5E9', light: '#38BDF8', dark: '#0284C7', contrastText: '#FFFFFF' },
  background: { default: '#F1F5F9', paper: '#FFFFFF' },
  text: { primary: '#0F172A', secondary: '#64748B' },
  divider: '#E2E8F0',
};

const darkPalette = {
  mode: 'dark' as PaletteMode,
  primary: { main: '#5B8DEF', light: '#7FA6F2', dark: '#3E6BC7', contrastText: '#0B1220' },
  secondary: { main: '#94A3B8', light: '#CBD5E1', dark: '#64748B', contrastText: '#0B1220' },
  success: { main: '#22C55E', light: '#4ADE80', dark: '#16A34A', contrastText: '#04140A' },
  error: { main: '#F87171', light: '#FCA5A5', dark: '#EF4444', contrastText: '#1A0505' },
  warning: { main: '#FBBF24', light: '#FCD34D', dark: '#F59E0B', contrastText: '#1A1200' },
  info: { main: '#38BDF8', light: '#7DD3FC', dark: '#0EA5E9', contrastText: '#031A24' },
  background: { default: '#0B1220', paper: '#121B2E' },
  text: { primary: '#E2E8F0', secondary: '#94A3B8' },
  divider: '#22304A',
};

export function getTheme(mode: PaletteMode) {
  let theme = createTheme({
    palette: mode === 'dark' ? darkPalette : lightPalette,
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 800 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 700 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiButton: {
        styleOverrides: { root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 } },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: mode === 'dark' ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            '@media (max-width: 599.95px)': {
              margin: 8,
              width: 'calc(100% - 16px)',
              maxHeight: 'calc(100% - 16px)',
              borderRadius: 14,
            },
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          // Responsive "card" table: on small screens, each row of a table
          // wrapped with the `.mobile-card-table` class collapses into a
          // stacked card instead of forcing horizontal scroll. Each body
          // cell needs a `data-label` attribute naming its column.
          '@media (max-width: 639.95px)': {
            '.mobile-card-table table': { display: 'block' },
            '.mobile-card-table thead': { display: 'none' },
            '.mobile-card-table tbody': { display: 'block' },
            '.mobile-card-table tbody tr': {
              display: 'block',
              padding: '10px 12px',
              marginBottom: 10,
              borderRadius: 12,
              border: `1px solid ${mode === 'dark' ? '#22304A' : '#E2E8F0'}`,
              backgroundColor: mode === 'dark' ? '#121B2E' : '#FFFFFF',
            },
            '.mobile-card-table tbody tr:last-of-type': { marginBottom: 0 },
            '.mobile-card-table tbody td': {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              textAlign: 'right',
              border: 'none',
              padding: '6px 0',
            },
            '.mobile-card-table tbody td[data-label]::before': {
              content: 'attr(data-label)',
              fontSize: '0.72rem',
              fontWeight: 600,
              textAlign: 'left',
              color: mode === 'dark' ? '#94A3B8' : '#64748B',
              flexShrink: 0,
            },
            '.mobile-card-table tbody td:empty': { display: 'none' },
          },
        },
      },
    },
  });

  theme = responsiveFontSizes(theme);
  return theme;
}

export default getTheme('light');
