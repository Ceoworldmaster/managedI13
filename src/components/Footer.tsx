import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

const footerLinks = {
  Product: ['Features', 'Pricing', 'Changelog', 'Roadmap'],
  Company: ['About', 'Blog', 'Careers', 'Press'],
  Resources: ['Documentation', 'Help Center', 'Status', 'API'],
  Legal: ['Privacy', 'Terms', 'Security', 'Cookies'],
};

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: '#0F0F23',
        color: 'white',
        pt: { xs: 8, md: 10 },
        pb: 4,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} sx={{ mb: 6 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RocketLaunchIcon sx={{ color: 'white', fontSize: 18 }} />
                </Box>
                <Typography variant="h6" fontWeight={700}>
                  Launchly
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', maxWidth: 260, lineHeight: 1.8 }}>
                Build products that people love. The platform trusted by 50,000+ teams worldwide.
              </Typography>
            </Stack>
          </Grid>

          {Object.entries(footerLinks).map(([section, links]) => (
            <Grid key={section} size={{ xs: 6, sm: 3, md: 2 }}>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, fontWeight: 700 }}>
                {section}
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {links.map((link) => (
                  <Link
                    key={link}
                    href="#"
                    underline="hover"
                    sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', '&:hover': { color: 'white' } }}
                  >
                    {link}
                  </Link>
                ))}
              </Stack>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
          sx={{ pt: 3 }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)' }}>
            © 2026 Launchly, Inc. All rights reserved.
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)' }}>
            Made with care for teams everywhere
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
