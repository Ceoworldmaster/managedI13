import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

export default function CTA() {
  return (
    <Box
      sx={{
        py: { xs: 10, md: 14 },
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="md">
        <Box
          sx={{
            borderRadius: 6,
            background: 'linear-gradient(135deg, #1A1A2E 0%, #2D2B6E 100%)',
            p: { xs: 5, md: 8 },
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -80,
              right: -80,
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(108,99,255,0.25) 0%, transparent 70%)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -80,
              left: -80,
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,101,132,0.2) 0%, transparent 70%)',
            },
          }}
        >
          <Stack alignItems="center" spacing={3} position="relative" zIndex={1}>
            <Typography
              variant="h2"
              sx={{ color: 'white', fontSize: { xs: '1.85rem', md: '2.75rem' } }}
            >
              Ready to launch your next big thing?
            </Typography>
            <Typography variant="h6" fontWeight={400} sx={{ color: 'rgba(255,255,255,0.7)', maxWidth: 480 }}>
              Join 50,000+ teams who ship faster with Launchly. No credit card required.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  background: 'linear-gradient(135deg, #6C63FF 0%, #9D95FF 100%)',
                  boxShadow: '0 8px 32px rgba(108,99,255,0.5)',
                  '&:hover': { boxShadow: '0 12px 40px rgba(108,99,255,0.65)' },
                }}
              >
                Start for free
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.05)' },
                }}
              >
                Talk to sales
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
