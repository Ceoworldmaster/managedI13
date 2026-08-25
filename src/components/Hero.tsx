import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import AvatarGroup from '@mui/material/AvatarGroup';
import Avatar from '@mui/material/Avatar';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';

const avatarColors = ['#6C63FF', '#FF6584', '#43B89C', '#FFA55A', '#5BB8F5'];
const initials = ['JD', 'AS', 'MK', 'RL', 'TW'];

export default function Hero() {
  return (
    <Box
      sx={{
        pt: { xs: 14, md: 18 },
        pb: { xs: 10, md: 14 },
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -100,
          left: -100,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,101,132,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="lg">
        <Stack alignItems="center" spacing={4} textAlign="center">
          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
            label="Trusted by 50,000+ teams worldwide"
            color="primary"
            variant="outlined"
            size="small"
            sx={{ px: 1 }}
          />

          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.5rem', md: '3.75rem', lg: '4.5rem' },
              maxWidth: 800,
              lineHeight: 1.1,
              background: 'linear-gradient(135deg, #1A1A2E 0%, #6C63FF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Build products that{' '}
            <Box component="span" sx={{ color: 'secondary.main', WebkitTextFillColor: 'secondary.main' }}>
              people love
            </Box>
          </Typography>

          <Typography
            variant="h6"
            color="text.secondary"
            fontWeight={400}
            sx={{ maxWidth: 580, lineHeight: 1.7 }}
          >
            Launchly gives your team the tools to ship faster, collaborate smarter,
            and grow your product with confidence.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                background: 'linear-gradient(135deg, #6C63FF 0%, #9D95FF 100%)',
                boxShadow: '0 8px 32px rgba(108,99,255,0.35)',
                '&:hover': { boxShadow: '0 12px 40px rgba(108,99,255,0.45)' },
              }}
            >
              Start for free
            </Button>
            <Button
              variant="text"
              size="large"
              startIcon={<PlayCircleOutlineIcon />}
              sx={{ color: 'text.secondary', px: 3 }}
            >
              Watch demo
            </Button>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={2}>
            <AvatarGroup max={5}>
              {initials.map((init, i) => (
                <Avatar key={init} sx={{ bgcolor: avatarColors[i], width: 36, height: 36, fontSize: '0.8rem', fontWeight: 700 }}>
                  {init}
                </Avatar>
              ))}
            </AvatarGroup>
            <Box>
              <Typography variant="body2" fontWeight={700} color="text.primary">
                4.9 / 5 rating
              </Typography>
              <Typography variant="caption" color="text.secondary">
                from 2,400+ reviews
              </Typography>
            </Box>
          </Stack>

          <Box
            sx={{
              mt: 4,
              width: '100%',
              maxWidth: 900,
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(108,99,255,0.18)',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              height: { xs: 220, md: 420 },
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #f0eeff 0%, #fce8ed 100%)',
            }}
          >
            <Stack alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: 4,
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 12px 40px rgba(108,99,255,0.4)',
                }}
              >
                <AutoAwesomeIcon sx={{ color: 'white', fontSize: 40 }} />
              </Box>
              <Typography variant="h6" color="text.secondary" fontWeight={400}>
                Your product dashboard
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
